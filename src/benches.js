/** Sit on a bench → open map → fast-travel. */
export const TRAVEL = [
  { id: 'courtyard', name: 'Courtyard Fountain', spot: 'fountain' },
  { id: 'hall', name: 'Great Hall', spot: 'greatHall' },
  { id: 'charms', name: 'Charms Wing', spot: 'charms' },
  { id: 'library', name: 'Library', spot: 'library' },
  { id: 'pitch', name: 'Aetherchase Pitch', spot: 'pitch' },
  { id: 'lake', name: 'Mirror Lake Dock', spot: 'lake' },
  { id: 'forest', name: 'Edgewood', spot: 'forest' },
  { id: 'gate', name: 'South Gate', spot: 'gate' },
];

export class Benches {
  constructor(game) {
    this.g = game;
    this.nodes = [
      { x: -12, z: 12 }, { x: 12, z: 12 }, { x: -12, z: -12 }, { x: 12, z: -12 },
      { x: 0, z: 35 }, { x: 48, z: 48 },
    ];
  }
  nearest() {
    const p = this.g.player.pos;
    let best = null, bd = 3;
    for (const n of this.nodes) {
      const d = Math.hypot(p.x - n.x, p.z - n.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  trySit() {
    const n = this.nearest();
    if (!n) return false;
    this.g.player.pos.set(n.x, 0, n.z);
    this.g.player.frozen = true;
    this._openMap();
    return true;
  }
  _openMap() {
    let el = document.getElementById('travelmap');
    if (!el) {
      el = document.createElement('div'); el.id = 'travelmap';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    el.innerHTML = `<div class="card"><h2>Bench Map</h2><p class="dim">Tap a place to travel. Stand to cancel.</p>
      ${TRAVEL.map(t => `<button type="button" data-go="${t.spot}">${t.name}</button>`).join('')}
      <button type="button" id="tvClose">Stand up</button></div>`;
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.travel(b.dataset.go));
    el.querySelector('#tvClose').onclick = () => this.close();
  }
  travel(spotId) {
    const s = this.g.castle.spots[spotId];
    if (!s) return;
    this.g.player.pos.set(s.x, 0, s.z + 3);
    this.g.fx.burst(this.g.player.pos.clone().setY(1), 0xc8a050, 14);
    this.g.toast?.('Traveled');
    this.close();
  }
  close() {
    this.g.player.frozen = false;
    const el = document.getElementById('travelmap');
    if (el) el.style.display = 'none';
  }
}
