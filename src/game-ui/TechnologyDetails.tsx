import { Check } from 'lucide-react';
import { CategoryLabel, SymbolIcon, TileArt, TileStats } from '../components';
import { LABELS } from '../game/catalog';
import { legalSlots, priceOf, totals } from '../game/engine';
import { inspectPurchase, priceBreakdown, purchasePreview } from '../game/presentation';
import { SYMBOLS, type GameState, type Tile } from '../game/types';
import { priceReason } from './ResearchBoard';

export default function TechnologyDetails({ G, tile, slot, active, targetSlot, onBuy, onChooseSlot }: {
  G: GameState; tile: Tile; slot?: string; active: boolean; targetSlot?: string;
  onBuy: () => void; onChooseSlot: (slot: string) => void;
}) {
  const slots = legalSlots(G, tile);
  const price = priceBreakdown(G, tile);
  const inspection = inspectPurchase(G, tile, slot);
  const next = inspection?.state;
  const before = totals(G), after = next ? totals(next) : null;
  const old = slot ? G.board[slot] : null;
  const possible = active && (tile.category === 'special' || !!slot) && !!purchasePreview(G, tile, slot);
  const reason = !active ? 'Achat disponible pendant vos actions.'
    : targetSlot && !slots.includes(targetSlot) ? `Cette tuile ne peut pas être installée en ${targetSlot.toUpperCase()}.`
    : priceOf(G, tile) > G.money ? `Fonds insuffisants : il manque ${price.price - G.money} €.`
    : tile.category !== 'special' && !slots.length ? 'Aucun emplacement accessible.'
    : tile.category !== 'special' && !slot ? 'Choisissez un emplacement pour voir le bilan.' : '';
  return <section className="technology-details" aria-label="Détails de la technologie">
    <div className="detail-identity"><TileArt tile={tile} /><div><CategoryLabel category={tile.category} /><p className={`detail-level symbol-${tile.track}`}><SymbolIcon name={tile.track} size={15} />{LABELS[tile.track]} · niveau {tile.level}</p><TileStats tile={tile} /></div></div>
    <div className="context-price"><strong>{price.price} €</strong><span>{priceReason(G, tile)}<small>{price.premium ? `Base ${price.base} € + ${price.premium} € de surcoût` : price.price === 50 ? 'Tarif réduit' : 'Sans surcoût'}</small></span></div>
    {tile.category === 'special' ? <p className="purchase-hint">Projet ponctuel · aucun emplacement requis</p> : <div className="slot-choices" aria-label="Choix de l’emplacement">{slots.map(id => <button key={id} aria-label={`Prévisualiser en ${id.toUpperCase()}`} aria-pressed={slot === id} disabled={!!targetSlot && id !== targetSlot} onClick={() => onChooseSlot(id)}>{id.toUpperCase()}</button>)}</div>}
    {old && <p className="replacement-preview"><span>Retrait : {old.name}</span><strong>Installation : {tile.name}</strong></p>}
    {next && after && <><p className="preview-caption">{tile.category === 'special' ? 'Effet immédiat' : `Bilan de la nation · case ${slot?.toUpperCase()} sélectionnée`}</p><table className="purchase-preview"><thead><tr><th>Ressource</th><th>Avant</th><th>Après</th></tr></thead><tbody>
      {SYMBOLS.filter(s => tile[s] || old?.[s]).map(symbol => <tr key={symbol} className={before[symbol] !== after[symbol] ? 'stat-changed' : ''}><th><SymbolIcon name={symbol} size={13} />{LABELS[symbol]}<small>{old?.[symbol] ? `Retiré : ${old[symbol]} · ` : ''}Ajouté : {tile[symbol]}</small></th><td>{before[symbol]}</td><td>{after[symbol]}</td></tr>)}
      <tr><th>Trésorerie</th><td>{G.money} €</td><td>{G.money - price.price} €</td></tr>
      {next.pollution !== G.pollution && <tr><th>Pollution</th><td>{G.pollution}</td><td>{next.pollution}</td></tr>}
      {next.score !== G.score && <tr><th>Prospérité</th><td>{G.score} PP</td><td>{next.score} PP</td></tr>}
    </tbody></table></>}
    {reason && <p className="purchase-hint" role="status">{reason}</p>}
    <button disabled={!possible || !!targetSlot && !slots.includes(targetSlot)} className="purchase-confirm full-width" onClick={onBuy}>{tile.category === 'special' ? 'Réaliser le projet' : slot ? `${old ? 'Remplacer' : 'Construire'} en ${slot.toUpperCase()}` : 'Choisir un emplacement'}<Check size={16} /></button>
    <p className="private-purchase">1 action · annulable avant validation du tour</p>
  </section>;
}
