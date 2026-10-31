import { HOUSES, SPELLS, SCHOOL, DUELISTS, QUESTS } from './data.js';
import { isTouch } from './engine.js';

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
    const known = g.spells.known();
    row.innerHTML = known.map((id, i) => {
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
    panel.style.display = 'flex';
    panel.innerHTML = `
      <div class="card">
        <h2>${SCHOOL.title}</h2>
        <button data-act="spellbook">📖 Spellbook</button>
        <button data-act="quests">📜 Quests</button>
        <button data-act="duelclub">⚔ Duel Club</button>
        <button data-act="aether">🧹 Aetherchase</button>
        <button data-act="peers">👥 Chamber Peers</button>
        <button data-act="close">Close</button>
      </div>`;
  }

  openSpellbook() {
    this.modal = 'spellbook';
    const g = this.game;
    const panel = document.getElementById('panel');
    panel.style.display = 'flex';
    const rows = Object.values(SPELLS).map(sp => {
      const know = g.spells.unlocked.has(sp.id);
      return `<div class="srow ${know ? '' : 'locked'}"><b>${sp.icon} ${sp.name}</b><span>${know ? sp.desc : 'Not yet learned'}</span></div>`;
    }).join('');
    panel.innerHTML = `<div class="card wide"><h2>Spellbook</h2>${rows}<button data-act="close">Close</button></div>`;
  }

  openQuests() {
    this.modal = 'quests';
    const g = this.game;
    const panel = document.getElementById('panel');
    panel.style.display = 'flex';
    const rows = QUESTS.map(q => {
      const st = g.save.quests?.[q.id] || { step: 0, done: false };
      return `<div class="srow ${st.done ? 'done' : ''}"><b>${q.type === 'secret' ? '‽' : '•'} ${q.name}</b><span>${st.done ? 'Complete' : q.steps[st.step]}</span></div>`;
    }).join('');
    panel.innerHTML = `<div class="card wide"><h2>Quests</h2>${rows}<button data-act="close">Close</button></div>`;
  }

  openDuelClub() {
    this.modal = 'duel';
    const panel = document.getElementById('panel');
    panel.style.display = 'flex';
    const rows = DUELISTS.map(d => {
      const h = HOUSES[d.house];
      return `<button data-act="duelnpc" data-id="${d.id}">⚔ ${d.name} <small>Lv.${d.lvl} · ${h.name}</small></button>`;
    }).join('');
    panel.innerHTML = `<div class="card"><h2>Duel Club</h2><p class="dim">Real-time — dodge, ward, counter. No turns.</p>${rows}<button data-act="close">Close</button></div>`;
  }

  offerDuel(m) {
    this.modal = 'duelask';
    const panel = document.getElementById('panel');
    panel.style.display = 'flex';
    panel.innerHTML = `<div class="card"><h2>Duel Challenge</h2><p>${m.name} challenges you!</p>
      <button data-act="duelok" data-id="${m.id}" data-name="${m.name}" data-house="${m.house}" data-lvl="${m.lvl}">Accept</button>
      <button data-act="duelno" data-id="${m.id}">Decline</button></div>`;
  }

  close() {
    this.modal = null;
    const panel = document.getElementById('panel');
    if (panel) panel.style.display = 'none';
  }

  act(a, el) {
    const g = this.game;
    if (a === 'close') this.close();
    else if (a === 'spellbook') this.openSpellbook();
    else if (a === 'quests') this.openQuests();
    else if (a === 'duelclub') this.openDuelClub();
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
      panel.style.display = 'flex';
      const rows = peers.length
        ? peers.map(p => `<button data-act="chal" data-id="${p.id}">Challenge ${p.name}</button>`).join('')
        : '<p class="dim">No one else in this chamber. Share a room code from the title screen.</p>';
      panel.innerHTML = `<div class="card"><h2>Chamber</h2>${rows}<button data-act="close">Close</button></div>`;
      this.modal = 'peers';
    }
    else if (a === 'chal') { this.close(); g.net.challenge(+el.dataset.id); }
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
