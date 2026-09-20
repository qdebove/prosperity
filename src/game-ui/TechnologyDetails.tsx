import { ArrowDown, Check, X } from 'lucide-react';
import { CategoryLabel, SymbolIcon, TileArt, TileStats } from '../components';
import { LABELS, SLOTS } from '../game/catalog';
import { legalSlots, POLLUTION_LIMIT, totals } from '../game/engine';
import { inspectPurchase, installedTileInfo, priceBreakdown, purchasePreview, type Availability } from '../game/presentation';
import { SYMBOLS, type GameState, type Tile } from '../game/types';
import { priceReason } from './ResearchBoard';

export default function TechnologyDetails({ G, tile, purchasing, slot, confirmedSlot, active, availability, showPriceHelp, onDismissPrice, onBuy, onClose, onChooseSlot }: {
  G: GameState; tile: Tile; purchasing: boolean; slot?: string; confirmedSlot?: string; active: boolean; availability?: Availability;
  showPriceHelp: boolean; onDismissPrice: () => void; onBuy: () => void; onClose: () => void; onChooseSlot: (slot: string) => void;
}) {
  const slots = legalSlots(G, tile);
  const target = slot ?? slots.find(id => !G.board[id]) ?? slots[0];
  const price = priceBreakdown(G, tile);
  const inspection = purchasing ? inspectPurchase(G, tile, target) : null;
  const next = inspection?.state;
  const possible = active && purchasing && !!purchasePreview(G, tile, target);
  const before = totals(G), after = next ? totals(next) : null;
  const old = target && purchasing ? G.board[target] : null;
  const relevant = SYMBOLS.filter(symbol => tile[symbol] !== 0 || old?.[symbol] || (after && before[symbol] !== after[symbol]));
  const installed = installedTileInfo(G, tile);
  const blockedSlots = SLOTS.filter(s => s.category === tile.category && !slots.includes(s.id));
  return <section className={`technology-details ${purchasing ? '' : 'inspecting'}`} aria-label="Détails de la technologie">
    <button className="icon-button details-close" onClick={onClose} aria-label="Fermer les détails"><X size={17} /></button>
    <div className="detail-identity"><TileArt tile={tile} /><CategoryLabel category={tile.category} /><h3>{tile.name}</h3></div>
    <p className={`detail-level symbol-${tile.track}`}><SymbolIcon name={tile.track} size={13} />{LABELS[tile.track]} · niveau {tile.level}{installed.slot && ` · case ${installed.slot.id.toUpperCase()}`}</p>
    {purchasing ? <>
      <div className="context-price"><strong>{price.price} €</strong><span>{priceReason(G, tile)}<small>Votre recherche : niveau {price.level}</small></span></div>
      <p className="price-breakdown">{price.premium ? `Base ${price.base} € + ${price.premium} € de surcoût (${price.difference} niveau${price.difference > 1 ? 'x' : ''} d’écart).` : price.price === 50 ? 'Tarif réduit : technologie sous votre niveau de recherche.' : 'Prix de base : aucun surcoût.'}</p>
      {price.premium > 0 && showPriceHelp && <div className="learning-note price-learning"><p>Chaque niveau au-dessus de votre recherche ajoute 100 €. Une case de recherche peut faire franchir un niveau.</p><button className="text-button" onClick={onDismissPrice}>Compris</button></div>}
      <TileStats tile={tile} />
      <p className="valid-locations">{tile.category === 'special' ? 'Projet ponctuel · aucun emplacement requis' : `Cases compatibles : ${slots.length ? slots.map(id => id.toUpperCase()).join(', ') : 'aucune'}.`}{blockedSlots.length > 0 && ` Accès fermé : ${blockedSlots.map(s => `${s.id.toUpperCase()} (transport en ${s.requires?.toUpperCase()})`).join(', ')}.`}</p>
      {slots.length > 0 && <div className="slot-choices" aria-label="Choix de l’emplacement">{slots.map(id => <button key={id} aria-label={`Prévisualiser en ${id.toUpperCase()}`} aria-pressed={confirmedSlot === id} onClick={() => onChooseSlot(id)}>{id.toUpperCase()}</button>)}</div>}
      {old && <p className="replacement-preview"><span>Retrait : {old.name}</span><ArrowDown size={14} /><strong>Installation : {tile.name}</strong></p>}
      {next && after && <><p className="preview-caption">{tile.category === 'special' ? 'Effet immédiat' : `Bilan de la nation · case ${target?.toUpperCase()}${confirmedSlot ? ' sélectionnée' : ' (aperçu)'}`}</p><table className="purchase-preview"><thead><tr><th>Ressource</th><th>Avant</th><th>Après</th></tr></thead><tbody>
        {relevant.map(symbol => <tr key={symbol} className={before[symbol] !== after[symbol] ? 'stat-changed' : ''}><th><SymbolIcon name={symbol} size={12} />{LABELS[symbol]}</th><td>{before[symbol]}</td><td>{after[symbol]}</td></tr>)}
        {inspection!.fundingNeeded ? <tr><th>Financement requis</th><td colSpan={2}>+{inspection!.fundingNeeded} € pour cet achat</td></tr> : <tr><th>Trésorerie</th><td>{G.money} €</td><td>{next.money} €</td></tr>}
        {next.pollution !== G.pollution && <tr><th>Pollution</th><td>{G.pollution}</td><td>{next.pollution}</td></tr>}
        {tile.effect === 'points' && <tr><th>Score{G.pollution >= POLLUTION_LIMIT ? ' (bloqué)' : ''}</th><td>{G.score}</td><td>{next.score}</td></tr>}
      </tbody></table></>}
      {purchasing && availability && !possible && <p className="purchase-hint">{!active ? 'Inspection · achat pendant vos actions.' : availability.reason}</p>}
      {possible && (tile.category === 'special' || confirmedSlot) ? <button className="purchase-confirm full-width" onClick={onBuy}>{tile.category === 'special' ? 'Réaliser le projet' : `${old ? 'Remplacer' : 'Construire'} en ${confirmedSlot?.toUpperCase()}`}<Check size={15} /></button> : possible && <p className="purchase-hint">Sélectionnez une case du territoire, puis confirmez ici.</p>}
      {possible && <p className="private-purchase">1 action · annulable avant validation du tour</p>}
    </> : <><TileStats tile={tile} /><p className="purchase-hint">{installed.slot ? 'Ces symboles contribuent au bilan de cette nation à chaque décompte correspondant.' : 'Technologie révélée pendant la partie.'}</p>
      {tile.category === 'transport' && installed.slot && <p className="purchase-hint">{tile.id === 'start-greenbelt' ? 'La ceinture verte ne débloque pas D1 et D2. Remplacez-la par un transport.' : SLOTS.some(s => s.requires === installed.slot!.id) ? 'Ouvre les accès aux infrastructures reliées à cette case.' : 'Ce transport ne commande aucun accès supplémentaire.'}</p>}
      {installed.slot && <p className="purchase-hint">{installed.replacements.length ? `Remplacement possible par ${installed.replacements.length} technologie${installed.replacements.length > 1 ? 's' : ''} du marché, selon votre trésorerie.` : 'Aucune technologie du marché ne peut actuellement remplacer ce bâtiment.'}</p>}
      {tile.decade > 0 && <p className="detail-level">{tile.decade} · Décompte {LABELS[tile.tally].toLowerCase()}</p>}
    </>}
  </section>;
}
