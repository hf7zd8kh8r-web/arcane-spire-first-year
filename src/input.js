import { isTouch } from './engine.js';

export const IN = {
  enabled: false,
  mx: 0, my: 0,
  ax: 0, ay: 0,
  jump: false, dodge: false, cast: false, shield: false, interact: false,
  spellSlot: -1,
  lookDx: 0, lookDy: 0,
  broom: false,
  lookX: 0, lookY: 0,
};

let keys = {};
let _unfreezeFn = null;
export function setUnfreezeHandler(fn) { _unfreezeFn = fn; }

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

/** Reset sticks / look so a stuck finger can't pin movement. */
export function resetTouchAxes() {
  IN.mx = 0; IN.my = 0; IN.ax = 0; IN.ay = 0;
  IN.lookX = 0; IN.lookY = 0; IN.lookDx = 0; IN.lookDy = 0;
  IN.cast = false; IN.shield = false;
  const kn = (id) => {
    const i = document.querySelector(`#${id} i`);
    if (i) i.style.transform = 'translate(0px,0px)';
    document.getElementById(id)?.classList.remove('active');
  };
  kn('stickL'); kn('stickR');
}

/**
 * Touch controls for real iOS Safari:
 * - Half-screen drag zones (touch + pointer, passive:false)
 * - Always-visible D-pad (does not rely on drag)
 * - Visible joystick knob feedback
 * - "Stuck? Unfreeze" clears cutscene / modal / frozen locks
 */
export function initTouch(hud) {
  // Always build controls when maxTouchPoints or coarse pointer — real iPhones sometimes
  // report oddly inside WKWebView; also show if CSS touch media matches.
  const want = isTouch || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  if (!want) return;

  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="zone" id="zoneL"></div>
    <div class="zone" id="zoneR"></div>
    <div class="stick" id="stickL"><i></i></div>
    <div class="stick look" id="stickR"><i></i></div>
    <div id="dpad" aria-label="Move pad">
      <button type="button" class="dp" data-dx="0" data-dy="1" id="dpU">▲</button>
      <button type="button" class="dp" data-dx="-1" data-dy="0" id="dpL">◀</button>
      <button type="button" class="dp" data-dx="1" data-dy="0" id="dpR">▶</button>
      <button type="button" class="dp" data-dx="0" data-dy="-1" id="dpD">▼</button>
    </div>
    <button type="button" id="unfreezeBtn">Stuck? Tap to unfreeze</button>
    <button class="tb" id="tCast" type="button">CAST</button>
    <button class="tb" id="tShield" type="button">WARD</button>
    <button class="tb" id="tDodge" type="button">DODGE</button>
    <button class="tb" id="tJump" type="button">JUMP</button>
    <button class="tb" id="tUse" type="button">USE</button>
    <button class="tb" id="tBroom" type="button">BROOM</button>
  `;
  hud.appendChild(root);

  const opts = { passive: false };
  const moves = new Map();
  const dpadHeld = new Set(); // button ids

  const setKnob = (kind, dx, dy) => {
    const el = document.getElementById(kind === 'move' ? 'stickL' : 'stickR');
    if (!el) return;
    const i = el.querySelector('i');
    if (i) i.style.transform = `translate(${dx}px,${dy}px)`;
    el.classList.toggle('active', Math.hypot(dx, dy) > 4);
  };

  const syncDpadAxes = () => {
    let x = 0, y = 0;
    for (const id of dpadHeld) {
      const b = document.getElementById(id);
      if (!b) continue;
      x += +b.dataset.dx || 0;
      y += +b.dataset.dy || 0;
    }
    // D-pad overrides drag when held (reliable on iOS)
    if (dpadHeld.size) {
      const len = Math.hypot(x, y) || 1;
      IN.mx = x / len; IN.my = y / len;
      setKnob('move', (x / len) * 40, -(y / len) * 40);
    }
  };

  const isUiChrome = (el) => {
    if (!el || !el.closest) return false;
    return !!el.closest('.tb, #menuBtn, #bookBtn, #spells, #panel, #dpad, #unfreezeBtn, #cutscene, #cardbattle, #travelmap, .cs-card');
  };

  const bindDrag = (startEv, moveEv, endEv, cancelEv, pointOf) => {
    const onStart = (e) => {
      if (!IN.enabled) return;
      dismissRotHint();
      const pts = pointOf(e);
      for (const t of pts) {
        // Prefer the event's target (the zone), NOT elementFromPoint — on iOS Safari
        // elementFromPoint during touchstart often hits nearby CAST/USE buttons and
        // previously caused us to skip registering the move finger entirely.
        const rawTarget = t.target || e.target;
        if (isUiChrome(rawTarget) && !rawTarget.closest?.('.zone')) continue;
        const kind = t.clientX < window.innerWidth * 0.5 ? 'move' : 'look';
        for (const [id, m] of moves) if (m.kind === kind) moves.delete(id);
        moves.set(t.id, { kind, ox: t.clientX, oy: t.clientY });
      }
      if (moves.size && e.cancelable) e.preventDefault();
    };
    const onMove = (e) => {
      let used = false;
      for (const t of pointOf(e)) {
        const m = moves.get(t.id); if (!m) continue;
        used = true;
        const max = 56;
        const dx = Math.max(-max, Math.min(max, t.clientX - m.ox));
        const dy = Math.max(-max, Math.min(max, t.clientY - m.oy));
        if (m.kind === 'move') {
          // Don't fight D-pad
          if (!dpadHeld.size) {
            IN.mx = dx / max; IN.my = -dy / max;
            setKnob('move', dx, dy);
          }
        } else {
          IN.lookX = dx / max; IN.lookY = dy / max;
          setKnob('look', dx, dy);
        }
      }
      if (used && e.cancelable) e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of pointOf(e)) {
        const m = moves.get(t.id); if (!m) continue;
        moves.delete(t.id);
        if (m.kind === 'move') {
          let other = false; for (const x of moves.values()) if (x.kind === 'move') other = true;
          if (!other && !dpadHeld.size) { IN.mx = 0; IN.my = 0; setKnob('move', 0, 0); }
        } else {
          let other = false; for (const x of moves.values()) if (x.kind === 'look') other = true;
          if (!other) { IN.lookX = 0; IN.lookY = 0; setKnob('look', 0, 0); }
        }
      }
    };
    for (const id of ['zoneL', 'zoneR']) {
      const el = document.getElementById(id);
      el.addEventListener(startEv, onStart, opts);
      el.addEventListener(moveEv, onMove, opts);
      el.addEventListener(endEv, onEnd, opts);
      el.addEventListener(cancelEv, onEnd, opts);
    }
    root.addEventListener(startEv, onStart, opts);
    root.addEventListener(moveEv, onMove, opts);
    root.addEventListener(endEv, onEnd, opts);
    root.addEventListener(cancelEv, onEnd, opts);
  };

  // TouchEvent path (iOS Safari primary)
  bindDrag('touchstart', 'touchmove', 'touchend', 'touchcancel', (e) => {
    const list = e.changedTouches || [];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      out.push({ id: 't' + t.identifier, clientX: t.clientX, clientY: t.clientY, target: e.target });
    }
    return out;
  });

  // PointerEvent fallback (some iOS versions / trackpads)
  bindDrag('pointerdown', 'pointermove', 'pointerup', 'pointercancel', (e) => {
    if (e.pointerType === 'mouse' && !isTouch) return [];
    return [{ id: 'p' + e.pointerId, clientX: e.clientX, clientY: e.clientY, target: e.target }];
  });

  // D-pad: always-visible discrete directions (works even if drag zones fail)
  const bindPad = (btn) => {
    const down = (e) => {
      e.preventDefault(); e.stopPropagation();
      dismissRotHint();
      dpadHeld.add(btn.id);
      btn.classList.add('on');
      syncDpadAxes();
    };
    const up = (e) => {
      e && e.preventDefault?.();
      dpadHeld.delete(btn.id);
      btn.classList.remove('on');
      if (!dpadHeld.size) {
        // restore drag or clear
        let dragMove = false;
        for (const m of moves.values()) if (m.kind === 'move') dragMove = true;
        if (!dragMove) { IN.mx = 0; IN.my = 0; setKnob('move', 0, 0); }
      } else syncDpadAxes();
    };
    btn.addEventListener('touchstart', down, opts);
    btn.addEventListener('touchend', up, opts);
    btn.addEventListener('touchcancel', up, opts);
    btn.addEventListener('pointerdown', down, opts);
    btn.addEventListener('pointerup', up, opts);
    btn.addEventListener('pointercancel', up, opts);
    btn.addEventListener('pointerleave', up, opts);
  };
  for (const id of ['dpU', 'dpL', 'dpR', 'dpD']) bindPad(document.getElementById(id));

  // Unfreeze
  const uf = document.getElementById('unfreezeBtn');
  const doUnfreeze = (e) => {
    e.preventDefault(); e.stopPropagation();
    resetTouchAxes();
    dpadHeld.clear();
    moves.clear();
    _unfreezeFn?.();
  };
  uf.addEventListener('touchstart', doUnfreeze, opts);
  uf.addEventListener('click', doUnfreeze);

  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    const down = (e) => { e.preventDefault(); e.stopPropagation(); dismissRotHint(); on(); };
    const up = () => off && off();
    el.addEventListener('touchstart', down, opts);
    el.addEventListener('touchend', up, opts);
    el.addEventListener('touchcancel', up, opts);
    el.addEventListener('pointerdown', down, opts);
    el.addEventListener('pointerup', up, opts);
    el.addEventListener('pointercancel', up, opts);
  };
  hold('tCast', () => IN.cast = true, () => IN.cast = false);
  hold('tShield', () => IN.shield = true, () => IN.shield = false);
  hold('tDodge', () => IN.dodge = true);
  hold('tJump', () => IN.jump = true);
  hold('tUse', () => IN.interact = true);
  hold('tBroom', () => IN.broom = true);
}
