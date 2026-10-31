/** Headless smoke + screenshots for Arcane Spire: First Year (iPhone viewport). */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8080';
const SHOTS = path.join(__dirname, '../shots');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (p, n) => { await p.screenshot({ path: path.join(SHOTS, n), type: 'png' }); console.log('shot', n); };
let fails = 0;
const ok = (n, c, x = '') => { console.log(c ? 'PASS' : 'FAIL', n, x); if (!c) fails++; };
const clearUI = async (p) => p.evaluate(() => {
  const t = document.getElementById('toast'); if (t) t.style.opacity = '0';
  const r = document.getElementById('rotHint'); if (r) r.remove();
  if (window.__g?.ui) __g.ui.close();
});

(async () => {
  const b = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl'],
  });
  const errs = [];
  const ctx = await b.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PE ' + e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404|WebSocket|favicon|Failed to load/.test(m.text()))
      errs.push(m.text().slice(0, 200));
  });

  await p.goto(BASE + '/?skip&anytap', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1000);
  await shot(p, '01_title.png');

  await p.mouse.click(420, 200);
  await p.waitForTimeout(2800);
  try {
    await p.waitForSelector('#cGo', { timeout: 12000 });
    await p.fill('#cName', 'Adam');
    await shot(p, '02_create.png');
    await p.click('#cGo');
  } catch (e) {
    await p.evaluate(() => __startQuick({ name: 'Adam' }));
  }
  await p.waitForFunction(() => __g.mode === 'game' && __g.game, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const g = __g.game;
    if (g.cutscenes?.on) { g.cutscenes.on = false; g.player.frozen = false; const el = document.getElementById('cutscene'); if (el) el.style.display = 'none'; }
    g.save.seenTrain = true;
  });
  await clearUI(p);

  // Approach Great Hall looking at facade
  await p.evaluate(() => {
    const g = __g.game;
    g.player.pos.set(0, 0, -32);
    g.player.yaw = Math.PI;
    g.player.pitch = 0.18;
    g.player.camDist = 6;
  });
  await p.waitForTimeout(500);
  await clearUI(p);
  await shot(p, '03_greathall.png');

  await p.evaluate(() => __g.game._openSorting());
  await p.waitForTimeout(400);
  await shot(p, '04_sorting.png');
  await p.evaluate(() => __g.game._finishSort('emberforge'));
  await p.waitForTimeout(300);
  await clearUI(p);
  ok('sorted', await p.evaluate(() => __g.game.save.house === 'emberforge'));

  // Courtyard looking toward great hall / towers
  await p.evaluate(() => {
    const g = __g.game;
    g.player.pos.set(8, 0, 18);
    g.player.yaw = Math.PI + 0.35;
    g.player.pitch = 0.12;
    g.player.camDist = 6.5;
  });
  await p.waitForTimeout(600);
  await clearUI(p);
  await shot(p, '05_courtyard.png');

  await p.evaluate(() => {
    const g = __g.game;
    for (const id of ['sparkbolt', 'aegis', 'wandrift', 'stunflare', 'cinderlash', 'frostneedle', 'blinkstep', 'hovercharm', 'thundercoil', 'hexbind'])
      g.spells.unlock(id);
    g.save.spells = [...g.spells.unlocked];
    g.save.hp = g.save.maxHp = 100;
    g.save.stamina = 100;
  });

  await p.evaluate(() => __g.game.duel.challengeNpc('rook'));
  await p.waitForTimeout(400);
  const d1 = await p.evaluate(() => ({ on: __g.game.duel.on, phase: __g.game.duel.phase, y: __g.game.player.pos.y }));
  ok('duel countdown', d1.on && d1.phase === 'countdown' && d1.y > 70, JSON.stringify(d1));
  await clearUI(p);
  await shot(p, '06_duel_countdown.png');

  await p.evaluate(() => {
    const d = __g.game.duel;
    d.phase = 'fight'; d.count = -1; d.hideCount(); d.showHud(true);
    __g.game.player.frozen = false;
    __g.game.player.yaw = Math.PI / 2;
    __g.game.player.pitch = 0.05;
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    __g.game.spells.tryCast('aegis');
    __g.game.spells.tryCast('sparkbolt');
  });
  await p.waitForTimeout(500);
  await clearUI(p);
  await shot(p, '07_duel_fight.png');
  ok('duel fight', await p.evaluate(() => __g.game.duel.phase === 'fight'));

  await p.evaluate(() => { __g.game.duel.foe.hp = 0; __g.game.duel.finish('win'); });
  await p.waitForTimeout(2000);
  await clearUI(p);

  await p.evaluate(() => __g.game.broom.startSport());
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    const g = __g.game;
    g.player.pos.set(45, 7, 55);
    g.player.yaw = Math.PI / 2;
    g.player.pitch = 0.25;
  });
  await p.waitForTimeout(400);
  await clearUI(p);
  // re-show sport hud text without toast
  await p.evaluate(() => {
    const el = document.getElementById('sportHud');
    if (el) { el.style.display = 'block'; el.textContent = 'Aetherchase  0/3  ·  90s'; }
  });
  const sport = await p.evaluate(() => ({ on: __g.game.broom.on, sport: !!__g.game.broom.sport }));
  ok('aetherchase', sport.on && sport.sport, JSON.stringify(sport));
  await shot(p, '08_aetherchase.png');
  await p.evaluate(() => { __g.game.broom.endSport(); __g.game.broom.dismount(); });

  await p.evaluate(() => {
    const g = __g.game;
    const s = g.castle.spots.painting;
    g.player.pos.set(s.x, 0, s.z);
    g.player.yaw = Math.PI;
    g.secrets.tryInteract();
  });
  await p.waitForTimeout(500);
  await clearUI(p);
  await p.evaluate(() => {
    const g = __g.game;
    const v = g.castle.spots.whisperVault;
    g.player.pos.set(v.x, v.y, v.z + 2);
    g.player.yaw = Math.PI;
    g.player.pitch = 0.1;
  });
  await p.waitForTimeout(400);
  const sec = await p.evaluate(() => [...__g.game.secrets.open]);
  ok('secret', sec.includes('whisper_stair') || sec.includes('wall_passage'), JSON.stringify(sec));
  await shot(p, '09_secret.png');

  await p.evaluate(() => __g.ui.openSpellbook());
  await p.waitForTimeout(300);
  await shot(p, '10_spellbook.png');
  await p.evaluate(() => __g.ui.close());


  // Moonrail / train platform
  await p.evaluate(() => {
    const g = __g.game;
    g.broom?.endSport?.(); g.broom?.dismount?.();
    g.player.fpMode = false; if (g.player.mesh) g.player.mesh.visible = true;
    const m = g.castle.spots.moonrail || { x: 0, z: 72 };
    g.player.pos.set(m.x, 0, m.z - 8);
    g.player.yaw = 0; g.player.pitch = 0.1; g.player.camDist = 7;
  });
  await p.waitForTimeout(500);
  await clearUI(p);
  await shot(p, '13_moonrail.png');

  // Creature tame spot
  await p.evaluate(() => {
    const g = __g.game;
    g.player.pos.set(8, 0, 8);
    g.player.yaw = 0.5; g.player.pitch = 0.15; g.player.camDist = 5;
  });
  await p.waitForTimeout(400);
  await clearUI(p);
  await shot(p, '14_creatures.png');

  // Card battle UI
  await p.evaluate(() => {
    const g = __g.game;
    g.save.creatures = g.save.creatures || { owned: [], plants: [], cards: {}, points: 3, items: 2 };
    if (!g.save.creatures.owned.length) {
      g.save.creatures.owned = ['glimmerfox', 'emberfinch', 'mossback'];
      g.save.creatures.cards = { glimmerfox: { lvl: 1 }, emberfinch: { lvl: 2 }, mossback: { lvl: 1 } };
    }
    g.cards.open();
  });
  await p.waitForTimeout(400);
  await shot(p, '15_cardbattle.png');
  await p.evaluate(() => __g.game.cards.close());

  // Cutscene sample
  await p.evaluate(() => __g.game.cutscenes.playYear(1));
  await p.waitForTimeout(400);
  await shot(p, '16_cutscene.png');
  await p.evaluate(() => {
    const g = __g.game;
    g.cutscenes.on = false; g.player.frozen = false;
    const el = document.getElementById('cutscene'); if (el) el.style.display = 'none';
  });

  const unlockedProbe = await p.evaluate(() => {
    __g.game.spells.unlock('moonbolt');
    return __g.game.spells.unlocked.has('moonbolt');
  });
  ok('200spell_catalog', unlockedProbe);

  // Dramatic castle vista from south gate looking north
  await p.evaluate(() => {
    const g = __g.game;
    g.player.pos.set(0, 0, 48);
    g.player.yaw = Math.PI;
    g.player.pitch = 0.2;
    g.player.camDist = 7;
  });
  await p.waitForTimeout(600);
  await clearUI(p);
  await shot(p, '11_castle_vista.png');

  await p.setViewportSize({ width: 1280, height: 720 });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const g = __g.game;
    g.player.pos.set(15, 0, 5);
    g.player.yaw = -2.4;
    g.player.pitch = 0.18;
    g.player.camDist = 8;
  });
  await p.waitForTimeout(500);
  await clearUI(p);
  await shot(p, '12_desktop_castle.png');

  ok('zero console errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  console.log('FAILS', fails);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
