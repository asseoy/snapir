// The world of סנפיר: the Israeli Mediterranean coast squeezed into 2 km. Land to the east (+x), north is +z.
// Zones south→north: shipwreck, Hadera power station + the tribe's beach camp, Caesarea's sunken harbour,
// the deep canyon offshore, Achziv reef, Rosh HaNikra's white cliff and grottoes.
// Also: water surface seen from above and below, sky, underwater fog/caustics/god rays/marine snow, colliders.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function makeNoise(seed) {
  const p = new Uint8Array(512); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const a = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], F2 = 0.366025, G2 = 0.211325;
  const n2 = (x, y) => { const sk = (x + y) * F2, i = Math.floor(x + sk), j = Math.floor(y + sk), t = (i + j) * G2, x0 = x - i + t, y0 = y - j + t, i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const pts = [[x0, y0, 0, 0], [x0 - i1 + G2, y0 - j1 + G2, i1, j1], [x0 - 1 + 2 * G2, y0 - 1 + 2 * G2, 1, 1]]; let n = 0;
    for (const [px, py, oi, oj] of pts) { let tt = 0.5 - px * px - py * py; if (tt > 0) { const gg = g[p[(i + oi & 255) + p[j + oj & 255]] & 7]; tt *= tt; n += tt * tt * (gg[0] * px + gg[1] * py); } } return 70 * n; };
  const fbm = (x, y, o = 4) => { let a2 = 0, f = 1, w = 0.5, t = 0; for (let k = 0; k < o; k++) { a2 += n2(x * f, y * f) * w; t += w; f *= 2.03; w *= 0.5; } return a2 / t; };
  const ridge = (x, y, o = 3) => { let a2 = 0, f = 1, w = 0.5, t = 0; for (let k = 0; k < o; k++) { a2 += (1 - Math.abs(n2(x * f, y * f))) * w; t += w; f *= 2.1; w *= 0.5; } return a2 / t; };
  return { n2, fbm, ridge };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export const ZONES = {
  wreck: { name: 'הספינה הטבועה', x: -520, z: -720 },
  hadera: { name: 'חדרה', x: -40, z: -400 },
  caesarea: { name: 'קיסריה', x: -110, z: 10 },
  canyon: { name: 'הקניון העמוק', x: -760, z: 180 },
  achziv: { name: 'שונית אכזיב', x: -150, z: 540 },
  rhn: { name: 'ראש הנקרה', x: -80, z: 930 },
};

export function createOcean(G) {
  const S = G.scene, N = makeNoise(2026);
  const X0 = -1050, X1 = 260, Z0 = -1000, Z1 = 1060;
  const W = { sea: 0, bounds: { X0: X0 + 20, X1: X1 - 10, Z0: Z0 + 20, Z1: Z1 - 20 }, colliders: [], treasures: [], zones: ZONES, under: false };
  const coast = z => 55 * Math.sin(z / 380) + 22 * Math.sin(z / 97 + 1) + (z > 820 ? -40 * sm(820, 900, z) : 0) + (Math.abs(z + 400) < 120 ? -18 * (1 - Math.abs(z + 400) / 120) : 0);
  W.coast = coast;
  const TUNNELS = [[V3(-95, -4, 905), V3(-55, -4, 935)], [V3(-60, -5, 945), V3(-20, -3, 990)], [V3(-130, -6, 960), V3(-85, -5, 1000)]], TR = 6;
  const carve = (x, z) => { let m = Infinity; for (const [a, b] of TUNNELS) { const abx = b.x - a.x, abz = b.z - a.z, L2 = abx * abx + abz * abz; let t = ((x - a.x) * abx + (z - a.z) * abz) / L2; if (t < -0.15 || t > 1.15) continue; t = Math.max(0, Math.min(1, t)); const px = a.x + abx * t, pz = a.z + abz * t, d = Math.hypot(x - px, z - pz); if (d < TR + 1.5) m = Math.min(m, a.y + (b.y - a.y) * t - TR - 1); } return m; };
  W.heightAt = (x, z) => {
    const d = x - coast(z);
    if (d > 0) { // land
      let h = 1.2 + Math.min(d * 0.06, 2.2) + Math.max(0, d - 35) * 0.09 + N.fbm(x / 60, z / 60, 3) * 2.5 * sm(10, 60, d);
      if (z > 820) h = Math.max(h, 42 * sm(-2, 14, d) * sm(820, 880, z) + N.fbm(x / 30, z / 30) * 2);
      return Math.min(h, 46);
    }
    const o = -d; // distance offshore
    let h = -Math.min(o * 0.075, 8 + o * 0.045) - 0.4 + N.fbm(x / 40, z / 40, 3) * 1.2 + Math.sin(x * 0.35 + N.n2(x / 30, z / 30) * 3) * 0.25;
    h = Math.max(h, -62 + N.fbm(x / 200, z / 200) * 6);
    // Achziv reef: rocky ridges
    const ach = sm(360, 420, z) * sm(700, 640, z) * sm(280, 220, o) * sm(25, 50, o);
    if (ach > 0) h += ach * (Math.pow(N.ridge(x / 45, z / 45), 3) * 10 - 1.5);
    // Rosh HaNikra: rocky bottom near the cliff
    if (z > 840) h += sm(840, 900, z) * sm(160, 60, o) * N.ridge(x / 30, z / 30) * 5;
    // Caesarea plateau
    const cae = Math.exp(-((x - ZONES.caesarea.x) ** 2 + (z - ZONES.caesarea.z) ** 2) / (2 * 90 * 90)); h = h * (1 - cae * 0.6) + (-10) * cae * 0.6;
    // the deep canyon
    const cx = x - ZONES.canyon.x, cz = (z - ZONES.canyon.z) * 0.55; h -= 62 * Math.exp(-(cx * cx + cz * cz) / (2 * 120 * 120)) * (0.8 + N.fbm(x / 50, z / 50) * 0.3);
    // Hadera outlet: a sandy shallow
    return Math.min(Math.max(h, -125), carve(x, z));
  };
  W.depthAt = (x, z) => -W.heightAt(x, z);

  // ---------- terrain ----------
  const caus = { uTime: { value: 0 }, uUnder: { value: 0 } };
  W.caus = caus;
  const causticPatch = mat => { mat.onBeforeCompile = sh => { sh.uniforms.uTime = caus.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uTime; varying vec3 vWp;
      float caustic(vec2 p){ float t = uTime*0.9; float a = sin(p.x*0.55 + sin(p.y*0.43 + t)*1.6 + t) * sin(p.y*0.6 + sin(p.x*0.37 - t*0.8)*1.6 - t*0.7);
        float b = sin(p.x*0.9 - t*1.1 + sin(p.y*0.8)*1.2) * sin(p.y*1.05 + t*0.9); return pow(abs(a), 6.) * 1.1 + pow(abs(b), 8.) * 0.5; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vWp.y < 0.) { float dep = clamp(-vWp.y / 45., 0., 1.); totalEmissiveRadiance += vec3(0.75, 0.95, 1.) * min(caustic(vWp.xz), 1.2) * (1. - dep) * (1. - dep) * 0.11; }`);
  }; return mat; };
  W.causticPatch = causticPatch;
  {
    const SX = 262, SZ = 412, g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SX, SZ); g.rotateX(-Math.PI / 2); g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const C = { sand: new THREE.Color('#d8c697'), dsand: new THREE.Color('#b9a985'), grass: new THREE.Color('#4f6d3a'), rock: new THREE.Color('#7b7166'), chalk: new THREE.Color('#ecebe4'), deep: new THREE.Color('#4a5458'), beach: new THREE.Color('#e9d6a6'), dune: new THREE.Color('#cdb889'), scrub: new THREE.Color('#8b9a5b'), wet: new THREE.Color('#bba67a') };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = W.heightAt(x, z); pos.setY(i, h);
      const e = 3, sl = Math.hypot(W.heightAt(x + e, z) - W.heightAt(x - e, z), W.heightAt(x, z + e) - W.heightAt(x, z - e)) / (2 * e);
      if (h > 0) { c.copy(C.beach).lerp(C.dune, sm(1.5, 4, h)).lerp(C.scrub, sm(5, 9, h) * (0.6 + N.n2(x / 25, z / 25) * 0.4)); if (z > 830 && h > 6) c.copy(C.chalk).lerp(C.scrub, sm(38, 44, h) * 0.6); if (h < 1.0) c.lerp(C.wet, 0.6); }
      else {
        c.copy(C.sand).lerp(C.dsand, sm(5, 30, -h));
        const gp = N.fbm(x / 35 + 9, z / 35 - 4, 3); if (-h > 3 && -h < 28 && gp > 0.12) c.lerp(C.grass, sm(0.12, 0.3, gp) * 0.9);
        c.lerp(C.rock, clamp((sl - 0.35) * 1.8, 0, 1));
        if (z > 840 && -h < 30) c.lerp(C.chalk, sm(840, 900, z) * 0.45);
        c.lerp(C.deep, sm(55, 100, -h));
      }
      c.offsetHSL(0, 0, N.n2(x / 9, z / 9) * 0.03);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 12000; i++) { const v = 105 + Math.random() * 60; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(300, 470); return t; })();
    const terrain = new THREE.Mesh(g, causticPatch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: tex })));
    terrain.receiveShadow = true; S.add(terrain); W.terrain = terrain;
  }

  // ---------- sky ----------
  const skyU = { uTop: { value: new THREE.Color('#5d8fc8') }, uHor: { value: new THREE.Color('#d4e3ee') }, uSun: { value: V3(0.4, 0.45, -0.8).normalize() }, uSunC: { value: new THREE.Color('#fff2dc') }, uDim: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uTop,uHor,uSunC,uSun; uniform float uDim; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y; vec3 col = mix(uHor, uTop, pow(max(h,0.), 0.55)); if (h < 0.) col = uHor*0.85;
        float s = max(dot(d, normalize(uSun)), 0.); col += uSunC * (pow(s, 700.)*5. + pow(s, 10.)*0.3) * (1.-uDim);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  dome.frustumCulled = false; dome.renderOrder = -10; S.add(dome);
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x8a7a5a, 1.1); S.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; S.add(sun, sun.target);
  const PRESETS = {
    day: { top: '#5d8fc8', hor: '#d4e3ee', sun: '#fff2dc', si: 2.6, hi: 1.1, el: 0.6, az: 2.4, dim: 0, fogA: '#cfdde8', farA: 2600, water: '#1e6a86', fogU: '#2a7f93', farU: 120 },
    storm: { top: '#20262e', hor: '#4a525c', sun: '#8a96a6', si: 0.6, hi: 0.55, el: 0.5, az: 2.0, dim: 1, fogA: '#3a414a', farA: 700, water: '#173f4c', fogU: '#1b4552', farU: 70 },
    sunset: { top: '#2f4a80', hor: '#f6a56e', sun: '#ff9a55', si: 2.0, hi: 0.75, el: 0.1, az: 1.57 + 3.14, dim: 0, fogA: '#e6aa86', farA: 2200, water: '#1d5a74', fogU: '#265f73', farU: 95 },
  };
  const cur = {}, CC = h => new THREE.Color(h); for (const k in PRESETS.day) cur[k] = typeof PRESETS.day[k] === 'string' ? CC(PRESETS.day[k]) : PRESETS.day[k];
  let target = PRESETS.day; W.skyName = 'day';
  W.setSky = name => { target = PRESETS[name]; W.skyName = name; };
  const fogA = new THREE.Fog(0xcfdde8, 300, 2600), fogU = new THREE.Fog(0x2a7f93, 2, 120); S.fog = fogA;

  // ---------- water surface ----------
  const wU = { uTime: { value: 0 }, uSun: skyU.uSun, uSky: { value: new THREE.Color('#d4e3ee') }, uDeep: { value: new THREE.Color('#1e6a86') }, uFogU: { value: new THREE.Color('#2a7f93') } };
  Object.assign(wU, THREE.UniformsUtils.clone(THREE.UniformsLib.fog));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 220, 220).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: wU, fog: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: `uniform float uTime; varying vec3 vW; varying vec3 vN;
      #include <fog_pars_vertex>
      float wv(vec2 p){ return sin(p.x*0.05 + uTime*0.9)*0.35 + cos(p.y*0.06 + uTime*0.7)*0.3 + sin((p.x+p.y)*0.13 + uTime*1.6)*0.12; }
      void main(){ vec3 p = position; vec4 w0 = modelMatrix*vec4(p,1.); float h = wv(w0.xz); p.y += h;
        float e = 1.; vN = normalize(vec3(-(wv(w0.xz+vec2(e,0.))-h)/e, 1., -(wv(w0.xz+vec2(0.,e))-h)/e));
        vec4 w = modelMatrix*vec4(p,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSun, uSky, uDeep, uFogU; uniform float uTime; varying vec3 vW; varying vec3 vN;
      #include <fog_pars_fragment>
      void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN + vec3(sin(vW.x*0.4+uTime*2.1)*0.04, 0., cos(vW.z*0.45+uTime*1.8)*0.04));
        vec3 col; float a;
        if (cameraPosition.y >= vW.y) {
          float fr = 0.03 + 0.97*pow(1.0 - max(dot(N,V),0.), 5.);
          col = mix(uDeep, uSky, fr*0.85); col += vec3(1.,0.95,0.85) * pow(max(dot(reflect(-V,N), normalize(uSun)),0.), 260.) * 3.;
          a = 0.78 + fr*0.2;
        } else {
          // from below: Snell's window – the sky shows through overhead, total reflection at grazing angles
          float up = abs(V.y); float win = smoothstep(0.8, 0.93, up);
          vec3 Nb = -N; float rip = 0.5 + 0.5*sin(vW.x*0.7 + uTime*2.)*sin(vW.z*0.6 - uTime*1.7);
          col = mix(uFogU*1.05, uSky*0.85 + uFogU*0.25, win) + rip*0.06*win + rip*0.03; col += vec3(1.,0.97,0.9) * pow(max(dot(normalize(uSun), -V), 0.), 60.) * 0.9 * win;
          a = 0.96;
        }
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }` }));
  water.renderOrder = 2; water.frustumCulled = false; S.add(water); W.water = water;
  W.waveAt = (x, z, t) => Math.sin(x * 0.05 + t * 0.9) * 0.35 + Math.cos(z * 0.06 + t * 0.7) * 0.3 + Math.sin((x + z) * 0.13 + t * 1.6) * 0.12;

  // ---------- underwater: god rays + marine snow ----------
  const rayTex = (() => { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 256; const x = cv.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 256); const g2 = x.createLinearGradient(0, 0, 32, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 32, 256); return new THREE.CanvasTexture(cv); })();
  const rays = []; const rayM = new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fdcff, opacity: 0.12, fog: false, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3 + Math.random() * 5, 70), rayM.clone()); m.geometry.translate(0, -35, 0); m.userData = { ox: (Math.random() - 0.5) * 70, oz: (Math.random() - 0.5) * 70, ph: Math.random() * 6 }; m.visible = false; S.add(m); rays.push(m); }
  const snowN = 1500, snowPos = new Float32Array(snowN * 3); for (let i = 0; i < snowN * 3; i++) snowPos[i] = (Math.random() - 0.5) * 60;
  const snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xdaf0ff, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false })); snow.frustumCulled = false; S.add(snow);

  // ---------- colliders ----------
  W.addSphere = (c, r) => W.colliders.push({ t: 's', c: c.clone(), r });
  W.addCyl = (c, r, h) => W.colliders.push({ t: 'c', c: c.clone(), r, h });           // vertical cylinder from c.y to c.y+h
  W.addBox = (c, hx, hy, hz, rotY = 0) => W.colliders.push({ t: 'b', c: c.clone(), hx, hy, hz, rot: rotY });
  W.addTube = (a, b, r) => W.colliders.push({ t: 't', a: a.clone(), b: b.clone(), r });   // swim-through tunnel
  const tv = new THREE.Vector3(), tw = new THREE.Vector3();
  W.collide = (p, rad) => {           // pushes p out of solids; returns true if touched
    let hit = false;
    for (const o of W.colliders) {
      if (o.t === 's') { tv.subVectors(p, o.c); const d = tv.length(), m = o.r + rad; if (d < m && d > 1e-4) { p.copy(o.c).addScaledVector(tv, m / d); hit = true; } }
      else if (o.t === 'c') { if (p.y < o.c.y - rad || p.y > o.c.y + o.h + rad) continue; const dx = p.x - o.c.x, dz = p.z - o.c.z, d = Math.hypot(dx, dz), m = o.r + rad; if (d < m && d > 1e-4) { p.x = o.c.x + dx / d * m; p.z = o.c.z + dz / d * m; hit = true; } }
      else if (o.t === 'b') { const cs = Math.cos(-o.rot), sn = Math.sin(-o.rot); let lx = p.x - o.c.x, lz = p.z - o.c.z; const rx = lx * cs - lz * sn, rz = lx * sn + lz * cs, ry = p.y - o.c.y;
        const ex = o.hx + rad, ey = o.hy + rad, ez = o.hz + rad; if (Math.abs(rx) < ex && Math.abs(ry) < ey && Math.abs(rz) < ez) { const px = ex - Math.abs(rx), py = ey - Math.abs(ry), pz = ez - Math.abs(rz); let nx = rx, ny = ry, nz = rz;
          if (px < py && px < pz) nx = Math.sign(rx) * ex; else if (py < pz) ny = Math.sign(ry) * ey; else nz = Math.sign(rz) * ez;
          const c2 = Math.cos(o.rot), s2 = Math.sin(o.rot); p.x = o.c.x + nx * c2 - nz * s2; p.z = o.c.z + nx * s2 + nz * c2; p.y = o.c.y + ny; hit = true; } }
      else if (o.t === 't') { tv.subVectors(o.b, o.a); const L = tv.length(); tv.divideScalar(L); tw.subVectors(p, o.a); const t = tw.dot(tv); if (t < 0 || t > L) continue; const q = o.a.clone().addScaledVector(tv, t); tw.subVectors(p, q); const d = tw.length();
        if (d < o.r) { const m = o.r - rad - 0.4; if (d > m && d > 1e-4) { p.copy(q).addScaledVector(tw, m / d); hit = true; } }
        else { const m = o.r + 2.2 + rad; if (d < m) { p.copy(q).addScaledVector(tw, m / d); hit = true; } } }
    }
    return hit;
  };
  W.tubeIndex = p => { let k = 0; for (const o of W.colliders) { if (o.t !== 't') continue; tv.subVectors(o.b, o.a); const L = tv.length(); tv.divideScalar(L); tw.subVectors(p, o.a); const t = tw.dot(tv); if (t >= -1 && t <= L + 1 && tw.addScaledVector(tv, -t).length() < o.r) return k; k++; } return -1; };
  W.inTube = p => W.colliders.some(o => { if (o.t !== 't') return false; tv.subVectors(o.b, o.a); const L = tv.length(); tv.divideScalar(L); tw.subVectors(p, o.a); const t = tw.dot(tv); if (t < 0 || t > L) return false; return tw.addScaledVector(tv, -t).length() < o.r; });

  // ---------- building kit: poles & ropes (the tribe's way of building) ----------
  const woodM = new THREE.MeshStandardMaterial({ color: 0xa98250, roughness: 0.85 }), ropeM = new THREE.MeshStandardMaterial({ color: 0xcdb27e, roughness: 1 });
  const stoneM = causticPatch(new THREE.MeshStandardMaterial({ color: 0xcbbd9e, roughness: 0.9 })), rockM = causticPatch(new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 1, flatShading: true }));
  const chalkM = causticPatch(new THREE.MeshStandardMaterial({ color: 0xe9e7df, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
  const oldWoodM = causticPatch(new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }));
  W.mats = { woodM, ropeM, stoneM, rockM, chalkM, oldWoodM };
  function kit() { const poles = [], ropes = [], u = V3(0, 1, 0), v = new THREE.Vector3(), q = new THREE.Quaternion();
    return { pole(a, b, r = 0.18) { const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6); v.subVectors(b, a).normalize(); q.setFromUnitVectors(u, v); g.applyQuaternion(q); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); poles.push(g); },
      lash(p, r = 0.28) { const g = new THREE.TorusGeometry(r, 0.07, 4, 8); g.rotateX(Math.PI / 2); g.translate(p.x, p.y, p.z); ropes.push(g); },
      build(mat = woodM, parent = S) { const grp = new THREE.Group(); if (poles.length) { const m = new THREE.Mesh(mergeGeometries(poles), mat); m.castShadow = m.receiveShadow = true; grp.add(m); } if (ropes.length) grp.add(new THREE.Mesh(mergeGeometries(ropes), ropeM)); parent.add(grp); return grp; } }; }
  W.kit = kit;
  const merged = (list, mat) => { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = m.receiveShadow = true; S.add(m); return m; };
  const at = (g, x, y, z, ry = 0, rx = 0, rz = 0) => { g.rotateX(rx); g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); return g; };

  // ---------- Hadera: power station, jetty, warm-water outlet ----------
  {
    const z0 = ZONES.hadera.z, cx = coast(z0), bx = cx + 110;
    const bm = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.8 }), red = new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.7 }), wht = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(70, 34, 46), bm); b.position.set(bx + 30, W.heightAt(bx + 30, z0) + 17, z0); b.castShadow = true; S.add(b);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(40, 22, 90), bm); b2.position.set(bx - 10, W.heightAt(bx - 10, z0 + 10) + 11, z0 + 10); S.add(b2);
    for (let i = 0; i < 4; i++) { const zz = z0 - 45 + i * 30, h0 = W.heightAt(bx + 75, zz); const segs = 6; for (let s = 0; s < segs; s++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(3.6 - s * 0.15, 3.8 - s * 0.15, 25, 16), s >= segs - 2 ? (s % 2 ? wht : red) : bm); c.position.set(bx + 75, h0 + 12.5 + s * 25, zz); c.castShadow = true; S.add(c); } }
    // the coal jetty: a long pier on pillars running out to sea (sharks love the shade)
    const jl = 380, jy = 7, pil = []; const deck = new THREE.Mesh(new THREE.BoxGeometry(jl, 1.5, 9), bm); deck.position.set(cx - jl / 2 + 10, jy, z0 - 70); S.add(deck);
    for (let i = 0; i < 24; i++) { const x = cx + 6 - i * 16, h = W.heightAt(x, z0 - 70); for (const dz of [-3.5, 3.5]) { pil.push(at(new THREE.CylinderGeometry(0.9, 0.9, jy - h, 8), x, (jy + h) / 2, z0 - 70 + dz)); W.addCyl(V3(x, h, z0 - 70 + dz), 0.9, jy - h); } }
    const pm = causticPatch(new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.9 })); merged(pil, pm);
    // outlet pipe and its warm plume
    const ox = cx - 50, oz = z0 + 40, oh = W.heightAt(ox, oz);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 14, 1, true), pm); pipe.rotation.z = Math.PI / 2; pipe.position.set(ox + 30, oh + 2.2, oz); S.add(pipe);
    W.outlet = V3(ox, oh + 2.5, oz); W.addCyl(V3(ox + 30, oh, oz), 0, 0);
    W.station = V3(bx + 75, 140, z0);
  }

  // ---------- the tribe's beach camp at Hadera ----------
  {
    const z0 = ZONES.hadera.z + 80, cx = coast(z0), K = kit(), base = x => W.heightAt(x, z0);
    // lifeguard tower of poles: 4 legs, platform, ladder, roof
    const tx = cx + 14, th = base(tx); const legs = [[-2, -2], [2, -2], [2, 2], [-2, 2]].map(([a, b]) => [V3(tx + a * 1.2, th, z0 + b * 1.2), V3(tx + a, th + 7, z0 + b)]);
    legs.forEach(([a, b], i) => { K.pole(a, b, 0.2); K.lash(b); const n = legs[(i + 1) % 4][1]; K.pole(b, n, 0.15); K.pole(a, legs[(i + 1) % 4][0].clone().setY(th + 3.5), 0.1); });
    for (let k = 0; k < 6; k++) K.pole(V3(tx - 2 + 0.2, th + 7, z0 - 2 + k * 0.8), V3(tx + 2 - 0.2, th + 7, z0 - 2 + k * 0.8), 0.12);
    K.pole(V3(tx - 3.2, th, z0 + 4.5), V3(tx - 2, th + 7, z0 + 2), 0.12); K.pole(V3(tx - 1.6, th, z0 + 5), V3(tx - 0.4, th + 7, z0 + 2.4), 0.12);
    for (let k = 1; k < 7; k++) K.pole(V3(tx - 3.2 + k * 0.17, th + k, z0 + 4.5 - k * 0.36), V3(tx - 1.6 + k * 0.17, th + k, z0 + 5 - k * 0.37), 0.08);
    for (const [a, b] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) K.pole(V3(tx + a, th + 7, z0 + b), V3(tx + a, th + 10, z0 + b), 0.1);
    // flag pole
    K.pole(V3(cx + 26, base(cx + 26), z0 - 10), V3(cx + 26, base(cx + 26) + 12, z0 - 10), 0.12);
    K.build();
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2, 4), new THREE.MeshStandardMaterial({ color: 0xb3171f, roughness: 0.9 })); roof.rotation.y = Math.PI / 4; roof.position.set(tx, th + 11, z0); roof.castShadow = true; S.add(roof);
    const flagTex = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const x = cv.getContext('2d'); x.fillStyle = '#f1efeb'; x.fillRect(0, 0, 256, 160); x.fillStyle = '#a8121b'; x.fillRect(0, 0, 256, 18); x.fillRect(0, 142, 256, 18); if (G.logo) { const s = 110, hh = s * G.logo.height / G.logo.width; x.drawImage(G.logo, 128 - s / 2, 80 - hh / 2, s, hh); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    W.flagTex = flagTex;
    const fg = new THREE.PlaneGeometry(4, 2.5, 10, 4); fg.translate(2, 0, 0); const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 })); flag.position.set(cx + 26, base(cx + 26) + 10.6, z0 - 10); S.add(flag);
    W.campFlag = { mesh: flag, base: Float32Array.from(fg.attributes.position.array), pole: V3(cx + 26, base(cx + 26), z0 - 10) };
    for (let i = 0; i < 6; i++) { const x = cx + 30 + (i % 3) * 9, z = z0 + 8 + Math.floor(i / 3) * 10; const t = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.8, 4, 1, true), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x5f6e3b : 0xb8582a, roughness: 0.9, side: THREE.DoubleSide })); t.position.set(x, W.heightAt(x, z) + 1.4, z); t.rotation.y = 0.3 + i; t.castShadow = true; S.add(t); }
    W.camp = V3(cx + 4, 1.5, z0); W.campBeach = V3(cx - 6, 0, z0);
  }

  // ---------- Caesarea: aqueduct + theatre on land, sunken harbour below ----------
  {
    const z0 = ZONES.caesarea.z, cx = coast(z0);
    // aqueduct arches along the beach
    const arches = []; for (let i = 0; i < 18; i++) { const z = z0 + 110 + i * 9, x = coast(z) + 22, h = W.heightAt(x, z); arches.push(at(new THREE.BoxGeometry(2.2, 9, 3), x, h + 4.5, z)); if (i < 17) arches.push(at(new THREE.BoxGeometry(2.2, 2, 9), x, h + 9.6, z + 4.5)); }
    merged(arches, stoneM);
    // theatre: half ring of steps
    const steps = []; for (let r = 0; r < 6; r++) for (let k = 0; k < 14; k++) { const a = Math.PI * (k / 13) - Math.PI / 2, R = 14 + r * 2.4, x = cx + 40 + Math.cos(a) * R, z = z0 - 40 + Math.sin(a) * R; steps.push(at(new THREE.BoxGeometry(2.3, 1 + r * 1.1, 3.4), x, W.heightAt(x, z) + (1 + r * 1.1) / 2, z, -a)); }
    merged(steps, stoneM);
    // underwater ruins
    const cols = [], blocks = [], amph = [];
    const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(77);
    W.ruins = [];
    for (let i = 0; i < 34; i++) { const a = R() * 6.28, r = 15 + R() * 85, x = ZONES.caesarea.x + Math.cos(a) * r, z = z0 + Math.sin(a) * r * 1.2, h = W.heightAt(x, z); if (h > -3) continue;
      if (R() < 0.45) { const hh = 4 + R() * 7; cols.push(at(new THREE.CylinderGeometry(0.75, 0.85, hh, 12), x, h + hh / 2, z)); W.addCyl(V3(x, h, z), 0.85, hh); W.ruins.push(V3(x, h + hh, z)); }
      else if (R() < 0.6) { const len = 6 + R() * 5; cols.push(at(new THREE.CylinderGeometry(0.75, 0.75, len, 12), x, h + 0.7, z, R() * 6, 0, Math.PI / 2)); }
      else { const s = 1.5 + R() * 2.5; blocks.push(at(new THREE.BoxGeometry(s * 1.6, s, s), x, h + s / 2 - 0.3, z, R() * 3, 0, R() * 0.3)); W.addBox(V3(x, h + s / 2 - 0.3, z), s * 0.8, s / 2, s / 2, 0); } }
    // two arches you can swim through
    for (const [ax, az, ry] of [[ZONES.caesarea.x - 20, z0 + 25, 0.4], [ZONES.caesarea.x + 35, z0 - 30, -0.6]]) { const h = W.heightAt(ax, az);
      const lft = at(new THREE.BoxGeometry(2.5, 10, 2.5), -5, h + 5, 0), rgt = at(new THREE.BoxGeometry(2.5, 10, 2.5), 5, h + 5, 0); const top = new THREE.TorusGeometry(5, 1.25, 6, 14, Math.PI); top.translate(0, h + 10, 0);
      const g = mergeGeometries([lft, rgt, top.toNonIndexed().index ? top : top]); g.rotateY(ry); g.translate(ax, 0, az); blocks.push(g);
      for (const sx of [-5, 5]) W.addCyl(V3(ax + Math.cos(ry) * sx, h, az - Math.sin(ry) * sx), 1.6, 10);
      W.ruins.push(V3(ax, h + 6, az)); (W.arches = W.arches || []).push({ p: V3(ax, h + 5, az), ry }); }
    merged(cols, stoneM); merged(blocks.map(g => g.index ? g.toNonIndexed() : g), stoneM);
    // amphorae
    const prof = [[0, 0], [0.25, 0.1], [0.45, 0.6], [0.42, 1.1], [0.18, 1.45], [0.14, 1.75], [0.22, 1.85]].map(([r, y]) => new THREE.Vector2(r, y));
    const amphG = new THREE.LatheGeometry(prof, 10);
    const amM = causticPatch(new THREE.MeshStandardMaterial({ color: 0xa8603a, roughness: 0.85 }));
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 10 + R() * 70, x = ZONES.caesarea.x + Math.cos(a) * r, z = z0 + Math.sin(a) * r, h = W.heightAt(x, z); if (h > -2) continue; amph.push(at(amphG.clone(), x, h + 0.25, z, R() * 6, Math.PI / 2 * (R() < 0.6 ? 1 : 0) + (R() - 0.5) * 0.4, 0)); }
    merged(amph, amM);
  }

  // ---------- the shipwreck: an old wooden ship of ribs and planks ----------
  {
    const { x: wx, z: wz } = ZONES.wreck, h = W.heightAt(wx, wz), K = kit(), grp = new THREE.Group();
    for (let i = 0; i <= 14; i++) { const zz = -18 + i * 2.6, w = 6 * Math.sin(Math.PI * (0.08 + 0.84 * i / 14)) + 0.6; const pts = []; for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k / 6 * Math.PI; pts.push(V3(Math.sin(a) * w, -Math.cos(a) * 4 + 4, zz)); } for (let k = 0; k < 6; k++) if (!(i > 8 && k > 3)) K.pole(pts[k], pts[k + 1], 0.22); }
    K.pole(V3(0, 0, -19), V3(0, 0, 19), 0.35); for (const side of [-1, 1]) for (let r = 1; r < 4; r++) K.pole(V3(side * 5.6 * Math.sin(r / 4 * Math.PI / 2 + 0.6), r * 1.6, -16), V3(side * 5 * Math.sin(r / 4 * Math.PI / 2 + 0.6), r * 1.6, 12), 0.18);
    K.pole(V3(0, 0, 4), V3(1.5, 14, 6), 0.4); K.pole(V3(0, 9, 5), V3(4, 8, 2), 0.2);
    const built = K.build(oldWoodM, grp); grp.position.set(wx, h + 0.6, wz); grp.rotation.set(0.12, 0.7, 0.28); S.add(grp);
    W.addBox(V3(wx, h + 3, wz), 6, 3, 18, 0.7); W.wreck = V3(wx, h + 3, wz);
    void built;
  }

  // ---------- Achziv: rocks, an arch, an islet ----------
  const rockG = new THREE.IcosahedronGeometry(1, 1);
  {
    const list = [], R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(5);
    for (let i = 0; i < 260; i++) { const x = ZONES.achziv.x + (R() - 0.5) * 300, z = ZONES.achziv.z + (R() - 0.5) * 300, h = W.heightAt(x, z); if (h > -1.5) continue; const s = 1 + R() * 4; const g = rockG.clone(); const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.8 + R() * 0.5), p.getY(k) * (0.6 + R() * 0.4), p.getZ(k) * (0.8 + R() * 0.5)); g.computeVertexNormals(); list.push(at(g.scale(s, s, s), x, h + s * 0.3, z, R() * 6)); if (s > 2.5) W.addSphere(V3(x, h + s * 0.3, z), s * 0.75); }
    // islet above water + an arch rock
    const isl = rockG.clone().scale(16, 9, 12); list.push(at(isl, ZONES.achziv.x - 60, 1, ZONES.achziv.z + 40)); W.addSphere(V3(ZONES.achziv.x - 60, 0, ZONES.achziv.z + 40), 11);
    merged(list, rockM);
  }

  // ---------- Rosh HaNikra: grottoes (tunnels in the white rock) ----------
  W.grottoes = [];
  {
    for (const [a, b] of TUNNELS) { const L = a.distanceTo(b), R = TR; const g = new THREE.CylinderGeometry(R, R, L, 18, 6, true); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const n = N.n2(p.getX(k) * 0.4 + a.x, p.getY(k) * 0.3 + p.getZ(k) * 0.4) * 0.8; p.setXYZ(k, p.getX(k) * (1 + n * 0.12), p.getY(k), p.getZ(k) * (1 + n * 0.12)); } g.computeVertexNormals();
      const outer = new THREE.CylinderGeometry(R + 3.5, R + 4.5, L - 1, 12, 2, false); const op = outer.attributes.position; for (let k = 0; k < op.count; k++) { const n = N.n2(op.getX(k) * 0.2 + b.x, op.getY(k) * 0.2) ; op.setXYZ(k, op.getX(k) * (1 + n * 0.25), op.getY(k), op.getZ(k) * (1 + n * 0.25)); } outer.computeVertexNormals();
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); const mid = a.clone().add(b).multiplyScalar(0.5);
      for (const gg of [g, outer]) { gg.applyQuaternion(q); gg.translate(mid.x, mid.y, mid.z); }
      const inner = new THREE.Mesh(g, chalkM); S.add(inner); const sh = new THREE.Mesh(outer, chalkM); sh.material = chalkM.clone(); sh.material.side = THREE.FrontSide; S.add(sh);
      W.addTube(a, b, R); W.grottoes.push({ a, b, mid });
    }
  }

  // ---------- the deep canyon: a sunken tribe tower from long ago ----------
  {
    const { x: kx, z: kz } = ZONES.canyon, h = W.heightAt(kx, kz), K = kit();
    for (let l = 0; l < 5; l++) { const y0 = h + l * 5, y1 = y0 + 5, hw = 4 - l * 0.4; const C = [[hw, hw], [-hw, hw], [-hw, -hw], [hw, -hw]].map(([a, b]) => V3(kx + a, y0, kz + b)), D = C.map(p => V3(p.x + (p.x > kx ? -0.4 : 0.4), y1, p.z + (p.z > kz ? -0.4 : 0.4)));
      for (let i = 0; i < 4; i++) { K.pole(C[i], D[i], 0.25); K.pole(D[i], D[(i + 1) % 4], 0.18); K.pole(C[i], D[(i + 1) % 4], 0.12); K.lash(D[i], 0.35); } }
    const grp = K.build(oldWoodM); grp.rotation.z = 0.25; grp.position.set(0, 0, 0);
    W.addBox(V3(kx, h + 12, kz), 4, 12, 4); W.sunkenTower = V3(kx, h + 26, kz); W.canyonFloor = V3(kx, h, kz);
  }

  // ---------- seagrass (posidonia) meadows: instanced swaying blades ----------
  {
    const blade = new THREE.PlaneGeometry(0.09, 1.4, 1, 4); blade.translate(0, 0.8, 0); const b2 = blade.clone().rotateY(Math.PI / 2), b3 = blade.clone().rotateY(Math.PI / 4);
    const clump = mergeGeometries([blade, b2, b3]);
    const gm = new THREE.MeshStandardMaterial({ color: 0x7aa84e, emissive: 0x1c3010, roughness: 0.9, side: THREE.DoubleSide });
    gm.onBeforeCompile = sh => { sh.uniforms.uTime = caus.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix * vec4(0.,0.,0.,1.); float k = position.y / 1.6; transformed.x += sin(uTime*1.3 + ip.x*0.3 + ip.z*0.2) * 0.35 * k * k; transformed.z += cos(uTime*1.1 + ip.z*0.3) * 0.2 * k * k;`); };
    const pts = []; let tries = 0;
    while (pts.length < 14000 && tries++ < 140000) { const x = X0 + Math.random() * (X1 - X0), z = Z0 + Math.random() * (Z1 - Z0), h = W.heightAt(x, z); if (h > -3 || h < -26) continue; if (N.fbm(x / 35 + 9, z / 35 - 4, 3) < 0.16) continue; pts.push([x, h, z]); }
    const im = new THREE.InstancedMesh(clump, gm, pts.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), col = new THREE.Color();
    pts.forEach(([x, h, z], i) => { const k = 0.7 + Math.random() * 0.9; q.setFromEuler(new THREE.Euler(0, Math.random() * 6, 0)); m.compose(V3(x, h - 0.1, z), q, s.set(k, k, k)); im.setMatrixAt(i, m); im.setColorAt(i, col.setHSL(0.22 + Math.random() * 0.06, 0.45, 0.5 + Math.random() * 0.15)); });
    S.add(im);
  }
  // ---------- urchins + starfish ----------
  {
    const ur = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshStandardMaterial({ color: 0x1b1420, roughness: 0.6, flatShading: true }), 700), m = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 4000 && n < 700; i++) { const x = X0 + Math.random() * (X1 - X0), z = Z0 + Math.random() * (Z1 - Z0), h = W.heightAt(x, z); if (h > -2 || h < -30) continue; const e = 3, sl = Math.abs(W.heightAt(x + e, z) - W.heightAt(x - e, z)) / 6; if (sl < 0.25 && !(z > 360 && z < 700)) continue; m.makeTranslation(x, h + 0.2, z); ur.setMatrixAt(n++, m); }
    ur.count = n; S.add(ur);
  }

  // ---------- update ----------
  W.update = (dt, t, cam) => {
    caus.uTime.value = t; wU.uTime.value = t;
    const k = 1 - Math.exp(-0.5 * dt);
    for (const key in target) { const tv2 = target[key]; if (typeof tv2 === 'string') cur[key].lerp(CC(tv2), k); else cur[key] += (tv2 - cur[key]) * k; }
    skyU.uTop.value.copy(cur.top); skyU.uHor.value.copy(cur.hor); skyU.uSunC.value.copy(cur.sun); skyU.uDim.value = cur.dim;
    const sd = V3(Math.cos(cur.el) * Math.sin(cur.az), Math.sin(cur.el), Math.cos(cur.el) * Math.cos(cur.az)).normalize(); skyU.uSun.value.copy(sd);
    wU.uSky.value.copy(cur.hor); wU.uDeep.value.copy(cur.water); wU.uFogU.value.copy(cur.fogU);
    const flash = G.flash || 0; G.flash = Math.max(0, flash - dt * 3);
    const under = cam.position.y < W.waveAt(cam.position.x, cam.position.z, t) - 0.05; W.under = under;
    const dep = Math.max(0, -cam.position.y);
    if (under) {
      S.fog = fogU; fogU.color.copy(cur.fogU).multiplyScalar(1 - Math.min(0.75, dep / 140)).lerp(CC('#ffffff'), flash * 0.3); fogU.near = 1; fogU.far = cur.farU * (1 - Math.min(0.45, dep / 200));
      S.background = fogU.color; dome.visible = false;
      hemi.color.set(0x9fdcf0); hemi.groundColor.set(0x6a7a6a); hemi.intensity = (cur.hi * 1.2 + flash) * (1 - Math.min(0.6, dep / 120));
      sun.intensity = cur.si * 0.75 * (1 - Math.min(0.7, dep / 90)); sun.color.set(0xd6f4ff);
    } else {
      S.fog = fogA; fogA.color.copy(cur.fogA).lerp(CC('#dfe8ff'), flash * 0.6); fogA.near = 250; fogA.far = cur.farA; S.background = null; dome.visible = true;
      hemi.color.copy(cur.hor).lerp(CC('#ffffff'), 0.5); hemi.groundColor.set(0x8a7a5a); hemi.intensity = cur.hi + flash * 2; sun.intensity = cur.si + flash * 4; sun.color.copy(cur.sun);
    }
    const p = G.swim ? G.swim.pos : cam.position; sun.target.position.copy(p); sun.position.copy(p).addScaledVector(sd, 250);
    dome.position.copy(cam.position);
    // god rays and marine snow follow the camera underwater
    for (const r of rays) { r.visible = under && dep < 60; if (!r.visible) continue; const u = r.userData; r.position.set(cam.position.x + u.ox, 0, cam.position.z + u.oz); r.lookAt(cam.position.x, 0, cam.position.z); r.material.opacity = (0.05 + Math.sin(t * 0.6 + u.ph) * 0.04) * (1 - dep / 60) * (W.skyName === 'storm' ? 0.3 : 1); if (Math.random() < dt * 0.05) { u.ox = (Math.random() - 0.5) * 70; u.oz = (Math.random() - 0.5) * 70; } }
    snow.visible = under; if (under) { const a = snowG.attributes.position, c = cam.position; for (let i = 0; i < snowN; i++) { let x = a.array[i * 3], y = a.array[i * 3 + 1], z = a.array[i * 3 + 2]; y -= dt * 0.15; x += Math.sin(t * 0.3 + i) * dt * 0.1;
      if (x < c.x - 30) x += 60; if (x > c.x + 30) x -= 60; if (y < c.y - 30) y += 60; if (y > c.y + 30) y -= 60; if (z < c.z - 30) z += 60; if (z > c.z + 30) z -= 60; a.array[i * 3] = x; a.array[i * 3 + 1] = Math.min(y, -0.3); a.array[i * 3 + 2] = z; } a.needsUpdate = true; }
    if (W.campFlag) { const f = W.campFlag, pa = f.mesh.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = f.base[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 1.3 - t * 5) * 0.25 * (x / 4); } pa.needsUpdate = true; }
  };
  G.world = W; return W;
}
