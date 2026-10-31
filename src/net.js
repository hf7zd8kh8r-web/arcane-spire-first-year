/** Lightweight WebSocket relay for PvP duels + presence. */
export class Net {
  constructor(game) {
    this.g = game;
    this.ws = null;
    this.id = null;
    this.room = null;
    this.peers = new Map();
  }

  connect(room) {
    room = String(room || 'LOBBY').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'LOBBY';
    if (this.ws) try { this.ws.close(); } catch (_) {}
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws?room=${room}`;
    this.room = room;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.send({ t: 'hello', name: this.g.save.name, house: this.g.save.house, lvl: this.g.save.lvl });
      this.g.toast?.(`Joined chamber ${room}`);
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      this._on(m);
    };
    ws.onclose = () => { this.ws = null; };
  }

  send(o) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o));
  }

  _on(m) {
    if (m.t === 'welcome') {
      this.id = m.id;
      for (const p of m.peers || []) this.peers.set(p.id, p);
    } else if (m.t === 'join') {
      this.peers.set(m.id, m);
      this.g.toast?.(`${m.name} entered the chamber`);
    } else if (m.t === 'leave') {
      this.peers.delete(m.id);
    } else if (m.t === 'duel') {
      if (m.k === 'ask') {
        this.g.ui?.offerDuel?.(m);
      } else if (m.k === 'ok') {
        this.g.duel.start({
          name: m.name, house: m.house, lvl: m.lvl || 1,
          hp: 100, maxHp: 100, spells: ['sparkbolt', 'aegis', 'wandrift', 'frostneedle'],
          isNpc: false,
        }, { pvp: true, peer: m.id });
      } else if (m.k === 'no') {
        this.g.toast?.('Duel declined');
      }
    } else if (m.t === 'dstate' && this.g.duel?.on && this.g.duel.isPvp) {
      const f = this.g.duel.foe; if (!f) return;
      if (Array.isArray(m.p)) f.pos.set(m.p[0], m.p[1], m.p[2]);
      f.hp = m.h ?? f.hp;
      f.yaw = m.a ?? f.yaw;
    } else if (m.t === 'dhit' && this.g.duel?.on) {
      if (this.g.duel.phase === 'countdown') return;
      this.g.damagePlayer(m.d || 0, { id: m.spell || 'sparkbolt', color: 0xffe08a });
    } else if (m.t === 'chat') {
      this.g.toast?.(`${m.name}: ${m.msg}`);
    }
  }

  challenge(peerId) {
    const p = this.peers.get(peerId);
    if (!p) return;
    this.send({ t: 'duel', to: peerId, k: 'ask', name: this.g.save.name, house: this.g.save.house, lvl: this.g.save.lvl });
  }

  acceptDuel(fromId, info) {
    this.send({ t: 'duel', to: fromId, k: 'ok', name: this.g.save.name, house: this.g.save.house, lvl: this.g.save.lvl });
    this.g.duel.start({
      name: info.name, house: info.house, lvl: info.lvl || 1,
      hp: 100, maxHp: 100, spells: ['sparkbolt', 'aegis', 'frostneedle'],
      isNpc: false,
    }, { pvp: true, peer: fromId });
  }

  tick() {
    if (!this.ws || !this.g.duel?.on || !this.g.duel.isPvp) return;
    const p = this.g.player.pos;
    this.send({ t: 'dstate', p: [p.x, p.y, p.z], a: this.g.player.yaw, h: this.g.save.hp });
  }
}
