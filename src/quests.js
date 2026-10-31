import { QUESTS } from './data.js';

export class Quests {
  constructor(game) {
    this.g = game;
  }

  ensure() {
    const S = this.g.save;
    if (!S.quests) {
      S.quests = {};
      for (const q of QUESTS) S.quests[q.id] = { step: 0, done: false };
    }
  }

  active() {
    this.ensure();
    return QUESTS.filter(q => {
      const st = this.g.save.quests[q.id];
      return st && !st.done;
    });
  }

  completeStep(qid, step) {
    this.ensure();
    const q = QUESTS.find(x => x.id === qid);
    const st = this.g.save.quests[qid];
    if (!q || !st || st.done) return;
    if (st.step === step) {
      st.step++;
      if (st.step >= q.steps.length) {
        st.done = true;
        this.g.save.xp = (this.g.save.xp || 0) + (q.type === 'secret' ? 80 : q.type === 'main' ? 50 : 30);
        this.g.toast?.(`Quest complete: ${q.name}`);
      } else {
        this.g.toast?.(`Quest: ${q.steps[st.step]}`);
      }
      this.g.saveGame?.();
      this.g.ui?.updateQuest();
    }
  }

  onSpellCast(id) {
    if (id === 'sparkbolt') {
      const S = this.g.save;
      S._sparkCount = (S._sparkCount || 0) + 1;
      if (S._sparkCount >= 5) this.completeStep('first_lesson', 1);
    }
    if (id === 'aegis') this.completeStep('aegis_trial', 0);
  }

  onBlock() {
    const S = this.g.save;
    S._blocks = (S._blocks || 0) + 1;
    if (S._blocks >= 3) this.completeStep('aegis_trial', 1);
  }

  onDuelWin(id) {
    if (id === 'rook') this.completeStep('duel_club', 0);
    if (id === 'mira') this.completeStep('duel_club', 1);
    if (id === 'vale') this.completeStep('duel_club', 2);
    this.completeStep('aegis_trial', 2);
  }

  onAetherScore() {
    this.completeStep('aetherchase', 1);
  }

  onSorted() {
    this.completeStep('sort', 0);
    this.completeStep('sort', 1);
  }

  talk(npcId) {
    if (npcId === 'brindle') {
      this.completeStep('first_lesson', 0);
      this.g.spells.unlock('sparkbolt');
      this.g.spells.unlock('aegis');
      if (this.g.save.quests.first_lesson?.step >= 2) this.completeStep('first_lesson', 2);
      this.g.toast?.('Tutor Brindle: "Focus the tip — Sparkbolt, then Aegis Veil."');
    }
    if (npcId === 'rowan') {
      this.completeStep('forest_edge', 0);
      this.g.toast?.('Keeper Rowan: "Clear the mist wisps at the Edgewood."');
    }
    if (npcId === 'pitch') {
      this.completeStep('broom_basics', 0);
      this.g.broom.mount();
      this.completeStep('broom_basics', 1);
    }
  }
}
