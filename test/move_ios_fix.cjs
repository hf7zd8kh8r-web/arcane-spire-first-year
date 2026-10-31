const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8080';

async function browser(viewport) {
  const b = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const ctx = await b.newContext({
    viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  return { b, p: await ctx.newPage() };
}

(async () => {
  const vp = { width: 844, height: 390 };
  let fails = 0;
  const ok = (n, c, x='') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };

  // NEW SAVE: train cutscene + Skip + Unfreeze
  {
    console.log('\n== new-save + cutscene ==');
    const { b, p } = await browser(vp);
    // no ?skip — but __startQuick sets seenTrain; so start then force intro
    await p.goto(BASE + '/?anytap', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(400);
    await p.evaluate(() => __startQuick({ name: 'Adam', house: null, sorted: false }));
    await p.waitForFunction(() => __g?.mode === 'game' && __g.game, null, { timeout: 25000 });
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      __g.game.save.seenTrain = false;
      __g.game.cutscenes.playTrainIntro();
    });
    await p.waitForTimeout(350);
    const locked = await p.evaluate(() => ({
      on: __g.game.cutscenes.on,
      frozen: __g.game.player.frozen,
      csDisplay: getComputedStyle(document.getElementById('cutscene')).display,
      seen: __g.game.save.seenTrain,
      hasSkip: !!document.getElementById('csSkip'),
      hasUf: !!document.getElementById('unfreezeBtn'),
    }));
    console.log('cutscene', locked);
    ok('cutscene locks + Skip present', locked.on && locked.frozen && locked.csDisplay === 'flex' && locked.hasSkip);
    ok('seenTrain marked early', locked.seen === true);

    await p.evaluate(() => document.getElementById('csSkip').click());
    await p.waitForTimeout(250);
    const afterSkip = await p.evaluate(() => ({
      on: __g.game.cutscenes.on, frozen: __g.game.player.frozen,
      disp: document.getElementById('cutscene').style.display,
      pe: document.getElementById('cutscene').style.pointerEvents,
    }));
    ok('Skip clears freeze + PE', !afterSkip.on && !afterSkip.frozen && afterSkip.disp === 'none' && afterSkip.pe === 'none', JSON.stringify(afterSkip));

    await p.evaluate(() => __g.game.cutscenes.playTrainIntro());
    await p.waitForTimeout(200);
    await p.evaluate(() => document.getElementById('unfreezeBtn').click());
    await p.waitForTimeout(250);
    const afterUf = await p.evaluate(() => ({
      on: __g.game.cutscenes.on, frozen: __g.game.player.frozen, enabled: __g.IN.enabled,
    }));
    ok('Unfreeze clears cutscene', !afterUf.on && !afterUf.frozen && afterUf.enabled, JSON.stringify(afterUf));

    await p.evaluate(() => { __g.game.player.pos.set(0,0,18); __g.IN.mx=0; __g.IN.my=1; __g.IN.enabled=true; });
    await p.waitForTimeout(650);
    await p.evaluate(() => { __g.IN.my=0; });
    const dist = await p.evaluate(() => Math.hypot(__g.game.player.pos.x, __g.game.player.pos.z - 18));
    ok('walk after unfreeze', dist > 2, 'dist='+dist);

    // zone drag (no elementFromPoint trap)
    await p.evaluate(() => { __g.game.player.pos.set(0,0,18); });
    await p.evaluate(() => {
      const el = document.getElementById('zoneL');
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width*0.55, cy = r.y + r.height*0.35;
      const mk = (x,y) => new Touch({ identifier: 3, target: el, clientX:x, clientY:y, pageX:x, pageY:y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true, touches:[mk(cx,cy)], changedTouches:[mk(cx,cy)] }));
      el.dispatchEvent(new TouchEvent('touchmove', { bubbles:true, cancelable:true, touches:[mk(cx,cy-55)], changedTouches:[mk(cx,cy-55)] }));
    });
    await p.waitForTimeout(200);
    const my = await p.evaluate(() => __g.IN.my);
    ok('zone drag sets my', my > 0.3, 'my='+my);

    await b.close();
  }

  // CONTINUE
  {
    console.log('\n== continue ==');
    const { b, p } = await browser(vp);
    await p.goto(BASE + '/?skip&anytap', { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(300);
    await p.evaluate(() => __startQuick({ name: 'Adam', house: 'emberforge', sorted: true }));
    await p.waitForFunction(() => __g?.mode === 'game' && __g.game, null, { timeout: 25000 });
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({
      on: __g.game.cutscenes.on, frozen: __g.game.player.frozen,
      seen: __g.game.save.seenTrain, enabled: __g.IN.enabled,
    }));
    ok('continue unlocked', !st.on && !st.frozen && st.enabled && st.seen, JSON.stringify(st));
    const bpos = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
    await p.evaluate(() => { __g.IN.mx=0; __g.IN.my=1; });
    await p.waitForTimeout(600);
    await p.evaluate(() => { __g.IN.my=0; });
    const apos = await p.evaluate(() => ({ x: __g.game.player.pos.x, z: __g.game.player.pos.z }));
    ok('continue walks', Math.hypot(apos.x-bpos.x, apos.z-bpos.z) > 2);

    const ghosts = await p.evaluate(() => ['cutscene','cardbattle','travelmap','panel'].map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, ok: true };
      const cs = getComputedStyle(el);
      return { id, ok: cs.display === 'none' || cs.pointerEvents === 'none', display: cs.display, pe: cs.pointerEvents };
    }));
    console.log('overlays', ghosts);
    ok('no ghost overlay catchers', ghosts.every(g => g.ok));
    await b.close();
  }

  console.log('\nFAILS', fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
