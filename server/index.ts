import { createMultiplayerServer } from './app.js';
import { serverConfig } from './config.js';

const config = serverConfig();
const app = createMultiplayerServer({ config });
await app.start();
console.log(`Prosperity multijoueur : http://${config.host}:${config.port}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.stop().then(() => process.exit(0)); });
