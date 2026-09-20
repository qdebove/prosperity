import { useState } from 'react';

const KEY = 'prosperity.learning.v1';
interface Preferences { enabled: boolean; seen: string[] }
export default function useLearning() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (typeof saved?.enabled === 'boolean' && Array.isArray(saved.seen)) return saved;
    } catch { /* Optional preferences never prevent playing. */ }
    return { enabled: true, seen: [] };
  });
  function save(next: Preferences) {
    setPreferences(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Keep this session's preference. */ }
  }
  return { enabled: preferences.enabled, unseen: (id: string) => preferences.enabled && !preferences.seen.includes(id),
    dismiss: (id: string) => save({ ...preferences, seen: [...preferences.seen, id] }),
    toggle: () => save({ ...preferences, enabled: !preferences.enabled }) };
}
