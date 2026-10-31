import { isTouch } from './engine.js';

export const IN = {
  enabled: false,
  mx: 0, my: 0,  // move stick axes -1..1 (touch)
  ax: 0, ay: 0,  // final move axes -1..1
  jump: false, dodge: false, cast: false, shield: false, interact: false,
  spellSlot: -1,
  lookDx: 0, lookDy: 0,
  broom: false,
  // look stick held offsets (applied once per poll, not every touchmove)
  lookX: 0, lookY: 0,
};

let keys = {};
export function initMouse(el) {
  el.addEventListener('click', () => { if (IN.enabled && !isTouch) el.requestPointerLock?.(); });
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
  if (Math.abs(IN.mx) > 0.05 || Math.abs(IN.my) > 0.05) { x = IN.mx; y = IN.my; }
  const len = Math.hypot(x, y) || 1;
  IN.ax = x / len; IN.ay = y / len;
  // apply held look-stick as a steady rate each frame (not accumulated on every touchmove)
  if (IN.lookX || IN.lookY) {
    IN.lookDx += IN.lookX * 6.5;
    IN.lookDy += IN.lookY * 5.0;
  }
}

export function consume(flag) {
  const v = IN[flag];
  if (typeof v === 'boolean') IN[flag] = false;
  return v;
}

function dismissRotHint() {
  const r = document.getElementById('rotHint');
  if (r) { r.classList.add('bye'); setTimeout(() => r.remove(), 400); }
}

/** Touch: left half of screen = move, right half = look. Visible sticks are cues; zones are large. */
export function initTouch(hud) {
  if (!isTouch) return;
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="zone" id="zoneL"></div>
    <div class="zone" id="zoneR"></div>
    <div class="stick" id="stickL"><i></i></div>
    <div class="stick look" id="stickR"><i></i></div>
    <button class="tb" id="tCast" type="button">CAST</button>
    <button class="tb" id="tShield" type="button">WARD</button>
    <button class="tb" id="tDodge" type="button">DODGE</button>
    <button class="tb" id="tJump" type="button">JUMP</button>
    <button class="tb" id="tUse" type="button">USE</button>
    <button class="tb" id="tBroom" type="button">BROOM</button>
  `;
  hud.appendChild(root);

  const moves = new Map(); // id -> { kind, ox, oy, el }

  const knob = (kind, dx, dy) => {
    const el = document.getElementById(kind === 'move' ? 'stickL' : 'stickR');
    const i = el && el.querySelector('i');
    if (i) i.style.transform = `translate(${dx}px,${dy}px)`;
  };

  const onStart = (e) => {
    if (!IN.enabled) return;
    dismissRotHint();
    for (const t of e.changedTouches) {
      const target = document.elementFromPoint(t.clientX, t.clientY);
      if (target && target.closest && target.closest('.tb, #menuBtn, #bookBtn, #spells, #panel, button')) continue;
      const kind = t.clientX < window.innerWidth * 0.5 ? 'move' : 'look';
      // one finger per kind
      let replaced = false;
      for (const [id, m] of moves) if (m.kind === kind) { moves.delete(id); replaced = true; }
      moves.set(t.identifier, { kind, ox: t.clientX, oy: t.clientY });
      e.preventDefault();
    }
  };

  const onMove = (e) => {
    let used = false;
    for (const t of e.changedTouches) {
      const m = moves.get(t.identifier); if (!m) continue;
      used = true;
      const max = 56;
      const dx = Math.max(-max, Math.min(max, t.clientX - m.ox));
      const dy = Math.max(-max, Math.min(max, t.clientY - m.oy));
      if (m.kind === 'move') {
        IN.mx = dx / max; IN.my = -dy / max;
        knob('move', dx, dy);
      } else {
        IN.lookX = dx / max; IN.lookY = dy / max;
        knob('look', dx, dy);
      }
    }
    if (used) e.preventDefault();
  };

  const onEnd = (e) => {
    for (const t of e.changedTouches) {
      const m = moves.get(t.identifier); if (!m) continue;
      moves.delete(t.identifier);
      if (m.kind === 'move') {
        // only clear if no other move finger
        let other = false; for (const x of moves.values()) if (x.kind === 'move') other = true;
        if (!other) { IN.mx = 0; IN.my = 0; knob('move', 0, 0); }
      } else {
        let other = false; for (const x of moves.values()) if (x.kind === 'look') other = true;
        if (!other) { IN.lookX = 0; IN.lookY = 0; knob('look', 0, 0); }
      }
    }
  };

  // Listen on the full-screen zones (and document fallback) so we never miss touches
  const opts = { passive: false };
  for (const id of ['zoneL', 'zoneR', 'stickL', 'stickR']) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', onStart, opts);
    el.addEventListener('touchmove', onMove, opts);
    el.addEventListener('touchend', onEnd, opts);
    el.addEventListener('touchcancel', onEnd, opts);
  }
  // Also capture on hud root in case zones miss
  root.addEventListener('touchstart', onStart, opts);
  root.addEventListener('touchmove', onMove, opts);
  root.addEventListener('touchend', onEnd, opts);
  root.addEventListener('touchcancel', onEnd, opts);

  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); dismissRotHint(); on(); }, opts);
    el.addEventListener('touchend', e => { e.stopPropagation(); off && off(); });
    el.addEventListener('touchcancel', () => off && off());
  };
  hold('tCast', () => IN.cast = true, () => IN.cast = false);
  hold('tShield', () => IN.shield = true, () => IN.shield = false);
  hold('tDodge', () => IN.dodge = true);
  hold('tJump', () => IN.jump = true);
  hold('tUse', () => IN.interact = true);
  hold('tBroom', () => IN.broom = true);
}
