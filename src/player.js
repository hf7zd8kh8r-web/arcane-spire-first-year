import { THREE } from './engine.js';
import { makeStudent, animateStudent } from './chars.js';
import { groundY } from './castle.js';
import { MAX_HP, MAX_STAMINA } from './data.js';

export class Player {
  constructor(game) {
    this.g = game;
    this.pos = new THREE.Vector3(0, 0, 20);
    this.yaw = Math.PI; // facing north (great hall)
    this.pitch = 0.15;
    this.vy = 0;
    this.mesh = null;
    this.casting = 0;
    this.iFrames = 0;
    this.frozen = false;
    this.onBroom = false;
    this.radius = 0.45;
    this.camDist = 5.5;
    this.camH = 2.2;
  }

  rebuild(house) {
    if (this.mesh) this.g.scene.remove(this.mesh);
    this.mesh = makeStudent({
      house: house || this.g.save.house || 'emberforge',
      skin: this.g.save.look?.skin || 0,
      hair: this.g.save.look?.hair || 0,
    });
    this.g.scene.add(this.mesh);
  }

  castOrigin() {
    return this.pos.clone().add(new THREE.Vector3(
      Math.sin(this.yaw) * 0.6, 1.4, Math.cos(this.yaw) * 0.6
    ));
  }

  aimDir() {
    const cy = Math.cos(this.pitch), sy = Math.sin(this.pitch);
    return new THREE.Vector3(Math.sin(this.yaw) * cy, -sy, Math.cos(this.yaw) * cy).normalize();
  }

  update(dt, IN) {
    this.casting = Math.max(0, this.casting - dt);
    this.iFrames = Math.max(0, this.iFrames - dt);

    // look
    this.yaw -= IN.lookDx * 0.0035;
    this.pitch = Math.max(-0.9, Math.min(0.85, this.pitch + IN.lookDy * 0.003));
    IN.lookDx = 0; IN.lookDy = 0;

    if (this.frozen || this.onBroom) {
      if (this.mesh) {
        this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
        this.mesh.rotation.y = this.yaw;
        this.mesh.visible = !this.onBroom;
      }
      return;
    }

    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let spd = 6.5;
    if (this.g.spells.floatT > 0) spd *= 1.15;
    const move = new THREE.Vector3()
      .addScaledVector(forward, IN.ay)
      .addScaledVector(right, IN.ax);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(spd * dt);

    // dodge roll (Blinkstep if unlocked & ready, else stamina roll)
    if (IN.dodge) {
      IN.dodge = false;
      if (this.g.spells.unlocked.has('blinkstep') && this.g.spells.canCast('blinkstep')) {
        this.g.spells.tryCast('blinkstep');
      } else if (this.g.save.stamina >= 18) {
        this.g.save.stamina -= 18;
        const d = move.lengthSq() > 0 ? move.clone().normalize() : forward.clone();
        this.pos.addScaledVector(d, 4.5);
        this.iFrames = 0.38;
        this.g.fx.ring(this.pos, 0xfff0c0);
      }
    }

    this.pos.x += move.x; this.pos.z += move.z;

    // gravity / jump
    const gy = groundY(this.pos.x, this.pos.z);
    if (IN.jump && this.pos.y <= gy + 0.05) {
      IN.jump = false;
      this.vy = 7.5;
    }
    if (this.g.spells.floatT > 0) {
      this.vy = Math.max(0.5, this.vy);
      this.pos.y += 1.5 * dt;
    } else {
      this.vy -= 22 * dt;
      this.pos.y += this.vy * dt;
    }
    if (this.pos.y < gy) { this.pos.y = gy; this.vy = 0; }

    // soft world bounds
    this.pos.x = Math.max(-105, Math.min(105, this.pos.x));
    this.pos.z = Math.max(-105, Math.min(105, this.pos.z));

    // collide with castle cylinders (soft push)
    for (const c of this.g.castle.colliders) {
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = (c.r || 4) + this.radius;
      if (d < min && d > 0.01) {
        const push = (min - d) / d;
        this.pos.x += dx * push; this.pos.z += dz * push;
      }
    }

    if (this.mesh) {
      this.mesh.visible = true;
      this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.mesh.rotation.y = this.yaw;
      animateStudent(this.mesh, dt, move.lengthSq() > 0, this.casting > 0, this.g.spells.shieldT > 0);
    }
  }

  updateCamera(cam) {
    const dist = this.onBroom ? 8 : (this.g.duel?.on ? 7 : this.camDist);
    const h = this.onBroom ? 2.8 : this.camH;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const ox = -Math.sin(this.yaw) * cp * dist;
    const oy = h + sp * dist;
    const oz = -Math.cos(this.yaw) * cp * dist;
    const target = new THREE.Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z);
    if (this.g.duel?.on && this.g.duel.foe) {
      target.lerp(this.g.duel.foe.pos.clone().setY(this.pos.y + 1.4), 0.25);
    }
    const desired = new THREE.Vector3(this.pos.x + ox, this.pos.y + oy, this.pos.z + oz);
    cam.position.lerp(desired, 0.18);
    cam.lookAt(target);
  }
}
