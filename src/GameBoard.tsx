import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CircleHelp, Coins, FlaskConical, Globe2, History, Leaf, RotateCcw, ShoppingBag, Undo2, Volume2, VolumeX } from 'lucide-react';
import { Modal, TileArt } from './components';
import { FINAL_STEPS, legalSlots, MAX_RESEARCH, previewState, priceOf } from './game/engine';
import { LABELS } from './game/catalog';
import { actionFeedback, marketAvailability } from './game/presentation';
import type { GameState, Tile, Track } from './game/types';
import ResearchBoard, { type ResearchMarker } from './game-ui/ResearchBoard';
import PlayerTerritory from './game-ui/PlayerTerritory';
import PollutionTrack from './game-ui/PollutionTrack';
import TechnologyDetails from './game-ui/TechnologyDetails';
import TurnFlow, { turnStage, type Moves, type Presentation, type TableContext } from './game-ui/TurnFlow';
import DecadeTracker from './game-ui/DecadeTracker';
import useLearning from './game-ui/useLearning';
import { playGameSound, soundAvailable } from './game-ui/sound';

type ActionMode = 'research' | 'cleanup' | 'buy' | null;
interface Flight { tile: Tile; from: DOMRect; to: DOMRect }

export default function GameBoard({ committed, moves, onNew, enabled = true, waitingMessage, markers, context }: { committed: GameState; moves: Moves; onNew: () => void; enabled?: boolean; waitingMessage?: string; markers?: ResearchMarker[]; context?: TableContext }) {
  const G = useMemo(() => previewState(committed), [committed]);
  const availability = useMemo(() => marketAvailability(G), [G]);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string>();
  const [chosenSlot, setChosenSlot] = useState<string>();
  const [mode, setMode] = useState<ActionMode>(null);
  const [journal, setJournal] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [muted, setMuted] = useState(true);
  const [acknowledgedTurn, setAcknowledgedTurn] = useState(committed.plannedActions.length || committed.lastMove === 'action' ? committed.turn : -1);
  const [revealing, setRevealing] = useState(false);
  const learning = useLearning();
  const resolutionId = useId();
  const finishFlight = useCallback(() => setFlight(null), []);
  const current = G.catalog.find(t => t.id === G.current);
  const planning = G.phase === 'actions';
  const resolving = G.phase === 'energy' || G.phase === 'research';
  const drawing = G.phase === 'draw' || G.phase === 'committed';
  const presentation: Presentation = !drawing && G.finalStep < 0 && (resolving || planning && acknowledgedTurn !== G.turn && !committed.plannedActions.length) ? revealing ? 'reveal' : 'tally' : null;
  const active = enabled && planning && G.actions > 0 && !presentation;
  const purchasing = !!selected && G.market.includes(selected.id);
  const tile = purchasing ? selected! : undefined;
  const targets = tile && active && priceOf(G, tile) <= G.money ? legalSlots(G, tile) : [];
  const planned = committed.plannedActions;
  const tally = presentation === 'tally' || resolving;
  const stage = turnStage(G, presentation);
  const helpId = `turn-${stage}`;
  const showHelp = G.turn <= 1 && G.finalStep < 0 && learning.unseen(helpId) && !selected;
  const lastBefore = planned.length ? previewState({ ...committed, plannedActions: planned.slice(0, -1) }) : null;
  const feedback = lastBefore ? actionFeedback(lastBefore, G) : [];

  useEffect(() => {
    if (!committed.current || committed.lastMove !== 'draw' || committed.plannedActions.length) return;
    setRevealing(true);
    const timeout = window.setTimeout(() => setRevealing(false), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420);
    return () => window.clearTimeout(timeout);
  }, [committed.current]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setMode(null); setHoveredSlot(undefined); setChosenSlot(undefined); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    if (selected && matchMedia('(max-width: 900px)').matches) {
      document.querySelector('.technology-details')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [selected?.id, chosenSlot]);

  const clear = () => { setSelected(null); setHoveredSlot(undefined); setChosenSlot(undefined); setMode(null); };
  const chooseMode = (next: ActionMode) => { clear(); setMode(next === mode ? null : next); };
  const research = (track: Track) => { clear(); moves.research(track); playGameSound('pawn', muted); };
  const cleanup = () => { clear(); moves.cleanup(); playGameSound('disc', muted); };
  const buy = () => {
    if (!tile || !active || tile.category !== 'special' && (!chosenSlot || !targets.includes(chosenSlot))) return;
    const source = document.querySelector(`[data-tile-id="${tile.id}"]`);
    const destination = chosenSlot ? document.querySelector(`[data-testid="slot-${chosenSlot}"]`) : null;
    if (source && destination && !matchMedia('(prefers-reduced-motion: reduce)').matches) setFlight({ tile, from: source.getBoundingClientRect(), to: destination.getBoundingClientRect() });
    moves.buy(tile.id, chosenSlot); playGameSound('tile', muted); clear();
  };
  const draw = () => { clear(); learning.dismiss('turn-0'); moves.draw(); playGameSound('tile', muted); };
  const focus = tally ? `tally-${G.phase === 'energy' ? 'energy' : G.phase === 'research' ? 'research' : current?.tally}` : mode ?? 'idle';
  const canInspect = !(resolving && enabled);
  const selectedVisible = selected && canInspect;
  const continueActions = () => { clear(); learning.dismiss('turn-1'); setAcknowledgedTurn(G.turn); };
  const progress = G.phase === 'finished' ? { label: context ? 'Retour aux parties' : 'Nouvelle partie', run: onNew }
    : !enabled ? null
    : resolving ? { label: 'Valider', form: resolutionId }
    : drawing ? { label: G.turn === 0 ? 'Révéler la première tuile' : G.deck.length ? 'Tour suivant' : 'Décompte final', run: draw }
    : G.phase === 'final' ? { label: `Décompter : ${LABELS[FINAL_STEPS[G.finalStep]]}`, run: () => moves.nextFinal() }
    : presentation === 'tally' ? { label: 'Continuer vers mes actions', run: continueActions }
    : planning && G.actions === 0 ? { label: 'Terminer le tour', aria: 'Valider le tour', run: () => { clear(); moves.commit(); } } : null;

  return <div className={`play-table phase-${stage} focus-${focus} ${presentation === 'reveal' ? 'is-revealing' : ''}`}>
    <header className="table-status">
      <h1 className="sr-only">Prosperity · {context?.nation ?? 'Votre nation'}</h1>
      <div className="table-brand"><span>PROSPERITY</span><small className="play-edition">{G.custom ? 'Partie personnalisée' : context ? `${context.players} nations · un avenir commun` : 'Une nation, sept décennies'}</small></div>
      <DecadeTracker G={committed} />
      <div className="table-resource"><Coins size={22} /><div><ResourceValue value={G.money} unit="€" testId="money-preview" /><small>Trésorerie</small></div></div>
      <div className="table-resource score-resource"><Globe2 size={23} /><div><ResourceValue value={G.score} unit="PP" /><small>Prospérité</small></div></div>
      <button className="icon-button" onClick={() => setJournal(true)} title="Journal de la nation" aria-label="Journal de la nation"><History size={20} /></button>
      <button className="icon-button learning-toggle" aria-label={learning.enabled ? 'Désactiver les aides' : 'Activer les aides'} aria-pressed={learning.enabled} title={learning.enabled ? 'Désactiver les aides' : 'Activer les aides'} onClick={learning.toggle}><CircleHelp size={18} /></button>
      <button className="icon-button sound-toggle" disabled={!soundAvailable} aria-label={muted ? 'Activer le son' : 'Couper le son'} aria-pressed={!muted} title={soundAvailable ? muted ? 'Activer le son' : 'Couper le son' : 'Son coupé · aucun fichier audio installé'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
    </header>

    <div className="table-surface">
      <div className="nation-space"><PlayerTerritory G={G} committed={committed} nationName={context?.nation} tile={tile?.category !== 'special' ? tile : undefined} targets={targets} chosenSlot={chosenSlot} highlighted={tally ? current?.tally : undefined} onPlace={slot => { setChosenSlot(slot); setHoveredSlot(undefined); }} onInspect={t => { setSelected(t); setMode(null); setChosenSlot(undefined); }} onHover={setHoveredSlot} />
        <PollutionTrack value={G.pollution} active={active} focused={mode === 'cleanup' || tally && current?.tally === 'ecology'} onCleanup={cleanup} />
      </div>
      <ResearchBoard G={G} markers={markers} availability={availability} showAvailability={active} selected={tile?.id} active={active} focused={mode === 'research' || mode === 'buy'} onResearch={research} onSelect={t => { setSelected(selected?.id === t.id ? null : t); setHoveredSlot(undefined); setChosenSlot(undefined); setMode(selected?.id === t.id ? null : 'buy'); }} />
      <aside className="table-context" aria-label="Tour et sélection">
        <TurnFlow G={G} moves={moves} enabled={enabled} waitingMessage={waitingMessage} context={context} presentation={presentation} compact={!!selectedVisible || stage === 2} resolutionId={resolutionId} />
        {selectedVisible ? <TechnologyDetails G={G} tile={selected} purchasing={purchasing} slot={chosenSlot ?? hoveredSlot} confirmedSlot={chosenSlot} active={active} availability={availability[selected.id]} showPriceHelp={learning.unseen('price')} onDismissPrice={() => learning.dismiss('price')} onBuy={buy} onClose={clear} onChooseSlot={id => { setChosenSlot(id); setHoveredSlot(undefined); }} />
          : !resolving && stage === 2 && <div className="context-instruction"><h3>{mode === 'research' ? 'Choisissez une piste' : mode === 'buy' ? 'Choisissez une technologie' : G.actions ? 'Deux actions à votre rythme' : 'Prêt à valider'}</h3><p>{mode === 'research' ? 'Avancez d’une case en Énergie ou en Écologie, au sommet du marché.' : mode === 'buy' ? 'Cliquez sur une technologie pour voir son prix, ses effets et ses emplacements.' : G.actions ? 'Revenu, dépollution, recherche ou achat. La même action peut être jouée deux fois.' : 'Vos changements restent annulables jusqu’à la validation du tour.'}</p>{context && <p className="private-plan">{context.ownNation ? 'Votre préparation reste privée jusqu’à « Terminer le tour ».' : `Vous consultez l’état officiel de ${context.nation}.`}</p>}</div>}
        {showHelp && <div className="learning-note"><span>PRISE EN MAIN · {stage + 1}/3</span><p>{stage === 0 ? 'Au début du tour, révélez une technologie. Elle rejoint le marché commun.' : stage === 1 ? context ? 'Le symbole de la tuile déclenche un décompte pour toutes les nations, en commençant par le joueur actif.' : 'Le symbole de la tuile déclenche le décompte correspondant pour votre nation.' : 'Vous avez deux actions. Vous pouvez faire deux fois la même, puis valider ensemble vos choix.'}</p><button className="text-button" onClick={() => learning.dismiss(helpId)}>Compris</button></div>}
      </aside>
    </div>

    <section className={`turn-dock ${active ? 'actions-active' : ''}`} aria-label="Préparation du tour">
      <div className="action-state" aria-live="polite">{planning && !presentation && <div className="action-tokens" aria-label={`${G.actions} actions restantes`}>{[0, 1].map(i => <span key={i} aria-label={`Action ${i + 1} : ${i < planned.length ? 'préparée' : 'disponible'}`} className={i < planned.length ? 'spent' : 'available'}>{i < planned.length ? <Check size={12} /> : i + 1}</span>)}</div>}<strong>{planning && !presentation ? `${G.actions} action${G.actions > 1 ? 's' : ''} restante${G.actions > 1 ? 's' : ''}` : G.phase === 'finished' ? 'Partie terminée' : resolving ? 'Un choix est nécessaire' : tally ? 'Décompte résolu' : 'Révélation'}</strong><small>{planned.length ? 'Préparation annulable' : context && !enabled ? `Tour de ${context.activePlayer}` : 'Deux actions par tour'}</small></div>
      <div className="dock-center">{active ? <div className="table-actions" aria-label="Actions disponibles">
        <button aria-label="Revenus : recevoir 100 euros" onClick={() => { clear(); moves.income(); playGameSound('coin', muted); }}><Coins size={19} /><span>Revenu<small>+100 €</small></span></button>
        <button disabled={G.pollution === 0} onClick={cleanup}><Leaf size={19} /><span>Dépolluer<small>−1 disque</small></span></button>
        <button disabled={G.research.energy === MAX_RESEARCH && G.research.ecology === MAX_RESEARCH} aria-pressed={mode === 'research'} onClick={() => chooseMode('research')}><FlaskConical size={19} /><span>Recherche<small>+1 case</small></span></button>
        <button aria-pressed={mode === 'buy'} onClick={() => chooseMode('buy')}><ShoppingBag size={19} /><span>Acheter<small>Une technologie</small></span></button>
      </div> : <p className="dock-guidance">{!enabled ? waitingMessage : resolving ? 'Choisissez la répartition dans le panneau de droite.' : tally ? 'Consultez le résultat, puis préparez vos deux actions.' : drawing ? 'Une technologie, un décompte, puis deux actions.' : planned.length ? 'Les deux actions seront validées ensemble.' : G.phase === 'final' ? 'Chaque décompte s’applique à toutes les nations en jeu.' : 'Votre nation a terminé son parcours.'}</p>}
      {feedback.length > 0 && <p className="action-feedback" role="status">Action {planned.length} préparée · {feedback.join(' · ')}</p>}</div>
      <div className="turn-validation">{planned.length > 0 && <div className="plan-rollback"><button className="icon-button" aria-label="Annuler la dernière action" title="Annuler la dernière action" disabled={!enabled} onClick={() => { clear(); moves.undoPlan(); }}><Undo2 size={18} /></button><button className="icon-button" aria-label="Annuler les deux actions" title="Annuler les deux actions" disabled={!enabled} onClick={() => { clear(); moves.resetPlan(); }}><RotateCcw size={17} /></button></div>}{progress ? <button className="primary progress-button" aria-label={progress.aria} type={progress.form ? 'submit' : 'button'} form={progress.form} onClick={progress.run}>{progress.label}<ArrowRight size={16} /></button> : enabled && planning && !presentation ? <strong className="next-action">Action {3 - G.actions} sur 2</strong> : null}</div>
    </section>
    {flight && <FlyingTile key={`${flight.tile.id}-${G.actions}`} flight={flight} onEnd={finishFlight} />}
    {journal && <Modal title="Journal de la nation" wide onClose={() => setJournal(false)}><ol className="full-journal">{committed.log.slice().reverse().map((entry, i) => <li className={entry.kind} key={i}><span>Tour {entry.turn}</span><p>{entry.text}</p></li>)}</ol></Modal>}
  </div>;
}

function ResourceValue({ value, unit, testId }: { value: number; unit: string; testId?: string }) {
  const previous = useRef(value);
  const [change, setChange] = useState<{ delta: number; from: number } | null>(null);
  useEffect(() => {
    if (previous.current === value) return;
    setChange({ delta: value - previous.current, from: previous.current }); previous.current = value;
    const timeout = window.setTimeout(() => setChange(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [value]);
  return <span className="resource-number"><strong key={`value-${value}`} data-testid={testId}>{value} {unit}</strong>{change && <span className="resource-change" key={`change-${value}`} aria-live="polite" title={`${change.from} ${unit} → ${value} ${unit}`}>{change.delta > 0 ? '+' : ''}{change.delta} {unit}</span>}</span>;
}

function FlyingTile({ flight, onEnd }: { flight: Flight; onEnd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { from, to } = flight;
  useEffect(() => {
    const animation = ref.current?.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`, opacity: .7 },
    ], { duration: 400, easing: 'ease-in-out', fill: 'forwards' });
    if (animation) animation.onfinish = onEnd;
    return () => animation?.cancel();
  }, [from, to, onEnd]);
  return <div ref={ref} className="flying-tile" style={{ top: from.top, left: from.left, width: from.width, height: from.width }} aria-hidden="true"><TileArt tile={flight.tile} /></div>;
}
