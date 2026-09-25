import { Globe2, LockKeyhole, Route } from 'lucide-react';
import { CATEGORY_ICONS, SymbolIcon, TileArt } from '../components';
import { CATEGORIES, LABELS, SLOTS } from '../game/catalog';
import { totals, unlocked } from '../game/engine';
import { SYMBOLS, type GameState } from '../game/types';

export default function PlayerTerritory({ G, committed, highlighted, onInspect }: {
  G: GameState; committed: GameState; highlighted?: string; onInspect: (slot: string) => void;
}) {
  const stats = totals(G);
  return <section className="nation-territory" aria-label="Plateau de votre nation">
    <div className="nation-totals" aria-label="Bilan de production">{SYMBOLS.map(symbol => <span key={symbol} className={`symbol-${symbol} ${highlighted === symbol ? 'tally-highlight' : ''}`} title={`${LABELS[symbol]} : ${stats[symbol]} par décompte`}><SymbolIcon name={symbol} size={18} /><b>{stats[symbol] > 0 ? '+' : ''}{stats[symbol]}</b><small>{LABELS[symbol]}</small></span>)}</div>
    <div className="territory-frame"><div className="play-board">
      {SLOTS.map(slot => {
        const placed = G.board[slot.id];
        const locked = !unlocked(G, slot.id);
        const newlyUnlocked = !locked && !unlocked(committed, slot.id);
        const changed = placed?.id !== committed.board[slot.id]?.id;
        const Icon = CATEGORY_ICONS[slot.category];
        const label = `${slot.id.toUpperCase()} · ${placed?.name ?? (locked ? `Transport requis en ${slot.requires?.toUpperCase()}` : CATEGORIES[slot.category])}`;
        return <button key={slot.id} data-testid={`slot-${slot.id}`} className={`play-slot cat-${slot.category} ${placed ? 'occupied' : ''} ${locked ? 'locked' : ''} ${newlyUnlocked ? 'newly-unlocked' : ''} ${changed ? 'changed' : ''}`} style={{ gridRow: slot.row, gridColumn: slot.col }} aria-label={label} onClick={() => onInspect(slot.id)}>
          {placed ? <TileArt key={placed.id} className={changed ? 'just-placed' : ''} tile={placed} /> : locked ? <span className="locked-connection"><Route size={24} /><LockKeyhole size={16} /><small>Transport en {slot.requires?.toUpperCase()}</small></span> : <span className="empty-land"><Icon size={27} strokeWidth={1.2} /><small>{CATEGORIES[slot.category]}</small></span>}
          <span className="slot-coordinate">{slot.id.toUpperCase()}</span>{placed && <span className="play-slot-name">{placed.name}</span>}
          {changed && <span className="change-marker" title="Construction en préparation">✓</span>}
        </button>;
      })}
      <div className="play-board-center"><Globe2 size={34} strokeWidth={1} /><span>PROSPERITY</span></div>
      <span className={`territory-road ${unlocked(G, 'd1') ? 'connected' : ''}`} aria-hidden="true" />
    </div></div>
  </section>;
}
