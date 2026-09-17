import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Coins, FlaskConical, Globe2, History, Leaf, RotateCcw, ShoppingBag, Undo2, Volume2, VolumeX } from 'lucide-react';
import { Modal, TileArt } from './components';
import { legalSlots, previewState, priceOf } from './game/engine';
import type { GameState, Tile, Track } from './game/types';
import ResearchBoard from './game-ui/ResearchBoard';
import PlayerTerritory from './game-ui/PlayerTerritory';
import PollutionTrack from './game-ui/PollutionTrack';
import TechnologyDetails from './game-ui/TechnologyDetails';
import TurnFlow, { type Moves, type Presentation } from './game-ui/TurnFlow';
import { playGameSound, soundAvailable } from './game-ui/sound';

type ActionMode = 'research' | 'cleanup' | 'buy' | null;
interface Flight { tile: Tile; from: DOMRect; to: DOMRect }

export default function GameBoard({ committed, moves, onNew }: { committed: GameState; moves: Moves; onNew: () => void }) {
  const G = useMemo(() => previewState(committed), [committed]);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string>();
  const [mode, setMode] = useState<ActionMode>(null);
  const [journal, setJournal] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [muted, setMuted] = useState(true);
  const finishFlight = useCallback(() => setFlight(null), []);
  // Present a tally already performed by the engine without replaying it.
  const [presentation, setPresentation] = useState<Presentation>(() => committed.phase === 'actions' && !committed.plannedActions.length && committed.lastMove !== 'action' ? 'tally' : null);
  const current = G.catalog.find(t => t.id === G.current);
  const planning = G.phase === 'actions';
  const active = planning && G.actions > 0 && !presentation;
  const purchasing = !!selected && G.market.includes(selected.id);
  const tile = purchasing ? selected! : undefined;
  const targets = tile && active && priceOf(G, tile) <= G.money ? legalSlots(G, tile) : [];
  const planned = committed.plannedActions;
  const tally = presentation === 'tally' || G.phase === 'energy' || G.phase === 'research';

  useEffect(() => {
    if (presentation !== 'reveal') return;
    const timeout = window.setTimeout(() => setPresentation('tally'), 420);
    return () => window.clearTimeout(timeout);
  }, [presentation]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setMode(null); setHoveredSlot(undefined); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const clear = () => { setSelected(null); setHoveredSlot(undefined); setMode(null); };
  const chooseMode = (next: ActionMode) => { setSelected(null); setHoveredSlot(undefined); setMode(next === mode ? null : next); };
  const research = (track: Track) => { clear(); moves.research(track); playGameSound('pawn', muted); };
  const buy = (slot?: string) => {
    if (!tile) return;
    const source = document.querySelector(`[data-tile-id="${tile.id}"]`);
    const destination = slot ? document.querySelector(`[data-testid="slot-${slot}"]`) : null;
    if (source && destination && !matchMedia('(prefers-reduced-motion: reduce)').matches) setFlight({ tile, from: source.getBoundingClientRect(), to: destination.getBoundingClientRect() });
    moves.buy(tile.id, slot); playGameSound('tile', muted); clear();
  };
  const draw = () => { clear(); setPresentation(G.deck.length ? 'reveal' : null); moves.draw(); playGameSound('tile', muted); };
  const focus = tally ? `tally-${G.phase === 'energy' ? 'energy' : G.phase === 'research' ? 'research' : current?.tally}` : mode ?? 'idle';

  return <div className={`play-table focus-${focus} ${presentation === 'reveal' ? 'is-revealing' : ''}`}>
    <header className="table-status">
      <h1 className="sr-only">Prosperity · Votre nation</h1>
      <div className="table-brand"><span>PROSPERITY</span><small className="play-edition">{G.custom ? 'Partie personnalisée' : 'Une nation, sept décennies'}</small></div>
      <div className="table-year"><strong>{current?.decade ?? 1970}</strong><span>Tour {G.turn || 1} / {G.totalTurns}</span></div>
      <div className="table-resource"><Coins size={22} /><div><ResourceValue value={G.money} unit="€" testId="money-preview" /><small>Trésorerie</small></div></div>
      <div className="table-resource score-resource"><Globe2 size={23} /><div><ResourceValue value={G.score} unit="PP" /><small>Prospérité</small></div></div>
      <button className="icon-button" onClick={() => setJournal(true)} title="Journal de la nation" aria-label="Journal de la nation"><History size={20} /></button>
      <button className="icon-button sound-toggle" disabled={!soundAvailable} aria-label={muted ? 'Activer le son' : 'Couper le son'} aria-pressed={!muted} title={soundAvailable ? muted ? 'Activer le son' : 'Couper le son' : 'Son coupé · aucun fichier audio installé'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
    </header>

    <div className="table-surface">
      <div className="nation-space"><PlayerTerritory G={G} committed={committed} tile={tile?.category !== 'special' ? tile : undefined} targets={targets} highlighted={tally ? current?.tally : undefined} onPlace={buy} onInspect={t => { setSelected(t); setMode(null); }} onHover={setHoveredSlot} />
        <PollutionTrack value={G.pollution} active={active} focused={mode === 'cleanup' || tally && current?.tally === 'ecology'} onCleanup={() => { clear(); moves.cleanup(); playGameSound('disc', muted); }} />
      </div>
      <ResearchBoard G={G} selected={tile?.id} active={active} focused={mode === 'research' || mode === 'buy'} onResearch={research} onSelect={t => { setSelected(selected?.id === t.id ? null : t); setHoveredSlot(undefined); setMode(selected?.id === t.id ? null : 'buy'); }} />
      <aside className="table-context" aria-label="Tour et sélection">
        <TurnFlow G={G} moves={moves} presentation={presentation} onDraw={draw} onContinue={() => setPresentation(null)} onNew={onNew} />
        {selected ? <TechnologyDetails G={G} tile={selected} purchasing={purchasing} slot={hoveredSlot} active={active} onBuy={() => buy()} onClose={clear} /> : <div className="table-aside-note"><span className="ornament">✦</span><h3>{mode === 'research' ? 'Faites avancer votre pion' : mode === 'cleanup' ? 'Découvrez la prospérité' : mode === 'buy' ? 'Une technologie, un avenir' : 'Construire avec mesure'}</h3><p>{mode === 'research' ? 'Choisissez Énergie ou Écologie au sommet des pistes. Une case peut ouvrir un nouveau niveau et réduire vos prix.' : mode === 'cleanup' ? 'Cliquez sur la piste de pollution pour retirer un disque. Chaque symbole découvert vaut un point au décompte de prospérité.' : mode === 'buy' ? 'Choisissez une tuile, puis une case compatible de votre territoire. Son prix dépend de votre pion de recherche.' : 'Développez votre territoire et préservez son équilibre. La recherche rend les technologies plus accessibles.'}</p></div>}
      </aside>
    </div>

    <section className="turn-dock" aria-label="Préparation du tour">
      <div className="action-state" aria-live="polite"><div className="action-tokens" aria-label={`${planning ? G.actions : 0} actions restantes`}>{[0, 1].map(i => <span key={i} className={planning && i < G.actions ? 'available' : 'spent'} />)}</div><strong>{planning && !presentation ? `${G.actions} action${G.actions > 1 ? 's' : ''} restante${G.actions > 1 ? 's' : ''}` : G.phase === 'finished' ? 'Partie terminée' : G.phase === 'committed' ? 'Tour validé' : tally ? 'Décompte' : 'Révélation'}</strong><small>{planned.length ? 'Annulables avant validation' : 'Deux actions par tour'}</small></div>
      <div className="table-actions" aria-label="Actions disponibles">
        <button disabled={!active} aria-label="Revenus : recevoir 100 euros" onClick={() => { clear(); moves.income(); playGameSound('coin', muted); }}><Coins size={19} /><span>Revenu<small>+100 €</small></span></button>
        <button disabled={!active || G.pollution === 0} aria-pressed={mode === 'cleanup'} onClick={() => chooseMode('cleanup')}><Leaf size={19} /><span>Dépolluer<small>−1 disque</small></span></button>
        <button disabled={!active} aria-pressed={mode === 'research'} onClick={() => chooseMode('research')}><FlaskConical size={19} /><span>Recherche<small>+1 case</small></span></button>
        <button disabled={!active} aria-pressed={mode === 'buy'} onClick={() => chooseMode('buy')}><ShoppingBag size={19} /><span>Acheter<small>Une technologie</small></span></button>
      </div>
      <div className="turn-validation"><div className="plan-rollback"><button className="icon-button" aria-label="Annuler la dernière action" title="Annuler la dernière action" disabled={!planned.length} onClick={() => { clear(); moves.undoPlan(); }}><Undo2 size={18} /></button><button className="icon-button" aria-label="Annuler les deux actions" title="Annuler les deux actions" disabled={!planned.length} onClick={() => { clear(); moves.resetPlan(); }}><RotateCcw size={17} /></button></div><button className="primary commit-button" aria-label="Valider le tour" disabled={!planning || G.actions !== 0 || !planned.length} onClick={() => { clear(); moves.commit(); }}>Terminer le tour<Check size={16} /></button></div>
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
  return <span className="resource-number"><strong key={value} data-testid={testId}>{value} {unit}</strong>{change && <span className="resource-change" key={value} aria-live="polite" title={`${change.from} ${unit} → ${value} ${unit}`}>{change.delta > 0 ? '+' : ''}{change.delta} {unit}</span>}</span>;
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
