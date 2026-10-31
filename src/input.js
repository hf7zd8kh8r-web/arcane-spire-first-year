import { isTouch } from './engine.js';

export const IN = {
  enabled: false,
  mx: 0, my: 0,  // look deltas
  ax: 0, ay: 0,  // move axes -1..1
  jump: false, dodge: false, cast: false, shield: false, interact: false,
  spellSlot: -1, // 0-9
  lookDx: 0, lookDy: 0,
  broom: false,
};

let keys = {};
export function initMouse(el) {
  el.addEventListener('click', () => { if (IN.enabled && !isTouch) el.requestPointerLock?.(); });
  document.addEventListener('pointerlockchange', () => {});
  document.addEventListener('mousemove', e => {
    if (!IN.enabled) return;
    if (document.pointerLockElement === el) {
      IN.lookDx += e.movementX; IN.lookDy += e.movementY;
    }
  });
  document.addEventListener('mousedown', e => {
    if (!IN.enabled) return;
    if (e.button === 0) IN.cast = true;
    if (e.button === 2) IN.shield = true;
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) IN.cast = false;
    if (e.button === 2) IN.shield = false;
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!IN.enabled) return;
    if (e.code === 'Space') IN.jump = true;
    if (e.code === 'ShiftLeft' || e.code === 'KeyC') IN.dodge = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') IN.interact = true;
    if (e.code === 'KeyB') IN.broom = true;
    if (e.code === 'KeyQ') IN.shield = true;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) IN.spellSlot = n - 1;
    if (e.key === '0') IN.spellSlot = 9;
  });
  document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'KeyQ') IN.shield = false;
  });
}

export function pollKeys() {
  if (!IN.enabled) { IN.ax = 0; IN.ay = 0; return; }
  let x = 0, y = 0;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) y += 1;
  if (keys.KeyS || keys.ArrowDown) y -= 1;
  // touch stick overrides if set
  if (Math.abs(IN.mx) > 0.05 || Math.abs(IN.my) > 0.05) { x = IN.mx; y = IN.my; }
  const len = Math.hypot(x, y) || 1;
  IN.ax = x / len; IN.ay = y / len;
}

export function consume(flag) {
  const v = IN[flag];
  if (typeof v === 'boolean') IN[flag] = false;
  return v;
}

export function initTouch(hud) {
  if (!isTouch) return;
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="stick" id="stickL"><i></i></div>
    <div class="stick look" id="stickR"><i></i></div>
    <button class="tb" id="tCast">CAST</button>
    <button class="tb" id="tShield">WARD</button>
    <button class="tb" id="tDodge">DODGE</button>
    <button class="tb" id="tJump">JUMP</button>
    <button class="tb" id="tUse">USE</button>
    <button class="tb" id="tBroom">BROOM</button>
  `;
  hud.appendChild(root);

  const bindStick = (el, move, look) => {
    let active = null, ox = 0, oy = 0;
    const max = 48;
    const go = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (active !== null && t.identifier !== active) return;
      const dx = Math.max(-max, Math.min(max, t.clientX - ox));
      const dy = Math.max(-max, Math.min(max, t.clientY - oy));
      el.querySelector('i').style.transform = `translate(${dx}px,${dy}px)`;
      if (move) { IN.mx = dx / max; IN.my = -dy / max; }
      if (look) { IN.lookDx += dx * 0.08; IN.lookDy += dy * 0.06; }
    };
    const start = (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      active = t.identifier; ox = t.clientX; oy = t.clientY;
    };
    const end = (e) => {
      const t = e.changedTouches[0];
      if (t.identifier !== active) return;
      active = null; el.querySelector('i').style.transform = '';
      if (move) { IN.mx = 0; IN.my = 0; }
    };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', go, { passive: false });
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  };
  bindStick(document.getElementById('stickL'), true, false);
  bindStick(document.getElementById('stickR'), false, true);

  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false });
    el.addEventListener('touchend', () => off && off());
    el.addEventListener('touchcancel', () => off && off());
  };
  hold('tCast', () => IN.cast = true, () => IN.cast = false);
  hold('tShield', () => IN.shield = true, () => IN.shield = false);
  hold('tDodge', () => IN.dodge = true);
  hold('tJump', () => IN.jump = true);
  hold('tUse', () => IN.interact = true);
  hold('tBroom', () => IN.broom = true);
}
