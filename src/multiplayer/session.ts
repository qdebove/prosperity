import { persist } from '../storage';
import { identifier, isRecord } from './validation';
import type { Session } from './types';
export const sessionKey = (gameId: string) => `prosperity.session.v1.${gameId}`;
export function readSession(gameId: string): Session | null {
  try {
    const s: unknown = JSON.parse(localStorage.getItem(sessionKey(gameId)) ?? 'null');
    return isRecord(s) && s.gameId === gameId && identifier(s.playerId) && typeof s.displayName === 'string' && typeof s.credentials === 'string' ? s as unknown as Session : null;
  } catch { return null; }
}
export function saveSession(session: Session) { persist(sessionKey(session.gameId), session); }
