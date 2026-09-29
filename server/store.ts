import { Async } from 'boardgame.io/dist/cjs/internal.js';
import type { LogEntry, Server, State, StorageAPI } from 'boardgame.io';
import type { AuthoritativeGameState, Lobby } from '../src/multiplayer/types.js';
import type { Tile } from '../src/game/types.js';
import { publicGameState } from '../src/multiplayer/game.js';

export interface StoredLobby { lobby: Lobby; catalog: Tile[]; verifiers: Record<string, string>; revision: number }
// Reuse the actual boardgame.io persistence port, plus the small lobby boundary.
export abstract class MatchStore extends Async {
  abstract getLobby(id: string): Promise<StoredLobby | undefined>;
  abstract saveLobby(value: StoredLobby, expectedRevision: number | null): Promise<void>;
}
export class InMemoryMatchStore extends MatchStore {
  private matches = new Map<string, { state: State; initialState: State; metadata: Server.MatchData; log: LogEntry[] }>();
  private lobbies = new Map<string, StoredLobby>();
  async connect() {}
  async getLobby(id: string) { return structuredClone(this.lobbies.get(id)); }
  async saveLobby(value: StoredLobby, expectedRevision: number | null) {
    const previous = this.lobbies.get(value.lobby.gameId);
    if ((previous?.revision ?? null) !== expectedRevision) throw new Error('LOBBY_CONFLICT');
    this.lobbies.set(value.lobby.gameId, structuredClone(value));
  }
  async createMatch(id: string, opts: StorageAPI.CreateMatchOpts) {
    if (this.matches.has(id)) throw new Error('MATCH_EXISTS');
    // boardgame.io 0.50 filters sync.state, but not sync.initialState.
    const initialState = { ...opts.initialState, G: publicGameState(opts.initialState.G as AuthoritativeGameState), plugins: {}, _undo: [], _redo: [], deltalog: undefined };
    this.matches.set(id, structuredClone({ state: opts.initialState, initialState, metadata: opts.metadata, log: [] }));
  }
  async setState(id: string, state: State, deltalog?: LogEntry[]) {
    const match = this.matches.get(id);
    if (!match) throw new Error('MATCH_NOT_FOUND');
    if (state._stateID !== match.state._stateID + 1 && JSON.stringify(state) !== JSON.stringify(match.state)) throw new Error('REVISION_CONFLICT');
    match.state = structuredClone(state);
    if (deltalog?.length) match.log.push(...structuredClone(deltalog));
  }
  async setMetadata(id: string, metadata: Server.MatchData) {
    const match = this.matches.get(id);
    if (!match) throw new Error('MATCH_NOT_FOUND');
    match.metadata = structuredClone(metadata);
  }
  async fetch<O extends StorageAPI.FetchOpts>(id: string, opts: O): Promise<StorageAPI.FetchResult<O>> {
    const match = this.matches.get(id);
    return structuredClone(Object.fromEntries(Object.entries(opts).filter(([, requested]) => requested).map(([key]) => [key, match?.[key as keyof typeof match]]))) as StorageAPI.FetchResult<O>;
  }
  async wipe(id: string) { this.matches.delete(id); this.lobbies.delete(id); }
  async listMatches(opts?: StorageAPI.ListMatchesOpts) {
    return [...this.matches].filter(([, { metadata: m }]) => (!opts?.gameName || opts.gameName === m.gameName)
      && (opts?.where?.isGameover === undefined || opts.where.isGameover === (m.gameover !== undefined))
      && (opts?.where?.updatedBefore === undefined || m.updatedAt < opts.where.updatedBefore)
      && (opts?.where?.updatedAfter === undefined || m.updatedAt > opts.where.updatedAfter)).map(([id]) => id);
  }
}
