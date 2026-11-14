// Particles: bubbles, splashes and spray, wake, sparkle bursts, sand puffs, and the shark-sense pulse.
import * as THREE from 'three';

function spriteTex(soft) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(soft ? 0.35 : 0.15, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
function bubbleTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(22, 22, 6, 0, 7); g.fill(); return new THREE.CanvasTexture(c); }

function particles(G, n, additive, tex) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { map: { value: tex } },
    vertexShader: 'attribute float size; attribute vec4 color; varying vec4 vC; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = size * 600. / -mv.z; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); if (gl_FragColor.a < 0.004) discard; }' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 3; G.scene.add(pts);
  const P = []; for (let i = 0; i < n; i++) P.push({ life: 1, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s0: 1, s1: 1, c0: [1, 1, 1, 1], c1: [1, 1, 1, 0], drag: 1, up: 0, pop: false });
  let head = 0;
  return {
    emit(o) { const p = P[head]; head = (head + 1) % n; Object.assign(p, { life: 0, drag: 1, up: 0, pop: false }, o); return p; },
    update(dt, surf) {
      for (let i = 0; i < n; i++) { const p = P[i]; if (p.life >= p.max) { size[i] = 0; continue; } p.life += dt; const k = p.life / p.max, d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy = p.vy * d + p.up * dt; p.vz *= d; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.pop && p.y > surf(p.x, p.z)) p.life = p.max;          // bubbles pop at the surface
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; size[i] = p.s0 + (p.s1 - p.s0) * k;
        for (let c = 0; c < 4; c++) col[i * 4 + c] = p.c0[c] + (p.c1[c] - p.c0[c]) * k; }
      geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.size.needsUpdate = true;
    },
  };
}

export function createFx(G) {
  const S = G.scene, soft = spriteTex(true), hard = spriteTex(false);
  const bubbles = particles(G, 1200, false, bubbleTex()), spray = particles(G, 900, false, soft), glow = particles(G, 700, true, hard), sand = particles(G, 400, false, soft);
  const X = {};
  const surf = (x, z) => G.world.waveAt(x, z, G.t) - 0.15;
  X.bubble = (p, n = 1, spread = 0.4) => { for (let k = 0; k < n; k++) bubbles.emit({ x: p.x + (Math.random() - 0.5) * spread, y: p.y + (Math.random() - 0.5) * spread, z: p.z + (Math.random() - 0.5) * spread, vx: (Math.random() - 0.5) * 0.6, vy: 0.5 + Math.random(), vz: (Math.random() - 0.5) * 0.6, up: 2.5, drag: 1.2, max: 4 + Math.random() * 2, s0: 0.06 + Math.random() * 0.1, s1: 0.16 + Math.random() * 0.12, c0: [0.9, 0.97, 1, 0.8], c1: [0.9, 0.97, 1, 0.5], pop: true }); };
  X.splash = (p, power = 1) => { const n = Math.round(40 * power); for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, s = (2 + Math.random() * 5) * power; spray.emit({ x: p.x + Math.cos(a) * 0.6, y: 0.2, z: p.z + Math.sin(a) * 0.6, vx: Math.cos(a) * s, vy: 4 + Math.random() * 7 * power, vz: Math.sin(a) * s, up: -15, drag: 0.6, max: 1 + Math.random() * 0.6, s0: 0.35, s1: 0.9 * power, c0: [1, 1, 1, 0.9], c1: [0.95, 0.98, 1, 0] }); }
    X.bubble(new THREE.Vector3(p.x, -1, p.z), Math.round(30 * power), 2); };
  X.wake = (p, v) => { spray.emit({ x: p.x + (Math.random() - 0.5), y: 0.15, z: p.z + (Math.random() - 0.5), vx: -v.z * 0.15 * (Math.random() < 0.5 ? 1 : -1), vy: 0.8, vz: v.x * 0.15, up: -3, drag: 1.5, max: 0.9, s0: 0.4, s1: 1.4, c0: [1, 1, 1, 0.7], c1: [1, 1, 1, 0] }); };
  X.burst = (p, n = 40, col = [1, 0.9, 0.5]) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, b = Math.random() * 3.14, s = 2 + Math.random() * 5; glow.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * Math.sin(b) * s, vy: Math.cos(b) * s, vz: Math.sin(a) * Math.sin(b) * s, drag: 1.6, max: 1.2, s0: 0.4, s1: 0.05, c0: [...col, 1], c1: [...col, 0] }); } };
  X.glowAt = (p, col = [0.5, 0.9, 1], s = 0.5) => glow.emit({ x: p.x + (Math.random() - 0.5) * 0.5, y: p.y + (Math.random() - 0.5) * 0.5, z: p.z + (Math.random() - 0.5) * 0.5, vx: 0, vy: 0.4, vz: 0, drag: 1, max: 1, s0: s, s1: 0.02, c0: [...col, 0.9], c1: [...col, 0] });
  X.sandPuff = (p, n = 12) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 2; sand.emit({ x: p.x, y: p.y + 0.3, z: p.z, vx: Math.cos(a) * s, vy: 0.6 + Math.random(), vz: Math.sin(a) * s, drag: 1.8, max: 2.5, s0: 0.6, s1: 2.4, c0: [0.85, 0.78, 0.6, 0.6], c1: [0.85, 0.78, 0.6, 0] }); } };
  X.spout = (p, dt) => { for (let k = 0; k < Math.ceil(dt * 40); k++) bubbles.emit({ x: p.x + (Math.random() - 0.5) * 3, y: p.y, z: p.z + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 0.8, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 0.8, up: 2, drag: 0.8, max: 5, s0: 0.1, s1: 0.25, c0: [0.95, 1, 1, 0.8], c1: [0.95, 1, 1, 0.4], pop: true }); };

  // shark sense: an expanding shell of light
  const ringM = new THREE.MeshBasicMaterial({ color: 0x9ff3ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, wireframe: true, fog: false });
  const ring = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), ringM); ring.visible = false; S.add(ring);
  let ringT = 0;
  X.pulse = p => { ring.position.copy(p); ringT = 1.4; ring.visible = true; };
  X.update = (dt) => {
    bubbles.update(dt, surf); spray.update(dt, () => 1e9); glow.update(dt, () => 1e9); sand.update(dt, () => 1e9);
    if (ringT > 0) { ringT -= dt; const k = 1 - ringT / 1.4; ring.scale.setScalar(2 + k * 120); ringM.opacity = (1 - k) * 0.35; if (G.swim) ring.position.copy(G.swim.pos); if (ringT <= 0) ring.visible = false; }
  };
  G.fx = X; return X;
}
