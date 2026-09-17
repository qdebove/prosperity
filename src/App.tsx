import { useEffect, useRef, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { BookOpen, Check, ChevronRight, CircleHelp, Globe2, LayoutDashboard, Menu, PanelsTopLeft, Plus, Shuffle, Trophy, X } from 'lucide-react';
import { Brand, Modal } from './components';
import Editor from './Editor';
import GameBoard from './GameBoard';
import Rules from './Rules';
import { BASE_CATALOG } from './game/catalog';
import { createGame } from './game/engine';
import type { Tile } from './game/types';
import { CATALOG_KEY, RECORDS_KEY, SAVE_KEY, persist, readCatalog, readGame, readRecords } from './storage';

type Page = 'game' | 'editor' | 'rules';
const newSeed = () => crypto.randomUUID().slice(0, 8);
const makeClient = (catalog: Tile[], seed: string, saved?: ReturnType<typeof readGame>['game']) => Client({ game: createGame(catalog, seed, saved), numPlayers: 1, debug: false });

export default function App() {
  const [catalog, setCatalog] = useState(readCatalog);
  const [startup] = useState(readGame);
  const [client, setClient] = useState(() => makeClient(BASE_CATALOG, startup.game?.seed ?? newSeed(), startup.game));
  const [state, setState] = useState(() => client.getState()!);
  const [page, setPage] = useState<Page>('game');
  const [newOpen, setNewOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [records, setRecords] = useState(readRecords);
  const [seed, setSeed] = useState(newSeed);
  const [custom, setCustom] = useState(false);
  const [message, setMessage] = useState(startup.error ?? '');
  const [saveFailed, setSaveFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const editorDirty = useRef(false);
  const G = state.G;

  useEffect(() => {
    client.start();
    const unsubscribe = client.subscribe(next => {
      if (!next) return;
      setState(next);
      try { persist(SAVE_KEY, next.G); setSaveFailed(false); }
      catch (e) { setMessage((e as Error).message); setSaveFailed(true); }
    });
    return () => { unsubscribe(); client.stop(); };
  }, [client]);

  useEffect(() => {
    if (G.phase !== 'finished') return;
    const previous = readRecords();
    if (previous.some(r => r.id === G.id)) return;
    const next = [{ id: G.id, seed: G.seed, score: G.score, money: G.money, custom: G.custom, date: new Date().toISOString() }, ...previous].slice(0, 30);
    try { persist(RECORDS_KEY, next); setRecords(next); } catch (e) { setMessage((e as Error).message); }
  }, [G.phase, G.id, G.score, G.money, G.seed, G.custom]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (editorDirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  function navigate(next: Page) {
    setMenuOpen(false);
    if (next === page) return;
    if (editorDirty.current && !window.confirm('Abandonner les modifications non enregistrées de la tuile ?')) return;
    editorDirty.current = false;
    setPage(next);
  }
  function saveCatalog(next: Tile[]) {
    try { persist(CATALOG_KEY, next); setCatalog(next); return true; }
    catch (e) { setMessage((e as Error).message); return false; }
  }
  function startGame() {
    if (editorDirty.current && !window.confirm('Abandonner les modifications non enregistrées de la tuile ?')) return;
    try {
      const gameSeed = seed.trim() || newSeed();
      const next = makeClient(custom ? catalog : BASE_CATALOG, gameSeed);
      const fresh = next.getState()!;
      // A replay may share its shuffle seed while retaining a distinct record ID.
      const resume = { ...fresh.G, id: crypto.randomUUID() };
      setClient(makeClient(resume.catalog, gameSeed, resume));
      setState({ ...fresh, G: resume });
      editorDirty.current = false;
      setPage('game'); setNewOpen(false); setMenuOpen(false); setMessage('');
    } catch (e) { setMessage((e as Error).message); }
  }
  const best = records.filter(r => !r.custom).reduce((n, r) => Math.max(n, r.score), 0);

  return <div className={`app-shell ${page === 'game' ? 'play-shell' : ''} ${menuOpen ? 'game-menu-open' : ''}`}>
    {page === 'game' && <><button className="game-menu-toggle icon-button" aria-label={menuOpen ? 'Fermer le menu' : 'Menu de la partie'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>{menuOpen && <button className="game-menu-backdrop" aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)} />}</>}
    <aside className="sidebar"><a href="#" className="brand-link" onClick={e => { e.preventDefault(); navigate('game'); }} aria-label="Prosperity, la partie"><Brand /></a><div className="sidebar-divider" /><span className="nav-caption">VOTRE ESPACE</span><nav aria-label="Navigation principale">{([{ id: 'game', label: 'La partie', icon: LayoutDashboard }, { id: 'editor', label: 'Atelier de tuiles', icon: PanelsTopLeft }, { id: 'rules', label: 'Règles du jeu', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)} title={label} aria-label={label} aria-current={page === id ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{page === id && <ChevronRight size={14} className="nav-arrow" />}</button>)}</nav>
      <div className="sidebar-session"><span className="session-indicator" /><span>PARTIE SOLO</span><strong>{G.phase === 'finished' ? 'Partie terminée' : 'Une nation en devenir'}</strong><div className="session-progress"><span style={{ width: `${G.turn / G.totalTurns * 100}%` }} /></div><small>Tour {G.turn} sur {G.totalTurns}</small><button title="Nouvelle partie" aria-label="Nouvelle partie" onClick={() => { setSeed(newSeed()); setNewOpen(true); }}><Plus size={15} /><span>Nouvelle partie</span></button></div>
      <div className="sidebar-bottom"><button className="record-button" title="Votre meilleur score" aria-label="Votre meilleur score" onClick={() => setRecordsOpen(true)}><Trophy size={19} /><span>Votre meilleur score<strong>{best || '—'} <small>points</small></strong></span></button><p>REINER KNIZIA &<br />SEBASTIAN BLEASDALE</p><small>Une adaptation solo · 2013 / 2026</small></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><span>Prosperity</span><ChevronRight size={13} /><strong>{page === 'game' ? 'La partie' : page === 'editor' ? 'Atelier de tuiles' : 'Règles du jeu'}</strong></div><div className="topbar-right"><span className={`save-state ${saveFailed ? 'danger-text' : ''}`}>{saveFailed ? <X size={13} /> : <Check size={13} />}{saveFailed ? 'Sauvegarde indisponible' : 'Sauvegarde locale'}</span><span className="solo-tag"><span />Solo</span><button className="icon-button" title="Règles du jeu" aria-label="Consulter les règles" onClick={() => navigate('rules')}><CircleHelp size={19} /></button></div></header>
      <main>{message && <div className="notice" role="alert"><span>{message}</span><button className="icon-button" onClick={() => setMessage('')} aria-label="Fermer le message"><X size={16} /></button></div>}{page === 'game' ? <GameBoard key={G.id} committed={G} moves={client.moves} onNew={() => { setSeed(newSeed()); setNewOpen(true); }} /> : page === 'editor' ? <Editor catalog={catalog} onSave={saveCatalog} onDirty={dirty => { editorDirty.current = dirty; }} /> : <Rules />}</main>
      <footer className="app-footer"><span>PROSPERITY <span>·</span> Une nation, sept décennies.</span><button className="text-button" onClick={() => navigate('rules')}>Règles & crédits<ArrowLink /></button></footer>
    </div>
    {newOpen && <Modal title="Une nouvelle nation" onClose={() => setNewOpen(false)}><div className="new-game-art"><Globe2 size={38} /><span>1970 <span>→</span> 2030</span></div><form onSubmit={e => { e.preventDefault(); startGame(); }}><label>Graine du mélange<div className="seed-input"><input value={seed} maxLength={60} onChange={e => setSeed(e.target.value)} aria-label="Graine du mélange" /><button type="button" className="icon-button" title="Nouvelle graine aléatoire" aria-label="Nouvelle graine aléatoire" onClick={() => setSeed(newSeed())}><Shuffle size={17} /></button></div></label><label className="checkbox-label"><input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} /><span>Utiliser mon catalogue personnalisé<small>{catalog.length} tuiles · {catalog.filter(t => t.decade > 0).length} tours</small></span></label>{G.turn > 0 && <p className="restart-notice">La partie en cours sera remplacée. Les records terminés sont conservés.</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => setNewOpen(false)}>Annuler</button><button className="primary" type="submit">Fonder ma nation<ChevronRight size={17} /></button></div></form></Modal>}
    {recordsOpen && <Modal title="Vos nations, vos records" wide onClose={() => setRecordsOpen(false)}>{records.length ? <div className="records-table"><table><thead><tr><th>Date</th><th>Partie</th><th>Prospérité</th><th>Trésorerie</th></tr></thead><tbody>{records.slice().sort((a, b) => b.score - a.score || b.money - a.money).map(r => <tr key={r.id}><td>{new Date(r.date).toLocaleDateString('fr-FR')}</td><td>{r.custom ? 'Personnalisée' : 'Classique'}<small>{r.seed}</small></td><td><strong>{r.score}</strong></td><td>{r.money} €</td></tr>)}</tbody></table></div> : <div className="empty-state"><Trophy size={40} /><h3>La première page reste à écrire</h3><p>Aucune partie terminée pour le moment.</p></div>}</Modal>}
  </div>;
}
function ArrowLink() { return <ChevronRight size={13} />; }
