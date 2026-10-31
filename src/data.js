/** Crescentwick Academy — original lore & game data (no franchise IP). */

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

export const SPELLS = {
  sparkbolt: {
    id: 'sparkbolt', name: 'Sparkbolt', kind: 'attack',
    desc: 'A swift arc of golden energy. Your first taught charm.',
    dmg: 14, stamina: 8, cd: 0.35, range: 28, speed: 42,
    color: 0xffe08a, icon: '✦', unlock: 0,
  },
  aegis: {
    id: 'aegis', name: 'Aegis Veil', kind: 'shield',
    desc: 'Raise a shimmering ward. Perfect parry timing reflects bolts.',
    dmg: 0, stamina: 12, cd: 0.8, duration: 1.6,
    color: 0x88ccff, icon: '⛨', unlock: 1,
  },
  wandrift: {
    id: 'wandrift', name: 'Wandrift', kind: 'disarm',
    desc: 'Yank an opponent\'s wand aside and interrupt their cast.',
    dmg: 6, stamina: 18, cd: 4.5, range: 18, interrupt: true,
    color: 0xd0a0ff, icon: '↺', unlock: 2,
  },
  hovercharm: {
    id: 'hovercharm', name: 'Hovercharm', kind: 'levitate',
    desc: 'Lift yourself or a target briefly into the air.',
    dmg: 0, stamina: 16, cd: 5, duration: 2.2,
    color: 0xa0e8c0, icon: '⤒', unlock: 2,
  },
  stunflare: {
    id: 'stunflare', name: 'Stunflare', kind: 'stun',
    desc: 'A blinding flash that freezes foes mid-step.',
    dmg: 8, stamina: 20, cd: 6, range: 14, stun: 1.4,
    color: 0xffffff, icon: '✧', unlock: 3,
  },
  cinderlash: {
    id: 'cinderlash', name: 'Cinderlash', kind: 'fire',
    desc: 'A whipping arc of flame. Hits in a short cone.',
    dmg: 22, stamina: 22, cd: 3.2, range: 12, cone: 50,
    color: 0xff6622, icon: '🔥', unlock: 4,
  },
  frostneedle: {
    id: 'frostneedle', name: 'Frostneedle', kind: 'ice',
    desc: 'Icy shards that slow movement and cast speed.',
    dmg: 12, stamina: 14, cd: 2.4, range: 26, speed: 38, slow: 0.45, slowDur: 2,
    color: 0xaad8ff, icon: '❄', unlock: 5,
  },
  thundercoil: {
    id: 'thundercoil', name: 'Thundercoil', kind: 'lightning',
    desc: 'Chain lightning that leaps between nearby foes.',
    dmg: 18, stamina: 28, cd: 7, range: 20, chains: 3,
    color: 0xb8a0ff, icon: '⚡', unlock: 6,
  },
  blinkstep: {
    id: 'blinkstep', name: 'Blinkstep', kind: 'mobility',
    desc: 'Dash a short distance with a flicker of starlight. Brief i-frames.',
    dmg: 0, stamina: 14, cd: 3.5, dist: 7,
    color: 0xfff0c0, icon: '⇢', unlock: 3,
  },
  hexbind: {
    id: 'hexbind', name: 'Hexbind', kind: 'control',
    desc: 'Root a foe in glowing runes. Breaks on heavy hits.',
    dmg: 4, stamina: 18, cd: 8, range: 16, root: 1.8,
    color: 0x66ff99, icon: '◎', unlock: 7,
  },
};

export const SPELL_ORDER = Object.keys(SPELLS);

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
];

export const DUELISTS = [
  { id: 'rook', name: 'Rook Ashen', house: 'emberforge', lvl: 2, spells: ['sparkbolt', 'aegis'], hp: 80, style: 'aggressive' },
  { id: 'mira', name: 'Mira Quill', house: 'mistvale', lvl: 4, spells: ['sparkbolt', 'aegis', 'wandrift', 'frostneedle'], hp: 110, style: 'tricky' },
  { id: 'vale', name: 'Captain Vale', house: 'stormcrown', lvl: 7, spells: ['sparkbolt', 'aegis', 'cinderlash', 'thundercoil', 'blinkstep', 'hexbind'], hp: 160, style: 'champion' },
  { id: 'bramble', name: 'Bramble Moss', house: 'rootkeep', lvl: 5, spells: ['sparkbolt', 'aegis', 'stunflare', 'hovercharm'], hp: 130, style: 'tank' },
];

export const MAX_HP = 100;
export const MAX_STAMINA = 100;
export const HIT_CAP = 0.35; // max fraction of max HP per hit outside duel climax
