/** Original Crescentwick cutscenes — train arrival + per-year openings. */
export const FRIENDS = [
  { id: 'lira', name: 'Lira Fen', house: 'mistvale', line: 'First time on the Moonrail? Sit with us — we save the window seats.' },
  { id: 'joren', name: 'Joren Ash', house: 'emberforge', line: 'I heard the Sorting Mirror argues with itself. Can\'t wait.' },
  { id: 'sae', name: 'Sae Quill', house: 'stormcrown', line: 'Don\'t lose your timetable parchment. Prefects love detention.' },
];

export const YEAR_SCENES = {
  1: { title: 'Year One — Arrival', lines: [
    'The Moonrail carriage rattles through the dusk hills…',
    'Lira Fen: "There — Crescentwick\'s spires. Like a crown of lanterns."',
    'Joren Ash: "Last one to the gate buys cocoa."',
    'Sae Quill: "Rules first. Cocoa later."',
    'You step onto the platform. Your first year begins.',
  ]},
  2: { title: 'Year Two — Returning Bells', lines: [
    'The same rails, a taller you. Friends wave from the platform.',
    'Lira: "Charms wing moved the stair again."',
    'A new timetable waits in your pocket.',
  ]},
  3: { title: 'Year Three — Crosswinds', lines: [
    'Stormlight over the lake. Electives open this year.',
    'Joren: "Duel Club finals are brutal. I\'m in."',
  ]},
  4: { title: 'Year Four — Midspire', lines: [
    'Halfway through. The Mirror\'s hall feels smaller somehow.',
    'Sae: "Detention duty builds character. Allegedly."',
  ]},
  5: { title: 'Year Five — Trials', lines: [
    'Trial season. Lanterns burn late in the library annex.',
    'Lira: "We study together. No arguments."',
  ]},
  6: { title: 'Year Six — Deep Currents', lines: [
    'Advanced wards hum in the towers.',
    'Joren: "Captain asked if you\'d try Aetherchase again."',
  ]},
  7: { title: 'Year Seven — Last Lantern', lines: [
    'Your final Moonrail ride as a student.',
    'Sae: "Whatever comes next — we\'ll write."',
    'Crescentwick\'s gates open one last first-morning.',
  ]},
};

export class Cutscenes {
  constructor(game) {
    this.g = game;
    this.on = false;
    this.lines = [];
    this.i = 0;
    this._el = null;
    this._done = null;
  }
  playYear(year) {
    const sc = YEAR_SCENES[year] || YEAR_SCENES[1];
    this._play(sc.title, sc.lines, () => {
      this.g.save.year = year;
      this.g.saveGame?.();
    });
  }
  playTrainIntro() {
    // Mark seen immediately so a refresh mid-intro doesn't soft-lock forever
    this.g.save.seenTrain = true;
    this.g.saveGame?.();
    const lines = [
      'Night wind. Steel rails. A silver carriage called the Moonrail…',
      FRIENDS[0].line,
      FRIENDS[1].line,
      FRIENDS[2].line,
      'Conductor: "Crescentwick Academy — all first-years, prepare to alight."',
      'You gather your trunk. The castle lights bloom ahead.',
    ];
    this._play('The Moonrail', lines, () => {
      this.g.toast?.('Find the Crescent Mirror in the Great Hall to sort');
    });
  }
  _play(title, lines, done) {
    this.on = true; this.lines = lines; this.i = 0; this._done = done;
    this.g.player.frozen = true;
    let el = document.getElementById('cutscene');
    if (!el) {
      el = document.createElement('div'); el.id = 'cutscene';
      el.innerHTML = `<div class="cs-card">
        <h2></h2><p></p>
        <button type="button" id="csNext">Tap to continue</button>
        <button type="button" id="csSkip" class="skip">Skip intro ✦</button>
      </div>`;
      document.body.appendChild(el);
      const bind = (id, fn) => {
        const b = el.querySelector(id);
        const go = (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
        b.addEventListener('click', go);
        b.addEventListener('touchend', go, { passive: false });
      };
      bind('#csNext', () => this.advance());
      bind('#csSkip', () => this.forceEnd());
      // Tap card background also advances (but not twice on button)
      el.addEventListener('touchend', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        this.advance();
      }, { passive: false });
    }
    el.style.display = 'flex';
    el.style.pointerEvents = 'auto';
    el.querySelector('h2').textContent = title;
    el.querySelector('p').textContent = lines[0];
    this._el = el;
  }
  advance() {
    if (!this.on) return;
    this.i++;
    if (this.i >= this.lines.length) { this.forceEnd(); return; }
    this._el.querySelector('p').textContent = this.lines[this.i];
  }
  /** Close cutscene, clear freeze, run completion once. Safe to call repeatedly. */
  forceEnd() {
    const was = this.on;
    this.on = false;
    this.i = this.lines.length;
    if (this._el) {
      this._el.style.display = 'none';
      this._el.style.pointerEvents = 'none';
    }
    if (this.g.player) this.g.player.frozen = false;
    if (was) {
      const d = this._done; this._done = null;
      try { d?.(); } catch (_) {}
    }
  }
}
