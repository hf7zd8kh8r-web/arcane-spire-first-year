/** Crescentwick Academy — original lore & game data (no franchise IP). */
export { SPELLS, SPELL_ORDER, SPELL_COUNT } from './spells200.js';
import { SPELLS as _SPELLS } from './spells200.js';

export const SCHOOL = {
  name: 'Crescentwick Academy',
  motto: 'By Moon and Ember, We Rise',
  title: 'Arcane Spire',
  subtitle: 'First Year',
};

export const HOUSES = {
  emberforge: {
    id: 'emberforge', name: 'Emberforge',
    trait: 'Courage & Passion', animal: 'Phoenix-lion',
    colors: { primary: 0xc43c2a, secondary: 0xe8b84a, robe: 0x8a2418, trim: 0xd4a030 },
    crest: '🔥', motto: 'Strike True',
    common: { x: -42, y: 8, z: -38 },
  },
  mistvale: {
    id: 'mistvale', name: 'Mistvale',
    trait: 'Wit & Curiosity', animal: 'Silver otter',
    colors: { primary: 0x2a8a8a, secondary: 0xc8d4dc, robe: 0x1a5555, trim: 0xa8c0c8 },
    crest: '🌊', motto: 'See Beyond',
    common: { x: 42, y: 8, z: -38 },
  },
  rootkeep: {
    id: 'rootkeep', name: 'Rootkeep',
    trait: 'Loyalty & Craft', animal: 'Oak stag',
    colors: { primary: 0x2d6b3f, secondary: 0xb07840, robe: 0x1a4028, trim: 0xa06830 },
    crest: '🌿', motto: 'Stand Firm',
    common: { x: -42, y: 8, z: 42 },
  },
  stormcrown: {
    id: 'stormcrown', name: 'Stormcrown',
    trait: 'Ambition & Insight', animal: 'Night raptor',
    colors: { primary: 0x4a3a8a, secondary: 0xe8e4f0, robe: 0x2a2050, trim: 0xd0c8e0 },
    crest: '⚡', motto: 'Rise Higher',
    common: { x: 42, y: 8, z: 42 },
  },
};

export const QUESTS = [
  { id: 'sort', name: 'The Sorting', type: 'main', desc: 'Stand before the Crescent Mirror and join a house.', steps: ['Visit the Great Hall', 'Complete Sorting'] },
  { id: 'first_lesson', name: 'First Charms', type: 'main', desc: 'Learn Sparkbolt from Tutor Brindle in the Charms wing.', steps: ['Find Tutor Brindle', 'Cast Sparkbolt 5 times', 'Return to Brindle'] },
  { id: 'aegis_trial', name: 'Raise Your Ward', type: 'main', desc: 'Master Aegis Veil and survive a practice bout.', steps: ['Learn Aegis Veil', 'Block 3 bolts', 'Win a practice duel'] },
  { id: 'duel_club', name: 'Duel Club', type: 'main', desc: 'Prove yourself against escalating club opponents.', steps: ['Beat Rook', 'Beat Mira', 'Beat Captain Vale'] },
  { id: 'broom_basics', name: 'Wings of Wood', type: 'side', desc: 'Borrow a practice broom and complete a flight circuit.', steps: ['Find the Pitch', 'Complete the circuit'] },
  { id: 'aetherchase', name: 'Aetherchase Tryouts', type: 'side', desc: 'Score 3 goals in a practice Aetherchase match.', steps: ['Join a match', 'Score 3 goals'] },
  { id: 'secret_stair', name: 'The Whispering Stair', type: 'secret', desc: 'Rumors speak of a stair that only appears at dusk… or when a certain painting is touched.', steps: ['Find the hidden stair', 'Enter the Whisper Vault'] },
  { id: 'bookshelf', name: 'Behind the Lexicon', type: 'secret', desc: 'Pull the right book in the Restricted Annex.', steps: ['Find the annex', 'Open the passage'] },
  { id: 'lake_ruin', name: 'Mirror Lake Ruin', type: 'secret', desc: 'Something glints under the lake\'s surface near the north shore.', steps: ['Reach the lake', 'Dive the ruin', 'Claim the relic'] },
  { id: 'forest_edge', name: 'Edgewood Watch', type: 'side', desc: 'Clear mist wisps from the forest edge for Keeper Rowan.', steps: ['Talk to Rowan', 'Clear 8 wisps', 'Report back'] },
  { id: 'timetable', name: 'Know Your Hours', type: 'main', desc: 'Ask classmates for the timetable, then attend Charms.', steps: ['Talk to a classmate', 'Attend Morning Charms', 'Avoid skipping'] },
  { id: 'beast_friend', name: 'First Companion', type: 'side', desc: 'Tame a wild creature and rescue a plant.', steps: ['Tame a creature', 'Rescue a plant'] },
];

export const DUELISTS = [
  { id: 'rook', name: 'Rook Ashen', house: 'emberforge', lvl: 2, spells: ['sparkbolt', 'aegis'], hp: 80, style: 'aggressive' },
  { id: 'mira', name: 'Mira Quill', house: 'mistvale', lvl: 4, spells: ['sparkbolt', 'aegis', 'wandrift', 'frostneedle'], hp: 110, style: 'tricky' },
  { id: 'vale', name: 'Captain Vale', house: 'stormcrown', lvl: 7, spells: ['sparkbolt', 'aegis', 'cinderlash', 'thundercoil', 'blinkstep', 'hexbind'], hp: 160, style: 'champion' },
  { id: 'bramble', name: 'Bramble Moss', house: 'rootkeep', lvl: 5, spells: ['sparkbolt', 'aegis', 'stunflare', 'hovercharm'], hp: 130, style: 'tank' },
];

export const MAX_HP = 100;
export const MAX_STAMINA = 100;
export const HIT_CAP = 0.35;

/** Hotbar: first 8 combat-ready originals always preferred when known. */
export const HOTBAR_PREF = ['sparkbolt', 'aegis', 'wandrift', 'hovercharm', 'stunflare', 'cinderlash', 'frostneedle', 'blinkstep'];

export function spellById(id) { return _SPELLS[id]; }
