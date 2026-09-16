import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState, previewState } from './game/engine';
import { BASE_CATALOG, validateCatalog } from './game/catalog';
import { readGame } from './storage';

afterEach(() => vi.unstubAllGlobals());
function load(game: unknown) {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(game) });
  return readGame();
}

describe('sauvegardes et compatibilité', () => {
  it('conserve les actions préparées et permet leur annulation après rechargement', () => {
    const g = initialState();
    g.phase = 'actions'; g.actions = 2;
    g.plannedActions = [{ type: 'income' }, { type: 'buy', tileId: 'initial-17', slotId: 'b1' }];
    const saved = load(g).game!;
    expect(previewState(saved).board.b1?.id).toBe('initial-17');
    expect(saved.board.b1).toBeNull();
    saved.plannedActions = [];
    expect(previewState(saved).money).toBe(100);
  });
  it.each([0, 1, 2])('migre une sauvegarde v1 avec %i action(s) restante(s)', actions => {
    const { plannedActions: _, ...old } = initialState();
    const result = load({ ...old, phase: 'actions', actions, money: 300 - actions * 100 });
    expect(result.error).toBeUndefined();
    expect(result.game?.plannedActions).toEqual([]);
    expect(result.game?.phase).toBe(actions === 0 ? 'committed' : 'actions');
    expect(result.game?.money).toBe(old.money + (2 - actions) * 100);
    expect(result.game?.actions).toBe(actions);
  });
  it('refuse des préparations illégales ou hors phase', () => {
    const g = { ...initialState(), phase: 'actions', actions: 2 };
    for (const plannedActions of [
      [{ type: 'income' }, { type: 'income' }, { type: 'income' }],
      [{ type: 'buy', tileId: 'initial-17', slotId: 'b1' }],
      [{ type: 'research', track: '__proto__' }],
      [{ type: 'unknown' }], [null],
    ]) expect(load({ ...g, plannedActions }).error).toBeTruthy();
    expect(load({ ...g, phase: 'research', plannedActions: [{ type: 'income' }] }).error).toBeTruthy();
  });
  it('conserve le choix des symboles lors de la validation du catalogue', () => {
    for (const symbolsOnImage of [true, false]) {
      expect(validateCatalog([{ ...BASE_CATALOG[0], symbolsOnImage }])[0].symbolsOnImage).toBe(symbolsOnImage);
    }
    expect(() => validateCatalog([{ ...BASE_CATALOG[0], symbolsOnImage: 'yes' }])).toThrow();
  });
});
