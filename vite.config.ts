import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()], server: { proxy: {
  '/api': { target: process.env.MULTIPLAYER_TARGET ?? 'http://127.0.0.1:8000' },
  '/socket.io': { target: process.env.MULTIPLAYER_TARGET ?? 'http://127.0.0.1:8000', ws: true },
} } });
