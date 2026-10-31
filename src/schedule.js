/** School timetable, attendance, detention, year/grades. */
export const PERIODS = [
  { id: 'm1', name: 'Morning Charms', start: 8, end: 9, room: 'charms', teacher: 'Tutor Brindle' },
  { id: 'm2', name: 'Transfiguration Basics', start: 9.5, end: 10.5, room: 'classrooms', teacher: 'Tutor Brindle' },
  { id: 'l1', name: 'History of Aether', start: 11, end: 12, room: 'library', teacher: 'Archivist Moss' },
  { id: 'a1', name: 'Defence Forms', start: 14, end: 15, room: 'courtyard', teacher: 'Prefect Cal' },
  { id: 'a2', name: 'Herb Lore', start: 15.5, end: 16.5, room: 'forest', teacher: 'Keeper Rowan' },
];

const ROOM_SPOT = {
  charms: 'charms', classrooms: 'classrooms', library: 'library',
  courtyard: 'fountain', forest: 'forest', hall: 'greatHall',
};

export class Schedule {
  constructor(game) {
    this.g = game;
    this.hour = 7.5; // in-game hours, advances in real time
    this.day = 1;
    this._acc = 0;
  }
  ensure() {
    const S = this.g.save;
    if (!S.school) S.school = { year: 1, grade: 'New', attended: {}, skipped: {}, detentions: 0, detentionTask: null, scheduleKnown: false };
    if (!S.year) S.year = S.school.year || 1;
  }
  /** 1 in-game hour ≈ 45 real seconds */
  update(dt) {
    this.ensure();
    this._acc += dt;
    if (this._acc >= 45) { this._acc = 0; this.hour += 1; if (this.hour >= 22) { this.hour = 7; this.day++; this._rollAttendance(); } }
  }
  _rollAttendance() {
    // end of day: any unattended period today -> detention
    const S = this.g.save.school;
    for (const p of PERIODS) {
      const key = `${this.day - 1}:${p.id}`;
      if (!S.attended[key] && !S.skipped[key]) {
        // missed silently if never near room — count as skip if schedule known
        if (S.scheduleKnown) this._giveDetention(p);
      }
    }
  }
  currentPeriod() {
    return PERIODS.find(p => this.hour >= p.start && this.hour < p.end) || null;
  }
  learnSchedule() {
    this.ensure();
    this.g.save.school.scheduleKnown = true;
    this.g.toast?.('You copied today\'s timetable');
    this.g.saveGame?.();
  }
  tryAttend() {
    this.ensure();
    const p = this.currentPeriod(); if (!p) return false;
    const spot = this.g.castle.spots[ROOM_SPOT[p.room] || p.room];
    if (!spot) return false;
    const d = Math.hypot(this.g.player.pos.x - spot.x, this.g.player.pos.z - spot.z);
    if (d > 8) return false;
    const key = `${this.day}:${p.id}`;
    const S = this.g.save.school;
    if (S.attended[key]) { this.g.toast?.('Already attended ' + p.name); return true; }
    S.attended[key] = true;
    this.g.save.xp = (this.g.save.xp || 0) + 15;
    this.g.toast?.(`Attended ${p.name} with ${p.teacher}`);
    // unlock a spell from lessons
    const unlocks = ['aegis', 'wandrift', 'stunflare', 'frostneedle', 'cinderlash'];
    const sp = unlocks[Math.min(unlocks.length - 1, (Object.keys(S.attended).length - 1) % unlocks.length)];
    this.g.spells.unlock(sp);
    this.g.save.spells = [...this.g.spells.unlocked];
    this._updateGrade();
    this.g.saveGame?.();
    return true;
  }
  skipCurrent() {
    this.ensure();
    const p = this.currentPeriod(); if (!p) return;
    const key = `${this.day}:${p.id}`;
    this.g.save.school.skipped[key] = true;
    this._giveDetention(p);
  }
  _giveDetention(p) {
    const S = this.g.save.school;
    S.detentions = (S.detentions || 0) + 1;
    S.detentionTask = {
      id: 'polish_lanterns',
      desc: 'Polish 5 courtyard lanterns (USE near lantern posts)',
      need: 5, progress: 0,
      why: p ? `Skipped ${p.name}` : 'Missed class',
    };
    this.g.toast?.(`Detention! ${S.detentionTask.desc}`);
    this._updateGrade();
    this.g.saveGame?.();
  }
  detentionProgress() {
    const T = this.g.save.school?.detentionTask; if (!T) return;
    T.progress++;
    if (T.progress >= T.need) {
      this.g.toast?.('Detention complete. Lesson learned.');
      this.g.save.school.detentionTask = null;
      this.g.save.xp = (this.g.save.xp || 0) + 10;
    } else this.g.toast?.(`Detention ${T.progress}/${T.need}`);
    this.g.saveGame?.();
  }
  _updateGrade() {
    const S = this.g.save.school;
    const a = Object.keys(S.attended).length, sk = Object.keys(S.skipped).length;
    const ratio = a / Math.max(1, a + sk);
    S.grade = ratio > 0.9 ? 'Honours' : ratio > 0.7 ? 'Solid' : ratio > 0.4 ? 'Passing' : 'At Risk';
  }
  clockText() {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour % 1) * 60);
    const am = h < 12;
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'} · Day ${this.day} · Y${this.g.save.year || 1}`;
  }
}
