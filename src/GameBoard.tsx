import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BarChart3, Check, CircleHelp, Coins, FlaskConical, Globe2, History, Landmark, Leaf, LockKeyhole, RotateCcw, ShoppingBag, Undo2, X } from 'lucide-react';
import { CategoryLabel, Modal, TileArt, TileStats } from './components';
import { FINAL_STEPS, legalSlots, MAX_RESEARCH, previewState, unlocked } from './game/engine';
import { CATEGORIES, LABELS, SLOTS } from './game/catalog';
import { actionFeedback, marketAvailability, purchasePreview } from './game/presentation';
import type { GameState, Tile, Track } from './game/types';
import ResearchBoard, { researchPosition, type ResearchMarker } from './game-ui/ResearchBoard';
import PlayerTerritory from './game-ui/PlayerTerritory';
import PollutionTrack from './game-ui/PollutionTrack';
import TechnologyDetails from './game-ui/TechnologyDetails';
import ComparisonBoard, { type ComparisonNation } from './game-ui/ComparisonBoard';
import TurnFlow, { turnStage, type Moves, type Presentation, type TableContext } from './game-ui/TurnFlow';
import DecadeTracker from './game-ui/DecadeTracker';

type View = 'nation' | 'research' | 'comparison';
const views = [{ id: 'nation', label: 'Ma nation', icon: Landmark }, { id: 'research', label: 'Recherche', icon: FlaskConical }, { id: 'comparison', label: 'Comparaison', icon: BarChart3 }] as const;

export default function GameBoard({ committed, moves, onNew, enabled = true, waitingMessage, markers, context, nations }: {
  committed: GameState; moves: Moves; onNew: () => void; enabled?: boolean; waitingMessage?: string; markers?: ResearchMarker[]; context?: TableContext; nations?: ComparisonNation[];
}) {
  const G = useMemo(() => previewState(committed), [committed]);
  const availability = useMemo(() => marketAvailability(G), [G]);
  const [view, setView] = useState<View>('nation');
  const [selected, setSelected] = useState<Tile | null>(null);
  const [slotInfo, setSlotInfo] = useState<string>();
  const [chosenSlot, setChosenSlot] = useState<string>();
  const [targetSlot, setTargetSlot] = useState<string>();
  const [marker, setMarker] = useState<ResearchMarker>();
  const [journal, setJournal] = useState(false);
  const [help, setHelp] = useState(false);
  const [turnOpen, setTurnOpen] = useState(false);
  const [error, setError] = useState('');
  const [acknowledgedTurn, setAcknowledgedTurn] = useState(committed.plannedActions.length || committed.lastMove === 'action' ? committed.turn : -1);
  const scrollPositions = useRef<Record<View, number>>({ nation: 0, research: 0, comparison: 0 });
  const purchaseLock = useRef(false);
  const resolutionId = useId();
  const current = G.catalog.find(t => t.id === G.current);
  const planning = G.phase === 'actions';
  const resolving = G.phase === 'energy' || G.phase === 'research';
  const drawing = G.phase === 'draw' || G.phase === 'committed';
  const presentation: Presentation = !drawing && G.finalStep < 0 && (resolving || planning && acknowledgedTurn !== G.turn && !committed.plannedActions.length) ? 'tally' : null;
  const active = enabled && planning && G.actions > 0 && !presentation;
  const planned = committed.plannedActions;
  const stage = turnStage(G, presentation);
  const lastBefore = planned.length ? previewState({ ...committed, plannedActions: planned.slice(0, -1) }) : null;
  const feedback = lastBefore ? actionFeedback(lastBefore, G) : [];
  const inspectedSlot = SLOTS.find(s => s.id === slotInfo);
  const installed = inspectedSlot ? G.board[inspectedSlot.id] : null;
  const locked = inspectedSlot ? !unlocked(G, inspectedSlot.id) : false;
  const markerPosition = marker ? researchPosition(marker.position) : null;

  useEffect(() => { purchaseLock.current = false; }, [committed]);
  useEffect(() => { if (resolving && enabled) setTurnOpen(true); }, [resolving, G.turn, G.finalStep, enabled]);
  useLayoutEffect(() => { window.scrollTo({ top: scrollPositions.current[view], behavior: 'instant' }); }, [view]);
  const closeSelection = () => { setSelected(null); setChosenSlot(undefined); setError(''); };
  const navigate = (next: View) => {
    if (next === view) return;
    scrollPositions.current[view] = window.scrollY;
    closeSelection(); setSlotInfo(undefined); setMarker(undefined); setView(next);
  };
  const findForSlot = (id: string) => { setTargetSlot(id); setSlotInfo(undefined); navigate('research'); };
  const research = (track: Track) => {
    if (!active || G.research[track] >= MAX_RESEARCH) return;
    setMarker(undefined); moves.research(track);
  };
  const cleanup = () => { if (active && G.pollution > 0) moves.cleanup(); };
  const selectTile = (tile: Tile) => {
    purchaseLock.current = false; setError(''); setSelected(tile);
    setChosenSlot(targetSlot && legalSlots(G, tile).includes(targetSlot) ? targetSlot : undefined);
  };
  const buy = () => {
    if (purchaseLock.current || !selected || !active) return;
    if (targetSlot && !legalSlots(G, selected).includes(targetSlot)) return;
    if (selected.category !== 'special' && !chosenSlot) return;
    if (!purchasePreview(G, selected, chosenSlot)) { setError('Cet achat n’est plus disponible. Vérifiez la trésorerie et l’emplacement.'); return; }
    purchaseLock.current = true;
    try { moves.buy(selected.id, chosenSlot); closeSelection(); navigate('nation'); }
    catch { purchaseLock.current = false; setError('L’achat a été refusé. La partie est conservée ; vous pouvez réessayer.'); }
  };
  const continueActions = () => { setAcknowledgedTurn(G.turn); setTurnOpen(false); };
  const draw = () => { closeSelection(); moves.draw(); setTurnOpen(true); };
  const progress = G.phase === 'finished' ? { label: context ? 'Retour aux parties' : 'Nouvelle partie', run: onNew }
    : !enabled ? null
    : resolving ? { label: 'Résoudre le décompte', run: () => setTurnOpen(true) }
    : drawing ? { label: G.turn === 0 ? 'Révéler la première tuile' : G.deck.length ? 'Tour suivant' : 'Décompte final', run: draw }
    : G.phase === 'final' ? { label: `Décompter : ${LABELS[FINAL_STEPS[G.finalStep]]}`, run: () => { moves.nextFinal(); setTurnOpen(false); } }
    : presentation === 'tally' ? { label: 'Continuer vers mes actions', run: continueActions }
    : planning && G.actions === 0 ? { label: 'Terminer le tour', aria: 'Valider le tour', run: () => moves.commit() } : null;
  const comparison = nations ?? [{ id: G.id, name: context?.nation ?? 'Ma nation', own: context?.ownNation ?? true, state: G }];

  return <div className={`play-table phase-${stage} view-${view}`}>
    <header className="table-header">
      <div className="table-brand"><span>PROSPERITY</span><small className="play-edition">{G.custom ? 'Partie personnalisée' : context ? `${context.players} nations · un avenir commun` : 'Une nation, sept décennies'}</small></div>
      <nav className="game-views" aria-label="Vues de la partie">{views.map(({ id, label, icon: Icon }) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={17} /><span>{label}</span></button>)}</nav>
      <div className="header-tools"><button className="icon-button" onClick={() => setJournal(true)} title="Journal de la nation" aria-label="Journal de la nation"><History size={19} /></button><button className="icon-button" onClick={() => setHelp(true)} title="Aide de jeu" aria-label="Aide de jeu"><CircleHelp size={19} /></button></div>
    </header>
    <div className="table-status">
      <button className="decade-button" onClick={() => setTurnOpen(true)} aria-label="Consulter les décomptes"><DecadeTracker G={committed} /></button>
      {current && <button className="latest-tile" onClick={() => selectTile(current)} aria-label={`Dernière tuile : ${current.name}`}><TileArt tile={current} /><span><small>DERNIÈRE TUILE</small>{current.name}</span></button>}
      <div className="table-resource"><Coins size={21} /><div><strong data-testid="money-preview">{G.money} €</strong><small>Trésorerie</small></div></div>
      <div className="table-resource"><Globe2 size={21} /><div><strong>{G.score} PP</strong><small>Prospérité</small></div></div>
    </div>
    <div className="table-surface">
      <div className="view-heading"><div><span className="eyebrow">{view === 'nation' ? 'VOTRE TERRITOIRE' : view === 'research' ? 'LES TECHNOLOGIES' : 'UN AVENIR COMMUN'}</span><h1>{view === 'nation' ? context?.nation ?? 'Ma nation' : view === 'research' ? 'Recherche' : 'Les nations'}</h1></div>
        {view === 'research' && targetSlot && <div className="research-context"><span>Pour <strong>{targetSlot.toUpperCase()}</strong> · {CATEGORIES[SLOTS.find(s => s.id === targetSlot)!.category]}</span><button className="icon-button" aria-label="Effacer le contexte de recherche" onClick={() => { setTargetSlot(undefined); setChosenSlot(undefined); }}><X size={16} /></button></div>}
        {view === 'nation' && <span className="board-edition">PLATEAU ARGENT</span>}
      </div>
      {G.phase === 'finished' && <div className="finished-result"><Globe2 size={27} /><h2>{G.score} points de prospérité</h2><button className="text-button" onClick={() => setTurnOpen(true)}>Voir les décomptes</button></div>}
      {view === 'nation' ? <div className="nation-space"><PlayerTerritory G={G} committed={committed} highlighted={presentation ? current?.tally : undefined} onInspect={setSlotInfo} /><PollutionTrack value={G.pollution} active={active} onCleanup={cleanup} /></div>
        : view === 'research' ? <ResearchBoard G={G} markers={markers} availability={availability} selected={selected?.id} active={active} targetSlot={targetSlot} onResearch={research} onSelect={selectTile} onMarker={setMarker} />
        : <ComparisonBoard nations={comparison} />}
    </div>
    <section className="turn-dock" aria-label="Préparation du tour">
      <div className="action-state" aria-live="polite"><div className="action-tokens" aria-label={`${G.actions} actions restantes`}>{[0, 1].map(i => <span key={i} className={planning && !presentation && i >= planned.length && i < planned.length + G.actions ? 'available' : 'spent'}>{i < planned.length ? <Check size={13} /> : i + 1}</span>)}</div><div><strong>{planning && !presentation ? `${G.actions} action${G.actions > 1 ? 's' : ''} restante${G.actions > 1 ? 's' : ''}` : G.phase === 'finished' ? 'Partie terminée' : resolving ? 'Décompte en cours' : presentation ? 'Décompte résolu' : 'Révélation'}</strong><small>{context && !enabled ? `Tour de ${context.activePlayer}` : planned.length ? 'Préparation annulable' : `Tour ${G.turn || 1} / ${G.totalTurns}`}</small></div></div>
      <div className="dock-center">{active ? <div className="table-actions" aria-label="Actions disponibles">
        <button aria-label="Revenus : recevoir 100 euros" onClick={() => moves.income()}><Coins size={18} /><span>Revenu<small>+100 €</small></span></button>
        <button disabled={G.pollution === 0} onClick={cleanup}><Leaf size={18} /><span>Dépolluer<small>−1 disque</small></span></button>
        <button disabled={G.research.energy === MAX_RESEARCH && G.research.ecology === MAX_RESEARCH} onClick={() => navigate('research')}><FlaskConical size={18} /><span>Recherche<small>+1 case</small></span></button>
        <button onClick={() => navigate('research')}><ShoppingBag size={18} /><span>Acheter<small>Une technologie</small></span></button>
      </div> : <p className="dock-guidance">{!enabled ? waitingMessage : resolving ? 'Un choix de décompte est nécessaire.' : presentation ? current ? `Décompte ${LABELS[current.tally].toLowerCase()} effectué` : 'Décompte effectué' : drawing ? `${G.deck.length} technologies à révéler` : planned.length ? 'Vos deux actions sont prêtes.' : G.phase === 'final' ? 'Décomptes de fin de partie' : 'Votre nation a terminé son parcours.'}</p>}
      {feedback.length > 0 && <p className="action-feedback" role="status">{feedback.join(' · ')}</p>}</div>
      <div className="turn-validation">{planned.length > 0 && <div className="plan-rollback"><button className="icon-button" aria-label="Annuler la dernière action" title="Annuler la dernière action" disabled={!enabled} onClick={() => moves.undoPlan()}><Undo2 size={18} /></button><button className="icon-button" aria-label="Annuler les deux actions" title="Annuler les deux actions" disabled={!enabled} onClick={() => moves.resetPlan()}><RotateCcw size={17} /></button></div>}{progress && !turnOpen && <button className="primary progress-button" aria-label={progress.aria} onClick={progress.run}>{progress.label}<ArrowRight size={16} /></button>}</div>
    </section>
    {selected && <Modal title={selected.name} onClose={closeSelection}><TechnologyDetails G={G} tile={selected} slot={chosenSlot} active={active} targetSlot={targetSlot} onBuy={buy} onChooseSlot={setChosenSlot} />{error && <p role="alert">{error}</p>}</Modal>}
    {inspectedSlot && <Modal title={`${inspectedSlot.id.toUpperCase()} · ${installed?.name ?? CATEGORIES[inspectedSlot.category]}`} onClose={() => setSlotInfo(undefined)}>
      <div className="slot-detail" role="region" aria-label="Détails de la case">{installed ? <><TileArt tile={installed} /><TileStats tile={installed} /></> : <CategoryLabel category={inspectedSlot.category} />}
        {locked ? <><p><LockKeyhole size={17} />Transport requis en {inspectedSlot.requires?.toUpperCase()}</p><button className="primary full-width" onClick={() => findForSlot(inspectedSlot.requires!)}>Trouver un transport en {inspectedSlot.requires?.toUpperCase()}<ArrowRight size={16} /></button></>
        : <>{installed?.id === 'start-greenbelt' && <p>La ceinture verte ne débloque pas D1 et D2. Un transport en C1 ouvre ces accès.</p>}<button className="primary full-width" onClick={() => findForSlot(inspectedSlot.id)}>{installed ? 'Rechercher un remplacement' : 'Rechercher une tuile compatible'}<ArrowRight size={16} /></button></>}
      </div>
    </Modal>}
    {marker && markerPosition && <Modal title={`${LABELS[marker.track]} · ${marker.label}`} onClose={() => setMarker(undefined)}><p className="marker-position">Niveau {markerPosition.level} · case {markerPosition.step}/{markerPosition.steps}</p><button className="primary full-width" disabled={!active || marker.own === false || marker.position !== G.research[marker.track] || marker.position === MAX_RESEARCH} onClick={() => research(marker.track)}>{marker.position === MAX_RESEARCH ? 'Fin de piste atteinte' : 'Avancer d’une case · 1 action'}</button></Modal>}
    {turnOpen && <Modal title="Les décomptes du tour" onClose={() => setTurnOpen(false)}><TurnFlow G={G} moves={moves} enabled={enabled} waitingMessage={waitingMessage} context={context} presentation={presentation} compact={false} resolutionId={resolutionId} />{resolving && enabled ? <button className="primary full-width" type="submit" form={resolutionId}>Valider</button> : progress && <button className="primary full-width" onClick={() => { progress.run(); if (!drawing) setTurnOpen(false); }}>{progress.label}</button>}</Modal>}
    {journal && <Modal title="Journal de la nation" wide onClose={() => setJournal(false)}><ol className="full-journal">{G.log.slice().reverse().map((entry, i) => <li className={entry.kind} key={i}><span>Tour {entry.turn}</span><p>{entry.text}</p></li>)}</ol></Modal>}
    {help && <Modal title="À vous de jouer" onClose={() => setHelp(false)}><div className="game-help"><p>Révélez une technologie, résolvez son décompte, puis préparez deux actions. La même action peut être choisie deux fois.</p><p>Cliquez sur une case de votre nation pour construire ou remplacer une tuile. Dans Recherche, les en-têtes font avancer d’une case et les jetons indiquent votre position exacte.</p><p>Un disque de pollution retire la dernière pollution occupée. Les PP découverts sont un potentiel pour le prochain décompte, pas des points déjà gagnés.</p><p>Vos actions restent annulables jusqu’à « Terminer le tour ».</p></div></Modal>}
  </div>;
}
