import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { createMultiplayerGame } from './game';
import type { CommandResult, Session } from './types';

const configuredServerURL = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.replace(/\/$/, '');
export const serverURL = configuredServerURL
  ?? (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 'http://127.0.0.1:8000' : '');
export function createNetworkClient(session: Session, numPlayers: number, onResult: (result: CommandResult) => void, onSync: () => void, onDisconnect: () => void) {
  const native = SocketIO({ server: serverURL || undefined });
  let transport: ReturnType<typeof native> | undefined;
  const client = Client({ game: createMultiplayerGame(), numPlayers, matchID: session.gameId, playerID: session.playerId,
    credentials: session.credentials, debug: false,
    multiplayer: opts => {
      transport = native(opts);
      const connect = transport.connect.bind(transport);
      transport.connect = () => {
        connect();
        transport!.socket.on('commandResult', onResult);
        transport!.socket.on('sync', onSync);
        transport!.socket.on('disconnect', onDisconnect);
        transport!.socket.on('connect_error', onDisconnect);
      };
      return transport;
    },
  });
  return { client, sync: () => transport?.requestSync() };
}
export type NetworkClient = ReturnType<typeof createNetworkClient>;
export type NetworkState = NonNullable<ReturnType<NetworkClient['client']['getState']>>;
