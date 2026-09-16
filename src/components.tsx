import { useEffect, useRef, type ReactNode } from 'react';
import { Zap, Leaf, Coins, FlaskConical, Globe2, X, Landmark, Factory, Route, Building2, Sparkles } from 'lucide-react';
import { CATEGORIES, LABELS } from './game/catalog';
import type { Category, Symbol, Tile } from './game/types';
import { resolveArtwork, type Artwork } from './artwork';

export const ICONS = { energy: Zap, ecology: Leaf, capital: Coins, research: FlaskConical, prosperity: Globe2 };
export const CATEGORY_ICONS = { power: Factory, supply: Zap, transport: Route, infrastructure: Building2, special: Sparkles };
export function SymbolIcon({ name, size = 16 }: { name: Symbol; size?: number }) {
  const Icon = ICONS[name]; return <Icon size={size} aria-hidden="true" />;
}
export function usesSymbolOverlay(tile: Tile) {
  return tile.symbolsOnImage ?? true;
}
function AtlasArt({ artwork }: { artwork: Artwork }) {
  const [x, y, width, height] = artwork.frame;
  const edge = Math.max(width, height);
  return <span className="atlas-frame" style={{ width: `${width / edge * 100}%`, height: `${height / edge * 100}%` }}>
    <img src={artwork.src} alt="" loading="lazy" decoding="async" style={{ width: `${artwork.columns / width * 100}%`, height: `${artwork.rows / height * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} />
  </span>;
}
export function TileArt({ tile, className = '' }: { tile: Tile; className?: string }) {
  const Icon = CATEGORY_ICONS[tile.category];
  const artwork = resolveArtwork(tile.image);
  const symbols = usesSymbolOverlay(tile);
  const badges = (keys: Symbol[]) => keys.filter(key => Number.isFinite(tile[key]) && tile[key] !== 0).map(key => (
    <span key={key} className={`art-symbol symbol-${key} ${tile[key] < 0 ? 'negative' : ''}`} data-symbol={key} title={`${LABELS[key]} : ${tile[key]}`}>
      <SymbolIcon name={key} size={15} /><b>{tile[key] > 0 && (key === 'energy' || key === 'ecology') ? '+' : ''}{tile[key]}</b>
    </span>
  ));
  return <div className={`tile-art composed-tile ${artwork ? 'illustrated-tile' : ''} cat-${tile.category} ${className}`}>
    {artwork ? <AtlasArt artwork={artwork} /> : tile.image ? <img className="composed-scene" src={tile.image} alt="" loading="lazy" /> : <Icon className="composed-placeholder" size={48} strokeWidth={1} />}
    {symbols && <>
      <span className="art-symbols art-symbols-top">{badges(['energy', 'ecology'])}</span>
      <span className="art-symbols art-symbols-bottom">{tile.category === 'special' ? <span className={`art-symbol symbol-${tile.effect === 'points' ? 'prosperity' : 'ecology'}`} data-symbol={tile.effect === 'points' ? 'prosperity' : 'ecology'}><SymbolIcon name={tile.effect === 'points' ? 'prosperity' : 'ecology'} size={15} /><b>{tile.effect === 'points' ? '+' : '-'}{tile.amount}</b></span> : badges(['capital', 'research', 'prosperity'])}</span>
    </>}
  </div>;
}
export function TileStats({ tile }: { tile: Tile }) {
  return <span className="tile-stats">{(['energy', 'ecology', 'capital', 'research', 'prosperity'] as Symbol[]).filter(s => tile[s] !== 0).map(s => <span className={`symbol-${s}`} key={s} title={`${LABELS[s]} : ${tile[s]}`}><SymbolIcon name={s} size={13} />{tile[s] > 0 && (s === 'energy' || s === 'ecology') ? '+' : ''}{tile[s]}</span>)}{tile.category === 'special' && <span className={tile.effect === 'points' ? 'symbol-prosperity' : 'symbol-ecology'}><SymbolIcon name={tile.effect === 'points' ? 'prosperity' : 'ecology'} size={13} />{tile.effect === 'cleanup' ? '-' : '+'}{tile.amount}</span>}</span>;
}
export function TileCard({ tile, onClick, selected, price, affordable = true, badge, compact = false }: { tile: Tile; onClick: () => void; selected?: boolean; price?: number; affordable?: boolean; badge?: string; compact?: boolean }) {
  return <button type="button" className={`tile-card cat-${tile.category} ${selected ? 'selected' : ''}`} onClick={onClick} title={tile.name} aria-pressed={!!selected} aria-label={`${tile.name}${price !== undefined ? `, ${price} euros` : ''}`}>
    <div className="tile-picture"><TileArt tile={tile} /><span className={`level-badge symbol-${tile.track}`} title={`Recherche ${LABELS[tile.track]} : niveau ${tile.level}`}><SymbolIcon name={tile.track} size={11} />{tile.level}</span>{badge && <span className="new-badge">{badge}</span>}</div>
    <span className="tile-name">{tile.name}</span>{!compact && <TileStats tile={tile} />}
    {price !== undefined && <span className={`tile-price ${affordable ? '' : 'unaffordable'}`}>{price} <small>€</small></span>}
  </button>;
}
export function CategoryLabel({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category]; return <span className={`category-label cat-${category}`}><Icon size={13} />{CATEGORIES[category]}</span>;
}
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fermer" title="Fermer"><X size={20} /></button></div>{children}
  </dialog>;
}
export function Brand() { return <span className="brand"><Landmark size={27} strokeWidth={1.4} /><span>PROSPERITY<small>LE JEU DE PLATEAU</small></span></span>; }
