import { MAX_HP, MAX_STAMINA, HOUSES } from './data.js';

const KEY = 'asfy_save_v1';

export function newSave(name, house) {
  return {
    name: (name || 'First-Year').slice(0, 16),
    house: house || null,
    look: { skin: 0, hair: 0 },
    lvl: 1, xp: 0,
    hp: MAX_HP, maxHp: MAX_HP,
    stamina: MAX_STAMINA,
    spells: ['sparkbolt'],
    quests: null,
    secrets: [],
    relics: 0,
    stats: { duels: 0, time: 0, wisps: 0 },
    sorted: false,
    savedAt: Date.now(),
  };
}

export function save(S) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...S, savedAt: Date.now() })); } catch (_) {}
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

export function clear() { try { localStorage.removeItem(KEY); } catch (_) {} }
