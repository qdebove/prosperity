import { Check, Circle } from 'lucide-react';
import { SymbolIcon } from '../components';
import { LABELS } from '../game/catalog';
import { decadeProgress } from '../game/presentation';
import type { GameState } from '../game/types';

export default function DecadeTracker({ G }: { G: GameState }) {
  const { decade, symbols } = decadeProgress(G);
  return <div className="decade-clock"><div className="table-year"><strong>{decade}</strong><span>Tour {G.turn || 1} / {G.totalTurns}</span></div>
    <div className="decade-tracker" aria-label={`Décomptes de la décennie ${decade}`}>
      {symbols.filter(s => s.total).map(({ symbol, total, done, remaining }) => <span key={symbol} className={remaining ? 'pending' : 'done'} aria-label={`${LABELS[symbol]} : ${done} passé${done > 1 ? 's' : ''}, ${remaining} restant${remaining > 1 ? 's' : ''}`} title={`${LABELS[symbol]} : ${done} / ${total} révélés`}><SymbolIcon name={symbol} size={12} /><span>{done}/{total}</span>{remaining ? <Circle size={7} /> : <Check size={10} />}</span>)}
    </div><small className="decade-caption">Décomptes révélés / total</small>
  </div>;
}
