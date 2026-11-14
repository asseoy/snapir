// Story + missions of סנפיר: 4 chapters, 14 steps. Radio voices from the beach and the sea, objective with a
// marker, bubble rings, a raft to push home, a flag found by shark-sense, a dolphin race, a turtle in a net,
// reef clean-up, dark grottoes, the deep canyon, and the ghost net finale. Plus 24 hidden tribe treasures.
import * as THREE from 'three';
import { input } from './input.js';

const $ = id => document.getElementById(id);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export const TREASURES = ['צעיף השבט מ־1978', 'משרוקית של מדריך', 'דגל השכבה הבוגרת', 'מצפן של משלחת', 'חולצת תנועה מ־1991', 'סיכת ביג בן', 'מפת טיול מקופלת', 'כוס פח של מחנה', 'שיר מדורה בכתב יד', 'תמונה של הטיל 1986', 'קשר שטוח של בוגרים', 'ספר השבט הישן', 'פנס חנוכה', 'תג משלחת ים', 'כובע טמבל', 'מטבע מקיסריה', 'שרוך משרוקית אדום', 'פתק של חניך: "תחזור!"', 'דגל בית דני (אל תספרו להם)', 'אבן פסיפס', 'צדף זהב', 'בקבוק עם מכתב לשבט', 'מפתח למחסן הציוד', 'מגפון של הרכזת'];

export function createMissions(G, saved) {
  const S = G.scene, W = G.world, P = G.swim, X = G.fx, CR = G.creatures, Z = W.zones;
  const M = { step: saved.step || 0, found: saved.found || [], bestJump: saved.bestJump || 0 };
  // ---------- radio ----------
  const queue = []; let talking = null, talkT = 0;
  const who = { shira: ['שירה', 'רכזת הטיול', '#f3e03b'], itai: ['איתי', 'חניך', '#8fd0ff'], dana: ['דנה', 'חניכה', '#ffb07a'], kids: ['החניכים', 'מהחוף', '#ffb07a'], dakar: ['הדקר הזקן', 'חי בים 80 שנה', '#d8b07a'], galit: ['גלית', 'דולפינה', '#a8d8ff'], naama: ['נעמה', 'צבת ים', '#9fd890'] };
  M.say = (k, text, dur) => queue.push({ k, text, dur: dur || Math.max(3.2, text.length * 0.075) });
  function radio(dt) {
    if (!talking && queue.length) { talking = queue.shift(); talkT = talking.dur; const w = who[talking.k]; $('radio').classList.remove('hidden'); $('rName').textContent = w[0]; $('rName').style.color = w[2]; $('rRole').textContent = w[1]; $('rText').textContent = talking.text; G.sfx && G.sfx('radio'); }
    if (talking) { talkT -= dt; if (talkT <= 0 || (input.keys.Enter && talkT < talking.dur - 0.4)) { talking = null; if (!queue.length) $('radio').classList.add('hidden'); } }
  }
  // ---------- objective + marker ----------
  let obj = null;
  M.objective = (text, target) => { obj = { text, target }; $('objText').textContent = text; $('obj').classList.toggle('hidden', !text); };
  M.target = () => obj && obj.target ? (typeof obj.target === 'function' ? obj.target() : obj.target) : null;
  function marker() {
    const mk = $('marker'), t = M.target(); if (!t) { mk.classList.add('hidden'); return; }
    const p = t.clone().project(G.camera), d = t.distanceTo(P.pos); mk.classList.remove('hidden');
    let x = p.x, y = p.y; const behind = p.z > 1; if (behind) { x = -x; y = -y; }
    const off = Math.abs(x) > 0.92 || Math.abs(y) > 0.86 || behind; if (off) { const m = Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.86); x /= m; y /= m; }
    mk.style.left = ((x + 1) / 2 * innerWidth) + 'px'; mk.style.top = ((1 - y) / 2 * innerHeight) + 'px'; mk.classList.toggle('edge', off); $('mkDist').textContent = Math.round(d) + ' מ׳';
  }
  M.card = (over, title) => { $('cardOver').textContent = over; $('cardTitle').textContent = title; const c = $('card'); c.classList.remove('hidden'); c.style.opacity = 1; setTimeout(() => c.style.opacity = 0, 3400); setTimeout(() => c.classList.add('hidden'), 4200); };
  let toastT = 0; M.toast = (over, text) => { $('toastOver').textContent = over; $('toastText').textContent = text; $('toast').classList.remove('hidden'); toastT = 3; };

  // ---------- people on the beach ----------
  function makeKid(color = 0x3d6496) {
    const g = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ color: 0xd29f7a }), shirt = new THREE.MeshStandardMaterial({ color }), pants = new THREE.MeshStandardMaterial({ color: 0x4d4a3a });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), shirt); body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin); head.position.y = 1.65; g.add(head);
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 5, 10), new THREE.MeshStandardMaterial({ color: 0xa8121b })); sc.rotation.x = Math.PI / 2; sc.position.y = 1.38; g.add(sc);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 3, 6), pants); leg.position.set(s * 0.13, 0.4, 0); g.add(leg); const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.45, 3, 6), shirt); arm.position.set(s * 0.38, 1.25, 0); arm.rotation.z = s * 0.3; g.add(arm); g.userData['arm' + s] = arm; }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); S.add(g); return g;
  }
  const kids = [], kc = [0x3d6496, 0x2f7a4a, 0xb8582a, 0x6a4a8a, 0x3d6496, 0xc8a030, 0x2f7a4a];
  for (let i = 0; i < 7; i++) { const k = makeKid(kc[i]); const x = W.campBeach.x + 7 + (i % 4) * 1.6, z = W.campBeach.z - 6 + i * 2; k.position.set(x, W.heightAt(x, z), z); k.rotation.y = -Math.PI / 2; kids.push(k); }
  let cheerT = 0; M.cheer = (s = 3) => { cheerT = s; G.sfx && G.sfx('cheer'); };
  function kidsUpdate(dt) { cheerT = Math.max(0, cheerT - dt); kids.forEach((k, i) => { if (k.userData.onRaft) return; const up = cheerT > 0; k.userData.arm1.rotation.z = up ? 2.6 + Math.sin(G.t * 10 + i) * 0.4 : 0.3; k.userData['arm-1'].rotation.z = up ? -2.6 - Math.sin(G.t * 10 + i) * 0.4 : -0.3; k.position.y = W.heightAt(k.position.x, k.position.z) + (up ? Math.abs(Math.sin(G.t * 8 + i)) * 0.4 : 0); }); }
  // the camp flag only flies once Snapir brings it back
  W.campFlag.mesh.visible = M.step > 7;
  if (M.step > 4) G.shark.setRibbon(true);

  // ---------- treasures ----------
  const bottleG = (() => { const prof = [[0, 0], [0.22, 0], [0.24, 0.05], [0.24, 0.5], [0.12, 0.7], [0.08, 0.95], [0.1, 1.0]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(prof, 12); })();
  const glassM = new THREE.MeshStandardMaterial({ color: 0x8fd8c0, transparent: true, opacity: 0.6, roughness: 0.1, emissive: 0x2a6a5a, emissiveIntensity: 0.6 }), scrollM = new THREE.MeshStandardMaterial({ color: 0xf3e2b0, emissive: 0x7a6a30, emissiveIntensity: 0.5 });
  const treasures = [];
  {
    const Rr = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(424);
    const anchors = [W.wreck, W.outlet, ...W.ruins.slice(0, 5), W.sunkenTower, W.canyonFloor, ...W.grottoes.map(g => g.mid), V3(Z.achziv.x, 0, Z.achziv.z), V3(Z.achziv.x - 80, 0, Z.achziv.z + 60), V3(Z.achziv.x + 40, 0, Z.achziv.z - 90), V3(-400, 0, -100), V3(-650, 0, 500), V3(-300, 0, 800), V3(-800, 0, -500), V3(-200, 0, -850), V3(-500, 0, 100), V3(-150, 0, 300), V3(-700, 0, 850), V3(-900, 0, 0), V3(-350, 0, -600)];
    for (let i = 0; i < TREASURES.length; i++) { const a = anchors[i % anchors.length]; let x = a.x + (Rr() - 0.5) * 16, z = a.z + (Rr() - 0.5) * 16; let h = W.heightAt(x, z); for (let k = 0; k < 20 && h > -2; k++) { x -= 4; h = W.heightAt(x, z); }
      const inG = W.grottoes.some(g => g.mid === a); const y = inG ? a.y - 3.5 : h + 0.5;
      const g = new THREE.Group(); const b = new THREE.Mesh(bottleG, glassM); b.rotation.z = Math.PI / 2 - 0.2; const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), scrollM); sc.rotation.z = Math.PI / 2; sc.position.set(-0.3, 0.2, 0); g.add(b, sc); g.scale.setScalar(1.6); g.position.set(x, y, z); S.add(g);
      const got = M.found.includes(i); g.visible = !got; treasures.push({ i, g, p: V3(x, y + 0.3, z), got }); }
  }
  const tUI = () => { $('treasures').textContent = `אוצרות השבט ${M.found.length}/${TREASURES.length}`; }; tUI();
  M.treasureList = () => TREASURES.map((n, i) => ({ n, got: M.found.includes(i) }));
  let senseT = 0;
  function treasuresUpdate(dt) {
    for (const t of treasures) { if (t.got) continue; t.g.rotation.y += dt * 0.5; if (senseT > 0 && t.p.distanceTo(P.pos) < 130 && Math.random() < dt * 8) X.glowAt(t.p, [0.6, 1, 0.8], 0.9);
      if (t.p.distanceTo(P.pos) < 2.8) { t.got = true; t.g.visible = false; M.found.push(t.i); X.burst(t.p, 40, [0.6, 1, 0.8]); G.sfx && G.sfx('treasure'); M.toast(`אוצר ${M.found.length}/${TREASURES.length}`, TREASURES[t.i]); tUI(); G.save && G.save(); } }
  }

  // ---------- hidden things revealed by shark-sense ----------
  const hidden = [];
  function hide(obj, p) { obj.visible = false; const h = { obj, p, seen: false }; hidden.push(h); return h; }
  G.onSense = () => { X.pulse(P.pos); G.sfx && G.sfx('sense'); senseT = 8; for (const h of hidden) if (h.p.distanceTo(P.pos) < 120 && !h.seen) { h.seen = true; h.obj.visible = true; X.burst(h.p, 50, [0.5, 1, 1]); } };

  // ---------- carrying ----------
  const carryables = [];
  G.onBite = () => {
    const m = G.shark.mouth || P.pos;
    if (P.carry) { const c = carryables.find(o => o.obj === P.carry); P.carry = null; if (c) { c.held = false; c.drop = 1; } return; }
    for (const c of carryables) if (c.obj.visible && !c.done && c.obj.position.distanceTo(m) < 3.2) { P.carry = c.obj; c.held = true; G.sfx && G.sfx('pickup'); return; }
    if (biteHook && biteHook(m)) return;
    if (CR.tryEat(m)) { P.stamina = Math.min(1, P.stamina + 0.25); G.sfx && G.sfx('gulp'); M.eaten = (M.eaten || 0) + 1; }
  };
  let biteHook = null;
  function carryUpdate(dt) { for (const c of carryables) { if (c.held || c.done || !c.obj.visible) continue; if (c.drop > 0) { const h = W.heightAt(c.obj.position.x, c.obj.position.z) + 0.4; c.obj.position.y = Math.max(h, c.obj.position.y - dt * 1.5); } } }

  // ---------- jumps ----------
  G.onBreach = (b) => {
    if (b.height < 0.8) return;
    const txt = `קפיצה! ${b.height.toFixed(1)} מ׳` + (b.spins ? ` · ${b.spins} סיבוב${b.spins > 1 ? 'ים' : ''}` : ''); $('trick').textContent = txt; $('trick').classList.remove('hidden'); clearTimeout(M._tr); M._tr = setTimeout(() => $('trick').classList.add('hidden'), 1800);
    if (b.height > M.bestJump) { M.bestJump = b.height; }
    const nearCamp = P.pos.distanceTo(W.campBeach) < 140; if (nearCamp) M.cheer(2.5);
    M.lastBreach = { ...b, nearCamp };
  };
  G.onSting = () => { if (Math.random() < 0.5) M.say('dakar', 'מדוזה! נוודית – הן שורפות. תעקוף אותן.', 3); };

  // ---------- bubble rings (the warm current) ----------
  const rings = [];
  const ringM = new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x9fe8ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false });
  function ring(p, yaw, r = 4.2) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.25, 8, 32), ringM.clone()); m.position.copy(p); m.rotation.y = yaw; S.add(m); const o = { m, p: p.clone(), n: V3(Math.sin(yaw), 0, Math.cos(yaw)), r, passed: false, prev: null }; rings.push(o); return o; }
  function clearRings() { for (const r of rings) S.remove(r.m); rings.length = 0; }
  function ringsUpdate(dt) {
    const next = rings.find(r => !r.passed);
    rings.forEach(r => { r.m.visible = !r.passed; r.m.material.emissiveIntensity = r === next ? 1.6 + Math.sin(G.t * 6) * 0.5 : 0.4; if (r === next && Math.random() < dt * 20) { const a = Math.random() * 6.28; X.bubble(r.p.clone().add(V3(Math.cos(a) * r.r, Math.sin(a) * r.r, 0).applyAxisAngle(V3(0, 1, 0), r.m.rotation.y)), 1, 0.2); } });
    if (!next) return true;
    const rel = P.pos.clone().sub(next.p), side = rel.dot(next.n);
    if (next.prev !== null && Math.sign(side) !== Math.sign(next.prev) && rel.length() < next.r + 2) { next.passed = true; X.burst(next.p, 30, [0.7, 0.95, 1]); G.sfx && G.sfx('ring'); }
    next.prev = side; return false;
  }
  const ringsLine = (pts) => { clearRings(); pts.forEach((p, i) => { const n = pts[Math.min(pts.length - 1, i + 1)], pr = pts[Math.max(0, i - 1)]; ring(p, Math.atan2(n.x - pr.x, n.z - pr.z)); }); };
  M.nextRing = () => { const r = rings.find(r => !r.passed); return r ? r.p : null; };

  // ---------- the raft ----------
  let raft = null;
  function makeRaft() {
    const K = W.kit(), grp = new THREE.Group();
    for (let i = 0; i < 6; i++) K.pole(V3(-1.6, 0, -1.8 + i * 0.7), V3(1.6, 0, -1.8 + i * 0.7), 0.32);
    for (const x of [-1.2, 1.2]) { K.pole(V3(x, 0.3, -2.1), V3(x, 0.3, 2.1), 0.14); for (let i = 0; i < 6; i++) K.lash(V3(x, 0.15, -1.8 + i * 0.7), 0.35); }
    K.pole(V3(0, 0.3, 0.6), V3(0, 3.6, 0.6), 0.12); K.build(W.mats.woodM, grp);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshStandardMaterial({ map: W.flagTex, side: THREE.DoubleSide, roughness: 0.9 })); sail.position.set(0.95, 2.3, 0.6); sail.rotation.y = Math.PI / 2; grp.add(sail);
    const rk = [kids[0], kids[2], kids[5]]; rk.forEach((k, i) => { k.userData.onRaft = true; S.remove(k); grp.add(k); k.position.set(-0.8 + i * 0.8, 0.3, -0.8 + (i % 2) * 0.9); k.rotation.y = i; k.scale.setScalar(0.9); });
    S.add(grp); raft = { grp, kids: rk, vel: V3(), pos: V3(W.campBeach.x - 160, 0, W.campBeach.z - 50) }; grp.position.copy(raft.pos); return raft;
  }
  function raftUpdate(dt) {
    const r = raft; r.vel.x -= dt * 0.35; r.vel.z += Math.sin(G.t * 0.2) * dt * 0.1; r.vel.multiplyScalar(Math.exp(-0.4 * dt));
    const rel = r.pos.clone().sub(P.pos); rel.y = 0; const d = rel.length();
    let pushing = false;
    if (d < 4.2 && P.pos.y > -4 && P.speed > 2.5) { const f = P.forward(); f.y = 0; f.normalize(); if (rel.normalize().dot(f) > 0.3) { r.vel.addScaledVector(f, dt * (1.3 + P.speed * 0.12)); pushing = true; } }
    if (r.vel.length() > 4) r.vel.setLength(4);
    r.pos.addScaledVector(r.vel, dt); const h = W.heightAt(r.pos.x, r.pos.z); if (h > -0.8) { r.pos.x -= 0.3; r.vel.x = Math.min(0, r.vel.x); }
    r.pos.y = W.waveAt(r.pos.x, r.pos.z, G.t) + 0.1; r.grp.position.copy(r.pos); r.grp.rotation.set(Math.sin(G.t * 1.3) * 0.06, Math.atan2(r.vel.x, r.vel.z) * 0.15, Math.cos(G.t * 1.1) * 0.06);
    r.kids.forEach((k, i) => { k.userData.arm1.rotation.z = 2.4 + Math.sin(G.t * 7 + i) * 0.5; });
    if (pushing && Math.random() < dt * 6) X.wake(r.pos.clone().add(V3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), r.vel);
    return pushing;
  }

  // ---------- flag in the sand (Caesarea) ----------
  let seaFlag = null;
  function makeSeaFlag() {
    const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), W.mats.woodM); pole.rotation.z = Math.PI / 2; g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ map: W.flagTex, side: THREE.DoubleSide, roughness: 0.9, emissive: 0x222222 })); cloth.position.set(0.3, -0.55, 0); g.add(cloth);
    const x = Z.caesarea.x + 28, z = Z.caesarea.z + 18, h = W.heightAt(x, z); g.position.set(x, h + 0.35, z); g.rotation.y = 0.6; S.add(g);
    const c = { obj: g, held: false, done: false, drop: 0 }; carryables.push(c); seaFlag = { g, c, h: hide(g, g.position.clone()) }; return seaFlag;
  }

  // ---------- turtle in a ghost net ----------
  let netT = null;
  function makeTurtleNet() {
    const base = V3(Z.caesarea.x - 85, 0, Z.caesarea.z + 75); base.y = W.heightAt(base.x, base.z) + 3;
    const turtle = CR.makeTurtle(); turtle.position.copy(base); turtle.scale.setScalar(1.3);
    const net = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2a4a3a, wireframe: true, transparent: true, opacity: 0.9 })); net.position.copy(base); S.add(net);
    const knots = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; const k = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe06a20, emissive: 0x803010, emissiveIntensity: 0.6 })); k.position.copy(base).add(V3(Math.cos(a) * 2.6, Math.sin(a * 2) * 1.2, Math.sin(a) * 2.6)); S.add(k); knots.push({ k, cut: false }); }
    netT = { turtle, net, knots, base, free: false, t: 0 };
  }
  function cutKnot(list, m, r = 2.8) { for (const k of list) if (!k.cut && k.k.position.distanceTo(m) < r) { k.cut = true; S.remove(k.k); X.burst(k.k.position, 30, [1, 0.6, 0.3]); G.sfx && G.sfx('snip'); return true; } return false; }

  // ---------- reef trash ----------
  const trash = [];
  function makeTrash() {
    const bm = new THREE.MeshStandardMaterial({ color: 0x9fd0e8, transparent: true, opacity: 0.75, roughness: 0.2 }), bagM = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const Rr = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(31);
    for (let i = 0; i < 10; i++) { let x = Z.achziv.x + (Rr() - 0.5) * 220, z = Z.achziv.z + (Rr() - 0.5) * 200, h = W.heightAt(x, z); for (let k = 0; k < 20 && h > -2.5; k++) { x -= 5; h = W.heightAt(x, z); }
      const m = i % 2 ? new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8), bm) : new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1, 3, 3), bagM); m.position.set(x, h + 0.6 + (i % 3) * 1.5, z); m.rotation.set(Rr() * 3, Rr() * 3, Rr() * 3); S.add(m); trash.push({ m, got: false }); }
  }

  // ---------- grotto map, canyon capsule ----------
  let mapBottle = null, capsule = null;
  function makeMap() { const g = new THREE.Group(); const b = new THREE.Mesh(bottleG, glassM.clone()); b.material.color.set(0xd8b060); b.rotation.z = Math.PI / 2; g.add(b); g.scale.setScalar(2); const gm = W.grottoes[2]; g.position.copy(gm.mid).add(V3(0, -2.2, 0)); S.add(g); mapBottle = { g, h: hide(g, g.position.clone()), c: { obj: g, held: false, done: false, drop: 0 } }; carryables.push(mapBottle.c); }
  function makeCapsule() { const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 })); const band = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.15, 1.05), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.6, roughness: 0.4, emissive: 0x403010 })); g.add(box, band); g.position.copy(W.canyonFloor).add(V3(7, 1.2, 3)); g.position.y = W.heightAt(g.position.x, g.position.z) + 0.5; S.add(g); capsule = { g, c: { obj: g, held: false, done: false, drop: 0 } }; carryables.push(capsule.c); }

  // ---------- the ghost net finale ----------
  let ghost = null;
  function makeGhostNet() {
    const o = W.outlet, c = V3(o.x - 110, -6, o.z); const g = new THREE.Group(); g.position.copy(c); S.add(g);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(36, 14, 18, 7), new THREE.MeshBasicMaterial({ color: 0x23392e, wireframe: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); net.rotation.y = Math.PI / 2; g.add(net);
    const ropes = []; for (let i = 0; i < 6; i++) { const z = -15 + i * 6; const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x803000, emissiveIntensity: 0.5 })); buoy.position.set(0, 6.3, z); g.add(buoy); ropes.push({ k: buoy, cut: false, local: V3(0, 6.3, z) }); }
    const caught = CR.sharks.slice(0, 3).map((s, i) => { const bundle = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0x23392e, wireframe: true })); S.add(bundle); return { s, bundle, hp: 1, free: false, i }; });
    ghost = { g, net, ropes, caught, c, phase: 0 };
  }
  function ghostUpdate(dt) {
    const gh = ghost, o = W.outlet;
    if (gh.phase === 0) { const target = V3(o.x - 30, -6, o.z); gh.c.lerp(target, 1 - Math.exp(-0.02 * dt)); gh.c.x = Math.min(gh.c.x + dt * 0.6, target.x); gh.g.position.copy(gh.c); gh.g.position.y = -6 + Math.sin(G.t * 0.5) * 0.4;
      gh.net.geometry.attributes.position.array.forEach((v, i, a) => { if (i % 3 === 2) a[i] = Math.sin(G.t * 1.2 + i * 0.1) * 0.6; }); gh.net.geometry.attributes.position.needsUpdate = true;
      // touching the net slows you down
      const lp = gh.g.worldToLocal(P.pos.clone()); if (Math.abs(lp.x) < 1.6 && Math.abs(lp.y) < 7 && Math.abs(lp.z) < 18 && P.slow < 0.5) { P.slow = 1.5; G.sfx && G.sfx('sting'); M.say('dakar', 'זהירות! אל תיגע ברשת – תחתוך את החבלים של המצופים למעלה!', 3); } }
    gh.caught.forEach((c, i) => { if (c.free) return; if (!c.anchor || gh.phase === 0) c.anchor = gh.g.position.clone().add(V3(0, -2 + i * 2.5, -8 + i * 8)); c.s.follow = () => { const p = c.anchor.clone().add(V3(Math.sin(G.t * 3 + i) * 0.3, 0, 0)); p.y = Math.min(-2, Math.max(p.y, W.heightAt(p.x, p.z) + 2.5)); return p; }; c.bundle.position.copy(c.s.root.position); });
  }

  // ---------- the script ----------
  let stepT = 0, fl = {}, started = -1;
  const go = n => { M.step = n; stepT = 0; fl = {}; started = -1; biteHook = null; G.save && G.save(); };
  M.go = go; M._raft = () => raft;
  const camp = () => W.campBeach.clone().add(V3(-4, -1, 0));
  const STEPS = [
    // 0: intro
    { start() { G.cine = true; M.objective(''); W.setSky('day'); P.place(V3(W.outlet.x - 25, -4, W.outlet.z), -Math.PI / 2); },
      update(dt) { const t = stepT, cam = G.camera, cb = W.campBeach;
        if (t < 9) { cam.position.set(cb.x + 30 - t * 2, 7 + t * 0.3, cb.z + 22 - t * 3); cam.lookAt(cb.x - 40, 0, cb.z - 30); }
        else { const o = W.outlet; cam.position.set(o.x - 10 + Math.sin(t * 0.2) * 12, -2.5, o.z + 14); cam.lookAt(P.pos); }
        if (t > 0.8 && !fl.a) { fl.a = 1; M.card('שבט הנשיא מציג', 'סנפיר'); }
        if (t > 3.5 && !fl.b) { fl.b = 1; M.say('shira', 'זה הטיול החורפי של השבט לחדרה. כל חורף הכרישים באים למים החמים של תחנת הכוח.'); M.say('itai', 'תראו! הקטן שם – עם הסנפיר העקום! בואו נקרא לו סנפיר!'); M.say('dakar', 'אז אתה סנפיר. נעים מאוד. אני הדקר הזקן, ואני אלמד אותך את הים.'); }
        if (t > 16) { G.cine = false; go(1); } } },
    // 1: warm current rings
    { start() { M.card('פרק 1', 'המים החמים'); const o = W.outlet; const pts = [[-12, -3, 8], [-30, -4, 18], [-55, -5, 6], [-75, -4, -25], [-70, -3, -55], [-40, -4, -68], [-10, -3, -50], [5, -2.5, -20]].map(([dx, y, dz]) => V3(o.x + dx, Math.max(y, W.heightAt(o.x + dx, o.z + dz) + 2.2), o.z + dz)); ringsLine(pts);
        M.say('dakar', 'עקוב עם העכבר לאן שאתה רוצה לשחות. W – מהר יותר, Shift – זינוק. שחה דרך טבעות הבועות של הזרם החם.'); M.objective('שחה דרך טבעות הבועות', () => M.nextRing()); },
      update(dt) { if (ringsUpdate(dt)) { clearRings(); M.say('dakar', 'יפה! יש לך זנב חזק.'); go(2); } } },
    // 2: eat
    { start() { M.eaten = 0; M.say('dakar', 'כריש צעיר צריך כוח. תפוס 5 דגים – לחיצה על העכבר כשהם ליד הפה.'); M.objective('תפוס 5 דגים (0/5)', () => CR.nearestFish(P.pos)); },
      update() { $('objText').textContent = `תפוס 5 דגים (${Math.min(5, M.eaten)}/5)`; if (M.eaten >= 5) { M.say('dakar', 'מצוין. דגים נותנים לך כוח לזינוק.'); go(3); } } },
    // 3: jumps for the kids
    { start() { M.jumps = 0; M.lastBreach = null; M.say('kids', 'סנפיר! סנפיר! תקפוץ!'); M.say('dakar', 'החניכים על החוף רוצים הופעה. שחה מהר כלפי מעלה – ותזנק מהמים. A ו־D מסובבים באוויר.'); M.objective('קפוץ 3 פעמים מול החוף (0/3)', camp); },
      update() { if (M.lastBreach) { const b = M.lastBreach; M.lastBreach = null; if (b.nearCamp) { M.jumps++; $('objText').textContent = `קפוץ 3 פעמים מול החוף (${M.jumps}/3)`; if (b.spins) M.say('itai', 'וואו! סלטה!', 2); } else M.say('dakar', 'יותר קרוב לחוף – שיראו אותך!', 2.5); }
        if (M.jumps >= 3) { M.say('shira', 'חחח, אף פעם לא ראיתי כריש עושה הופעה.'); go(4); } } },
    // 4: storm – the raft
    { start() { W.setSky('storm'); G.flash = 1; G.sfx && G.sfx('thunder'); makeRaft(); M.say('shira', 'סערה! הרפסודה שהחניכים בנו – הרוח סוחפת אותה לים! איתי, דנה ורוני עליה!'); M.say('dakar', 'סנפיר! שחה אליה ודחוף אותה עם האף בחזרה לחוף!');
        M.objective('דחוף את הרפסודה בחזרה לחוף', () => fl.reached ? camp() : raft.pos); },
      update(dt) { const pushing = raftUpdate(dt); if (!fl.reached && raft.pos.distanceTo(P.pos) < 10) { fl.reached = 1; M.say('dana', 'כריש!!! רגע... הוא עוזר לנו?!'); M.say('dakar', 'תשחה מאחוריה ותדחוף בכיוון החוף.'); }
        if (fl.reached && pushing) G.prompt('דוחף…'); if (Math.random() < dt * 0.25) { G.flash = 0.8; G.sfx && G.sfx('thunder'); }
        if (raft.pos.distanceTo(W.campBeach) < 30) { M.cheer(5); W.setSky('day'); raft.vel.set(0, 0, 0); M.say('kids', 'הצלת אותנו!!! סנפיר!'); M.say('shira', 'קשרנו לך את סרט השבט על הסנפיר. עכשיו אתה שלנו.'); G.shark.setRibbon(true); X.burst(P.pos, 60, [1, 0.8, 0.3]); M.say('itai', 'אבל הדגל! הדגל של השבט נפל למים בסערה – והזרם לקח אותו צפונה, לקיסריה!'); go(5); } } },
    // 5: chapter 2 – sense the flag in the sand
    { start() { M.card('פרק 2', 'העיר שטבעה'); if (raft) raft.vel.set(0, 0, 0); makeSeaFlag(); M.say('dakar', 'קיסריה. פעם הייתה פה עיר. הדגל קבור איפשהו בחול בין העמודים.'); M.say('dakar', 'לכרישים יש חוש שאין לאף אחד – אנחנו מרגישים חשמל. לחץ Q ליד העמודים ותראה מה מסתתר.'); M.objective('מצא את דגל השבט בקיסריה (Q = חוש כריש)', () => seaFlag.h.seen ? seaFlag.g.position : V3(Z.caesarea.x, -6, Z.caesarea.z)); },
      update() { if (seaFlag.h.seen && !fl.seen) { fl.seen = 1; M.say('dakar', 'הנה! תרים אותו בפה – לחיצה על העכבר.'); M.objective('הרם את הדגל (לחיצה)', () => seaFlag.g.position); } if (P.carry === seaFlag.g) go(6); } },
    // 6: bring the flag home
    { start() { M.say('dakar', 'עכשיו תחזיר אותו לחוף של השבט, בחדרה. לחיצה נוספת משחררת.'); M.objective('החזר את הדגל לחוף בחדרה', () => P.carry === seaFlag.g ? camp() : seaFlag.g.position); },
      update() { if (P.carry === seaFlag.g && P.pos.distanceTo(W.campBeach) < 28) { P.carry = null; seaFlag.c.done = true; S.remove(seaFlag.g); W.campFlag.mesh.visible = true; M.cheer(5); X.burst(W.campFlag.pole.clone().setY(8), 60, [1, 0.8, 0.3]); M.say('kids', 'הדגל חזר!!!'); M.say('shira', 'מניפים את הדגל! סנפיר, אתה החניך הכי טוב שהיה לנו.'); go(7); } } },
    // 7: Galit's race
    { start() { const d = CR.dolphins[0]; d.userData.race = true; d.position.copy(P.pos).add(V3(-6, 0, 4)); fl.s = 0;
        const o = Z.caesarea, ar = W.arches || []; const pts = [V3(P.pos.x - 30, -3, P.pos.z + 40), V3(-160, -4, -250), V3(-170, -3, -140), V3(-140, -4, -60), ...(ar.map(a => a.p.clone())), V3(o.x - 40, -3, o.z + 70), V3(o.x - 10, -2.5, o.z + 120)].map(p => { p.y = Math.max(p.y, W.heightAt(p.x, p.z) + 2.5); return p; }); ringsLine(pts);
        fl.curve = new THREE.CatmullRomCurve3([d.position.clone(), ...pts.map(p => p.clone()), pts[pts.length - 1].clone().add(V3(0, 0, 20))]); fl.len = fl.curve.getLength(); fl.t0 = stepT;
        M.say('galit', 'היי, כריש עם סרט! אני גלית. אומרים שאתה מהיר... מרוץ עד קיסריה דרך הקשתות?'); M.objective('מרוץ! עבור בכל הטבעות לפני גלית', () => M.nextRing()); },
      update(dt) { const d = CR.dolphins[0]; const done = ringsUpdate(dt), my = rings.filter(r => r.passed).length / rings.length; const sp = (9.5 + Math.min(2.5, (stepT - fl.t0) * 0.08)) * (my > fl.s ? 1.05 : 0.8); fl.s = Math.min(1, fl.s + sp * dt / fl.len);
        const p = fl.curve.getPointAt(fl.s), a = fl.curve.getPointAt(Math.min(1, fl.s + 0.005)); d.position.copy(p); d.lookAt(a); d.userData.U.uPh.value += dt * 12;
        if (done && !fl.end) { fl.end = 1; clearRings(); d.userData.race = false; M.say('galit', 'וואו! ניצחת! אתה באמת מהיר.'); M.say('galit', 'תקשיב – יש צבה שנתקעה ברשת דייגים ישנה, מצפון לקשתות. היא לא יכולה לעלות לנשום! בוא מהר!'); go(8); }
        if (fl.s >= 1 && !fl.end) { fl.end = 1; M.say('galit', 'חחח, הגעתי ראשונה! עוד סיבוב?'); M.say('dakar', 'השתמש בזינוק (Shift) בישורות.'); setTimeout(() => go(7), 3000); } } },
    // 8: free the turtle
    { start() { makeTurtleNet(); biteHook = m => cutKnot(netT.knots, m); M.objective('חתוך את 5 הקשרים הכתומים של הרשת (לחיצה)', () => { const k = netT.knots.find(k => !k.cut); return k ? k.k.position : null; }); },
      update(dt) { const left = netT.knots.filter(k => !k.cut).length; if (left) { $('objText').textContent = `חתוך את הקשרים הכתומים של הרשת (${5 - left}/5)`; C2(); return; }
        if (!fl.free) { fl.free = 1; biteHook = null; S.remove(netT.net); M.say('naama', 'חופשייה! תודה, כריש קטן. אני נעמה. אני זוכרת את השבט שלך – הם תמיד אוספים זבל מהחוף.'); M.say('dakar', 'סיימת את הדרום. הגיע הזמן לצפון – אכזיב.'); }
        netT.t += dt; netT.turtle.position.y += dt * 2.5; netT.turtle.rotation.x = -0.6; CR.flapTurtle(netT.turtle, G.t, 2); if (netT.turtle.position.y > -0.5 || netT.t > 6) { S.remove(netT.turtle); go(9); }
        function C2() { CR.flapTurtle(netT.turtle, G.t, 3); netT.turtle.position.x = netT.base.x + Math.sin(G.t * 9) * 0.1; } C2(); } },
    // 9: chapter 3 – clean the reef
    { start() { M.card('פרק 3', 'הצפון'); makeTrash(); biteHook = m => { const t = trash.find(t => !t.got && t.m.position.distanceTo(m) < 3); if (!t) return false; t.got = true; S.remove(t.m); X.burst(t.m.position, 20, [0.8, 1, 0.8]); G.sfx && G.sfx('pickup'); return true; };
        M.say('dakar', 'שונית אכזיב. פעם היו פה אלפי דגים. היום – שקיות ובקבוקים.'); M.say('shira', 'השבט עושה ניקיון חופים כל שנה. סנפיר, תעזור לנו מהצד שלך?'); M.objective('נקה 10 פריטי זבל מהשונית (0/10)', () => { const t = trash.find(t => !t.got); return t ? t.m.position : null; }); },
      update() { const n = trash.filter(t => t.got).length; $('objText').textContent = `נקה 10 פריטי זבל מהשונית (${n}/10)`; if (n >= 10) { M.say('dakar', 'השונית נושמת שוב. כל הכבוד.'); M.say('shira', 'יש אגדה בשבט: ב־1984 מתקן של השבט נסחף לים וטבע. אומרים שבתוכו קופסת זמן... והמפה אליה – באחת המערות של ראש הנקרה.'); go(10); } } },
    // 10: grottoes – the map
    { start() { makeMap(); M.say('dakar', 'המערות חשוכות. היכנס מהפתח – ושם החוש שלך שווה יותר מעיניים. Q!'); const entrance = gr => { const ax = gr.b.clone().sub(gr.a).normalize(); const ea = gr.a.clone().addScaledVector(ax, -7), eb = gr.b.clone().addScaledVector(ax, 7); [ea, eb].forEach(e => e.y = -2.2); return ea.distanceTo(P.pos) < eb.distanceTo(P.pos) ? ea : eb; };
        M.objective('מצא את המפה במערות ראש הנקרה', () => { const gr = mapBottle.h.seen ? W.grottoes[2] : W.grottoes[fl.g || 0]; const ci = W.tubeIndex(P.pos); if (ci >= 0 && W.grottoes[ci] !== gr) return entrance(W.grottoes[ci]); const e = entrance(gr); if (ci < 0 && e.distanceTo(P.pos) > 7) return e; return mapBottle.h.seen && gr === W.grottoes[2] ? mapBottle.g.position : gr.mid; }); },
      update() { if (!mapBottle.h.seen) { const g = W.grottoes[fl.g || 0]; if (P.pos.distanceTo(g.mid) < 9 && W.inTube(P.pos) && (fl.g || 0) < 2) { fl.g = (fl.g || 0) + 1; if (fl.g === 1) M.say('dakar', 'לא כאן... נסה את המערה הבאה.'); } }
        if (mapBottle.h.seen && !fl.seen) { fl.seen = 1; M.say('dakar', 'בקבוק! תרים אותו.'); }
        if (P.carry === mapBottle.g) { P.carry = null; mapBottle.c.done = true; S.remove(mapBottle.g); M.toast('נמצא', 'המפה לקופסת הזמן של 1984'); M.say('dakar', 'המפה מראה... את הקניון העמוק. מקום שאף כריש צעיר לא ירד אליו. אתה מוכן?'); go(11); } } },
    // 11: the deep canyon – time capsule
    { start() { makeCapsule(); M.objective('רד לקניון העמוק ומצא את קופסת הזמן', () => capsule.c.held ? camp() : capsule.g.position); },
      update() { if (P.pos.y < -45 && !fl.deep) { fl.deep = 1; M.say('dakar', 'חושך... אבל תראה – הים זוהר כאן.'); } if (P.pos.distanceTo(W.canyonFloor) < 70 && Math.random() < 0.4) X.glowAt(P.pos.clone().add(V3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40)), [0.3, 0.9, 1], 0.6);
        if (P.carry === capsule.g && !fl.got) { fl.got = 1; M.say('dakar', 'קופסת הזמן של השבט! קח אותה לחוף.'); $('objText').textContent = 'הבא את קופסת הזמן לחוף בחדרה'; }
        if (P.carry === capsule.g && P.pos.distanceTo(W.campBeach) < 28) { P.carry = null; capsule.c.done = true; S.remove(capsule.g); M.cheer(5); M.say('kids', 'קופסת הזמן! מ־1984!'); M.say('shira', 'יש פה מכתב: "לחניכים של העתיד – תשמרו על הים, והים ישמור עליכם." אני בוכה.'); go(12); } } },
    // 12: chapter 4 – the ghost net
    { start() { M.card('פרק 4', 'הרשת'); W.setSky('storm'); makeGhostNet(); biteHook = m => { const r = ghost.ropes.find(r => !r.cut && r.k.getWorldPosition(new THREE.Vector3()).distanceTo(m) < 3); if (r) { r.cut = true; r.k.visible = false; X.burst(r.k.getWorldPosition(new THREE.Vector3()), 30, [1, 0.6, 0.3]); G.sfx && G.sfx('snip'); return true; }
          const c = ghost.caught.find(c => !c.free && c.s.root.position.distanceTo(m) < 4.5 && ghost.phase === 1); if (c) { c.hp -= 0.34; X.burst(c.bundle.position, 15, [0.7, 0.9, 0.8]); G.sfx && G.sfx('snip'); if (c.hp <= 0) { c.free = true; S.remove(c.bundle); c.s.follow = null; M.say('dakar', 'עוד כריש חופשי!', 2); } return true; } return false; };
        M.say('dakar', 'סנפיר! רשת רפאים – רשת דייגים ענקית שאבדה בים – נסחפת לכיוון המים החמים! שלושה כרישים כבר נתקעו בה!'); M.say('dakar', 'חתוך את החבלים של 6 המצופים הכתומים למעלה. ואל תיגע ברשת עצמה!');
        M.objective('חתוך את 6 המצופים של רשת הרפאים', () => { const r = ghost.ropes.find(r => !r.cut); return r ? r.k.getWorldPosition(new THREE.Vector3()) : null; }); },
      update(dt) { ghostUpdate(dt); const left = ghost.ropes.filter(r => !r.cut).length;
        if (ghost.phase === 0) { $('objText').textContent = `חתוך את המצופים של רשת הרפאים (${6 - left}/6)`; if (!left) { ghost.phase = 1; M.say('dakar', 'הרשת שוקעת! עכשיו – שחרר את הכרישים שנתקעו. נשוך את הרשת שעליהם, כמה פעמים.'); M.objective('שחרר את 3 הכרישים הלכודים', () => { const c = ghost.caught.find(c => !c.free); return c ? c.s.root.position : null; }); } }
        else { if (ghost.g.position.y > W.heightAt(ghost.g.position.x, ghost.g.position.z) - 8) ghost.g.position.y -= dt * 1.2; ghost.net.material.opacity = Math.max(0, ghost.net.material.opacity - dt * 0.1); const n = ghost.caught.filter(c => c.free).length; $('objText').textContent = `שחרר את הכרישים הלכודים (${n}/3)`; if (n >= 3) { S.remove(ghost.g); go(13); } } } },
    // 13: ending
    { start() { G.cine = true; M.objective(''); W.setSky('sunset'); M.cheer(20);
        M.say('dakar', 'עשית את זה, סנפיר. הים שלך עכשיו.'); M.say('shira', 'שבט שלם על החוף ראה כריש קטן מציל את כולם.'); M.say('itai', 'סנפיר! תבוא גם בחורף הבא?'); M.say('kids', 'מה שבונים ביחד – חי. ומה ששומרים ביחד – נשאר.', 5); },
      update(dt) { const t = stepT, cam = G.camera, cb = W.campBeach; cam.position.set(cb.x - 25 + Math.sin(t * 0.15) * 10, 4, cb.z + 18); cam.lookAt(cb.x - 45, 0, cb.z - 4);
        // Snapir leaps in front of the beach, again and again
        const ph = (t % 4) / 4, x = cb.x - 45 + Math.sin(t * 0.3) * 6, z = cb.z - 4 + (ph - 0.5) * 14, y = Math.sin(ph * Math.PI) * 4 - 1.2; P.pos.set(x, y, z); const dir = V3(0, Math.cos(ph * Math.PI) * 1.6, 1).normalize(); G.shark.root.position.copy(P.pos); G.shark.root.lookAt(P.pos.clone().add(dir)); G.shark.root.rotateZ(ph * 6.28);
        if (Math.abs(ph - 0.04) < dt / 4 || Math.abs(ph - 0.96) < dt / 4) X.splash(P.pos, 1.5);
        if (t > 24 && !fl.end) { fl.end = 1; G.onEnd && G.onEnd(); } } },
  ];
  M.update = (dt) => {
    if (!G.free) { const s = STEPS[M.step]; if (s) { if (started !== M.step) { started = M.step; stepT = 0; s.start && s.start(); } stepT += dt; M.stepT = stepT; s.update && s.update(dt); } }
    senseT = Math.max(0, senseT - dt); treasuresUpdate(dt); carryUpdate(dt); kidsUpdate(dt); radio(dt); marker();
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.add('hidden'); }
  };
  if (G.free) { M.objective(''); M.say('dakar', 'שחייה חופשית. הים כולו שלך – יש עוד אוצרות של השבט מתחבאים בכל מקום.'); }
  M.state = () => ({ step: M.step, found: M.found, bestJump: M.bestJump });
  G.missions = M; return M;
}
