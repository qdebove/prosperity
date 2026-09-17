import { Globe2, LockKeyhole, Plus, Route } from 'lucide-react';
import { CATEGORY_ICONS, SymbolIcon, TileArt } from '../components';
import { CATEGORIES, LABELS, SLOTS } from '../game/catalog';
import { totals, unlocked } from '../game/engine';
import { SYMBOLS, type GameState, type Tile } from '../game/types';

export default function PlayerTerritory({ G, committed, tile, targets, highlighted, onPlace, onInspect, onHover }: {
  G: GameState; committed: GameState; tile?: Tile; targets: string[]; highlighted?: string;
  onPlace: (slot: string) => void; onInspect: (tile: Tile) => void; onHover: (slot?: string) => void;
}) {
  const stats = totals(G);
  return <section className={`nation-territory ${tile ? 'placing' : ''}`} aria-label="Plateau de votre nation">
    <header className="board-caption"><div><span className="eyebrow">VOTRE TERRITOIRE</span><h2>Une nation en devenir</h2></div></header>
    <div className="nation-totals">{SYMBOLS.map(symbol => <span key={symbol} className={`symbol-${symbol} ${highlighted === symbol ? 'tally-highlight' : ''}`} title={`${LABELS[symbol]} : ${stats[symbol]}`}><SymbolIcon name={symbol} size={17} /><b>{stats[symbol] > 0 ? '+' : ''}{stats[symbol]}</b><small>{LABELS[symbol]}</small></span>)}</div>
    <div className="territory-frame"><div className="play-board">
      {SLOTS.map(slot => {
        const placed = G.board[slot.id];
        const target = targets.includes(slot.id);
        const locked = !unlocked(G, slot.id);
        const newlyUnlocked = !locked && !unlocked(committed, slot.id);
        const changed = placed?.id !== committed.board[slot.id]?.id;
        const Icon = CATEGORY_ICONS[slot.category];
        const label = target ? `${placed ? 'Remplacer' : 'Construire'} en ${slot.id.toUpperCase()}` : placed?.name ?? (locked ? `Transport requis en ${slot.requires?.toUpperCase()}` : CATEGORIES[slot.category]);
        return <button key={slot.id} data-testid={`slot-${slot.id}`} className={`play-slot cat-${slot.category} ${placed ? 'occupied' : ''} ${target ? 'target' : ''} ${tile && !target ? 'incompatible' : ''} ${locked ? 'locked' : ''} ${newlyUnlocked ? 'newly-unlocked' : ''} ${changed ? 'changed' : ''}`} style={{ gridRow: slot.row, gridColumn: slot.col }} aria-label={label} aria-disabled={!target && !placed} title={label} onMouseEnter={() => onHover(target ? slot.id : undefined)} onMouseLeave={() => onHover()} onFocus={() => onHover(target ? slot.id : undefined)} onBlur={() => onHover()} onClick={() => target ? onPlace(slot.id) : placed && onInspect(placed)}>
          {placed ? <TileArt key={placed.id} className={changed ? 'just-placed' : ''} tile={placed} /> : locked ? <span className="locked-connection"><Route size={22} /><LockKeyhole size={14} /><small>Transport en {slot.requires?.toUpperCase()}</small></span> : <span className="empty-land">{target ? <Plus size={25} /> : <Icon size={23} strokeWidth={1.2} />}<small>{CATEGORIES[slot.category]}</small></span>}
          <span className="slot-coordinate">{slot.id.toUpperCase()}</span>{placed && <span className="play-slot-name">{placed.name}</span>}
          {target && <span className="placement-label">{placed ? 'Remplacer' : 'Construire'}</span>}
          {changed && <span className="change-marker" title="Construction en préparation">✓</span>}
        </button>;
      })}
      <div className="play-board-center"><Globe2 size={29} strokeWidth={1} /><span>PROSPERITY</span></div>
      <span className={`territory-road ${unlocked(G, 'd1') ? 'connected' : ''}`} aria-hidden="true" />
    </div></div>
    <p className="territory-instruction" aria-live="polite">{tile ? targets.length ? 'Choisissez une case marquée. Survolez-la pour comparer.' : 'Aucun placement disponible pour cet achat.' : 'Cliquez sur un bâtiment pour examiner ses effets.'}</p>
  </section>;
}
