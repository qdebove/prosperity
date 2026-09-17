import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { BASE_CATALOG } from '../game/catalog';
import { previewState, priceOf } from '../game/engine';
import { compatibleDraft, emptyDraft, prepareAction } from './draft';
import { createMultiplayerGame, nationView, publicGameState, researchRanking, turnId, validateCommit } from './game';
import type { AuthoritativeGameState, CommitPreparedTurnCommand, MatchSetup } from './types';

const setup: MatchSetup = { gameId: 'test-match', catalog: BASE_CATALOG, catalogHash: 'test-hash', participants: ['Alice', 'Bob', 'Charlie'].map((displayName, i) => ({ playerId: String(i), displayName })) };
function client(edit?: (G: AuthoritativeGameState) => void, catalog = BASE_CATALOG) {
  const game = createMultiplayerGame('test');
  return Client({ game: { ...game, playerView: ({ G }) => G, setup: ctx => { const G = game.setup!(ctx, { ...setup, catalog }); edit?.(G); return G; } }, numPlayers: 3, playerID: '0', debug: false });
}
type TestClient = ReturnType<typeof client>;
function actor(c: TestClient) { const s = c.getState()!; c.updatePlayerID(s.G.pendingDecision?.playerId ?? s.ctx.currentPlayer); }
function actions(c: TestClient) {
  for (let i = 0; i < 8 && c.getState()!.G.shared.phase !== 'actions'; i++) {
    actor(c);
    const g = c.getState()!.G;
    if (g.shared.phase === 'draw') c.moves.draw();
    else if (g.pendingDecision) c.moves.resolveDecision(g.pendingDecision.id, 0);
  }
  actor(c);
  expect(c.getState()!.G.shared.phase).toBe('actions');
}
function command(c: TestClient, prepared: CommitPreparedTurnCommand['actions'] = [{ type: 'income' }, { type: 'income' }]): CommitPreparedTurnCommand {
  const s = c.getState()!;
  return { ...emptyDraft(s.G, s.ctx, s._stateID, s.ctx.currentPlayer), commandId: `command-${s._stateID}`, actions: prepared };
}

describe('multijoueur : mêmes règles, nations indépendantes', () => {
  it('mélange reproductible, premier joueur aléatoire et ordre des tours natif', () => {
    const c = client(); const initial = c.getState()!;
    expect(initial.G.secret!.deck).toEqual(client().getState()!.G.secret!.deck);
    expect(initial.ctx.playOrderPos).toBe(initial.G.firstPlayer);
    actions(c); c.moves.commitPreparedTurn(command(c));
    expect(c.getState()!.ctx.playOrderPos).toBe((initial.ctx.playOrderPos + 1) % 3);
  });
  it.each(['energy', 'ecology', 'capital', 'research', 'prosperity'] as const)('décompte %s sur trois nations dans l’ordre actif', symbol => {
    const c = client(G => {
      G.secret!.deck = [BASE_CATALOG.find(t => t.decade && t.tally === symbol)!.id];
      G.players['1'].money = 500;
      G.players['2'].pollution = 0;
    });
    const before = c.getState()!.G;
    actions(c);
    const g = c.getState()!.G;
    for (const id of ['0', '1', '2']) {
      if (symbol === 'energy') expect(g.players[id].money).toBe(before.players[id].money + 50);
      if (symbol === 'capital') expect(g.players[id].money).toBe(before.players[id].money + 100);
      if (symbol === 'ecology') expect(g.players[id].pollution).toBe(before.players[id].pollution + 1);
      if (symbol === 'research') expect(g.players[id].research.ecology).toBe(1);
      if (symbol === 'prosperity') expect(g.players[id].score).toBe(id === '2' ? 3 : 1);
    }
  });
  it('attend chaque décision, refuse un autre joueur et garde les deux actions', () => {
    const c = client(G => { G.secret!.deck = ['1970-0']; for (const p of Object.values(G.players)) p.board.a1 = null; });
    actor(c); c.moves.draw();
    const g = c.getState()!.G;
    expect(g.pendingDecision!.playerId).toBe(c.getState()!.ctx.currentPlayer);
    c.updatePlayerID(String((Number(g.pendingDecision!.playerId) + 1) % 3));
    c.moves.resolveDecision(g.pendingDecision!.id, 0);
    expect(c.getState()!.G).toEqual(g);
    actions(c); expect(c.getState()!.G.shared.actions).toBe(2);
    expect(Object.values(c.getState()!.G.players).map(p => p.pollution)).toEqual([9, 9, 9]);
  });
});

describe('préparation privée et commit atomique', () => {
  it('ne change rien avant validation, annule B et ne valide que A+C', () => {
    const c = client(); actions(c); const s = c.getState()!;
    let draft = emptyDraft(s.G, s.ctx, s._stateID, s.ctx.currentPlayer);
    draft = prepareAction(draft, s.G, { type: 'income' });
    draft = prepareAction(draft, s.G, { type: 'cleanup' });
    expect(c.getState()!.G).toEqual(s.G);
    draft = { ...draft, actions: draft.actions.slice(0, -1) };
    draft = prepareAction(draft, s.G, { type: 'research', track: 'energy' });
    const expected = previewState({ ...nationView(s.G, draft.playerId), plannedActions: draft.actions });
    c.moves.commitPreparedTurn({ ...draft, commandId: 'one' });
    const g = c.getState()!.G;
    expect(g.players[draft.playerId].money).toBe(expected.money);
    expect(g.players[draft.playerId].pollution).toBe(s.G.players[draft.playerId].pollution);
    expect(g.players[draft.playerId].research).toEqual(expected.research);
    expect(g.lastCommit!.actions).toEqual(draft.actions);
    for (const id of Object.keys(g.players).filter(id => id !== draft.playerId)) expect(g.players[id]).toEqual(s.G.players[id]);
  });
  it('refuse un batch dont la deuxième action est illégale sans application partielle', () => {
    const c = client(); actions(c); const before = c.getState()!;
    const cmd = command(c, [{ type: 'income' }, { type: 'buy', tileId: 'missing', slotId: 'a1' }]);
    expect(validateCommit(before.G, before.ctx, before.ctx.currentPlayer, before._stateID, cmd)).toBe('INVALID_ACTION');
    c.moves.commitPreparedTurn(cmd);
    expect(c.getState()!.G).toEqual(before.G); expect(c.getState()!._stateID).toBe(before._stateID);
  });
  it('recherche puis achat utilise le nouveau prix sur client et serveur', () => {
    const c = client(G => { for (const p of Object.values(G.players)) { p.research.energy = 1; p.money = 500; } }); actions(c);
    const s = c.getState()!; const id = s.ctx.currentPlayer; const tile = BASE_CATALOG.find(t => t.id === 'initial-17')!;
    const cmd = command(c, [{ type: 'research', track: 'energy' }, { type: 'buy', tileId: tile.id, slotId: 'b1' }]);
    const oldPrice = priceOf(nationView(s.G, id), tile);
    const expected = previewState({ ...nationView(s.G, id), plannedActions: cmd.actions });
    expect(expected.money).toBe(s.G.players[id].money - oldPrice + 100);
    c.moves.commitPreparedTurn(cmd);
    expect(c.getState()!.G.players[id].money).toBe(expected.money);
    expect(c.getState()!.G.players[id].board).toEqual(expected.board);
  });
  it('achat transport puis infrastructure prend en compte le premier placement', () => {
    const c = client(G => { for (const p of Object.values(G.players)) p.money = 2000; }); actions(c);
    const road = BASE_CATALOG.find(t => t.decade === 0 && t.category === 'transport')!;
    const c1 = command(c, [{ type: 'buy', tileId: road.id, slotId: 'c1' }, { type: 'buy', tileId: 'initial-23', slotId: 'd1' }]);
    const id = c.getState()!.ctx.currentPlayer;
    c.moves.commitPreparedTurn(c1);
    expect(c.getState()!.G.players[id].board.d1?.id).toBe('initial-23');
  });
  it('reconnaît les doublons et refuse révisions, acteurs et intentions falsifiés', () => {
    const c = client(); actions(c); const s = c.getState()!; const cmd = command(c);
    expect(validateCommit(s.G, s.ctx, cmd.playerId, s._stateID + 1, cmd)).toBe('STALE_DRAFT');
    expect(validateCommit(s.G, s.ctx, 'other', s._stateID, cmd)).toBe('SESSION_INVALID');
    expect(validateCommit(s.G, s.ctx, cmd.playerId, s._stateID, { ...cmd, actions: [{ type: 'income', money: 500 }, { type: 'income' }] })).toBe('INVALID_REQUEST');
    c.moves.commitPreparedTurn(cmd); const after = c.getState()!;
    expect(validateCommit(after.G, after.ctx, cmd.playerId, after._stateID, cmd)).toBe('DUPLICATE_COMMAND');
    c.moves.commitPreparedTurn(cmd); expect(c.getState()!.G).toEqual(after.G);
    c.undo(); expect(c.getState()!.G).toEqual(after.G);
  });
  it('restaure uniquement un draft du même match, joueur, tour, phase et révision', () => {
    const c = client(); actions(c); const s = c.getState()!; const cmd = command(c);
    expect(compatibleDraft(JSON.parse(JSON.stringify(cmd)), s.G, s.ctx, s._stateID, cmd.playerId)).toBe(true);
    expect(compatibleDraft(cmd, s.G, s.ctx, s._stateID + 1, cmd.playerId)).toBe(false);
    c.moves.commitPreparedTurn(cmd); const after = c.getState()!;
    expect(compatibleDraft(cmd, after.G, after.ctx, after._stateID, cmd.playerId)).toBe(false);
  });
  it('retire deck et reçus privés de la vue publique', () => {
    const s = client().getState()!;
    expect(publicGameState(s.G).secret).toBeUndefined();
    expect(JSON.stringify(publicGameState(s.G))).not.toContain('seed');
    expect(nationView(publicGameState(s.G), '0').deck.every(id => id === 'hidden')).toBe(true);
  });
});

describe('fin multijoueur', () => {
  it('la pollution critique bloque aussi les bonus de classement de recherche', () => {
    const G = structuredClone(client().getState()!.G);
    G.players['0'].research = { energy: 26, ecology: 26 }; G.players['0'].pollution = 16;
    G.players['1'].research = { energy: 10, ecology: 10 };
    researchRanking(G);
    expect(G.players['0'].score).toBe(0); expect(G.players['1'].score).toBe(2);
  });
  it('départage le score par la trésorerie et conserve les ex æquo exacts', () => {
    const c = client(G => {
      G.shared.phase = 'final'; G.shared.finalStep = 6;
      for (const p of Object.values(G.players)) { p.pollution = 16; p.score = 9; }
      G.players['0'].money = 50; G.players['1'].money = 100; G.players['2'].money = 100;
    });
    actor(c); c.moves.nextFinal();
    expect(c.getState()!.G.ranking.map(p => [p.playerId, p.rank])).toEqual([['1', 1], ['2', 1], ['0', 3]]);
  });
  it.each([
    [[5, 3, 1], [3, 1, 0]], [[5, 5, 1], [2, 2, 0]], [[5, 3, 3], [3, 0, 0]], [[5, 5, 5], [2, 2, 2]],
  ])('classe les égalités %j', (positions, expected) => {
    const G = structuredClone(client().getState()!.G);
    for (let i = 0; i < 3; i++) G.players[String(i)].research = { energy: positions[i], ecology: positions[i] };
    researchRanking(G);
    expect(Object.values(G.players).map(p => p.score)).toEqual(expected.map(n => n * 2));
  });
  it('termine les 36 tours et départage avec la trésorerie restante', () => {
    const c = client(); let guard = 0;
    while (c.getState()!.G.shared.phase !== 'finished' && guard++ < 250) {
      actor(c); const s = c.getState()!;
      if (s.G.pendingDecision) c.moves.resolveDecision(s.G.pendingDecision.id, 0);
      else if (s.G.shared.phase === 'draw') c.moves.draw();
      else if (s.G.shared.phase === 'actions') c.moves.commitPreparedTurn(command(c));
      else if (s.G.shared.phase === 'final') c.moves.nextFinal();
    }
    const s = c.getState()!;
    expect(guard).toBeLessThan(250); expect(s.G.shared.turn).toBe(36);
    expect(s.ctx.gameover).toEqual({ ranking: s.G.ranking }); expect(s.G.ranking).toHaveLength(3);
    expect(s.G.players['0'].finalScores.some(row => row.label === 'Classement énergie')).toBe(true);
    expect(turnId(s.ctx)).toBe('36');
  });
});
