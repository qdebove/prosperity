import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { BASE_CATALOG, LABELS, SLOTS } from './catalog';
import type { GameState, PlannedAction, Stats, Symbol, Tile, Track } from './types';

export const LEVEL_STARTS = [0, 2, 5, 9, 14, 20];
export const MAX_RESEARCH = 26;
export const POLLUTION_LIMIT = 16;
export const FINAL_STEPS: Symbol[] = ['energy', 'energy', 'ecology', 'ecology', 'capital', 'research', 'prosperity'];
export const levelAt = (position: number) => LEVEL_STARTS.filter(start => position >= start).length;
export const pollutionBonus = (pollution: number) => [1, 6, 11].filter(space => pollution < space).length;

export function totals(G: GameState): Stats {
  return Object.values(G.board).reduce<Stats>((sum, tile) => {
    if (tile) for (const key of Object.keys(sum) as Symbol[]) sum[key] += tile[key];
    return sum;
  }, { energy: 0, ecology: 0, capital: 0, research: 0, prosperity: 0 });
}
export function priceOf(G: GameState, tile: Tile): number {
  const difference = tile.level - levelAt(G.research[tile.track]);
  return difference < 0 ? 50 : 100 + difference * 100;
}
export function unlocked(G: GameState, slotId: string): boolean {
  const slot = SLOTS.find(s => s.id === slotId);
  return !!slot && (!slot.requires || !!G.board[slot.requires] && G.board[slot.requires]?.id !== 'start-greenbelt');
}
export function legalSlots(G: GameState, tile: Tile): string[] {
  return SLOTS.filter(s => s.category === tile.category && unlocked(G, s.id)).map(s => s.id);
}
function log(G: GameState, text: string, kind: 'event' | 'action' | 'final' = 'action') {
  G.log.push({ turn: G.turn, text, kind });
}
function points(G: GameState, amount: number) {
  const earned = G.pollution >= POLLUTION_LIMIT ? 0 : amount;
  G.score += earned;
  return earned;
}

export function initialState(catalog: Tile[] = BASE_CATALOG, seed = 'prosperity', shuffle: (deck: string[]) => string[] = x => x): GameState {
  const decades = [...new Set(catalog.filter(t => t.decade > 0).map(t => t.decade))].sort();
  const deck = decades.flatMap(decade => shuffle(catalog.filter(t => t.decade === decade).map(t => t.id)));
  if (!deck.length) throw new Error('Le catalogue doit contenir au moins une tuile datée.');
  return {
    version: 1, id: seed, seed, custom: JSON.stringify(catalog) !== JSON.stringify(BASE_CATALOG), catalog,
    deck, market: catalog.filter(t => t.decade === 0).map(t => t.id),
    board: Object.fromEntries(SLOTS.map(s => [s.id, s.initial ?? null])),
    money: 100, pollution: 8, score: 0, research: { energy: 0, ecology: 0 },
    turn: 0, totalTurns: deck.length, actions: 0, phase: 'draw', plannedActions: [], pending: 0, current: null,
    finalStep: -1, finalScores: [], log: [{ turn: 0, text: 'Fondation de la nation · 100 € et 8 pollutions.', kind: 'event' }], lastMove: 'draw',
  };
}

function returnFromTally(G: GameState) {
  G.pending = 0;
  G.phase = G.finalStep >= 0 ? 'final' : 'actions';
}

function tally(G: GameState, symbol: Symbol) {
  const s = totals(G);
  const kind = G.finalStep >= 0 ? 'final' : 'event';
  if (symbol === 'energy') {
    if (s.energy < 0) { G.pending = -s.energy; G.phase = 'energy'; return; }
    G.money += s.energy * 50;
    log(G, `Énergie : +${s.energy * 50} €.`, kind);
  } else if (symbol === 'ecology') {
    const excess = Math.max(0, s.ecology - G.pollution);
    const before = G.pollution;
    G.pollution = Math.max(0, G.pollution - s.ecology);
    G.money += excess * 50;
    log(G, `Écologie : ${G.pollution - before > 0 ? '+' : ''}${G.pollution - before} pollution${excess ? `, +${excess * 50} €` : ''}.`, kind);
  } else if (symbol === 'capital') {
    G.money += s.capital * 100;
    log(G, `Capital : +${s.capital * 100} €.`, kind);
    if (G.finalStep >= 0) {
      const amount = points(G, Math.floor(G.money / 300));
      G.money %= 300;
      G.finalScores.push({ label: 'Conversion du capital', value: amount });
      log(G, `Conversion du capital : +${amount} points, ${G.money} € conservés.`, 'final');
    }
  } else if (symbol === 'research') {
    if (G.finalStep >= 0) {
      for (const track of ['energy', 'ecology'] as Track[]) G.research[track] = Math.min(MAX_RESEARCH, G.research[track] + s.research);
      log(G, `Recherche finale : +${s.research} cases sur chaque piste. Pas de classement en solo.`, 'final');
    } else if (s.research > 0 && (G.research.energy < MAX_RESEARCH || G.research.ecology < MAX_RESEARCH)) {
      G.pending = s.research; G.phase = 'research'; return;
    } else log(G, 'Recherche : aucune progression disponible.', kind);
  } else {
    const amount = points(G, s.prosperity + pollutionBonus(G.pollution));
    log(G, `Prospérité : +${amount} points${G.pollution >= POLLUTION_LIMIT ? ' (pollution critique)' : ''}.`, kind);
    if (G.finalStep >= 0) G.finalScores.push({ label: 'Dernier décompte de prospérité', value: amount });
  }
  returnFromTally(G);
}

const canAct = (G: GameState) => G.phase === 'actions' && G.actions > 0;
function useAction(G: GameState, description: string) {
  G.actions--;
  G.lastMove = 'action';
  log(G, description);
}

// Preview and commit share this rule path, including the effects of preceding actions.
function applyAction(G: GameState, action: PlannedAction): boolean {
  if (!canAct(G) || !action || typeof action !== 'object') return false;
  switch (action.type) {
    case 'income':
      G.money += 100;
      useAction(G, 'Revenus : +100 €');
      return true;
    case 'cleanup':
      if (G.pollution === 0) return false;
      G.pollution--;
      useAction(G, 'Dépollution : -1 pollution');
      return true;
    case 'research':
      if (!['energy', 'ecology'].includes(action.track) || G.research[action.track] >= MAX_RESEARCH) return false;
      G.research[action.track]++;
      useAction(G, `Recherche ${LABELS[action.track].toLowerCase()} : +1 case`);
      return true;
    case 'buy': {
      const tile = G.catalog.find(t => t.id === action.tileId);
      if (!tile || !G.market.includes(tile.id)) return false;
      const price = priceOf(G, tile);
      if (G.money < price || tile.category !== 'special' && (!action.slotId || !legalSlots(G, tile).includes(action.slotId))) return false;
      G.money -= price;
      G.market.splice(G.market.indexOf(tile.id), 1);
      if (tile.category === 'special') {
        if (tile.effect === 'points') points(G, tile.amount);
        if (tile.effect === 'cleanup') G.pollution = Math.max(0, G.pollution - tile.amount);
      } else G.board[action.slotId!] = tile;
      useAction(G, `${tile.name} : -${price} €`);
      return true;
    }
    default: return false;
  }
}

export function previewState(G: GameState): GameState {
  const preview = { ...G, board: { ...G.board }, research: { ...G.research }, market: [...G.market], log: [...G.log], plannedActions: [] };
  for (const action of G.plannedActions ?? []) {
    if (!applyAction(preview, action)) throw new Error('La préparation contient une action invalide.');
  }
  return preview;
}

function planAction(G: GameState, action: PlannedAction) {
  const preview = previewState(G);
  if (!applyAction(preview, action)) return INVALID_MOVE;
  G.plannedActions.push(action);
}

export function createGame(catalog: Tile[] = BASE_CATALOG, seed = 'prosperity', saved?: GameState): Game<GameState> {
  return {
    name: 'prosperity-solo', seed, minPlayers: 1, maxPlayers: 1,
    setup: ({ random }) => saved ?? initialState(catalog, seed, deck => random.Shuffle(deck)),
    endIf: ({ G }) => G.phase === 'finished' ? { score: G.score } : undefined,
    moves: {
      draw: {
        undoable: false,
        move: ({ G, events }) => {
          if (!(G.phase === 'draw' || G.phase === 'committed') || G.plannedActions.length) return INVALID_MOVE;
          G.lastMove = 'draw';
          if (G.deck.length === 0) {
            G.phase = 'final'; G.finalStep = 0;
            G.finalScores = [{ label: 'Points acquis pendant la partie', value: G.score }];
            log(G, 'Le décompte final commence.', 'final');
            return;
          }
          if (G.turn > 0) events.endTurn();
          G.current = G.deck.shift()!;
          G.turn++;
          G.actions = 2;
          const tile = G.catalog.find(t => t.id === G.current)!;
          G.market.push(tile.id);
          log(G, `${tile.decade} · ${tile.name}. Décompte : ${LABELS[tile.tally].toLowerCase()}.`, 'event');
          tally(G, tile.tally);
        },
      },
      income: { undoable: false, move: ({ G }) => planAction(G, { type: 'income' }) },
      cleanup: { undoable: false, move: ({ G }) => planAction(G, { type: 'cleanup' }) },
      research: { undoable: false, move: ({ G }, track: Track) => planAction(G, { type: 'research', track }) },
      buy: { undoable: false, move: ({ G }, tileId: string, slotId?: string) => planAction(G, { type: 'buy', tileId, ...(slotId ? { slotId } : {}) }) },
      undoPlan: {
        undoable: false,
        move: ({ G }) => {
          if (G.phase !== 'actions' || !G.plannedActions.length) return INVALID_MOVE;
          G.plannedActions.pop();
        },
      },
      resetPlan: {
        undoable: false,
        move: ({ G }) => {
          if (G.phase !== 'actions' || !G.plannedActions.length) return INVALID_MOVE;
          G.plannedActions = [];
        },
      },
      commit: {
        undoable: false,
        move: ({ G }) => {
          if (G.phase !== 'actions' || !G.plannedActions.length) return INVALID_MOVE;
          const preview = previewState(G);
          if (preview.actions !== 0) return INVALID_MOVE;
          Object.assign(G, preview, { phase: 'committed' });
        },
      },
      resolveEnergy: {
        undoable: false,
        move: ({ G }, paidUnits: number) => {
          if (G.phase !== 'energy' || !Number.isInteger(paidUnits) || paidUnits < 0 || paidUnits > G.pending || paidUnits * 100 > G.money) return INVALID_MOVE;
          G.money -= paidUnits * 100;
          G.pollution += G.pending - paidUnits;
          log(G, `Déficit énergétique : -${paidUnits * 100} €, +${G.pending - paidUnits} pollution.`, G.finalStep >= 0 ? 'final' : 'event');
          G.lastMove = 'resolve';
          returnFromTally(G);
        },
      },
      resolveResearch: {
        undoable: false,
        move: ({ G }, energy: number) => {
          if (G.phase !== 'research' || !Number.isInteger(energy)) return INVALID_MOVE;
          const available = Math.min(G.pending, MAX_RESEARCH * 2 - G.research.energy - G.research.ecology);
          const ecology = available - energy;
          if (energy < 0 || ecology < 0 || energy > MAX_RESEARCH - G.research.energy || ecology > MAX_RESEARCH - G.research.ecology) return INVALID_MOVE;
          G.research.energy += energy;
          G.research.ecology += ecology;
          log(G, `Recherche : +${energy} énergie, +${ecology} écologie.`, 'event');
          G.lastMove = 'resolve';
          returnFromTally(G);
        },
      },
      nextFinal: {
        undoable: false,
        move: ({ G }) => {
          if (G.phase !== 'final' || G.finalStep < 0 || G.finalStep >= FINAL_STEPS.length) return INVALID_MOVE;
          const symbol = FINAL_STEPS[G.finalStep];
          G.finalStep++;
          G.lastMove = 'final';
          tally(G, symbol);
          if (G.finalStep === FINAL_STEPS.length) { G.phase = 'finished'; log(G, `Bilan de la nation : ${G.score} points de prospérité.`, 'final'); }
        },
      },
    },
  };
}
