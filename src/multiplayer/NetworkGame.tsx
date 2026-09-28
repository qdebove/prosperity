import { useEffect, useMemo, useRef, useState } from 'react';
import GameBoard from '../GameBoard';
import Rules from '../Rules';
import { Modal } from '../components';
import { persist } from '../storage';
import type { PlannedAction, Track } from '../game/types';
import { compatibleDraft, draftKey, emptyDraft, prepareAction } from './draft';
import { createNetworkClient, type NetworkClient, type NetworkState } from './client';
import { nationView } from './game';
import { errorMessage } from './messages';
import type { CommitPreparedTurnCommand, PreparedTurn, Session } from './types';
import { previewState } from '../game/engine';
import { isCommit } from './validation';

export default function NetworkGame({ session, numPlayers }: { session: Session; numPlayers: number }) {
  const [state, setState] = useState<NetworkState>();
  const [draft, setDraft] = useState<PreparedTurn>();
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [inspected, setInspected] = useState(session.playerId);
  const [rules, setRules] = useState(false);
  const [shownActions, setShownActions] = useState(2);
  const connection = useRef<NetworkClient | undefined>(undefined);
  const pending = useRef<CommitPreparedTurnCommand | undefined>(undefined);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const localKey = draftKey(session.gameId, session.playerId);
  const commandKey = `${localKey}.command`;
  useEffect(() => {
    const network = createNetworkClient(session, numPlayers, result => {
      clearTimeout(timeout.current); setBusy(false);
      if (result.code === 'OK' || result.code === 'DUPLICATE_COMMAND') {
        pending.current = undefined; localStorage.removeItem(commandKey);
      } else { setMessage(errorMessage[result.code]); network.sync(); }
    }, () => setSynced(true), () => { setSynced(false); setBusy(false); });
    connection.current = network;
    const unsubscribe = network.client.subscribe(next => {
      if (!next) return;
      setState(next);
      if (!next.isConnected) return;
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(localKey) ?? 'null');
        if (compatibleDraft(saved, next.G, next.ctx, next._stateID, session.playerId)) setDraft(saved);
        else {
          if (saved && next.G.lastCommit?.playerId !== session.playerId) setMessage(errorMessage.STALE_DRAFT);
          localStorage.removeItem(localKey); setDraft(undefined);
        }
        const cmd: unknown = JSON.parse(localStorage.getItem(commandKey) ?? 'null');
        if (isCommit(cmd) && compatibleDraft(cmd, next.G, next.ctx, next._stateID, session.playerId)
          && compatibleDraft(saved, next.G, next.ctx, next._stateID, session.playerId) && JSON.stringify(cmd.actions) === JSON.stringify(saved.actions)) pending.current = cmd;
        else { pending.current = undefined; localStorage.removeItem(commandKey); }
      } catch { setMessage('La préparation locale n’a pas pu être récupérée. L’état officiel est conservé.'); setDraft(undefined); }
    });
    network.client.start();
    return () => { clearTimeout(timeout.current); unsubscribe(); network.client.stop(); };
  }, [session, numPlayers, localKey, commandKey]);
  const G = state?.G;
  useEffect(() => {
    if (!G?.lastCommit) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShownActions(2); return; }
    setShownActions(1);
    const timer = setTimeout(() => setShownActions(2), 650);
    return () => clearTimeout(timer);
  }, [G?.lastCommit?.commandId]);
  const validDraft = state && draft && compatibleDraft(draft, state.G, state.ctx, state._stateID, session.playerId) ? draft : undefined;
  const view = useMemo(() => G ? { ...nationView(G, inspected), plannedActions: inspected === session.playerId ? validDraft?.actions ?? [] : [] } : undefined, [G, inspected, validDraft]);
  if (!state || !G || !view) return <main className="multiplayer-lobby"><h1>Connexion à la table…</h1><p>{message || 'Récupération de la partie officielle.'}</p><a href="/multiplayer">Retour aux parties</a></main>;
  const name = (id: string) => G.participants.find(p => p.playerId === id)?.displayName ?? id;
  const online = state.isConnected && synced;
  const current = state.ctx.currentPlayer;
  const authorized = G.pendingDecision ? G.pendingDecision.playerId === session.playerId : current === session.playerId;
  const enabled = online && !busy && authorized && inspected === session.playerId;
  const waiting = !online ? 'Connexion interrompue. Votre préparation reste privée et sera vérifiée à la reconnexion.' : busy ? 'Validation en cours…' : inspected !== session.playerId ? `Territoire de ${name(inspected)} · consultation` : G.pendingDecision ? `En attente du décompte de ${name(G.pendingDecision.playerId)}` : `Tour de ${name(current)} · en attente du joueur actif`;
  function saveDraft(next: PreparedTurn) {
    try { persist(localKey, next); localStorage.removeItem(commandKey); pending.current = undefined; setDraft(next); }
    catch (error) { setMessage((error as Error).message); }
  }
  function prepare(action: PlannedAction) {
    if (!enabled || !state || !G || G.shared.phase !== 'actions') return;
    try { saveDraft(prepareAction(validDraft ?? emptyDraft(G, state.ctx, state._stateID, session.playerId), G, action)); }
    catch { setMessage(errorMessage.INVALID_ACTION); }
  }
  function send(move: string, ...args: unknown[]) {
    if (!enabled) return;
    setBusy(true); setMessage('');
    connection.current!.client.moves[move](...args);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => { setBusy(false); setMessage('La réponse tarde. L’état officiel est demandé à nouveau ; vous pourrez réessayer la même validation.'); connection.current?.sync(); }, 8000);
  }
  const moves = {
    income: () => prepare({ type: 'income' }), cleanup: () => prepare({ type: 'cleanup' }),
    research: (track: Track) => prepare({ type: 'research', track }), buy: (tileId: string, slotId?: string) => prepare({ type: 'buy', tileId, ...(slotId ? { slotId } : {}) }),
    undoPlan: () => { if (enabled && validDraft) saveDraft({ ...validDraft, actions: validDraft.actions.slice(0, -1) }); },
    resetPlan: () => { if (enabled && validDraft) saveDraft({ ...validDraft, actions: [] }); },
    commit: () => {
      if (!enabled || validDraft?.actions.length !== 2) return;
      const command = pending.current && JSON.stringify(pending.current.actions) === JSON.stringify(validDraft.actions)
        ? pending.current : { ...validDraft, commandId: crypto.randomUUID() };
      try { persist(commandKey, command); pending.current = command; send('commitPreparedTurn', command); } catch (error) { setMessage((error as Error).message); }
    },
    draw: () => send('draw'), nextFinal: () => send('nextFinal'),
    resolveEnergy: (value: number) => send('resolveDecision', G.pendingDecision?.id, value),
    resolveResearch: (value: number) => send('resolveDecision', G.pendingDecision?.id, value),
  };
  const ownPreview = previewState({ ...nationView(G, session.playerId), plannedActions: validDraft?.actions ?? [] });
  const markers = G.participants.flatMap((p, index) => (['energy', 'ecology'] as Track[]).map(track => ({ id: `${p.playerId}-${track}`, label: `${index + 1}. ${p.displayName}`, track,
    position: p.playerId === session.playerId ? ownPreview.research[track] : G.players[p.playerId].research[track], playerNumber: index + 1, own: p.playerId === session.playerId })));
  return <main className="network-table" data-revision={state._stateID} data-phase={G.shared.phase}>
    <nav className="network-bar" aria-label="Table multijoueur"><a href="/multiplayer">Tables</a><strong data-testid="active-player" data-player-id={current}>Tour de {name(current)}</strong><span className={online ? 'connected' : 'disconnected'} role="status">{online ? 'Connecté' : 'Reconnexion…'}</span>
      <label>Nation<select aria-label="Nation à consulter" value={inspected} onChange={e => setInspected(e.target.value)}>{G.participants.map(p => <option key={p.playerId} value={p.playerId}>{p.displayName}{p.playerId === session.playerId ? ' (vous)' : ''}</option>)}</select></label>
      <div className="network-presence">{G.participants.map((p, i) => <span key={p.playerId} title={`${p.displayName} · ${connection.current?.client.matchData?.find(m => String(m.id) === p.playerId)?.isConnected ? 'connecté' : 'hors ligne'}`} className={`nation-badge nation-color-${i}`}>{i + 1}<span className="sr-only">{p.displayName}</span></span>)}</div>
      <button className="text-button" onClick={() => setRules(true)}>Règles</button></nav>
    {message && <div className="network-notice" role="alert">{message}<button onClick={() => { connection.current?.sync(); setMessage(''); }}>Actualiser</button></div>}
    <div className="network-board"><GameBoard key={inspected} committed={view} moves={moves} onNew={() => location.assign('/multiplayer')} enabled={enabled} waitingMessage={waiting} markers={markers} nations={G.participants.map(p => ({ id: p.playerId, name: p.displayName, own: p.playerId === session.playerId, state: p.playerId === session.playerId ? ownPreview : nationView(G, p.playerId) }))} context={{ nation: name(inspected), ownNation: inspected === session.playerId, activePlayer: name(current), decisionPlayer: G.pendingDecision ? name(G.pendingDecision.playerId) : undefined, remainingTallies: G.tallyQueue.length + (G.pendingDecision ? 1 : 0), players: G.participants.length }} /></div>
    {G.lastCommit && <aside className="committed-replay" aria-label="Dernier tour validé" aria-live="polite"><strong>{name(G.lastCommit.playerId)} a validé</strong><ol>{G.lastCommit.descriptions.map((text, i) => <li key={`${G.lastCommit!.commandId}-${i}`} className={i < shownActions ? 'visible' : ''}>{text}</li>)}</ol></aside>}
    {G.ranking.length > 0 && <aside className="network-ranking"><h2>Classement final</h2><ol>{G.ranking.map(p => <li key={p.playerId}>{p.rank}. {name(p.playerId)} · {p.score} points · {p.money} €</li>)}</ol></aside>}
    {rules && <Modal title="Règles de la table multijoueur" wide onClose={() => setRules(false)}><p>Les décomptes concernent toutes les nations, à partir du joueur actif. À la fin, chaque piste de recherche rapporte 3 points au premier et 1 au deuxième ; premiers ex æquo : 2 chacun, sans deuxième ; deuxièmes ex æquo : aucun point. La pollution critique bloque ces points. La trésorerie départage le score final.</p><Rules /></Modal>}
  </main>;
}
