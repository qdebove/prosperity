// Entrée Node détectable par Vercel ; l'implémentation reste isolée dans server/.
import Koa from 'koa';
import { createMultiplayerServer } from './server/app';
import { serverConfig } from './server/config';

// Keep the framework import and the application export in this recognised
// entrypoint so Vercel can detect the Koa server hidden behind boardgame.io.
const config = serverConfig();
const multiplayer = createMultiplayerServer({ config });
const app = multiplayer.server.app;

if (!(app instanceof Koa)) throw new Error('Le serveur boardgame.io doit exposer une application Koa');

await multiplayer.start();
console.log(`Prosperity multijoueur : http://${config.host}:${config.port}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void multiplayer.stop().then(() => process.exit(0)); });
}

export default app;
