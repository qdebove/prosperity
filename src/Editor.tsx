import { useRef, useState } from 'react';
import { Check, Copy, Download, ImagePlus, Plus, RotateCcw, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { BASE_CATALOG, CATEGORIES, DECADES, LABELS, validateCatalog } from './game/catalog';
import type { Category, Symbol, Tile, Track } from './game/types';
import { CategoryLabel, Modal, SymbolIcon, TileArt, TileCard, TileStats, usesSymbolOverlay } from './components';
import { exportJson } from './storage';

interface Props { catalog: Tile[]; onSave: (catalog: Tile[]) => boolean; onDirty: (dirty: boolean) => void }
export default function Editor({ catalog, onSave, onDirty }: Props) {
  const [selected, setSelected] = useState(catalog[0].id);
  const [draft, setDraft] = useState<Tile>({ ...catalog[0] });
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [gallery, setGallery] = useState(false);
  const [imported, setImported] = useState<Tile[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const isOriginal = BASE_CATALOG.some(t => t.id === draft.id);
  const isNew = !catalog.some(t => t.id === draft.id);
  const visible = catalog.filter(t => t.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')) && (category === 'all' || t.category === category));
  const mark = (value: boolean) => { setDirty(value); onDirty(value); };
  function update(values: Partial<Tile>) { setDraft(prev => ({ ...prev, ...values })); mark(true); setStatus(''); setError(''); }
  function select(tile: Tile) {
    if (dirty && !window.confirm('Abandonner les modifications non enregistrées de cette tuile ?')) return;
    setSelected(tile.id); setDraft({ ...tile }); mark(false); setError(''); setStatus('');
  }
  function create(duplicate = false) {
    if (dirty && !window.confirm('Abandonner les modifications non enregistrées ?')) return;
    const id = `custom-${crypto.randomUUID()}`;
    const tile: Tile = duplicate ? { ...draft, id, name: `${draft.name.slice(0, 60)} (copie)` } : { id, name: 'Nouvelle technologie', category: 'infrastructure', track: 'ecology', level: 1, decade: 0, tally: 'research', energy: 0, ecology: 0, capital: 0, research: 1, prosperity: 0, image: '', effect: 'none', amount: 0 };
    setDraft(tile); setSelected(id); mark(true); setStatus(''); setError('');
  }
  function save() {
    try {
      const next = validateCatalog(isNew ? [...catalog, draft] : catalog.map(t => t.id === draft.id ? draft : t));
      if (onSave(next)) { mark(false); setStatus('Tuile enregistrée'); setError(''); }
    } catch (e) { setError((e as Error).message); }
  }
  function reset() {
    const original = BASE_CATALOG.find(t => t.id === draft.id);
    if (original && window.confirm('Rétablir les valeurs et l’illustration originales de cette tuile ?')) { setDraft({ ...original }); mark(true); }
  }
  function remove() {
    if (!window.confirm(`Supprimer « ${draft.name} » du catalogue ?`)) return;
    const next = catalog.filter(t => t.id !== draft.id);
    if (onSave(next)) { setDraft({ ...next[0] }); setSelected(next[0].id); mark(false); setStatus('Tuile supprimée'); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8000000) throw new Error('Le fichier est trop volumineux (8 Mo maximum).');
      const data = JSON.parse(await file.text());
      const tiles = validateCatalog(Array.isArray(data) ? data : data.tiles);
      if (!tiles.some(t => t.decade > 0)) throw new Error('Le catalogue doit contenir au moins une tuile datée pour jouer.');
      setImported(tiles); setError('');
    } catch (e) { setError(`Import impossible : ${(e as Error).message}`); }
  }
  async function uploadImage(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2000000) { setError('Choisissez une image PNG, JPEG ou WebP de moins de 2 Mo.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const probe = new Image();
      probe.onload = () => update({ image: reader.result as string, symbolsOnImage: true });
      probe.onerror = () => setError('Cette image ne peut pas être lue.');
      probe.src = reader.result as string;
    };
    reader.onerror = () => setError('Impossible de lire le fichier image.');
    reader.readAsDataURL(file);
  }

  return <div className="editor-page">
    <div className="page-heading"><div><span className="eyebrow">CRÉATION & COLLECTION</span><h1>Atelier de tuiles</h1></div><div className="heading-actions"><button className="secondary" onClick={() => fileRef.current?.click()}><Upload size={16} />Importer</button><button className="secondary" onClick={() => exportJson('prosperity-catalogue.json', { version: 1, tiles: catalog })}><Download size={16} />Exporter</button><button className="primary" onClick={() => create()}><Plus size={17} />Nouvelle tuile</button></div></div>
    <input className="sr-only" ref={fileRef} type="file" accept="application/json,.json" aria-label="Importer un catalogue JSON" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
    <input className="sr-only" ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Importer une illustration" onChange={e => { void uploadImage(e.target.files?.[0]); e.target.value = ''; }} />
    <div className="editor-layout"><section className="tile-library"><div className="library-toolbar"><h2>Collection <span className="count-badge">{catalog.length}</span></h2><select aria-label="Catégorie de la collection" value={category} onChange={e => setCategory(e.target.value)}><option value="all">Tous les types</option>{Object.entries(CATEGORIES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></div><label className="search-input"><Search size={17} /><input placeholder="Rechercher dans la collection…" aria-label="Rechercher dans la collection" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="library-grid">{visible.map(t => <TileCard key={t.id} tile={t} selected={selected === t.id} onClick={() => select(t)} badge={t.id.startsWith('custom-') ? 'CRÉATION' : t.decade ? `${t.decade}` : undefined} />)}{visible.length === 0 && <div className="empty-state"><Search size={28} /><p>Aucune tuile correspondante.</p></div>}</div></section>
      <aside className="tile-editor"><div className="editor-panel-heading"><h2>{isNew ? 'Nouvelle tuile' : 'Modifier la tuile'}</h2><div><button className="icon-button" title="Dupliquer la tuile" aria-label="Dupliquer la tuile" onClick={() => create(true)}><Copy size={17} /></button>{isOriginal ? <button className="icon-button" title="Rétablir la tuile originale" aria-label="Rétablir la tuile originale" onClick={reset}><RotateCcw size={17} /></button> : <button className="icon-button danger-text" title="Supprimer la tuile" aria-label="Supprimer la tuile" onClick={remove}><Trash2 size={17} /></button>}</div></div>
        <div className="editor-preview"><div className={`preview-tile cat-${draft.category}`}><TileArt tile={draft} /><strong>{draft.name || 'Sans nom'}</strong><TileStats tile={draft} /></div><div className="preview-controls"><CategoryLabel category={draft.category} /><span>Niveau {draft.level}</span><button className="secondary" onClick={() => imageRef.current?.click()}><ImagePlus size={15} />Illustration</button><button className="text-button" onClick={() => setGallery(true)}>Bibliothèque<Chevron /></button>{draft.image && <button className="text-button muted" onClick={() => update({ image: '' })}><X size={13} />Retirer</button>}</div></div>
        <form onSubmit={e => { e.preventDefault(); save(); }}>
          <label className="checkbox-label artwork-toggle"><input type="checkbox" checked={usesSymbolOverlay(draft)} onChange={e => update({ symbolsOnImage: e.target.checked })} /><span>Symboles sur l’illustration</span></label>
          <label>Nom de la tuile<input aria-label="Nom de la tuile" maxLength={70} required value={draft.name} onChange={e => update({ name: e.target.value })} /></label>
          <div className="form-row"><label>Type<select value={draft.category} onChange={e => { const next = e.target.value as Category; update({ category: next, effect: next === 'special' ? 'points' : 'none', amount: next === 'special' ? 1 : 0, ...(next === 'special' ? { energy: 0, ecology: 0, capital: 0, research: 0, prosperity: 0 } : {}) }); }}>{Object.entries(CATEGORIES).map(([id, text]) => <option value={id} key={id}>{text}</option>)}</select></label><label>Niveau<input type="number" min={1} max={6} step={1} required value={draft.level} onChange={e => update({ level: e.target.valueAsNumber })} /></label></div>
          <div className="form-row"><label>Piste de recherche<select value={draft.track} onChange={e => update({ track: e.target.value as Track })}><option value="energy">Énergie</option><option value="ecology">Écologie</option></select></label><label>Disponibilité<select value={draft.decade} onChange={e => update({ decade: Number(e.target.value) })}><option value={0}>Dès le départ</option>{DECADES.map(d => <option value={d} key={d}>{d}</option>)}</select></label></div>
          {draft.decade > 0 && <label>Décompte à la révélation<select value={draft.tally} onChange={e => update({ tally: e.target.value as Symbol })}>{Object.entries(LABELS).map(([id, text]) => <option value={id} key={id}>{text}</option>)}</select></label>}
          {draft.category === 'special' ? <fieldset><legend>Effet immédiat</legend><div className="form-row"><label>Effet<select value={draft.effect} onChange={e => update({ effect: e.target.value as Tile['effect'] })}><option value="points">Gagner de la prospérité</option><option value="cleanup">Retirer de la pollution</option></select></label><label>Quantité<input type="number" min={1} max={9} required value={draft.amount} onChange={e => update({ amount: e.target.valueAsNumber })} /></label></div></fieldset> : <fieldset><legend>Effets permanents</legend>{(['energy', 'ecology', 'capital', 'research', 'prosperity'] as Symbol[]).map(symbol => <label className={`stat-input symbol-${symbol}`} key={symbol}><span><SymbolIcon name={symbol} />{LABELS[symbol]}</span><input type="number" aria-label={`Valeur ${LABELS[symbol]}`} min={symbol === 'energy' || symbol === 'ecology' ? -9 : 0} max={symbol === 'energy' || symbol === 'ecology' ? 9 : 6} required value={draft[symbol]} onChange={e => update({ [symbol]: e.target.valueAsNumber })} /></label>)}</fieldset>}
          {error && <p className="form-error" role="alert">{error}</p>}{status && <p className="form-success" role="status"><Check size={15} />{status}</p>}
          <div className="editor-save"><span>{dirty ? 'Modifications non enregistrées' : 'Catalogue local enregistré'}</span><button className="primary full-width" type="submit" disabled={!dirty}><Save size={16} />Enregistrer la tuile</button></div>
        </form>
      </aside>
    </div>
    {gallery && <Modal title="Illustrations du jeu" wide onClose={() => setGallery(false)}><div className="art-gallery">{BASE_CATALOG.map(t => <button key={t.id} onClick={() => { update({ image: t.image }); setGallery(false); }} title={t.name}><TileArt tile={t} /><span>{t.name}</span></button>)}</div></Modal>}
    {imported && <Modal title="Importer le catalogue" onClose={() => setImported(null)}><p>Le catalogue importé contient <strong>{imported.length} tuiles</strong>, dont {imported.filter(t => t.decade > 0).length} tuiles datées. Il remplacera votre catalogue enregistré.</p><p>La partie en cours conserve ses propres tuiles.</p><div className="modal-actions"><button className="secondary" onClick={() => setImported(null)}>Annuler</button><button className="primary" onClick={() => { if (onSave(imported)) { setDraft({ ...imported[0] }); setSelected(imported[0].id); mark(false); setImported(null); setStatus('Catalogue importé'); } }}><Upload size={16} />Importer ce catalogue</button></div></Modal>}
  </div>;
}
function Chevron() { return <span aria-hidden="true">›</span>; }
