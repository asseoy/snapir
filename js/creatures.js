// Sea life: fish schools that scatter from the shark (and can be eaten for stamina), groupers on the rocks,
// green turtles, a dolphin pod, stingrays, jellyfish that sting, and the Hadera shark pod.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createShark } from './shark.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(99);

function fishGeo() {
  const body = new THREE.SphereGeometry(0.5, 8, 6); body.scale(0.32, 0.55, 1); const tail = new THREE.BufferGeometry().setFromPoints([V3(0, 0, -0.42), V3(0, 0.28, -0.8), V3(0, -0.28, -0.8)]); tail.setIndex([0, 1, 2, 0, 2, 1]); tail.computeVertexNormals();
  const dors = new THREE.BufferGeometry().setFromPoints([V3(0, 0.22, 0.1), V3(0, 0.42, -0.1), V3(0, 0.22, -0.3)]); dors.setIndex([0, 1, 2, 0, 2, 1]); dors.computeVertexNormals();
  body.deleteAttribute('uv'); return mergeGeometries([body.toNonIndexed(), tail.toNonIndexed(), dors.toNonIndexed()]);
}
function wiggleMat(color, speed = 14) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  m.onBeforeCompile = sh => { sh.uniforms.uTime = { value: 0 }; m.userData.sh = sh; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
    float ph = float(gl_InstanceID) * 1.7; float k = clamp(-position.z, 0., 1.); transformed.x += sin(uTime * ${speed.toFixed(1)} + ph) * 0.18 * k * k;`); };
  return m;
}

export function createCreatures(G) {
  const S = G.scene, W = G.world, C = { schools: [], jellies: [], sharks: [], turtles: [], dolphins: [], rays: [], mats: [] };
  const Z = W.zones, tmp = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  const water = (x, z, min = 3) => { const h = W.heightAt(x, z); return h < -min ? h : null; };

  // ---------- fish schools ----------
  const FG = fishGeo();
  const kinds = [{ c: 0xc9d4dc, s: 0.6, n: 70 }, { c: 0xb8b090, s: 0.9, n: 40 }, { c: 0xe0c060, s: 0.7, n: 45 }, { c: 0x8aa0b8, s: 1.1, n: 30 }];
  const spots = [[Z.hadera.x - 60, Z.hadera.z], [Z.hadera.x - 140, Z.hadera.z - 60], [Z.caesarea.x, Z.caesarea.z + 20], [Z.caesarea.x - 90, Z.caesarea.z - 60], [Z.achziv.x, Z.achziv.z], [Z.achziv.x - 90, Z.achziv.z + 80], [Z.wreck.x, Z.wreck.z], [Z.rhn.x - 60, Z.rhn.z - 30], [-300, -150], [-420, 320], [-250, 700], [-600, -300]];
  spots.forEach(([x, z], si) => {
    const k = kinds[si % kinds.length], h = W.heightAt(x, z); if (h > -4) return;
    const mat = wiggleMat(k.c); C.mats.push(mat);
    const im = new THREE.InstancedMesh(FG, mat, k.n); im.frustumCulled = false; S.add(im);
    const fish = []; for (let i = 0; i < k.n; i++) fish.push({ off: V3((R() - 0.5) * 2, (R() - 0.5) * 2, (R() - 0.5) * 2).normalize().multiplyScalar(1 + R() * 4), p: V3(x, h + 4, z), v: V3(), eaten: 0, s: k.s * (0.8 + R() * 0.4) });
    C.schools.push({ im, fish, home: V3(x, 0, z), c: V3(x, h + 4, z), a: R() * 6, r: 18 + R() * 25, sp: 0.05 + R() * 0.05 });
  });
  // ---------- groupers (big, slow, by the rocks) ----------
  const grouperM = wiggleMat(0x6a4a34, 5); C.mats.push(grouperM);
  const groupers = new THREE.InstancedMesh(FG, grouperM, 14); groupers.frustumCulled = false; S.add(groupers); const gList = [];
  for (let i = 0; i < 14; i++) { const base = [Z.achziv, Z.caesarea, Z.wreck, Z.rhn][i % 4]; const x = base.x + (R() - 0.5) * 80, z = base.z + (R() - 0.5) * 80, h = water(x, z); if (h === null) { gList.push(null); continue; } gList.push({ p: V3(x, h + 1.5, z), home: V3(x, h + 1.5, z), a: R() * 6, s: 2.4 + R() * 1.2 }); }

  // ---------- jellyfish ----------
  const jm = new THREE.MeshStandardMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.55, emissive: 0x6688cc, emissiveIntensity: 0.35, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const jBell = new THREE.SphereGeometry(0.7, 14, 8, 0, 6.29, 0, Math.PI / 2); const tent = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; const t = new THREE.CylinderGeometry(0.03, 0.01, 1.8, 3); t.translate(Math.cos(a) * 0.4, -0.9, Math.sin(a) * 0.4); t.deleteAttribute('uv'); tent.push(t.toNonIndexed()); }
  jBell.deleteAttribute('uv'); const JG = mergeGeometries([jBell.toNonIndexed(), ...tent]);
  for (let i = 0; i < 46; i++) { const x = -900 + R() * 850, z = -900 + R() * 1850, h = water(x, z, 8); if (h === null) continue; const j = new THREE.Mesh(JG, jm); j.position.set(x, Math.max(h + 4, -3 - R() * 20), z); j.userData = { ph: R() * 6, base: j.position.clone() }; S.add(j); C.jellies.push(j); }

  // ---------- the Hadera shark pod ----------
  for (let i = 0; i < 7; i++) { const s = createShark(G, { scale: 1.25 + R() * 0.5, tint: i % 2 ? '#d8dde0' : '#c4ccd2' }); s.ai = { a: i / 7 * 6.28, r: 14 + R() * 18, y: -3 - R() * 4, sp: 0.08 + R() * 0.05 }; C.sharks.push(s); }

  // ---------- turtles ----------
  C.makeTurtle = () => {
    const g = new THREE.Group(), shellM = new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 0.7 }), skin = new THREE.MeshStandardMaterial({ color: 0x8a9a6a, roughness: 0.8 });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), shellM); shell.scale.set(1, 0.38, 1.25); g.add(shell);
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.78, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8c890, roughness: 0.8 })); plate.scale.set(0.95, 0.2, 1.15); plate.position.y = -0.08; g.add(plate);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin); head.scale.set(0.9, 0.8, 1.2); head.position.set(0, 0.02, 1.15); g.add(head);
    const fl = []; for (const [x, z, s] of [[0.75, 0.45, 1], [-0.75, 0.45, 1], [0.5, -0.8, 0.6], [-0.5, -0.8, 0.6]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), skin); f.scale.set(1.1 * s, 0.12, 0.35 * s); const piv = new THREE.Group(); piv.position.set(x, 0, z); f.position.x = Math.sign(x) * 0.45 * s; piv.add(f); g.add(piv); fl.push(piv); }
    g.userData.fl = fl; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); S.add(g); return g;
  };
  C.flapTurtle = (g, t, sp = 1) => { g.userData.fl.forEach((p, i) => { p.rotation.z = Math.sin(t * 2.4 * sp + (i < 2 ? 0 : 1.2)) * (i < 2 ? 0.55 : 0.3) * (i % 2 ? -1 : 1); p.rotation.y = Math.cos(t * 2.4 * sp) * 0.25 * (i % 2 ? -1 : 1); }); };
  for (let i = 0; i < 6; i++) { const base = [Z.achziv, Z.caesarea, Z.hadera, Z.rhn][i % 4]; const x = base.x - 30 + (R() - 0.5) * 120, z = base.z + (R() - 0.5) * 120, h = water(x, z, 4); if (h === null) continue; const t = C.makeTurtle(); t.position.set(x, h + 3, z); t.userData.ai = { home: V3(x, h + 3, z), a: R() * 6, r: 20 + R() * 30, sp: 0.03 + R() * 0.02 }; C.turtles.push(t); }

  // ---------- dolphins ----------
  C.makeDolphin = (tint = 0x7d8c98) => {
    const prof = []; for (let i = 0; i <= 16; i++) { const u = i / 16; prof.push(new THREE.Vector2(Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.42 * (u < 0.15 ? 0.6 + u * 2.6 : 1) * (1 - u * 0.55) + 0.02, (1 - u) * 2.6 - 1.3)); }
    const body = new THREE.LatheGeometry(prof, 14); body.rotateX(Math.PI / 2); body.scale(0.85, 1, 1);
    const beak = new THREE.CylinderGeometry(0.05, 0.13, 0.4, 8); beak.rotateX(Math.PI / 2); beak.translate(0, -0.08, 1.45);
    const dors = new THREE.BufferGeometry().setFromPoints([V3(0, 0.35, 0.1), V3(0, 0.38, -0.45), V3(0, 0.8, -0.55)]); dors.setIndex([0, 1, 2, 0, 2, 1]); dors.computeVertexNormals();
    const fluke = new THREE.BufferGeometry().setFromPoints([V3(0, 0, -1.25), V3(0.6, 0, -1.6), V3(-0.6, 0, -1.6)]); fluke.setIndex([0, 1, 2, 0, 2, 1]); fluke.computeVertexNormals();
    const pec = new THREE.BufferGeometry().setFromPoints([V3(0.3, -0.15, 0.5), V3(0.75, -0.35, 0.1), V3(0.3, -0.15, 0.2), V3(-0.3, -0.15, 0.5), V3(-0.75, -0.35, 0.1), V3(-0.3, -0.15, 0.2)]); pec.setIndex([0, 1, 2, 0, 2, 1, 3, 4, 5, 3, 5, 4]); pec.computeVertexNormals();
    [body, beak].forEach(g => g.deleteAttribute('uv'));
    const g = mergeGeometries([body.toNonIndexed(), beak.toNonIndexed(), dors.toNonIndexed(), fluke.toNonIndexed(), pec.toNonIndexed()]);
    const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35, metalness: 0.1 }); const U = { uPh: { value: 0 } };
    mat.onBeforeCompile = sh => { sh.uniforms.uPh = U.uPh; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPh;').replace('#include <begin_vertex>', `#include <begin_vertex>
      float u = clamp((0.6 - position.z) / 2.2, 0., 1.); transformed.y += sin(uPh - u * 3.) * 0.22 * u * u;`); };
    const m = new THREE.Mesh(g, mat); m.castShadow = true; const grp = new THREE.Group(); grp.add(m); grp.userData.U = U; S.add(grp); return grp;
  };
  for (let i = 0; i < 3; i++) { const d = C.makeDolphin(); d.userData.ai = { a: i * 0.4, off: i }; C.dolphins.push(d); }

  // ---------- stingrays ----------
  const rayM = new THREE.MeshStandardMaterial({ color: 0x8c7a5c, roughness: 0.8, side: THREE.DoubleSide });
  rayM.onBeforeCompile = sh => { sh.uniforms.uTime = { value: 0 }; rayM.userData.sh = sh; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
    float ph = float(gl_InstanceID) * 2.1; transformed.y += sin(uTime * 3. - position.z * 2. + ph) * 0.25 * abs(position.x);`); };
  const rg = new THREE.PlaneGeometry(2, 1.8, 8, 6); rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 4); const tail = new THREE.CylinderGeometry(0.02, 0.05, 1.6, 4); tail.rotateX(Math.PI / 2); tail.translate(0, 0, -1.4);
  rg.deleteAttribute('uv'); tail.deleteAttribute('uv');
  const rays = new THREE.InstancedMesh(mergeGeometries([rg.toNonIndexed(), tail.toNonIndexed()]), rayM, 8); rays.frustumCulled = false; S.add(rays); C.mats.push(rayM);
  const rList = []; for (let i = 0; i < 8; i++) { const x = Z.caesarea.x - 120 + R() * 240, z = -300 + R() * 600, h = water(x, z, 4); rList.push(h === null ? null : { p: V3(x, h + 0.6, z), a: R() * 6, home: V3(x, h + 0.6, z) }); }

  // ---------- eating ----------
  C.tryEat = (p, r = 1.8) => {
    for (const s of C.schools) for (const f of s.fish) if (!f.eaten && f.p.distanceTo(p) < r + f.s * 0.5) { f.eaten = 25; G.fx && G.fx.bubble(f.p, 8, 0.6); return true; }
    return false;
  };
  C.nearestFish = (p) => { let best = null, bd = 1e9; for (const s of C.schools) for (const f of s.fish) { if (f.eaten) continue; const d = f.p.distanceTo(p); if (d < bd) { bd = d; best = f.p; } } return best; };

  // ---------- update ----------
  C.update = (dt, t) => {
    const sp = G.swim ? G.swim.pos : V3(0, 0, 0);
    for (const m of C.mats) if (m.userData.sh) m.userData.sh.uniforms.uTime.value = t;
    for (const s of C.schools) {
      if (s.home.distanceTo(sp) > 260) { s.im.visible = false; continue; } s.im.visible = true;
      s.a += dt * s.sp; const h = W.heightAt(s.c.x, s.c.z);
      s.c.set(s.home.x + Math.cos(s.a) * s.r, 0, s.home.z + Math.sin(s.a * 1.3) * s.r); s.c.y = Math.min(-1.5, Math.max(W.heightAt(s.c.x, s.c.z) + 3, -2 - (1 + Math.sin(s.a * 0.7)) * 5));
      s.fish.forEach((f, i) => {
        if (f.eaten > 0) { f.eaten -= dt; m4.makeScale(0, 0, 0); s.im.setMatrixAt(i, m4); if (f.eaten <= 0) { f.eaten = 0; f.p.copy(s.c); } return; }
        tmp.copy(s.c).add(V3(f.off.x * Math.cos(t * 0.3 + i), f.off.y * 0.6, f.off.z * Math.sin(t * 0.25 + i) + f.off.x * 0.3)).sub(f.p);
        f.v.addScaledVector(tmp, dt * 1.5);
        const d = f.p.distanceTo(sp); if (d < 9) { tmp.subVectors(f.p, sp).normalize().multiplyScalar((9 - d) * 3.5); f.v.addScaledVector(tmp, dt * 6); }
        f.v.multiplyScalar(Math.exp(-1.6 * dt)); if (f.v.length() > 9) f.v.setLength(9);
        f.p.addScaledVector(f.v, dt); const fh = W.heightAt(f.p.x, f.p.z); if (f.p.y < fh + 0.6) f.p.y = fh + 0.6; if (f.p.y > -0.6) f.p.y = -0.6;
        const dir = f.v.lengthSq() > 0.01 ? tmp.copy(f.v).normalize() : tmp.set(0, 0, 1);
        m4.lookAt(V3(0, 0, 0), dir, V3(0, 1, 0)); q.setFromRotationMatrix(m4).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI));
        m4.compose(f.p, q, sc.setScalar(f.s)); s.im.setMatrixAt(i, m4);
      });
      s.im.instanceMatrix.needsUpdate = true;
    }
    gList.forEach((g, i) => { if (!g) { m4.makeScale(0, 0, 0); groupers.setMatrixAt(i, m4); return; } g.a += dt * 0.08; const tx = g.home.x + Math.cos(g.a) * 6, tz = g.home.z + Math.sin(g.a) * 6; const ny = Math.max(W.heightAt(tx, tz) + 1.4, g.home.y - 1); const nx = V3(tx, ny, tz), dir = nx.clone().sub(g.p).normalize(); g.p.copy(nx);
      m4.lookAt(V3(0, 0, 0), dir, V3(0, 1, 0)); q.setFromRotationMatrix(m4).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI)); m4.compose(g.p, q, sc.setScalar(g.s)); groupers.setMatrixAt(i, m4); });
    groupers.instanceMatrix.needsUpdate = true;
    for (const j of C.jellies) { const u = j.userData, k = Math.sin(t * 2 + u.ph); j.scale.set(1 + k * 0.12, 1 - k * 0.15, 1 + k * 0.12); j.position.y = u.base.y + Math.sin(t * 0.4 + u.ph) * 1.5; j.position.x = u.base.x + Math.sin(t * 0.1 + u.ph) * 3;
      if (G.swim && j.position.distanceTo(sp) < 1.9 && G.swim.slow <= 0) { G.swim.slow = 2.5; G.sfx && G.sfx('sting'); G.fx && G.fx.burst(j.position, 20, [0.6, 0.7, 1]); G.onSting && G.onSting(); } }
    const out = W.outlet;
    for (const s of C.sharks) { const a = s.ai; a.a += dt * a.sp * (s.follow ? 3 : 1); let p;
      if (s.follow) p = s.follow(a); else p = V3(out.x + Math.cos(a.a) * a.r - 20, a.y + Math.sin(a.a * 2) * 1.2, out.z + Math.sin(a.a) * a.r);
      const prevP = s.root.position.clone(); if (s._init) s.root.position.lerp(p, 1 - Math.exp(-3 * dt)); else { s.root.position.copy(p); s._init = true; } p = s.root.position; const d = p.clone().sub(prevP); if (d.lengthSq() > 1e-8) { m4.lookAt(V3(0, 0, 0), d.normalize(), V3(0, 1, 0)); s.root.quaternion.setFromRotationMatrix(m4).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI)); }
      s.update(dt, { speed: 3 + (s.follow ? 5 : 0), turn: 0.3 }); }
    for (const tu of C.turtles) { const a = tu.userData.ai; if (!a) continue; a.a += dt * a.sp; const p = V3(a.home.x + Math.cos(a.a) * a.r, 0, a.home.z + Math.sin(a.a) * a.r); const h = W.heightAt(p.x, p.z); p.y = Math.min(-1, Math.max(h + 2, a.home.y + Math.sin(a.a * 3) * 3)); const d = p.clone().sub(tu.position); tu.position.copy(p); if (d.lengthSq() > 1e-6) tu.lookAt(p.clone().add(d)); C.flapTurtle(tu, t); }
    // dolphin pod: arcs near the surface between Caesarea and Achziv, leaping now and then
    C.dolphins.forEach((d, i) => { if (d.userData.race) return; const a = d.userData.ai; a.a += dt * 0.025; const cx = -260 + Math.cos(a.a) * 160, cz = 280 + Math.sin(a.a) * 260 + i * 6; const leap = Math.max(0, Math.sin(t * 0.9 + i * 1.3)); const y = -2.2 + Math.pow(leap, 8) * 4.5 - Math.sin(t * 0.9 + i * 1.3) * 0.3; const p = V3(cx + i * 4, y, cz); const dd = p.clone().sub(d.position); d.position.copy(p); if (dd.lengthSq() > 1e-6) d.lookAt(p.clone().add(dd)); d.userData.U.uPh.value += dt * 9; });
    rList.forEach((r, i) => { if (!r) { m4.makeScale(0, 0, 0); rays.setMatrixAt(i, m4); return; } r.a += dt * 0.06; const p = V3(r.home.x + Math.cos(r.a) * 15, 0, r.home.z + Math.sin(r.a) * 15); p.y = W.heightAt(p.x, p.z) + 0.6; const dir = p.clone().sub(r.p); r.p.copy(p); m4.lookAt(V3(0, 0, 0), dir.lengthSq() > 1e-6 ? dir.normalize() : V3(0, 0, 1), V3(0, 1, 0)); q.setFromRotationMatrix(m4).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI)); m4.compose(r.p, q, sc.setScalar(1.3)); rays.setMatrixAt(i, m4); });
    rays.instanceMatrix.needsUpdate = true;
  };
  G.creatures = C; return C;
}
