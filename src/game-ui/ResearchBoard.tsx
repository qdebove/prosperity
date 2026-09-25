import { SymbolIcon, TileArt } from '../components';
import { LABELS, SLOTS } from '../game/catalog';
import { LEVEL_STARTS, MAX_RESEARCH, levelAt, legalSlots, priceOf } from '../game/engine';
import type { GameState, Tile, Track } from '../game/types';
import type { Availability } from '../game/presentation';

export function priceReason(G: GameState, tile: Tile) {
  const difference = tile.level - levelAt(G.research[tile.track]);
  return difference === 0 ? 'Même niveau que votre recherche' : difference < 0 ? 'Technologie inférieure à votre recherche' : `${difference} niveau${difference > 1 ? 'x' : ''} au-dessus de votre recherche`;
}

// Engine positions are zero based; displayed levels and local steps are one based.
export function researchPosition(position: number) {
  const level = levelAt(position);
  const start = LEVEL_STARTS[level - 1];
  return { level, step: position - start + 1, steps: (LEVEL_STARTS[level] ?? MAX_RESEARCH + 1) - start };
}
export interface ResearchMarker { id: string; label: string; track: Track; position: number; playerNumber?: number; own?: boolean }

export default function ResearchBoard({ G, selected, active, onSelect, onResearch, onMarker, availability, targetSlot, markers = [
  { id: 'nation-energy', label: 'Votre nation', track: 'energy', position: G.research.energy },
  { id: 'nation-ecology', label: 'Votre nation', track: 'ecology', position: G.research.ecology },
] }: { G: GameState; selected?: string; active: boolean; onSelect: (tile: Tile) => void; onResearch: (track: Track) => void; onMarker: (marker: ResearchMarker) => void; markers?: ResearchMarker[]; availability: Record<string, Availability>; targetSlot?: string }) {
  const target = SLOTS.find(s => s.id === targetSlot);
  return <section className="research-board" aria-label="Plateau de recherche et technologies">
    <div className="research-headings">{(['energy', 'ecology'] as Track[]).map(track => {
      const p = researchPosition(G.research[track]);
      return <button key={track} className={`research-advance symbol-${track}`} disabled={!active || G.research[track] === MAX_RESEARCH} aria-label={`Rechercher en ${LABELS[track].toLowerCase()} : avancer d’une case`} onClick={() => onResearch(track)}>
        <SymbolIcon name={track} size={23} /><span>{LABELS[track]}<small>Niv. {p.level} · case {p.step}/{p.steps}</small></span><b>{G.research[track] === MAX_RESEARCH ? 'MAX' : '+1 case'}</b>
      </button>;
    })}<span className="track-heading">RECHERCHE</span></div>
    <div className="research-level-board">
      {[6, 5, 4, 3, 2, 1].map(level => {
        const start = LEVEL_STARTS[level - 1];
        const count = (LEVEL_STARTS[level] ?? MAX_RESEARCH + 1) - start;
        return <div className="research-row" key={level} data-level={level}>
          {(['energy', 'ecology'] as Track[]).map(track => {
            const tiles = G.catalog.filter(t => G.market.includes(t.id) && t.track === track && t.level === level);
            return <div className={`technology-row ${track}`} key={track} aria-label={`${LABELS[track]} · niveau ${level}`}>
              <span className="row-price">{priceOf(G, { level, track } as Tile)} €</span>
              <div className="technology-fan">{tiles.map(tile => {
                const compatible = !target || target.category === tile.category;
                const accessible = !target || legalSlots(G, tile).includes(target.id);
                const funded = priceOf(G, tile) <= G.money;
                const eligible = compatible && accessible && funded && active && availability[tile.id].state === 'now';
                const status = !compatible ? 'Autre catégorie' : !accessible ? 'Accès fermé' : !funded ? 'Fonds insuffisants' : !active ? 'Phase d’actions requise' : eligible ? 'Disponible' : availability[tile.id].label;
                return <button key={tile.id} data-tile-id={tile.id} data-compatible={compatible} className={`board-technology cat-${tile.category} ${selected === tile.id ? 'selected' : ''} ${eligible ? 'availability-now' : 'availability-unavailable'}`} aria-label={`${tile.name}, ${priceOf(G, tile)} euros`} aria-pressed={selected === tile.id} onClick={() => onSelect(tile)}>
                  <TileArt tile={tile} /><span className="technology-name">{tile.name}</span><span className={`market-availability ${eligible ? 'now' : ''}`}>{eligible ? '✓ ' : ''}{status}</span>{tile.id === G.current && <span className="new-technology">NOUVELLE</span>}
                </button>;
              })}{!tiles.length && <span className="empty-research">Aucune tuile révélée</span>}</div>
            </div>;
          })}
          <div className="level-engraving"><b aria-label={`Niveau ${level}`}>{level}</b>
            {(['energy', 'ecology'] as Track[]).map(track => <div className={`research-rail ${track}`} key={track} aria-label={`${LABELS[track]} · étapes du niveau ${level}`}>
              {Array.from({ length: count }, (_, i) => start + count - 1 - i).map(position => <div key={position} data-position={position} className={`research-step ${position <= G.research[track] ? 'reached' : ''}`}>
                <i aria-hidden="true" />
                <div className="step-markers">{markers.filter(m => m.track === track && m.position === position).map(marker => {
                  const p = researchPosition(position);
                  return <button key={marker.id} data-testid={`marker-${marker.id}`} data-position={position} className={`research-pawn symbol-${track} ${marker.playerNumber ? `nation-color-${marker.playerNumber - 1}` : ''}`} aria-label={`${marker.label} · ${LABELS[track]} · niveau ${p.level}, case ${p.step}/${p.steps}`} onClick={() => onMarker(marker)}>{marker.playerNumber ?? <SymbolIcon name={track} size={16} />}</button>;
                })}</div>
              </div>)}
            </div>)}
          </div>
        </div>;
      })}
    </div>
  </section>;
}
