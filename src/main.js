import { items, ropes, $, clamp } from "./game/state.js";
import { renderer, scene, camera, rig, lamp, dust, Z_HOME } from "./game/scene.js";
import { SUBSTEPS } from "./game/rope.js";
import { drawMinimap } from "./game/ui.js";
import { sizeLasso } from "./game/interact.js";
import "./game/game.js";
import "./game/interact.js";

const clock = new THREE.Clock();
let frameN = 0, lastPct = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.033), t = clock.elapsedTime;

  for (const it of items) {
    const g = it.grp;
    it.target.z = it.baseZ + it.hoverLift + it.dragLift;
    const ox = g.position.x;
    g.position.lerp(it.target, 0.2);
    const vx = g.position.x - ox;
    it.vel.x += (vx - it.vel.x) * 0.3;
    const tilt = clamp(-it.vel.x * 0.9, -0.16, 0.16);
    g.rotation.z += (it.restRot + tilt - g.rotation.z) * 0.14;
    it.paper.rotation.x = Math.sin(t * 0.7 + it.baseZ * 40) * 0.006;
  }

  const sdt = dt / SUBSTEPS;
  for (const r of ropes) { for (let s = 0; s < SUBSTEPS; s++) r.step(sdt, t); }
  for (const r of ropes) r.render();

  dust.step(dt, t);
  rig.apply(t);
  lamp.intensity = 1.55 + Math.sin(t * 13.7) * 0.012 + Math.sin(t * 3.1) * 0.02;

  if (++frameN % 6 === 0) {
    drawMinimap();
    const pct = Math.round((Z_HOME / rig.z) * 100);
    if (pct !== lastPct) { $("zoomPct").textContent = pct + "%"; lastPct = pct; }
  }
  renderer.render(scene, camera);
}
frame();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  sizeLasso();
});
