import { items } from "./state.js";
import { toast } from "./ui.js";

export const PHASES = [
  { id: 1, name: "The Scene", desc: "Examine the crime scene and identify the victim." },
  { id: 2, name: "Forensic Analysis", desc: "Process the evidence collected from the scene." },
  { id: 3, name: "Witness Accounts", desc: "Interview witnesses and establish the timeline." },
  { id: 4, name: "Persons of Interest", desc: "Investigate suspects and uncover their motives." },
];

export let _phaseHint = "";

export function setPhaseHint(hint) {
  _phaseHint = hint;
  const hintEl = document.getElementById("hint");
  if (hintEl) hintEl.innerHTML = hint;
}

export const GAME = {
  phase: "briefing",
  currentPhase: 1,
  correctPairs: [],
  foundPairs: new Set(),
  redacted: new Set(),
  unredactMap: {},
  displayLabels: {},
  wrongCount: 0,
  maxWrong: 3,
  wrongFlashItem: null,
  phaseItemIds: {},
  phaseUnlockKeys: [],
  phaseUnlocked: { 1: true },

  registerPhaseItem(phase, itemId) {
    if (!this.phaseItemIds[phase]) this.phaseItemIds[phase] = [];
    this.phaseItemIds[phase].push(itemId);
  },
  registerPhaseUnlock(connectionKey, phaseToUnlock) {
    this.phaseUnlockKeys.push([connectionKey, phaseToUnlock]);
  },
  checkPhaseUnlock(aId, bId) {
    const key = this.pairKey(aId, bId);
    for (const [unlockKey, phase] of this.phaseUnlockKeys) {
      if (unlockKey === key && !this.phaseUnlocked[phase]) {
        this.phaseUnlocked[phase] = true;
        this.setPhase(phase);
        return true;
      }
    }
    return false;
  },
  setPhase(phase) {
    this.currentPhase = phase;
    GAME.phase = "investigation";
    const ids = this.phaseItemIds[phase] || [];
    ids.forEach((id) => {
      const it = items.find((i) => i.id === id);
      if (it && !it.grp.visible) {
        it.grp.visible = true;
        gsap.fromTo(it.grp.scale, { x: 0.3, y: 0.3, z: 0.3 }, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.7)", delay: Math.random() * 0.3 });
        it.ropes.forEach((r) => r.syncVisible());
      }
    });
    if (phase <= PHASES.length) {
      const p = PHASES[phase - 1];
      const hint = `<b>Phase ${phase}: ${p.name}</b> — ${p.desc} · <b>C</b> to connect evidence`;
      setPhaseHint(hint);
    }
    if (phase > 1) {
      toast(`Phase ${phase} unlocked — ${PHASES[phase - 1].name}`);
    }
  },
  pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  },
  registerCorrect(aId, bId, opts = {}) {
    const key = this.pairKey(aId, bId);
    this.correctPairs.push(key);
    if (opts.label) this.displayLabels[key] = opts.label;
    if (opts.unredacts) this.unredactMap[key] = opts.unredacts;
  },
  redactItem(it, fields) {
    if (!it) return;
    this.redacted.add(it.id);
    it._origText = it.text;
    it._origTitle = it.title;
    if (fields.text != null) it.text = fields.text;
    if (fields.title != null) it.title = fields.title;
    if (it.redraw) it.redraw(it);
  },
  unredactItem(it) {
    if (!it || !this.redacted.has(it.id)) return;
    this.redacted.delete(it.id);
    if (it._origText != null) it.text = it._origText;
    if (it._origTitle != null) it.title = it._origTitle;
    if (it.redraw) it.redraw(it);
  },
  unredactByConnection(aId, bId) {
    const key = this.pairKey(aId, bId);
    const ids = this.unredactMap[key] || [];
    ids.forEach((id) => {
      const it = items.find((i) => i.id === id);
      this.unredactItem(it);
    });
  },
  check(aId, bId) {
    const key = this.pairKey(aId, bId);
    if (this.correctPairs.includes(key) && !this.foundPairs.has(key)) {
      this.foundPairs.add(key);
      this.unredactByConnection(aId, bId);
      this.updateProgress();
      return true;
    }
    return false;
  },
  complete() {
    return this.foundPairs.size >= this.correctPairs.length;
  },
  updateProgress() {
    const el = document.getElementById("caseProgress");
    if (el) {
      el.textContent = `Connections: ${this.foundPairs.size} / ${this.correctPairs.length} found`;
      if (this.foundPairs.size > 0) el.classList.add("show");
    }
  },
  showVictory() {
    const el = document.getElementById("victory");
    if (!el) return;
    el.classList.add("open");
    const pct = Math.round((this.foundPairs.size / Math.max(this.correctPairs.length, 1)) * 100);
    document.getElementById("victorySub").textContent = `Dossier #BW-47-0924 — ${pct}% solved`;
    document.getElementById("victoryBody").innerHTML = `<p>You correctly identified <strong>${this.foundPairs.size}</strong> out of <strong>${this.correctPairs.length}</strong> connections in the Blackwood case.</p><p style="margin-top:12px;color:var(--dim)">Richard Blackwood was found dead in his loft on October 12, 2023. The evidence points to a complex web of financial motives, personal connections, and a broken lock that suggests someone had a key all along.</p>`;
    document.getElementById("victoryStats").innerHTML = `<div class="vstat"><strong>${pct}%</strong><span>Accuracy</span></div><div class="vstat"><strong>${this.foundPairs.size}</strong><span>Connections</span></div><div class="vstat"><strong>${this.wrongCount}</strong><span>Mistakes</span></div>`;
  },
  wrongGuess() {
    this.wrongCount++;
    toast(`Wrong connection · ${this.maxWrong - this.wrongCount} strikes remaining`);
    if (this.wrongCount >= this.maxWrong) {
      toast("Case compromised — too many false leads");
    }
  },
};
