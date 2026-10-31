import { THREE, renderer, Builder, mat, toonMat } from './engine.js';

/** Title-screen floating crest / moonspire. */
export class Cover {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1020);
    this.cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.cam.position.set(0, 1.2, 7);
    const light = new THREE.DirectionalLight(0xffe8c0, 1.2);
    light.position.set(3, 5, 4); this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0x405080, 0.5));
    this.scene.add(new THREE.PointLight(0x88aaff, 0.8, 20).translateY(2));

    const B = new Builder();
    // Crescent moon
    B.sphere(1.4, 0xe8d8a0, mat(0, 1.2, 0), { seg: 20 });
    B.sphere(1.15, 0x0c1020, mat(0.45, 1.35, 0.3), { seg: 16, outline: false });
    // Spire beneath
    B.cone(0.7, 2.2, 0x6a5080, mat(0, -0.4, 0), { seg: 8 });
    B.cyl(0.9, 1.0, 0.35, 0xc8a050, mat(0, -1.4, 0), { seg: 10 });
    // Orbiting sparks
    this.root = B.build(false);
    this.scene.add(this.root);
    this.sparks = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe080 })
      );
      this.scene.add(s); this.sparks.push({ m: s, a: (i / 8) * Math.PI * 2, r: 2.2 + (i % 3) * 0.2 });
    }
    this.t = 0; this.bursting = false;
    this._raf = requestAnimationFrame(this.tick);
    this._resize();
    addEventListener('resize', this._resize);
  }

  _resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.cam.aspect = w / Math.max(1, h);
    this.cam.updateProjectionMatrix();
  };

  tick = () => {
    if (this.bursting && this.t > 2) return;
    this._raf = requestAnimationFrame(this.tick);
    this.t += 0.016;
    this.root.rotation.y = this.t * 0.35;
    this.root.position.y = Math.sin(this.t * 1.2) * 0.12;
    for (const s of this.sparks) {
      s.a += 0.012;
      s.m.position.set(Math.cos(s.a) * s.r, 1.2 + Math.sin(s.a * 2) * 0.4, Math.sin(s.a) * s.r);
    }
    renderer.clear();
    renderer.render(this.scene, this.cam);
  };

  hit(x, y) {
    // whole screen is tappable on cover for UX; crest is center-biased
    const cx = window.innerWidth / 2, cy = window.innerHeight * 0.42;
    return Math.hypot(x - cx, y - cy) < Math.min(window.innerWidth, window.innerHeight) * 0.35;
  }

  burst() {
    if (this.bursting) return false;
    this.bursting = true;
    cancelAnimationFrame(this._raf);
    return true;
  }
}
