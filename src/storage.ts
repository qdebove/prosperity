import { BASE_CATALOG, SLOTS, validateCatalog } from './game/catalog';
import type { GameState, Tile } from './game/types';
import { previewState } from './game/engine';

export const SAVE_KEY = 'prosperity.game.v1';
export const CATALOG_KEY = 'prosperity.catalog.v1';
export const RECORDS_KEY = 'prosperity.records.v1';
export interface RecordEntry { id: string; seed: string; score: number; money: number; custom: boolean; date: string }

export function readCatalog(): Tile[] {
  try { const raw = localStorage.getItem(CATALOG_KEY); return raw ? validateCatalog(JSON.parse(raw)) : BASE_CATALOG; }
  catch { return BASE_CATALOG; }
}
export function readGame(): { game?: GameState; error?: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {};
    const g = JSON.parse(raw) as GameState;
    g.catalog = validateCatalog(g.catalog);
    const ids = new Set(g.catalog.map(t => t.id));
    const integers = [g.money, g.pollution, g.score, g.turn, g.totalTurns, g.actions, g.pending, g.research.energy, g.research.ecology];
    if (g.version !== 1 || typeof g.id !== 'string' || typeof g.seed !== 'string' || !integers.every(n => Number.isInteger(n) && n >= 0) || g.turn > g.totalTurns || g.actions > 2 || g.research.energy > 26 || g.research.ecology > 26) throw Error();
    if (!['draw', 'actions', 'committed', 'energy', 'research', 'final', 'finished'].includes(g.phase) || !Array.isArray(g.deck) || !Array.isArray(g.market) || !Array.isArray(g.log) || !Array.isArray(g.finalScores)) throw Error();
    if (!Number.isInteger(g.finalStep) || g.finalStep < -1 || g.finalStep > 7 || g.log.some(entry => !entry || typeof entry.text !== 'string' || !Number.isInteger(entry.turn)) || g.finalScores.some(entry => !entry || typeof entry.label !== 'string' || !Number.isFinite(entry.value))) throw Error();
    if ([...g.deck, ...g.market].some(id => !ids.has(id)) || new Set([...g.deck, ...g.market]).size !== g.deck.length + g.market.length || g.turn + g.deck.length !== g.totalTurns || (g.current !== null && !ids.has(g.current))) throw Error();
    for (const slot of SLOTS) {
      const tile = g.board[slot.id];
      if (tile === undefined || tile !== null && (tile.category !== slot.category || ![...ids, ...SLOTS.map(s => s.initial?.id)].includes(tile.id))) throw Error();
      if (tile) {
        const known = g.catalog.find(t => t.id === tile.id) ?? SLOTS.find(s => s.initial?.id === tile.id)?.initial;
        if (!known || known.category !== slot.category) throw Error();
        g.board[slot.id] = known;
      }
    }
    // v1 actions were immediate. Preserve them and start the new planning boundary here.
    if (g.plannedActions === undefined) {
      g.plannedActions = [];
      if (g.phase === 'actions' && g.actions === 0) g.phase = 'committed';
    }
    if (!Array.isArray(g.plannedActions) || g.plannedActions.length > 2 || g.plannedActions.length && g.phase !== 'actions') throw Error();
    previewState(g);
    return { game: g };
  } catch { return { error: 'La sauvegarde locale est illisible. Une nouvelle partie a été préparée.' }; }
}
export function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error('Le stockage local est plein ou indisponible. Exportez votre catalogue et réduisez la taille des illustrations.'); }
}
export function readRecords(): RecordEntry[] {
  try {
    const entries: unknown = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]');
    return Array.isArray(entries) ? entries.filter((r): r is RecordEntry => typeof r?.id === 'string' && typeof r?.score === 'number' && typeof r?.date === 'string').slice(0, 30) : [];
  } catch { return []; }
}
export function exportJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
