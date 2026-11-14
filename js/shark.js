// סנפיר – a procedural young shark. One merged mesh (body, fins, eyes, teeth, ribbon) with vertex colours
// (counter-shading: blue-grey back, white belly). Swimming, turning, the jaw and the ribbon are all done
// in the vertex shader, so it costs one draw call and bends smoothly from nose to tail.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const L = 3, ZN = 1.5, ZT = -1.5;              // length, nose z, tail z
const C = { back: new THREE.Color('#5f7889'), side: new THREE.Color('#8ea3b0'), belly: new THREE.Color('#eef1f2'), tip: new THREE.Color('#3c4c58'), eye: new THREE.Color('#0b0d10'), gill: new THREE.Color('#4a5d6a'), tooth: new THREE.Color('#fbfaf5'), mouth: new THREE.Color('#5a1f24') };

// body radius profile along z: u = 0 at nose → 1 at tail
function prof(u) {
  const nose = Math.pow(Math.min(1, u / 0.2), 0.55);             // rounded pointed snout
  const tail = 1 - Math.pow(Math.max(0, (u - 0.3) / 0.7), 1.25) * 0.88;
  return 0.36 * nose * tail;
}
function geo(pos, col, idx, jaw, rib) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aJaw', new THREE.Float32BufferAttribute(jaw, 1)); g.setAttribute('aRib', new THREE.Float32BufferAttribute(rib, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function body() {
  const N = 48, M = 28, pos = [], col = [], jaw = [], rib = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= N; i++) {
    const u = i / N, z = ZN - u * L, r = prof(u);
    for (let j = 0; j <= M; j++) {
      const a = j / M * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      // cross-section: a bit taller than wide, flatter belly, the head flattens toward the snout
      const flat = u < 0.25 ? 0.8 + u * 0.8 : 1;
      let x = sa * r * 0.82, y = ca * r * flat; if (ca < 0) y *= 0.82;
      pos.push(x, y + (u < 0.12 ? -0.04 * (1 - u / 0.12) : 0), z);
      // colour: counter-shading with a soft lateral line, gill slits, darker snout tip
      const up = ca; c.copy(C.belly).lerp(C.side, THREE.MathUtils.smoothstep(up, -0.35, 0.05)).lerp(C.back, THREE.MathUtils.smoothstep(up, 0.05, 0.6));
      if (u > 0.2 && u < 0.3 && Math.abs(ca) < 0.45) { const g = Math.abs(Math.sin((u - 0.2) / 0.1 * Math.PI * 5)); if (g < 0.25) c.lerp(C.gill, 0.8); }
      col.push(c.r, c.g, c.b);
      // lower jaw: front underside of the head
      jaw.push(u < 0.14 && ca < -0.15 ? THREE.MathUtils.smoothstep(-ca, 0.15, 0.4) : 0); rib.push(0);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  return geo(pos, col, idx, jaw, rib);
}
// a fin = a thin wedge triangle (root front, root back, tip), coloured with a darker tip
function fin(rf, rb, tip, th = 0.03, tipCol = C.tip, base = C.back) {
  const pts = [rf, rb, tip], pos = [], col = [], n = new THREE.Vector3().subVectors(rb, rf).cross(new THREE.Vector3().subVectors(tip, rf)).normalize().multiplyScalar(th);
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) { const p = pts[k].clone().addScaledVector(n, k < 2 ? s : s * 0.2); pos.push(p.x, p.y, p.z); const c = k === 2 ? tipCol : base; col.push(c.r, c.g, c.b); }
  const idx = [0, 1, 2, 5, 4, 3, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
  return geo(pos, col, idx, [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function sphere(r, p, c) { const g = new THREE.SphereGeometry(r, 10, 8); g.translate(p.x, p.y, p.z); const n = g.attributes.position.count, col = []; for (let i = 0; i < n; i++) col.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aJaw', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aRib', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.deleteAttribute('uv'); return g; }
function teeth(lower) {
  const pos = [], col = [], jaw = [], rib = [], idx = [];
  for (let k = 0; k < 14; k++) { const t = k / 13, a = (t - 0.5) * 2.3, zz = ZN - 0.1 - Math.abs(t - 0.5) * 0.36, x = Math.sin(a) * 0.17, y = lower ? -0.13 : -0.09, s = 0.035;
    const b = pos.length / 3; pos.push(x - s * 0.6, y, zz, x + s * 0.6, y, zz, x, y + (lower ? s * 1.8 : -s * 1.8), zz + 0.01); for (let q = 0; q < 3; q++) { col.push(C.tooth.r, C.tooth.g, C.tooth.b); jaw.push(lower ? 1 : 0); rib.push(0); } idx.push(b, b + 1, b + 2, b, b + 2, b + 1); }
  return geo(pos, col, idx, jaw, rib);
}
function mouthInside() { // dark cavity seen when the jaw opens
  const g = new THREE.ConeGeometry(0.16, 0.35, 12, 1, true); g.rotateX(-Math.PI / 2); g.scale(1, 0.55, 1); g.translate(0, -0.1, ZN - 0.32);
  const n = g.attributes.position.count, col = []; for (let i = 0; i < n; i++) col.push(C.mouth.r, C.mouth.g, C.mouth.b);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aJaw', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aRib', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.deleteAttribute('uv'); return g;
}
// the tribe ribbon tied to the dorsal fin (red / black / yellow stripes)
function ribbon() {
  const pos = [], col = [], jaw = [], rib = [], idx = [], cs = [new THREE.Color('#c8161f'), new THREE.Color('#141414'), new THREE.Color('#f3d33b')], S = 10;
  for (let i = 0; i <= S; i++) { const t = i / S, z = 0.05 - t * 0.75, y = 0.62 - t * 0.12; for (const s of [-1, 1]) { pos.push(0.03, y + s * 0.045, z); const c = cs[Math.min(2, Math.floor(((s + 1) / 2) * 3 * 0.999 + (i % 2 ? 0 : 0)))]; const cc = cs[Math.floor((s + 1) / 2 * 2.999)]; col.push((s < 0 ? cs[0] : cs[2]).r, (s < 0 ? cs[0] : cs[2]).g, (s < 0 ? cs[0] : cs[2]).b); jaw.push(0); rib.push(t); void c; void cc; } }
  // middle black stripe as a second strip slightly offset
  const b0 = pos.length / 3;
  for (let i = 0; i <= S; i++) { const t = i / S, z = 0.05 - t * 0.75, y = 0.62 - t * 0.12; for (const s of [-1, 1]) { pos.push(0.034, y + s * 0.015, z); col.push(cs[1].r, cs[1].g, cs[1].b); jaw.push(0); rib.push(t); } }
  for (let i = 0; i < S; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3, a + 1, a + 2, a, a + 3, a + 2, a + 1); const c2 = b0 + i * 2; idx.push(c2, c2 + 2, c2 + 1, c2 + 1, c2 + 2, c2 + 3, c2 + 1, c2 + 2, c2, c2 + 3, c2 + 2, c2 + 1); }
  // knot around the fin base
  return geo(pos, col, idx, jaw, rib);
}

export function createShark(G, opts = {}) {
  const parts = [body(),
    fin(V(0, 0.3, 0.32), V(0, 0.28, -0.12), V(0, 0.82, -0.22), 0.035),                     // first dorsal
    fin(V(0, 0.13, -0.78), V(0, 0.11, -0.92), V(0, 0.27, -0.98), 0.02),                     // second dorsal
    fin(V(0.2, -0.12, 0.55), V(0.22, -0.13, 0.22), V(0.78, -0.42, -0.05), 0.025),           // pectorals
    fin(V(-0.2, -0.12, 0.55), V(-0.22, -0.13, 0.22), V(-0.78, -0.42, -0.05), 0.025),
    fin(V(0.08, -0.2, -0.45), V(0.08, -0.18, -0.62), V(0.2, -0.36, -0.68), 0.015, C.side, C.side),   // pelvic
    fin(V(-0.08, -0.2, -0.45), V(-0.08, -0.18, -0.62), V(-0.2, -0.36, -0.68), 0.015, C.side, C.side),
    fin(V(0, -0.1, -0.85), V(0, -0.08, -1.0), V(0, -0.24, -1.04), 0.015),                    // anal
    fin(V(0, 0.04, -1.32), V(0, 0.02, -1.5), V(0, 0.78, -2.05), 0.03),                       // caudal upper lobe
    fin(V(0, -0.02, -1.36), V(0, 0, -1.5), V(0, -0.46, -1.78), 0.03),                        // caudal lower lobe
    sphere(0.042, V(0.2, 0.06, ZN - 0.3), C.eye), sphere(0.042, V(-0.2, 0.06, ZN - 0.3), C.eye),
    teeth(false), teeth(true), mouthInside(), ribbon()];
  const g = mergeGeometries(parts);
  const U = { uPhase: { value: 0 }, uAmp: { value: 0.12 }, uTurn: { value: 0 }, uJaw: { value: 0 }, uRib: { value: opts.ribbon ? 1 : 0 }, uTime: { value: 0 }, uPitch: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05 });
  if (opts.tint) mat.color.set(opts.tint);
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uPhase, uAmp, uTurn, uJaw, uRib, uTime, uPitch; attribute float aJaw; attribute float aRib;
      vec3 swim(vec3 p){ float u = clamp((${ZN.toFixed(2)} - p.z) / ${L.toFixed(2)}, 0., 1.4);
        float w = pow(u, 1.5); p.x += uAmp * w * sin(uPhase - u * 5.2) + uTurn * u * u * 0.55; p.y += uPitch * u * u * 0.35; return p; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (aJaw > 0.) { vec3 piv = vec3(0., -0.06, ${(ZN - 0.42).toFixed(2)}); vec3 d = transformed - piv; float a = -uJaw * 0.55 * aJaw; float cy = cos(a), sy = sin(a); transformed = piv + vec3(d.x, d.y * cy - d.z * sy, d.y * sy + d.z * cy); }
        if (aRib > 0.) { float fl = sin(uTime * 9. - aRib * 7.) * 0.09 * aRib; transformed.x += fl + aRib * 0.05; transformed.y -= aRib * aRib * 0.12; if (uRib < 0.5) transformed = vec3(0., 0.5, 0.); }
        transformed = swim(transformed);`);
  };
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  const root = new THREE.Group(); root.add(mesh); if (opts.scale) mesh.scale.setScalar(opts.scale);
  G.scene.add(root);
  const S = { root, mesh, U, phase: Math.random() * 6, jaw: 0, ribbon: !!opts.ribbon };
  S.mouthLocal = V(0, -0.06, ZN + 0.05).multiplyScalar(opts.scale || 1);
  const tmp = new THREE.Vector3();
  // st: { speed (m/s), turn (-1..1), pitch (-1..1), bite (bool), dash }
  S.update = (dt, st) => {
    const sp = st.speed || 0;
    S.phase += dt * (2.2 + sp * 0.9 + (st.dash ? 3 : 0));
    U.uPhase.value = S.phase; U.uTime.value += dt;
    U.uAmp.value += ((0.07 + Math.min(0.13, sp * 0.012) + (st.dash ? 0.05 : 0)) - U.uAmp.value) * (1 - Math.exp(-4 * dt));
    U.uTurn.value += ((st.turn || 0) * 0.9 - U.uTurn.value) * (1 - Math.exp(-6 * dt));
    U.uPitch.value += ((st.pitch || 0) - U.uPitch.value) * (1 - Math.exp(-5 * dt));
    S.jaw += ((st.bite ? 1 : st.open || 0.05) - S.jaw) * (1 - Math.exp(-(st.bite ? 30 : 8) * dt)); U.uJaw.value = S.jaw;
    U.uRib.value = S.ribbon ? 1 : 0;
    root.updateMatrixWorld(true); S.mouth = root.localToWorld(tmp.copy(S.mouthLocal)).clone();
  };
  S.setRibbon = on => { S.ribbon = on; };
  return S;
}
