import { Check, FlaskConical, Globe2, Zap } from 'lucide-react';
import { useState } from 'react';
import { CategoryLabel, SymbolIcon, TileArt, TileStats } from '../components';
import { LABELS } from '../game/catalog';
import { FINAL_STEPS, MAX_RESEARCH } from '../game/engine';
import { tallyCalculation } from '../game/presentation';
import type { GameState } from '../game/types';

export type Moves = Record<string, (...args: any[]) => void>;
export type Presentation = 'reveal' | 'tally' | null;
export interface TableContext { nation: string; ownNation: boolean; activePlayer: string; decisionPlayer?: string; remainingTallies: number; players: number }

export function turnStage(G: GameState, presentation: Presentation) {
  return G.phase === 'draw' || G.phase === 'committed' || presentation === 'reveal' ? 0
    : G.phase === 'energy' || G.phase === 'research' || presentation === 'tally' || G.finalStep >= 0 ? 1 : 2;
}

export default function TurnFlow({ G, moves, presentation, enabled, waitingMessage, context, compact, resolutionId }: {
  G: GameState; moves: Moves; presentation: Presentation; enabled: boolean; waitingMessage?: string;
  context?: TableContext; compact: boolean; resolutionId: string;
}) {
  const current = G.catalog.find(t => t.id === G.current);
  const drawing = G.phase === 'draw' || G.phase === 'committed';
  const resolving = G.phase === 'energy' || G.phase === 'research';
  const final = G.finalStep >= 0;
  const stage = turnStage(G, presentation);
  const events = G.log.filter(e => e.turn === G.turn && e.kind === (final ? 'final' : 'event') && !e.revealedTileId && !e.text.includes('Décompte :'));
  const symbol = resolving ? G.phase === 'energy' ? 'energy' : 'research' : final ? FINAL_STEPS[Math.max(0, G.finalStep - 1)] : current?.tally;
  return <section className={`turn-flow stage-${stage}`} aria-label="Déroulement du tour">
    <ol className="turn-sequence">{['Révélation', 'Décompte', 'Actions'].map((name, i) => <li key={name} aria-current={i === stage && G.phase !== 'finished' ? 'step' : undefined} className={i < stage ? 'done' : ''}><span>{i < stage ? <Check size={11} /> : i + 1}</span>{name}<small>{i < stage ? 'Fait' : i === stage ? 'En cours' : 'À venir'}</small></li>)}</ol>
    <div className="phase-heading"><span className="eyebrow">{context ? `TOUR DE ${context.activePlayer}` : 'À VOUS DE JOUER'}</span><h2>{G.phase === 'finished' ? 'Bilan de la nation' : final ? 'Décompte final' : stage === 0 ? 'Révélez une technologie' : stage === 1 ? resolving ? enabled ? 'Votre choix de décompte' : 'Décompte en cours' : 'Décompte résolu' : G.actions ? `Action ${3 - G.actions} sur 2` : 'Votre tour est prêt'}</h2></div>
    {!enabled && <p className="turn-waiting" role="status">{waitingMessage}</p>}
    {(!compact || resolving) && <>
      {G.phase === 'finished' ? <div className="table-result"><Globe2 size={26} /><h2>{G.score} points de prospérité</h2><dl>{G.finalScores.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl><p>{G.money} € en trésorerie</p></div>
      : drawing ? <div className="draw-scene"><div className="tile-deck" aria-hidden="true"><span className="tile-back"><Globe2 size={35} strokeWidth={1} /><b>PROSPERITY</b><small>La prochaine technologie</small></span></div><p>{G.deck.length} tuile{G.deck.length > 1 ? 's' : ''} à révéler</p></div>
      : <>
        {current && !final && stage < 2 && <div className={`revealed-technology ${presentation === 'reveal' ? 'revealing' : ''}`} key={current.id}><TileArt tile={current} /><div><span className="eyebrow">TECHNOLOGIE RÉVÉLÉE</span><strong>{current.name}</strong><CategoryLabel category={current.category} /><small>Niveau {current.level} · {LABELS[current.track]}</small></div></div>}
        {current && !final && stage < 2 && <div className="revealed-effects"><TileStats tile={current} /></div>}
        {(presentation === 'tally' || resolving || final) && <div className="tally-scene" aria-live="polite">
          {symbol && <><h3><SymbolIcon name={symbol} size={21} />Décompte {LABELS[symbol].toLowerCase()}</h3><p className="tally-basis">{context?.nation ?? 'Votre nation'} : {tallyCalculation(G, symbol)}</p></>}
          {context && <p className="tally-scope">Toutes les nations · {context.remainingTallies ? `${context.remainingTallies} résolution${context.remainingTallies > 1 ? 's' : ''} restante${context.remainingTallies > 1 ? 's' : ''}` : 'Décompte terminé'}{context.decisionPlayer && ` · Choix de ${context.decisionPlayer}`}</p>}
          <ul className="tally-results">{(context ? events : events.slice(-1)).map((e, i) => <li key={i}>{e.text}</li>)}</ul>
        </div>}
        {resolving && enabled && <Resolution key={`${G.turn}-${G.finalStep}-${G.phase}`} G={G} moves={moves} id={resolutionId} />}
        {stage === 2 && enabled && <p className="turn-guidance">{G.actions ? 'Choisissez une action ci-dessous. Vous pouvez répéter la même action.' : 'Vérifiez votre préparation, puis terminez le tour.'}</p>}
        {final && <ol className="final-tally-track">{FINAL_STEPS.map((s, i) => <li key={i} className={i < G.finalStep ? 'done' : ''}><SymbolIcon name={s} size={12} />{LABELS[s]}{i < G.finalStep && <Check size={12} />}</li>)}</ol>}
      </>}
    </>}
  </section>;
}

function Resolution({ G, moves, id }: { G: GameState; moves: Moves; id: string }) {
  const available = Math.min(G.pending, MAX_RESEARCH * 2 - G.research.energy - G.research.ecology);
  const minResearch = Math.max(0, available - (MAX_RESEARCH - G.research.ecology));
  const energy = G.phase === 'energy';
  const [value, setValue] = useState(energy ? Math.min(Math.floor(G.money / 100), G.pending) : minResearch);
  const max = energy ? Math.min(G.pending, Math.floor(G.money / 100)) : Math.min(available, MAX_RESEARCH - G.research.energy);
  return <form id={id} className="table-resolution" onSubmit={e => { e.preventDefault(); energy ? moves.resolveEnergy(value) : moves.resolveResearch(value); }}>
    <h3>{energy ? <Zap size={17} /> : <FlaskConical size={17} />}{energy ? `Déficit : ${G.pending} énergie` : `${G.pending} cases de recherche`}</h3>
    <p>{energy ? '100 € ou 1 pollution par unité' : 'Répartissez les cases entre les deux pistes.'}</p>
    <label>{energy ? 'Unités payées' : 'Cases en énergie'}<input type="range" aria-label={energy ? 'Unités payées' : 'Cases en énergie'} min={energy ? 0 : minResearch} max={max} step={1} value={value} onChange={e => setValue(Number(e.target.value))} /></label>
    <strong>{energy ? `${value * 100} € · +${G.pending - value} pollution` : `${value} énergie · ${available - value} écologie`}</strong>
  </form>;
}
