import { ArrowDown, Check, X } from 'lucide-react';
import { CategoryLabel, SymbolIcon, TileArt, TileStats } from '../components';
import { LABELS } from '../game/catalog';
import { legalSlots, levelAt, previewState, priceOf, totals } from '../game/engine';
import { SYMBOLS, type GameState, type Tile } from '../game/types';
import { priceReason } from './ResearchBoard';

export default function TechnologyDetails({ G, tile, purchasing, slot, active, onBuy, onClose }: { G: GameState; tile: Tile; purchasing: boolean; slot?: string; active: boolean; onBuy: () => void; onClose: () => void }) {
  const target = slot ?? legalSlots(G, tile).find(id => !G.board[id]) ?? legalSlots(G, tile)[0];
  const affordable = priceOf(G, tile) <= G.money;
  const possible = active && affordable && (tile.category === 'special' || !!target);
  // Hypothetical purchases use the engine's exact action path, including special projects.
  const next = purchasing && possible ? previewState({ ...G, plannedActions: [{ type: 'buy', tileId: tile.id, ...(target ? { slotId: target } : {}) }] }) : null;
  const before = totals(G), after = next ? totals(next) : null;
  const old = target && purchasing ? G.board[target] : null;
  const relevant = SYMBOLS.filter(symbol => tile[symbol] !== 0 || old?.[symbol] || (after && before[symbol] !== after[symbol]));
  return <section className={`technology-details ${purchasing ? '' : 'inspecting'}`} aria-label="Détails de la technologie">
    <button className="icon-button details-close" onClick={onClose} aria-label="Fermer les détails"><X size={17} /></button>
    <div className="detail-identity"><TileArt tile={tile} /><CategoryLabel category={tile.category} /><h3>{tile.name}</h3></div>
    <p className={`detail-level symbol-${tile.track}`}><SymbolIcon name={tile.track} size={13} />{LABELS[tile.track]} · niveau {tile.level}</p>
    {purchasing ? <><div className="context-price"><strong>{priceOf(G, tile)} €</strong><span>{priceReason(G, tile)}<small>Votre recherche : niveau {levelAt(G.research[tile.track])}</small></span></div>
      {!next && <TileStats tile={tile} />}
      {old && <p className="replacement-preview">{old.name}<ArrowDown size={14} /><strong>{tile.name}</strong></p>}
      {next && after && <><p className="preview-caption">{tile.category === 'special' ? 'Effet immédiat' : `Bilan de la nation · case ${target?.toUpperCase()}${slot ? '' : ' (aperçu)'}`}</p><table className="purchase-preview"><thead><tr><th>Ressource</th><th>Avant</th><th>Après</th></tr></thead><tbody>
        {relevant.map(symbol => <tr key={symbol} className={before[symbol] !== after[symbol] ? 'stat-changed' : ''}><th><SymbolIcon name={symbol} size={12} />{LABELS[symbol]}</th><td>{before[symbol]}</td><td>{after[symbol]}</td></tr>)}
        <tr><th>Trésorerie</th><td>{G.money} €</td><td>{next.money} €</td></tr>
        {next.pollution !== G.pollution && <tr><th>Pollution</th><td>{G.pollution}</td><td>{next.pollution}</td></tr>}
        {tile.effect === 'points' && <tr><th>Score{G.pollution >= 16 ? ' (bloqué)' : ''}</th><td>{G.score}</td><td>{next.score}</td></tr>}
      </tbody></table></>}
      {!possible ? <p className="purchase-hint">{!active ? 'Attendez la phase d’actions.' : !affordable ? 'Trésorerie insuffisante. Un revenu rapporte 100 €.' : 'Un transport doit ouvrir un emplacement compatible.'}</p> : tile.category === 'special' ? <button className="primary full-width" onClick={onBuy}>Réaliser le projet<Check size={14} /></button> : <p className="purchase-hint">Cliquez sur une case du territoire pour {old ? 'remplacer le bâtiment' : 'construire'}. Annulable avant validation du tour.</p>}
    </> : <><TileStats tile={tile} /><p className="purchase-hint">{tile.decade ? `${tile.decade} · Décompte ${LABELS[tile.tally].toLowerCase()}` : 'Bâtiment de votre nation'}</p></>}
  </section>;
}
