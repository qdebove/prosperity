import type { PlannedAction } from '../game/types.js';
import type { CommitPreparedTurnCommand } from './types.js';

export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const only = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
export function isPreparedAction(value: unknown): value is PlannedAction {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'income': case 'cleanup': return only(value, ['type']);
    case 'research': return only(value, ['type', 'track']) && (value.track === 'energy' || value.track === 'ecology');
    case 'buy': return only(value, ['type', 'tileId', 'slotId']) && identifier(value.tileId) && (value.slotId === undefined || identifier(value.slotId));
    default: return false;
  }
}
export function isCommit(value: unknown): value is CommitPreparedTurnCommand {
  return isRecord(value) && only(value, ['commandId', 'gameId', 'playerId', 'turnId', 'baseRevision', 'actions'])
    && identifier(value.commandId) && identifier(value.gameId) && identifier(value.playerId) && identifier(value.turnId)
    && Number.isSafeInteger(value.baseRevision) && (value.baseRevision as number) >= 0
    && Array.isArray(value.actions) && value.actions.length <= 2 && value.actions.every(isPreparedAction);
}
