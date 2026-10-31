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
    g.cutscenes?.forceEnd?.();
    g.player.frozen = false;
    g.save.seenTrain = true;
  });

  // Hit above D-pad (D-pad intentionally overlays bottom-left of zoneL)
  const hit = await p.evaluate(() => {
    const z = document.getElementById('zoneL');
    const r = z.getBoundingClientRect();
    const cx = r.x + r.width * 0.55, cy = r.y + r.height * 0.35;
    const top = document.elementFromPoint(cx, cy);
    return {
      cx, cy,
      top: top && (top.id || top.className || top.tagName),
      isZone: !!(top && (top.id === 'zoneL' || top.closest?.('#zoneL') || top.id === 'stickL')),
      dpad: !!document.getElementById('dpad'),
      unfreeze: !!document.getElementById('unfreezeBtn'),
      rotPE: document.getElementById('rotHint') ? getComputedStyle(document.getElementById('rotHint')).pointerEvents : null,
      pos: { x: __g.game.player.pos.x, z: __g.game.player.pos.z },
      enabled: __g.IN.enabled,
    };
  });
  console.log('hit-test', hit);
  if (!hit.isZone) throw new Error('zoneL blocked by ' + hit.top);
  if (!hit.dpad) throw new Error('dpad missing');
  if (!hit.unfreeze) throw new Error('unfreezeBtn missing');

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

  // D-pad forward
  await p.evaluate(() => { __g.game.player.pos.set(0, 0, 18); __g.IN.mx=0; __g.IN.my=0; });
  await p.evaluate(() => {
    const b = document.getElementById('dpU');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, pointerId:7, pointerType:'touch', clientX:50, clientY:300 }));
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.getElementById('dpU').dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true, pointerId:7, pointerType:'touch' }));
  });
  const afterPad = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
  const pd = Math.hypot(afterPad.x, afterPad.z - 18);
  console.log('dpad U', pd.toFixed(3), afterPad);
  if (pd < 1.5) throw new Error('dpad move too small: ' + pd);

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
