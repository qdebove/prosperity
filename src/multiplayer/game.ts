import type { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { BASE_CATALOG, LABELS, validateCatalog } from '../game/catalog';
import { FINAL_STEPS, initialState, POLLUTION_LIMIT, previewState, resolveEnergy, resolveResearch, tally } from '../game/engine';
import type { GameState, Symbol, Track } from '../game/types';
import { GAME_NAME, type AuthoritativeGameState, type CommitPreparedTurnCommand, type MatchSetup, type MultiplayerErrorCode, type PlayerGameState } from './types';
import { isCommit } from './validation';

export function playerState(g: GameState): PlayerGameState {
  return { board: g.board, money: g.money, pollution: g.pollution, score: g.score, research: g.research, finalScores: g.finalScores };
}

// A projection, not a second rules engine. The UI and all tallies/actions use engine.ts.
export function nationView(G: AuthoritativeGameState, playerId: string): GameState {
  const decision = G.pendingDecision?.playerId === playerId ? G.pendingDecision : null;
  return { ...G.shared, ...G.players[playerId], version: 1, seed: '', deck: Array(G.shared.deckCount).fill('hidden'),
    plannedActions: [], pending: decision?.amount ?? 0, phase: decision?.type ?? G.shared.phase };
}
function absorb(G: AuthoritativeGameState, playerId: string, view: GameState) {
  G.players[playerId] = playerState(view);
  const name = G.participants.find(p => p.playerId === playerId)!.displayName;
  G.shared.log.push(...view.log.map(entry => ({ ...entry, text: `${name} · ${entry.text}` })));
}
export function publicGameState(G: AuthoritativeGameState): AuthoritativeGameState {
  const { secret: _, ...view } = G;
  return view;
}
export const turnId = (ctx: Ctx) => String(ctx.turn);
export const fingerprint = (command: CommitPreparedTurnCommand) => JSON.stringify([command.gameId, command.playerId, command.turnId, command.baseRevision, command.actions]);

export function validateCommit(G: AuthoritativeGameState, ctx: Ctx, playerId: string, revision: number, value: unknown): MultiplayerErrorCode | null {
  if (!isCommit(value)) return 'INVALID_REQUEST';
  if (value.gameId !== G.shared.id || value.playerId !== playerId || !Object.hasOwn(G.players, playerId)) return 'SESSION_INVALID';
  const receipt = G.secret?.commands[value.commandId];
  if (receipt) return receipt.playerId === playerId && receipt.fingerprint === fingerprint(value) ? 'DUPLICATE_COMMAND' : 'INVALID_REQUEST';
  if (value.baseRevision !== revision || value.turnId !== turnId(ctx)) return 'STALE_DRAFT';
  if (ctx.currentPlayer !== playerId) return 'NOT_YOUR_TURN';
  if (G.pendingDecision) return 'PENDING_DECISION';
  if (G.shared.phase !== 'actions') return 'INVALID_PHASE';
  if (value.actions.length !== 2) return 'INVALID_ACTION_COUNT';
  try { if (previewState({ ...nationView(G, playerId), plannedActions: value.actions }).actions !== 0) return 'INVALID_ACTION_COUNT'; }
  catch { return 'INVALID_ACTION'; }
  return null;
}

export function researchRanking(G: AuthoritativeGameState) {
  for (const track of ['energy', 'ecology'] as Track[]) {
    const ordered = G.participants.map(p => p.playerId).sort((a, b) => G.players[b].research[track] - G.players[a].research[track]);
    const leaders = ordered.filter(id => G.players[id].research[track] === G.players[ordered[0]].research[track]);
    const seconds = ordered.filter(id => !leaders.includes(id) && G.players[id].research[track] === G.players[ordered[1]].research[track]);
    for (const id of ordered) {
      const points = G.players[id].pollution >= POLLUTION_LIMIT ? 0 : leaders.includes(id) ? (leaders.length > 1 ? 2 : 3) : leaders.length === 1 && seconds.length === 1 && seconds[0] === id ? 1 : 0;
      G.players[id].score += points;
      G.players[id].finalScores.push({ label: `Classement ${LABELS[track].toLowerCase()}`, value: points });
      G.shared.log.push({ turn: G.shared.turn, kind: 'final', text: `${G.participants.find(p => p.playerId === id)!.displayName} · Classement ${LABELS[track]} : +${points} points.` });
    }
  }
}
function finishTallies(G: AuthoritativeGameState) {
  if (G.shared.finalStep === 6) researchRanking(G);
  if (G.shared.finalStep === FINAL_STEPS.length) {
    G.shared.phase = 'finished';
    const ordered = G.participants.map(p => ({ playerId: p.playerId, score: G.players[p.playerId].score, money: G.players[p.playerId].money, rank: 0 }))
      .sort((a, b) => b.score - a.score || b.money - a.money);
    ordered.forEach((row, i) => { row.rank = i && row.score === ordered[i - 1].score && row.money === ordered[i - 1].money ? ordered[i - 1].rank : i + 1; });
    G.ranking = ordered;
  } else G.shared.phase = G.shared.finalStep >= 0 ? 'final' : 'actions';
}
function runTallies(G: AuthoritativeGameState) {
  while (G.tallyQueue.length) {
    const id = G.tallyQueue.shift()!;
    const view = { ...nationView(G, id), log: [] };
    tally(view, G.tallySymbol!, true);
    absorb(G, id, view);
    if (view.phase === 'energy' || view.phase === 'research') {
      G.pendingDecision = { id: `${G.shared.turn}-${G.shared.finalStep}-${id}`, playerId: id, type: view.phase, amount: view.pending };
      G.shared.phase = view.phase;
      return;
    }
  }
  finishTallies(G);
}
function startTally(G: AuthoritativeGameState, ctx: Ctx, symbol: Symbol) {
  const order = ctx.playOrder;
  G.tallyQueue = [...order.slice(ctx.playOrderPos), ...order.slice(0, ctx.playOrderPos)];
  G.tallySymbol = symbol;
  runTallies(G);
}

export function createMultiplayerGame(seed?: string): Game<AuthoritativeGameState, Record<string, unknown>, MatchSetup> {
  return {
    name: GAME_NAME, ...(seed ? { seed } : {}), minPlayers: 2, maxPlayers: 4,
    disableUndo: true,
    // All seats can resolve their own queued tally; every move checks its actor.
    turn: { activePlayers: { all: 'play' }, stages: { play: {} }, order: { first: ({ G }) => G.firstPlayer, next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers } },
    events: { endTurn: false, endGame: false, endPhase: false, setPhase: false, setStage: false, endStage: false, setActivePlayers: false, pass: false },
    validateSetupData: data => !data || !data.gameId || !data.participants || data.participants.length < 2 || data.participants.length > 4 ? 'Match setup required' : undefined,
    setup: ({ random, ctx }, data) => {
      if (!data) throw new Error('Match setup required');
      const catalog = data?.catalog ? validateCatalog(data.catalog) : BASE_CATALOG;
      const base = initialState(catalog, '', deck => random.Shuffle(deck));
      const { board: _b, money: _m, pollution: _p, score: _s, research: _r, finalScores: _f, seed: _seed, version: _v, deck, plannedActions: _a, pending: _pending, ...shared } = base;
      return { shared: { ...shared, custom: JSON.stringify(catalog) !== JSON.stringify(validateCatalog(BASE_CATALOG)), id: data.gameId, deckCount: deck.length, log: [] },
        players: Object.fromEntries(data.participants.map(p => [p.playerId, playerState(initialState(catalog))])),
        participants: data.participants, catalogHash: data.catalogHash, firstPlayer: random.Die(ctx.numPlayers) - 1,
        secret: { deck, commands: {} }, pendingDecision: null, tallyQueue: [], tallySymbol: null, lastCommit: null, ranking: [] };
    },
    playerView: ({ G }) => publicGameState(G),
    endIf: ({ G }) => G.shared.phase === 'finished' ? { ranking: G.ranking } : undefined,
    moves: {
      draw: { client: false, undoable: false, move: ({ G, ctx, playerID }) => {
        if (playerID !== ctx.currentPlayer || G.shared.phase !== 'draw') return INVALID_MOVE;
        G.shared.current = G.secret!.deck.shift()!;
        G.shared.deckCount = G.secret!.deck.length;
        G.shared.turn++;
        G.shared.actions = 2;
        G.shared.lastMove = 'draw';
        const tile = G.shared.catalog.find(t => t.id === G.shared.current)!;
        G.shared.market.push(tile.id);
        G.shared.log.push({ turn: G.shared.turn, kind: 'event', text: `${G.participants.find(p => p.playerId === playerID)!.displayName} révèle ${tile.name}. Décompte ${LABELS[tile.tally]}.` });
        startTally(G, ctx, tile.tally);
      } },
      commitPreparedTurn: { client: false, undoable: false, move: ({ G, ctx, playerID, events }, command: CommitPreparedTurnCommand) => {
        // Revision is additionally checked against _stateID at the transport boundary.
        if (validateCommit(G, ctx, playerID!, command?.baseRevision, command)) return INVALID_MOVE;
        const preview = previewState({ ...nationView(G, playerID!), log: [], plannedActions: command.actions });
        absorb(G, playerID!, preview);
        G.shared.market = preview.market;
        G.shared.actions = 0;
        G.shared.lastMove = 'action';
        G.secret!.commands[command.commandId] = { playerId: playerID!, fingerprint: fingerprint(command) };
        G.lastCommit = { commandId: command.commandId, playerId: playerID!, turnId: command.turnId, actions: command.actions,
          descriptions: preview.log.map(e => e.text), fromRevision: command.baseRevision, toRevision: command.baseRevision + 1 };
        if (G.secret!.deck.length) { G.shared.phase = 'draw'; events.endTurn(); }
        else {
          G.shared.phase = 'final'; G.shared.finalStep = 0;
          for (const player of Object.values(G.players)) player.finalScores = [{ label: 'Points acquis pendant la partie', value: player.score }];
        }
      } },
      resolveDecision: { client: false, undoable: false, move: ({ G, playerID }, decisionId: string, value: number) => {
        const decision = G.pendingDecision;
        if (!decision || decision.playerId !== playerID || decision.id !== decisionId || !Number.isSafeInteger(value)) return INVALID_MOVE;
        const view = { ...nationView(G, playerID), log: [] };
        if (!(decision.type === 'energy' ? resolveEnergy(view, value) : resolveResearch(view, value))) return INVALID_MOVE;
        absorb(G, playerID, view);
        G.pendingDecision = null;
        G.shared.lastMove = 'resolve';
        runTallies(G);
      } },
      nextFinal: { client: false, undoable: false, move: ({ G, ctx, playerID }) => {
        if (ctx.currentPlayer !== playerID || G.shared.phase !== 'final' || G.pendingDecision || G.shared.finalStep >= FINAL_STEPS.length) return INVALID_MOVE;
        const symbol = FINAL_STEPS[G.shared.finalStep++];
        G.shared.lastMove = 'final';
        startTally(G, ctx, symbol);
      } },
    },
  };
}
