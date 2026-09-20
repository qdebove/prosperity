import { describe, expect, it } from 'vitest';
import { BASE_CATALOG } from './catalog';
import { initialState, previewState } from './engine';
import { actionFeedback, decadeProgress, inspectPurchase, marketAvailability, priceBreakdown, purchasePreview } from './presentation';
import type { GameState, Tile } from './types';

const tile = (name: string) => BASE_CATALOG.find(t => t.name === name)!;
const actions = (overrides: Partial<GameState> = {}): GameState => ({ ...initialState(), phase: 'actions', actions: 2, ...overrides });

describe('présentation dérivée des règles publiques', () => {
  it('distingue achat immédiat, revenu puis achat, et achat trop cher', () => {
    const G = actions();
    const states = marketAvailability(G);
    expect(states[tile('Centrale au fioul').id].state).toBe('now');
    expect(states[tile('Parc éolien').id]).toMatchObject({ state: 'later', reason: 'Après un revenu de 100 €, puis cet achat.' });
    expect(states[tile('Barrage hydroélectrique').id].state).toBe('unavailable');
    expect(marketAvailability({ ...G, actions: 1 })[tile('Parc éolien').id].state).toBe('unavailable');
  });

  it('reconnaît un achat rendu accessible par le franchissement de niveau', () => {
    const G = actions({ money: 0, research: { energy: 1, ecology: 0 } });
    // 50 € cannot buy a same-level tile; one research step lowers it to 50 €.
    G.money = 50;
    expect(marketAvailability(G)[tile('Centrale au fioul').id].state).toBe('later');
    expect(marketAvailability(G)[tile('Centrale au fioul').id].reason).toContain('Après une recherche énergie');
    expect(priceBreakdown(G, tile('Parc éolien'))).toMatchObject({ base: 100, premium: 100, difference: 1, price: 200 });
  });

  it('rejoue le transport pour ouvrir un emplacement sans modifier l’état officiel', () => {
    const G = actions({ money: 500 });
    // Access to D1 is gated by the transport in C1, even when D3 is already available.
    for (const [id, placed] of Object.entries(G.board)) if (placed?.category === 'transport') G.board[id] = null;
    const snapshot = JSON.stringify(G);
    const transport = tile('Réseau autoroutier');
    const next = purchasePreview(G, transport, 'c1')!;
    expect(next).not.toBeNull();
    expect(next.board.c1?.id).toBe(transport.id);
    expect(purchasePreview(G, tile('Laboratoire des plastiques'), 'd1')).toBeNull();
    expect(purchasePreview(next, tile('Laboratoire des plastiques'), 'd1')).not.toBeNull();
    expect(JSON.stringify(G)).toBe(snapshot);
    expect(purchasePreview(G, tile('Centrale au fioul'), 'd1')).toBeNull();
  });

  it('l’aperçu d’un remplacement retire les anciens effets et reste annulable', () => {
    const G = actions({ money: 500 });
    const next = purchasePreview(G, tile('Centrale au fioul'), 'a1')!;
    expect(next.board.a1).toEqual(tile('Centrale au fioul'));
    expect(G.board.a1?.name).toBe('Centrale à charbon');
    expect(actionFeedback(G, next)).toContain('-100 €');
    const draft = { ...G, plannedActions: [{ type: 'buy' as const, tileId: tile('Centrale au fioul').id, slotId: 'a1' }] };
    expect(previewState(draft)).toEqual(next);
    expect(previewState({ ...draft, plannedActions: [] }).board).toEqual(G.board);
  });

  it('respecte pollution critique, projets spéciaux et actions épuisées', () => {
    const G = actions({ money: 1000, pollution: 16 });
    const next = purchasePreview(G, tile('Ville de culture'))!;
    expect(next.score).toBe(G.score);
    expect(next.money).toBe(600);
    expect(marketAvailability({ ...G, actions: 0 })[tile('Ville de culture').id].state).toBe('unavailable');
    expect(purchasePreview({ ...G, phase: 'draw' }, tile('Ville de culture'))).toBeNull();
  });

  it('explique une technologie hors budget sans autoriser son achat ni inventer de trésorerie', () => {
    const G = actions({ money: 50 });
    const snapshot = JSON.stringify(G);
    expect(purchasePreview(G, tile('Parc éolien'), 'a1')).toBeNull();
    const inspection = inspectPurchase(G, tile('Parc éolien'), 'a1')!;
    expect(inspection.fundingNeeded).toBe(150);
    expect(inspection.state.board.a1?.name).toBe('Parc éolien');
    expect(JSON.stringify(G)).toBe(snapshot);
    expect(inspectPurchase(G, tile('Parc éolien'), 'd1')).toBeNull();
  });

  it('compte les deux prospérités de 2030 à partir des révélations publiques', () => {
    const prosperity = BASE_CATALOG.filter(t => t.decade === 2030 && t.tally === 'prosperity');
    expect(prosperity).toHaveLength(2);
    const G = actions({ current: prosperity[0].id, log: [{ turn: 31, kind: 'event', text: 'Révélation publique', revealedTileId: prosperity[0].id }] });
    expect(decadeProgress(G).symbols.find(s => s.symbol === 'prosperity')).toMatchObject({ total: 2, done: 1, remaining: 1 });
    // A bought or replaced technology still counts; a hidden multiplayer deck is never read.
    Object.defineProperty(G, 'deck', { get() { throw new Error('secret'); } });
    G.current = prosperity[1].id;
    expect(decadeProgress(G).symbols.find(s => s.symbol === 'prosperity')).toMatchObject({ done: 2, remaining: 0 });
  });

  it('récupère les révélations des anciennes sauvegardes sans inférer la pioche', () => {
    const G = actions({ current: '1970-0', log: [{ turn: 1, kind: 'event', text: '1970 · Centrale solaire. Décompte : énergie.' }] });
    const result = decadeProgress(G);
    expect(result.decade).toBe(1970);
    expect(result.symbols.find(s => s.symbol === 'energy')?.done).toBe(1);
  });

  it('le suivi respecte les catalogues personnalisés et les symboles absents', () => {
    const custom: Tile = { ...tile('Centrale au fioul'), id: 'custom', decade: 2030, tally: 'research' };
    const G = initialState([custom]);
    expect(decadeProgress(G)).toMatchObject({ decade: 2030 });
    expect(decadeProgress(G).symbols.find(s => s.symbol === 'research')).toMatchObject({ total: 1, done: 0 });
    expect(decadeProgress(G).symbols.find(s => s.symbol === 'prosperity')?.total).toBe(0);
  });
});
