export const SYMBOLS = ['energy', 'ecology', 'capital', 'research', 'prosperity'] as const;
export type Symbol = typeof SYMBOLS[number];
export type Track = 'energy' | 'ecology';
export type Category = 'power' | 'supply' | 'transport' | 'infrastructure' | 'special';
export type Stats = Record<Symbol, number>;
export interface Tile extends Stats {
  id: string;
  name: string;
  category: Category;
  track: Track;
  level: number;
  decade: number;
  tally: Symbol;
  image: string;
  symbolsOnImage?: boolean;
  effect: 'none' | 'points' | 'cleanup';
  amount: number;
}
export interface Slot {
  id: string;
  category: Exclude<Category, 'special'>;
  row: number;
  col: number;
  requires?: string;
  initial?: Tile;
}
export interface LogEntry { turn: number; text: string; kind: 'event' | 'action' | 'final' }
export type PlannedAction =
  | { type: 'income' }
  | { type: 'cleanup' }
  | { type: 'research'; track: Track }
  | { type: 'buy'; tileId: string; slotId?: string };
export interface GameState {
  version: 1;
  id: string;
  seed: string;
  custom: boolean;
  catalog: Tile[];
  deck: string[];
  market: string[];
  board: Record<string, Tile | null>;
  money: number;
  pollution: number;
  score: number;
  research: Record<Track, number>;
  turn: number;
  totalTurns: number;
  actions: number;
  phase: 'draw' | 'actions' | 'committed' | 'energy' | 'research' | 'final' | 'finished';
  plannedActions: PlannedAction[];
  pending: number;
  current: string | null;
  finalStep: number;
  finalScores: { label: string; value: number }[];
  log: LogEntry[];
  lastMove: 'draw' | 'action' | 'resolve' | 'final';
}
