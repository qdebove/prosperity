import { useState } from 'react';
import { Globe2, Leaf, Coins } from 'lucide-react';
import { SymbolIcon } from '../components';
import { LABELS } from '../game/catalog';
import { totals } from '../game/engine';
import { SYMBOLS, type GameState } from '../game/types';
import { researchPosition } from './ResearchBoard';

export interface ComparisonNation { id: string; name: string; own: boolean; state: GameState }
export default function ComparisonBoard({ nations }: { nations: ComparisonNation[] }) {
  const [metric, setMetric] = useState<'score' | 'money' | 'pollution'>('score');
  const label = { score: 'Prospérité', money: 'Trésorerie', pollution: 'Pollution' };
  const unit = { score: 'PP', money: '€', pollution: 'disques' };
  const max = Math.max(1, ...nations.map(n => n.state[metric]));
  const ranking = [...nations].sort((a, b) => b.state.score - a.state.score || b.state.money - a.state.money);
  return <section className="comparison-board" aria-label="Comparaison des nations">
    <div className="comparison-overview"><section><h3><Globe2 size={18} />Prospérité des nations</h3><ol className="nation-ranking">{ranking.map((n, i) => <li key={n.id}><span className="rank-number">{String(i + 1).padStart(2, '0')}</span><strong>{n.name}{n.own && <small>Vous</small>}</strong><b>{n.state.score}<small> PP</small></b></li>)}</ol>{nations.length === 1 && <p className="solo-comparison">Partie solo · votre nation est la seule en jeu.</p>}</section>
    <section><div className="comparison-heading"><h3>Comparer les nations</h3><label className="sr-only" htmlFor="comparison-metric">Indicateur comparé</label><select id="comparison-metric" value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>{Object.entries(label).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div><div className="comparison-bars">{nations.map(n => <div key={n.id}><span>{n.name}</span><div className="comparison-bar"><i style={{ width: `${n.state[metric] / max * 100}%` }} /></div><b>{n.state[metric]} {unit[metric]}</b></div>)}</div></section></div>
    <h3 className="comparison-subtitle">Les équilibres de chaque nation</h3><div className="nation-comparisons">{nations.map(n => {
      const stats = totals(n.state);
      return <article key={n.id} className={n.own ? 'own-nation' : ''}><h4>{n.name}{n.own && <span>Votre nation</span>}</h4><dl>
        {SYMBOLS.map(s => <div key={s}><dt><SymbolIcon name={s} size={16} />{LABELS[s]}</dt><dd>{stats[s] > 0 ? '+' : ''}{stats[s]}</dd></div>)}
        <div><dt><Coins size={16} />Trésorerie</dt><dd>{n.state.money} €</dd></div><div><dt><Leaf size={16} />Pollution</dt><dd>{n.state.pollution}</dd></div>
        {(['energy', 'ecology'] as const).map(track => { const p = researchPosition(n.state.research[track]); return <div key={track}><dt><SymbolIcon name={track} size={16} />Recherche {LABELS[track].toLowerCase()}</dt><dd>Niv. {p.level} · {p.step}/{p.steps}</dd></div>; })}
      </dl></article>;
    })}</div>
  </section>;
}
