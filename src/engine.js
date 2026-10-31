import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
export { THREE };

export const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const QKEY = 'asfy_quality';
function guessQ() {
  let gpu = '';
  try { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); gpu = e ? String(c.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (_) {}
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (/swiftshader|llvmpipe|software/i.test(gpu) || mem <= 2 || cores <= 2) return 'low';
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
  if (fps < 28) { QA.low++; QA.hi = 0; } else if (fps > 52) { QA.hi++; QA.low = 0; } else { QA.low = 0; QA.hi = 0; }
  if (QA.low >= 2 && i > 0) { Q.level = L[i - 1]; QA.low = 0; QA.cool = 5; localStorage.setItem(QKEY + '_a', Q.level); applyQuality(); }
  else if (QA.hi >= 12 && i < 2 && QA.ups < 1) { Q.level = L[i + 1]; QA.hi = 0; QA.ups++; QA.cool = 5; localStorage.setItem(QKEY + '_a', Q.level); applyQuality(); }
}
export const qv = () => ({
  low:  { pr: 0.7,  far: 110, parts: 0.35, shadows: false, bloom: false, aa: false, tex: 64 },
  med:  { pr: 1.1,  far: 170, parts: 0.7,  shadows: true,  bloom: true,  aa: true,  tex: 128 },
  high: { pr: 1.6,  far: 260, parts: 1,    shadows: true,  bloom: true,  aa: true,  tex: 256 },
}[Q.level]);

/** Procedural canvas textures for PBR. */
function canvasTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function noise(g, size, a, b, dens = 400) {
  for (let i = 0; i < dens; i++) {
    g.fillStyle = Math.random() > 0.5 ? a : b;
    g.globalAlpha = 0.08 + Math.random() * 0.15;
    g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  g.globalAlpha = 1;
}

export const TEX = {
  stone: canvasTex((g, s) => {
    g.fillStyle = '#7a7482'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 28) {
      g.strokeStyle = '#5a5460'; g.lineWidth = 1;
      g.strokeRect(x + (y % 32 ? 14 : 0), y, 26, 14);
      g.fillStyle = `rgb(${110 + Math.random() * 30|0},${105 + Math.random() * 25|0},${115 + Math.random() * 25|0})`;
      g.fillRect(x + (y % 32 ? 14 : 0) + 1, y + 1, 24, 12);
    }
    noise(g, s, '#9a94a0', '#4a4450', 200);
  }, 128),
  wood: canvasTex((g, s) => {
    g.fillStyle = '#6a4828'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 3) {
      g.strokeStyle = `rgba(${40 + Math.random() * 40|0},${25},${10},${0.15 + Math.random() * 0.2})`;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 2, s * 0.3, x - 2, s * 0.7, x + 1, s); g.stroke();
    }
    noise(g, s, '#8a6038', '#3a2810', 120);
  }, 128),
  roof: canvasTex((g, s) => {
    g.fillStyle = '#4a3048'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) for (let x = 0; x < s; x += 12) {
      g.fillStyle = `rgb(${60 + Math.random() * 30|0},${35 + Math.random() * 20|0},${55 + Math.random() * 30|0})`;
      g.fillRect(x + (y % 16 ? 6 : 0), y, 10, 7);
    }
  }, 128),
  grass: canvasTex((g, s) => {
    g.fillStyle = '#3a6a38'; g.fillRect(0, 0, s, s);
    noise(g, s, '#4a8a40', '#2a4a28', 500);
  }, 128),
  gold: canvasTex((g, s) => {
    const grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, '#e8d080'); grd.addColorStop(0.5, '#c8a050'); grd.addColorStop(1, '#a07830');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    noise(g, s, '#fff0c0', '#806020', 80);
  }, 64),
};

export function pbr(opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    map: opts.map || null,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    flatShading: false,
    vertexColors: !!opts.vertexColors,
  });
  if (opts.map) { m.map.repeat.set(opts.repeat || 1, opts.repeat || 1); m.map.needsUpdate = true; }
  return m;
}

export const MATS = {
  stone: () => pbr({ map: TEX.stone.clone(), color: 0xc8c0c8, roughness: 0.82, metalness: 0.08, repeat: 2 }),
  stoneDark: () => pbr({ map: TEX.stone.clone(), color: 0x8a8490, roughness: 0.88, metalness: 0.06, repeat: 1.5 }),
  wood: () => pbr({ map: TEX.wood.clone(), color: 0xc8a070, roughness: 0.7, metalness: 0.02, repeat: 1 }),
  roof: () => pbr({ map: TEX.roof.clone(), color: 0xb090b0, roughness: 0.65, metalness: 0.1, repeat: 2 }),
  grass: () => pbr({ map: TEX.grass.clone(), color: 0xa0c880, roughness: 0.95, metalness: 0, repeat: 8 }),
  gold: () => pbr({ map: TEX.gold.clone(), color: 0xffe8a0, roughness: 0.35, metalness: 0.85, emissive: 0x332200, emissiveIntensity: 0.15 }),
  glass: () => pbr({ color: 0x88b8e0, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  water: () => pbr({ color: 0x2a78a8, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.72 }),
  cloth: (c) => pbr({ color: c, roughness: 0.9, metalness: 0 }),
  skin: (c) => pbr({ color: c, roughness: 0.65, metalness: 0.02 }),
  emissive: (c, i = 1.2) => pbr({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4, metalness: 0.1 }),
};

export const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance', alpha: false });
renderer.autoClear = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);
renderer.domElement.id = 'gl';

export let composer = null;
let bloomPass = null, fxaaPass = null, renderPass = null;
export const qualityHooks = [];

export function setupComposer(scene, camera) {
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.6, 0.85);
  composer.addPass(bloomPass);
  fxaaPass = new ShaderPass(FXAAShader);
  composer.addPass(fxaaPass);
  composer.addPass(new OutputPass());
  applyQuality();
}

export function applyQuality() {
  const v = qv();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, v.pr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = !!v.shadows;
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, v.pr));
    if (bloomPass) { bloomPass.enabled = !!v.bloom; bloomPass.strength = Q.level === 'high' ? 0.42 : 0.28; }
    if (fxaaPass) {
      fxaaPass.enabled = !!v.aa;
      const r = renderer.getPixelRatio();
      fxaaPass.material.uniforms.resolution.value.set(1 / (window.innerWidth * r), 1 / (window.innerHeight * r));
    }
  }
  for (const f of qualityHooks) f();
}
window.addEventListener('resize', applyQuality);

export function renderFrame(scene, camera) {
  if (composer && bloomPass && (qv().bloom || qv().aa)) composer.render();
  else renderer.render(scene, camera);
}

const _c = new THREE.Color();
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sx, sy, sz));
}
function prep(g) {
  let geo = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.uv) {
    // simple planar UVs
    const n = geo.attributes.position.count;
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { uv[i * 2] = geo.attributes.position.getX(i) * 0.15; uv[i * 2 + 1] = geo.attributes.position.getZ(i) * 0.15 + geo.attributes.position.getY(i) * 0.1; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  return geo;
}

/** Multi-material builder: groups by material key for PBR look. */
export class Builder {
  constructor() { this.bins = new Map(); }
  _bin(key) { if (!this.bins.has(key)) this.bins.set(key, []); return this.bins.get(key); }
  add(geo, color, m, opt = {}) {
    const g = prep(geo);
    if (m) g.applyMatrix4(m);
    const key = opt.mat || 'stone';
    // tint via vertex colors lightly
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3); _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this._bin(key).push(g);
    return this;
  }
  box(w, h, d, color, m, opt) { return this.add(new THREE.BoxGeometry(w, h, d), color, m, opt); }
  cyl(rt, rb, h, color, m, opt) { return this.add(new THREE.CylinderGeometry(rt, rb, h, opt?.seg || 12), color, m, opt); }
  sphere(r, color, m, opt) { return this.add(new THREE.SphereGeometry(r, opt?.seg || 14, opt?.segY || 12), color, m, opt); }
  cone(r, h, color, m, opt) { return this.add(new THREE.ConeGeometry(r, h, opt?.seg || 12), color, m, opt); }
  build(castShadow = true) {
    const group = new THREE.Group();
    const makers = {
      stone: () => { const m = MATS.stone(); m.vertexColors = true; return m; },
      stoneDark: () => { const m = MATS.stoneDark(); m.vertexColors = true; return m; },
      wood: () => { const m = MATS.wood(); m.vertexColors = true; return m; },
      roof: () => { const m = MATS.roof(); m.vertexColors = true; return m; },
      grass: () => { const m = MATS.grass(); m.vertexColors = true; return m; },
      gold: () => { const m = MATS.gold(); m.vertexColors = true; return m; },
      glass: () => { const m = MATS.glass(); m.vertexColors = true; return m; },
      water: () => { const m = MATS.water(); m.vertexColors = true; return m; },
      cloth: () => { const m = MATS.cloth(0xffffff); m.vertexColors = true; return m; },
      skin: () => { const m = MATS.skin(0xffffff); m.vertexColors = true; return m; },
      emissive: () => { const m = MATS.emissive(0xffe8a0, 1.4); m.vertexColors = true; return m; },
    };
    for (const [key, geos] of this.bins) {
      if (!geos.length) continue;
      const g = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(g, (makers[key] || makers.stone)());
      mesh.castShadow = castShadow; mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

export function makeScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a8c8);
  scene.fog = new THREE.FogExp2(0x9ab4c8, 0.0065);
  const hemi = new THREE.HemisphereLight(0xd0e4ff, 0x3a2a18, 0.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
  sun.position.set(70, 100, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 260;
  sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8899cc, 0.28);
  fill.position.set(-50, 40, -40); scene.add(fill);
  scene.add(new THREE.AmbientLight(0x405060, 0.22));
  // godray-ish volumetric shafts as translucent cones near courtyard later
  return { scene, sun, hemi };
}

export function makeCamera() {
  const cam = new THREE.PerspectiveCamera(55, 1, 0.15, 300);
  cam.position.set(0, 4, 10);
  qualityHooks.push(() => { cam.far = qv().far; cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); cam.updateProjectionMatrix(); });
  return cam;
}

// keep toonMat alias for any leftover callers
export function toonMat(opts = {}) { return pbr({ ...opts, roughness: 0.7 }); }
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1210, side: THREE.BackSide });
