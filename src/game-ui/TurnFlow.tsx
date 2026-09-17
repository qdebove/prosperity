import { ArrowRight, Check, FlaskConical, Globe2, Zap } from 'lucide-react';
import { useState } from 'react';
import { SymbolIcon, TileArt } from '../components';
import { LABELS } from '../game/catalog';
import { FINAL_STEPS, MAX_RESEARCH } from '../game/engine';
import type { GameState } from '../game/types';

export type Moves = Record<string, (...args: any[]) => void>;
export type Presentation = 'reveal' | 'tally' | null;

export default function TurnFlow({ G, moves, presentation, onDraw, onContinue, onNew }: { G: GameState; moves: Moves; presentation: Presentation; onDraw: () => void; onContinue: () => void; onNew: () => void }) {
  const current = G.catalog.find(t => t.id === G.current);
  const drawing = G.phase === 'draw' || G.phase === 'committed';
  const resolving = G.phase === 'energy' || G.phase === 'research';
  const final = G.finalStep >= 0;
  const stage = drawing || presentation === 'reveal' ? 0 : resolving || presentation === 'tally' || final ? 1 : 2;
  const events = G.log.filter(entry => entry.turn === G.turn && entry.kind === (final ? 'final' : 'event'));
  const event = events.at(-1);
  const symbol = resolving ? G.phase === 'energy' ? 'energy' : 'research' : final ? FINAL_STEPS[Math.max(0, G.finalStep - 1)] : current?.tally;
  return <section className={`turn-flow stage-${stage}`} aria-label="Déroulement du tour">
    <ol className="turn-sequence">{['Révélation', 'Décompte', 'Actions'].map((name, i) => <li key={name} aria-current={i === stage ? 'step' : undefined} className={i < stage ? 'done' : ''}><span>{i < stage ? <Check size={11} /> : i + 1}</span>{name}</li>)}</ol>
    {G.phase === 'finished' ? <div className="table-result"><Globe2 size={30} /><span className="eyebrow">BILAN FINAL</span><h2>{G.score} points de prospérité</h2><dl>{G.finalScores.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl><p>{G.money} € en trésorerie</p><button className="primary" onClick={onNew}>Nouvelle partie<ArrowRight size={15} /></button></div>
    : drawing ? <div className="draw-scene"><span className="eyebrow">{G.phase === 'committed' ? 'TOUR VALIDÉ' : 'LA PREMIÈRE DÉCENNIE'}</span><button className="tile-deck" onClick={onDraw} aria-label={G.phase === 'draw' ? 'Révéler la première tuile' : G.deck.length ? 'Tour suivant' : 'Décompte final'}><span className="tile-back"><Globe2 size={35} strokeWidth={1} /><b>PROSPERITY</b><small>{G.deck.length ? 'Révéler la technologie' : 'Décompte final'}<ArrowRight size={13} /></small></span></button><p>{G.deck.length} tuile{G.deck.length > 1 ? 's' : ''} à révéler</p></div>
    : <>
      {current && !final && <div className={`revealed-technology ${presentation === 'reveal' ? 'revealing' : ''}`} key={current.id}><TileArt tile={current} /><div><span className="eyebrow">TECHNOLOGIE RÉVÉLÉE</span><strong>{current.name}</strong><small>Rejoint le niveau {current.level} · {LABELS[current.track]}</small></div></div>}
      {(presentation === 'tally' || resolving || final) && <div className="tally-scene" aria-live="polite">{symbol && <h3><SymbolIcon name={symbol} size={23} />Décompte {LABELS[symbol].toLowerCase()}</h3>}{!resolving && event && <p>{event.text}</p>}</div>}
      {resolving && <Resolution key={`${G.turn}-${G.finalStep}-${G.phase}`} G={G} moves={moves} />}
      {presentation === 'tally' && !resolving && !final && <button className="primary full-width" onClick={onContinue}>Jouer mes deux actions<ArrowRight size={15} /></button>}
      {!presentation && !resolving && !final && <p className="turn-guidance">{G.actions ? 'Deux gestes pour faire évoluer votre nation. Choisissez une action sur la table.' : 'Vos deux actions sont prêtes. Vous pouvez les annuler ou terminer le tour.'}</p>}
      {final && <ol className="final-tally-track">{FINAL_STEPS.map((s, i) => <li key={i} className={i < G.finalStep ? 'done' : ''}><SymbolIcon name={s} size={12} />{LABELS[s]}{i < G.finalStep && <Check size={12} />}</li>)}</ol>}
      {G.phase === 'final' && <button className="primary full-width" onClick={() => moves.nextFinal()}>Décompter : {LABELS[FINAL_STEPS[G.finalStep]]}<ArrowRight size={15} /></button>}
    </>}
  </section>;
}

function Resolution({ G, moves }: { G: GameState; moves: Moves }) {
  const available = Math.min(G.pending, MAX_RESEARCH * 2 - G.research.energy - G.research.ecology);
  const minResearch = Math.max(0, available - (MAX_RESEARCH - G.research.ecology));
  const energy = G.phase === 'energy';
  const [value, setValue] = useState(energy ? Math.min(Math.floor(G.money / 100), G.pending) : minResearch);
  const max = energy ? Math.min(G.pending, Math.floor(G.money / 100)) : Math.min(available, MAX_RESEARCH - G.research.energy);
  return <div className="table-resolution">
    <h3>{energy ? <Zap size={17} /> : <FlaskConical size={17} />}{energy ? `Déficit : ${G.pending} énergie` : `${G.pending} cases de recherche`}</h3>
    <p>{energy ? '100 € ou 1 pollution par unité' : 'Répartissez les cases entre les deux pistes.'}</p>
    <label>{energy ? 'Unités payées' : 'Cases en énergie'}<input type="range" aria-label={energy ? 'Unités payées' : 'Cases en énergie'} min={energy ? 0 : minResearch} max={max} step={1} value={value} onChange={e => setValue(Number(e.target.value))} /></label>
    <strong>{energy ? `${value * 100} € · +${G.pending - value} pollution` : `${value} énergie · ${available - value} écologie`}</strong>
    <button className="primary full-width" onClick={() => energy ? moves.resolveEnergy(value) : moves.resolveResearch(value)}>Valider<Check size={15} /></button>
  </div>;
}
