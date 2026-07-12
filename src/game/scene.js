import { BOARD_W, BOARD_H, canvasEl, rnd, clamp } from "./state.js";
import { TEX } from "./texgen.js";

/* ---- renderer ---- */
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputEncoding = THREE.sRGBEncoding;

/* ---- scene ---- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0a09);
scene.fog = new THREE.Fog(0x0c0a09, 120, 300);

/* ---- board ---- */
(function buildBoard() {
  const corkMat = new THREE.MeshStandardMaterial({
    map: TEX.cork(), bumpMap: TEX.corkBump(), bumpScale: 0.06, roughness: 0.95, metalness: 0,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(BOARD_W, BOARD_H, 1.4), corkMat);
  board.position.z = -0.7; board.receiveShadow = true; scene.add(board);

  const woodMat = new THREE.MeshStandardMaterial({ map: TEX.wood(), roughness: 0.62, metalness: 0.08 });
  const T = 3.4, D = 3.0;
  const mk = (w, h, px, py) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), woodMat);
    m.position.set(px, py, -0.4); m.castShadow = m.receiveShadow = true; scene.add(m);
    const bev = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, h * 0.35, D * 0.2),
      new THREE.MeshStandardMaterial({ color: 0x6a4c2a, roughness: 0.5 }));
    bev.position.set(px, py, D * 0.42); scene.add(bev);
  };
  mk(BOARD_W + T * 2, T, 0, BOARD_H / 2 + T / 2);
  mk(BOARD_W + T * 2, T, 0, -BOARD_H / 2 - T / 2);
  mk(T, BOARD_H, -BOARD_W / 2 - T / 2, 0);
  mk(T, BOARD_H, BOARD_W / 2 + T / 2, 0);

  const brass = new THREE.MeshStandardMaterial({ color: 0xa8823c, metalness: 0.85, roughness: 0.35 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 6), brass);
    p.rotation.x = Math.PI / 2;
    p.position.set(sx * (BOARD_W / 2 + T / 2), sy * (BOARD_H / 2 + T / 2), D * 0.55);
    p.castShadow = true; scene.add(p);
  });

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(700, 400),
    new THREE.MeshStandardMaterial({ color: 0x18201c, roughness: 1 }));
  wall.position.z = -4; wall.receiveShadow = true; scene.add(wall);
})();

/* ---- lighting ---- */
scene.add(new THREE.AmbientLight(0x322a20, 0.85));
const lamp = new THREE.SpotLight(0xffd6a0, 1.55, 460, 1.05, 0.55, 1.2);
lamp.position.set(-38, 58, 80);
lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048);
lamp.shadow.bias = -0.00035; lamp.shadow.camera.near = 20; lamp.shadow.camera.far = 280;
scene.add(lamp); scene.add(lamp.target);

const fillL = new THREE.DirectionalLight(0x9fb4cc, 0.28);
fillL.position.set(40, -10, 60); scene.add(fillL);

const rimL = new THREE.PointLight(0xffb066, 0.5, 140);
rimL.position.set(42, 32, 26); scene.add(rimL);

/* ---- dust ---- */
const dust = (() => {
  const N = 220, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), spd = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rnd(-BOARD_W / 2, BOARD_W / 2);
    pos[i * 3 + 1] = rnd(-BOARD_H / 2, BOARD_H / 2);
    pos[i * 3 + 2] = rnd(2, 26);
    spd.push({ x: rnd(-0.12, 0.12), y: rnd(-0.06, 0.14), w: rnd(0.5, 2) });
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffd9a6, size: 0.16, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(g, m));
  return {
    step(dt, t) {
      const a = g.attributes.position;
      for (let i = 0; i < N; i++) {
        a.array[i * 3] += spd[i].x * dt + Math.sin(t * spd[i].w + i) * 0.004;
        a.array[i * 3 + 1] += spd[i].y * dt;
        if (a.array[i * 3 + 1] > BOARD_H / 2) a.array[i * 3 + 1] = -BOARD_H / 2;
        if (a.array[i * 3] > BOARD_W / 2) a.array[i * 3] = -BOARD_W / 2;
        if (a.array[i * 3] < -BOARD_W / 2) a.array[i * 3] = BOARD_W / 2;
      }
      a.needsUpdate = true;
    },
  };
})();

/* ---- camera rig ---- */
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 700);
const Z_HOME = 80;
const rig = {
  tx: 0, ty: 1, x: 0, y: 1, tz: Z_HOME, z: Z_HOME,
  vx: 0, vy: 0, idle: 0,
  apply(t) {
    this.x += (this.tx - this.x) * 0.12;
    this.y += (this.ty - this.y) * 0.12;
    this.z += (this.tz - this.z) * 0.1;
    if (this.vx || this.vy) {
      this.tx = clamp(this.tx + this.vx, -BOARD_W / 2 + 8, BOARD_W / 2 - 8);
      this.ty = clamp(this.ty + this.vy, -BOARD_H / 2 + 6, BOARD_H / 2 - 6);
      this.vx *= 0.92; this.vy *= 0.92;
      if (Math.abs(this.vx) < 0.001) this.vx = 0;
      if (Math.abs(this.vy) < 0.001) this.vy = 0;
    }
    this.idle += 1 / 60;
    const br = Math.min(1, Math.max(0, this.idle - 2.5)) * 0.6;
    const bx = Math.sin(t * 0.32) * br, by = Math.cos(t * 0.21) * br * 0.6, bz = Math.sin(t * 0.18) * br * 0.8;
    camera.position.set(this.x + 3.2 + bx, this.y + 2.1 + by, this.z + bz);
    camera.lookAt(this.x + bx * 0.6, this.y + by * 0.6, 0);
    lamp.target.position.set(this.x, this.y, 0);
  },
  wake() { this.idle = 0; },
};

/* ---- raycasting ---- */
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const raycaster = new THREE.Raycaster();

function screenToBoard(cx, cy, z = 0) {
  const r = new THREE.Raycaster();
  r.setFromCamera({ x: (cx / innerWidth) * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, camera);
  boardPlane.constant = -z;
  const _v = new THREE.Vector3();
  r.ray.intersectPlane(boardPlane, _v);
  return _v.clone();
}

function worldToScreen(v) {
  const _sv = new THREE.Vector3();
  _sv.copy(v).project(camera);
  return { x: ((_sv.x + 1) / 2) * innerWidth, y: ((1 - _sv.y) / 2) * innerHeight };
}

export { renderer, scene, camera, rig, lamp, dust, Z_HOME, raycaster, boardPlane, screenToBoard, worldToScreen };
