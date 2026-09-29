// Entrée Node détectable par Vercel ; l'implémentation reste isolée dans server/.
import Koa from 'koa';
import type { Server as HTTPServer } from 'node:http';
import { createMultiplayerServer } from './server/app.js';
import { serverConfig } from './server/config.js';

// Keep the framework import and the application export in this recognised
// entrypoint so Vercel can detect the Koa server hidden behind boardgame.io.
const config = serverConfig();
const multiplayer = createMultiplayerServer({ config });
const app = multiplayer.server.app;

if (!(app instanceof Koa) || !('server' in app)) throw new Error('Le serveur boardgame.io doit exposer une application Koa avec un serveur HTTP');
const httpServer = app.server as HTTPServer;

if (process.env.VERCEL !== '1') {
  await multiplayer.start();
  console.log(`Prosperity multijoueur : http://${config.host}:${config.port}`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void multiplayer.stop().then(() => process.exit(0)); });
  }
}

// Socket.IO is attached to this HTTP server. Vercel owns the listener in
// production, while the local branch above starts the same server itself.
export default httpServer;
