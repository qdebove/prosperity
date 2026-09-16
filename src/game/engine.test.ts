import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { BASE_CATALOG, SLOTS, validateCatalog } from './catalog';
import { createGame, initialState, legalSlots, levelAt, pollutionBonus, previewState, priceOf, totals } from './engine';
import type { GameState, Symbol } from './types';

function playable(overrides: Partial<GameState> = {}) {
  const g = { ...initialState(), phase: 'actions' as const, actions: 2, ...overrides };
  return Client({ game: createGame(BASE_CATALOG, 'test', g), numPlayers: 1, debug: false });
}
const preview = (client: ReturnType<typeof playable>) => previewState(client.getState()!.G);
function event(symbol: Symbol, overrides: Partial<GameState> = {}) {
  const t = BASE_CATALOG.find(t => t.decade === 1970 && t.tally === symbol)!;
  const c = playable({ ...overrides, deck: [t.id], phase: 'draw', turn: 0 });
  c.moves.draw();
  return c;
}

describe('catalogue et mise en place', () => {
  it('reproduit les 24 tuiles de départ et les 36 tuiles datées', () => {
    expect(validateCatalog(BASE_CATALOG)).toHaveLength(60);
    expect(BASE_CATALOG.filter(t => !t.decade)).toHaveLength(24);
    for (const decade of [1970, 1980, 1990, 2000, 2010, 2020, 2030]) {
      const tiles = BASE_CATALOG.filter(t => t.decade === decade);
      expect(tiles).toHaveLength(decade === 2030 ? 6 : 5);
      expect(new Set(tiles.map(t => t.tally)).size).toBe(5);
    }
  });
  it('reproduit les symboles imprimés sur le pays argent', () => {
    const g = initialState();
    expect(totals(g)).toEqual({ energy: 1, ecology: -1, capital: 1, research: 1, prosperity: 0 });
    expect(g.money).toBe(100); expect(g.pollution).toBe(8);
    expect(Object.keys(g.board)).toHaveLength(11);
  });
  it('mélange les décennies séparément avec une graine reproductible', () => {
    const make = () => Client({ game: createGame(BASE_CATALOG, 'fixed'), numPlayers: 1, debug: false }).getState()!.G;
    expect(make().deck).toEqual(make().deck);
    expect(make().deck).toHaveLength(36);
    expect(new Set(make().deck.slice(0, 5))).toEqual(new Set(BASE_CATALOG.filter(t => t.decade === 1970).map(t => t.id)));
  });
  it('refuse les imports invalides, les doublons et les URL actives', () => {
    expect(() => validateCatalog([...BASE_CATALOG, BASE_CATALOG[0]])).toThrow();
    expect(() => validateCatalog([{ ...BASE_CATALOG[0], image: 'javascript:alert(1)' }])).toThrow();
    expect(() => validateCatalog([{ ...BASE_CATALOG[0], energy: 1.5 }])).toThrow();
    expect(() => validateCatalog([{ ...BASE_CATALOG[0], level: 7 }])).toThrow();
    expect(() => validateCatalog([{ ...BASE_CATALOG[0], category: '__proto__' }])).toThrow();
    expect(() => validateCatalog([{ ...BASE_CATALOG[0], effect: 'points', amount: 2 }])).toThrow();
  });
});

describe('actions et construction', () => {
  it('permet deux actions identiques, mais pas de troisième', () => {
    const c = playable(); c.moves.income(); c.moves.income(); c.moves.income();
    expect(preview(c).money).toBe(300); expect(preview(c).actions).toBe(0);
  });
  it('refuse les actions avant le décompte', () => {
    const c = playable({ phase: 'draw', actions: 0 }); c.moves.income();
    expect(c.getState()!.G.money).toBe(100);
  });
  it('ne rémunère pas les dépollutions par action', () => {
    const c = playable({ pollution: 0 }); c.moves.cleanup();
    expect(c.getState()!.G.actions).toBe(2); expect(c.getState()!.G.money).toBe(100);
  });
  it('avance case par case, selon les 6 niveaux', () => {
    expect([0, 1, 2, 4, 5, 8, 9, 13, 14, 19, 20, 26].map(levelAt)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    const c = playable(); c.moves.research('energy'); expect(levelAt(preview(c).research.energy)).toBe(1);
    c.moves.research('energy'); expect(levelAt(preview(c).research.energy)).toBe(2);
  });
  it('calcule les prix au niveau, pas au nombre de cases', () => {
    const g = initialState(); const tile = BASE_CATALOG.find(t => t.id === 'initial-17')!;
    expect(priceOf(g, tile)).toBe(200); g.research.energy = 2; expect(priceOf(g, tile)).toBe(100);
    g.research.energy = 5; expect(priceOf(g, tile)).toBe(50);
  });
  it('interdit un achat trop cher ou une catégorie incompatible', () => {
    const c = playable(); c.moves.buy('initial-17', 'b1'); c.moves.buy('initial-20', 'a2');
    expect(c.getState()!.G.money).toBe(100); expect(c.getState()!.G.actions).toBe(2);
  });
  it('remplace tous les effets de l’ancienne tuile', () => {
    const c = playable(); c.moves.buy('initial-20', 'a1');
    const g = preview(c);
    expect(totals(g).energy).toBe(3); expect(totals(g).ecology).toBe(-2);
    expect(g.market).not.toContain('initial-20'); expect(g.money).toBe(0);
  });
  it('verrouille deux infrastructures jusqu’au remplacement de la ceinture verte', () => {
    const c = playable({ money: 1000 }); const tile = BASE_CATALOG.find(t => t.id === 'initial-23')!;
    expect(legalSlots(c.getState()!.G, tile)).not.toContain('d1');
    expect(legalSlots(c.getState()!.G, tile)).toContain('d3');
    c.moves.buy(tile.id, 'd1'); expect(c.getState()!.G.actions).toBe(2);
    c.moves.buy('initial-21', 'c1');
    expect(legalSlots(preview(c), tile)).toContain('d1');
    expect(legalSlots(preview(c), tile)).toContain('d2');
    c.moves.buy(tile.id, 'd2'); expect(preview(c).board.d2?.id).toBe(tile.id);
  });
  it('applique les projets spéciaux sans poser de tuile et sans surpayer une dépollution', () => {
    const c = playable({ money: 1000, pollution: 1 }); c.moves.buy('initial-5');
    expect(preview(c).pollution).toBe(0); expect(preview(c).money).toBe(500);
    expect(Object.values(preview(c).board).filter(Boolean)).toHaveLength(6);
  });
  it('bloque aussi les gains immédiats en pollution critique', () => {
    const c = playable({ money: 1000, pollution: 16 }); c.moves.buy('initial-9');
    expect(preview(c).score).toBe(0);
  });
  it('annule la dernière action préparée', () => {
    const c = playable(); c.moves.income(); c.moves.undoPlan();
    expect(preview(c).money).toBe(100); expect(preview(c).actions).toBe(2);
  });
});

describe('préparation et validation atomique du tour', () => {
  it('garde le pays et le journal intacts avant validation', () => {
    const c = playable();
    const before = c.getState()!.G;
    c.moves.income();
    c.moves.buy('initial-17', 'b1');
    const staged = c.getState()!.G;
    expect(staged.money).toBe(before.money);
    expect(staged.board).toEqual(before.board);
    expect(staged.market).toEqual(before.market);
    expect(staged.log).toEqual(before.log);
    expect(staged.plannedActions).toHaveLength(2);
    expect(preview(c).money).toBe(0);
    expect(preview(c).board.b1?.id).toBe('initial-17');
    const expected = preview(c);
    c.moves.commit();
    expect(c.getState()!.G).toEqual({ ...expected, phase: 'committed' });
  });
  it('refuse une validation incomplète et une pioche avant validation', () => {
    const c = playable();
    c.moves.commit();
    expect(c.getState()!.G.phase).toBe('actions');
    c.moves.income(); c.moves.commit();
    expect(c.getState()!.G.phase).toBe('actions');
    c.moves.cleanup(); c.moves.draw();
    expect(c.getState()!.G.turn).toBe(0);
    expect(c.getState()!.G.plannedActions).toHaveLength(2);
    c.moves.commit();
    const committed = c.getState()!.G;
    c.moves.income(); c.moves.undoPlan(); c.moves.resetPlan(); c.undo();
    expect(c.getState()!.G).toEqual(committed);
    c.moves.draw();
    expect(c.getState()!.G.turn).toBe(1);
    expect(c.getState()!.G.plannedActions).toEqual([]);
  });
  it('répercute une recherche dans le prix de la seconde action', () => {
    const c = playable({ research: { energy: 1, ecology: 0 } });
    const tile = BASE_CATALOG.find(t => t.id === 'initial-17')!;
    expect(priceOf(preview(c), tile)).toBe(200);
    c.moves.research('energy');
    expect(priceOf(preview(c), tile)).toBe(100);
    c.moves.buy(tile.id, 'b1');
    expect(preview(c).money).toBe(0);
    c.moves.resetPlan();
    expect(priceOf(preview(c), tile)).toBe(200);
    expect(preview(c).board.b1).toBeNull();
    expect(preview(c).money).toBe(100);
  });
  it('restaure la tuile remplacée, ses effets, le marché et le budget', () => {
    const c = playable();
    const before = preview(c);
    c.moves.buy('initial-20', 'a1'); c.moves.cleanup();
    c.moves.undoPlan();
    expect(preview(c).pollution).toBe(before.pollution);
    expect(preview(c).board.a1?.id).toBe('initial-20');
    c.moves.undoPlan();
    expect(preview(c)).toEqual(before);
  });
  it('annule aussi le transport et les infrastructures devenues accessibles', () => {
    const c = playable({ money: 1000 });
    const before = preview(c);
    c.moves.buy('initial-21', 'c1'); c.moves.buy('initial-23', 'd1');
    expect(preview(c).board.d1?.id).toBe('initial-23');
    c.moves.undoPlan();
    expect(legalSlots(preview(c), BASE_CATALOG.find(t => t.id === 'initial-23')!)).toContain('d1');
    c.moves.resetPlan();
    expect(preview(c)).toEqual(before);
  });
  it('annule les effets immédiats des projets spéciaux', () => {
    const c = playable({ money: 2000 });
    const before = preview(c);
    c.moves.buy('initial-5'); c.moves.buy('initial-9');
    expect(preview(c).pollution).toBeLessThan(before.pollution);
    expect(preview(c).score).toBeGreaterThan(before.score);
    c.moves.resetPlan();
    expect(preview(c)).toEqual(before);
  });
  it('ne consomme pas une action invalide, même après une préparation', () => {
    const c = playable({ money: 0, pollution: 1, research: { energy: 26, ecology: 0 } });
    c.moves.cleanup(); c.moves.cleanup(); c.moves.research('energy'); c.moves.research('unknown');
    c.moves.buy('initial-17', 'b1');
    expect(c.getState()!.G.plannedActions).toEqual([{ type: 'cleanup' }]);
    expect(preview(c).actions).toBe(1);
  });
  it('produit un aperçu pur et indépendant des appels précédents', () => {
    const c = playable(); c.moves.income(); c.moves.research('energy');
    const g = c.getState()!.G;
    const serialized = JSON.stringify(g);
    expect(previewState(g)).toEqual(previewState(g));
    expect(JSON.stringify(g)).toBe(serialized);
  });
  it.each([0, 1, 2])('reprend %i action(s) préparée(s) après sérialisation', count => {
    let c = playable();
    for (let i = 0; i < count; i++) c.moves.income();
    const expected = preview(c);
    const saved = JSON.parse(JSON.stringify(c.getState()!.G));
    c = Client({ game: createGame(saved.catalog, saved.seed, saved), numPlayers: 1, debug: false });
    expect(preview(c)).toEqual(expected);
    for (let i = count; i < 2; i++) c.moves.income();
    c.moves.commit();
    expect(c.getState()!.G.money).toBe(300);
    expect(c.getState()!.G.phase).toBe('committed');
  });
});

describe('décomptes', () => {
  it('verse 50 € par énergie positive', () => { const c = event('energy'); expect(c.getState()!.G.money).toBe(150); });
  it('laisse payer seulement une partie du déficit, sans dette', () => {
    const g = initialState(); g.board.a1 = null; g.board.a2 = BASE_CATALOG.find(t => t.id === 'initial-3')!;
    const c = event('energy', { board: g.board, money: 200 });
    expect(c.getState()!.G.pending).toBe(5);
    c.moves.resolveEnergy(3); expect(c.getState()!.G.phase).toBe('energy');
    c.moves.resolveEnergy(2); expect(c.getState()!.G.money).toBe(0); expect(c.getState()!.G.pollution).toBe(11);
    expect(c.getState()!.G.actions).toBe(2);
  });
  it('ajoute la pollution écologique négative', () => { expect(event('ecology').getState()!.G.pollution).toBe(9); });
  it('rémunère seulement l’excédent du décompte écologique', () => {
    const g = initialState(); g.board.a2 = BASE_CATALOG.find(t => t.id === 'initial-19')!;
    const c = event('ecology', { board: g.board, pollution: 0 });
    expect(c.getState()!.G.money).toBe(150); expect(c.getState()!.G.pollution).toBe(0);
  });
  it('verse le capital visible', () => { expect(event('capital').getState()!.G.money).toBe(200); });
  it('répartit la recherche sans autoriser de dépassement', () => {
    const c = event('research'); c.moves.resolveResearch(2); expect(c.getState()!.G.phase).toBe('research');
    c.moves.resolveResearch(0); expect(c.getState()!.G.research).toEqual({ energy: 0, ecology: 1 });
  });
  it('écarte les points excédentaires au sommet des pistes', () => {
    const g = initialState(); g.board.b3 = BASE_CATALOG.find(t => t.id === 'initial-15')!;
    const c = event('research', { board: g.board, research: { energy: 26, ecology: 25 } });
    c.moves.resolveResearch(0); expect(c.getState()!.G.research).toEqual({ energy: 26, ecology: 26 });
  });
  it('compte les symboles de pollution découverts aux cases 1, 6 et 11', () => {
    expect([0, 1, 5, 6, 10, 11, 15, 16].map(pollutionBonus)).toEqual([3, 2, 2, 1, 1, 0, 0, 0]);
    expect(event('prosperity').getState()!.G.score).toBe(1);
    expect(event('prosperity', { pollution: 0 }).getState()!.G.score).toBe(3);
    expect(event('prosperity', { pollution: 16 }).getState()!.G.score).toBe(0);
  });
});

describe('décompte final et parties complètes', () => {
  it('respecte le double énergie, double écologie, conversion, recherche sur les deux pistes et prospérité', () => {
    const c = playable({ deck: [], phase: 'committed', actions: 0, money: 500, pollution: 0, score: 5 });
    c.moves.draw(); for (let i = 0; i < 7; i++) c.moves.nextFinal();
    const g = c.getState()!.G;
    expect(g.money).toBe(100); // 500 + 2*50 + 100 = 700, converted into 2 points.
    expect(g.pollution).toBe(2); expect(g.research).toEqual({ energy: 1, ecology: 1 });
    expect(g.score).toBe(9); expect(g.phase).toBe('finished');
    expect(c.getState()!.ctx.gameover).toEqual({ score: 9 });
  });
  it('résout séparément les deux déficits énergétiques finaux', () => {
    const g = initialState(); g.board.a1 = null;
    const c = playable({ board: g.board, deck: [], phase: 'committed', actions: 0, money: 100 }); c.moves.draw(); c.moves.nextFinal();
    expect(c.getState()!.G.phase).toBe('energy'); c.moves.resolveEnergy(1); c.moves.nextFinal();
    expect(c.getState()!.G.phase).toBe('energy'); c.moves.resolveEnergy(0);
    expect(c.getState()!.G.pollution).toBe(9);
  });
  it('termine 36 tours, compte 72 actions et reste rechargeable à chaque phase', () => {
    let c = Client({ game: createGame(BASE_CATALOG, 'complete'), numPlayers: 1, debug: false });
    let guard = 0; let actions = 0;
    while (c.getState()!.G.phase !== 'finished' && guard++ < 220) {
      const g = c.getState()!.G;
      if (guard % 9 === 0) c = Client({ game: createGame(g.catalog, g.seed, JSON.parse(JSON.stringify(g))), numPlayers: 1, debug: false });
      if (g.phase === 'draw' || g.phase === 'committed') c.moves.draw();
      else if (g.phase === 'energy') c.moves.resolveEnergy(0);
      else if (g.phase === 'research') c.moves.resolveResearch(Math.min(g.pending, 26 - g.research.energy));
      else if (g.phase === 'final') c.moves.nextFinal();
      else if (g.phase === 'actions' && preview(c).actions === 0) c.moves.commit();
      else if (g.phase === 'actions') { actions++; preview(c).pollution > 0 ? c.moves.cleanup() : c.moves.income(); }
    }
    expect(guard).toBeLessThan(220); expect(actions).toBe(72); expect(c.getState()!.G.turn).toBe(36);
    expect(c.getState()!.G.phase).toBe('finished'); expect(c.getState()!.G.score).toBeGreaterThan(0);
  });
  it('garde les créations dans leur décennie et adapte le nombre de tours', () => {
    const catalog = [...BASE_CATALOG, { ...BASE_CATALOG[24], id: 'custom-extra' }];
    const g = initialState(catalog); expect(g.totalTurns).toBe(37); expect(g.deck.indexOf('custom-extra')).toBeLessThan(6);
    expect(g.custom).toBe(true);
  });
});
