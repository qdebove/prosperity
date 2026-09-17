import type { CSSProperties } from 'react';
import { SymbolIcon, TileArt } from '../components';
import { LABELS } from '../game/catalog';
import { LEVEL_STARTS, MAX_RESEARCH, levelAt, priceOf } from '../game/engine';
import type { GameState, Tile, Track } from '../game/types';

export function priceReason(G: GameState, tile: Tile) {
  const difference = tile.level - levelAt(G.research[tile.track]);
  return difference === 0 ? 'Même niveau que votre recherche' : difference < 0 ? 'Technologie inférieure à votre recherche' : `${difference} niveau${difference > 1 ? 'x' : ''} au-dessus de votre recherche`;
}

// A marker has its own identity so another nation can share these same tracks.
export interface ResearchMarker { id: string; label: string; track: Track; position: number }
function markerTop(position: number) {
  const level = levelAt(position);
  const step = position - LEVEL_STARTS[level - 1];
  return (6 - level + 1 - (step + .5) / (level + 1)) / 6 * 100;
}

export default function ResearchBoard({ G, selected, active, focused, onSelect, onResearch, markers = [
  { id: 'nation-energy', label: 'Votre nation', track: 'energy', position: G.research.energy },
  { id: 'nation-ecology', label: 'Votre nation', track: 'ecology', position: G.research.ecology },
] }: { G: GameState; selected?: string; active: boolean; focused: boolean; onSelect: (tile: Tile) => void; onResearch: (track: Track) => void; markers?: ResearchMarker[] }) {
  return <section className={`research-board ${focused ? 'board-focused' : ''}`} aria-label="Plateau de recherche et technologies">
    <header className="board-caption"><div><span className="eyebrow">LES TECHNOLOGIES</span><h2>Inventer demain</h2></div><span className="board-note">Le prix suit votre recherche</span></header>
    <div className="research-headings">{(['energy', 'ecology'] as Track[]).map(track => <button key={track} className={`research-advance symbol-${track}`} disabled={!active || G.research[track] === MAX_RESEARCH} aria-label={`Rechercher en ${LABELS[track].toLowerCase()} : avancer d’une case`} onClick={() => onResearch(track)}>
      <SymbolIcon name={track} size={18} /><span>{LABELS[track]}<small>Niv. {levelAt(G.research[track])} · case {G.research[track] - LEVEL_STARTS[levelAt(G.research[track]) - 1] + 1}/{levelAt(G.research[track]) + 1}</small></span><b>{G.research[track] === MAX_RESEARCH ? 'MAX' : '+1'}</b>
    </button>)}<span className="track-heading">RECHERCHE</span></div>
    <div className="research-level-board">
      {[6, 5, 4, 3, 2, 1].map(level => <div className="research-row" key={level} data-level={level}>
        {(['energy', 'ecology'] as Track[]).map(track => {
          const tiles = G.catalog.filter(t => G.market.includes(t.id) && t.track === track && t.level === level);
          return <div className={`technology-row ${track}`} key={track} aria-label={`${LABELS[track]} · niveau ${level}`}>
            <span className="row-price">{priceOf(G, { level, track } as Tile)} €</span>
            <div className="technology-fan" style={{ '--tile-count': Math.max(1, tiles.length) } as CSSProperties}>{tiles.map(tile => <button key={tile.id} data-tile-id={tile.id} className={`board-technology cat-${tile.category} ${selected === tile.id ? 'selected' : ''} ${priceOf(G, tile) > G.money ? 'unaffordable' : ''}`} aria-label={`${tile.name}, ${priceOf(G, tile)} euros`} aria-pressed={selected === tile.id} title={`${tile.name} · ${priceOf(G, tile)} € — ${priceReason(G, tile)}`} onClick={() => onSelect(tile)}>
              <TileArt tile={tile} /><span className="technology-name">{tile.name}</span>{tile.id === G.current && <span className="new-technology">NOUVELLE</span>}
            </button>)}</div>
          </div>;
        })}
        <div className="level-engraving"><b>{level}</b></div>
      </div>)}
      <div className="research-rails" aria-label="Marqueurs de recherche">{(['energy', 'ecology'] as Track[]).map(track => <div className={`research-rail ${track}`} key={track}>
        {Array.from({ length: MAX_RESEARCH + 1 }, (_, i) => <i key={i} className={i <= G.research[track] ? 'reached' : ''} style={{ top: `${markerTop(i)}%` }} />)}
        {markers.filter(m => m.track === track).map((marker, i) => <span key={marker.id} data-testid={`marker-${marker.id}`} className={`research-pawn symbol-${track}`} style={{ top: `${markerTop(marker.position)}%`, marginLeft: i * 7 }} role="img" aria-label={`${marker.label} · ${LABELS[track]} · niveau ${levelAt(marker.position)}, case ${marker.position + 1}`}><SymbolIcon name={track} size={12} /></span>)}
      </div>)}</div>
    </div>
    <p className="research-footnote">Un pion avance d’une case par action. Cliquez sur une tuile pour préparer son achat.</p>
  </section>;
}
