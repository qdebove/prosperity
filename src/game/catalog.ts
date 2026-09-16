import type { Category, Slot, Stats, Symbol, Tile, Track } from './types';

export const LABELS: Record<Symbol, string> = { energy: 'Énergie', ecology: 'Écologie', capital: 'Capital', research: 'Recherche', prosperity: 'Prospérité' };
export const CATEGORIES: Record<Category, string> = { power: 'Centrale', supply: 'Distribution', transport: 'Transport', infrastructure: 'Infrastructure', special: 'Projet spécial' };
export const DECADES = [1970, 1980, 1990, 2000, 2010, 2020, 2030];
const stats = (energy = 0, ecology = 0, capital = 0, research = 0, prosperity = 0): Stats => ({ energy, ecology, capital, research, prosperity });
type Row = [string, Category, Track, number, Stats, ('points' | 'cleanup')?, number?];

// Transcribed from the 60 printed tiles on pages 7 and 8 of the supplied PDF.
const initial: Row[] = [
  ['Méga gratte-ciel', 'infrastructure', 'energy', 6, stats(0, -2, 0, 0, 2)],
  ['Rénovation du centre-ville', 'special', 'energy', 6, stats(), 'points', 2],
  ['Rénovation des banlieues', 'special', 'ecology', 6, stats(), 'points', 2],
  ['Réseau de communication', 'infrastructure', 'ecology', 6, stats(-4, 0, 0, 0, 2)],
  ['Barrage hydroélectrique', 'power', 'energy', 5, stats(2, -1, 0, 0, 1)],
  ['Réhabilitation des friches', 'special', 'energy', 5, stats(), 'cleanup', 3],
  ['Projet de reforestation', 'special', 'ecology', 5, stats(), 'cleanup', 3],
  ['Transports intégrés', 'transport', 'ecology', 5, stats(-1, 0, 0, 0, 1)],
  ['Complexe de loisirs', 'infrastructure', 'energy', 4, stats(-1, 0, 0, 0, 1)],
  ['Ville de culture', 'special', 'energy', 4, stats(), 'points', 1],
  ['Cité-jardin', 'special', 'ecology', 4, stats(), 'points', 1],
  ['Hôpital', 'infrastructure', 'ecology', 4, stats(-1, 0, 0, 0, 1)],
  ['Distribution haute tension', 'supply', 'energy', 3, stats(-1, 0, 1)],
  ['Usine automobile', 'infrastructure', 'energy', 3, stats(-1, 0, 2)],
  ['Câbles souterrains', 'supply', 'ecology', 3, stats(-2, 2)],
  ['Université', 'infrastructure', 'ecology', 3, stats(-1, 0, 0, 2)],
  ['Routes à péage', 'transport', 'energy', 2, stats(0, -1, 2)],
  ['Parc éolien', 'power', 'energy', 2, stats(3, -1)],
  ['Réseau ferroviaire', 'transport', 'ecology', 2, stats(0, 1)],
  ['Station d’épuration', 'infrastructure', 'ecology', 2, stats(-1, 2)],
  ['Centrale au fioul', 'power', 'energy', 1, stats(4, -2)],
  ['Réseau autoroutier', 'transport', 'energy', 1, stats(-1, 0, 1)],
  ['Tramway', 'transport', 'ecology', 1, stats(-1, 1)],
  ['Laboratoire des plastiques', 'infrastructure', 'ecology', 1, stats(0, 0, 0, 1)],
];

const dated: Row[][] = [
  [
    ['Centrale solaire', 'power', 'energy', 1, stats(2, -1)],
    ['Jardin botanique', 'infrastructure', 'ecology', 1, stats(0, 1)],
    ['Train à grande vitesse', 'transport', 'ecology', 3, stats(-1, 0, 2)],
    ['Institut de biochimie', 'infrastructure', 'ecology', 1, stats(-3, 2, 0, 1)],
    ['Centre d’aérodynamique', 'infrastructure', 'ecology', 3, stats(-1, -1, 0, 1, 1)],
  ],
  [
    ['Centrale au gaz', 'power', 'energy', 3, stats(5, -2)],
    ['Distribution à faible impact', 'supply', 'ecology', 5, stats(-1, 2)],
    ['Centrale de cogénération', 'power', 'energy', 2, stats(3, -2, 1)],
    ['Laboratoire de génétique', 'infrastructure', 'ecology', 3, stats(-2, 2, 0, 1)],
    ['Microproduction électrique', 'supply', 'energy', 4, stats(0, -1, 0, 0, 1)],
  ],
  [
    ['Centrale nucléaire', 'power', 'energy', 4, stats(4, -1)],
    ['Voitures électriques', 'transport', 'ecology', 3, stats(-1, 2)],
    ['Centre de données', 'infrastructure', 'energy', 1, stats(-3, 0, 3)],
    ['Institut de toxicologie', 'infrastructure', 'ecology', 2, stats(0, -2, 0, 3)],
    ['Laboratoire de microprocesseurs', 'infrastructure', 'ecology', 4, stats(0, -1, 0, 1, 1)],
  ],
  [
    ['Centrale marémotrice', 'power', 'energy', 5, stats(3)],
    ['Électricité sans fil', 'supply', 'ecology', 6, stats(-2, 3)],
    ['Péage urbain', 'transport', 'ecology', 4, stats(0, 0, 2)],
    ['Biodôme', 'infrastructure', 'ecology', 4, stats(-3, 2, 0, 2)],
    ['Câbles supraconducteurs', 'supply', 'energy', 6, stats(-1, 0, 0, 0, 1)],
  ],
  [
    ['Tour solaire', 'power', 'energy', 6, stats(4)],
    ['Véhicules à hydrogène', 'transport', 'ecology', 4, stats(0, 2)],
    ['Centrale de valorisation', 'power', 'energy', 5, stats(3, -1, 1)],
    ['Laboratoire d’intelligence artificielle', 'infrastructure', 'ecology', 5, stats(0, 0, 0, 2)],
    ['Filtration atmosphérique', 'infrastructure', 'ecology', 4, stats(-2, 1, 0, 0, 1)],
  ],
  [
    ['Usine de biocarburants', 'power', 'energy', 4, stats(1, -1, 0, 0, 1)],
    ['Recyclage en circuit fermé', 'infrastructure', 'ecology', 4, stats(0, 2)],
    ['Véhicules autonomes', 'transport', 'energy', 5, stats(-1, -1, 2, 0, 1)],
    ['Accélérateur de particules', 'infrastructure', 'ecology', 5, stats(-1, -1, 0, 2, 1)],
    ['Production à la demande', 'infrastructure', 'ecology', 3, stats(-1, -1, 1, 0, 1)],
  ],
  [
    ['Centrale à fusion', 'power', 'energy', 6, stats(1, 0, 0, 0, 1)],
    ['Train à lévitation magnétique', 'transport', 'ecology', 6, stats(-1, 3)],
    ['Usine nanotechnologique', 'infrastructure', 'energy', 5, stats(-1, 0, 4)],
    ['Laboratoire de neuroaugmentation', 'infrastructure', 'ecology', 5, stats(0, -1, 0, 4)],
    ['Clinique de rajeunissement', 'infrastructure', 'ecology', 4, stats(0, -1, 1, 0, 1)],
    ['Ascenseur spatial', 'infrastructure', 'ecology', 6, stats(-2, -1, 0, 0, 2)],
  ],
];

function makeTile(row: Row, id: string, decade: number, tally: Symbol): Tile {
  const [name, category, track, level, values, effect = 'none', amount = 0] = row;
  return { id, name, category, track, level, ...values, decade, tally, image: `/assets/${id}.jpg`, effect, amount };
}
export const BASE_CATALOG: Tile[] = [
  ...initial.map((row, i) => makeTile(row, `initial-${i}`, 0, 'prosperity')),
  ...dated.flatMap((rows, decade) => rows.map((row, col) => makeTile(row, `${DECADES[decade]}-${col}`, DECADES[decade], (['energy', 'ecology', 'capital', 'research', 'prosperity', 'prosperity'] as Symbol[])[col]))),
];

const starting = (id: string, name: string, category: Category, values: Stats): Tile => ({ id, name, category, ...values, track: 'energy', level: 1, decade: 0, tally: 'energy', image: `/assets/${id}.jpg`, effect: 'none', amount: 0 });
export const SLOTS: Slot[] = [
  { id: 'a1', category: 'power', row: 1, col: 1, initial: starting('start-coal', 'Centrale à charbon', 'power', stats(2, -1)) },
  { id: 'a2', category: 'infrastructure', row: 1, col: 2 },
  { id: 'a3', category: 'infrastructure', row: 1, col: 3, initial: starting('start-factory', 'Industrie locale', 'infrastructure', stats(0, 0, 1)) },
  { id: 'b1', category: 'power', row: 2, col: 1 },
  { id: 'b2', category: 'supply', row: 2, col: 2, initial: starting('start-supply', 'Réseau électrique', 'supply', stats(-1)) },
  { id: 'b3', category: 'infrastructure', row: 2, col: 3, initial: starting('start-lab', 'Laboratoire', 'infrastructure', stats(0, 0, 0, 1)) },
  { id: 'c1', category: 'transport', row: 3, col: 1, initial: starting('start-greenbelt', 'Ceinture verte', 'transport', stats(0, 1)) },
  { id: 'c3', category: 'transport', row: 3, col: 3, initial: starting('start-road', 'Réseau routier', 'transport', stats(0, -1)) },
  { id: 'd1', category: 'infrastructure', row: 4, col: 1, requires: 'c1' },
  { id: 'd2', category: 'infrastructure', row: 4, col: 2, requires: 'c1' },
  { id: 'd3', category: 'infrastructure', row: 4, col: 3 },
];

export function validateCatalog(value: unknown): Tile[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) throw new Error('Le catalogue doit contenir entre 1 et 200 tuiles.');
  const seen = new Set<string>();
  const result = value.map((entry): Tile => {
    if (!entry || typeof entry !== 'object') throw new Error('Tuile invalide.');
    const t = entry as Tile;
    if (typeof t.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(t.id) || seen.has(t.id)) throw new Error('Identifiants de tuiles invalides ou en double.');
    seen.add(t.id);
    if (typeof t.name !== 'string' || !t.name.trim() || t.name.length > 70) throw new Error('Chaque tuile doit avoir un nom de 1 à 70 caractères.');
    if (typeof t.category !== 'string' || !Object.hasOwn(CATEGORIES, t.category) || !['energy', 'ecology'].includes(t.track) || typeof t.tally !== 'string' || !Object.hasOwn(LABELS, t.tally)) throw new Error('Catégorie, piste ou décompte invalide.');
    for (const key of ['level', 'decade', 'energy', 'ecology', 'capital', 'research', 'prosperity', 'amount'] as const) {
      if (!Number.isInteger(t[key])) throw new Error(`La valeur ${key} doit être un entier.`);
    }
    if (t.level < 1 || t.level > 6 || ![0, ...DECADES].includes(t.decade)) throw new Error('Niveau ou décennie invalide.');
    if (Math.abs(t.energy) > 9 || Math.abs(t.ecology) > 9 || [t.capital, t.research, t.prosperity].some(v => v < 0 || v > 6)) throw new Error('Les valeurs de la tuile dépassent les limites.');
    if (!['none', 'points', 'cleanup'].includes(t.effect) || t.amount < 0 || t.amount > 9 || (t.category === 'special' ? t.effect === 'none' || t.amount < 1 : t.effect !== 'none' || t.amount !== 0)) throw new Error('Effet spécial invalide.');
    if (t.category === 'special' && [t.energy, t.ecology, t.capital, t.research, t.prosperity].some(value => value !== 0)) throw new Error('Un projet spécial ne peut pas avoir d’effets permanents.');
    if (typeof t.image !== 'string' || t.image.length > 2800000 || !(/^\/assets\/[a-zA-Z0-9_-]+\.jpg$/.test(t.image) || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(t.image) || t.image === '')) throw new Error('Illustration invalide. Utilisez un fichier PNG, JPEG ou WebP.');
    if (t.symbolsOnImage !== undefined && typeof t.symbolsOnImage !== 'boolean') throw new Error('Option de symboles invalide.');
    if (t.image.startsWith('/assets/') && !BASE_CATALOG.some(base => base.image === t.image) && !SLOTS.some(slot => slot.initial?.image === t.image)) throw new Error('Illustration absente de la bibliothèque.');
    return { id: t.id, name: t.name.trim(), category: t.category, track: t.track, level: t.level, decade: t.decade, tally: t.tally, image: t.image, ...(t.symbolsOnImage === undefined ? {} : { symbolsOnImage: t.symbolsOnImage }), effect: t.effect, amount: t.amount, energy: t.energy, ecology: t.ecology, capital: t.capital, research: t.research, prosperity: t.prosperity };
  });
  return result;
}
