'use client';

import dynamic from 'next/dynamic';

const SoloApp = dynamic(() => import('../App'), { ssr: false });
const MultiplayerApp = dynamic(() => import('../multiplayer/Multiplayer'), { ssr: false });

export default function ProsperityApp({ mode }: { mode: 'solo' | 'multiplayer' }) {
  return mode === 'solo' ? <SoloApp /> : <MultiplayerApp />;
}
