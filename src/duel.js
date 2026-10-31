import { THREE } from './engine.js';
import { DUELISTS, HOUSES, SPELLS } from './data.js';
import { makeDuelist, animateStudent } from './chars.js';
import { enemyCast } from './spells.js';

const ARENA = { x: 0, y: 80, z: 0 };

export class Duel {
  constructor(game) {
    this.g = game;
    this.on = false;
    this.phase = 'idle'; // countdown | fight | end
    this.foe = null;
    this.mesh = null;
    this.count = 3;
    this._t = 0;
    this.arena = false;
    this.returnPos = null;
    this.isPvp = false;
    this.pvpPeer = null;
    this.result = null;
    this._hud = null;
  }

  challengeNpc(id) {
    const d = DUELISTS.find(x => x.id === id);
    if (!d) return;
    this.start({
      name: d.name, house: d.house, lvl: d.lvl, hp: d.hp, maxHp: d.hp,
      spells: d.spells.slice(), style: d.style, isNpc: true, id: d.id,
    });
  }

  start(foeInfo, opts = {}) {
    if (this.on) return;
    this.on = true;
    this.isPvp = !!opts.pvp;
    this.pvpPeer = opts.peer || null;
    this.result = null;
    this.returnPos = this.g.player.pos.clone();
    this.returnYaw = this.g.player.yaw;
    this.arena = true;
    // teleport both to arena
    this.g.player.pos.set(ARENA.x - 6, ARENA.y, ARENA.z);
    this.g.player.yaw = Math.PI / 2;
    this.g.player.vy = 0;
    this.g.player.hp = this.g.save.hp;
    this.g.buildArena?.(true);

    this.foe = {
      ...foeInfo,
      pos: new THREE.Vector3(ARENA.x + 6, ARENA.y, ARENA.z),
      yaw: -Math.PI / 2,
      hp: foeInfo.hp || foeInfo.maxHp || 100,
      maxHp: foeInfo.maxHp || foeInfo.hp || 100,
      stamina: 100,
      stunT: 0, rootT: 0, slowT: 0, slow: 1,
      shieldT: 0, shielding: false, parryWindow: 0,
      iFrames: 0, castT: 0, cd: {}, aiT: 0.5,
      dead: false, isNpc: !!foeInfo.isNpc,
    };
    if (this.mesh) { this.g.scene.remove(this.mesh); }
    this.mesh = makeDuelist(foeInfo.house || 'stormcrown', 1, 2);
    this.mesh.position.copy(this.foe.pos);
    this.g.scene.add(this.mesh);

    this.phase = 'countdown';
    this.count = 3;
    this._t = 1;
    this.g.player.fpMode = true;
    if (this.g.player.mesh) this.g.player.mesh.visible = false;
    this.showCount(3);
    this.showHud(true);
    this.g.ui?.showFpCards?.(true);
    this.g.toast?.('First-person duel — cards at the bottom!');
  }

  showCount(n) {
    let el = document.getElementById('duelcount');
    if (!el) {
      el = document.createElement('div'); el.id = 'duelcount';
      document.getElementById('hud').appendChild(el);
    }
    el.style.display = 'flex';
    el.textContent = n > 0 ? String(n) : 'FIGHT!';
    el.className = n > 0 ? '' : 'fight';
  }
  hideCount() {
    const el = document.getElementById('duelcount');
    if (el) el.style.display = 'none';
  }

  showHud(on) {
    let el = document.getElementById('duelhud');
    if (!el) {
      el = document.createElement('div'); el.id = 'duelhud';
      el.innerHTML = `<div class="dh"><b id="duelFoeN"></b><i id="duelFoeH"></i></div>
        <div class="dh you"><b>You</b><i id="duelYouH"></i></div>`;
      document.getElementById('hud').appendChild(el);
    }
    el.style.display = on ? 'block' : 'none';
    if (on && this.foe) document.getElementById('duelFoeN').textContent = this.foe.name;
  }

  update(dt) {
    if (!this.on) return;
    if (this.phase === 'countdown') {
      this._t -= dt;
      if (this._t <= 0) {
        this.count--;
        if (this.count > 0) { this._t = 1; this.showCount(this.count); }
        else if (this.count === 0) { this._t = 0.7; this.showCount(0); }
        else { this.phase = 'fight'; this.hideCount(); }
      }
      // freeze player & foe — no damage
      this.g.player.frozen = true;
      return;
    }
    this.g.player.frozen = false;
    if (this.phase === 'fight') {
      this._updateFoe(dt);
      this._syncHud();
      if (this.mesh && this.foe) {
        this.mesh.position.copy(this.foe.pos);
        this.mesh.rotation.y = this.foe.yaw;
        animateStudent(this.mesh, dt, true, this.foe.castT > 0, this.foe.shielding);
      }
      if (this.foe.hp <= 0) this.finish('win');
      else if (this.g.save.hp <= 0) this.finish('lose');
    }
  }

  _syncHud() {
    const fh = document.getElementById('duelFoeH');
    const yh = document.getElementById('duelYouH');
    if (fh && this.foe) fh.style.width = (100 * this.foe.hp / this.foe.maxHp) + '%';
    if (yh) yh.style.width = (100 * this.g.save.hp / this.g.save.maxHp) + '%';
  }

  _updateFoe(dt) {
    const f = this.foe; if (!f || f.dead) return;
    f.stunT = Math.max(0, f.stunT - dt);
    f.rootT = Math.max(0, f.rootT - dt);
    f.slowT = Math.max(0, f.slowT - dt);
    f.iFrames = Math.max(0, f.iFrames - dt);
    f.castT = Math.max(0, f.castT - dt);
    f.shieldT = Math.max(0, f.shieldT - dt);
    if (f.shieldT <= 0) { f.shielding = false; f.parryWindow = 0; }
    else f.parryWindow = Math.max(0, f.parryWindow - dt);
    for (const k of Object.keys(f.cd)) f.cd[k] = Math.max(0, f.cd[k] - dt);
    f.stamina = Math.min(100, f.stamina + 14 * dt);

    if (this.isPvp) return; // remote peer drives foe via net
    if (f.stunT > 0 || f.rootT > 0) return;

    const p = this.g.player.pos;
    const to = p.clone().sub(f.pos); to.y = 0;
    const dist = to.length();
    if (dist > 0.1) f.yaw = Math.atan2(to.x, to.z);
    const spd = 3.2 * (f.slowT > 0 ? (f.slow || 0.5) : 1);

    // style-based AI
    f.aiT -= dt;
    if (f.style === 'aggressive') {
      if (dist > 5) f.pos.addScaledVector(to.normalize(), spd * dt);
      else if (dist < 3) f.pos.addScaledVector(to.normalize(), -spd * 0.6 * dt);
    } else if (f.style === 'tricky') {
      if (dist > 8) f.pos.addScaledVector(to.normalize(), spd * dt);
      else {
        const side = new THREE.Vector3(-to.z, 0, to.x).normalize();
        f.pos.addScaledVector(side, spd * 0.8 * dt * Math.sin(performance.now() * 0.002));
      }
    } else if (f.style === 'tank') {
      if (dist > 6) f.pos.addScaledVector(to.normalize(), spd * 0.7 * dt);
      if (f.hp < f.maxHp * 0.4 && !(f.cd.aegis > 0)) this._aiCast(f, 'aegis');
    } else { // champion
      if (dist > 7) f.pos.addScaledVector(to.normalize(), spd * dt);
      else if (dist < 4) f.pos.addScaledVector(to.normalize(), -spd * dt);
    }

    // keep on arena pad
    const dx = f.pos.x - ARENA.x, dz = f.pos.z - ARENA.z;
    const r = Math.hypot(dx, dz);
    if (r > 14) { f.pos.x = ARENA.x + dx / r * 14; f.pos.z = ARENA.z + dz / r * 14; }
    f.pos.y = ARENA.y;

    if (f.aiT <= 0) {
      f.aiT = 0.6 + Math.random() * 0.8;
      this._aiDecide(f, dist);
    }
  }

  _aiDecide(f, dist) {
    const spells = f.spells || ['sparkbolt'];
    if (f.hp < f.maxHp * 0.35 && spells.includes('aegis') && !(f.cd.aegis > 0)) {
      this._aiCast(f, 'aegis'); return;
    }
    if (dist < 5 && spells.includes('cinderlash') && !(f.cd.cinderlash > 0)) {
      this._aiCast(f, 'cinderlash'); return;
    }
    if (dist > 10 && spells.includes('blinkstep') && !(f.cd.blinkstep > 0)) {
      this._aiCast(f, 'blinkstep'); return;
    }
    if (Math.random() < 0.3 && spells.includes('wandrift') && !(f.cd.wandrift > 0)) {
      this._aiCast(f, 'wandrift'); return;
    }
    const atk = spells.find(s => ['sparkbolt', 'frostneedle', 'thundercoil', 'stunflare', 'hexbind'].includes(s) && !(f.cd[s] > 0)) || 'sparkbolt';
    this._aiCast(f, atk);
  }

  _aiCast(f, id) {
    const sp = SPELLS[id]; if (!sp) return;
    if ((f.cd[id] || 0) > 0) return;
    if (f.stamina < sp.stamina) return;
    f.stamina -= sp.stamina;
    f.cd[id] = sp.cd;
    f.castT = 0.35;
    enemyCast(this.g, f, id);
  }

  finish(result) {
    if (this.phase === 'end') return;
    this.phase = 'end';
    this.result = result;
    this.g.player.frozen = false;
    if (result === 'win') {
      this.g.save.xp = (this.g.save.xp || 0) + 40 + (this.foe.lvl || 1) * 10;
      this.g.save.stats.duels = (this.g.save.stats.duels || 0) + 1;
      this.g.toast?.('Victory! +XP');
      if (this.foe.isNpc) this.g.quests?.onDuelWin(this.foe.id);
    } else {
      this.g.save.hp = Math.max(1, Math.floor(this.g.save.maxHp * 0.35));
      this.g.toast?.('Defeat — retreat and recover');
    }
    this.showHud(false);
    this.hideCount();
    setTimeout(() => this.end(), 1600);
  }

  forfeit() { this.finish('lose'); }

  end() {
    this.on = false; this.phase = 'idle';
    if (this.mesh) { this.g.scene.remove(this.mesh); this.mesh = null; }
    this.foe = null; this.arena = false;
    this.g.buildArena?.(false);
    if (this.returnPos) {
      this.g.player.pos.copy(this.returnPos);
      this.g.player.yaw = this.returnYaw || 0;
    }
    this.g.player.frozen = false;
    this.g.player.fpMode = false;
    if (this.g.player.mesh) this.g.player.mesh.visible = true;
    this.g.ui?.showFpCards?.(false);
  }
}

export function makeArenaMesh() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 1.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.85, metalness: 0.1 })
  );
  floor.position.y = -0.6; floor.receiveShadow = true; g.add(floor);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.15, 48),
    new THREE.MeshStandardMaterial({ color: 0x4a4068, roughness: 0.7, metalness: 0.15 })
  );
  inner.position.y = 0.05; inner.receiveShadow = true; g.add(inner);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(15.5, 0.3, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xc8a050 })
  );
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(10, 0.12, 6, 40),
    new THREE.MeshBasicMaterial({ color: 0x8866aa })
  );
  ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.2; g.add(ring2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.85, 8, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a5070, roughness: 0.8, metalness: 0.08 })
    );
    p.position.set(Math.cos(a) * 14.5, 4, Math.sin(a) * 14.5);
    p.castShadow = true; g.add(p);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3048, roughness: 0.65, metalness: 0.1 })
    );
    cap.position.set(Math.cos(a) * 14.5, 9.1, Math.sin(a) * 14.5);
    g.add(cap);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa44, emissiveIntensity: 1.5 })
    );
    flame.position.set(Math.cos(a) * 14.5, 8.2, Math.sin(a) * 14.5);
    g.add(flame);
  }
  // backdrop dome so world below is hidden
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x1a1830, side: THREE.BackSide, fog: false })
  );
  dome.position.y = -1; g.add(dome);
  const mist = new THREE.Mesh(
    new THREE.CylinderGeometry(38, 38, 2, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x2a2450, transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false })
  );
  mist.position.y = 6; g.add(mist);
  g.position.set(ARENA.x, ARENA.y, ARENA.z);
  g.visible = false;
  return g;
}
