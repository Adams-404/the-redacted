import { items, ropes, TYPE_LABEL, PIN_COLORS, BOARD_W, BOARD_H, $, clamp, sel } from "./state.js";
import { camera, rig, Z_HOME } from "./scene.js";
import { displayName } from "./items.js";

/* ---- TOAST ---- */
export function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---- TOP BAR extras ---- */
(function avatars() {
  const el = $("avatars");
  const people = [["RP", "#8a4a3a"], ["MC", "#3a5a7a"], ["JW", "#4a6a3a"], ["AL", "#6a4a7a"]];
  people.forEach(([ini, col]) => {
    const a = document.createElement("div");
    a.className = "av"; a.style.background = col; a.textContent = ini;
    el.appendChild(a);
  });
  const more = document.createElement("div");
  more.className = "av more"; more.textContent = "+2";
  el.appendChild(more);
})();

$("shareBtn").onclick = () => { try { navigator.clipboard.writeText(location.href); } catch (_) {} toast("Case link copied to clipboard"); };

function togglePop(pop, anchor, alignRight) {
  document.querySelectorAll(".pop.open").forEach((p) => { if (p !== pop) p.classList.remove("open"); });
  const open = pop.classList.toggle("open");
  if (open) {
    const r = anchor.getBoundingClientRect();
    if (anchor.closest("#bottombar")) {
      pop.style.bottom = innerHeight - r.top + 8 + "px";
      pop.style.top = "auto";
      pop.style.left = r.left + "px";
      pop.style.right = "auto";
    } else {
      pop.style.top = r.bottom + 8 + "px";
      pop.style.bottom = "auto";
      if (alignRight) { pop.style.right = innerWidth - r.right + "px"; pop.style.left = "auto"; }
      else { pop.style.left = r.left + "px"; pop.style.right = "auto"; }
    }
  }
}

$("bellBtn").onclick = (e) => { e.stopPropagation(); togglePop($("bellPop"), $("bellBtn"), true); };
$("kebabBtn").onclick = (e) => { e.stopPropagation(); togglePop($("kebabPop"), $("kebabBtn"), true); };
$("menuBtn").onclick = () => toast("The Redacted — only open case");
addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".pop") && !e.target.closest(".iconbtn") && !e.target.closest(".bpill"))
    document.querySelectorAll(".pop.open").forEach((p) => p.classList.remove("open"));
}, true);

function exportCase() {
  const data = {
    case: "BW-47-0924", name: "The Redacted", exported: new Date().toISOString(),
    items: items.map((it) => ({ id: it.id, ...specOf(it), notes: it.meta.notes })),
    connections: ropes.filter((r) => r.a.item && r.b.item && !r.dying).map((r) => ({ a: r.a.item.id, b: r.b.item.id, confidence: r.meta.confidence, color: "#" + r.color.toString(16).padStart(6, "0"), created: r.meta.created })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "redacted-BW-47-0924.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Case exported as JSON");
}
$("exportBtn").onclick = exportCase;
$("mExport").onclick = () => { $("kebabPop").classList.remove("open"); exportCase(); };
$("mCenter").onclick = () => { $("kebabPop").classList.remove("open"); rig.tx = 0; rig.ty = 1; rig.tz = Z_HOME; };

/* ---- BOTTOM BAR — filters, timeline, graph, minimap, zoom ---- */
const filterState = {};
Object.keys(TYPE_LABEL).forEach((t) => (filterState[t] = true));
function applyFilterTo(it) {
  it.grp.visible = filterState[it.type] !== false;
  it.ropes.forEach((r) => r.syncVisible());
}
function applyFilters() {
  items.forEach(applyFilterTo);
  ropes.forEach((r) => r.syncVisible());
  const off = Object.values(filterState).filter((v) => !v).length;
  const cnt = $("filterCnt");
  cnt.style.display = off ? "flex" : "none";
  cnt.textContent = off;
}
(function buildFilters() {
  const pop = $("filtersPop");
  Object.entries(TYPE_LABEL).forEach(([t, lab]) => {
    const row = document.createElement("label");
    row.className = "popRow";
    row.innerHTML = `<input type="checkbox" checked> ${lab} <small>${items.filter((i) => i.type === t).length}</small>`;
    row.querySelector("input").onchange = (e) => { filterState[t] = e.target.checked; applyFilters(); };
    pop.appendChild(row);
  });
})();
$("filtersBtn").onclick = (e) => {
  e.stopPropagation();
  [...$("filtersPop").querySelectorAll(".popRow")].forEach((row, i) => {
    const t = Object.keys(TYPE_LABEL)[i];
    row.querySelector("small").textContent = items.filter((x) => x.type === t).length;
  });
  togglePop($("filtersPop"), $("filtersBtn"));
};

$("timelineBtn").onclick = (e) => {
  e.stopPropagation();
  const pop = $("timelinePop");
  pop.innerHTML = '<div class="popTitle">Case timeline</div>';
  items.slice().sort((a, b) => a.meta.created - b.meta.created).forEach((it) => {
    const row = document.createElement("div"); row.className = "popRow";
    const d = new Date(it.meta.created);
    row.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${displayName(it)}</span><small>${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small>`;
    row.onclick = () => {
      rig.tx = clamp(it.grp.position.x, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
      rig.ty = clamp(it.grp.position.y, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
      rig.tz = 44; selectOnly(it); pop.classList.remove("open");
    };
    pop.appendChild(row);
  });
  togglePop(pop, $("timelineBtn"));
};

/* graph view */
$("graphBtn").onclick = () => { $("graphOverlay").classList.add("open"); drawGraph(); };
$("graphClose").onclick = () => $("graphOverlay").classList.remove("open");
$("graphOverlay").addEventListener("click", (e) => { if (e.target.id === "graphOverlay") $("graphOverlay").classList.remove("open"); });
function drawGraph() {
  const cv = $("graphCanvas"), r = cv.getBoundingClientRect();
  cv.width = r.width * devicePixelRatio;
  cv.height = r.height * devicePixelRatio;
  const x = cv.getContext("2d");
  x.scale(devicePixelRatio, devicePixelRatio);
  const W = r.width, H = r.height, pad = 60;
  const mx = (v) => pad + ((v + BOARD_W / 2) / BOARD_W) * (W - pad * 2);
  const my = (v) => H - pad - ((v + BOARD_H / 2) / BOARD_H) * (H - pad * 2);
  x.clearRect(0, 0, W, H);
  ropes.forEach((rp) => {
    if (!rp.a.item || !rp.b.item || rp.dying) return;
    const a = rp.a.item.grp.position, b = rp.b.item.grp.position;
    const conf = rp.meta.confidence;
    x.strokeStyle = `rgba(225,60,50,${0.25 + conf * 0.6})`;
    x.lineWidth = 1 + conf * 2.4;
    x.beginPath(); x.moveTo(mx(a.x), my(a.y)); x.lineTo(mx(b.x), my(b.y)); x.stroke();
  });
  items.forEach((it) => {
    if (!it.grp.visible) return;
    const cx = mx(it.grp.position.x), cy = my(it.grp.position.y);
    x.fillStyle = "#" + (PIN_COLORS[it.type] || 0xb01722).toString(16).padStart(6, "0");
    x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill();
    x.strokeStyle = "rgba(255,255,255,.25)"; x.lineWidth = 1; x.stroke();
    x.fillStyle = "#d9d4cc"; x.font = "11px -apple-system,sans-serif"; x.textAlign = "center";
    x.fillText(displayName(it).slice(0, 20), cx, cy + 18);
  });
}

/* minimap */
const mm = $("minimap"), mmx = mm.getContext("2d");
export function drawMinimap() {
  const W = mm.width, H = mm.height;
  mmx.fillStyle = "#080606";
  mmx.fillRect(0, 0, W, H);
  const pad = 6;
  const sx = (v) => pad + ((v + BOARD_W / 2) / BOARD_W) * (W - pad * 2);
  const sy = (v) => H - pad - ((v + BOARD_H / 2) / BOARD_H) * (H - pad * 2);
  mmx.strokeStyle = "#2a2522";
  mmx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
  ropes.forEach((rp) => {
    if (!rp.a.item || !rp.b.item || rp.dying || !rp.mesh.visible) return;
    mmx.strokeStyle = "rgba(225,60,50,.5)"; mmx.lineWidth = 1;
    const a = rp.a.item.grp.position, b = rp.b.item.grp.position;
    mmx.beginPath(); mmx.moveTo(sx(a.x), sy(a.y)); mmx.lineTo(sx(b.x), sy(b.y)); mmx.stroke();
  });
  items.forEach((it) => {
    if (!it.grp.visible) return;
    mmx.fillStyle = sel.has(it) ? "#fff" : "#c9a76a";
    mmx.fillRect(sx(it.grp.position.x) - 1.5, sy(it.grp.position.y) - 1.5, 3, 3);
  });
  const halfH = Math.tan((camera.fov * Math.PI) / 360) * rig.z;
  const halfW = halfH * camera.aspect;
  mmx.strokeStyle = "rgba(255,255,255,.6)"; mmx.lineWidth = 1;
  mmx.strokeRect(sx(rig.tx - halfW), sy(rig.ty + halfH), ((halfW * 2) / BOARD_W) * (W - pad * 2), ((halfH * 2) / BOARD_H) * (H - pad * 2));
}
function mmJump(e) {
  const r = mm.getBoundingClientRect();
  const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  rig.tx = clamp((u - 0.5) * BOARD_W, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
  rig.ty = clamp((0.5 - v) * BOARD_H, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
  rig.wake();
}
mm.addEventListener("pointerdown", (e) => {
  mmJump(e);
  const mv = (ev) => mmJump(ev), up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
  addEventListener("pointermove", mv);
  addEventListener("pointerup", up);
});

$("zoomIn").onclick = () => { rig.tz = clamp(rig.tz * 0.8, 16, 120); rig.wake(); };
$("zoomOut").onclick = () => { rig.tz = clamp(rig.tz * 1.25, 16, 120); rig.wake(); };
$("fsBtn").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); };
$("handBtn").onclick = () => toast("Drag any empty cork to pan — always on");
