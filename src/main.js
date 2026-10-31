import { THREE, renderer, applyQuality, Q, qset, isTouch } from './engine.js';
import './style.css';
import { Cover } from './cover.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { IN, initMouse, initTouch } from './input.js';
import { HOUSES, SCHOOL } from './data.js';
import * as ST from './state.js';

const $ = s => document.querySelector(s);
const show = (id, d = 'block') => { const el = $(id); if (el) el.style.display = d; };
const hide = id => { const el = $(id); if (el) el.style.display = 'none'; };

applyQuality();
const params = new URLSearchParams(location.search);
let mode = 'logo', cover = null, game = null;
const ui = new UI();
window.__g = { THREE, get game() { return game; }, get mode() { return mode; }, ui, IN, Q, HOUSES, SCHOOL };

initMouse(renderer.domElement);
initTouch($('#hud'));
ui.bind();

$('#qBtn')?.addEventListener('pointerdown', e => {
  e.stopPropagation();
  const n = Q.auto ? 'low' : { low: 'med', med: 'high', high: 'auto' }[Q.level];
  qset(n); $('#qBtn b').textContent = n.toUpperCase();
});

// Logo -> cover
function toCover() {
  if (mode !== 'logo') return;
  mode = 'cover'; hide('#logo'); show('#cover', 'flex');
  cover = new Cover();
  $('#qBtn b').textContent = Q.auto ? 'AUTO' : Q.level.toUpperCase();
  if (params.get('room')) $('#crewJoin').textContent = `Chamber code ${params.get('room').toUpperCase()} — tap to enter`;
}
show('#logo', 'flex');
if (params.has('skip')) toCover();
else {
  setTimeout(toCover, 2200);
  $('#logo').addEventListener('pointerdown', toCover);
}

{ const jc = $('#joinCode'), jb = $('#joinBox');
  try { const last = localStorage.getItem('asfy_room'); if (last && !params.get('room')) jc.value = last; } catch (_) {}
  ['pointerdown', 'touchstart', 'click'].forEach(ev => jb?.addEventListener(ev, e => e.stopPropagation()));
  const join = () => {
    const c = jc.value.toUpperCase().trim();
    if (!/^[A-Z0-9]{4,8}$/.test(c)) { $('#crewJoin').textContent = 'Codes are 4–8 letters/numbers'; return; }
    params.set('room', c); localStorage.setItem('asfy_room', c);
    const u = new URL(location.href); u.searchParams.set('room', c); history.replaceState(null, '', u.toString());
    $('#crewJoin').textContent = `You'll join chamber ${c} — tap the crest!`;
  };
  $('#joinGo')?.addEventListener('click', join);
  jc?.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
}

addEventListener('pointerdown', e => {
  if (mode === 'cover' && cover && !e.target.closest('#qBtn') && !e.target.closest('#joinBox') && (cover.hit(e.clientX, e.clientY) || params.has('anytap'))) startBurst();
});

function startBurst() {
  if (!cover.burst()) return;
  mode = 'burst'; hide('#cover');
  show('#white'); $('#white').style.opacity = '1';
  setTimeout(() => { hide('#white'); toLoading(); }, 600);
}

function toLoading() {
  mode = 'loading'; show('#loading', 'flex');
  const bar = $('.lbar i'), txt = $('.ltxt');
  const steps = [['Lighting the lanterns…', 20], ['Opening the gates…', 45], ['Polishing wands…', 70], ['Awakening the Mirror…', 100]];
  let i = 0;
  const next = () => {
    const [t, p] = steps[i]; txt.textContent = t; bar.style.width = p + '%';
    if (i === 1) { game = new Game(ui); ui.attach(game); }
    i++; if (i < steps.length) setTimeout(next, 380); else setTimeout(toCreate, 400);
  };
  setTimeout(next, 150);
}

function toCreate() {
  hide('#loading'); mode = 'create'; show('#create', 'flex');
  const ex = ST.load();
  $('#cont').innerHTML = ex
    ? `<button class="big" id="cCont">Continue as ${esc(ex.name)} ▶</button>
       <p class="dim">Lv.${ex.lvl}${ex.house ? ' · ' + (HOUSES[ex.house]?.name || '') : ''} · or create new below</p>`
    : '';
  if (ex) $('#cCont').onclick = () => begin(ex);
  $('#cGo').onclick = () => {
    const n = ($('#cName').value || '').trim() || 'First-Year';
    const skin = +($('#cSkin')?.value || 0);
    const hair = +($('#cHair')?.value || 0);
    const sv = ST.newSave(n, null);
    sv.look = { skin, hair };
    begin(sv);
  };
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function begin(save) {
  hide('#create'); mode = 'game'; ST.save(save);
  game.start(save);
  ui.show(true); IN.enabled = true;
  ui.updateHud(); ui.updateQuest();
  const room = params.get('room');
  if (room) setTimeout(() => game.net.connect(room), 500);
  setTimeout(() => {
    const r = document.getElementById('rotHint');
    if (r) { r.classList.add('bye'); setTimeout(() => r.remove(), 400); }
  }, 3500);
  setTimeout(() => ui.toast(isTouch ? 'Drag LEFT half to move · RIGHT half to look' : 'Click to lock mouse · WASD move · LMB cast · RMB ward · Shift dodge · E use · B broom', 'blk'), 800);
}

// Expose helpers for headless tests
window.__startQuick = (opts = {}) => {
  const sv = ST.newSave(opts.name || 'Tester', opts.house || 'emberforge');
  sv.sorted = !!opts.sorted || !!opts.house;
  if (opts.house) sv.house = opts.house;
  sv.look = { skin: 1, hair: 2 };
  if (mode === 'logo' || mode === 'cover') { mode = 'loading'; hide('#logo'); hide('#cover'); }
  if (!game) { game = new Game(ui); ui.attach(game); }
  begin(sv);
};
window.__sort = (h) => game && game._finishSort(h || 'emberforge');
