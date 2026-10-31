import { THREE } from './engine.js';

/** Hidden passages — deliberately subtle. */
export class Secrets {
  constructor(game) {
    this.g = game;
    this.found = new Set();
    this.open = new Set();
    // triggers defined relative to castle spots
    this.triggers = [
      {
        id: 'painting_stair',
        hint: 'An old portrait\'s eyes seem to follow you…',
        spot: 'painting',
        radius: 2.2,
        action: 'touch', // interact while looking at it
        opens: 'whisper_stair',
        quest: 'secret_stair',
      },
      {
        id: 'bookshelf',
        hint: 'One spine is worn smoother than the rest.',
        spot: 'annex',
        radius: 2.8,
        action: 'touch',
        opens: 'lexicon_passage',
        quest: 'bookshelf',
      },
      {
        id: 'secret_wall',
        hint: null, // no hint — player must notice the odd stone
        spot: 'secretWall',
        radius: 2.0,
        action: 'touch',
        opens: 'wall_passage',
        quest: 'secret_stair',
      },
      {
        id: 'lake_dive',
        hint: 'Ripples over a pale shape below.',
        spot: 'lakeRuin',
        radius: 4,
        action: 'dive', // must be low / in water
        opens: 'lake_ruin',
        quest: 'lake_ruin',
      },
    ];
  }

  update(dt) {
    const p = this.g.player.pos;
    const spots = this.g.castle.spots;
    for (const t of this.triggers) {
      if (this.found.has(t.id)) continue;
      const s = spots[t.spot]; if (!s) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < t.radius + 3 && t.hint && !t._hinted) {
        // very rare ambient — only once when nearby
        if (d < t.radius + 1.5) { t._hinted = true; /* silent — no toast, keep subtle */ }
      }
    }
  }

  tryInteract() {
    const p = this.g.player.pos;
    const spots = this.g.castle.spots;
    for (const t of this.triggers) {
      if (this.open.has(t.opens)) continue;
      const s = spots[t.spot]; if (!s) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d > t.radius) continue;
      if (t.action === 'dive' && p.y > 0.5) {
        this.g.toast?.('The water is cold… maybe swim lower.');
        continue;
      }
      this._open(t);
      return true;
    }
    return false;
  }

  _open(t) {
    this.found.add(t.id);
    this.open.add(t.opens);
    this.g.fx.burst(this.g.player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x88ffcc, 20);
    this.g.fx.ring(this.g.player.pos, 0x88ffcc);
    if (t.opens === 'whisper_stair' || t.opens === 'wall_passage') {
      // teleport into whisper vault
      const v = this.g.castle.spots.whisperVault;
      this.g.player.pos.set(v.x, v.y, v.z);
      this.g.toast?.('A passage sighs open…');
      this.g.quests?.completeStep('secret_stair', 0);
      this.g.quests?.completeStep('secret_stair', 1);
      this.g.save.secrets = this.g.save.secrets || [];
      if (!this.g.save.secrets.includes(t.opens)) this.g.save.secrets.push(t.opens);
      // reward: unlock hexbind early if not known
      this.g.spells.unlock('hexbind');
      this.g.toast?.('You found Hexbind etched in the vault wall!');
    } else if (t.opens === 'lexicon_passage') {
      this.g.toast?.('The bookshelf pivots — Restricted Annex beyond!');
      this.g.quests?.completeStep('bookshelf', 0);
      this.g.quests?.completeStep('bookshelf', 1);
      this.g.spells.unlock('thundercoil');
      this.g.player.pos.set(-62, 1, -18);
      this.g.save.secrets = this.g.save.secrets || [];
      if (!this.g.save.secrets.includes(t.opens)) this.g.save.secrets.push(t.opens);
    } else if (t.opens === 'lake_ruin') {
      this.g.toast?.('A drowned reliquary… you claim a moon-pearl!');
      this.g.quests?.completeStep('lake_ruin', 0);
      this.g.quests?.completeStep('lake_ruin', 1);
      this.g.quests?.completeStep('lake_ruin', 2);
      this.g.save.relics = (this.g.save.relics || 0) + 1;
      this.g.save.secrets = this.g.save.secrets || [];
      if (!this.g.save.secrets.includes(t.opens)) this.g.save.secrets.push(t.opens);
    }
    this.g.saveGame?.();
  }
}
