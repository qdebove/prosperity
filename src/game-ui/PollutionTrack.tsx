import { Biohazard, Globe2, Leaf } from 'lucide-react';
import { pollutionBonus, POLLUTION_LIMIT, POLLUTION_PP_SPACES } from '../game/engine';

export default function PollutionTrack({ value, active, onCleanup }: { value: number; active: boolean; onCleanup: () => void }) {
  const critical = value >= POLLUTION_LIMIT;
  const nearCritical = value === POLLUTION_LIMIT - 1;
  return <section className={`physical-pollution ${critical ? 'critical' : ''}`} aria-label="Piste de pollution">
    <header><h3><Leaf size={17} />Pollution <strong data-testid="pollution-preview">{value}</strong></h3><span title="Potentiel du prochain décompte de prospérité ; ces points ne sont pas encore crédités.">{critical ? <><Biohazard size={15} />Prospérité bloquée</> : <><Globe2 size={14} />{pollutionBonus(value)} PP découverts</>}</span></header>
    <div className="pollution-track">{Array.from({ length: POLLUTION_LIMIT }, (_, i) => {
      const pp = POLLUTION_PP_SPACES.some(s => s === i + 1);
      const covered = i < value;
      return <button key={i} className={`pollution-space ${covered ? 'covered' : ''} ${pp ? 'pp-space' : ''} ${i === POLLUTION_LIMIT - 1 ? 'danger-space' : ''}`} disabled={!active || !covered} aria-label={`Dépolluer : retirer une pollution (case ${i + 1})${pp ? ` · PP ${covered ? 'couvert' : 'découvert'}` : ''}`} onClick={onCleanup} title={i === POLLUTION_LIMIT - 1 ? 'À partir de 16 pollutions : aucun gain de prospérité' : pp ? '1 PP potentiel au décompte si découvert' : `Case ${i + 1}`}>
        <span className="pollution-engraving">{i === POLLUTION_LIMIT - 1 ? <Biohazard size={18} /> : pp ? <><Globe2 size={16} /><small>1 PP</small></> : <small>{i + 1}</small>}</span><span className="pollution-disc" aria-hidden="true" />{pp && covered && <span className="covered-pp" aria-hidden="true"><Globe2 size={10} /></span>}
      </button>;
    })}</div>
    {(critical || nearCritical) && <p className="pollution-warning"><Biohazard size={14} />{critical ? `${value > POLLUTION_LIMIT ? `${value - POLLUTION_LIMIT} jeton${value > POLLUTION_LIMIT + 1 ? 's' : ''} au-delà de la piste. ` : ''}Redescendez sous 16 pour marquer des points.` : 'Encore 1 pollution et vos gains de prospérité seront bloqués.'}</p>}
  </section>;
}
