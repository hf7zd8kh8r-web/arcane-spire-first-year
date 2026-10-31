import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { THREE };

export const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const QKEY = 'asfy_quality';
function guessQ() {
  let gpu = '';
  try { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); gpu = e ? String(c.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (_) {}
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const sw = /swiftshader|llvmpipe|software/i.test(gpu);
  if (sw || mem <= 2 || cores <= 2) return 'low';
  if (isTouch) return 'med';
  return /intel/i.test(gpu) && !/iris xe|arc/i.test(gpu) ? 'med' : 'high';
}
const stored = localStorage.getItem(QKEY);
export const Q = { auto: !stored || stored === 'auto', level: (stored && stored !== 'auto') ? stored : (localStorage.getItem(QKEY + '_a') || guessQ()) };
export function qset(l) {
  if (l === 'auto') { Q.auto = true; localStorage.setItem(QKEY, 'auto'); }
  else { Q.auto = false; Q.level = l; localStorage.setItem(QKEY, l); }
  applyQuality();
}
const QA = { t: 0, n: 0, low: 0, hi: 0, ups: 0, cool: 3 };
export function qTick(dt) {
  if (!Q.auto) return;
  QA.cool -= dt; if (QA.cool > 0) return;
  QA.t += dt; QA.n++; if (QA.t < 2) return;
  const fps = QA.n / QA.t; QA.t = 0; QA.n = 0;
  const L = ['low', 'med', 'high'], i = L.indexOf(Q.level);
  if (fps < 34) { QA.low++; QA.hi = 0; } else if (fps > 57) { QA.hi++; QA.low = 0; } else { QA.low = 0; QA.hi = 0; }
  if (QA.low >= 2 && i > 0) { Q.level = L[i - 1]; QA.low = 0; QA.cool = 4; localStorage.setItem(QKEY + '_a', Q.level); applyQuality(); }
  else if (QA.hi >= 10 && i < 2 && QA.ups < 1) { Q.level = L[i + 1]; QA.hi = 0; QA.ups++; QA.cool = 4; localStorage.setItem(QKEY + '_a', Q.level); applyQuality(); }
}
export const qv = () => ({ low: { pr: 0.75, far: 120, parts: 0.4, shadows: false }, med: { pr: 1.2, far: 180, parts: 0.7, shadows: true }, high: { pr: 1.75, far: 260, parts: 1, shadows: true } }[Q.level]);

export const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance', alpha: false });
renderer.autoClear = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);
renderer.domElement.id = 'gl';

export const qualityHooks = [];
export function applyQuality() {
  const v = qv();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, v.pr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = !!v.shadows;
  for (const f of qualityHooks) f();
}
window.addEventListener('resize', applyQuality);

function ramp(n) {
  const d = new Uint8Array(n * 4);
  const tones = n === 3 ? [100, 180, 255] : [85, 150, 210, 255];
  for (let i = 0; i < n; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = tones[i]; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
export const RAMP = ramp(3);
export function toonMat(opts = {}) { return new THREE.MeshToonMaterial({ gradientMap: RAMP, vertexColors: true, ...opts }); }
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1210, side: THREE.BackSide });

const _c = new THREE.Color();
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sx, sy, sz));
}
function prep(g) {
  let geo = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

export class Builder {
  constructor() { this.f = []; this.o = []; }
  add(geo, color, m, opt = {}) {
    const g = prep(geo);
    if (m) g.applyMatrix4(m);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3); _c.set(color);
    if (opt.grad) {
      const pos = g.attributes.position; let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < n; i++) { mn = Math.min(mn, pos.getY(i)); mx = Math.max(mx, pos.getY(i)); }
      for (let i = 0; i < n; i++) { const t = (pos.getY(i) - mn) / (mx - mn || 1); const k = 1 - opt.grad * (1 - t); col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k; }
    } else for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.f.push(g);
    if (opt.outline !== false) {
      const og = g.clone();
      const pos = og.attributes.position, nor = og.attributes.normal;
      const s = opt.outlineScale || 0.035;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, pos.getX(i) + nor.getX(i) * s, pos.getY(i) + nor.getY(i) * s, pos.getZ(i) + nor.getZ(i) * s);
      }
      this.o.push(og);
    }
    return this;
  }
  box(w, h, d, color, m, opt) { return this.add(new THREE.BoxGeometry(w, h, d), color, m, opt); }
  cyl(rt, rb, h, color, m, opt) { return this.add(new THREE.CylinderGeometry(rt, rb, h, opt?.seg || 10), color, m, opt); }
  sphere(r, color, m, opt) { return this.add(new THREE.SphereGeometry(r, opt?.seg || 12, opt?.segY || 10), color, m, opt); }
  cone(r, h, color, m, opt) { return this.add(new THREE.ConeGeometry(r, h, opt?.seg || 10), color, m, opt); }
  build(castShadow = true) {
    const group = new THREE.Group();
    if (this.f.length) {
      const g = mergeGeometries(this.f, false);
      const mesh = new THREE.Mesh(g, toonMat());
      mesh.castShadow = castShadow; mesh.receiveShadow = true;
      group.add(mesh);
    }
    if (this.o.length && qv().parts > 0.5) {
      const og = mergeGeometries(this.o, false);
      const om = new THREE.Mesh(og, OUTLINE_MAT);
      group.add(om);
    }
    return group;
  }
}

export function makeScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a0b8);
  scene.fog = new THREE.FogExp2(0x9ab0c4, 0.0085);
  const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x3a2a1a, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.15);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 220;
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8899cc, 0.25);
  fill.position.set(-40, 30, -50);
  scene.add(fill);
  const amb = new THREE.AmbientLight(0x405060, 0.25);
  scene.add(amb);
  return { scene, sun, hemi };
}

export function makeCamera() {
  const cam = new THREE.PerspectiveCamera(55, 1, 0.2, 280);
  cam.position.set(0, 4, 10);
  qualityHooks.push(() => { cam.far = qv().far; cam.updateProjectionMatrix(); });
  return cam;
}
