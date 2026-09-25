import { Check, Circle, Clock3 } from 'lucide-react';
import { SymbolIcon } from '../components';
import { LABELS } from '../game/catalog';
import { decadeProgress } from '../game/presentation';
import type { GameState } from '../game/types';

export default function DecadeTracker({ G }: { G: GameState }) {
  const { decade, symbols } = decadeProgress(G);
  const pending = G.phase === 'energy' || G.phase === 'research' ? G.phase : undefined;
  return <div className="decade-clock"><div className="table-year"><strong>{decade}</strong><span>Tour {G.turn || 1} / {G.totalTurns}</span></div>
    <div className="decade-tracker" aria-label={`Décomptes de la décennie ${decade}`}>
      {symbols.filter(s => s.total).map(({ symbol, total, done, remaining }) => <span key={symbol} className={pending === symbol ? 'in-progress' : remaining ? 'pending' : 'done'} aria-label={`${LABELS[symbol]} : ${done} passé${done > 1 ? 's' : ''}, ${remaining} restant${remaining > 1 ? 's' : ''}${pending === symbol ? ' · résolution en cours' : ''}`} title={`${LABELS[symbol]} : ${done} / ${total} révélés${pending === symbol ? ' · choix à résoudre' : ''}`}><SymbolIcon name={symbol} size={12} /><span>{done}/{total}</span>{pending === symbol ? <Clock3 size={11} /> : remaining ? <Circle size={7} /> : <Check size={10} />}</span>)}
    </div><small className="decade-caption">Décomptes révélés / total</small>
  </div>;
}
