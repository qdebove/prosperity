import { createHash, randomBytes } from 'node:crypto';
import { Server } from 'boardgame.io/dist/cjs/server.js';
import { createMatch } from 'boardgame.io/dist/cjs/internal.js';
import type { Server as HTTPServer } from 'node:http';
import { BASE_CATALOG, validateCatalog } from '../src/game/catalog.js';
import { createMultiplayerGame } from '../src/multiplayer/game.js';
import { PROTOCOL_VERSION, type Lobby, type MultiplayerErrorCode, type Session } from '../src/multiplayer/types.js';
import { identifier, isRecord } from '../src/multiplayer/validation.js';
import { serverConfig, type ServerConfig } from './config.js';
import { GuestIdentityService, type IdentityService } from './identity.js';
import { InMemoryMatchStore, type MatchStore } from './store.js';
import { ProsperityTransport, type AuditLog } from './transport.js';

class RequestError extends Error { constructor(public code: MultiplayerErrorCode, public status = 400) { super(code); } }
export function createMultiplayerServer(options: { config?: ServerConfig; store?: MatchStore; identity?: IdentityService; audit?: AuditLog } = {}) {
  const config = options.config ?? serverConfig();
  const store = options.store ?? new InMemoryMatchStore();
  const identity = options.identity ?? new GuestIdentityService();
  const audit = options.audit ?? (event => console.log(JSON.stringify(event)));
  const game = createMultiplayerGame();
  const transport = new ProsperityTransport(audit, config.origins);
  const server = Server({ games: [game], db: store, transport, origins: config.origins,
    authenticateCredentials: (token, metadata) => identity.verify(token, metadata?.credentials) });
  const app = server.app as typeof server.app & { server: HTTPServer; _io: import('socket.io').Server };
  // koa-socket attaches the HTTP server; keep local development on loopback.
  app.listen = ((port: number, callback: () => void) => app.server.listen(port, config.host, callback)) as typeof app.listen;
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/games')) { ctx.status = 404; return; } // Use the constrained guest lobby below.
    if (!ctx.path.startsWith('/api/')) return next();
    const origin = ctx.get('Origin');
    if (origin && !config.origins.includes(origin)) { ctx.status = 403; return; }
    if (origin) { ctx.set('Access-Control-Allow-Origin', origin); ctx.vary('Origin'); }
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Player-ID');
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    ctx.set('Cache-Control', 'no-store');
    if (ctx.method === 'OPTIONS') { ctx.status = 204; return; }
    try {
      if (ctx.path === '/api/health' && ctx.method === 'GET') { ctx.body = { protocolVersion: PROTOCOL_VERSION, ok: true }; return; }
      let body: Record<string, unknown> = {};
      if (ctx.method === 'POST') {
        let length = 0; const chunks: Buffer[] = [];
        for await (const chunk of ctx.req) { length += chunk.length; if (length > config.maxBodyBytes) throw new RequestError('INVALID_REQUEST', 413); chunks.push(chunk); }
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!isRecord(parsed) || parsed.protocolVersion !== PROTOCOL_VERSION) throw new RequestError('INVALID_REQUEST');
        body = parsed;
      }
      const displayName = () => {
        if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.trim().length > 32 || /[\u0000-\u001f]/.test(body.displayName)) throw new RequestError('INVALID_REQUEST');
        return body.displayName.trim();
      };
      if (ctx.path === '/api/lobbies' && ctx.method === 'POST') {
        const name = displayName();
        let catalog;
        try { catalog = validateCatalog(body.catalog ?? BASE_CATALOG); } catch { throw new RequestError('INVALID_REQUEST'); }
        if (!catalog.some(t => t.decade > 0)) throw new RequestError('INVALID_REQUEST');
        const gameId = randomBytes(9).toString('base64url');
        const { credentials, verifier } = identity.issue();
        const lobby: Lobby = { protocolVersion: PROTOCOL_VERSION, gameId, hostId: '0', status: 'LOBBY',
          players: [{ playerId: '0', displayName: name, ready: false }],
          catalogHash: createHash('sha256').update(JSON.stringify(catalog)).digest('hex'), custom: JSON.stringify(catalog) !== JSON.stringify(validateCatalog(BASE_CATALOG)) };
        await store.saveLobby({ lobby, catalog, verifiers: { '0': verifier }, revision: 0 }, null);
        ctx.body = { lobby, session: { gameId, playerId: '0', displayName: name, credentials } satisfies Session };
        return;
      }
      const match = /^\/api\/lobbies\/([a-zA-Z0-9_-]{1,80})(?:\/(join|ready|start))?$/.exec(ctx.path);
      if (!match) throw new RequestError('MATCH_NOT_FOUND', 404);
      const [, id, action] = match;
      // The native per-match queue also serializes lobby writes and game creation.
      await transport.getMatchQueue(id).add(async () => {
        const stored = await store.getLobby(id);
        if (!stored) throw new RequestError('MATCH_NOT_FOUND', 404);
        const { lobby } = stored;
        if (!action && ctx.method === 'GET') {
          const { state } = await store.fetch(id, { state: true });
          ctx.body = { ...lobby, status: state?.ctx.gameover ? 'FINISHED' : lobby.status }; return;
        }
        if (ctx.method !== 'POST') throw new RequestError('INVALID_REQUEST');
        const previous = stored.revision;
        if (action === 'join') {
          if (lobby.status !== 'LOBBY') throw new RequestError('INVALID_PHASE');
          if (lobby.players.length >= 4) throw new RequestError('LOBBY_FULL');
          const playerId = String(lobby.players.length); const name = displayName();
          const { credentials, verifier } = identity.issue();
          lobby.players.push({ playerId, displayName: name, ready: false }); stored.verifiers[playerId] = verifier;
          ctx.body = { lobby, session: { gameId: id, playerId, displayName: name, credentials } satisfies Session };
        } else {
          const playerId = ctx.get('X-Player-ID'); const token = ctx.get('Authorization').replace(/^Bearer /, '');
          if (!identifier(playerId) || !Object.hasOwn(stored.verifiers, playerId) || !identity.verify(token, stored.verifiers[playerId])) throw new RequestError('SESSION_INVALID', 401);
          if (lobby.status !== 'LOBBY') throw new RequestError('INVALID_PHASE');
          if (action === 'ready') {
            if (typeof body.ready !== 'boolean') throw new RequestError('INVALID_REQUEST');
            lobby.players.find(p => p.playerId === playerId)!.ready = body.ready;
          } else if (action === 'start') {
            if (playerId !== lobby.hostId) throw new RequestError('HOST_ONLY', 403);
            if (lobby.players.length < 2 || lobby.players.some(p => !p.ready)) throw new RequestError('NOT_READY');
            const match = createMatch({ game, numPlayers: lobby.players.length, unlisted: true,
              setupData: { gameId: id, participants: lobby.players.map(({ playerId, displayName }) => ({ playerId, displayName })), catalog: stored.catalog, catalogHash: lobby.catalogHash } });
            if ('setupDataError' in match) throw new RequestError('INVALID_REQUEST');
            delete match.metadata.setupData;
            for (const p of lobby.players) Object.assign(match.metadata.players[Number(p.playerId)], { name: p.displayName, credentials: stored.verifiers[p.playerId] });
            await store.createMatch(id, match);
            lobby.status = 'RUNNING';
          } else throw new RequestError('INVALID_REQUEST');
          ctx.body = lobby;
        }
        stored.revision++;
        await store.saveLobby(stored, previous);
      });
    } catch (error) {
      ctx.status = error instanceof RequestError ? error.status : error instanceof SyntaxError ? 400 : 500;
      ctx.body = { protocolVersion: PROTOCOL_VERSION, code: error instanceof RequestError ? error.code : error instanceof SyntaxError ? 'INVALID_REQUEST' : 'SERVER_ERROR' };
      if (ctx.status === 500) audit({ result: 'SERVER_ERROR', path: ctx.path });
    }
  });
  return { store, server, transport, start: () => server.run(config.port), stop: async () => { await new Promise<void>(resolve => app._io.close(() => resolve())); } };
}
