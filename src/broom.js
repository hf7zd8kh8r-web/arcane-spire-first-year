import { THREE, Builder, mat } from './engine.js';

export function makeBroom() {
  const B = new Builder();
  B.cyl(0.04, 0.05, 1.6, 0x6a4020, mat(0, 0, 0, 0, 0, Math.PI / 2), { seg: 6 });
  B.cyl(0.18, 0.05, 0.55, 0xc8a050, mat(0.95, 0, 0, 0, 0, Math.PI / 2), { seg: 8 });
  B.box(0.08, 0.12, 0.2, 0x3a2810, mat(-0.5, 0.08, 0));
  return B.build(false);
}

export class BroomFlight {
  constructor(game) {
    this.g = game;
    this.on = false;
    this.mesh = null;
    this.vel = new THREE.Vector3();
    this.sport = null; // Aetherchase match
  }

  toggle() {
    if (this.on) this.dismount();
    else this.mount();
  }

  mount() {
    if (this.on || this.g.duel?.on) return;
    this.on = true;
    if (!this.mesh) {
      this.mesh = makeBroom();
      this.g.scene.add(this.mesh);
    }
    this.mesh.visible = true;
    this.vel.set(0, 0, 0);
    this.g.player.onBroom = true;
    this.g.toast?.('Broom mounted — steer with move, climb with jump, dismount with B');
  }

  dismount() {
    this.on = false;
    this.g.player.onBroom = false;
    if (this.mesh) this.mesh.visible = false;
    if (this.sport) this.endSport();
  }

  update(dt, input) {
    if (!this.on) return;
    const p = this.g.player;
    const yaw = p.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const accel = 18;
    this.vel.x += (forward.x * input.ay + right.x * input.ax) * accel * dt;
    this.vel.z += (forward.z * input.ay + right.z * input.ax) * accel * dt;
    if (input.jump) this.vel.y += 14 * dt;
    this.vel.y -= 6 * dt; // gentle sink
    // drag
    this.vel.multiplyScalar(1 - 2.2 * dt);
    p.pos.addScaledVector(this.vel, dt);
    // floor clamp
    if (p.pos.y < 1.5) { p.pos.y = 1.5; this.vel.y = Math.max(0, this.vel.y); }
    if (p.pos.y > 40) { p.pos.y = 40; this.vel.y = Math.min(0, this.vel.y); }
    // bounds
    p.pos.x = Math.max(-110, Math.min(110, p.pos.x));
    p.pos.z = Math.max(-110, Math.min(110, p.pos.z));

    if (this.mesh) {
      this.mesh.position.set(p.pos.x, p.pos.y + 0.3, p.pos.z);
      this.mesh.rotation.y = yaw;
      this.mesh.rotation.z = -input.ax * 0.35;
      this.mesh.rotation.x = this.vel.y * 0.04;
    }
    if (this.sport) this._sportUpdate(dt);
  }

  startSport() {
    if (!this.on) this.mount();
    const pitch = this.g.castle.spots.pitch;
    this.g.player.pos.set(pitch.x - 12, 6, pitch.z);
    this.sport = {
      score: 0, need: 3, t: 90,
      hasOrb: false,
      orb: this._makeOrb(pitch.x, 8, pitch.z),
      rings: this._makeRings(pitch),
      goals: [
        { x: pitch.x - 15, z: pitch.z, team: 'you' },
        { x: pitch.x + 15, z: pitch.z, team: 'foe' },
      ],
    };
    this.g.toast?.('Aetherchase! Grab the Relic orb, fly through rings, score in the crimson goal!');
    this._sportHud(true);
  }

  _makeOrb(x, y, z) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe080 })
    );
    m.position.set(x, y, z);
    this.g.scene.add(m);
    const light = new THREE.PointLight(0xffe080, 1.2, 10);
    m.add(light);
    return m;
  }

  _makeRings(pitch) {
    const rings = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.12, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0xc8a050 })
      );
      m.position.set(pitch.x - 10 + t * 20, 5 + Math.sin(i * 1.2) * 2.5, pitch.z - 6 + (i % 2) * 12);
      m.rotation.y = Math.PI / 2;
      this.g.scene.add(m);
      rings.push({ m, hit: false });
    }
    return rings;
  }

  _sportHud(on) {
    let el = document.getElementById('sportHud');
    if (!el) {
      el = document.createElement('div'); el.id = 'sportHud';
      document.getElementById('hud').appendChild(el);
    }
    el.style.display = on ? 'block' : 'none';
    if (on && this.sport) el.textContent = `Aetherchase  ${this.sport.score}/${this.sport.need}  ·  ${Math.ceil(this.sport.t)}s`;
  }

  _sportUpdate(dt) {
    const s = this.sport; if (!s) return;
    s.t -= dt;
    const p = this.g.player.pos;
    // rings
    for (const r of s.rings) {
      if (r.hit) continue;
      if (r.m.position.distanceTo(p) < 2.4) {
        r.hit = true; r.m.material.color.setHex(0x66ff99);
        this.g.fx.burst(r.m.position, 0xc8a050, 8);
      }
    }
    // orb pickup
    if (!s.hasOrb && s.orb && s.orb.position.distanceTo(p) < 1.8) {
      s.hasOrb = true; s.orb.visible = false;
      this.g.toast?.('Relic secured! Score at the crimson ring!');
    }
    if (s.hasOrb) {
      const goal = s.goals[0];
      if (Math.hypot(p.x - goal.x, p.z - goal.z) < 2.5 && p.y < 8) {
        s.score++; s.hasOrb = false;
        s.orb.visible = true;
        s.orb.position.set(50 + (Math.random() - 0.5) * 10, 7 + Math.random() * 4, 55 + (Math.random() - 0.5) * 8);
        this.g.fx.burst(p, 0xff4466, 16);
        this.g.toast?.(`Goal! ${s.score}/${s.need}`);
        this.g.quests?.onAetherScore();
      }
    }
    this._sportHud(true);
    if (s.score >= s.need) {
      this.g.toast?.('Aetherchase complete!');
      this.g.quests?.completeStep('aetherchase', 1);
      this.endSport();
    } else if (s.t <= 0) {
      this.g.toast?.('Time\'s up!');
      this.endSport();
    }
  }

  endSport() {
    if (!this.sport) return;
    if (this.sport.orb) this.g.scene.remove(this.sport.orb);
    for (const r of this.sport.rings) this.g.scene.remove(r.m);
    this.sport = null;
    this._sportHud(false);
  }
}
