import { scene, screenToBoard } from "./scene.js";
import { items, ropes, rnd, clamp } from "./state.js";
import { TEX } from "./texgen.js";

const fiberTex = TEX.fiber();
const GRAV = -30, DAMP = 0.986, ITER = 5;
export const SUBSTEPS = 3;
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3();

function anchorOf(it) {
  return {
    item: it,
    get: (v) => it.pin.userData.head.getWorldPosition(v),
  };
}

const cursorAnchor = {
  item: null,
  pos: new THREE.Vector3(),
  get(v) { return v.copy(this.pos); },
};

export function cursorToRopeSpace(e) {
  const p = screenToBoard(e.clientX, e.clientY, 1.75);
  p.z = 1.75;
  return p;
}

export { anchorOf, cursorAnchor };

export class Rope {
  constructor(aAnch, bAnch, color, opts = {}) {
    this.a = aAnch;
    this.b = bAnch;
    this.color = color;
    this.live = !!opts.live;
    this.N = 46;
    this.pts = [];
    this.prev = [];
    this.slackF = opts.slack || rnd(1.1, 1.2);
    this.a.get(_pa);
    this.b.get(_pb);
    this.baseLen = this.live
      ? Math.max(_pa.distanceTo(_pb) * 1.05, 2)
      : Math.max(_pa.distanceTo(_pb) * this.slackF, 4);
    for (let i = 0; i < this.N; i++) {
      const p = _pa.clone().lerp(_pb, i / (this.N - 1));
      p.z += 0.15;
      this.pts.push(p);
      this.prev.push(p.clone());
    }
    this.phase = rnd(0, 6.28);
    this.dying = false;
    this.freeB = false;
    this.opacity = 1;
    this.thick = rnd(0.05, 0.062);
    this.drop = this.live ? 0.3 : 0.5;
    this.zPull = this.live ? 0.08 : 0.03;
    this.zMin = this.live ? 1.3 : 0.35;
    this.grow = this.live ? 1 : 0;
    this.mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0,
      bumpMap: fiberTex,
      bumpScale: 0.028,
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.castShadow = true;
    if (this.live) this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    if (this.a.item) this.a.item.ropes.push(this);
    if (this.b.item) this.b.item.ropes.push(this);
    this.meta = {
      label: null,
      confidence: opts.confidence != null ? opts.confidence : 0.78,
      created: Date.now(),
    };
    if (!this.live)
      gsap.to(this, { grow: 1, duration: 0.85, ease: "power2.inOut" });
    this.syncVisible();
  }
  other(it) {
    return this.a.item === it ? this.b.item : this.a.item;
  }
  tie(bItem) {
    this.b = anchorOf(bItem);
    bItem.ropes.push(this);
    this.live = false;
    this.a.get(_pa);
    this.b.get(_pb);
    const d = _pa.distanceTo(_pb);
    this.baseLen = clamp(this.baseLen, d * 1.06, d * 1.32);
    this.mesh.renderOrder = 0;
    gsap.to(this, {
      drop: 0.5, zPull: 0.03, zMin: 0.35,
      duration: 0.9, ease: "power2.inOut",
    });
    this.syncVisible();
  }
  step(dt, t) {
    const N = this.N, pts = this.pts, prev = this.prev, dt2 = dt * dt;
    this.a.get(_pa);
    this.b.get(_pb);
    if (this.grow < 1) _pb.lerpVectors(_pa, _pb, this.grow);
    const za = _pa.z, zb = _pb.z, drop = this.drop, zMin = this.zMin, zPull = this.zPull;
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = prev[i];
      const vx = (p.x - q.x) * DAMP, vy = (p.y - q.y) * DAMP, vz = (p.z - q.z) * DAMP;
      q.copy(p);
      p.x += vx + Math.sin(t * 1.4 + this.phase + i * 0.4) * 0.0007;
      p.y += vy + GRAV * dt2;
      const chord = za + (zb - za) * (i / (N - 1));
      p.z += vz + (chord - p.z) * zPull;
      const floor = Math.max(zMin, chord - drop);
      if (p.z < floor) p.z = floor;
      if (p.z > 5.5) p.z = 5.5;
    }
    if (this.live) {
      const d = _pa.distanceTo(_pb);
      this.baseLen = Math.max(this.baseLen, d * 1.06);
    }
    if (!this.dying) { pts[0].copy(_pa); prev[0].copy(_pa); }
    if (!(this.dying && this.freeB)) { pts[N - 1].copy(_pb); prev[N - 1].copy(_pb); }
    const dist = _pa.distanceTo(_pb);
    const rest = Math.max(this.baseLen, dist * 1.02) / (N - 1);
    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < N - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        let dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
        const diff = ((d - rest) / d) * 0.5;
        dx *= diff; dy *= diff; dz *= diff;
        const w1 = i === 0 && !this.dying ? 0 : 1;
        const w2 = i === N - 2 && !(this.dying && this.freeB) ? 0 : 1;
        const tw = w1 + w2 || 1;
        p1.x += (dx * 2 * w1) / tw;
        p1.y += (dy * 2 * w1) / tw;
        p1.z += (dz * 2 * w1) / tw;
        p2.x -= (dx * 2 * w2) / tw;
        p2.y -= (dy * 2 * w2) / tw;
        p2.z -= (dz * 2 * w2) / tw;
      }
    }
  }
  render() {
    const smp = [];
    for (let i = 0; i < this.N; i += 2) smp.push(this.pts[i]);
    if ((this.N - 1) % 2) smp.push(this.pts[this.N - 1]);
    const curve = new THREE.CatmullRomCurve3(smp);
    const old = this.mesh.geometry;
    this.mesh.geometry = new THREE.TubeGeometry(curve, 40, this.thick, 5, false);
    old.dispose();
    this.mat.opacity = this.opacity;
  }
  highlight(on) {
    gsap.to(this.mat, { emissiveIntensity: on ? 0.55 : 0, duration: 0.3, overwrite: "auto" });
  }
  hold(on) {
    if (this.live || this.dying) return;
    gsap.to(this, {
      drop: on ? 0.22 : 0.5, zPull: on ? 0.09 : 0.03,
      duration: on ? 0.2 : 0.9, ease: on ? "power2.out" : "power2.inOut",
      overwrite: "auto",
    });
  }
  syncVisible() {
    const av = !this.a.item || this.a.item.grp.visible;
    const bv = !this.b.item || this.b.item.grp.visible;
    this.mesh.visible = av && bv;
  }
  detach() {
    [this.a.item, this.b.item].forEach((it) => {
      if (!it) return;
      const i = it.ropes.indexOf(this);
      if (i >= 0) it.ropes.splice(i, 1);
    });
  }
  kill() {
    this.dying = true;
    this.freeB = true;
    this.mesh.renderOrder = 0;
    gsap.to(this, { drop: 1.6, zMin: 0.35, zPull: 0.02, duration: 0.45, ease: "power2.in" });
    gsap.to(this, {
      opacity: 0, duration: 0.9, delay: 0.25, ease: "power2.in",
      onComplete: () => {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mat.dispose();
        const i = ropes.indexOf(this);
        if (i >= 0) ropes.splice(i, 1);
      },
    });
  }
}
