import { items, hitMeshes, PIN_COLORS, TYPE_LABEL, TYPE_TAGS, PAPER_Z, PIN_Z, $, uid, rnd, clamp } from "./state.js";
import { scene } from "./scene.js";
import { TEX } from "./texgen.js";

/* ---- helpers ---- */
export function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(/\s+/);
  let line = "", yy = y;
  for (const w of words) {
    if (w === "[REDACTED]") {
      if (line) { ctx.fillText(line, x, yy); line = ""; }
      ctx.save();
      ctx.fillStyle = "#1a1a1a";
      const bw = Math.min(maxW * 0.55, ctx.measureText("████████").width);
      ctx.fillRect(x, yy - lh + 5, bw, lh - 6);
      ctx.restore();
      yy += lh;
      continue;
    }
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lh;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

/* ---- 3D item construction ---- */
function bentPaperGeo(w, h, curl) {
  const g = new THREE.PlaneGeometry(w, h, 12, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / w + 0.5, v = p.getY(i) / h + 0.5;
    let z = Math.sin(u * Math.PI) * curl * 0.4;
    z += Math.pow(Math.max(0, u - 0.75) * 4, 2) * Math.max(0, v - 0.7) * curl * 2.2;
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

function makePin(colorHex) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16),
    new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.35, roughness: 0.22, emissive: colorHex, emissiveIntensity: 0.04 }));
  head.position.z = PIN_Z; head.castShadow = true;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, PIN_Z, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.95, roughness: 0.18 }));
  needle.rotation.x = Math.PI / 2; needle.position.z = PIN_Z / 2; needle.castShadow = true;
  g.add(head, needle);
  g.userData.head = head;
  return g;
}

export function buildItem(type, cv, w, h, opts) {
  const grp = new THREE.Group();
  const tex = TEX.toTex(cv);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
  const paper = new THREE.Mesh(bentPaperGeo(w, h, opts.curl != null ? opts.curl : 0.25), mat);
  paper.castShadow = true; paper.receiveShadow = true;
  grp.add(paper);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.4, h + 1.4),
    new THREE.MeshBasicMaterial({ color: 0xe13c32, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.z = -0.09; grp.add(glow);

  const pin = makePin(PIN_COLORS[type] || 0xb01722);
  pin.position.set(0, h / 2 - 0.7, 0.12); grp.add(pin);
  grp.position.set(opts.x || 0, opts.y || 0, PAPER_Z);
  grp.rotation.z = opts.rot != null ? opts.rot : rnd(-0.05, 0.05);

  const it = {
    id: uid(), type, grp, paper, glow, pin, w, h, canvas: cv,
    text: opts.text || "", title: opts.title || "", ropes: [],
    baseZ: PAPER_Z + rnd(0, 0.06), hoverLift: 0, dragLift: 0,
    target: new THREE.Vector3().copy(grp.position), vel: new THREE.Vector2(),
    restRot: grp.rotation.z, redraw: opts.redraw || null, phase: opts.phase || 1,
    meta: { created: opts.created || Date.now(), by: opts.by || "Det. R. Parker", tags: (opts.tags || TYPE_TAGS[type] || []).slice(), notes: [] },
  };
  grp.userData.item = it;
  paper.userData.item = it;
  pin.userData.head.userData.item = it;
  scene.add(grp);
  items.push(it);
  hitMeshes.push(paper, pin.userData.head);

  grp.scale.setScalar(0.6);
  gsap.to(grp.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.7)" });
  it.dragLift = 5;
  grp.position.z = PAPER_Z + 5;
  gsap.to(it, { dragLift: 0, duration: 0.7, ease: "power3.out" });

  return it;
}

export function swapMap(it, cv) {
  const m = it.paper.material;
  if (m.map) m.map.dispose();
  it.canvas = cv;
  m.map = TEX.toTex(cv);
  m.needsUpdate = true;
}

export function displayName(it) {
  return it.title || String(it.text).split("\n")[0].slice(0, 42) || TYPE_LABEL[it.type];
}

export function removeItemMesh(it) {
  scene.remove(it.grp);
  const i = items.indexOf(it);
  if (i >= 0) items.splice(i, 1);
  [it.paper, it.pin.userData.head].forEach((m) => {
    const j = hitMeshes.indexOf(m);
    if (j >= 0) hitMeshes.splice(j, 1);
  });
}

/* ---- canvas painters ---- */
export function photoCanvas(img, caption, style) {
  const c = TEX.canvas(512, 600), x = c.getContext("2d");
  x.fillStyle = "#f2eee2"; x.fillRect(0, 0, 512, 600);
  x.save(); x.beginPath(); x.rect(28, 28, 456, 456); x.clip();
  if (img) {
    const s = Math.max(456 / img.width, 456 / img.height);
    x.drawImage(img, 256 - (img.width * s) / 2, 256 + 28 - (img.height * s) / 2, img.width * s, img.height * s);
  } else if (style === "car") {
    const sky = x.createLinearGradient(0, 28, 0, 484);
    sky.addColorStop(0, "#131720"); sky.addColorStop(1, "#05070b");
    x.fillStyle = sky; x.fillRect(28, 28, 456, 456);
    x.fillStyle = "rgba(230,200,140,.12)"; x.beginPath(); x.arc(360, 120, 90, 0, 7); x.fill();
    x.fillStyle = "#0b0e13"; x.fillRect(28, 340, 456, 144);
    x.fillStyle = "#11151c"; x.beginPath();
    x.moveTo(90, 340); x.quadraticCurveTo(120, 268, 210, 262); x.quadraticCurveTo(320, 256, 370, 290); x.quadraticCurveTo(430, 300, 436, 340);
    x.closePath(); x.fill();
    x.fillStyle = "rgba(200,215,235,.16)"; x.fillRect(160, 272, 140, 34);
    x.fillStyle = "rgba(255,220,150,.8)"; x.beginPath(); x.arc(428, 322, 8, 0, 7); x.fill();
    ["#05070b", "#05070b"].forEach((cc, i) => { x.fillStyle = cc; x.beginPath(); x.arc(150 + i * 200, 344, 26, 0, 7); x.fill(); });
    x.strokeStyle = "rgba(255,255,255,.07)"; x.lineWidth = 1.5;
    for (let i = 0; i < 120; i++) { x.beginPath(); x.moveTo(rnd(28, 484), rnd(28, 484)); x.lineTo(rnd(28, 484) - 4, rnd(28, 340) + 14); x.stroke(); }
    x.fillStyle = "rgba(255,200,120,.1)"; x.fillRect(28, 352, 456, 10);
  } else if (style === "alley") {
    x.fillStyle = "#07090d"; x.fillRect(28, 28, 456, 456);
    const lg = x.createLinearGradient(0, 28, 0, 484);
    lg.addColorStop(0, "rgba(190,205,230,.32)"); lg.addColorStop(1, "rgba(190,205,230,0)");
    x.fillStyle = lg; x.beginPath(); x.moveTo(226, 28); x.lineTo(286, 28); x.lineTo(340, 484); x.lineTo(172, 484); x.closePath(); x.fill();
    x.fillStyle = "#0d1117"; x.beginPath(); x.moveTo(28, 28); x.lineTo(226, 28); x.lineTo(206, 484); x.lineTo(28, 484); x.closePath(); x.fill();
    x.fillStyle = "#0a0d12"; x.beginPath(); x.moveTo(286, 28); x.lineTo(484, 28); x.lineTo(484, 484); x.lineTo(306, 484); x.closePath(); x.fill();
    x.fillStyle = "rgba(220,230,250,.08)";
    for (let i = 0; i < 14; i++) x.fillRect(rnd(40, 190), rnd(60, 420), rnd(14, 30), rnd(18, 36));
    for (let i = 0; i < 14; i++) x.fillRect(rnd(320, 460), rnd(60, 420), rnd(14, 30), rnd(18, 36));
    x.fillStyle = "rgba(190,205,230,.5)"; x.fillRect(236, 80, 40, 60);
  } else if (style === "loft") {
    x.fillStyle = "#0c0f14"; x.fillRect(28, 28, 456, 456);
    x.fillStyle = "#b9c6da"; x.fillRect(180, 60, 150, 220);
    x.strokeStyle = "#0c0f14"; x.lineWidth = 8; x.strokeRect(180, 60, 150, 220);
    x.beginPath(); x.moveTo(255, 60); x.lineTo(255, 280); x.moveTo(180, 170); x.lineTo(330, 170); x.stroke();
    const beam = x.createLinearGradient(200, 280, 290, 470);
    beam.addColorStop(0, "rgba(200,215,235,.25)"); beam.addColorStop(1, "rgba(200,215,235,0)");
    x.fillStyle = beam; x.beginPath(); x.moveTo(185, 280); x.lineTo(330, 280); x.lineTo(420, 484); x.lineTo(110, 484); x.closePath(); x.fill();
    x.fillStyle = "#141920"; x.fillRect(60, 330, 150, 80); x.fillRect(60, 310, 150, 26);
    x.fillStyle = "#10141a"; x.fillRect(250, 370, 130, 50);
    x.fillStyle = "#0a0d11"; x.fillRect(70, 414, 440, 70);
  } else if (style === "fiber") {
    x.fillStyle = "#e8e4d6"; x.fillRect(28, 28, 456, 456);
    x.strokeStyle = "#8a8574"; x.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(48 + i * 44, 440); x.lineTo(48 + i * 44, 456); x.stroke(); x.font = "12px monospace"; x.fillStyle = "#8a8574"; x.fillText(i + "", 44 + i * 44, 436); }
    x.fillStyle = "#14110e";
    for (let i = 0; i < 220; i++) { x.save(); x.translate(256 + rnd(-46, 46), 230 + rnd(-40, 40)); x.rotate(rnd(0, 6.3)); x.fillRect(0, 0, rnd(4, 26), rnd(1, 2.4)); x.restore(); }
    x.fillStyle = "rgba(176,23,34,.85)"; x.fillRect(330, 60, 120, 42);
    x.fillStyle = "#fff"; x.font = "bold 20px monospace"; x.textAlign = "center"; x.fillText("14-8397", 390, 88); x.textAlign = "left";
  } else {
    const sky = x.createLinearGradient(0, 28, 0, 300);
    sky.addColorStop(0, "#3a4657"); sky.addColorStop(1, "#141a24");
    x.fillStyle = sky; x.fillRect(28, 28, 456, 272);
    x.fillStyle = "#0c0f14"; x.fillRect(28, 300, 456, 184);
  }
  x.fillStyle = "rgba(255,255,255,.1)"; x.fillRect(28, 28, 456, 110);
  for (let i = 0; i < 1200; i++) { x.fillStyle = `rgba(0,0,0,${rnd(0.02, 0.08)})`; x.fillRect(rnd(28, 484), rnd(28, 484), 1.4, 1.4); }
  x.restore();
  x.strokeStyle = "rgba(0,0,0,.15)"; x.strokeRect(28, 28, 456, 456);
  x.fillStyle = "#3a352c"; x.font = '26px "Courier New",monospace'; x.textAlign = "center";
  wrapText(x, caption || "", 256, 540, 440, 30);
  TEX.grain(x, 512, 600, 900); TEX.pinholes(x, 512);
  return c;
}

export function suspectCanvas(name, note, role, gender) {
  const c = TEX.canvas(460, 600), x = c.getContext("2d");
  x.fillStyle = "#e6e0cf"; x.fillRect(0, 0, 460, 600);
  x.save(); x.beginPath(); x.rect(26, 26, 408, 400); x.clip();
  x.fillStyle = "#cfd6cf"; x.fillRect(26, 26, 408, 400);
  x.strokeStyle = "rgba(60,70,60,.5)"; x.lineWidth = 1.5;
  for (let y = 46; y < 426; y += 38) { x.beginPath(); x.moveTo(26, y); x.lineTo(434, y); x.stroke(); x.fillStyle = "rgba(60,70,60,.6)"; x.font = '13px "Courier New",monospace'; x.textAlign = "left"; x.fillText(190 - ((y - 46) / 38) * 10 + "", 34, y - 4); }
  x.fillStyle = "#20242a"; const hw = gender === "f" ? 58 : 66;
  x.beginPath(); x.ellipse(230, 200, hw, hw * 1.28, 0, 0, 7); x.fill();
  if (gender === "f") { x.beginPath(); x.ellipse(230, 240, hw * 1.25, hw * 1.1, 0, 0, 7); x.fill(); }
  x.beginPath(); x.moveTo(120, 426); x.quadraticCurveTo(130, 296, 230, 288); x.quadraticCurveTo(330, 296, 340, 426); x.closePath(); x.fill();
  x.fillStyle = "rgba(255,255,255,.05)"; x.beginPath(); x.ellipse(206, 178, 18, 30, -0.4, 0, 7); x.fill();
  x.restore();
  x.strokeStyle = "#3a352c"; x.lineWidth = 3; x.strokeRect(26, 26, 408, 400);
  x.textAlign = "center";
  if (name.includes("[REDACTED]")) {
    x.fillStyle = "#1a1a1a"; x.fillRect(230 - 80, 478 - 28, 160, 32);
    x.fillStyle = "#3a352c"; x.font = '16px "Courier New",monospace'; x.fillText("CLASSIFIED", 230, 478);
  } else {
    x.fillStyle = "#1d1a14"; x.font = 'bold 33px "Courier New",monospace'; x.fillText(name.toUpperCase(), 230, 478, 410);
  }
  x.fillStyle = "#5a5244"; x.font = '19px "Courier New",monospace';
  wrapText(x, note || "", 230, 514, 400, 24);
  if (role) {
    const cols = { "PERSON OF INTEREST": "#a8231e", DECEASED: "#7a1815", WITNESS: "#4a4438", ASSOCIATE: "#4a4438" };
    x.fillStyle = cols[role] || "#a8231e"; x.fillRect(90, 556, 280, 34);
    x.fillStyle = "#f0ead8"; x.font = 'bold 18px "Courier New",monospace'; x.fillText(role, 230, 579);
  }
  TEX.grain(x, 460, 600, 800); TEX.pinholes(x, 460);
  return c;
}

export function stickyCanvas(text, tint) {
  const c = TEX.canvas(420, 420), x = c.getContext("2d");
  const cols = { y: ["#f4d94a", "#e8c62e"], p: ["#f2a2c0", "#e389ad"], g: ["#b7e07e", "#a3cf67"], b: ["#8fd0e8", "#79bfd9"] };
  const [c1, c2] = cols[tint] || cols.y;
  const g = x.createLinearGradient(0, 0, 420, 420);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.fillRect(0, 0, 420, 420);
  x.fillStyle = "rgba(255,255,255,.28)"; x.fillRect(0, 0, 420, 54);
  for (let i = 0; i < 10; i++) { x.strokeStyle = `rgba(120,90,10,${rnd(0.03, 0.09)})`; x.lineWidth = rnd(1, 3); x.beginPath(); x.moveTo(rnd(0, 420), rnd(0, 420)); x.quadraticCurveTo(rnd(0, 420), rnd(0, 420), rnd(0, 420), rnd(0, 420)); x.stroke(); }
  x.fillStyle = "#26221a"; x.font = 'italic 600 34px "Segoe Script","Bradley Hand",cursive'; x.textAlign = "center";
  const lines = String(text).split("\n");
  let yy = 210 - (lines.length - 1) * 24;
  for (const ln of lines) yy = wrapText(x, ln, 210, yy, 360, 44) + 44;
  TEX.grain(x, 420, 420, 400);
  return c;
}

export function docCanvas(title, body) {
  const c = TEX.canvas(460, 620), x = c.getContext("2d");
  x.fillStyle = "#efe9d8"; x.fillRect(0, 0, 460, 620);
  x.fillStyle = "#20242a"; x.fillRect(0, 0, 460, 86);
  x.fillStyle = "#e8dfc8"; x.font = 'bold 26px "Courier New",monospace'; x.textAlign = "left";
  x.fillText("POLICE DEPT — CASE FILE", 24, 40);
  x.font = '17px "Courier New",monospace'; x.fillText("REF BW-47-0924 · HOMICIDE DIV.", 24, 68);
  x.fillStyle = "#1d1a14"; x.font = 'bold 26px "Courier New",monospace';
  x.fillText(title.toUpperCase(), 30, 132, 400);
  x.strokeStyle = "rgba(30,26,18,.5)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(30, 148); x.lineTo(430, 148); x.stroke();
  x.fillStyle = "#3c362b"; x.font = '20px "Courier New",monospace';
  let yy = wrapText(x, body, 30, 186, 398, 28) + 40;
  for (let i = 0; i < 4 && yy < 540; i++) { x.fillStyle = "#14120e"; x.fillRect(30, yy, rnd(160, 380), 20); yy += 34; }
  x.save(); x.translate(340, 560); x.rotate(-0.18);
  x.strokeStyle = "rgba(170,32,26,.75)"; x.lineWidth = 5; x.strokeRect(-105, -28, 210, 56);
  x.fillStyle = "rgba(170,32,26,.75)"; x.font = 'bold 28px "Courier New",monospace'; x.textAlign = "center"; x.fillText("CONFIDENTIAL", 0, 10);
  x.restore();
  TEX.grain(x, 460, 620, 900); TEX.pinholes(x, 460);
  return c;
}

export function newsCanvas(headline, paperName, chart) {
  const c = TEX.canvas(540, 640), x = c.getContext("2d");
  x.fillStyle = "#e9e2cd"; x.fillRect(0, 0, 540, 640);
  x.fillStyle = "#191510"; x.font = "bold 40px Georgia,serif"; x.textAlign = "center";
  x.fillText(paperName || "THE DAILY HERALD", 270, 52);
  x.font = '15px "Courier New",monospace'; x.fillText("VOL. XCIV · OCT 12, 2023 · 25¢", 270, 80);
  x.strokeStyle = "#191510"; x.lineWidth = 3; x.beginPath(); x.moveTo(24, 94); x.lineTo(516, 94); x.stroke();
  x.font = "bold 42px Georgia,serif";
  const endY = wrapText(x, headline.toUpperCase(), 270, 148, 490, 48);
  const top = endY + 34;
  if (chart) {
    x.strokeStyle = "#191510"; x.lineWidth = 2; x.strokeRect(40, top, 220, 150);
    x.strokeStyle = "#7a1815"; x.lineWidth = 4; x.beginPath();
    let px = 48, py = top + 26; x.moveTo(px, py);
    for (let i = 1; i < 9; i++) { px = 48 + i * 25; py = top + 26 + i * 13 + rnd(-14, 10); x.lineTo(px, clamp(py, top + 10, top + 140)); }
    x.stroke();
    x.fillStyle = "#191510"; x.font = '12px "Courier New",monospace'; x.fillText("LWT −34%", 150, top + 142);
  } else {
    x.fillStyle = "#c9c1ab"; x.fillRect(40, top, 220, 150);
    for (let yy = top + 4; yy < top + 146; yy += 6) for (let xx = 44; xx < 256; xx += 6) { x.fillStyle = `rgba(25,21,16,${rnd(0.05, 0.5)})`; x.beginPath(); x.arc(xx, yy, rnd(0.6, 2.2), 0, 7); x.fill(); }
    x.strokeStyle = "#191510"; x.lineWidth = 2; x.strokeRect(40, top, 220, 150);
  }
  x.strokeStyle = "rgba(25,21,16,.55)"; x.lineWidth = 2.4;
  const col = (cx, cy, cw, n) => { for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(cx, cy + i * 13); x.lineTo(cx + cw * rnd(0.72, 1), cy + i * 13); x.stroke(); } };
  col(284, top + 6, 214, Math.max(4, (150 / 13) | 0));
  const rows = Math.max(3, ((610 - (top + 178)) / 13) | 0);
  col(40, top + 178, 214, rows); col(284, top + 178, 214, rows);
  TEX.grain(x, 540, 640, 700); TEX.pinholes(x, 540);
  return c;
}

export function printCanvas(label) {
  const c = TEX.canvas(400, 500), x = c.getContext("2d");
  x.fillStyle = "#f4f0e4"; x.fillRect(0, 0, 400, 500);
  x.strokeStyle = "#20242a"; x.lineWidth = 3; x.strokeRect(18, 18, 364, 464);
  x.beginPath(); x.moveTo(200, 18); x.lineTo(200, 430); x.stroke();
  x.fillStyle = "#20242a"; x.font = 'bold 20px "Courier New",monospace'; x.textAlign = "center";
  const two = String(label).split("·");
  [[110, two[0] || "F-12"], [290, two[1] || "#6-211"]].forEach(([cx, lab]) => {
    x.fillStyle = "#20242a"; x.fillText(lab.trim(), cx, 52);
    x.save(); x.translate(cx, 250);
    for (let r = 6; r < 78; r += 6) {
      x.strokeStyle = `rgba(25,25,40,${rnd(0.55, 0.9)})`; x.lineWidth = rnd(2, 3);
      let a = Math.random() * 6.28;
      for (let s = 0, gaps = (2 + Math.random() * 3) | 0; s < gaps; s++) { const len = rnd(1.2, 2.6); x.beginPath(); x.ellipse(rnd(-3, 3), rnd(-3, 3) + r * 0.12, r, r * 0.8, rnd(-0.2, 0.2), a, a + len); x.stroke(); a += len + rnd(0.3, 0.9); }
    }
    x.restore();
  });
  x.fillStyle = "#5a5244"; x.font = '16px "Courier New",monospace'; x.fillText("LIFTED: LOFT 4B · WINDOWSILL", 200, 458);
  TEX.grain(x, 400, 500, 600); TEX.pinholes(x, 400);
  return c;
}

export function mapCanvas(place) {
  const c = TEX.canvas(520, 520), x = c.getContext("2d");
  x.fillStyle = "#dfd6ba"; x.fillRect(0, 0, 520, 520);
  x.fillStyle = "#c9bd9c"; x.beginPath(); x.moveTo(0, 380); x.quadraticCurveTo(200, 330, 520, 400); x.lineTo(520, 520); x.lineTo(0, 520); x.closePath(); x.fill();
  x.strokeStyle = "rgba(90,80,55,.8)";
  for (let i = 0; i < 9; i++) { x.lineWidth = rnd(3, 9); x.beginPath(); x.moveTo(rnd(0, 520), 40); x.lineTo(rnd(0, 520), 380); x.stroke(); }
  for (let i = 0; i < 7; i++) { x.lineWidth = rnd(3, 9); x.beginPath(); x.moveTo(0, rnd(40, 360)); x.lineTo(520, rnd(40, 360)); x.stroke(); }
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(150,135,95,${rnd(0.25, 0.5)})`; x.fillRect(rnd(10, 460), rnd(50, 320), rnd(18, 50), rnd(14, 40)); }
  x.strokeStyle = "#8a231e"; x.lineWidth = 6; x.beginPath(); x.ellipse(230, 200, 44, 34, 0.2, 0, 7); x.stroke();
  x.fillStyle = "#1d1a14"; x.font = 'bold 24px "Courier New",monospace'; x.textAlign = "left"; x.fillText(place.toUpperCase(), 22, 32);
  TEX.grain(x, 520, 520, 700); TEX.pinholes(x, 520);
  return c;
}

export function statementCanvas(text, sig) {
  const c = TEX.canvas(440, 540), x = c.getContext("2d");
  x.fillStyle = "#f4f0e2"; x.fillRect(0, 0, 440, 540);
  for (let i = 0; i < 12; i++) { x.strokeStyle = "#8f887a"; x.lineWidth = 3; x.beginPath(); x.arc(38 + i * 33, 22, 9, 0, 7); x.stroke(); x.fillStyle = "#0c0a09"; x.beginPath(); x.arc(38 + i * 33, 22, 4, 0, 7); x.fill(); }
  x.strokeStyle = "rgba(120,110,90,.35)"; x.lineWidth = 1.5;
  for (let y = 110; y < 510; y += 38) { x.beginPath(); x.moveTo(26, y); x.lineTo(414, y); x.stroke(); }
  x.fillStyle = "#1d1a14"; x.font = 'bold 24px "Courier New",monospace'; x.textAlign = "center"; x.fillText("WITNESS STATEMENT", 220, 76);
  x.fillStyle = "#232d52"; x.font = 'italic 27px "Segoe Script","Bradley Hand",cursive';
  let yy = 142;
  for (const ln of String(text).split("\n")) yy = wrapText(x, ln, 220, yy, 370, 38) + 38;
  if (sig) { x.textAlign = "right"; x.font = 'italic 25px "Segoe Script",cursive'; x.fillText("— " + sig, 404, Math.min(yy + 30, 506)); }
  TEX.grain(x, 440, 540, 500); TEX.pinholes(x, 440);
  return c;
}

export function bagCanvas(no, date, notes) {
  const c = TEX.canvas(430, 560), x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, "#d8c9a4"); g.addColorStop(1, "#c7b58c");
  x.fillStyle = g; x.fillRect(0, 0, 430, 560);
  x.strokeStyle = "rgba(90,70,40,.5)"; x.lineWidth = 2; x.strokeRect(8, 8, 414, 544);
  x.fillStyle = "#2a241c"; x.fillRect(8, 8, 414, 52);
  x.fillStyle = "#e8dcc0"; x.font = 'bold 27px "Courier New",monospace'; x.textAlign = "center"; x.fillText("EVIDENCE", 215, 44);
  x.fillStyle = "#2a241c"; x.font = '17px "Courier New",monospace'; x.textAlign = "left";
  const rows = [["BAG NO.", no], ["DATE", date], ["COLLECTED BY", "Det. R. Parker"], ["NOTES", ""]];
  let yy = 104;
  for (const [k, v] of rows) {
    x.font = 'bold 15px "Courier New",monospace'; x.fillStyle = "#5a4d38"; x.fillText(k, 30, yy);
    x.strokeStyle = "rgba(90,70,40,.6)"; x.beginPath(); x.moveTo(30, yy + 34); x.lineTo(400, yy + 34); x.stroke();
    x.font = 'italic 24px "Segoe Script",cursive'; x.fillStyle = "#232d52"; x.fillText(v, 140, yy + 26);
    yy += 72;
  }
  x.font = 'italic 23px "Segoe Script",cursive'; x.fillStyle = "#232d52";
  wrapText(x, notes, 30, yy - 24, 370, 34);
  x.font = 'bold 15px "Courier New",monospace'; x.fillStyle = "#5a4d38"; x.fillText("CHAIN OF CUSTODY", 30, 486);
  x.strokeStyle = "rgba(90,70,40,.6)"; x.beginPath(); x.moveTo(30, 516); x.lineTo(400, 516); x.stroke();
  x.font = 'italic 21px "Segoe Script",cursive'; x.fillStyle = "#232d52"; x.fillText("R.P. → forensics lab", 40, 510);
  TEX.grain(x, 430, 560, 600); TEX.pinholes(x, 430);
  return c;
}

export function keyCanvas(label) {
  const c = TEX.canvas(360, 480), x = c.getContext("2d");
  x.clearRect(0, 0, 360, 480); x.fillStyle = "rgba(0,0,0,0)"; x.fillRect(0, 0, 360, 480);
  x.fillStyle = "#e3cf9e"; x.beginPath(); x.moveTo(120, 20); x.lineTo(240, 20); x.lineTo(280, 86); x.lineTo(280, 220); x.lineTo(80, 220); x.lineTo(80, 86); x.closePath(); x.fill();
  x.strokeStyle = "rgba(120,95,50,.7)"; x.lineWidth = 3; x.stroke();
  x.fillStyle = "#f4f0e2"; x.beginPath(); x.arc(180, 58, 13, 0, 7); x.fill();
  x.strokeStyle = "#8f7c4c"; x.lineWidth = 3; x.stroke();
  x.fillStyle = "#1d1a14"; x.font = 'bold 44px "Courier New",monospace'; x.textAlign = "center"; x.fillText(label, 180, 150);
  x.font = 'bold 26px "Courier New",monospace'; x.fillText("KEY", 180, 192);
  x.strokeStyle = "#9a8046"; x.lineWidth = 7; x.beginPath(); x.arc(180, 262, 34, 0, 7); x.stroke();
  const key = (kx, ky, rot, len) => {
    x.save(); x.translate(kx, ky); x.rotate(rot);
    x.strokeStyle = "#8c8478"; x.lineWidth = 9; x.beginPath(); x.arc(0, 0, 17, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(0, 17); x.lineTo(0, 17 + len); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(0, 17 + len); x.lineTo(14, 17 + len); x.moveTo(0, len + 2); x.lineTo(11, len + 2); x.stroke();
    x.restore();
  };
  key(150, 318, 0.35, 110); key(208, 320, -0.2, 96);
  return c;
}

export function planCanvas() {
  const c = TEX.canvas(480, 560), x = c.getContext("2d");
  x.fillStyle = "#f0ebdc"; x.fillRect(0, 0, 480, 560);
  x.strokeStyle = "#20242a"; x.lineWidth = 5; x.strokeRect(50, 60, 380, 420);
  x.lineWidth = 4;
  x.beginPath(); x.moveTo(50, 240); x.lineTo(250, 240); x.moveTo(250, 60); x.lineTo(250, 320); x.moveTo(250, 320); x.lineTo(430, 320); x.moveTo(160, 240); x.lineTo(160, 480); x.stroke();
  x.lineWidth = 2;
  const door = (dx, dy, r, a0, a1) => { x.beginPath(); x.arc(dx, dy, r, a0, a1); x.stroke(); };
  door(210, 240, 42, Math.PI, Math.PI * 1.5); door(250, 290, 36, Math.PI * 0.5, Math.PI); door(160, 430, 40, -0.5 * Math.PI, 0);
  x.font = '15px "Courier New",monospace'; x.fillStyle = "#3c362b"; x.textAlign = "center";
  x.fillText("BEDROOM", 150, 150); x.fillText("LIVING", 340, 180); x.fillText("KITCHEN", 100, 370); x.fillText("ENTRY", 340, 420);
  x.strokeStyle = "#8a231e"; x.lineWidth = 5; x.beginPath(); x.arc(430, 400, 26, 0, 7); x.stroke();
  x.font = 'bold 15px "Courier New",monospace'; x.fillStyle = "#8a231e"; x.fillText("LOCK", 430, 446);
  x.fillStyle = "#1d1a14"; x.font = 'bold 22px "Courier New",monospace'; x.fillText("LOFT 4B — FLOOR PLAN", 240, 36);
  x.font = '13px "Courier New",monospace'; x.fillStyle = "#6a6152"; x.fillText("SCALE 1:50 · BLDG 220 DOWNTOWN", 240, 522);
  TEX.grain(x, 480, 560, 700); TEX.pinholes(x, 480);
  return c;
}

/* ---- Create factory ---- */
export const Create = {
  photo: (o = {}) => {
    const cap = o.text || "evidence photo";
    const it = buildItem("photo", photoCanvas(o.img, cap, o.style), 9, 10.5, {
      ...o, text: cap, curl: 0.3,
      redraw: (it) => swapMap(it, photoCanvas(o.img, it.text, o.style)),
    });
    return it;
  },
  suspect: (o = {}) => {
    const it = buildItem("suspect", suspectCanvas(o.title || "UNKNOWN", o.text || "", o.role, o.gender), 8.4, 11, {
      ...o, curl: 0.2,
      redraw: (it) => swapMap(it, suspectCanvas(it.title, it.text, o.role, o.gender)),
    });
    return it;
  },
  sticky: (o = {}) => {
    const tint = o.tint || ["y", "p", "g", "b"][(Math.random() * 4) | 0];
    const it = buildItem("sticky", stickyCanvas(o.text || "new lead?", tint), 6.4, 6.4, {
      ...o, curl: 0.55,
      redraw: (it) => swapMap(it, stickyCanvas(it.text, tint)),
    });
    return it;
  },
  doc: (o = {}) => {
    const it = buildItem("doc", docCanvas(o.title || "Incident report", o.text || ""), 8.6, 11.6, {
      ...o, curl: 0.22,
      redraw: (it) => swapMap(it, docCanvas(it.title, it.text)),
    });
    return it;
  },
  news: (o = {}) => {
    const it = buildItem("news", newsCanvas(o.text || "Headline", o.paper, o.chart), 10, 11.8, {
      ...o, curl: 0.34,
      redraw: (it) => swapMap(it, newsCanvas(it.text, o.paper, o.chart)),
    });
    return it;
  },
  print: (o = {}) => buildItem("print", printCanvas(o.text || "F-12 · #6-211"), 8.4, 10.4, { ...o, curl: 0.18 }),
  map: (o = {}) => {
    const it = buildItem("map", mapCanvas(o.text || "Downtown District"), 9.6, 9.6, {
      ...o, curl: 0.24,
      redraw: (it) => swapMap(it, mapCanvas(it.text)),
    });
    return it;
  },
  statement: (o = {}) => {
    const it = buildItem("statement", statementCanvas(o.text || "", o.sig), 8.2, 10, {
      ...o, curl: 0.26,
      redraw: (it) => swapMap(it, statementCanvas(it.text, o.sig)),
    });
    return it;
  },
  bag: (o = {}) => buildItem("bag", bagCanvas(o.title || "14-8397", o.date || "10/12/23", o.text || ""), 7.8, 10.2, { ...o, curl: 0.14 }),
  key: (o = {}) => buildItem("key", keyCanvas(o.title || "4B"), 5.4, 7.2, { ...o, curl: 0.05 }),
  plan: (o = {}) => buildItem("plan", planCanvas(), 8.8, 10.2, { ...o, curl: 0.2, title: o.title || "Loft 4B floor plan" }),
};
