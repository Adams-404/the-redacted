import { items, hitMeshes, ropes, canvasEl, BOARD_W, BOARD_H, PIN_COLORS, TYPE_LABEL, THREADS, THREAD_I, rnd, clamp, uid, $, sel, primary, setPrimary } from "./state.js";
import { raycaster, camera, screenToBoard, worldToScreen, rig, scene } from "./scene.js";
import { Rope, anchorOf, cursorAnchor, cursorToRopeSpace } from "./rope.js";
import { Create, buildItem, removeItemMesh, displayName } from "./items.js";
import { toast } from "./ui.js";
import { GAME, _phaseHint, setPhaseHint } from "./game-engine.js";

/* ---- HISTORY ---- */
export const History = {
  u: [], r: [],
  push(a) { this.u.push(a); this.r.length = 0; this.ui(); },
  undo() {
    const a = this.u.pop();
    if (a) { a.undo(); this.r.push(a); }
    this.ui(); Inspector.refresh();
  },
  redo() {
    const a = this.r.pop();
    if (a) { a.redo(); this.u.push(a); }
    this.ui(); Inspector.refresh();
  },
  ui() {
    $("undoBtn").style.opacity = this.u.length ? 1 : 0.35;
    $("redoBtn").style.opacity = this.r.length ? 1 : 0.35;
  },
};

export function connect(itA, itB, colorHex, record = true, confidence) {
  if (itA === itB) return null;
  const r = new Rope(anchorOf(itA), anchorOf(itB), colorHex != null ? colorHex : THREADS[THREAD_I].color, { confidence });
  ropes.push(r);
  if (record) {
    let cur = r;
    History.push({
      undo: () => { if (cur && ropes.includes(cur)) { cur.detach(); cur.kill(); } },
      redo: () => {
        cur = new Rope(anchorOf(itA), anchorOf(itB), r.color, { confidence: r.meta.confidence });
        ropes.push(cur);
      },
    });
  }
  Inspector.refresh();
  return r;
}

function deleteItem(it, record = true) {
  const attached = it.ropes.slice();
  attached.forEach((r) => { r.detach(); r.kill(); });
  gsap.to(it.grp.rotation, { z: it.grp.rotation.z + rnd(-0.6, 0.6), duration: 0.55, ease: "power2.in" });
  gsap.to(it.grp.position, { y: it.grp.position.y - 7, z: 3, duration: 0.55, ease: "power2.in" });
  gsap.to(it.grp.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 0.55, ease: "power2.in", onComplete: () => removeItemMesh(it) });
  if (record) {
    const spec = specOf(it);
    const links = attached.map((r) => ({ other: r.other(it), color: r.color, conf: r.meta.confidence }));
    let cur = null;
    History.push({
      undo: () => {
        cur = Create[spec.type](spec);
        links.forEach((l) => { if (items.includes(l.other)) connect(cur, l.other, l.color, false, l.conf); });
      },
      redo: () => { if (cur && items.includes(cur)) deleteItem(cur, false); },
    });
  }
}

function specOf(it) {
  return { type: it.type, title: it.title, text: it.text, x: it.grp.position.x, y: it.grp.position.y, rot: it.restRot, tags: it.meta.tags.slice() };
}

/* ---- SELECTION + INSPECTOR ---- */
function setGlow(it, on) {
  gsap.to(it.glow.material, { opacity: on ? 0.4 : 0, duration: 0.25 });
  it.ropes.forEach((r) => r.highlight(on));
}

export function clearSel() {
  sel.forEach((it) => setGlow(it, false));
  sel.clear(); setPrimary(null); Inspector.refresh();
}

export function selectOnly(it) {
  clearSel();
  if (it) { sel.add(it); setPrimary(it); setGlow(it, true); }
  Inspector.refresh();
}

export function selectMany(arr) {
  clearSel();
  arr.forEach((it) => { sel.add(it); setGlow(it, true); });
  setPrimary(arr[arr.length - 1] || null);
  Inspector.refresh();
}

export const Inspector = {
  el: $("inspector"), showAll: false,
  open() { this.el.classList.add("open"); },
  close() { this.el.classList.remove("open"); },
  refresh() {
    if (!sel.size) { this.close(); return; }
    this.open();
    if (sel.size > 1) {
      $("singleSel").style.display = "none";
      $("multiSel").style.display = "block";
      $("multiSel").innerHTML = `<b style="color:var(--txt)">${sel.size} items selected</b><br>Drag any one to move the group · Delete removes all`;
      return;
    }
    $("multiSel").style.display = "none";
    $("singleSel").style.display = "block";
    const it = primary || [...sel][0];
    if (!it) return;
    $("itemThumb").src = it.canvas.toDataURL("image/jpeg", 0.6);
    $("itemName").textContent = displayName(it);
    $("itemType").textContent = TYPE_LABEL[it.type] || it.type;
    const d = new Date(it.meta.created);
    $("itemMeta").innerHTML = `Added ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}<br>by ${it.meta.by}`;
    $("connCount").textContent = `Connections (${it.ropes.length})`;
    const list = $("connList"); list.innerHTML = "";
    const rows = this.showAll ? it.ropes : it.ropes.slice(0, 6);
    rows.forEach((r) => {
      const o = r.other(it);
      if (!o) return;
      const row = document.createElement("div"); row.className = "connRow";
      const conf = r.meta.confidence;
      const word = conf >= 0.66 ? "Strong" : conf >= 0.4 ? "Medium" : "Weak";
      row.innerHTML = `<img class="connDot" src="${o.canvas.toDataURL("image/jpeg", 0.4)}"><span class="connName">${displayName(o)}</span><span class="connBar"><i style="width:${(conf * 100) | 0}%"></i></span><span class="connStr">${word}</span>`;
      row.title = "Click to cycle evidence strength";
      row.onclick = () => { r.meta.confidence = conf >= 0.66 ? 0.5 : conf >= 0.4 ? 0.25 : 0.85; Inspector.refresh(); };
      list.appendChild(row);
    });
    const va = $("viewAll");
    if (it.ropes.length > 6) { va.style.display = "block"; va.textContent = this.showAll ? "Show less" : "View all"; va.onclick = () => { this.showAll = !this.showAll; this.refresh(); }; }
    else va.style.display = "none";
    const tags = $("tags"); tags.innerHTML = "";
    it.meta.tags.forEach((t) => {
      const s = document.createElement("span"); s.className = "tag"; s.textContent = t; tags.appendChild(s);
    });
    const add = document.createElement("span"); add.className = "tag add"; add.textContent = "+";
    add.onclick = () => { const t = prompt("New tag"); if (t) { it.meta.tags.push(t.trim()); this.refresh(); } };
    tags.appendChild(add);
    const avg = it.ropes.length ? it.ropes.reduce((s, r) => s + r.meta.confidence, 0) / it.ropes.length : 0;
    const blocks = $("strBlocks"); blocks.innerHTML = "";
    for (let i = 0; i < 7; i++) { const b = document.createElement("i"); if (i < Math.round(avg * 7)) b.className = "f"; blocks.appendChild(b); }
    $("strWord").textContent = avg >= 0.66 ? "Strong" : avg >= 0.4 ? "Medium" : avg > 0 ? "Weak" : "—";
    $("strPct").textContent = avg ? ((avg * 100) | 0) + "%" : "";
    const nl = $("notesList");
    if (!it.meta.notes.length) nl.textContent = "No notes yet";
    else { nl.innerHTML = ""; it.meta.notes.forEach((n) => { const r = document.createElement("div"); r.className = "noteRow"; r.innerHTML = `${n.text}<small>${n.by} · just now</small>`; nl.appendChild(r); }); }
  },
};

/* ---- TOOLS + INTERACTION ---- */
let TOOL = "select";
let hovered = null, dragging = null, panning = false, liveRope = null, lassoPath = null;
let px = 0, py = 0, downX = 0, downY = 0, moved = false;
const grabOff = new THREE.Vector3();
let dragStarts = null;
const hint = $("hint");
function setHint(h) { hint.innerHTML = h; }

const railTools = [...document.querySelectorAll(".rtool[data-tool]")];
function setTool(t) {
  if (liveRope) cancelLiveRope();
  TOOL = t;
  railTools.forEach((b) => b.classList.toggle("on", b.dataset.tool === t));
  canvasEl.classList.toggle("connecting", t === "connect");
  canvasEl.classList.toggle("lasso", t === "lasso");
  setHint(t === "connect" ? "<b>click a pin</b> to anchor a thread — it will follow your cursor" : t === "lasso" ? "drag to lasso items" : _phaseHint || "drag the board to pan · scroll to zoom · <b>C</b> to string a thread");
}
railTools.forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));

function pick(e) {
  raycaster.setFromCamera({ x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  for (const h of hits) {
    const it = h.object.userData.item;
    if (it && it.grp.visible) return it;
  }
  return null;
}

function cancelLiveRope() {
  if (!liveRope) return;
  liveRope.detach(); liveRope.kill();
  liveRope = null;
  setHint("<b>click a pin</b> to anchor a thread — it will follow your cursor");
}

canvasEl.addEventListener("pointerdown", (e) => {
  if (e.button === 2) return;
  rig.wake();
  moved = false;
  downX = px = e.clientX;
  downY = py = e.clientY;
  const it = pick(e);

  if (TOOL === "connect") {
    if (liveRope) {
      if (it && it !== liveRope.a.item) {
        const itA = liveRope.a.item;
        liveRope.tie(it);
        const r = liveRope;
        liveRope = null;
        if (GAME.phase === "investigation") {
          const correct = GAME.check(itA.id, it.id);
          if (correct) {
            toast("Connection validated — new intel revealed");
            gsap.fromTo(r.mat, { emissiveIntensity: 1.2 }, { emissiveIntensity: 0, duration: 1.5, ease: "power2.out" });
            r.highlight(true);
            setTimeout(() => r.highlight(false), 1200);
            if (GAME.complete()) setTimeout(() => GAME.showVictory(), 1000);
            GAME.checkPhaseUnlock(itA.id, it.id);
            let cur = r;
            History.push({
              undo: () => { if (cur && ropes.includes(cur)) { cur.detach(); cur.kill(); } },
              redo: () => { cur = new Rope(anchorOf(itA), anchorOf(it), r.color, { confidence: r.meta.confidence }); ropes.push(cur); },
            });
          } else {
            GAME.wrongGuess();
            [itA, it].forEach((item) => {
              if (item && item.grp) gsap.to(item.grp.position, { z: 3.5, duration: 0.1, yoyo: true, repeat: 5, ease: "power2.inOut" });
            });
            toast("Wrong connection — evidence doesn't match");
            setTimeout(() => { r.detach(); r.kill(); }, 500);
            Inspector.refresh();
            setHint("wrong lead — try connecting different evidence");
            return;
          }
        } else {
          let cur = r;
          History.push({
            undo: () => { if (cur && ropes.includes(cur)) { cur.detach(); cur.kill(); } },
            redo: () => { cur = new Rope(anchorOf(itA), anchorOf(it), r.color, { confidence: r.meta.confidence }); ropes.push(cur); },
          });
        }
        gsap.fromTo(it.pin.userData.head.scale, { x: 1.6, y: 1.6, z: 1.6 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: "elastic.out(1,.4)" });
        Inspector.refresh();
        setHint("thread tied · anchor another, or press <b>V</b> for select");
      } else if (!it) { cancelLiveRope(); }
      return;
    }
    if (it) {
      cursorAnchor.pos.copy(cursorToRopeSpace(e));
      liveRope = new Rope(anchorOf(it), cursorAnchor, THREADS[THREAD_I].color, { live: true });
      ropes.push(liveRope);
      gsap.fromTo(it.pin.userData.head.scale, { x: 1.6, y: 1.6, z: 1.6 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: "elastic.out(1,.4)" });
      setHint("carrying thread — <b>click another pin</b> to tie · click empty cork or Esc to drop it");
    }
    return;
  }

  if (TOOL === "lasso") {
    lassoPath = [{ x: e.clientX, y: e.clientY }];
    return;
  }

  if (it && TOOL === "select") {
    dragging = it;
    const group = sel.has(it) && sel.size > 1 ? [...sel] : [it];
    dragStarts = group.map((g) => ({ it: g, from: g.target.clone() }));
    const bp = screenToBoard(e.clientX, e.clientY);
    grabOff.subVectors(it.grp.position, bp);
    grabOff.z = 0;
    group.forEach((g) => { g.dragLift = 1.15; g.ropes.forEach((r) => r.hold(true)); });
    canvasEl.classList.add("dragging");
  } else {
    panning = true;
    canvasEl.classList.add("dragging");
    rig.vx = 0; rig.vy = 0;
  }
});

canvasEl.addEventListener("pointermove", (e) => {
  const dx = e.clientX - px, dy = e.clientY - py;
  px = e.clientX; py = e.clientY;
  if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 4) moved = true;

  if (liveRope) { cursorAnchor.pos.copy(cursorToRopeSpace(e)); }

  if (lassoPath) { lassoPath.push({ x: e.clientX, y: e.clientY }); drawLasso(); return; }

  if (dragging) {
    rig.wake();
    const bp = screenToBoard(e.clientX, e.clientY);
    const nx = clamp(bp.x + grabOff.x, -BOARD_W / 2 + 3, BOARD_W / 2 - 3);
    const ny = clamp(bp.y + grabOff.y, -BOARD_H / 2 + 3, BOARD_H / 2 - 3);
    const ddx = nx - dragging.target.x, ddy = ny - dragging.target.y;
    dragStarts.forEach(({ it: g }) => {
      g.target.x = clamp(g.target.x + ddx, -BOARD_W / 2 + 3, BOARD_W / 2 - 3);
      g.target.y = clamp(g.target.y + ddy, -BOARD_H / 2 + 3, BOARD_H / 2 - 3);
    });
    return;
  }
  if (panning) {
    rig.wake();
    const s = rig.z / 620;
    rig.tx = clamp(rig.tx - dx * s, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
    rig.ty = clamp(rig.ty + dy * s, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
    rig.vx = -dx * s * 0.9; rig.vy = dy * s * 0.9;
    return;
  }
  const it = pick(e);
  if (it !== hovered) {
    if (hovered) {
      hovered.hoverLift = 0;
      gsap.to(hovered.paper.scale, { x: 1, y: 1, duration: 0.3 });
      gsap.to(hovered.pin.userData.head.material, { emissiveIntensity: 0.04, duration: 0.3 });
    }
    hovered = it;
    if (it) {
      it.hoverLift = 0.55;
      gsap.to(it.paper.scale, { x: 1.025, y: 1.025, duration: 0.3, ease: "power2.out" });
      gsap.to(it.pin.userData.head.material, { emissiveIntensity: 0.4, duration: 0.3 });
    }
  }
  canvasEl.classList.toggle("item", !!it && TOOL === "select");
});

addEventListener("pointerup", (e) => {
  canvasEl.classList.remove("dragging");
  if (lassoPath) { finishLasso(); return; }
  if (dragging) {
    const starts = dragStarts;
    dragging = null; dragStarts = null;
    starts.forEach(({ it: g }) => { g.dragLift = 0; g.ropes.forEach((r) => r.hold(false)); });
    if (!moved) { selectOnly(starts[0].it); }
    else {
      const recs = starts.map(({ it: g, from }) => ({ it: g, from, to: g.target.clone() })).filter((r) => r.from.distanceTo(r.to) > 0.5);
      if (recs.length) History.push({ undo: () => recs.forEach((r) => { if (items.includes(r.it)) r.it.target.copy(r.from); }), redo: () => recs.forEach((r) => { if (items.includes(r.it)) r.it.target.copy(r.to); }) });
    }
    return;
  }
  if (panning) { panning = false; return; }
  if (!moved && TOOL === "select") clearSel();
});
canvasEl.addEventListener("contextmenu", (e) => { e.preventDefault(); cancelLiveRope(); });

canvasEl.addEventListener("dblclick", (e) => {
  const it = pick(e);
  if (it && it.redraw) openEditor(it);
});

canvasEl.addEventListener("wheel", (e) => {
  e.preventDefault(); rig.wake();
  const before = screenToBoard(e.clientX, e.clientY);
  rig.tz = clamp(rig.tz * (e.deltaY > 0 ? 1.09 : 0.92), 16, 120);
  const k = e.deltaY > 0 ? -0.06 : 0.08;
  rig.tx = clamp(rig.tx + (before.x - rig.tx) * k, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
  rig.ty = clamp(rig.ty + (before.y - rig.ty) * k, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
}, { passive: false });

addEventListener("keydown", (e) => {
  if ($("editor").classList.contains("open") || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "Escape") { cancelLiveRope(); if (TOOL !== "select") setTool("select"); else clearSel(); }
  if (e.key === "v" || e.key === "V") setTool("select");
  if (e.key === "l" || e.key === "L") setTool("lasso");
  if (e.key === "c" || e.key === "C") setTool(TOOL === "connect" ? "select" : "connect");
  if ((e.key === "Delete" || e.key === "Backspace") && sel.size) { [...sel].forEach((it) => deleteItem(it)); clearSel(); }
  if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); History.undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) { e.preventDefault(); History.redo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === "d") {
    e.preventDefault();
    if (primary) { const s = specOf(primary); s.x += 2.4; s.y -= 2; addAndRecord(Create[s.type], s); }
  }
});

/* ---- LASSO ---- */
const lassoCv = $("lassoCanvas"), lassoCtx = lassoCv.getContext("2d");
export function sizeLasso() { lassoCv.width = innerWidth; lassoCv.height = innerHeight; }
sizeLasso();
function drawLasso() {
  lassoCtx.clearRect(0, 0, lassoCv.width, lassoCv.height);
  if (!lassoPath || lassoPath.length < 2) return;
  lassoCtx.strokeStyle = "rgba(225,60,50,.9)";
  lassoCtx.fillStyle = "rgba(225,60,50,.08)";
  lassoCtx.lineWidth = 1.5; lassoCtx.setLineDash([6, 5]);
  lassoCtx.beginPath();
  lassoCtx.moveTo(lassoPath[0].x, lassoPath[0].y);
  for (const p of lassoPath) lassoCtx.lineTo(p.x, p.y);
  lassoCtx.closePath(); lassoCtx.stroke(); lassoCtx.fill();
}
function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function finishLasso() {
  const path = lassoPath;
  lassoPath = null;
  lassoCtx.clearRect(0, 0, lassoCv.width, lassoCv.height);
  if (!path || path.length < 6) return;
  const hits = items.filter((it) => it.grp.visible && pointInPoly(worldToScreen(it.grp.position), path));
  if (hits.length) { selectMany(hits); setTool("select"); setHint(`<b>${hits.length}</b> item${hits.length > 1 ? "s" : ""} selected — drag one to move the group`); }
}

/* ---- EDITOR ---- */
let editItem = null;
function openEditor(it) {
  editItem = it;
  $("edittitle").textContent = "Edit " + (TYPE_LABEL[it.type] || "text").toLowerCase();
  $("edittext").value = it.text;
  $("editor").classList.add("open");
  $("edittext").focus();
}
$("editCancel").onclick = () => $("editor").classList.remove("open");
$("editSave").onclick = () => {
  if (editItem) {
    const from = editItem.text, to = $("edittext").value, it = editItem;
    it.text = to; it.redraw(it);
    History.push({ undo: () => { it.text = from; it.redraw(it); }, redo: () => { it.text = to; it.redraw(it); } });
  }
  $("editor").classList.remove("open");
};

/* ---- ADD / TOOLBAR ---- */
function spawnAt() { return { x: rig.tx + rnd(-6, 6), y: rig.ty + rnd(-4, 4) }; }
function addAndRecord(fn, opts) {
  const it = fn({ ...spawnAt(), ...opts });
  let cur = it;
  const spec = { ...opts };
  History.push({ undo: () => { if (cur && items.includes(cur)) deleteItem(cur, false); }, redo: () => { cur = fn({ ...spawnAt(), ...spec }); } });
  selectOnly(it);
  return it;
}
const fileInput = $("fileinput");
document.querySelectorAll(".rtool[data-add]").forEach((b) => {
  b.onclick = () => {
    const t = b.dataset.add;
    if (t === "photo") { fileInput.click(); return; }
    const defaults = {
      doc: { title: "New report", text: "Double-click to edit this document." },
      statement: { text: "Double-click to write\nthe statement.", sig: "" },
      sticky: { text: "new lead?" },
      suspect: { title: "Unknown subject", text: "no details yet", role: "PERSON OF INTEREST" },
      map: { text: "New location" },
      news: { text: "Headline goes here" },
      print: { text: "F-?? · #?-???" },
    };
    addAndRecord(Create[t], defaults[t] || {});
  };
});
fileInput.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => { addAndRecord(Create.photo, { img, text: f.name.replace(/\.[^.]+$/, "") }); };
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
  fileInput.value = "";
};
$("undoBtn").onclick = () => History.undo();
$("redoBtn").onclick = () => History.redo();
History.ui();

$("insClose").onclick = () => clearSel();
$("noteInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim() && primary) {
    primary.meta.notes.push({ text: e.target.value.trim(), by: "You" });
    e.target.value = ""; Inspector.refresh();
  }
  e.stopPropagation();
});
