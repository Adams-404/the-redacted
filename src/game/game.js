import { items, ropes, $ } from "./state.js";
import { rig, camera, renderer, scene, Z_HOME } from "./scene.js";
import { Create } from "./items.js";
import { GAME, PHASES } from "./game-engine.js";
import { connect, selectOnly, clearSel, History } from "./interact.js";

/* ---- SEED ---- */
const DAY = 864e5, T0 = Date.parse("2023-10-12T09:00:00");
function seedBoard() {
  const S = {};
  const mk = (fn, o, daysAgo) => fn({ ...o, created: T0 + (o._d || 0) * DAY, by: o.by || "Det. R. Parker" });
  S.motive = Create.sticky({ x: -52, y: 16, text: "Motive\nFinancial?", tint: "y", created: T0 + 2 * DAY, phase: 4 });
  S.car = Create.photo({ x: -38, y: 17, style: "car", text: "vehicle · Pine St, 01:22", created: T0, phase: 4 });
  S.prints = Create.print({ x: -22, y: 17, text: "F-12 · #6-211", created: T0 + 1 * DAY, phase: 2 });
  S.herald = Create.news({ x: -6, y: 15, text: "CEO found dead in downtown loft", created: T0, phase: 4 });
  S.alley = Create.photo({ x: 10, y: 16, style: "alley", text: "rear alley · bldg 220", created: T0, phase: 4 });
  S.lowell = Create.suspect({ x: 26, y: 14, title: "Marcus Lowell", text: "CFO, Lowell Tech · rival", role: "PERSON OF INTEREST", created: T0 + 1 * DAY, phase: 4 });
  S.map = Create.map({ x: -40, y: -2, text: "Downtown District", created: T0, phase: 4 });
  S.scene = Create.photo({ x: -8, y: -2, style: "loft", text: "CRIME SCENE — Loft 4B", created: T0, phase: 1 });
  S.stmt = Create.statement({ x: 10, y: -1, sig: "N. Carter", text: '"I heard a loud thud around 10pm. Thought it was furniture."', created: T0 + 1 * DAY, phase: 3 });
  S.lastseen = Create.sticky({ x: 24, y: -1, text: "Last seen\nOct 11\n9:47 PM", tint: "y", created: T0 + 2 * DAY, phase: 3 });
  S.bag = Create.bag({ x: -46, y: -19, title: "14-8397", date: "10/12/23", text: "Black fiber found on windowsill.", created: T0 + 1 * DAY, phase: 2 });
  S.fiber = Create.photo({ x: -31, y: -16, style: "fiber", text: "black fiber · 14-8397", created: T0 + 1 * DAY, phase: 2 });
  S.blackwood = Create.suspect({ x: -18, y: -19, title: "Richard Blackwood", text: "CEO, Blackwood Corp", role: "DECEASED", created: T0, phase: 1 });
  S.family = Create.sticky({ x: -7, y: -20, text: "Interview\nfamily", tint: "y", created: T0 + 3 * DAY, phase: 4 });
  S.plan = Create.plan({ x: 3, y: -15, created: T0 + 2 * DAY, phase: 1 });
  S.keys = Create.key({ x: 13, y: -9, title: "4B", created: T0, phase: 1 });
  S.lock = Create.sticky({ x: 12, y: -20, text: "Broken lock\nNo signs of\nforced entry", tint: "y", created: T0 + 2 * DAY, phase: 3 });
  S.mercer = Create.suspect({ x: 23, y: -16, title: "Dylan Mercer", text: "business partner", role: "ASSOCIATE", gender: "m", created: T0 + 3 * DAY, phase: 4 });
  S.carter = Create.suspect({ x: 36, y: -10, title: "Nadia Carter", text: "neighbor, loft 4C", role: "WITNESS", gender: "f", created: T0 + 1 * DAY, phase: 3 });
  S.finrev = Create.news({ x: 40, y: -20, text: "Lowell Tech stock plummets after CEO death", paper: "Financial Review", chart: true, created: T0 + 4 * DAY, phase: 4 });
  History.u.length = 0;
  History.ui();
  return S;
}

export const SEED = seedBoard();

/* ---- init phases ---- */
(function initPhases() {
  const S = SEED;
  Object.values(S).forEach((it) => { if (it && it.id) GAME.registerPhaseItem(it.phase, it.id); });
  GAME.registerPhaseUnlock(GAME.pairKey(S.scene.id, S.blackwood.id), 2);
  GAME.registerPhaseUnlock(GAME.pairKey(S.prints.id, S.bag.id), 3);
  GAME.registerPhaseUnlock(GAME.pairKey(S.stmt.id, S.carter.id), 4);
  items.forEach((it) => { if (it.phase > 1) it.grp.visible = false; });
  ropes.forEach((r) => r.syncVisible());
})();

/* ---- register case ---- */
(function registerCase() {
  const S = SEED;
  GAME.registerCorrect(S.scene.id, S.blackwood.id, { label: "Crime scene → Victim", unredacts: [S.blackwood.id] });
  GAME.registerCorrect(S.scene.id, S.keys.id, { label: "Crime scene → Keys", unredacts: [S.lock.id] });
  GAME.registerCorrect(S.prints.id, S.bag.id, { label: "Prints → Evidence bag", unredacts: [S.fiber.id] });
  GAME.registerCorrect(S.herald.id, S.lowell.id, { label: "News article → Suspect", unredacts: [S.lowell.id] });
  GAME.registerCorrect(S.stmt.id, S.carter.id, { label: "Statement → Witness", unredacts: [S.stmt.id] });
  GAME.registerCorrect(S.blackwood.id, S.finrev.id, { label: "Victim → Stock crash", unredacts: [S.finrev.id] });
  GAME.registerCorrect(S.plan.id, S.lock.id, { label: "Floor plan → Broken lock" });
  GAME.registerCorrect(S.scene.id, S.fiber.id, { label: "Crime scene → Fiber evidence" });
  GAME.registerCorrect(S.alley.id, S.plan.id, { label: "Alley → Floor plan", unredacts: [S.alley.id] });
  GAME.registerCorrect(S.scene.id, S.lowell.id, { label: "Crime scene → Person of interest" });
  GAME.registerCorrect(S.scene.id, S.map.id, { label: "Crime scene → Location" });
  GAME.registerCorrect(S.car.id, S.map.id, { label: "Vehicle → Location", unredacts: [S.car.id] });

  GAME.redactItem(S.blackwood, { title: "[REDACTED]", text: "[REDACTED] · [REDACTED]" });
  GAME.redactItem(S.lowell, { text: "CFO, [REDACTED] · [REDACTED]" });
  GAME.redactItem(S.finrev, { text: "[REDACTED] stock plummets after CEO death" });
  GAME.redactItem(S.fiber, { text: "[REDACTED] · 14-8397" });
  GAME.redactItem(S.lock, { text: "[REDACTED]\nNo signs of\nforced entry" });
  GAME.redactItem(S.stmt, { text: '"I heard a loud thud around [REDACTED]. Thought it was [REDACTED]."' });
  GAME.redactItem(S.carter, { text: "[REDACTED], loft 4C" });
  GAME.redactItem(S.herald, { text: "CEO [REDACTED] in downtown [REDACTED]" });
  GAME.redactItem(S.car, { text: "[REDACTED] · Pine St, [REDACTED]" });
  GAME.redactItem(S.alley, { text: "[REDACTED] · bldg 220" });
})();

/* ---- show briefing ---- */
function showBriefing() {
  const el = $("briefing");
  $("briefBody").innerHTML = `
<p><strong>Case:</strong> Dossier #BW-47-0924</p>
<p><strong>Victim:</strong> <span class="redacted">████████ █████████</span></p>
<p><strong>Location:</strong> Loft 4B, Bldg 220, Downtown District</p>
<p><strong>Date:</strong> October 12, 2023</p>
<p><strong>Status:</strong> <span class="redacted">███████</span> — details classified</p>
<hr style="border-color:var(--line);margin:16px 0">
<p>At approximately 08:47 hours, a <span class="redacted">██████ █████</span> was discovered in a downtown residential loft. Initial reports indicate <span class="redacted">████████ ███████</span> was last seen the previous evening.</p>
<p style="margin-top:12px">The investigation team has assembled preliminary evidence on the board. Your task: <strong>connect the evidence</strong> to uncover the truth. Use the thread tool (<b>C</b>) to link related items. Correct connections will reveal redacted information.</p>
<p style="margin-top:12px;color:var(--faint);font-size:12px">Warning: False connections may compromise the case.</p>`;
  el.style.display = "flex";
}

$("briefBegin").onclick = () => {
  $("briefing").style.display = "none";
  GAME.phase = "investigation";
  GAME.setPhase(1);
  setTimeout(() => {
    if (SEED && SEED.scene) { selectOnly(SEED.scene); rig.tz = 44; }
  }, 600);
};
$("victoryBtn").onclick = () => { $("victory").classList.remove("open"); };

/* ---- opening animations ---- */
rig.z = 150;
rig.tz = Z_HOME;
gsap.from("#topbar", { y: -60, opacity: 0, duration: 0.8, delay: 0.3, ease: "power3.out" });
gsap.from("#rail", { x: -90, opacity: 0, duration: 0.8, delay: 0.45, ease: "power3.out" });
gsap.from("#bottombar", { y: 80, opacity: 0, duration: 0.8, delay: 0.55, ease: "power3.out" });
setTimeout(() => showBriefing(), 1000);
GAME.updateProgress();
