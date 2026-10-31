import { THREE, renderer, makeScene, makeCamera, qTick, applyQuality, qualityHooks, setupComposer, renderFrame } from './engine.js';
import { IN, pollKeys, consume, setUnfreezeHandler, resetTouchAxes } from './input.js';
import { buildCastle, groundY } from './castle.js';
import { Player } from './player.js';
import { Spellbook } from './spells.js';
import { FX } from './fx.js';
import { Duel, makeArenaMesh } from './duel.js';
import { BroomFlight } from './broom.js';
import { Secrets } from './secrets.js';
import { Quests } from './quests.js';
import { Net } from './net.js';
import { makeTutor, makeStudent, makeClassmate } from './chars.js';
import { HOUSES, SPELLS, HIT_CAP } from './data.js';
import { CreatureSystem } from './creatures.js';
import { Cutscenes } from './cutscenes.js';
import { Schedule } from './schedule.js';
import { CardBattle } from './cardbattle.js';
import { Benches } from './benches.js';
import * as ST from './state.js';

export class Game {
  constructor(ui) {
    this.ui = ui;
    const { scene, sun } = makeScene();
    this.scene = scene; this.sun = sun;
    this.cam = makeCamera();
    setupComposer(scene, this.cam);
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
    this.creatures = new CreatureSystem(this);
    this.cutscenes = new Cutscenes(this);
    this.schedule = new Schedule(this);
    this.cards = new CardBattle(this);
    this.benches = new Benches(this);
    this.arenaMesh = makeArenaMesh();
    this.scene.add(this.arenaMesh);
    this.npcs = [];
    this.wisps = [];
    this.save = null;
    this.running = false;
    this._clock = new THREE.Clock();
    this._netT = 0;
    this._hudClock = 0;
    qualityHooks.push(() => {
      this.cam.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      this.cam.updateProjectionMatrix();
    });
    applyQuality();
    setUnfreezeHandler(() => this.unfreezeAll());
  }

  toast(msg, k) { this.ui.toast(msg, k); }

  /** Clear every soft-lock that can strand an iPhone player. */
  unfreezeAll() {
    resetTouchAxes();
    this.player.frozen = false;
    this.player.fpMode = false;
    if (this.player.mesh) this.player.mesh.visible = true;
    this.cutscenes?.forceEnd?.();
    this.cards?.close?.();
    this.benches?.close?.();
    this.ui?.close?.();
    for (const id of ['cutscene', 'cardbattle', 'travelmap', 'panel']) {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.style.pointerEvents = 'none'; }
    }
    // End duel soft-lock without teleport glitch if mid-countdown
    if (this.duel?.on && this.duel.phase === 'countdown') {
      this.duel.hideCount?.();
      this.duel.phase = 'fight';
      this.player.frozen = false;
    }
    IN.enabled = true;
    this.toast('Unfrozen — use the ▲◀▶▼ pad or drag left to move');
    this.saveGame?.();
  }

  saveGame() { if (this.save) ST.save(this.save); }

  start(save) {
    this.save = save;
    if (!save.year) save.year = 1;
    if (!save.creatures) save.creatures = { owned: [], plants: [], cards: {}, points: 3, items: 0 };
    if (!save.school) save.school = { year: save.year, grade: 'New', attended: {}, skipped: {}, detentions: 0, detentionTask: null, scheduleKnown: false };
    this.quests.ensure();
    this.schedule.ensure();
    this.creatures.ensureSave();
    this.spells.unlocked = new Set(save.spells || ['sparkbolt']);
    if (save.house) this.player.rebuild(save.house);
    else this.player.rebuild('emberforge');
    if (!save.sorted) { this.player.pos.set(0, 0, 18); this.player.yaw = Math.PI; }
    else {
      const c = HOUSES[save.house]?.common;
      if (c) { this.player.pos.set(c.x * 0.35, 0, 18); this.player.yaw = Math.PI; }
      else { this.player.pos.set(0, 0, 18); this.player.yaw = Math.PI; }
    }
    this._spawnNpcs();
    this._spawnWisps();
    this.creatures.spawnWild();
    if (new URLSearchParams(location.search).has('skip') || save.skipCutscene) {
      save.seenTrain = true;
    }
    this.running = true;
    this._clock.start();
    this.loop();
    this.ui.updateHud();
    this.ui.updateQuest();

    const skipCS = new URLSearchParams(location.search).has('skip') || save.skipCutscene;
    if (!save.seenTrain && !skipCS) {
      setTimeout(() => this.cutscenes.playTrainIntro(), 600);
    } else if (!save.sorted) {
      setTimeout(() => this.toast('Enter the Great Hall and approach the Crescent Mirror to sort'), 1200);
    } else if (save.year && save.year > 1 && !save.seenYear?.[save.year]) {
      setTimeout(() => {
        this.cutscenes.playYear(save.year);
        save.seenYear = save.seenYear || {};
        save.seenYear[save.year] = true;
        this.saveGame();
      }, 800);
    }
  }

  _spawnNpcs() {
    for (const n of this.npcs) this.scene.remove(n.mesh);
    this.npcs = [];
    const list = [
      { id: 'brindle', name: 'Tutor Brindle', mesh: makeTutor(0x3a4060), pos: [52, 0, -8], talk: true },
      { id: 'rowan', name: 'Keeper Rowan', mesh: makeTutor(0x2a5030), pos: [72, 0, -5], talk: true },
      { id: 'pitch', name: 'Coach Nyx', mesh: makeTutor(0x4a3050), pos: [48, 0, 50], talk: true },
      { id: 'prefect', name: 'Prefect Cal', mesh: makeStudent({ house: 'stormcrown', skin: 2, hair: 1 }), pos: [5, 0, -40], talk: false },
      { id: 'lira', name: 'Lira Fen', mesh: makeClassmate('mistvale'), pos: [8, 0, 14], talk: true, classmate: true },
      { id: 'joren', name: 'Joren Ash', mesh: makeClassmate('emberforge'), pos: [-10, 0, 10], talk: true, classmate: true },
      { id: 'sae', name: 'Sae Quill', mesh: makeClassmate('stormcrown'), pos: [4, 0, -8], talk: true, classmate: true },
      { id: 'archivist', name: 'Archivist Moss', mesh: makeTutor(0x4a3a28), pos: [-55, 0, -8], talk: true },
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
        new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688cc, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 })
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
    this.spells.unlock('sparkbolt');
    document.getElementById('panel').style.display = 'none';
    this.toast(`${h.crest} Sorted into ${h.name}!`);
    this.fx.burst(this.player.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), h.colors.secondary, 24);
    this.saveGame();
    this.ui.updateHud();
    setTimeout(() => this.toast(`Ask classmates for the timetable — then attend Charms`), 1800);
  }

  interact() {
    if (this.cutscenes.on) { this.cutscenes.advance(); return; }
    if (this.benches.trySit()) return;
    if (this.creatures.tryInteract()) {
      const S = this.save.creatures;
      if (S.owned.length >= 1) this.quests.completeStep?.('beast_friend', 0);
      if (S.plants.length >= 1) this.quests.completeStep?.('beast_friend', 1);
      return;
    }
    // Detention lantern polish near courtyard posts
    if (this.save.school?.detentionTask) {
      const p = this.player.pos;
      if (Math.abs(p.x) > 3 && Math.abs(p.x) < 8 && p.z > 0 && p.z < 55) {
        this.schedule.detentionProgress();
        this.fx.burst(p.clone().setY(2), 0xffe8a0, 8);
        return;
      }
    }
    // Attend class if near room during period
    if (this.schedule.tryAttend()) {
      this.quests.completeStep?.('timetable', 1);
      return;
    }
    for (const n of this.npcs) {
      if (this.player.pos.distanceTo(n.pos) < 3.2) {
        this.quests.talk(n.id);
        if (n.classmate) {
          this.schedule.learnSchedule();
          this.quests.completeStep?.('timetable', 0);
          this.toast(`${n.name}: "Here's today's timetable — don't skip or Prefect Cal gives detention."`);
          return;
        }
        if (n.id === 'brindle' && this.save.quests?.first_lesson?.step >= 2) {
          this.spells.unlock('wandrift');
          this.spells.unlock('hovercharm');
          this.toast('Brindle teaches Wandrift & Hovercharm!');
          this.save.spells = [...this.spells.unlocked];
          this.saveGame();
        }
        if (n.id === 'brindle') this.spells.unlock('stunflare');
        if (n.id === 'archivist') {
          // unlock a few library spells
          ['moonbolt', 'moonveil', 'aegis'].forEach(id => this.spells.unlock(id));
          this.save.spells = [...this.spells.unlocked];
          this.toast('Archivist Moss shares three Moon-school workings');
          this.saveGame();
        }
        if (n.id === 'rowan') {
          this.toast('Rowan: "Tame Edgewood creatures — rescue plants for training items."');
        }
        return;
      }
    }
    this.trySort();
  }

  advanceYear() {
    const y = Math.min(7, (this.save.year || 1) + 1);
    this.save.year = y;
    this.save.school.year = y;
    this.save.seenYear = this.save.seenYear || {};
    this.cutscenes.playYear(y);
    this.save.seenYear[y] = true;
    // unlock batch of spells by year
    for (const [id, sp] of Object.entries(SPELLS)) {
      if (sp.unlock <= y - 1) this.spells.unlock(id);
    }
    this.save.spells = [...this.spells.unlocked];
    this.saveGame();
    this.toast(`Welcome to Year ${y}`);
  }

  loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this._clock.getDelta());
    qTick(dt);
    pollKeys();
    this.save.stats.time += dt;

    while (this.save.xp >= this.save.lvl * 100) {
      this.save.xp -= this.save.lvl * 100;
      this.save.lvl++;
      this.save.maxHp = 100 + (this.save.lvl - 1) * 8;
      this.save.hp = this.save.maxHp;
      this.toast(`Level ${this.save.lvl}!`);
      for (const [id, sp] of Object.entries(SPELLS)) {
        if (sp.unlock <= this.save.lvl - 1) this.spells.unlock(id);
      }
      this.save.spells = [...this.spells.unlocked];
    }

    this.spells.update(dt);
    this.duel.update(dt);
    this.secrets.update(dt);
    this.schedule.update(dt);
    this.creatures.update(dt);

    if (consume('broom')) this.broom.toggle();
    if (IN.spellSlot >= 0) { this.spells.select(IN.spellSlot); IN.spellSlot = -1; }
    if (IN.shield) this.spells.raiseShield();
    if (IN.cast && !this.player.frozen && !this.cutscenes.on && !this.cards.on) {
      this.spells.tryCast();
    }
    if (consume('interact')) this.interact();

    if (this.broom.on) this.broom.update(dt, IN);
    else this.player.update(dt, IN);  // frozen flag inside Player blocks move; cutscene must not skip the whole update

    this._projHits();

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

    const t = performance.now() * 0.00005;
    this.sun.position.set(Math.cos(t) * 70, 80, Math.sin(t) * 50);

    this._netT += dt;
    if (this._netT > 0.1) { this._netT = 0; this.net.tick(); }

    this._hudClock += dt;
    if (this._hudClock > 0.5) {
      this._hudClock = 0;
      this.ui.updateHud();
      const clock = document.getElementById('clock');
      if (clock) clock.textContent = this.schedule.clockText() + (this.save.school?.grade ? ` · ${this.save.school.grade}` : '');
    }

    renderFrame(this.scene, this.cam);
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
