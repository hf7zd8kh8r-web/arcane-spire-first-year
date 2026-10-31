import { THREE, renderer, makeScene, makeCamera, qTick, applyQuality, qualityHooks } from './engine.js';
import { IN, pollKeys, consume } from './input.js';
import { buildCastle, groundY } from './castle.js';
import { Player } from './player.js';
import { Spellbook } from './spells.js';
import { FX } from './fx.js';
import { Duel, makeArenaMesh } from './duel.js';
import { BroomFlight } from './broom.js';
import { Secrets } from './secrets.js';
import { Quests } from './quests.js';
import { Net } from './net.js';
import { makeTutor, makeStudent } from './chars.js';
import { HOUSES, SPELLS, HIT_CAP } from './data.js';
import * as ST from './state.js';

export class Game {
  constructor(ui) {
    this.ui = ui;
    const { scene, sun } = makeScene();
    this.scene = scene; this.sun = sun;
    this.cam = makeCamera();
    this.castle = buildCastle();
    this.scene.add(this.castle.group);
    this.fx = new FX(scene);
    this.player = new Player(this);
    this.spells = new Spellbook(this);
    this.duel = new Duel(this);
    this.broom = new BroomFlight(this);
    this.secrets = new Secrets(this);
    this.quests = new Quests(this);
    this.net = new Net(this);
    this.arenaMesh = makeArenaMesh();
    this.scene.add(this.arenaMesh);
    this.npcs = [];
    this.wisps = [];
    this.save = null;
    this.running = false;
    this._clock = new THREE.Clock();
    this._netT = 0;
    qualityHooks.push(() => {
      this.cam.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      this.cam.updateProjectionMatrix();
    });
    applyQuality();
  }

  toast(msg, k) { this.ui.toast(msg, k); }

  saveGame() { if (this.save) ST.save(this.save); }

  start(save) {
    this.save = save;
    this.quests.ensure();
    // restore unlocked spells
    this.spells.unlocked = new Set(save.spells || ['sparkbolt']);
    if (save.house) this.player.rebuild(save.house);
    else this.player.rebuild('emberforge');
    if (!save.sorted) this.player.pos.set(0, 0, -42);
    else {
      const c = HOUSES[save.house]?.common;
      if (c) this.player.pos.set(c.x, 0, c.z + 6);
      else this.player.pos.set(0, 0, 15);
    }
    this._spawnNpcs();
    this._spawnWisps();
    this.running = true;
    this._clock.start();
    this.loop();
    this.ui.updateHud();
    this.ui.updateQuest();
    if (!save.sorted) setTimeout(() => this.toast('Enter the Great Hall and approach the Crescent Mirror to sort'), 1200);
  }

  _spawnNpcs() {
    for (const n of this.npcs) this.scene.remove(n.mesh);
    this.npcs = [];
    const list = [
      { id: 'brindle', name: 'Tutor Brindle', mesh: makeTutor(0x3a4060), pos: [52, 0, -8], talk: true },
      { id: 'rowan', name: 'Keeper Rowan', mesh: makeTutor(0x2a5030), pos: [72, 0, -5], talk: true },
      { id: 'pitch', name: 'Coach Nyx', mesh: makeTutor(0x4a3050), pos: [48, 0, 50], talk: true },
      { id: 'prefect', name: 'Prefect Cal', mesh: makeStudent({ house: 'stormcrown', skin: 2, hair: 1 }), pos: [5, 0, -40], talk: false },
    ];
    for (const n of list) {
      n.mesh.position.set(...n.pos);
      this.scene.add(n.mesh);
      this.npcs.push({ ...n, pos: new THREE.Vector3(...n.pos) });
    }
  }

  _spawnWisps() {
    for (const w of this.wisps) this.scene.remove(w.mesh);
    this.wisps = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.75 })
      );
      const x = 75 + Math.random() * 15, z = -20 + Math.random() * 30;
      m.position.set(x, 1.5 + Math.random(), z);
      this.scene.add(m);
      this.wisps.push({ mesh: m, pos: m.position, alive: true, phase: Math.random() * 6 });
    }
  }

  buildArena(on) {
    this.arenaMesh.visible = !!on;
    this.arenaMesh.position.set(0, 80, 0);
  }

  findTarget(origin, dir, range, coneDeg = 30) {
    // Prefer duel foe
    if (this.duel.on && this.duel.foe) {
      const f = this.duel.foe;
      const to = f.pos.clone().sub(origin);
      const dist = to.length();
      if (dist <= range) {
        to.normalize();
        if (to.dot(dir) > Math.cos((coneDeg * Math.PI) / 180)) return f;
      }
    }
    return null;
  }

  damagePlayer(dmg, sp) {
    if (this.duel.phase === 'countdown') return;
    if (this.player.iFrames > 0) return;
    let d = dmg || 0;
    if (this.spells.shieldT > 0) {
      if (this.spells.parryWindow > 0) {
        this.toast('Perfect Ward!');
        this.quests.onBlock();
        this.fx.burst(this.player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xffffff, 12);
        d = 0;
      } else {
        d *= 0.2;
        this.quests.onBlock();
      }
    }
    d = Math.min(d, this.save.maxHp * HIT_CAP);
    this.save.hp = Math.max(0, this.save.hp - d);
    if (d > 0) {
      this.fx.burst(this.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), (sp && sp.color) || 0xff4422, 6);
      const hurt = document.getElementById('hurt');
      if (hurt) { hurt.style.opacity = '0.55'; setTimeout(() => hurt.style.opacity = '0', 180); }
    }
    this.ui.updateHud();
  }

  onSpellCast(id) {
    this.quests.onSpellCast(id);
    if (!this.save.spells.includes(id) && this.spells.unlocked.has(id)) {
      this.save.spells = [...this.spells.unlocked];
    }
  }

  onHitTarget(target, dmg) {
    if (this.duel.on && this.duel.isPvp && this.duel.pvpPeer) {
      this.net.send({ t: 'dhit', to: this.duel.pvpPeer, d: dmg, spell: 'sparkbolt' });
    }
  }

  trySort() {
    if (this.save.sorted) return;
    const s = this.castle.spots.sorting;
    if (this.player.pos.distanceTo(new THREE.Vector3(s.x, 0, s.z)) > 4) return;
    this.ui.close();
    this._openSorting();
  }

  _openSorting() {
    const panel = document.getElementById('panel');
    panel.style.display = 'flex';
    const cards = Object.values(HOUSES).map(h => `
      <button class="house" data-house="${h.id}" style="--c:#${h.colors.primary.toString(16).padStart(6,'0')};--t:#${h.colors.secondary.toString(16).padStart(6,'0')}">
        <span class="crest">${h.crest}</span>
        <b>${h.name}</b>
        <small>${h.trait}</small>
        <em>${h.motto}</em>
      </button>`).join('');
    panel.innerHTML = `<div class="card wide sort"><h2>The Crescent Mirror</h2>
      <p>Choose your house — or let the Mirror sort you.</p>
      <div class="houses">${cards}</div>
      <button id="mirrorSort" class="big">✦ Let the Mirror Decide</button>
      <button data-act="close">Not yet</button></div>`;
    panel.querySelectorAll('[data-house]').forEach(b => b.onclick = () => this._finishSort(b.dataset.house));
    document.getElementById('mirrorSort').onclick = () => {
      const ids = Object.keys(HOUSES);
      this._finishSort(ids[Math.floor(Math.random() * ids.length)]);
    };
  }

  _finishSort(houseId) {
    this.save.house = houseId;
    this.save.sorted = true;
    this.player.rebuild(houseId);
    const h = HOUSES[houseId];
    this.quests.onSorted();
    // unlock starter path
    this.spells.unlock('sparkbolt');
    document.getElementById('panel').style.display = 'none';
    this.toast(`${h.crest} Sorted into ${h.name}!`);
    this.fx.burst(this.player.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), h.colors.secondary, 24);
    this.saveGame();
    this.ui.updateHud();
    // move toward common room
    setTimeout(() => this.toast(`Your common room is marked — follow the ${h.name} colours`), 2000);
  }

  interact() {
    if (this.secrets.tryInteract()) return;
    // NPCs
    for (const n of this.npcs) {
      if (this.player.pos.distanceTo(n.pos) < 3.2) {
        this.quests.talk(n.id);
        if (n.id === 'brindle' && this.save.quests?.first_lesson?.step >= 2) {
          this.spells.unlock('wandrift');
          this.spells.unlock('hovercharm');
          this.toast('Brindle teaches Wandrift & Hovercharm!');
          this.save.spells = [...this.spells.unlocked];
          this.saveGame();
        }
        if (n.id === 'brindle') this.spells.unlock('stunflare');
        return;
      }
    }
    this.trySort();
  }

  loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this._clock.getDelta());
    qTick(dt);
    pollKeys();
    this.save.stats.time += dt;

    // level-up soft
    while (this.save.xp >= this.save.lvl * 100) {
      this.save.xp -= this.save.lvl * 100;
      this.save.lvl++;
      this.save.maxHp = 100 + (this.save.lvl - 1) * 8;
      this.save.hp = this.save.maxHp;
      this.toast(`Level ${this.save.lvl}!`);
      // unlock by level
      for (const [id, sp] of Object.entries(SPELLS)) {
        if (sp.unlock <= this.save.lvl - 1) this.spells.unlock(id);
      }
      this.save.spells = [...this.spells.unlocked];
    }

    this.spells.update(dt);
    this.duel.update(dt);
    this.secrets.update(dt);

    // input actions
    if (consume('broom')) this.broom.toggle();
    if (IN.spellSlot >= 0) { this.spells.select(IN.spellSlot); IN.spellSlot = -1; }
    if (IN.shield) this.spells.raiseShield();
    if (IN.cast && !this.player.frozen) {
      this.spells.tryCast();
      // keep casting while held with small lock inside tryCast
    }
    if (consume('interact')) this.interact();

    if (this.broom.on) this.broom.update(dt, IN);
    else this.player.update(dt, IN);

    // projectiles vs player / foe
    this._projHits();

    // wisps
    for (const w of this.wisps) {
      if (!w.alive) continue;
      w.phase += dt;
      w.mesh.position.y = 1.5 + Math.sin(w.phase * 2) * 0.5;
      if (this.player.pos.distanceTo(w.pos) < 1.6) {
        w.alive = false; w.mesh.visible = false;
        this.save.stats.wisps = (this.save.stats.wisps || 0) + 1;
        this.fx.burst(w.pos, 0xaaccff, 8);
        if (this.save.stats.wisps >= 8) {
          this.quests.completeStep('forest_edge', 1);
          this.quests.completeStep('forest_edge', 2);
        }
      }
    }

    this.fx.update(dt);
    this.player.updateCamera(this.cam);

    // day-ish sun sway
    const t = performance.now() * 0.00005;
    this.sun.position.set(Math.cos(t) * 70, 80, Math.sin(t) * 50);

    this._netT += dt;
    if (this._netT > 0.1) { this._netT = 0; this.net.tick(); }

    this.ui.updateHud();
    renderer.clear();
    renderer.render(this.scene, this.cam);
  };

  _projHits() {
    for (const p of this.fx.parts) {
      if (p.kind !== 'proj' || p._hit) continue;
      if (p.owner === 'player' && this.duel.on && this.duel.foe) {
        if (p.m.position.distanceTo(this.duel.foe.pos.clone().setY(p.m.position.y)) < 1.3) {
          p._hit = true; p.life = 0;
          this.spells._applyHit(SPELLS[p.spell] || SPELLS.sparkbolt, this.duel.foe);
        }
      }
      if (p.targetPlayer || p.owner === 'enemy') {
        const pp = this.player.pos.clone(); pp.y = p.m.position.y;
        if (p.m.position.distanceTo(pp) < 1.2) {
          p._hit = true; p.life = 0;
          this.damagePlayer(p.dmg || 10, SPELLS[p.spell]);
        }
      }
    }
  }
}
