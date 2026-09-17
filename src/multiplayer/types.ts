import type { GameState, PlannedAction, Symbol, Tile } from '../game/types';

export const GAME_NAME = 'prosperity-network';
export const PROTOCOL_VERSION = 1;
export type MatchStatus = 'LOBBY' | 'RUNNING' | 'FINISHED';
export interface PlayerIdentity { playerId: string; displayName: string }
export interface Session extends PlayerIdentity { gameId: string; credentials: string }
export interface LobbyPlayer extends PlayerIdentity { ready: boolean }
export interface Lobby {
  protocolVersion: 1;
  gameId: string;
  hostId: string;
  status: MatchStatus;
  players: LobbyPlayer[];
  catalogHash: string;
  custom: boolean;
}
export interface PreparedTurn {
  gameId: string;
  playerId: string;
  turnId: string;
  baseRevision: number;
  actions: PlannedAction[];
}
export interface CommitPreparedTurnCommand extends PreparedTurn { commandId: string }
export type MultiplayerErrorCode = 'SESSION_INVALID' | 'MATCH_NOT_FOUND' | 'LOBBY_FULL' | 'NOT_READY' | 'HOST_ONLY'
  | 'NOT_YOUR_TURN' | 'INVALID_PHASE' | 'INVALID_ACTION' | 'INVALID_ACTION_COUNT' | 'PENDING_DECISION'
  | 'STALE_DRAFT' | 'DUPLICATE_COMMAND' | 'INVALID_REQUEST' | 'SERVER_ERROR';
export interface CommandResult {
  protocolVersion: 1;
  commandId?: string;
  code: MultiplayerErrorCode | 'OK';
  revision?: number;
}
export type PlayerGameState = Pick<GameState, 'board' | 'money' | 'pollution' | 'score' | 'research' | 'finalScores'>;
export type SharedGameState = Pick<GameState, 'id' | 'custom' | 'catalog' | 'market' | 'turn' | 'totalTurns' | 'actions' | 'phase' | 'current' | 'finalStep' | 'lastMove' | 'log'> & { deckCount: number };
export interface PendingDecision { id: string; playerId: string; type: 'energy' | 'research'; amount: number }
export interface TurnCommittedEvent {
  commandId: string;
  playerId: string;
  turnId: string;
  actions: PlannedAction[];
  descriptions: string[];
  fromRevision: number;
  toRevision: number;
}
export interface AuthoritativeGameState {
  shared: SharedGameState;
  players: Record<string, PlayerGameState>;
  participants: PlayerIdentity[];
  catalogHash: string;
  firstPlayer: number;
  pendingDecision: PendingDecision | null;
  tallyQueue: string[];
  tallySymbol: Symbol | null;
  lastCommit: TurnCommittedEvent | null;
  ranking: { playerId: string; score: number; money: number; rank: number }[];
  // Never transmitted, including in boardgame.io's initial snapshot.
  secret?: { deck: string[]; commands: Record<string, { playerId: string; fingerprint: string }> };
}
export interface MatchSetup { gameId: string; participants: PlayerIdentity[]; catalog: Tile[]; catalogHash: string }
