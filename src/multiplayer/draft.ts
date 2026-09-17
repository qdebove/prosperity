import type { Ctx } from 'boardgame.io';
import { previewState } from '../game/engine';
import type { PlannedAction } from '../game/types';
import { nationView, turnId } from './game';
import type { AuthoritativeGameState, PreparedTurn } from './types';
import { isPreparedAction, isRecord } from './validation';

export const draftKey = (gameId: string, playerId: string) => `prosperity.draft.v1.${gameId}.${playerId}`;
export function emptyDraft(G: AuthoritativeGameState, ctx: Ctx, revision: number, playerId: string): PreparedTurn {
  return { gameId: G.shared.id, playerId, turnId: turnId(ctx), baseRevision: revision, actions: [] };
}
export function compatibleDraft(value: unknown, G: AuthoritativeGameState, ctx: Ctx, revision: number, playerId: string): value is PreparedTurn {
  if (!isRecord(value) || value.gameId !== G.shared.id || value.playerId !== playerId || value.turnId !== turnId(ctx) || value.baseRevision !== revision
    || ctx.currentPlayer !== playerId || G.shared.phase !== 'actions' || G.pendingDecision || !Array.isArray(value.actions)
    || value.actions.length > 2 || !value.actions.every(isPreparedAction)) return false;
  try { previewState({ ...nationView(G, playerId), plannedActions: value.actions }); return true; } catch { return false; }
}
export function prepareAction(draft: PreparedTurn, G: AuthoritativeGameState, action: PlannedAction): PreparedTurn {
  const next = { ...draft, actions: [...draft.actions, action] };
  previewState({ ...nationView(G, draft.playerId), plannedActions: next.actions });
  return next;
}
