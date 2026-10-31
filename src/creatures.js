import { THREE, Builder, mat, MATS } from './engine.js';

/** Original Crescentwick fauna & flora — invented names only. */
export const CREATURES = {
  glimmerfox: { id: 'glimmerfox', name: 'Glimmerfox', rarity: 'common', cost: 1, hp: 40, atk: 12, desc: 'A fox whose fur catches moonlight.', color: 0xc8a070, habitat: 'forest' },
  mistotter: { id: 'mistotter', name: 'Mistotter', rarity: 'common', cost: 1, hp: 35, atk: 10, desc: 'River otter that swims through fog.', color: 0x88a0b0, habitat: 'lake' },
  emberfinch: { id: 'emberfinch', name: 'Emberfinch', rarity: 'common', cost: 1, hp: 28, atk: 14, desc: 'Tiny bird with warm orange tips.', color: 0xe07040, habitat: 'courtyard' },
  mossback: { id: 'mossback', name: 'Mossback Tortoise', rarity: 'uncommon', cost: 2, hp: 70, atk: 8, desc: 'Garden tortoise with living moss shell.', color: 0x4a7040, habitat: 'courtyard' },
  skyrill: { id: 'skyrill', name: 'Skyrill', rarity: 'uncommon', cost: 2, hp: 32, atk: 18, desc: 'Squirrel that glides on aether currents.', color: 0xb08050, habitat: 'forest' },
  lampmoth: { id: 'lampmoth', name: 'Lampmoth', rarity: 'common', cost: 1, hp: 22, atk: 9, desc: 'Moth that drinks lantern-light.', color: 0xffe8a0, habitat: 'hall' },
  tidepup: { id: 'tidepup', name: 'Tidepup', rarity: 'uncommon', cost: 2, hp: 45, atk: 15, desc: 'Lake-shore pup with webbed paws.', color: 0x5080a0, habitat: 'lake' },
  thornhare: { id: 'thornhare', name: 'Thornhare', rarity: 'common', cost: 1, hp: 30, atk: 11, desc: 'Hare with soft bramble tips.', color: 0x80a060, habitat: 'forest' },
  glasswing: { id: 'glasswing', name: 'Glasswing Drake', rarity: 'rare', cost: 3, hp: 55, atk: 22, desc: 'Palm-sized drake with clear wings.', color: 0xa0d0e8, habitat: 'towers' },
  runebadger: { id: 'runebadger', name: 'Runebadger', rarity: 'rare', cost: 3, hp: 60, atk: 20, desc: 'Badger marked with faint learning runes.', color: 0x5a5040, habitat: 'library' },
  starlingelk: { id: 'starlingelk', name: 'Starling Elk', rarity: 'rare', cost: 4, hp: 80, atk: 18, desc: 'Elk whose antlers hold tiny lights.', color: 0xd0c8b0, habitat: 'forest' },
  cindernewt: { id: 'cindernewt', name: 'Cindernewt', rarity: 'uncommon', cost: 2, hp: 38, atk: 16, desc: 'Newt that warms cold stones.', color: 0xc05030, habitat: 'courtyard' },
  veilcat: { id: 'veilcat', name: 'Veilcat', rarity: 'rare', cost: 3, hp: 42, atk: 24, desc: 'Cat that steps half into shadow.', color: 0x3a3050, habitat: 'hall' },
  pearlcrab: { id: 'pearlcrab', name: 'Pearlcrab', rarity: 'uncommon', cost: 2, hp: 50, atk: 12, desc: 'Crab that grows moon-pearls.', color: 0xe0d0c0, habitat: 'lake' },
  aetherowl: { id: 'aetherowl', name: 'Aether Owl', rarity: 'epic', cost: 5, hp: 65, atk: 28, desc: 'Night owl that sees spell-wakes.', color: 0x706090, habitat: 'towers' },
};

export const PLANTS = {
  duskcap: { id: 'duskcap', name: 'Duskcap Mushroom', rarity: 'common', desc: 'Glows softly after sunset.', color: 0x8866aa, habitat: 'forest' },
  silverleaf: { id: 'silverleaf', name: 'Silverleaf Fern', rarity: 'common', desc: 'Fronds like brushed metal.', color: 0xc0d0d8, habitat: 'courtyard' },
  sunroot: { id: 'sunroot', name: 'Sunroot Bulb', rarity: 'uncommon', desc: 'Warms the soil around it.', color: 0xe8b040, habitat: 'courtyard' },
  mistbloom: { id: 'mistbloom', name: 'Mistbloom', rarity: 'uncommon', desc: 'Flower that exhales cool mist.', color: 0xa0e0ff, habitat: 'lake' },
  runethorn: { id: 'runethorn', name: 'Runethorn Vine', rarity: 'rare', desc: 'Vine etched with soft glyphs.', color: 0x60a060, habitat: 'library' },
  moonlace: { id: 'moonlace', name: 'Moonlace Orchid', rarity: 'rare', desc: 'Petals like lace under moonlight.', color: 0xe8e0ff, habitat: 'towers' },
  emberlily: { id: 'emberlily', name: 'Emberlily', rarity: 'uncommon', desc: 'Petals hold a safe warm spark.', color: 0xff6644, habitat: 'hall' },
  glassreed: { id: 'glassreed', name: 'Glassreed', rarity: 'common', desc: 'Clear reed that sings in wind.', color: 0xa8d8e8, habitat: 'lake' },
};

export function makeCreatureMesh(id) {
  const def = CREATURES[id] || CREATURES.glimmerfox;
  const B = new Builder();
  const c = def.color;
  // body
  B.sphere(0.35, c, mat(0, 0.35, 0), { mat: 'cloth', seg: 10 });
  B.sphere(0.22, c, mat(0.28, 0.45, 0.1), { mat: 'cloth', seg: 8 }); // head
  B.sphere(0.06, 0x1a1020, mat(0.4, 0.5, 0.22), { mat: 'emissive', seg: 6, outline: false });
  B.sphere(0.06, 0x1a1020, mat(0.4, 0.5, 0.02), { mat: 'emissive', seg: 6, outline: false });
  // legs
  for (const [x, z] of [[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]]) {
    B.cyl(0.05, 0.06, 0.25, c, mat(x, 0.12, z), { mat: 'cloth', seg: 6 });
  }
  const g = B.build(false);
  g.scale.setScalar(0.9);
  g.userData.creatureId = id;
  return g;
}

export function makePlantMesh(id) {
  const def = PLANTS[id] || PLANTS.duskcap;
  const B = new Builder();
  B.cyl(0.04, 0.06, 0.4, 0x3a6028, mat(0, 0.2, 0), { mat: 'wood', seg: 6 });
  B.sphere(0.22, def.color, mat(0, 0.45, 0), { mat: 'emissive', seg: 8 });
  return B.build(false);
}

export class CreatureSystem {
  constructor(game) {
    this.g = game;
    this.wild = [];
    this.plants = [];
  }
  ensureSave() {
    const S = this.g.save;
    if (!S.creatures) S.creatures = { owned: [], plants: [], cards: {}, points: 3, items: 0 };
  }
  spawnWild() {
    for (const w of this.wild) this.g.scene.remove(w.mesh);
    for (const p of this.plants) this.g.scene.remove(p.mesh);
    this.wild = []; this.plants = [];
    const spots = [
      { id: 'emberfinch', x: 8, z: 8 }, { id: 'glimmerfox', x: 82, z: -8 },
      { id: 'mistotter', x: -70, z: 50 }, { id: 'mossback', x: -12, z: 10 },
      { id: 'lampmoth', x: 2, z: -30 }, { id: 'skyrill', x: 88, z: -20 },
      { id: 'tidepup', x: -60, z: 48 }, { id: 'cindernewt', x: 14, z: -6 },
      { id: 'glasswing', x: 40, z: -40 }, { id: 'veilcat', x: -5, z: -45 },
    ];
    for (const s of spots) {
      const mesh = makeCreatureMesh(s.id);
      mesh.position.set(s.x, 0, s.z);
      this.g.scene.add(mesh);
      this.wild.push({ id: s.id, mesh, pos: mesh.position, tamed: false });
    }
    const ps = [
      { id: 'silverleaf', x: 6, z: 4 }, { id: 'duskcap', x: 80, z: -12 },
      { id: 'mistbloom', x: -72, z: 55 }, { id: 'sunroot', x: -8, z: 6 },
      { id: 'emberlily', x: 3, z: -38 }, { id: 'glassreed', x: -68, z: 52 },
    ];
    for (const s of ps) {
      const mesh = makePlantMesh(s.id);
      mesh.position.set(s.x, 0, s.z);
      this.g.scene.add(mesh);
      this.plants.push({ id: s.id, mesh, pos: mesh.position, rescued: false });
    }
  }
  tryInteract() {
    this.ensureSave();
    const p = this.g.player.pos;
    for (const w of this.wild) {
      if (w.tamed) continue;
      if (p.distanceTo(w.pos) < 2.4) {
        w.tamed = true; w.mesh.visible = false;
        const S = this.g.save.creatures;
        if (!S.owned.includes(w.id)) S.owned.push(w.id);
        S.cards[w.id] = S.cards[w.id] || { lvl: 1 };
        this.g.toast?.(`Tamed ${CREATURES[w.id].name}!`);
        this.g.fx.burst(w.pos.clone().setY(1), CREATURES[w.id].color, 16);
        this.g.saveGame?.();
        return true;
      }
    }
    for (const pl of this.plants) {
      if (pl.rescued) continue;
      if (p.distanceTo(pl.pos) < 2.2) {
        pl.rescued = true; pl.mesh.visible = false;
        const S = this.g.save.creatures;
        if (!S.plants.includes(pl.id)) S.plants.push(pl.id);
        S.items = (S.items || 0) + 1;
        this.g.toast?.(`Rescued ${PLANTS[pl.id].name} (+training item)`);
        this.g.fx.burst(pl.pos.clone().setY(0.5), PLANTS[pl.id].color, 12);
        this.g.saveGame?.();
        return true;
      }
    }
    return false;
  }
  update(dt) {
    for (const w of this.wild) {
      if (w.tamed) continue;
      w.mesh.rotation.y += dt * 0.5;
      w.mesh.position.y = Math.sin(performance.now() * 0.002 + w.pos.x) * 0.05;
    }
  }
}
