import { CREATURES } from './creatures.js';

/** Creature card battles — points budget, card costs, level-up items raise max points. */
export class CardBattle {
  constructor(game) {
    this.g = game;
    this.on = false;
    this.budget = 3;
    this.maxBudget = 3;
    this.playerField = [];
    this.foeField = [];
    this.turn = 'player';
    this.log = [];
  }
  ensure() {
    const S = this.g.save;
    if (!S.creatures) S.creatures = { owned: [], plants: [], cards: {}, points: 3, items: 0 };
    this.maxBudget = S.creatures.points || 3;
  }
  open() {
    this.ensure();
    const owned = this.g.save.creatures.owned;
    if (!owned.length) { this.g.toast?.('Tame a creature first'); return; }
    this.on = true;
    this.budget = this.maxBudget;
    this.playerField = [];
    this.foeField = this._foeTeam();
    this.turn = 'player';
    this._render();
  }
  _foeTeam() {
    const ids = Object.keys(CREATURES);
    const picks = [];
    let cost = 0; const cap = this.maxBudget;
    while (cost < cap && picks.length < 3) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      const c = CREATURES[id];
      if (cost + c.cost > cap) break;
      picks.push({ id, hp: c.hp, max: c.hp, atk: c.atk, cost: c.cost, name: c.name });
      cost += c.cost;
    }
    if (!picks.length) picks.push({ id: 'emberfinch', hp: 28, max: 28, atk: 14, cost: 1, name: 'Emberfinch' });
    return picks;
  }
  playCard(id) {
    if (!this.on || this.turn !== 'player') return;
    const def = CREATURES[id]; if (!def) return;
    const card = this.g.save.creatures.cards[id] || { lvl: 1 };
    const cost = def.cost;
    if (cost > this.budget) { this.g.toast?.('Not enough points'); return; }
    if (this.playerField.some(c => c.id === id)) return;
    this.budget -= cost;
    const bonus = (card.lvl - 1) * 6;
    this.playerField.push({ id, hp: def.hp + bonus, max: def.hp + bonus, atk: def.atk + Math.floor(bonus / 3), cost, name: def.name });
    this._render();
    if (this.playerField.length >= 3 || this.budget <= 0) this._resolveRound();
  }
  _resolveRound() {
    // simple simultaneous strikes
    let pi = 0, fi = 0;
    const log = [];
    while (pi < this.playerField.length && fi < this.foeField.length) {
      const a = this.playerField[pi], b = this.foeField[fi];
      b.hp -= a.atk; a.hp -= b.atk;
      log.push(`${a.name} strikes ${b.name}`);
      if (b.hp <= 0) { log.push(`${b.name} faints`); fi++; }
      if (a.hp <= 0) { log.push(`${a.name} faints`); pi++; }
    }
    this.log = log;
    const pAlive = this.playerField.some(c => c.hp > 0);
    const fAlive = this.foeField.some(c => c.hp > 0);
    if (pAlive && !fAlive) {
      this.g.toast?.('Card battle won! +XP');
      this.g.save.xp = (this.g.save.xp || 0) + 25;
      this.g.save.creatures.items = (this.g.save.creatures.items || 0) + 1;
    } else if (!pAlive) this.g.toast?.('Card battle lost');
    this._render(true);
    setTimeout(() => this.close(), 2200);
  }
  levelUpPoints() {
    this.ensure();
    const S = this.g.save.creatures;
    if ((S.items || 0) < 2) { this.g.toast?.('Need 2 training items (rescue plants)'); return; }
    S.items -= 2;
    S.points = Math.min(12, (S.points || 3) + 1);
    this.maxBudget = S.points;
    this.g.toast?.(`Max points now ${S.points}`);
    this.g.saveGame?.();
  }
  levelCard(id) {
    this.ensure();
    const S = this.g.save.creatures;
    if ((S.items || 0) < 1) { this.g.toast?.('Need a training item'); return; }
    S.items--;
    S.cards[id] = S.cards[id] || { lvl: 1 };
    S.cards[id].lvl++;
    this.g.toast?.(`${CREATURES[id].name} → Lv.${S.cards[id].lvl}`);
    this.g.saveGame?.();
  }
  _render(done = false) {
    let el = document.getElementById('cardbattle');
    if (!el) {
      el = document.createElement('div'); el.id = 'cardbattle';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    const owned = this.g.save.creatures.owned;
    const hand = owned.map(id => {
      const d = CREATURES[id]; const lv = (this.g.save.creatures.cards[id] || {}).lvl || 1;
      return `<button type="button" data-card="${id}">${d.name}<small>${d.cost}pt · Lv${lv}</small></button>`;
    }).join('');
    const field = (arr) => arr.map(c => `<div class="cf ${c.hp <= 0 ? 'down' : ''}"><b>${c.name}</b><i style="width:${100 * Math.max(0, c.hp) / c.max}%"></i></div>`).join('');
    el.innerHTML = `<div class="cb-card">
      <h2>Creature Cards</h2>
      <p class="dim">Budget ${this.budget}/${this.maxBudget} · Training items: ${this.g.save.creatures.items || 0}</p>
      <div class="cb-row"><span>Foe</span>${field(this.foeField)}</div>
      <div class="cb-row"><span>You</span>${field(this.playerField)}</div>
      ${done ? `<p>${(this.log || []).slice(-3).join(' · ')}</p>` : `<div class="cb-hand">${hand}</div>
      <button type="button" id="cbFight">Fight with field</button>
      <button type="button" id="cbPts">Spend 2 items → +1 max points</button>`}
      <button type="button" id="cbClose">Close</button>
    </div>`;
    el.querySelector('#cbClose').onclick = () => this.close();
    el.querySelector('#cbFight')?.addEventListener('click', () => { if (this.playerField.length) this._resolveRound(); else this.g.toast?.('Play at least one card'); });
    el.querySelector('#cbPts')?.addEventListener('click', () => { this.levelUpPoints(); this._render(); });
    el.querySelectorAll('[data-card]').forEach(b => b.onclick = () => this.playCard(b.dataset.card));
  }
  close() {
    this.on = false;
    const el = document.getElementById('cardbattle');
    if (el) el.style.display = 'none';
  }
}
