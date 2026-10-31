import { HOUSES, SPELLS, SCHOOL, DUELISTS, QUESTS, SPELL_COUNT } from './data.js';
import { isTouch, Q, qset, applyQuality } from './engine.js';
import { PERIODS } from './schedule.js';

export class UI {
  constructor() {
    this.game = null;
    this.modal = null;
  }
  attach(game) { this.game = game; }

  show(on) {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = on ? 'block' : 'none';
  }

  toast(msg, kind = '') {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div'); el.id = 'toast';
      document.getElementById('hud').appendChild(el);
    }
    el.textContent = msg;
    el.className = kind;
    el.style.opacity = '1';
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  }

  updateHud() {
    const g = this.game; if (!g) return;
    const S = g.save;
    const hp = document.getElementById('hpbar');
    const st = document.getElementById('stbar');
    if (hp) hp.style.width = (100 * S.hp / S.maxHp) + '%';
    if (st) st.style.width = (100 * S.stamina / 100) + '%';
    const name = document.getElementById('pname');
    if (name) name.textContent = S.name;
    const house = document.getElementById('phouse');
    if (house) {
      const h = HOUSES[S.house];
      house.textContent = h ? h.name : 'Unsorted';
      house.style.color = h ? '#' + h.colors.secondary.toString(16).padStart(6, '0') : '#ccc';
    }
    const lvl = document.getElementById('lvl');
    if (lvl) lvl.textContent = S.lvl;
    this.updateSpells();
  }

  updateSpells() {
    const g = this.game; if (!g) return;
    const row = document.getElementById('spells');
    if (!row) return;
    const known = g.spells.loadout; // 10 slots (may include empties)
    row.innerHTML = known.map((id, i) => {
      if (!id || !SPELLS[id]) return `<button class="sp empty" data-i="${i}" title="Empty slot"><b>·</b><small>${i + 1}</small></button>`;
      const sp = SPELLS[id];
      const cd = g.spells.cds[id] || 0;
      const on = g.spells.active === id ? 'on' : '';
      return `<button class="sp ${on}" data-i="${i}" title="${sp.name}"><b>${sp.icon}</b><small>${i + 1}</small>${cd > 0 ? `<em>${cd.toFixed(1)}</em>` : ''}</button>`;
    }).join('');
  }

  updateQuest() {
    const g = this.game; if (!g) return;
    const el = document.getElementById('qtrack');
    if (!el) return;
    const act = g.quests.active().filter(q => q.type === 'main')[0] || g.quests.active()[0];
    if (!act) { el.innerHTML = '<b>All quiet</b><span>Explore Crescentwick</span>'; return; }
    const st = g.save.quests[act.id];
    el.innerHTML = `<b>${act.name}</b><span>${act.steps[st.step] || 'Done'}</span>`;
  }

  openMenu() {
    this.modal = 'menu';
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto'; panel.style.pointerEvents = 'auto';
    const known = this.game?.spells?.allKnown?.()?.length || this.game?.spells?.unlocked?.size || 0;
    panel.innerHTML = `
      <div class="card">
        <h2>${SCHOOL.title}</h2>
        <button data-act="spellbook">📖 Spellbook (${known}/${SPELL_COUNT})</button>
        <button data-act="loadout">✦ Spell Loadout (10)</button>
        <button data-act="quests">📜 Quests</button>
        <button data-act="duelclub">⚔ Duel Club</button>
        <button data-act="timetable">🗓️ Timetable</button>
        <button data-act="aether">🧹 Aetherchase</button>
        <button data-act="travel">🪑 Bench Travel</button>
        <button data-act="yearup">🌙 Advance Year</button>
        <button data-act="peers">👥 Duo / Chamber</button>
        <button data-act="quality">✨ Quality: ${Q.auto ? 'Auto' : Q.level}</button>
        <button data-act="close">Close</button>
      </div>`;
  }

  openSpellbook() {
    this.modal = 'spellbook';
    const g = this.game;
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
    const known = g.spells.allKnown();
    const lockedN = SPELL_COUNT - known.length;
    const lo = new Set(g.spells.loadout.filter(Boolean));
    const rows = known.map(id => {
      const sp = SPELLS[id];
      const on = lo.has(id);
      const combat = ['attack','fire','ice','lightning','stun','disarm','control','earth','water','air','light','dark'].includes(sp.kind);
      return `<div class="srow ${on ? 'on' : ''}"><b>${sp.icon} ${sp.name}</b>
        <span>${sp.desc} · ${sp.kind}${combat ? ' · duel-only' : ' · anytime'}</span>
        <button data-act="toggleEquip" data-id="${id}" type="button">${on ? 'Unequip' : 'Equip'}</button></div>`;
    }).join('');
    panel.innerHTML = `<div class="card wide"><h2>Spellbook · ${known.length}/${SPELL_COUNT}</h2>
      <p class="dim">Equip up to 10 for your loadout. Combat workings fire only in duels.</p>
      ${rows}<p class="dim">${lockedN} sealed. <button data-act="loadout" type="button">Edit loadout slots</button></p>
      <button data-act="close">Close</button></div>`;
  }

  openLoadout() {
    this.modal = 'loadout';
    const g = this.game;
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
    const slots = g.spells.loadout.map((id, i) => {
      const sp = id && SPELLS[id];
      return `<div class="srow"><b>Slot ${i + 1}</b>
        <span>${sp ? `${sp.icon} ${sp.name} (${sp.kind})` : '— empty —'}</span>
        ${id ? `<button data-act="unequipSlot" data-i="${i}" type="button">Clear</button>` : ''}
      </div>`;
    }).join('');
    const known = g.spells.allKnown();
    const picks = known.map(id => {
      const sp = SPELLS[id];
      const on = g.spells.loadout.includes(id);
      return `<button data-act="equipSpell" data-id="${id}" type="button" class="${on ? 'on' : ''}">${sp.icon} ${sp.name}</button>`;
    }).join('');
    panel.innerHTML = `<div class="card wide"><h2>Spell Loadout · 10 slots</h2>
      <p class="dim">Hotbar uses these. Combat spells only work in Duel Club / challenges.</p>
      ${slots}
      <h3>Known workings</h3>
      <div class="pickgrid">${picks}</div>
      <button data-act="spellbook">Full book</button>
      <button data-act="close">Close</button></div>`;
  }

  openQuests() {
    this.modal = 'quests';
    const g = this.game;
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
    const rows = QUESTS.map(q => {
      const st = g.save.quests?.[q.id] || { step: 0, done: false };
      return `<div class="srow ${st.done ? 'done' : ''}"><b>${q.type === 'secret' ? '‽' : '•'} ${q.name}</b><span>${st.done ? 'Complete' : q.steps[st.step]}</span></div>`;
    }).join('');
    panel.innerHTML = `<div class="card wide"><h2>Quests</h2>${rows}<button data-act="close">Close</button></div>`;
  }

  openDuelClub() {
    this.modal = 'duel';
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
    const rows = DUELISTS.map(d => {
      const h = HOUSES[d.house];
      return `<button data-act="duelnpc" data-id="${d.id}">⚔ ${d.name} <small>Lv.${d.lvl} · ${h.name}</small></button>`;
    }).join('');
    panel.innerHTML = `<div class="card"><h2>Duel Club</h2><p class="dim">Real-time — dodge, ward, counter. No turns.</p>${rows}<button data-act="close">Close</button></div>`;
  }

  offerDuel(m) {
    this.modal = 'duelask';
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
    panel.innerHTML = `<div class="card"><h2>Duel Challenge</h2><p>${m.name} challenges you!</p>
      <button data-act="duelok" data-id="${m.id}" data-name="${m.name}" data-house="${m.house}" data-lvl="${m.lvl}">Accept</button>
      <button data-act="duelno" data-id="${m.id}">Decline</button></div>`;
  }

  close() {
    this.modal = null;
    const panel = document.getElementById('panel');
    if (panel) { panel.style.display = 'none'; panel.style.pointerEvents = 'none'; }
  }

  act(a, el) {
    const g = this.game;
    if (a === 'close') this.close();
    else if (a === 'quality') {
      const order = ['auto', 'low', 'med', 'high'];
      const cur = Q.auto ? 'auto' : Q.level;
      const next = order[(order.indexOf(cur) + 1) % order.length];
      qset(next); applyQuality();
      this.game.toast(`Graphics: ${next}`);
      this.openMenu();
    }
    else if (a === 'spellbook') this.openSpellbook();
    else if (a === 'loadout') this.openLoadout();
    else if (a === 'quests') this.openQuests();
    else if (a === 'duelclub') this.openDuelClub();
    else if (a === 'toggleEquip') {
      const id = el.dataset.id;
      if (g.spells.loadout.includes(id)) {
        const i = g.spells.loadout.indexOf(id);
        g.spells.unequip(i);
      } else {
        if (g.spells.loadout.filter(Boolean).length >= 10) g.toast('Loadout full — clear a slot first');
        else g.spells.equip(id);
      }
      g.saveGame?.();
      this.openSpellbook();
    }
    else if (a === 'equipSpell') {
      const id = el.dataset.id;
      if (g.spells.loadout.includes(id)) {
        g.spells.unequip(g.spells.loadout.indexOf(id));
      } else if (g.spells.loadout.filter(Boolean).length >= 10) {
        g.toast('Loadout full (10) — clear a slot');
      } else {
        g.spells.equip(id);
      }
      g.saveGame?.();
      this.openLoadout();
    }
    else if (a === 'unequipSlot') {
      g.spells.unequip(+el.dataset.i);
      g.saveGame?.();
      this.openLoadout();
    }
    else if (a === 'timetable') this.openTimetable();
    else if (a === 'travel') { this.close(); g.benches._openMap(); g.player.frozen = true; }
    else if (a === 'yearup') { this.close(); g.advanceYear(); }
    else if (a === 'aether') { this.close(); g.broom.startSport(); }
    else if (a === 'duelnpc') { this.close(); g.duel.challengeNpc(el.dataset.id); }
    else if (a === 'duelok') {
      this.close();
      g.net.acceptDuel(+el.dataset.id, { name: el.dataset.name, house: el.dataset.house, lvl: +el.dataset.lvl });
    }
    else if (a === 'duelno') {
      g.net.send({ t: 'duel', to: +el.dataset.id, k: 'no' });
      this.close();
    }
    else if (a === 'peers') {
      const peers = [...g.net.peers.values()];
      const panel = document.getElementById('panel');
      panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
      const rows = peers.length
        ? peers.map(p => `<button data-act="chal" data-id="${p.id}">Challenge ${p.name}</button>`).join('')
        : '<p class="dim">No one else in this chamber. Share a room code from the title screen.</p>';
      panel.innerHTML = `<div class="card"><h2>Chamber</h2>${rows}<button data-act="close">Close</button></div>`;
      this.modal = 'peers';
    }
    else if (a === 'chal') { this.close(); g.net.challenge(+el.dataset.id); }
    else if (a === 'skipclass') { g.schedule.skipCurrent(); this.openTimetable(); }
  }

  openTimetable() {
    this.modal = 'timetable';
    const g = this.game;
    const panel = document.getElementById('panel');
    panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
    const cur = g.schedule.currentPeriod();
    const rows = PERIODS.map(p => {
      const on = cur && cur.id === p.id;
      return `<div class="srow ${on ? 'done' : ''}"><b>${p.name}</b><span>${p.start}:00–${p.end}:00 · ${p.room} · ${p.teacher}${on ? ' · NOW' : ''}</span></div>`;
    }).join('');
    const det = g.save.school?.detentionTask;
    panel.innerHTML = `<div class="card wide"><h2>Timetable · Y${g.save.year || 1}</h2>
      <p class="dim">${g.schedule.clockText()} · Grade: ${g.save.school?.grade || 'New'} · Detentions: ${g.save.school?.detentions || 0}</p>
      ${rows}
      ${det ? `<p class="dim">Detention: ${det.desc} (${det.progress}/${det.need})</p>` : ''}
      <button data-act="skipclass">Skip current class (detention)</button>
      <button data-act="close">Close</button></div>`;
  }

  showFpCards(on) {
    const row = document.getElementById('spells');
    if (row) row.classList.toggle('fp', !!on);
  }

  bind() {
    document.getElementById('panel')?.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b) this.act(b.dataset.act, b);
    });
    document.getElementById('menuBtn')?.addEventListener('click', () => this.openMenu());
    document.getElementById('spells')?.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) this.game.spells.select(+b.dataset.i);
    });
    document.getElementById('bookBtn')?.addEventListener('click', () => this.openSpellbook());
  }
}
