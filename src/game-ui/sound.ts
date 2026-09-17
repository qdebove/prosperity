export type GameSound = 'tile' | 'pawn' | 'disc' | 'coin';

// Add local, finished audio assets here when available. Silence is the default.
export const SOUND_ASSETS: Partial<Record<GameSound, string>> = {};
export const soundAvailable = Object.keys(SOUND_ASSETS).length > 0;

export function playGameSound(sound: GameSound, muted: boolean) {
  const source = SOUND_ASSETS[sound];
  if (muted || !source) return;
  const audio = new Audio(source);
  audio.volume = .3;
  void audio.play().catch(() => { /* Audio never blocks a game action. */ });
}
