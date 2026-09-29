import { SocketIO } from 'boardgame.io/dist/cjs/server.js';
import { Master } from 'boardgame.io/dist/cjs/master.js';
import { getFilterPlayerView } from 'boardgame.io/dist/cjs/internal.js';
import type { Game, Server } from 'boardgame.io';
import type { Server as IOServer, ServerOptions } from 'socket.io';
import { validateCommit } from '../src/multiplayer/game.js';
import { identifier, isRecord } from '../src/multiplayer/validation.js';
import { PROTOCOL_VERSION, type AuthoritativeGameState, type CommandResult, type MultiplayerErrorCode } from '../src/multiplayer/types.js';

type Update = Parameters<Master['onUpdate']>;
type Outgoing = Parameters<Master['transportAPI']['sendAll']>[0];
export type AuditLog = (event: Record<string, unknown>) => void;

// Native sync/update protocol, queue, presence and subscriptions. Only adds
// validation + private command receipts, which 0.50 does not deliver on rejection.
export class ProsperityTransport extends SocketIO {
  constructor(private audit: AuditLog, origins: string[]) {
    super({ socketOpts: { maxHttpBufferSize: 16 * 1024, cors: { origin: origins },
      allowRequest: (req, callback) => callback(null, !req.headers.origin || origins.includes(req.headers.origin)) } as ServerOptions });
  }
  // A disconnect must not discard a queue that still contains a commit.
  override deleteMatchQueue(_matchID: string) {}
  override init(app: Server.App & { _io?: IOServer }, games: Game[], origins?: string[]) {
    super.init(app, games, origins);
    for (const game of games) {
      const filter = getFilterPlayerView(game);
      app._io!.of(game.name!).on('connection', socket => {
        const reply = (code: CommandResult['code'], commandId?: string, revision?: number) => socket.emit('commandResult', { protocolVersion: PROTOCOL_VERSION, code, commandId, revision } satisfies CommandResult);
        // Gate every incoming event before the framework sees malformed arguments.
        socket.use(async ([event, ...args], next) => {
          try {
            if (event === 'sync') {
              const [id, playerID, credentials] = args;
              if (!identifier(id) || typeof playerID !== 'string' || !/^[0-3]$/.test(playerID) || typeof credentials !== 'string' || credentials.length > 200) { reply('SESSION_INVALID'); return; }
              const { metadata, state } = await app.context.db.fetch(id, { metadata: true, state: true });
              if (!state || !await app.context.auth.authenticateCredentials({ playerID, credentials, metadata })) { reply('SESSION_INVALID'); return; }
            } else if (event !== 'update') { reply('INVALID_REQUEST'); return; }
            next();
          } catch { reply('SERVER_ERROR'); }
        });
        const nativeSync = socket.listeners('sync')[0];
        socket.removeAllListeners('sync');
        socket.on('sync', (...args: Parameters<Master['onSync']>) => {
          void this.getMatchQueue(args[0]).add(() => nativeSync(...args)).catch(() => reply('SERVER_ERROR'));
        });
        const nativeDisconnect = socket.listeners('disconnect')[0];
        socket.removeAllListeners('disconnect');
        socket.on('disconnect', reason => {
          const client = this.clientInfo.get(socket.id);
          if (!client) return;
          void this.getMatchQueue(client.matchID).add(async () => {
            await nativeDisconnect(reason);
            // A second tab still counts as present after this socket closes.
            if ([...this.clientInfo.values()].some(c => c.matchID === client.matchID && c.playerID === client.playerID)) {
              const master = new Master(game, app.context.db, {
                send: () => {}, sendAll: message => this.pubSub.publish(`MATCH-${client.matchID}`, message),
              }, app.context.auth);
              await master.onConnectionChange(client.matchID, client.playerID, client.credentials, true);
            }
          }).catch(() => this.audit({ matchId: client.matchID, result: 'PRESENCE_ERROR' }));
        });
        socket.removeAllListeners('chat');
        socket.removeAllListeners('update');
        socket.on('update', (...args: Update) => {
          const [action, revision, matchID, playerID] = args;
          if (!identifier(matchID) || typeof playerID !== 'string' || !/^[0-3]$/.test(playerID) || !Number.isSafeInteger(revision) || !isRecord(action) || action.type !== 'MAKE_MOVE'
            || !isRecord(action.payload) || action.payload.playerID !== playerID || !Array.isArray(action.payload.args)) { reply('INVALID_REQUEST'); return; }
          const payload = action.payload;
          const moveArgs = payload.args;
          const commandId = payload.type === 'commitPreparedTurn' && isRecord(moveArgs[0]) && identifier(moveArgs[0].commandId) ? moveArgs[0].commandId : undefined;
          void this.getMatchQueue(matchID).add(async () => {
            const { state, metadata } = await app.context.db.fetch(matchID, { state: true, metadata: true });
            if (!state || !await app.context.auth.authenticateCredentials({ playerID, credentials: payload.credentials, metadata })) { reply('SESSION_INVALID', commandId); return; }
            const G = state.G as AuthoritativeGameState;
            let error: MultiplayerErrorCode | null = null;
            if (payload.type === 'commitPreparedTurn') error = moveArgs.length === 1 ? validateCommit(G, state.ctx, playerID, state._stateID, moveArgs[0]) : 'INVALID_REQUEST';
            else if (!['draw', 'resolveDecision', 'nextFinal'].includes(payload.type)) error = 'INVALID_REQUEST';
            else if (revision !== state._stateID) error = 'STALE_DRAFT';
            else if (payload.type === 'resolveDecision') {
              if (moveArgs.length !== 2 || !identifier(moveArgs[0]) || !Number.isSafeInteger(moveArgs[1])) error = 'INVALID_REQUEST';
              else if (G.pendingDecision?.playerId !== playerID || G.pendingDecision.id !== moveArgs[0]) error = 'NOT_YOUR_TURN';
            } else if (moveArgs.length) error = 'INVALID_REQUEST';
            else if (state.ctx.currentPlayer !== playerID) error = 'NOT_YOUR_TURN';
            else if (G.shared.phase !== (payload.type === 'draw' ? 'draw' : 'final')) error = 'INVALID_PHASE';
            if (!error && revision !== state._stateID) error = 'STALE_DRAFT';
            const outgoing: Outgoing[] = [];
            const master = new Master(game, app.context.db, {
              send: ({ playerID: recipient, ...message }) => { const filtered = filter(recipient, message); socket.emit(filtered.type, ...filtered.args); },
              // Persist first. Native Master calls sendAll before awaiting its store.
              sendAll: message => { outgoing.push(message); },
            }, app.context.auth);
            if (!error) {
              const result = await master.onUpdate(...args);
              const saved = await app.context.db.fetch(matchID, { state: true });
              if (result?.error || saved.state._stateID === state._stateID) error = 'INVALID_ACTION';
              else for (const message of outgoing) this.pubSub.publish(`MATCH-${matchID}`, message);
            }
            const latest = await app.context.db.fetch(matchID, { state: true });
            reply(error ?? 'OK', commandId, latest.state._stateID);
            if (error) await master.onSync(matchID, playerID, payload.credentials);
            this.audit({ matchId: matchID, playerId: playerID, turnId: String(state.ctx.turn), commandId,
              actionTypes: payload.type === 'commitPreparedTurn' && isRecord(moveArgs[0]) && Array.isArray(moveArgs[0].actions) ? moveArgs[0].actions.map((a: unknown) => isRecord(a) ? a.type : 'invalid') : [payload.type],
              revision: latest.state._stateID, result: error ?? 'OK' });
          }).catch(() => { this.audit({ matchId: matchID, result: 'SERVER_ERROR' }); reply('SERVER_ERROR', commandId); });
        });
      });
    }
  }
}
