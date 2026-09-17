import { Biohazard, Globe2, Leaf } from 'lucide-react';
import { pollutionBonus, POLLUTION_LIMIT } from '../game/engine';

export default function PollutionTrack({ value, active, focused, onCleanup }: { value: number; active: boolean; focused: boolean; onCleanup: () => void }) {
  const critical = value >= POLLUTION_LIMIT;
  return <section className={`physical-pollution ${critical ? 'critical' : ''} ${focused ? 'board-focused' : ''}`} aria-label="Piste de pollution">
    <header><h3><Leaf size={16} />Pollution <strong data-testid="pollution-preview">{value}</strong></h3><span>{critical ? <><Biohazard size={15} />Prospérité bloquée</> : <><Globe2 size={13} />{pollutionBonus(value)} PP découverts</>}</span></header>
    <div className="pollution-track">{Array.from({ length: POLLUTION_LIMIT }, (_, i) => <button key={i} className={`pollution-space ${i < value ? 'covered' : ''} ${i === 15 ? 'danger-space' : ''}`} disabled={!active || value === 0} aria-label={`Dépolluer : retirer une pollution (case ${i + 1})`} onClick={onCleanup} title={i === 15 ? 'À partir de 16 pollutions : aucun gain de prospérité' : [0, 5, 10].includes(i) ? 'Un point de prospérité si ce symbole est découvert' : `Case ${i + 1}`}>
      <span className="pollution-engraving">{i === 15 ? <Biohazard size={17} /> : [0, 5, 10].includes(i) ? <><Globe2 size={14} /><small>1 PP</small></> : <small>{i + 1}</small>}</span><span className="pollution-disc" aria-hidden="true" />
    </button>)}</div>
    <p>{critical ? <><Biohazard size={13} />{value > 16 ? `${value - 16} jeton${value > 17 ? 's' : ''} au-delà de la piste. ` : ''}Redescendez sous 16 pour marquer des points.</> : focused ? 'Cliquez sur la piste pour retirer un disque · 1 action' : 'Les disques recouvrent les points de prospérité.'}</p>
  </section>;
}
