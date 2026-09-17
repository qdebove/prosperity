import { useEffect, useState } from 'react';
import { Brand } from '../components';
import { readCatalog } from '../storage';
import { serverURL } from './client';
import { errorMessage } from './messages';
import { readSession, saveSession } from './session';
import { PROTOCOL_VERSION, type Lobby, type MultiplayerErrorCode, type Session } from './types';
import NetworkGame from './NetworkGame';
import './multiplayer.css';

export async function lobbyRequest<T>(path: string, body?: object, session?: Session): Promise<T> {
  const response = await fetch(`${serverURL}/api/lobbies${path}`, { method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session ? { Authorization: `Bearer ${session.credentials}`, 'X-Player-ID': session.playerId } : {}) },
    ...(body ? { body: JSON.stringify({ ...body, protocolVersion: PROTOCOL_VERSION }) } : {}), signal: AbortSignal.timeout(8000) });
  let data;
  try { data = await response.json(); } catch { throw new Error('Le serveur multijoueur ne répond pas correctement. Vérifiez son adresse et réessayez.'); }
  if (!response.ok) throw new Error(errorMessage[data.code as MultiplayerErrorCode] ?? 'Le serveur est indisponible.');
  return data;
}
export default function Multiplayer() {
  const gameId = /^\/game\/([a-zA-Z0-9_-]{1,80})\/?$/.exec(location.pathname)?.[1] ?? '';
  const [session, setSession] = useState(() => readSession(gameId));
  const [lobby, setLobby] = useState<Lobby>();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [custom, setCustom] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!gameId) return;
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try { const next = await lobbyRequest<Lobby>(`/${gameId}`); if (alive) { setLobby(next); setMessage(''); } }
      catch (error) { if (alive) setMessage(error instanceof Error && !['TypeError', 'TimeoutError'].includes(error.name) ? error.message : 'Connexion au serveur indisponible. Nouvelle tentative…'); }
      if (alive) timer = setTimeout(refresh, 1500);
    };
    void refresh();
    return () => { alive = false; clearTimeout(timer); };
  }, [gameId]);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error && !['TypeError', 'TimeoutError'].includes(error.name) ? error.message : 'Impossible de joindre le serveur multijoueur.'); }
    finally { setBusy(false); }
  }
  async function enter(create: boolean) {
    const result = await lobbyRequest<{ lobby: Lobby; session: Session }>(create ? '' : `/${gameId}/join`, { displayName: name, ...(create && custom ? { catalog: readCatalog() } : {}) });
    saveSession(result.session);
    if (create) location.assign(`/game/${result.session.gameId}`);
    else { setSession(result.session); setLobby(result.lobby); }
  }
  if (lobby && lobby.status !== 'LOBBY' && session) return <NetworkGame session={session} numPlayers={lobby.players.length} />;
  return <main className="multiplayer-lobby"><a href="/" aria-label="Retour au solo"><Brand /></a><span className="eyebrow">UNE TABLE PARTAGÉE</span>
    <h1>{gameId ? 'Votre partie multijoueur' : 'Fonder des nations ensemble'}</h1>
    <p>Deux à quatre joueurs. Chacun prépare ses deux actions en privé, puis valide son tour.</p>
    {message && <p className="notice" role="alert">{message}</p>}
    {!gameId ? <>
      <form onSubmit={e => { e.preventDefault(); void perform(() => enter(true)); }}><label>Votre nom<input required maxLength={32} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} />Utiliser mon catalogue personnalisé</label>
        <button className="primary" disabled={busy}>Créer une partie</button></form>
      <form onSubmit={e => { e.preventDefault(); const id = /(?:\/game\/)?([a-zA-Z0-9_-]{1,80})\/?$/.exec(code.trim())?.[1]; if (id) location.assign(`/game/${id}`); else setMessage('Saisissez un code ou un lien de partie valide.'); }}>
        <label>Code ou lien de partie<input required value={code} onChange={e => setCode(e.target.value)} /></label><button className="secondary">Rejoindre une partie</button></form>
      <a href="/">Continuer ma partie solo</a>
    </> : <>
      <label>Lien à partager<input readOnly value={`${location.origin}/game/${gameId}`} onFocus={e => e.currentTarget.select()} /></label>
      <button className="secondary" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/game/${gameId}`).then(() => setCopied(true)).catch(() => setMessage('Sélectionnez et copiez le lien ci-dessus.')); }}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
      {lobby && <><ol className="lobby-players" aria-label="Joueurs du salon">{lobby.players.map((p, i) => <li key={p.playerId}><span className={`nation-badge nation-color-${i}`}>{i + 1}</span><strong>{p.displayName}{p.playerId === session?.playerId ? ' (vous)' : ''}</strong><span>{p.ready ? 'Prêt' : 'En préparation'}</span></li>)}</ol><p>{lobby.custom ? 'Catalogue personnalisé' : 'Catalogue classique'} · Le premier joueur sera tiré au sort.</p></>}
      {!session ? lobby?.status === 'LOBBY' && <form onSubmit={e => { e.preventDefault(); void perform(() => enter(false)); }}><label>Votre nom<input required maxLength={32} value={name} onChange={e => setName(e.target.value)} /></label><button className="primary" disabled={busy}>Prendre place</button></form>
        : <div className="lobby-buttons"><button className="secondary" disabled={busy || !lobby} onClick={() => void perform(async () => setLobby(await lobbyRequest<Lobby>(`/${gameId}/ready`, { ready: !lobby?.players.find(p => p.playerId === session.playerId)?.ready }, session)))}>{lobby?.players.find(p => p.playerId === session.playerId)?.ready ? 'Je ne suis plus prêt' : 'Je suis prêt'}</button>
          {session.playerId === lobby?.hostId && <button className="primary" disabled={busy || lobby.players.length < 2 || lobby.players.some(p => !p.ready)} onClick={() => void perform(async () => setLobby(await lobbyRequest<Lobby>(`/${gameId}/start`, {}, session)))}>Lancer la partie</button>}</div>}
      {lobby?.status !== 'LOBBY' && !session && <p>La partie a commencé. Retrouvez votre place avec le navigateur utilisé pour la rejoindre.</p>}
      <a href="/multiplayer">Autre partie</a>
    </>}
  </main>;
}
