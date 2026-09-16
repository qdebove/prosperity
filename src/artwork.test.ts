import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BASE_CATALOG, SLOTS, validateCatalog } from './game/catalog';
import { artworkImageFor, normalizeArtworkImage, resolveArtwork } from './artwork';

const tiles = [...BASE_CATALOG, ...SLOTS.flatMap(slot => slot.initial ? [slot.initial] : [])];

describe('bibliothèque illustrée', () => {
  it('attribue un cadrage distinct aux 60 technologies et aux 6 bâtiments de départ', () => {
    expect(tiles).toHaveLength(66);
    expect(new Set(tiles.map(tile => tile.image)).size).toBe(66);
    expect(new Set(tiles.map(tile => {
      const art = resolveArtwork(tile.image)!;
      expect(art).toBeDefined();
      expect(artworkImageFor(tile.id)).toBe(tile.image);
      const [x, y, width, height] = art.frame;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(art.columns);
      expect(y + height).toBeLessThanOrEqual(art.rows);
      return `${art.src}:${art.frame.join(',')}`;
    })).size).toBe(66);
  });
  it('fournit six images locales haute définition aux proportions attendues', () => {
    const sources = new Map(tiles.map(tile => {
      const art = resolveArtwork(tile.image)!;
      return [art.src, art];
    }));
    expect(sources.size).toBe(6);
    for (const art of sources.values()) {
      const png = readFileSync(`public${art.src}`);
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(width / height).toBeCloseTo(art.columns / art.rows, 2);
      expect(width / art.columns).toBeGreaterThanOrEqual(350);
      expect(height / art.rows).toBeGreaterThanOrEqual(350);
    }
  });
  it('reconnaît les anciennes références sans charger les scans', () => {
    for (const tile of tiles) {
      const legacy = `/assets/${tile.id}.jpg`;
      expect(resolveArtwork(legacy)).toEqual(resolveArtwork(tile.image));
      expect(normalizeArtworkImage(legacy)).toBe(tile.image);
    }
  });
  it('préserve les valeurs, images importées et préférences des créations', () => {
    const imported = 'data:image/png;base64,iVBORw0KGgo=';
    const input = [
      { ...BASE_CATALOG[0], image: '/assets/initial-0.jpg', energy: 4, name: 'Ma tour', symbolsOnImage: false },
      { ...BASE_CATALOG[1], id: 'custom-image', image: imported },
    ];
    const migrated = validateCatalog(input);
    expect(migrated[0]).toEqual({ ...input[0], image: artworkImageFor('initial-0') });
    expect(migrated[1].image).toBe(imported);
    expect(normalizeArtworkImage(imported)).toBe(imported);
  });
  it('refuse les atlas inconnus et les cadrages hors bibliothèque', () => {
    for (const image of ['/assets/tiles/nation-01.png#tile=99', '/assets/tiles/nation-01.png#tile=-1', '/assets/tiles/unknown.png#tile=0', '/assets/tiles/../city.jpg', 'https://example.com/a.png']) {
      expect(resolveArtwork(image)).toBeUndefined();
      expect(() => validateCatalog([{ ...BASE_CATALOG[0], image }])).toThrow();
    }
  });
});
