import { THREE, Builder, mat } from './engine.js';
import { HOUSES } from './data.js';

const STONE = 0x8a8490, STONE2 = 0x6e6874, STONE3 = 0xa09890, STONE4 = 0x7a7480;
const ROOF = 0x4a3048, ROOF2 = 0x3a2038, ROOF3 = 0x5a3858;
const WOOD = 0x6a4828, WOOD2 = 0x5a3820, WOOD3 = 0x8a6038;
const GOLD = 0xc8a050, GLASS = 0x88b0d0, GLASS2 = 0xa8d0e8;
const GRASS = 0x3a6a38, GRASS2 = 0x2a5528, GRASS3 = 0x4a7a40, PATH = 0x9a8a70, PATH2 = 0x8a7a60;
const WATER = 0x2a6090, IVY = 0x2a5a28;

function battlement(B, x, y, z, len, alongX = true) {
  const n = Math.floor(len / 2.2);
  for (let i = 0; i < n; i++) {
    const o = -len / 2 + 1.1 + i * 2.2;
    if (alongX) B.box(1.2, 1.4, 1.0, STONE2, mat(x + o, y + 0.7, z), { mat: 'stoneDark' });
    else B.box(1.0, 1.4, 1.2, STONE2, mat(x, y + 0.7, z + o), { mat: 'stoneDark' });
  }
}

function tower(B, x, z, h = 18, r = 3.2, roofH = 5, accent = ROOF) {
  B.cyl(r, r * 1.08, h, STONE, mat(x, h / 2, z), { mat: 'stone', seg: 14 });
  B.cyl(r * 1.12, r * 1.12, 0.45, STONE2, mat(x, h * 0.35, z), { mat: 'stoneDark', seg: 14 });
  B.cyl(r * 1.14, r * 1.14, 0.55, STONE2, mat(x, h, z), { mat: 'stoneDark', seg: 14 });
  B.cyl(r * 1.35, r * 1.35, 0.35, STONE3, mat(x, h * 0.72, z), { mat: 'stone', seg: 14 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    B.box(0.35, 0.9, 0.35, STONE2, mat(x + Math.cos(a) * r * 1.25, h * 0.72 + 0.6, z + Math.sin(a) * r * 1.25), { mat: 'stoneDark' });
  }
  B.cone(r * 1.45, roofH, accent, mat(x, h + roofH / 2, z), { mat: 'roof', seg: 14 });
  B.sphere(0.28, GOLD, mat(x, h + roofH + 0.25, z), { mat: 'gold' });
  for (let tier = 0; tier < 3; tier++) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const wy = h * (0.25 + tier * 0.22);
      B.box(0.85, 1.4, 0.25, 0x2a2430, mat(x + Math.cos(a) * (r - 0.1), wy, z + Math.sin(a) * (r - 0.1), 0, -a, 0), { mat: 'stoneDark' });
      B.box(0.65, 1.1, 0.12, GLASS, mat(x + Math.cos(a) * (r + 0.05), wy, z + Math.sin(a) * (r + 0.05), 0, -a, 0), { mat: 'glass' });
    }
  }
  B.box(1.4, 2.4, 0.3, WOOD, mat(x, 1.2, z + r * 0.95), { mat: 'wood' });
  B.sphere(0.08, GOLD, mat(x + 0.4, 1.2, z + r * 0.95 + 0.2), { mat: 'gold' });
}

function hallWing(B, x, z, w, d, h, ry = 0) {
  B.box(w, h, d, STONE, mat(x, h / 2, z, 0, ry, 0), { mat: 'stone' });
  B.box(w + 0.6, 0.5, d + 0.6, STONE2, mat(x, h, z, 0, ry, 0), { mat: 'stoneDark' });
  const sides = [-1, 1];
  for (const s of sides) {
    for (let i = 0; i < 4; i++) {
      const oz = -d / 2 + 2 + i * (d / 4);
      B.box(1.2, h * 0.85, 1.4, STONE4, mat(x + s * (w / 2 + 0.4), h * 0.4, z + oz, 0, ry, 0), { mat: 'stoneDark' });
    }
  }
  B.box(w * 0.98, 0.35, d * 0.58, ROOF, mat(x, h + 2.0, z - d * 0.2, 0.5, ry, 0), { mat: 'roof' });
  B.box(w * 0.98, 0.35, d * 0.58, ROOF2, mat(x, h + 2.0, z + d * 0.2, -0.5, ry, 0), { mat: 'roof' });
  B.box(w * 0.2, 0.5, d * 0.15, ROOF3, mat(x, h + 3.2, z, 0, ry, 0), { mat: 'roof' });
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    B.box(1.6, 2.8, 0.2, 0x2a2438, mat(x + i * 4.5, h * 0.45, z + d / 2 + 0.05), { mat: 'stoneDark' });
    B.box(1.3, 2.3, 0.12, GLASS2, mat(x + i * 4.5, h * 0.45, z + d / 2 + 0.15), { mat: 'glass' });
  }
}

function tree(B, x, z, scale = 1) {
  const th = (4 + Math.random() * 2) * scale;
  B.cyl(0.45 * scale, 0.65 * scale, th, 0x4a3020, mat(x, th / 2, z), { mat: 'wood', seg: 7 });
  B.sphere(2.0 * scale, GRASS2, mat(x, th + 0.8 * scale, z), { mat: 'grass', seg: 9 });
  B.sphere(1.5 * scale, GRASS3, mat(x + 0.8 * scale, th + 1.4 * scale, z + 0.3), { mat: 'grass', seg: 8 });
  B.sphere(1.3 * scale, GRASS2, mat(x - 0.6 * scale, th + 1.2 * scale, z - 0.5), { mat: 'grass', seg: 8 });
}

/** Build Crescentwick grounds + castle. */
export function buildCastle() {
  const B = new Builder();
  const spots = {};
  const colliders = [];

  // Ground layers
  B.box(520, 0.5, 520, GRASS, mat(0, -0.25, 0), { mat: 'grass' });
  B.box(700, 0.4, 700, GRASS2, mat(0, -0.45, 0), { mat: 'grass' });
  // darker grass patches
  for (let i = 0; i < 12; i++) {
    const gx = (i % 4) * 40 - 60, gz = Math.floor(i / 4) * 50 - 40;
    B.cyl(12 + (i % 3) * 4, 12, 0.2, i % 2 ? GRASS2 : GRASS3, mat(gx, 0.02, gz), { mat: 'grass', seg: 10 });
  }
  // Courtyard
  B.box(40, 0.4, 40, PATH, mat(0, 0.08, 0), { outline: false });
  B.box(36, 0.38, 36, PATH2, mat(0, 0.1, 0), { outline: false });
  // radial path spokes
  B.box(8, 0.36, 55, PATH, mat(0, 0.06, -20), { outline: false });
  B.box(55, 0.36, 8, PATH, mat(0, 0.06, 0), { outline: false });
  B.box(8, 0.36, 40, PATH, mat(0, 0.06, 30), { outline: false });
  // patterned courtyard tiles
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (i === 0 && j === 0) continue;
    B.box(3.5, 0.32, 3.5, (i + j) % 2 ? 0xa09078 : 0x8a7c64, mat(i * 5, 0.12, j * 5), { outline: false });
  }

  // Fountain plaza
  B.cyl(6, 6, 0.55, STONE3, mat(0, 0.35, 0), { seg: 20 });
  B.cyl(5, 5, 0.4, STONE2, mat(0, 0.55, 0), { seg: 18 });
  B.cyl(3.6, 3.6, 0.7, WATER, mat(0, 0.6, 0), { mat: 'water', seg: 18 });
  B.cyl(0.5, 0.65, 2.8, STONE, mat(0, 1.7, 0), { seg: 10 });
  B.cyl(1.2, 0.4, 0.5, STONE3, mat(0, 3.0, 0), { seg: 10 });
  B.sphere(0.7, 0xb0d0f0, mat(0, 3.5, 0), { outline: false });
  spots.fountain = { x: 0, y: 0, z: 0 };

  // === GREAT HALL (north) — grand ===
  hallWing(B, 0, -52, 34, 22, 12);
  // flying entry facade
  B.box(8, 9, 2, STONE2, mat(-6, 4.5, -40));
  B.box(8, 9, 2, STONE2, mat(6, 4.5, -40));
  B.box(20, 3, 2.2, STONE, mat(0, 10, -40));
  // gothic arch suggestion
  B.box(5, 7, 1, 0x1a1828, mat(0, 4, -39));
  B.box(4, 5.5, 0.4, 0x2a3048, mat(0, 3.5, -38.5), { outline: false });
  B.box(4, 0.4, 0.5, GOLD, mat(0, 7.5, -38.2));
  B.box(3.5, 2.2, 0.35, GOLD, mat(0, 8.8, -38), { outline: false }); // crest
  battlement(B, 0, 12, -41, 20, true);
  spots.greatHall = { x: 0, y: 0, z: -46 };
  spots.sorting = { x: 0, y: 1, z: -54 };
  colliders.push({ x: 0, z: -52, r: 16 });

  // Hall floor + pillars + banners
  B.box(28, 0.35, 18, 0x5a4030, mat(0, 0.25, -54), { outline: false });
  for (let i = -1; i <= 1; i += 2) {
    B.cyl(0.55, 0.65, 9, STONE3, mat(i * 10, 4.5, -50), { seg: 10 });
    B.box(1.4, 0.4, 1.4, STONE2, mat(i * 10, 9.1, -50));
  }
  Object.keys(HOUSES).forEach((hid, i) => {
    const h = HOUSES[hid];
    const bx = -12 + i * 8;
    B.box(2.0, 4.2, 0.15, h.colors.primary, mat(bx, 5.5, -60));
    B.box(2.0, 0.4, 0.18, h.colors.secondary, mat(bx, 7.7, -60), { outline: false });
    B.box(0.3, 1.2, 0.3, WOOD, mat(bx, 3.2, -60));
  });
  // Crescent Mirror
  B.cyl(1.5, 1.7, 1.4, STONE3, mat(0, 0.8, -56), { seg: 12 });
  B.box(0.3, 3.8, 0.3, GOLD, mat(-1.3, 3.5, -56));
  B.box(0.3, 3.8, 0.3, GOLD, mat(1.3, 3.5, -56));
  B.box(2.8, 0.3, 0.35, GOLD, mat(0, 5.5, -56));
  B.box(2.4, 3.5, 0.2, 0xd0d8e8, mat(0, 3.5, -56), { outline: false });
  B.box(2.0, 3.0, 0.12, 0xa8c0e0, mat(0, 3.5, -55.85), { outline: false });

  // === Corner keeps ===
  tower(B, -42, -42, 26, 4.0, 7, ROOF);
  tower(B, 42, -42, 26, 4.0, 7, ROOF3);
  tower(B, -42, 42, 22, 3.6, 6, ROOF2);
  tower(B, 42, 42, 22, 3.6, 6, ROOF);
  // central keep (taller)
  tower(B, 0, -72, 32, 4.5, 9, 0x5a2860);
  spots.towers = [{ x: -42, z: -42 }, { x: 42, z: -42 }, { x: -42, z: 42 }, { x: 42, z: 42 }];
  spots.keep = { x: 0, z: -72 };

  // Curtain walls with battlements
  const walls = [
    [-21, -42, 30, 3.2, 9, true], [21, -42, 30, 3.2, 9, true],
    [-42, 0, 3.2, 68, 8, false], [42, 0, 3.2, 68, 8, false],
    [-21, 42, 30, 3.2, 8, true], [21, 42, 30, 3.2, 8, true],
  ];
  walls.forEach(([x, z, w, d, h, alongX]) => {
    B.box(w, h, d, STONE, mat(x, h / 2, z), { grad: 0.16 });
    battlement(B, x, h, z, alongX ? w : d, alongX);
    // ivy patches
    B.box(w * 0.3, h * 0.4, 0.25, IVY, mat(x - w * 0.2, h * 0.3, z + (alongX ? d / 2 : 0) * 0.9), { outline: false });
    colliders.push({ x, z, r: Math.max(w, d) * 0.42 });
  });

  // === East classrooms ===
  hallWing(B, 60, -12, 26, 34, 9);
  B.box(2.2, 4.5, 1.2, WOOD, mat(47, 2.3, -12));
  B.box(1.8, 0.3, 0.3, GOLD, mat(47, 4.2, -11.3), { outline: false });
  // small turret on classroom
  B.cyl(2.2, 2.4, 8, STONE, mat(68, 10, -22), { seg: 10, grad: 0.2 });
  B.cone(2.8, 4, ROOF3, mat(68, 16, -22), { seg: 10 });
  spots.charms = { x: 55, y: 0, z: -10 };
  spots.classrooms = { x: 55, y: 0, z: -10 };
  colliders.push({ x: 60, z: -12, r: 16 });

  // === West library ===
  hallWing(B, -60, -10, 24, 30, 10);
  B.box(2.2, 4.5, 1.2, WOOD2, mat(-47, 2.3, -10));
  for (let i = 0; i < 6; i++) {
    B.box(0.9, 4.0, 0.5, WOOD, mat(-68, 2.2, -18 + i * 2.4));
    for (let s = 0; s < 4; s++) B.box(0.8, 0.12, 0.4, [0x884422, 0x224488, 0x448822, 0x662244][s], mat(-68, 0.8 + s * 0.85, -18 + i * 2.4), { outline: false });
  }
  spots.library = { x: -55, y: 0, z: -8 };
  spots.annex = { x: -62, y: 0, z: -18 };
  colliders.push({ x: -60, z: -10, r: 14 });

  // House common dormers
  Object.values(HOUSES).forEach(h => {
    const p = h.common;
    B.cyl(2.8, 3.0, 7, h.colors.robe, mat(p.x, 3.5, p.z), { grad: 0.25, seg: 12 });
    B.cyl(3.1, 3.1, 0.4, h.colors.trim, mat(p.x, 7.1, p.z), { seg: 12 });
    B.cone(3.4, 4.2, h.colors.primary, mat(p.x, 9.3, p.z), { seg: 12 });
    B.sphere(0.25, h.colors.secondary, mat(p.x, 11.5, p.z), { outline: false });
    B.box(1.2, 2.2, 0.3, WOOD, mat(p.x, 1.2, p.z + 2.9));
    spots['common_' + h.id] = { ...p };
  });

  // South gatehouse
  B.box(5, 12, 4, STONE2, mat(-8, 6, 58));
  B.box(5, 12, 4, STONE2, mat(8, 6, 58));
  B.box(22, 4, 4, STONE, mat(0, 13, 58));
  battlement(B, 0, 15, 58, 22, true);
  B.cone(3, 4, ROOF, mat(-8, 16, 58), { seg: 8 });
  B.cone(3, 4, ROOF, mat(8, 16, 58), { seg: 8 });
  B.box(2.5, 7, 0.5, GOLD, mat(0, 7, 59.5), { outline: false });
  spots.gate = { x: 0, y: 0, z: 58 };

  // Lake
  B.cyl(26, 26, 0.6, WATER, mat(-75, -0.15, 58), { seg: 28, outline: false });
  B.cyl(20, 20, 0.4, 0x3a78a8, mat(-75, 0.08, 58), { seg: 24, outline: false });
  // reeds
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    B.box(0.15, 1.4, 0.15, GRASS3, mat(-75 + Math.cos(a) * 24, 0.7, 58 + Math.sin(a) * 24), { outline: false });
  }
  spots.lake = { x: -75, y: 0, z: 58 };
  spots.lakeRuin = { x: -84, y: -1, z: 66 };
  B.box(3.5, 0.35, 12, WOOD, mat(-58, 0.35, 50));
  B.box(0.3, 1.4, 0.3, WOOD2, mat(-59.5, 0.9, 45));
  B.box(0.3, 1.4, 0.3, WOOD2, mat(-56.5, 0.9, 45));

  // Forest
  for (let i = 0; i < 36; i++) {
    const fx = 78 + (i % 8) * 5.5 + (i * 1.3 % 3);
    const fz = -45 + Math.floor(i / 8) * 11 + (i * 2.1 % 4);
    tree(B, fx, fz, 0.85 + (i % 4) * 0.15);
  }
  spots.forest = { x: 85, y: 0, z: -10 };

  // Aetherchase pitch
  B.box(44, 0.3, 28, 0x2a4a2a, mat(52, 0.12, 58), { outline: false });
  B.box(44, 0.18, 0.5, 0xe8e0c0, mat(52, 0.28, 44), { outline: false });
  B.box(44, 0.18, 0.5, 0xe8e0c0, mat(52, 0.28, 72), { outline: false });
  B.box(0.5, 0.18, 28, 0xe8e0c0, mat(30, 0.28, 58), { outline: false });
  B.box(0.5, 0.18, 28, 0xe8e0c0, mat(74, 0.28, 58), { outline: false });
  B.cyl(2.0, 2.0, 0.35, 0xc43c2a, mat(36, 0.45, 58), { seg: 14, outline: false });
  B.cyl(2.0, 2.0, 0.35, 0x4a3a8a, mat(68, 0.45, 58), { seg: 14, outline: false });
  // bleachers
  B.box(40, 0.4, 3, STONE3, mat(52, 0.5, 40));
  B.box(40, 0.4, 3, STONE3, mat(52, 1.0, 38));
  spots.pitch = { x: 52, y: 0, z: 58 };

  // Courtyard furniture
  [[-14, 14], [14, 14], [-14, -14], [14, -14]].forEach(([x, z]) => {
    B.box(2.0, 0.45, 0.55, STONE3, mat(x, 0.4, z));
    B.box(0.35, 0.8, 0.35, STONE, mat(x - 0.7, 0.75, z));
    B.box(0.35, 0.8, 0.35, STONE, mat(x + 0.7, 0.75, z));
  });
  // Hero statue
  B.cyl(1.3, 1.5, 1.8, STONE3, mat(0, 1.3, -22), { seg: 10 });
  B.box(1.0, 2.6, 0.6, STONE, mat(0, 3.8, -22));
  B.sphere(0.5, STONE, mat(0, 5.4, -22), { seg: 10 });
  B.box(1.6, 0.2, 0.8, GOLD, mat(0, 0.5, -22), { outline: false });
  spots.statue = { x: 0, y: 0, z: -22 };

  // Painting (secret)
  B.box(2.6, 3.2, 0.2, 0x5a3020, mat(-19, 3.8, -22));
  B.box(2.1, 2.5, 0.1, 0x3a6080, mat(-19, 3.8, -21.85), { outline: false });
  B.box(2.6, 0.2, 0.25, GOLD, mat(-19, 5.5, -21.9), { outline: false });
  spots.painting = { x: -19, y: 2, z: -22 };

  B.box(4.5, 5.5, 1.0, STONE2, mat(-47, 2.8, 6));
  spots.secretWall = { x: -47, y: 1, z: 6 };

  // Whisper vault
  B.box(12, 5, 10, 0x2a2438, mat(-47, -0.5, 14), { grad: 0.35 });
  B.box(10, 0.25, 8, 0x4a3860, mat(-47, 1.2, 14), { outline: false });
  B.cyl(0.3, 0.3, 3, GOLD, mat(-47, 2.5, 14), { seg: 6, outline: false });
  B.sphere(0.5, 0x88ffcc, mat(-47, 4.2, 14), { outline: false });
  spots.whisperVault = { x: -47, y: 1.2, z: 14 };

  // Hedge rows
  for (let i = 0; i < 10; i++) B.box(1.8, 2.4, 5, GRASS2, mat(78, 1.2, 8 + i * 3.2), { outline: false });

  // Lanterns
  for (let i = 0; i < 8; i++) {
    const z = 4 + i * 7;
    [[-5, z], [5, z]].forEach(([x, zz]) => {
      B.cyl(0.14, 0.18, 2.8, WOOD2, mat(x, 1.4, zz), { seg: 6, outline: false });
      B.box(0.5, 0.15, 0.5, WOOD, mat(x, 2.85, zz), { outline: false });
      B.sphere(0.28, 0xffe8a0, mat(x, 3.15, zz), { mat: 'emissive', seg: 6 });
    });
  }
  // more lanterns toward hall
  for (let i = 0; i < 5; i++) {
    const z = -8 - i * 6;
    [[-5, z], [5, z]].forEach(([x, zz]) => {
      B.cyl(0.14, 0.18, 2.8, WOOD2, mat(x, 1.4, zz), { seg: 6, outline: false });
      B.sphere(0.28, 0xffe8a0, mat(x, 3.15, zz), { mat: 'emissive', seg: 6 });
    });
  }

  // Courtyard planters
  [[-10, 0], [10, 0], [0, 12], [0, -8]].forEach(([x, z], i) => {
    B.cyl(1.2, 1.4, 0.8, STONE3, mat(x, 0.5, z), { seg: 10 });
    B.sphere(1.1, GRASS3, mat(x, 1.3, z), { seg: 8, outline: false });
    B.sphere(0.35, [0xc04060, 0xe8c040, 0x8060c0, 0x40a0c0][i], mat(x, 1.8, z), { outline: false });
  });



  // ========== OUTER WORLD (original Crescentwick countryside) ==========
  // Edgewood Forest (east)
  for (let i = 0; i < 55; i++) {
    const x = 110 + (i % 11) * 9 + (i % 3) * 2;
    const z = -80 + Math.floor(i / 11) * 14 + (i % 5) * 1.5;
    tree(B, x, z, 0.85 + (i % 4) * 0.2);
  }
  spots.edgewood = { x: 140, y: 0, z: -40 };
  spots.edgewoodShrine = { x: 155, y: 0, z: -20 };
  B.cyl(3.5, 3.5, 0.5, STONE3, mat(155, 0.3, -20), { seg: 12 });
  B.box(1.2, 2.4, 0.4, STONE2, mat(155, 1.5, -20));
  B.sphere(0.45, GOLD, mat(155, 2.9, -20), { mat: 'emissive' });

  // Mistbrook Hamlet (southwest) — cottages, well, market stall
  const hamlet = { x: -130, z: 95 };
  spots.mistbrook = hamlet;
  [[-8, -6], [6, -4], [-4, 8], [10, 6], [-12, 4]].forEach(([ox, oz], i) => {
    const hx = hamlet.x + ox, hz = hamlet.z + oz;
    B.box(6 + (i % 2), 3.2, 5, WOOD, mat(hx, 1.6, hz), { mat: 'wood' });
    B.box(7, 0.35, 5.5, ROOF2, mat(hx, 3.5, hz, 0.35, 0, 0), { mat: 'roof' });
    B.box(1.0, 1.8, 0.2, WOOD2, mat(hx, 1.0, hz + 2.6));
    B.box(0.7, 0.9, 0.1, GLASS, mat(hx + 1.5, 1.8, hz + 2.55), { mat: 'glass' });
  });
  B.cyl(1.4, 1.5, 0.9, STONE3, mat(hamlet.x, 0.5, hamlet.z), { seg: 12 });
  B.cyl(0.15, 0.15, 2.2, WOOD2, mat(hamlet.x, 1.8, hamlet.z));
  B.box(4, 0.15, 2.5, WOOD, mat(hamlet.x + 14, 1.2, hamlet.z - 2), { mat: 'wood' });
  B.box(0.2, 2.2, 0.2, WOOD2, mat(hamlet.x + 12.5, 1.2, hamlet.z - 2));
  B.box(0.2, 2.2, 0.2, WOOD2, mat(hamlet.x + 15.5, 1.2, hamlet.z - 2));
  B.box(3.2, 0.15, 2.6, ROOF3, mat(hamlet.x + 14, 2.4, hamlet.z - 2), { mat: 'roof' });
  spots.mistbrookMarket = { x: hamlet.x + 14, y: 0, z: hamlet.z - 2 };

  // Silverpath road from gate to Mistbrook + Edgewood
  for (let i = 0; i < 18; i++) {
    B.box(5, 0.22, 6, PATH, mat(-20 - i * 6, 0.05, 70 + i * 1.2), { outline: false });
  }
  for (let i = 0; i < 16; i++) {
    B.box(6, 0.22, 5, PATH, mat(50 + i * 6, 0.05, 20 - i * 3), { outline: false });
  }

  // North cliffs / windmill ridge
  for (let i = 0; i < 8; i++) {
    B.box(14, 3 + (i % 3), 10, STONE4, mat(-40 + i * 18, 1.2, -130), { mat: 'stoneDark' });
  }
  B.cyl(2.2, 2.4, 10, STONE, mat(20, 6, -125), { seg: 12, mat: 'stone' });
  B.cone(3, 3.5, ROOF, mat(20, 12.5, -125), { seg: 10, mat: 'roof' });
  B.box(10, 0.35, 1.2, WOOD, mat(20, 10, -125), { mat: 'wood' });
  B.box(1.2, 0.35, 10, WOOD, mat(20, 10, -125), { mat: 'wood' });
  spots.windmill = { x: 20, y: 0, z: -125 };
  spots.northridge = { x: 0, y: 0, z: -130 };

  // Hollowmere Pond (northwest)
  B.cyl(18, 18, 0.5, WATER, mat(-120, -0.1, -70), { seg: 24, outline: false });
  B.cyl(14, 14, 0.35, 0x3a78a8, mat(-120, 0.1, -70), { seg: 20, outline: false });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    tree(B, -120 + Math.cos(a) * 22, -70 + Math.sin(a) * 22, 0.7);
  }
  spots.hollowmere = { x: -120, y: 0, z: -70 };
  spots.hollowDock = { x: -108, y: 0, z: -70 };
  B.box(6, 0.35, 2.5, WOOD, mat(-108, 0.3, -70), { mat: 'wood' });

  // Ancient stone circle (south-east meadow)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    B.box(1.2, 3.2 + (i % 3) * 0.4, 0.8, STONE3, mat(95 + Math.cos(a) * 10, 1.6, 110 + Math.sin(a) * 10), { mat: 'stone' });
  }
  B.cyl(2, 2, 0.4, STONE2, mat(95, 0.25, 110), { seg: 10 });
  spots.stonecircle = { x: 95, y: 0, z: 110 };

  // Bridge over creek east of lake
  B.box(12, 0.4, 3.5, WOOD, mat(-95, 0.5, 40), { mat: 'wood' });
  B.box(0.3, 1.4, 3.5, WOOD2, mat(-100, 1.0, 40));
  B.box(0.3, 1.4, 3.5, WOOD2, mat(-90, 1.0, 40));
  B.cyl(8, 8, 0.35, WATER, mat(-95, -0.2, 40), { seg: 16, outline: false });
  spots.creekBridge = { x: -95, y: 0, z: 40 };

  // Distant hills (silhouette)
  for (let i = 0; i < 10; i++) {
    B.cyl(18 + (i % 3) * 6, 22, 8 + (i % 4) * 3, GRASS2, mat(-200 + i * 45, 2, 180 - (i % 2) * 40), { seg: 10, outline: false });
  }

  // Moonrail platform (train arrival — original)
  B.box(18, 0.6, 6, STONE3, mat(0, 0.35, 72), { mat: 'stone' });
  B.box(16, 0.15, 4.5, WOOD, mat(0, 0.7, 72), { mat: 'wood' });
  B.box(14, 2.2, 3.2, 0xc8d0d8, mat(0, 1.8, 78), { mat: 'stone' }); // carriage body
  B.box(14.4, 0.3, 3.4, 0x4a3048, mat(0, 3.0, 78), { mat: 'roof' });
  B.cyl(0.55, 0.55, 0.3, 0x2a2430, mat(-5, 0.55, 76), { mat: 'stoneDark', seg: 10 });
  B.cyl(0.55, 0.55, 0.3, 0x2a2430, mat(5, 0.55, 76), { mat: 'stoneDark', seg: 10 });
  B.cyl(0.55, 0.55, 0.3, 0x2a2430, mat(-5, 0.55, 80), { mat: 'stoneDark', seg: 10 });
  B.cyl(0.55, 0.55, 0.3, 0x2a2430, mat(5, 0.55, 80), { mat: 'stoneDark', seg: 10 });
  B.box(0.2, 1.4, 2.4, GLASS2, mat(-4, 1.9, 78.1), { mat: 'glass' });
  B.box(0.2, 1.4, 2.4, GLASS2, mat(4, 1.9, 78.1), { mat: 'glass' });
  B.sphere(0.2, GOLD, mat(0, 3.3, 78), { mat: 'emissive' });
  spots.moonrail = { x: 0, y: 0, z: 72 };

  const mesh = B.build(true);
  const group = new THREE.Group();
  group.add(mesh);

  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3a88b8, transparent: true, opacity: 0.5, roughness: 0.25, metalness: 0.45 });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(24, 40), waterMat);
  lake.rotation.x = -Math.PI / 2; lake.position.set(-75, 0.2, 58);
  group.add(lake);

  // Warm lantern point lights (a few)
  [[-5, 3.2, 10], [5, 3.2, 10], [0, 3.5, 0], [-5, 3.2, -20], [5, 3.2, -20]].forEach(([x, y, z]) => {
    const pl = new THREE.PointLight(0xffcc88, 0.7, 16);
    pl.position.set(x, y, z);
    group.add(pl);
  });

  // Soft light shafts (godrays) over courtyard
  for (const [sx, sz] of [[-8, 4], [8, -6], [0, 16]]) {
    const shaft = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 14, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
    );
    shaft.position.set(sx, 10, sz); shaft.rotation.x = Math.PI;
    group.add(shaft);
  }


  return { group, colliders, spots };
}

export function groundY(x, z) {
  const dl = Math.hypot(x + 75, z - 58);
  if (dl < 24) return -0.5;
  const hm = Math.hypot(x + 120, z + 70);
  if (hm < 16) return -0.45;
  const ck = Math.hypot(x + 95, z - 40);
  if (ck < 7) return -0.35;
  return 0;
}
