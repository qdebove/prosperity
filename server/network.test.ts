import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { io, type Socket } from 'socket.io-client';
import { createMultiplayerServer } from './app';
import { createMultiplayerGame, nationView } from '../src/multiplayer/game';
import { emptyDraft, prepareAction } from '../src/multiplayer/draft';
import { previewState } from '../src/game/engine';
import { BASE_CATALOG } from '../src/game/catalog';
import { GAME_NAME, type AuthoritativeGameState, type CommandResult, type Lobby, type Session } from '../src/multiplayer/types';
import type { State } from 'boardgame.io';

const audit: Record<string, unknown>[] = [];
const server = createMultiplayerServer({ config: { host: '127.0.0.1', port: 0, origins: ['http://127.0.0.1:3000'], maxBodyBytes: 4 * 1024 * 1024 }, audit: event => audit.push(event) });
let url = '';
const clients: ReturnType<typeof networkClient>[] = [];
const sockets: Socket[] = [];
beforeAll(async () => { const { appServer } = await server.start(); url = `http://127.0.0.1:${(appServer.address() as { port: number }).port}`; });
afterAll(async () => { for (const c of clients) c.stop(); for (const s of sockets) s.close(); await server.stop(); });
async function request(path: string, body?: object, session?: Session) {
  const response = await fetch(`${url}/api/lobbies${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.credentials}`, 'X-Player-ID': session.playerId } : {}) }, ...(body ? { body: JSON.stringify({ protocolVersion: 1, ...body }) } : {}) });
  return { status: response.status, body: await response.json() };
}
async function table(count = 3, catalog?: unknown) {
  const create = await request('', { displayName: 'Alice', ...(catalog ? { catalog } : {}) });
  expect(create.status).toBe(200);
  const sessions: Session[] = [create.body.session];
  for (let i = 1; i < count; i++) sessions.push((await request(`/${sessions[0].gameId}/join`, { displayName: ['Alice', 'Bob', 'Charlie', 'Diane'][i] })).body.session);
  return sessions;
}
async function start(sessions: Session[]) {
  for (const s of sessions) expect((await request(`/${s.gameId}/ready`, { ready: true }, s)).status).toBe(200);
  expect((await request(`/${sessions[0].gameId}/start`, {}, sessions[0])).status).toBe(200);
}
function networkClient(session: Session) {
  return Client({ game: createMultiplayerGame(), numPlayers: 3, playerID: session.playerId, matchID: session.gameId, credentials: session.credentials, multiplayer: SocketIO({ server: url }), debug: false });
}
async function connect(sessions: Session[]) {
  const peers = sessions.map(session => { const c = networkClient(session); clients.push(c); c.start(); return c; });
  await expect.poll(() => peers.every(c => !!c.getState()?.G)).toBe(true);
  return peers;
}
async function raw(session: Session, event: string, args: unknown[]): Promise<CommandResult> {
  const socket = io(`${url}/${GAME_NAME}`, { autoConnect: false, transports: ['websocket'] }); sockets.push(socket);
  const result = new Promise<CommandResult>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Missing command result')), 4000); socket.once('commandResult', value => { clearTimeout(timeout); resolve(value); }); });
  socket.once('connect', () => socket.emit(event, ...args)); socket.connect();
  return result.finally(() => socket.close());
}
function packet(s: State<AuthoritativeGameState>, session: Session, move: string, args: unknown[], actor = session.playerId) {
  return [{ type: 'MAKE_MOVE', payload: { type: move, args, playerID: actor, credentials: session.credentials } }, s._stateID, session.gameId, session.playerId];
}
async function actionPhase(peers: ReturnType<typeof networkClient>[]) {
  let state = peers[0].getState()!;
  peers[Number(state.ctx.currentPlayer)].moves.draw();
  await expect.poll(() => peers[0].getState()!.G.shared.phase).not.toBe('draw');
  for (let i = 0; i < 4; i++) {
    state = peers[0].getState()!;
    const decision = state.G.pendingDecision;
    if (!decision) break;
    peers[Number(decision.playerId)].moves.resolveDecision(decision.id, 0);
    await expect.poll(() => peers[0].getState()!.G.pendingDecision?.id).not.toBe(decision.id);
  }
  await expect.poll(() => peers.every(c => c.getState()!.G.shared.phase === 'actions')).toBe(true);
}

describe('serveur réel, lobby, confidentialité et reconnexion', () => {
  it.each([2, 4])('lance %i nations et refuse une place supplémentaire après lancement', async count => {
    const sessions = await table(count); await start(sessions);
    const peers = await connect(sessions);
    expect(Object.keys(peers[0].getState()!.G.players)).toHaveLength(count);
    expect(peers[0].getState()!.G.shared.custom).toBe(false);
    expect((await request(`/${sessions[0].gameId}/join`, { displayName: 'Extra' })).body.code).toBe('INVALID_PHASE');
  });
  it('valide le salon, exige le host et tous les joueurs prêts, gèle les inscriptions', async () => {
    const sessions = await table(); const id = sessions[0].gameId;
    expect((await request(`/${id}/start`, {}, sessions[0])).body.code).toBe('NOT_READY');
    expect((await request(`/${id}/start`, {}, sessions[1])).body.code).toBe('HOST_ONLY');
    expect((await request(`/${id}/ready`, { ready: true }, { ...sessions[0], credentials: 'wrong' })).body.code).toBe('SESSION_INVALID');
    await start(sessions);
    expect((await request(`/${id}/join`, { displayName: 'Intrus' })).body.code).toBe('INVALID_PHASE');
    const lobby = (await request(`/${id}`)).body as Lobby;
    expect(lobby.status).toBe('RUNNING'); expect(lobby.players).toHaveLength(3);
    expect(JSON.stringify(lobby)).not.toContain('credentials'); expect(JSON.stringify(lobby)).not.toContain('verifiers');
  });
  it('les préparations ne changent ni serveur ni adversaires ; commit, doublon et reconnexion convergent', async () => {
    const sessions = await table(); await start(sessions); const peers = await connect(sessions); await actionPhase(peers);
    const s = peers[0].getState()!; const id = Number(s.ctx.currentPlayer); const session = sessions[id];
    const before = await server.store.fetch(session.gameId, { state: true });
    let draft = emptyDraft(s.G, s.ctx, s._stateID, session.playerId);
    draft = prepareAction(draft, s.G, { type: 'income' }); draft = prepareAction(draft, s.G, { type: 'income' });
    expect((await server.store.fetch(session.gameId, { state: true })).state).toEqual(before.state);
    expect(peers.every(c => JSON.stringify(c.getState()!.G) === JSON.stringify(s.G))).toBe(true);
    const expected = previewState({ ...nationView(s.G, session.playerId), plannedActions: draft.actions });
    const cmd = { ...draft, commandId: 'atomic-one' };
    const disconnected = (id + 1) % peers.length; peers[disconnected].stop();
    peers[id].moves.commitPreparedTurn(cmd);
    await expect.poll(() => peers[id].getState()!._stateID).toBe(s._stateID + 1);
    const committed = peers[id].getState()!;
    expect(committed.G.players[session.playerId].money).toBe(expected.money);
    const duplicate = await raw(session, 'update', packet(s, session, 'commitPreparedTurn', [cmd]));
    expect(duplicate.code).toBe('DUPLICATE_COMMAND');
    peers[disconnected].start();
    await expect.poll(() => peers.every(c => c.getState()?._stateID === committed._stateID)).toBe(true);
    for (const c of peers) expect(c.getState()!.G).toEqual(committed.G);
    expect((await server.store.fetch(session.gameId, { state: true })).state._stateID).toBe(committed._stateID);
    expect(JSON.stringify(audit)).not.toContain(session.credentials);
  });
  it('rejette usurpation, batch invalide, stale, événements et undo sans mutation', async () => {
    const sessions = await table(); await start(sessions); const peers = await connect(sessions); await actionPhase(peers);
    const s = peers[0].getState()!; const session = sessions[Number(s.ctx.currentPlayer)];
    const cmd = { ...emptyDraft(s.G, s.ctx, s._stateID, session.playerId), commandId: 'bad-one', actions: [{ type: 'income' }, { type: 'buy', tileId: 'missing' }] };
    const invalid = await raw(session, 'update', packet(s, session, 'commitPreparedTurn', [cmd])); expect(invalid.code).toBe('INVALID_ACTION');
    const stale = await raw(session, 'update', packet(s, session, 'commitPreparedTurn', [{ ...cmd, baseRevision: s._stateID - 1 }])); expect(stale.code).toBe('STALE_DRAFT');
    const forged = await raw(session, 'update', packet(s, session, 'draw', [], String((Number(session.playerId) + 1) % 3))); expect(forged.code).toBe('INVALID_REQUEST');
    const noToken = await raw(session, 'sync', [session.gameId, session.playerId, 'bad']); expect(noToken.code).toBe('SESSION_INVALID');
    for (const type of ['UNDO', 'REDO', 'GAME_EVENT']) {
      const forbidden = await raw(session, 'update', [{ type, payload: { type: 'endTurn', args: [], playerID: session.playerId, credentials: session.credentials } }, s._stateID, session.gameId, session.playerId]);
      expect(forbidden.code).toBe('INVALID_REQUEST');
    }
    expect((await server.store.fetch(session.gameId, { state: true })).state._stateID).toBe(s._stateID);
    expect(peers[0].getState()!.G).toEqual(s.G);
  });
  it('aucun snapshot, log ou état initial ne divulgue le deck, les secrets ou le RNG', async () => {
    const sessions = await table(); await start(sessions); const session = sessions[0];
    const socket = io(`${url}/${GAME_NAME}`, { autoConnect: false, transports: ['websocket'] }); sockets.push(socket);
    const snapshot = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Missing snapshot')), 4000);
      socket.once('sync', (_id, data) => { clearTimeout(timer); resolve(data); });
    });
    socket.once('connect', () => socket.emit('sync', session.gameId, session.playerId, session.credentials)); socket.connect();
    const data = await snapshot;
    for (const s of [data.state, data.initialState]) {
      expect(s.G.secret).toBeUndefined(); expect(s.plugins.random?.data).toBeUndefined(); expect(s._undo).toEqual([]);
      expect(JSON.stringify(s)).not.toContain('seed');
    }
    for (const member of sessions) expect(JSON.stringify(data)).not.toContain(member.credentials);
    expect(data.filteredMetadata.every((p: any) => !p.credentials)).toBe(true);
  });
  it('un catalogue invalide est refusé avant la création', async () => {
    const invalid = await request('', { displayName: 'Alice', catalog: [{ id: '__proto__', money: 100000 }] });
    expect(invalid.status).toBe(400); expect(invalid.body.code).toBe('INVALID_REQUEST');
  });
  it('fige le catalogue personnalisé et refuse les valeurs injectées dans une commande', async () => {
    const catalog = BASE_CATALOG.map(t => ({ ...t, ...(t.id === 'initial-20' ? { name: 'Centrale commune', energy: 6 } : {}) }));
    const sessions = await table(3, catalog); await start(sessions); const peers = await connect(sessions); await actionPhase(peers);
    const state = peers[0].getState()!; const session = sessions[Number(state.ctx.currentPlayer)];
    expect(state.G.shared.custom).toBe(true);
    expect(state.G.shared.catalog.find(t => t.id === 'initial-20')!.energy).toBe(6);
    const cmd = { ...emptyDraft(state.G, state.ctx, state._stateID, session.playerId), commandId: 'injected', actions: [{ type: 'income' }, { type: 'buy', tileId: 'initial-20', slotId: 'b1', price: 0 }] };
    expect((await raw(session, 'update', packet(state, session, 'commitPreparedTurn', [cmd]))).code).toBe('INVALID_REQUEST');
    const valid = { ...cmd, commandId: 'valid-custom', actions: [{ type: 'income' }, { type: 'buy', tileId: 'initial-20', slotId: 'b1' }] };
    peers[Number(session.playerId)].moves.commitPreparedTurn(valid);
    await expect.poll(() => peers[0].getState()!._stateID).toBe(state._stateID + 1);
    for (const peer of peers) expect(peer.getState()!.G.players[session.playerId].board.b1!.energy).toBe(6);
  });
  it('sérialise deux commits simultanés et garde un siège présent tant qu’un onglet reste ouvert', async () => {
    const sessions = await table(); await start(sessions); const peers = await connect(sessions); await actionPhase(peers);
    const state = peers[0].getState()!; const session = sessions[Number(state.ctx.currentPlayer)];
    const extra = networkClient(session); clients.push(extra); extra.start();
    await expect.poll(() => extra.getState()?.G.shared.phase).toBe('actions');
    const cmd = { ...emptyDraft(state.G, state.ctx, state._stateID, session.playerId), commandId: 'simultaneous', actions: [{ type: 'income' }, { type: 'income' }] };
    const results = await Promise.all([raw(session, 'update', packet(state, session, 'commitPreparedTurn', [cmd])), raw(session, 'update', packet(state, session, 'commitPreparedTurn', [cmd]))]);
    expect(results.map(r => r.code).sort()).toEqual(['DUPLICATE_COMMAND', 'OK']);
    extra.stop(); clients.splice(clients.indexOf(extra), 1);
    await expect.poll(async () => (await server.store.fetch(session.gameId, { metadata: true })).metadata.players[Number(session.playerId)].isConnected).toBe(true);
    expect((await server.store.fetch(session.gameId, { state: true })).state._stateID).toBe(state._stateID + 1);
    expect((await request(`/${session.gameId}`)).body.players).toHaveLength(3);
  });
});
