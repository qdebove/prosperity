import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronRight, Coins, FlaskConical, Globe2, History, Leaf, LockKeyhole, Plus, RotateCcw, Search, SlidersHorizontal, Undo2, X, Zap } from 'lucide-react';
import { CATEGORY_ICONS, CategoryLabel, Modal, SymbolIcon, TileArt, TileCard, TileStats } from './components';
import { CATEGORIES, LABELS, SLOTS } from './game/catalog';
import { FINAL_STEPS, LEVEL_STARTS, MAX_RESEARCH, legalSlots, levelAt, pollutionBonus, previewState, priceOf, totals, unlocked } from './game/engine';
import type { Category, GameState, PlannedAction, Symbol, Tile, Track } from './game/types';

interface Props {
  committed: GameState;
  moves: Record<string, (...args: any[]) => void>;
  onNew: () => void;
}

export default function GameBoard({ committed, moves, onNew }: Props) {
  const G = useMemo(() => previewState(committed), [committed]);
  const [selected, setSelected] = useState<string | null>(null);
  const [inspect, setInspect] = useState<Tile | null>(null);
  const [journal, setJournal] = useState(false);
  const [filters, setFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [track, setTrack] = useState<'all' | Track>('all');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [tab, setTab] = useState<'nation' | 'market'>('nation');
  const tile = G.catalog.find(t => t.id === selected && G.market.includes(t.id));
  const current = G.catalog.find(t => t.id === G.current);
  const stats = totals(G);
  const before = totals(committed);
  const planning = G.phase === 'actions';
  const active = planning && G.actions > 0;
  const planned = committed.plannedActions ?? [];
  const targets = tile && active && priceOf(G, tile) <= G.money ? legalSlots(G, tile) : [];
  const market = G.catalog.filter(t => G.market.includes(t.id) && (track === 'all' || t.track === track) && (category === 'all' || t.category === category) && t.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
    .sort((a, b) => priceOf(G, a) - priceOf(G, b) || a.level - b.level || a.name.localeCompare(b.name, 'fr'));
  const select = (t: Tile) => {
    setSelected(t.id === selected ? null : t.id);
    if (active && t.category !== 'special' && priceOf(G, t) <= G.money) setTab('nation');
  };
  const buy = (slot?: string) => {
    if (!tile) return;
    moves.buy(tile.id, slot);
    setSelected(null);
  };
  const cancel = (all = false) => { setSelected(null); all ? moves.resetPlan() : moves.undoPlan(); };
  const event = committed.log.filter(entry => entry.turn === G.turn && entry.kind === 'event').at(-1);
  const prosperity = G.pollution >= 16 ? 0 : stats.prosperity + pollutionBonus(G.pollution);
  const oldProsperity = committed.pollution >= 16 ? 0 : before.prosperity + pollutionBonus(committed.pollution);

  return <div className="play-table">
    <header className="play-heading">
      <div><span className="play-edition">{G.custom ? 'Partie personnalisée' : 'Prosperity · Solo'}</span><h1>Votre nation</h1></div>
      <div className="play-time"><strong>{current?.decade ?? 1970}</strong><span>Tour {G.turn || 1} / {G.totalTurns}</span></div>
      <div className="play-score" title="Points de prospérité acquis"><Globe2 size={23} /><strong>{G.score}</strong><Delta value={G.score - committed.score} /><span>points</span></div>
      <button className="icon-button" onClick={() => setJournal(true)} title="Journal de la nation" aria-label="Journal de la nation"><History size={20} /></button>
    </header>

    <div className="play-event">
      {current ? <><span className={`event-token symbol-${current.tally}`}><SymbolIcon name={current.tally} size={17} /></span><strong>{LABELS[current.tally]}</strong><span className="event-outcome">{event?.text.includes('Décompte :') ? 'Décompte en cours' : event?.text.replace(/^[^:]+ : /, '')}</span><button className="text-button event-card-link" onClick={() => setInspect(current)}>{current.name}<ChevronRight size={13} /></button></> : <><span className="event-token"><Globe2 size={17} /></span><strong>1970</strong><span>La première décennie</span></>}
      {G.phase === 'committed' && <span className="committed-label"><Check size={14} />Tour validé</span>}
    </div>

    {(G.phase === 'energy' || G.phase === 'research') && <Resolution key={`${G.turn}-${G.finalStep}-${G.phase}`} G={G} moves={moves} />}
    {G.phase === 'final' && <div className="final-progress">{FINAL_STEPS.map((symbol, i) => <span key={i} className={i < G.finalStep ? 'done' : i === G.finalStep ? 'now' : ''}><SymbolIcon name={symbol} />{LABELS[symbol]}{i < G.finalStep && <Check size={13} />}</span>)}</div>}
    {G.phase === 'finished' && <section className="final-result"><Globe2 size={36} /><div><span className="eyebrow">BILAN FINAL</span><h2>{G.score} points de prospérité</h2></div><dl>{G.finalScores.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}<div><dt>Trésorerie restante</dt><dd>{G.money} €</dd></div></dl></section>}

    <div className="play-mobile-tabs" role="tablist" aria-label="Vue de la partie">
      <button role="tab" aria-selected={tab === 'nation'} onClick={() => setTab('nation')}>Plateau</button>
      <button role="tab" aria-selected={tab === 'market'} onClick={() => setTab('market')}>Marché <span>{G.market.length}</span></button>
    </div>

    {tile && <div className="play-selection">
      <TileArt tile={tile} /><div><strong>{tile.name}</strong><TileStats tile={tile} /></div>
      <b>{priceOf(G, tile)} €</b>
      {tile.category === 'special' ? <button className="primary" disabled={!active || priceOf(G, tile) > G.money} onClick={() => buy()}>Réaliser<Check size={15} /></button> : <span>{!active ? 'Aucune action disponible' : priceOf(G, tile) > G.money ? 'Trésorerie insuffisante' : 'Placement'}</span>}
      <button className="icon-button" onClick={() => setSelected(null)} aria-label="Annuler la sélection" title="Annuler la sélection"><X size={17} /></button>
    </div>}

    <div className={`play-layout view-${tab}`}>
      <section className="play-nation" aria-label="Plateau de votre nation">
        <div className="play-section-heading"><h2>Territoire</h2><div className="play-metrics">
          <Metric name="energy" value={stats.energy} delta={stats.energy - before.energy} hint={`Bilan énergétique : ${stats.energy}. ${stats.energy >= 0 ? `${stats.energy * 50} € par décompte` : `${-stats.energy} unités de déficit`}.`} />
          <Metric name="ecology" value={stats.ecology} delta={stats.ecology - before.ecology} hint={`Bilan écologique : ${stats.ecology}. ${stats.ecology >= 0 ? 'Retire' : 'Ajoute'} ${Math.abs(stats.ecology)} pollution par décompte.`} />
          <Metric name="research" value={stats.research} delta={stats.research - before.research} hint={`${stats.research} cases par décompte de recherche.`} />
          <Metric name="prosperity" value={prosperity} delta={prosperity - oldProsperity} hint={`${prosperity} points au prochain décompte : ${stats.prosperity} sur les tuiles, ${pollutionBonus(G.pollution)} sur la piste de pollution. ${G.pollution >= 16 ? 'Gains bloqués par la pollution.' : ''}`} />
        </div></div>

        <div className="play-territory">
          <div className="play-board">
            {SLOTS.map(slot => {
              const placed = G.board[slot.id];
              const target = targets.includes(slot.id);
              const locked = !unlocked(G, slot.id);
              const changed = placed?.id !== committed.board[slot.id]?.id;
              const Icon = CATEGORY_ICONS[slot.category];
              const label = target ? `${placed ? 'Remplacer' : 'Construire'} en ${slot.id.toUpperCase()}` : placed?.name ?? (locked ? 'Emplacement fermé : transport requis' : CATEGORIES[slot.category]);
              return <button key={slot.id} data-testid={`slot-${slot.id}`} className={`play-slot cat-${slot.category} ${placed ? 'occupied' : ''} ${target ? 'target' : ''} ${locked ? 'locked' : ''} ${changed ? 'changed' : ''}`} style={{ gridRow: slot.row, gridColumn: slot.col }} disabled={!placed && !target} aria-label={label} title={label} onClick={() => target ? buy(slot.id) : placed && setInspect(placed)}>
                {placed ? <><TileArt tile={placed} /><span className="play-slot-name">{placed.name}</span></> : locked ? <LockKeyhole size={20} strokeWidth={1.3} /> : target ? <Plus size={25} /> : <Icon size={22} strokeWidth={1.1} />}
                {changed && <span className="change-marker" title="Construction en préparation" />}
                {target && placed && <span className="placement-overlay"><Plus size={25} /></span>}
              </button>;
            })}
            <div className="play-board-center"><Globe2 size={28} strokeWidth={1} /></div>
          </div>

          <div className="play-controls">
            <button className="bank-control has-tooltip" data-tip="Recevoir 100 € · 1 action" aria-label="Revenus : recevoir 100 euros" disabled={!active} onClick={() => moves.income()}>
              <span className="control-title"><Coins size={18} />Trésorerie<span className="control-plus"><Plus size={13} />100 €</span></span>
              <span className="bank-value" data-testid="money-preview">{G.money} <small>€</small><Delta value={G.money - committed.money} /></span>
            </button>

            <div className={`pollution-control ${G.pollution >= 16 ? 'critical' : ''}`}>
              <div className="control-title"><Leaf size={17} /><span>Pollution</span><strong data-testid="pollution-preview">{G.pollution}<Delta value={G.pollution - committed.pollution} goodNegative /></strong></div>
              <div className="pollution-discs">{Array.from({ length: 16 }, (_, i) => {
                const polluted = i < G.pollution;
                const removed = !polluted && i < committed.pollution;
                const bonus = [0, 5, 10].includes(i);
                return <button key={i} className={`${polluted ? 'filled' : ''} ${bonus ? 'bonus' : ''} ${i === 15 ? 'limit' : ''} ${removed ? 'removed' : ''}`} disabled={!active || !polluted} onClick={() => moves.cleanup()} aria-label={`Dépolluer : retirer une pollution (case ${i + 1})`} title={polluted ? 'Retirer une pollution · 1 action' : bonus ? 'Prospérité découverte' : 'Emplacement sans pollution'}>
                  <span>{i === 15 ? '!' : bonus ? <Globe2 size={12} /> : null}</span>
                </button>;
              })}</div>
              <span className="pollution-summary">{G.pollution >= 16 ? 'Prospérité bloquée' : <><Globe2 size={12} />{pollutionBonus(G.pollution)} découvert{pollutionBonus(G.pollution) > 1 ? 's' : ''}</>}</span>
            </div>

            <div className="research-controls">{(['energy', 'ecology'] as Track[]).map(t => {
              const level = levelAt(G.research[t]);
              const step = G.research[t] - LEVEL_STARTS[level - 1] + 1;
              return <button className={`research-control symbol-${t} has-tooltip`} key={t} data-tip={G.research[t] === MAX_RESEARCH ? 'Recherche maximale' : 'Avancer d’une case · 1 action'} aria-label={`Rechercher en ${LABELS[t].toLowerCase()} : avancer d’une case`} disabled={!active || G.research[t] === MAX_RESEARCH} onClick={() => moves.research(t)}>
                <span className="control-title"><SymbolIcon name={t} size={17} /><span>Recherche {LABELS[t].toLowerCase()}</span><Plus size={14} /></span>
                <span className="research-levels">{LEVEL_STARTS.map((_, i) => <span key={i} className={i + 1 === level ? 'current' : i + 1 < level ? 'reached' : ''}>{i + 1}</span>)}</span>
                <span className="research-step"><span>{step} / {level + 1} cases</span><Delta value={G.research[t] - committed.research[t]} /></span>
              </button>;
            })}</div>
          </div>
        </div>
      </section>

      <section className="play-market" aria-label="Marché des technologies">
        <div className="play-section-heading"><h2>Technologies <span>{G.market.length}</span></h2><button className={`icon-button ${filters ? 'active' : ''}`} aria-label="Filtres du marché" title="Filtres du marché" aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={18} /></button></div>
        <div className="market-track-tabs" aria-label="Piste des technologies">{(['all', 'energy', 'ecology'] as const).map(t => <button key={t} aria-pressed={track === t} onClick={() => setTrack(t)}>{t === 'all' ? 'Toutes' : <><SymbolIcon name={t} size={14} />{LABELS[t]}</>}</button>)}</div>
        {filters && <div className="play-filters"><label className="search-input"><Search size={15} /><input aria-label="Rechercher une technologie" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Catégorie du marché" value={category} onChange={e => setCategory(e.target.value as Category | 'all')}><option value="all">Tous les types</option>{Object.entries(CATEGORIES).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div>}
        <div className="play-market-grid">{market.map(t => <TileCard compact key={t.id} tile={t} selected={selected === t.id} price={priceOf(G, t)} affordable={priceOf(G, t) <= G.money} badge={t.id === G.current ? 'NOUVEAU' : undefined} onClick={() => select(t)} />)}{!market.length && <div className="empty-state"><Search size={25} /><p>Aucune technologie</p><button className="text-button" onClick={() => { setSearch(''); setCategory('all'); setTrack('all'); }}>Réinitialiser les filtres</button></div>}</div>
      </section>
    </div>

    <section className="turn-dock" aria-label="Préparation du tour">
      <div className="plan-status" aria-live="polite"><span className="plan-dots">{[0, 1].map(i => <i key={i} className={i < planned.length ? 'prepared' : ''} />)}</span><strong>{planning ? `${planned.length} / ${committed.actions} actions` : G.phase === 'committed' ? 'Tour validé' : G.phase === 'finished' ? 'Partie terminée' : 'Votre tour'}</strong>{planned.length > 0 && <small>En préparation</small>}</div>
      <div className="plan-actions">{planned.map((action, i) => <span key={i}><SymbolIcon name={actionSymbol(action)} size={14} />{actionLabel(action, G)}</span>)}</div>
      {planning && <div className="plan-rollback"><button className="icon-button" aria-label="Annuler la dernière action" title="Annuler la dernière action" disabled={!planned.length} onClick={() => cancel()}><Undo2 size={19} /></button><button className="icon-button" aria-label="Annuler les deux actions" title="Revenir au début des actions" disabled={!planned.length} onClick={() => cancel(true)}><RotateCcw size={18} /></button></div>}
      {planning ? <button className="primary commit-button" disabled={G.actions !== 0 || !planned.length} onClick={() => { setSelected(null); moves.commit(); }}>Valider le tour<Check size={17} /></button>
        : G.phase === 'draw' || G.phase === 'committed' ? <button className="primary" onClick={() => { setSelected(null); moves.draw(); }}>{G.phase === 'draw' ? 'Révéler la première tuile' : G.deck.length ? 'Tour suivant' : 'Décompte final'}<ArrowRight size={17} /></button>
        : G.phase === 'final' ? <button className="primary" onClick={() => moves.nextFinal()}>Décompter : {LABELS[FINAL_STEPS[G.finalStep]]}<ArrowRight size={17} /></button>
        : G.phase === 'finished' ? <button className="primary" onClick={onNew}>Nouvelle partie<ArrowRight size={17} /></button> : <span className="pending-label">Décompte à résoudre</span>}
    </section>

    {inspect && <Modal title={inspect.name} onClose={() => setInspect(null)}><div className="tile-details"><TileArt tile={inspect} /><div><CategoryLabel category={inspect.category} /><p>Recherche {LABELS[inspect.track].toLowerCase()} · niveau {inspect.level}</p><TileStats tile={inspect} /><p>{inspect.decade ? `${inspect.decade} · Décompte ${LABELS[inspect.tally].toLowerCase()}` : 'Technologie de départ'}</p></div></div>{G.market.includes(inspect.id) && <button className="primary full-width" onClick={() => { select(inspect); setInspect(null); }}>Sélectionner<ArrowRight size={17} /></button>}</Modal>}
    {journal && <Modal title="Journal de la nation" wide onClose={() => setJournal(false)}><ol className="full-journal">{committed.log.slice().reverse().map((entry, i) => <li className={entry.kind} key={i}><span>Tour {entry.turn}</span><p>{entry.text}</p></li>)}</ol></Modal>}
  </div>;
}

function Delta({ value, goodNegative = false }: { value: number; goodNegative?: boolean }) {
  if (!value) return null;
  return <small className={`preview-delta ${value * (goodNegative ? -1 : 1) > 0 ? 'positive' : 'negative'}`} aria-label={`Variation : ${value > 0 ? '+' : ''}${value}`}>{value > 0 ? '+' : ''}{value}</small>;
}
function Metric({ name, value, delta, hint }: { name: Symbol; value: number; delta: number; hint: string }) {
  return <span className={`play-metric symbol-${name} has-tooltip`} tabIndex={0} data-tip={hint} aria-label={hint}><SymbolIcon name={name} size={17} /><b>{value > 0 && (name === 'energy' || name === 'ecology') ? '+' : ''}{value}</b><Delta value={delta} /></span>;
}
function actionSymbol(action: PlannedAction): Symbol {
  return action.type === 'income' ? 'capital' : action.type === 'cleanup' ? 'ecology' : action.type === 'research' ? 'research' : 'prosperity';
}
function actionLabel(action: PlannedAction, G: GameState) {
  if (action.type === 'income') return '+100 €';
  if (action.type === 'cleanup') return '-1 pollution';
  if (action.type === 'research') return `+1 ${LABELS[action.track].toLowerCase()}`;
  return G.catalog.find(t => t.id === action.tileId)?.name ?? 'Construction';
}

function Resolution({ G, moves }: { G: GameState; moves: Props['moves'] }) {
  const available = Math.min(G.pending, MAX_RESEARCH * 2 - G.research.energy - G.research.ecology);
  const minResearch = Math.max(0, available - (MAX_RESEARCH - G.research.ecology));
  const energy = G.phase === 'energy';
  const [value, setValue] = useState(energy ? Math.min(Math.floor(G.money / 100), G.pending) : minResearch);
  const max = energy ? Math.min(G.pending, Math.floor(G.money / 100)) : Math.min(available, MAX_RESEARCH - G.research.energy);
  return <section className={`resolution ${energy ? 'energy-resolution' : ''}`}>
    <div className="resolution-title">{energy ? <Zap size={24} /> : <FlaskConical size={24} />}<div><h3>{energy ? `Déficit : ${G.pending} énergie` : `${G.pending} cases de recherche`}</h3><p>{energy ? '100 € ou 1 pollution par unité' : 'Répartition entre les deux pistes'}</p></div></div>
    <div className="resolution-controls"><label>{energy ? 'Unités payées' : 'Cases en énergie'}<input type="range" aria-label={energy ? 'Unités payées' : 'Cases en énergie'} min={energy ? 0 : minResearch} max={max} step={1} value={value} onChange={e => setValue(Number(e.target.value))} /></label><strong>{energy ? `${value * 100} € · +${G.pending - value} pollution` : `${value} énergie · ${available - value} écologie`}</strong></div>
    <button className="primary" onClick={() => energy ? moves.resolveEnergy(value) : moves.resolveResearch(value)}>Valider<Check size={16} /></button>
  </section>;
}
