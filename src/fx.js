import { THREE, qv } from './engine.js';

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.bolts = [];
    this.rings = [];
  }

  bolt(from, to, color = 0xffe08a) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length() || 1;
    dir.normalize();
    const geo = new THREE.CylinderGeometry(0.06, 0.02, len, 6);
    geo.translate(0, len / 2, 0);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(from);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(m);
    this.bolts.push({ m, t: 0.18, mat });
  }

  projectile(pos, vel, color, life = 1.2) {
    const n = Math.max(4, Math.floor(8 * qv().parts));
    const geo = new THREE.SphereGeometry(0.12, n, n);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    this.scene.add(m);
    // trail light
    const light = new THREE.PointLight(color, 0.8, 6);
    m.add(light);
    this.parts.push({ m, vel: vel.clone(), life, max: life, mat, kind: 'proj' });
    return this.parts[this.parts.length - 1];
  }

  burst(pos, color = 0xffe08a, n = 12) {
    n = Math.floor(n * qv().parts);
    for (let i = 0; i < n; i++) {
      const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      this.scene.add(m);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 2, (Math.random() - 0.5) * 8);
      this.parts.push({ m, vel, life: 0.4 + Math.random() * 0.4, max: 0.8, mat, kind: 'burst' });
    }
  }

  shield(pos, color = 0x88ccff) {
    const geo = new THREE.SphereGeometry(1.4, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, wireframe: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos); m.position.y += 1;
    this.scene.add(m);
    this.rings.push({ m, mat, t: 1.6, max: 1.6 });
    return this.rings[this.rings.length - 1];
  }

  ring(pos, color = 0xffe08a) {
    const geo = new THREE.TorusGeometry(1.2, 0.08, 6, 20);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos); m.position.y += 1; m.rotation.x = Math.PI / 2;
    this.scene.add(m);
    this.rings.push({ m, mat, t: 0.5, max: 0.5, expand: true });
  }

  update(dt) {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t -= dt; b.mat.opacity = Math.max(0, b.t / 0.18);
      if (b.t <= 0) { this.scene.remove(b.m); b.m.geometry.dispose(); this.bolts.splice(i, 1); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.m.position.addScaledVector(p.vel, dt);
      if (p.kind === 'burst') p.vel.y -= 12 * dt;
      p.mat.opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) { this.scene.remove(p.m); p.m.geometry.dispose(); this.parts.splice(i, 1); }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t -= dt;
      r.mat.opacity = 0.35 * (r.t / r.max);
      if (r.expand) r.m.scale.setScalar(1 + (1 - r.t / r.max) * 2);
      if (r.t <= 0) { this.scene.remove(r.m); r.m.geometry.dispose(); this.rings.splice(i, 1); }
    }
  }

  clear() {
    for (const b of this.bolts) { this.scene.remove(b.m); }
    for (const p of this.parts) { this.scene.remove(p.m); }
    for (const r of this.rings) { this.scene.remove(r.m); }
    this.bolts = []; this.parts = []; this.rings = [];
  }
}
