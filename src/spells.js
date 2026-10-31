import { THREE } from './engine.js';
import { SPELLS, SPELL_ORDER, HIT_CAP } from './data.js';

export class Spellbook {
  constructor(game) {
    this.g = game;
    this.cds = {};
    this.active = 'sparkbolt';
    this.unlocked = new Set(['sparkbolt']);
    this.shieldT = 0;
    this.parryWindow = 0;
    this.floatT = 0;
    this.castLock = 0;
  }

  unlock(id) {
    if (SPELLS[id]) this.unlocked.add(id);
  }

  known() {
    const all = SPELL_ORDER.filter(id => this.unlocked.has(id));
    // Hotbar shows up to 8; full book in menu
    return all.slice(0, 8);
  }
  allKnown() { return SPELL_ORDER.filter(id => this.unlocked.has(id)); }

  select(i) {
    const k = this.known();
    if (k[i]) this.active = k[i];
  }

  canCast(id) {
    const S = this.g.save;
    const sp = SPELLS[id];
    if (!sp || !this.unlocked.has(id)) return false;
    if ((this.cds[id] || 0) > 0) return false;
    if (this.castLock > 0) return false;
    if (S.stamina < sp.stamina) return false;
    if (this.g.duel?.phase === 'countdown') return false;
    return true;
  }

  update(dt) {
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.parryWindow = Math.max(0, this.parryWindow - dt);
    this.floatT = Math.max(0, this.floatT - dt);
    this.castLock = Math.max(0, this.castLock - dt);
    // regen stamina
    const S = this.g.save;
    if (this.shieldT <= 0) S.stamina = Math.min(100, S.stamina + 18 * dt);
    else S.stamina = Math.min(100, S.stamina + 6 * dt);
  }

  tryCast(id) {
    id = id || this.active;
    if (!this.canCast(id)) return false;
    const sp = SPELLS[id];
    const S = this.g.save;
    S.stamina -= sp.stamina;
    this.cds[id] = sp.cd;
    this.castLock = 0.22;
    this.g.player.casting = 0.35;
    const origin = this.g.player.castOrigin();
    const dir = this.g.player.aimDir();

    switch (sp.kind) {
      case 'attack':
      case 'ice':
      case 'water':
      case 'air':
      case 'earth':
      case 'light':
      case 'dark':
        this._proj(sp, origin, dir); break;
      case 'shield':
        this.shieldT = sp.duration || 1.4;
        this.parryWindow = 0.28;
        this.g.fx.shield(this.g.player.pos, sp.color);
        break;
      case 'disarm':
      case 'stun':
      case 'control':
      case 'fire':
      case 'lightning':
        this._aimed(sp, origin, dir); break;
      case 'levitate':
        this.floatT = sp.duration || 2;
        this.g.fx.burst(this.g.player.pos.clone().add(new THREE.Vector3(0, 1, 0)), sp.color, 10);
        break;
      case 'mobility':
        this._blink(sp, dir); break;
      default:
        this._proj(sp, origin, dir);
    }
    this.g.onSpellCast?.(id);
    return true;
  }

  _proj(sp, origin, dir) {
    const vel = dir.clone().multiplyScalar(sp.speed || 40);
    const p = this.g.fx.projectile(origin, vel, sp.color, 1.4);
    p.spell = sp.id;
    p.dmg = sp.dmg;
    p.owner = 'player';
    p.slow = sp.slow; p.slowDur = sp.slowDur;
    p.onHit = (target) => this._applyHit(sp, target);
  }

  _aimed(sp, origin, dir) {
    this.g.fx.bolt(origin, origin.clone().add(dir.clone().multiplyScalar(sp.range || 14)), sp.color);
    this.g.fx.burst(origin.clone().add(dir.clone().multiplyScalar(Math.min(8, sp.range || 8))), sp.color, 8);
    const hit = this.g.findTarget(origin, dir, sp.range || 14, sp.cone || 25);
    if (hit) this._applyHit(sp, hit);
  }

  _blink(sp, dir) {
    const p = this.g.player;
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    if (flat.lengthSq() < 0.01) flat.set(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    p.pos.addScaledVector(flat, sp.dist || 7);
    p.iFrames = 0.35;
    this.g.fx.burst(p.pos.clone().add(new THREE.Vector3(0, 1, 0)), sp.color, 14);
    this.g.fx.ring(p.pos, sp.color);
  }

  _applyHit(sp, target) {
    if (!target || target.dead) return;
    if (this.g.duel?.phase === 'countdown') return;
    let dmg = sp.dmg || 0;
    // soft cap
    const maxHp = target.maxHp || target.max || 100;
    dmg = Math.min(dmg, maxHp * HIT_CAP);
    if (target.shielding) {
      if (target.parryWindow > 0) {
        // reflect
        this.g.fx.burst(target.pos, 0xffffff, 10);
        this.g.toast?.('Perfect Ward!');
        dmg = 0;
        if (target === this.g.duel?.foe || target.isNpc) {
          // interrupt foe
          target.stunT = Math.max(target.stunT || 0, 0.6);
        }
      } else dmg *= 0.2;
    }
    target.hp = Math.max(0, (target.hp || 0) - dmg);
    if (sp.stun) target.stunT = Math.max(target.stunT || 0, sp.stun);
    if (sp.root) target.rootT = Math.max(target.rootT || 0, sp.root);
    if (sp.slow) { target.slow = sp.slow; target.slowT = sp.slowDur || 2; }
    if (sp.interrupt) target.castT = 0;
    this.g.fx.burst(target.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), sp.color, 8);
    this.g.onHitTarget?.(target, dmg, sp);
  }

  raiseShield() {
    if (this.shieldT > 0.2) return; // already up
    if (!this.unlocked.has('aegis')) {
      // basic block even without spell — weaker
      this.shieldT = 0.4;
      this.parryWindow = 0.15;
      return;
    }
    if (this.canCast('aegis')) this.tryCast('aegis');
  }
}

export function enemyCast(game, foe, spellId) {
  const sp = SPELLS[spellId];
  if (!sp || !foe) return;
  const origin = foe.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
  const to = game.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  const dir = to.clone().sub(origin).normalize();
  if (sp.kind === 'shield') {
    foe.shielding = true; foe.parryWindow = 0.25; foe.shieldT = sp.duration;
    game.fx.shield(foe.pos, sp.color);
    return;
  }
  if (sp.kind === 'mobility') {
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize().multiplyScalar(-(sp.dist || 5));
    foe.pos.add(flat);
    foe.iFrames = 0.3;
    game.fx.burst(foe.pos, sp.color, 10);
    return;
  }
  if (['attack','ice','water','air','earth','light','dark'].includes(sp.kind)) {
    const vel = dir.multiplyScalar(sp.speed || 36);
    const p = game.fx.projectile(origin, vel, sp.color, 1.3);
    p.spell = sp.id; p.dmg = sp.dmg; p.owner = 'enemy'; p.targetPlayer = true;
    p.slow = sp.slow; p.slowDur = sp.slowDur;
  } else {
    game.fx.bolt(origin, to, sp.color);
    // hit player if in range/cone
    const dist = game.player.pos.distanceTo(foe.pos);
    if (dist < (sp.range || 14)) {
      game.damagePlayer(sp.dmg || 0, sp);
    }
  }
}
