const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8080';

async function flow(label, viewport) {
  console.log('\n==', label, '==');
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/?skip&anytap', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(500);
  await p.mouse.click(viewport.width/2, viewport.height*0.4);
  await p.waitForTimeout(2500);
  if (await p.$('#cGo')) { await p.fill('#cName', 'Adam'); await p.click('#cGo'); }
  else await p.evaluate(() => __startQuick({ name: 'Adam' }));
  await p.waitForFunction(() => __g?.mode === 'game', null, { timeout: 20000 });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const g = __g.game;
    if (g.cutscenes?.on) { g.cutscenes.on = false; g.player.frozen = false; const el = document.getElementById('cutscene'); if (el) el.style.display = 'none'; }
    g.save.seenTrain = true;
  });

  const hit = await p.evaluate(() => {
    const z = document.getElementById('zoneL');
    const r = z.getBoundingClientRect();
    const cx = r.x + r.width * 0.5, cy = r.y + r.height * 0.75;
    const top = document.elementFromPoint(cx, cy);
    return {
      cx, cy,
      top: top && (top.id || top.className || top.tagName),
      isZone: !!(top && (top.id === 'zoneL' || top.closest?.('#zoneL') || top.id === 'stickL')),
      rot: !!document.getElementById('rotHint'),
      rotPE: document.getElementById('rotHint') ? getComputedStyle(document.getElementById('rotHint')).pointerEvents : null,
      pos: { x: __g.game.player.pos.x, z: __g.game.player.pos.z },
      enabled: __g.IN.enabled,
    };
  });
  console.log('hit-test', hit);
  if (!hit.isZone) throw new Error('zoneL blocked by ' + hit.top);

  // Touch drag on left zone (move forward)
  const before = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  await p.evaluate(({ cx, cy }) => {
    const el = document.getElementById('zoneL');
    const mk = (x, y) => new Touch({ identifier: 9, target: el, clientX: x, clientY: y, pageX: x, pageY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(cx,cy)], changedTouches: [mk(cx,cy)] }));
    el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(cx, cy-50)], changedTouches: [mk(cx, cy-50)] }));
  }, hit);
  await p.waitForTimeout(900);
  const mid = await p.evaluate(() => ({ mx: __g.IN.mx, my: __g.IN.my, ax: __g.IN.ax, ay: __g.IN.ay, x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  const dist = Math.hypot(mid.x - before.x, mid.z - before.z);
  console.log('touch move', dist.toFixed(3), mid);
  if (dist < 2) throw new Error('touch move too small: ' + dist);

  await p.evaluate(() => {
    const el = document.getElementById('zoneL');
    const mk = (x,y) => new Touch({ identifier: 9, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [mk(0,0)] }));
  });

  // Keyboard
  await p.evaluate(() => { __g.game.player.pos.set(0, 0, 18); });
  const b2 = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW');
  const a2 = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  const kd = Math.hypot(a2.x-b2.x, a2.z-b2.z);
  console.log('keyboard W', kd.toFixed(3));
  if (kd < 2) throw new Error('keyboard move failed');

  // After sorting still moves
  await p.evaluate(() => { __g.game._finishSort('emberforge'); document.getElementById('panel').style.display='none'; __g.game.player.pos.set(0,0,18); });
  await p.waitForTimeout(200);
  const b3 = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  await p.keyboard.down('KeyA'); await p.waitForTimeout(500); await p.keyboard.up('KeyA');
  const a3 = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  console.log('after sort A', Math.hypot(a3.x-b3.x, a3.z-b3.z).toFixed(3));

  console.log('PASS', label);
  await b.close();
}

(async () => {
  await flow('landscape', { width: 844, height: 390 });
  await flow('portrait', { width: 390, height: 844 });
  console.log('ALL PASS');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
