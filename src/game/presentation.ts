import { LABELS, SLOTS } from './catalog';
import { legalSlots, levelAt, pollutionBonus, POLLUTION_LIMIT, previewState, priceOf, TALLY_RATES, totals } from './engine';
import { SYMBOLS, type GameState, type PlannedAction, type Symbol, type Tile } from './types';

// These selectors only consume the public nation projection. No deck access.
export function simulateAction(G: GameState, action: PlannedAction): GameState | null {
  try { return previewState({ ...G, plannedActions: [action] }); } catch { return null; }
}

export function purchasePreview(G: GameState, tile: Tile, slotId?: string) {
  return simulateAction(G, { type: 'buy', tileId: tile.id, ...(slotId ? { slotId } : {}) });
}

// Inspection can explain an unaffordable technology, without making it playable.
// Only the hypothetical action budget is supplied; placement and effects still use the engine.
export function inspectPurchase(G: GameState, tile: Tile, slotId?: string) {
  const fundingNeeded = Math.max(0, priceOf(G, tile) - G.money);
  const state = purchasePreview({ ...G, phase: 'actions', actions: 1, money: G.money + fundingNeeded }, tile, slotId);
  return state ? { state, fundingNeeded } : null;
}

export function priceBreakdown(G: GameState, tile: Tile) {
  const level = levelAt(G.research[tile.track]);
  const price = priceOf(G, tile);
  return { level, price, base: Math.min(100, price), premium: Math.max(0, price - 100), difference: tile.level - level };
}

export interface Availability { state: 'now' | 'later' | 'unavailable'; label: string; reason: string }
export function marketAvailability(G: GameState): Record<string, Availability> {
  const market = G.catalog.filter(t => G.market.includes(t.id));
  const next: { state: GameState; reason: string }[] = [];
  if (G.phase === 'actions' && G.actions > 1) {
    const candidates: { action: PlannedAction; reason: string }[] = [
      { action: { type: 'income' }, reason: 'Après un revenu de 100 €' },
      ...(['energy', 'ecology'] as const).map(track => ({ action: { type: 'research' as const, track }, reason: `Après une recherche ${LABELS[track].toLowerCase()}` })),
      ...market.filter(t => t.category === 'transport').flatMap(t => legalSlots(G, t).map(slotId => ({ action: { type: 'buy' as const, tileId: t.id, slotId }, reason: `Après ${t.name} en ${slotId.toUpperCase()}` }))),
    ];
    for (const candidate of candidates) {
      const state = simulateAction(G, candidate.action);
      if (state) next.push({ state, reason: candidate.reason });
    }
  }
  const canBuy = (state: GameState, tile: Tile) => tile.category === 'special'
    ? !!purchasePreview(state, tile) : legalSlots(state, tile).some(slot => !!purchasePreview(state, tile, slot));
  return Object.fromEntries(market.map(tile => {
    if (canBuy(G, tile)) return [tile.id, { state: 'now', label: 'Disponible', reason: 'Achat possible avec une action.' }];
    const reachable = next.filter(n => canBuy(n.state, tile));
    if (reachable.length) return [tile.id, { state: 'later', label: 'En deux actions', reason: `${[...new Set(reachable.map(n => n.reason))].join(' ou ')}, puis cet achat.` }];
    const reason = G.phase !== 'actions' ? 'Disponible à la phase d’actions selon votre trésorerie et vos emplacements.'
      : !G.actions ? 'Vos deux actions sont déjà préparées.'
      : priceOf(G, tile) > G.money ? 'Trésorerie insuffisante avec les actions restantes.'
      : 'Aucun emplacement accessible avec les actions restantes.';
    return [tile.id, { state: 'unavailable', label: 'Plus tard', reason }];
  }));
}

export function decadeProgress(G: GameState) {
  const current = G.catalog.find(t => t.id === G.current);
  const decade = current?.decade || Math.min(...G.catalog.filter(t => t.decade > 0).map(t => t.decade));
  const revealed = new Set<string>();
  for (const entry of G.log) {
    if (entry.revealedTileId) revealed.add(entry.revealedTileId);
    // Old solo saves have no structured reveal metadata; only match their public reveal entries.
    else if (entry.kind === 'event') {
      const tile = G.catalog.find(t => t.decade > 0 && entry.text === `${t.decade} · ${t.name}. Décompte : ${LABELS[t.tally].toLowerCase()}.`);
      if (tile) revealed.add(tile.id);
    }
  }
  if (current) revealed.add(current.id);
  return { decade, symbols: SYMBOLS.map(symbol => {
    const tiles = G.catalog.filter(t => t.decade === decade && t.tally === symbol);
    const done = tiles.filter(t => revealed.has(t.id)).length;
    return { symbol, total: tiles.length, done, remaining: tiles.length - done };
  }) };
}

export function actionFeedback(before: GameState, after: GameState): string[] {
  const changes: string[] = [];
  const delta = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  if (after.money !== before.money) changes.push(`${delta(after.money - before.money)} €`);
  if (after.pollution !== before.pollution) changes.push(`${delta(after.pollution - before.pollution)} pollution`);
  if (after.score !== before.score) changes.push(`${delta(after.score - before.score)} PP`);
  for (const track of ['energy', 'ecology'] as const) {
    if (before.research[track] !== after.research[track]) changes.push(`${LABELS[track]} : ${delta(after.research[track] - before.research[track])} case`);
  }
  const a = totals(before), b = totals(after);
  for (const symbol of SYMBOLS) if (a[symbol] !== b[symbol]) changes.push(`${LABELS[symbol]} ${a[symbol]} → ${b[symbol]}`);
  return changes;
}

export function installedTileInfo(G: GameState, tile: Tile) {
  const slot = SLOTS.find(s => G.board[s.id]?.id === tile.id);
  return { slot, replacements: slot ? G.catalog.filter(t => G.market.includes(t.id) && legalSlots(G, t).includes(slot.id)) : [] };
}

export function tallyCalculation(G: GameState, symbol: Symbol) {
  const amount = totals(G)[symbol];
  switch (symbol) {
    case 'energy': return amount >= 0 ? `${amount} énergie × ${TALLY_RATES.energy} €` : `${-amount} énergie manquante à compenser`;
    case 'capital': return `${amount} capital × ${TALLY_RATES.capital} €`;
    case 'ecology': return amount < 0 ? `${amount} écologie : pollution supplémentaire` : `${amount} écologie : retrait de pollution, puis ${TALLY_RATES.ecology} € par surplus`;
    case 'research': return `${amount} recherche : cases ${G.finalStep >= 0 ? 'sur chaque piste' : 'à répartir'}`;
    case 'prosperity': return `${amount} prospérité + ${pollutionBonus(G.pollution)} PP découverts${G.pollution >= POLLUTION_LIMIT ? ' · gains bloqués à 16 pollutions' : ''}`;
  }
}
