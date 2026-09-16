interface Atlas {
  file: string;
  columns: number;
  rows: number;
  tiles: string[];
  frames?: Record<number, [number, number, number, number]>;
}

export interface Artwork {
  image: string;
  src: string;
  columns: number;
  rows: number;
  frame: [number, number, number, number];
}

const sequence = (prefix: string, from: number, count: number) => Array.from({ length: count }, (_, i) => `${prefix}-${from + i}`);

// Frame coordinates are measured in cells. A few tall silhouettes need extra headroom.
const atlases: Atlas[] = [
  {
    file: 'nation-01.png', columns: 4, rows: 3,
    tiles: ['start-coal', 'start-factory', 'start-supply', 'start-lab', 'start-greenbelt', 'start-road', ...sequence('initial', 0, 6)],
    frames: { 5: [1, 1, 1, .93], 9: [1, 1.93, 1, 1.07] },
  },
  {
    file: 'nation-02.png', columns: 4, rows: 3, tiles: sequence('initial', 6, 12),
    frames: { 7: [3, 1, 1, .93], 11: [3, 1.93, 1, 1.07] },
  },
  {
    file: 'nation-03.png', columns: 4, rows: 3,
    tiles: [...sequence('initial', 18, 6), ...sequence('1970', 0, 5), '1980-0'],
    frames: { 7: [3, 1, 1, .93], 11: [3, 1.93, 1, 1.07] },
  },
  {
    file: 'nation-04.png', columns: 4, rows: 3,
    tiles: [...sequence('1980', 1, 4), ...sequence('1990', 0, 5), ...sequence('2000', 0, 3)],
  },
  {
    file: 'nation-05.png', columns: 4, rows: 3,
    tiles: [...sequence('2000', 3, 2), ...sequence('2010', 0, 5), ...sequence('2020', 0, 5)],
  },
  {
    file: 'nation-06.png', columns: 3, rows: 2, tiles: sequence('2030', 0, 6),
    frames: { 2: [2, 0, 1, .91], 5: [2, .91, 1, 1.09] },
  },
];

const byId = new Map<string, Artwork>();
const byImage = new Map<string, Artwork>();
for (const atlas of atlases) {
  atlas.tiles.forEach((id, index) => {
    const src = `/assets/tiles/${atlas.file}`;
    const art: Artwork = {
      image: `${src}#tile=${index}`, src, columns: atlas.columns, rows: atlas.rows,
      frame: atlas.frames?.[index] ?? [index % atlas.columns, Math.floor(index / atlas.columns), 1, 1],
    };
    byId.set(id, art);
    byImage.set(art.image, art);
    byImage.set(`/assets/${id}.jpg`, art);
  });
}

export function artworkImageFor(id: string): string {
  const art = byId.get(id);
  if (!art) throw new Error(`Illustration absente : ${id}`);
  return art.image;
}

export const resolveArtwork = (image: string): Artwork | undefined => byImage.get(image);
export const normalizeArtworkImage = (image: string): string => resolveArtwork(image)?.image ?? image;
