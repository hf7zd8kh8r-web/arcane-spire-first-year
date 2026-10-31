import { THREE, Builder, mat } from './engine.js';
import { HOUSES } from './data.js';

const SKIN = [0xf0c8a8, 0xe0b090, 0xc48a60, 0x8a5a3a, 0x5a3a28];
const HAIR = [0x1a1210, 0x3a2818, 0x8a6030, 0xc8a050, 0xe8e0d0, 0x2a1a40, 0x6a2030];

/** Build a third-person student with house robes + wand. */
export function makeStudent(opts = {}) {
  const house = HOUSES[opts.house] || HOUSES.emberforge;
  const skin = SKIN[opts.skin | 0] || SKIN[0];
  const hair = HAIR[opts.hair | 0] || HAIR[0];
  const robe = house.colors.robe, trim = house.colors.trim;
  const B = new Builder();

  // Legs
  B.cyl(0.14, 0.16, 0.55, 0x2a2430, mat(-0.14, 0.35, 0, 0, 0, 0));
  B.cyl(0.14, 0.16, 0.55, 0x2a2430, mat(0.14, 0.35, 0, 0, 0, 0));
  // Boots
  B.box(0.22, 0.14, 0.32, 0x1a1210, mat(-0.14, 0.07, 0.04));
  B.box(0.22, 0.14, 0.32, 0x1a1210, mat(0.14, 0.07, 0.04));
  // Torso / robe
  B.cyl(0.32, 0.38, 0.85, robe, mat(0, 1.05, 0), { grad: 0.25, seg: 12 });
  B.box(0.7, 0.9, 0.45, robe, mat(0, 0.95, 0.02), { grad: 0.2 });
  // Collar / trim
  B.cyl(0.34, 0.34, 0.08, trim, mat(0, 1.48, 0), { seg: 12 });
  // House sash
  B.box(0.12, 0.7, 0.42, house.colors.primary, mat(0.22, 1.0, 0.02));
  B.box(0.1, 0.08, 0.42, trim, mat(0.22, 1.3, 0.02));
  // Arms
  B.cyl(0.1, 0.12, 0.55, robe, mat(-0.42, 1.15, 0, 0, 0, 0.35));
  B.cyl(0.1, 0.12, 0.55, robe, mat(0.42, 1.15, 0, 0, 0, -0.35));
  // Hands
  B.sphere(0.1, skin, mat(-0.55, 0.88, 0.05), { seg: 8 });
  B.sphere(0.1, skin, mat(0.55, 0.88, 0.05), { seg: 8 });
  // Neck + head
  B.cyl(0.1, 0.12, 0.14, skin, mat(0, 1.58, 0));
  B.sphere(0.28, skin, mat(0, 1.85, 0), { seg: 14 });
  // Hair cap
  B.sphere(0.29, hair, mat(0, 1.92, -0.02), { seg: 12, outline: false });
  B.box(0.5, 0.18, 0.35, hair, mat(0, 1.95, -0.08), { outline: false });
  // Eyes
  B.sphere(0.045, 0xffffff, mat(-0.09, 1.88, 0.22), { seg: 6, outline: false });
  B.sphere(0.045, 0xffffff, mat(0.09, 1.88, 0.22), { seg: 6, outline: false });
  B.sphere(0.025, 0x1a2030, mat(-0.09, 1.88, 0.255), { seg: 6, outline: false });
  B.sphere(0.025, 0x1a2030, mat(0.09, 1.88, 0.255), { seg: 6, outline: false });
  // Brows
  B.box(0.1, 0.02, 0.02, hair, mat(-0.09, 1.96, 0.24), { outline: false });
  B.box(0.1, 0.02, 0.02, hair, mat(0.09, 1.96, 0.24), { outline: false });

  const body = B.build();
  body.scale.setScalar(1.15);
  body.name = 'student';

  // Wand (separate so we can animate)
  const WB = new Builder();
  WB.cyl(0.018, 0.025, 0.55, 0x6a4020, mat(0, 0.28, 0), { seg: 6, outline: false });
  WB.cyl(0.022, 0.022, 0.08, 0xc8a860, mat(0, 0.02, 0), { seg: 6, outline: false });
  WB.sphere(0.03, 0xe8d080, mat(0, 0.55, 0), { seg: 6, outline: false });
  const wand = WB.build(false);
  wand.position.set(0.58, 0.85, 0.15);
  wand.rotation.z = -0.4;
  wand.name = 'wand';
  body.add(wand);

  // Simple cloak flap (back)
  const CB = new Builder();
  CB.box(0.65, 0.95, 0.08, robe, mat(0, 0.9, -0.28), { grad: 0.35 });
  const cloak = CB.build(false);
  cloak.name = 'cloak';
  body.add(cloak);

  body.userData = { house: house.id, wand, cloak, anim: 0 };
  return body;
}

export function animateStudent(mesh, dt, moving, casting, shielding) {
  if (!mesh) return;
  mesh.userData.anim = (mesh.userData.anim || 0) + dt * (moving ? 8 : 2);
  const a = mesh.userData.anim;
  const cloak = mesh.getObjectByName('cloak');
  if (cloak) cloak.rotation.x = Math.sin(a * 0.7) * 0.06 + (moving ? 0.1 : 0);
  const wand = mesh.getObjectByName('wand');
  if (wand) {
    if (casting) { wand.rotation.x = -0.8; wand.rotation.z = -0.2; wand.position.y = 1.15; }
    else if (shielding) { wand.rotation.x = -0.3; wand.position.y = 1.05; wand.position.z = 0.35; }
    else { wand.rotation.x = 0; wand.rotation.z = -0.4; wand.position.set(0.58, 0.85, 0.15); }
  }
  // bob
  if (moving) mesh.position.y = Math.abs(Math.sin(a)) * 0.04;
  else mesh.position.y = 0;
}

export function makeTutor(nameColor = 0x3a2a50) {
  const B = new Builder();
  const robe = nameColor, skin = 0xe0b890;
  B.cyl(0.36, 0.42, 1.1, robe, mat(0, 1.0, 0), { grad: 0.3 });
  B.sphere(0.3, skin, mat(0, 1.95, 0), { seg: 12 });
  B.sphere(0.32, 0xf0e8d8, mat(0, 2.05, -0.02), { seg: 10, outline: false }); // hair/beard hint
  B.box(0.55, 0.08, 0.4, 0xc8a040, mat(0, 1.55, 0.05)); // sash
  B.cyl(0.02, 0.03, 0.9, 0x5a3820, mat(0.5, 1.1, 0.2, 0, 0, -0.5)); // staff
  B.sphere(0.08, 0x88ddff, mat(0.72, 1.55, 0.35), { outline: false });
  return B.build();
}

export function makeDuelist(houseId, skin = 1, hair = 0) {
  return makeStudent({ house: houseId, skin, hair });
}
