// סנפיר – boot, menus, save, main loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { createOcean } from './ocean.js';
import { createFx } from './fx.js';
import { createShark } from './shark.js';
import { createCreatures } from './creatures.js';
import { createSwim } from './swim.js';
import { createMissions } from './missions.js';
import { initTouch, TOUCH_DEVICE } from './touch.js';

const $ = id => document.getElementById(id);
const SAVE = 'snapir:save', SET = 'snapir:settings';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

const G = { t: 0, cine: false, uiOpen: true, playing: false, free: false };
G.settings = Object.assign({ sens: 1, vol: 0.8, invert: false, qual: 'high' }, load(SET, {}));
const go = new URLSearchParams(location.search).get('go');
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
const setLoad = p => { $('loadBar').style.width = Math.round(p * 100) + '%'; };
if (!TOUCH_DEVICE && matchMedia('(pointer:coarse)').matches && !matchMedia('(pointer:fine)').matches) $('mobileNote').classList.remove('hidden');
G.touchDev = TOUCH_DEVICE;   // phones/iPads: lighter rendering (no bloom/shadows, pixel ratio ≤ 1.25)

const hi = G.settings.qual === 'high' && !TOUCH_DEVICE;
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: !hi, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, hi ? 1.5 : TOUCH_DEVICE && G.settings.qual === 'high' ? 1.25 : 1)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = hi; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
G.renderer = renderer; G.scene = new THREE.Scene(); G.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 6000);
let composer = null;
if (hi) { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(G.scene, G.camera)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.3, 0.5, 0.9)); composer.addPass(new OutputPass()); }
addEventListener('resize', () => { G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer && composer.setSize(innerWidth, innerHeight); });

async function boot() {
  setLoad(0.05); await nextFrame();
  G.logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'assets/logo.webp'; });
  setLoad(0.15); await nextFrame();
  createOcean(G); setLoad(0.6); await nextFrame();
  createFx(G); G.shark = createShark(G); createCreatures(G); createSwim(G); setLoad(0.9); await nextFrame();
  G.swim.place(new THREE.Vector3(G.world.outlet.x - 25, -4, G.world.outlet.z), -Math.PI / 2);
  renderer.compile(G.scene, G.camera);
  setLoad(1); await nextFrame();
  $('loading').classList.add('hidden');
  const sv = load(SAVE, null);
  if (sv && sv.step > 0) { $('btnContinue').disabled = false; $('btnContinue').textContent = sv.step >= 13 ? 'המשך (המשחק הושלם)' : `המשך (פרק ${sv.step < 5 ? 1 : sv.step < 9 ? 2 : sv.step < 12 ? 3 : 4})`; }
  if (go) start(go); else showMenu();
  requestAnimationFrame(loop);
}

// ---------- menus ----------
const stack = [];
const SCREENS = ['menu', 'help', 'settings', 'pause', 'end', 'tlistScr'];
function show(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); }
function showMenu() { G.uiOpen = true; show('menu'); $('hud').classList.add('hidden'); }
function open(id, from) { stack.push(from); show(id); }
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => show(stack.pop() || 'menu'));
$('btnHelp').onclick = () => open('help', 'menu');
$('btnSettings').onclick = () => { fill(); open('settings', 'menu'); };
$('btnPHelp').onclick = () => open('help', 'pause');
$('btnPSettings').onclick = () => { fill(); open('settings', 'pause'); };
$('btnTreasures').onclick = () => { const l = G.missions ? G.missions.treasureList() : []; $('tlist').innerHTML = l.map(t => `<li class="${t.got ? 'yes' : 'no'}">${t.got ? t.n : '???'}</li>`).join(''); open('tlistScr', 'pause'); };
function fill() { $('sSens').value = G.settings.sens; $('sVol').value = G.settings.vol; $('sInv').checked = G.settings.invert; $('sQual').value = G.settings.qual; }
$('sSens').oninput = e => { G.settings.sens = +e.target.value; store(SET, G.settings); };
$('sVol').oninput = e => { G.settings.vol = +e.target.value; audio.setVol(G.settings.vol); store(SET, G.settings); };
$('sInv').onchange = e => { G.settings.invert = e.target.checked; store(SET, G.settings); };
$('sQual').onchange = e => { const q = e.target.value; if (q !== G.settings.qual) { G.settings.qual = q; store(SET, G.settings); if (G.playing) { G.save && G.save(); location.href = '?go=cont'; } else location.reload(); } };
let started = false, newArmed = false;
$('btnPlay').onclick = () => { const sv = load(SAVE, null); if (sv && sv.step > 0 && !newArmed) { newArmed = true; $('btnPlay').textContent = 'בטוח? ההתקדמות תימחק'; setTimeout(() => { newArmed = false; $('btnPlay').textContent = 'משחק חדש'; }, 3000); return; } started ? (location.href = '?go=new') : start('new'); };
$('btnContinue').onclick = () => started ? (location.href = '?go=cont') : start('cont');
$('btnFree').onclick = () => started ? (location.href = '?go=free') : start('free');
$('btnResume').onclick = () => resume();
$('btnQuit').onclick = () => { G.save && G.save(); location.href = location.pathname; };
$('btnEndFree').onclick = () => { G.free = true; G.ended = false; G.cine = false; G.missions.objective(''); resume(); };
$('btnEndMenu').onclick = () => { location.href = location.pathname; };
addEventListener('keydown', e => { if (e.code === 'Escape' && G.playing && !G.uiOpen) pause(); });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.playing && !G.uiOpen && !G.ended) pause(); });
$('gl').addEventListener('click', () => { if (G.playing && !G.uiOpen && !document.pointerLockElement && !G.touch) lock(); });
function lock() { try { const p = $('gl').requestPointerLock(); p && p.catch && p.catch(() => { }); } catch { } }
function pause() { G.uiOpen = true; show('pause'); G.save && G.save(); }
function resume() { show(null); G.uiOpen = false; $('hud').classList.remove('hidden'); audio.init(); if (!G.touch) lock(); }
initTouch(G, { pause, lock, audio: () => { audio.init(); audio.setVol(G.settings.vol); } });

let playStart = 0;
function start(mode) {
  started = true; audio.init(); audio.setVol(G.settings.vol);
  let saved = {};
  if (mode === 'new') store(SAVE, null);
  else saved = load(SAVE, {}) || {};
  if (mode === 'free' || saved.step >= 13) G.free = true;
  G.playTime = saved.time || 0; playStart = performance.now();
  if (saved.step > 0 || G.free) G.swim.place(new THREE.Vector3(G.world.campBeach.x - 30, -3, G.world.campBeach.z), -Math.PI / 2);
  createMissions(G, saved);
  G.save = () => { if (!G.missions) return; const prev = load(SAVE, {}) || {}; const st = G.missions.state(); if (G.free) st.step = Math.max(prev.step || 0, 0); store(SAVE, { ...st, time: G.playTime + (performance.now() - playStart) / 1000 }); };
  G.onEnd = () => { G.ended = true; store(SAVE, { ...G.missions.state(), step: 13, time: G.playTime + (performance.now() - playStart) / 1000 }); audio.sfx('win'); if (document.pointerLockElement) document.exitPointerLock();
    const m = Math.round((G.playTime + (performance.now() - playStart) / 1000) / 60); $('endStats').textContent = `סנפיר הציל את הים של השבט. אוצרות: ${G.missions.found.length}/24. ${G.missions.bestJump > 0.5 ? `הקפיצה הכי גבוהה: ${G.missions.bestJump.toFixed(1)} מ׳. ` : ''}זמן משחק: ${m <= 1 ? 'דקה' : m + ' דקות'}.`;
    G.uiOpen = true; show('end'); $('hud').classList.add('hidden'); };
  G.playing = true; resume();
}
G.sfx = n => audio.sfx(n);
let promptText = ''; G.prompt = t => { promptText = t; };

// ---------- loop ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 1 / 20); G.t += dt;
  input.begin(); promptText = '';
  const P = G.swim, D = G.shark;
  const running = G.playing && (!G.uiOpen || G.cine);
  if (!G.playing) {
    const a = G.t * 0.06, o = G.world.outlet; G.camera.position.set(o.x - 20 + Math.sin(a) * 18, -2.5, o.z + Math.cos(a) * 18); G.camera.lookAt(o.x - 22, -4, o.z);
    P.pos.set(o.x - 22 + Math.sin(G.t * 0.25) * 8, -4, o.z + Math.cos(G.t * 0.25) * 8); D.root.position.copy(P.pos); D.root.lookAt(o.x - 22 + Math.sin(G.t * 0.25 + 0.2) * 8, -4, o.z + Math.cos(G.t * 0.25 + 0.2) * 8);
    D.update(dt, { speed: 3, turn: 0.4 });
  } else if (running) {
    if (!G.cine) P.update(dt);
    if (G.missions) G.missions.update(dt);
    if (G.cine && G.missions && G.missions.step === 0) { P.pos.x -= dt * 2; D.root.position.copy(P.pos); D.root.rotation.set(0, -Math.PI / 2, 0); }
    D.update(dt, P.st);
  }
  if (G.playing && G.uiOpen && !G.cine) { /* paused */ } else { G.creatures.update(dt, G.t); G.fx.update(dt); }
  G.world.update(dt, G.t, G.camera);
  const under = G.world.under, depth = Math.max(0, -P.pos.y);
  audio.update(under, G.playing && !G.uiOpen ? P.speed : 1, depth, G.world.skyName === 'storm');
  if (G.playing) {
    $('depthNum').textContent = Math.round(depth); $('stamBar').style.width = Math.round(P.stamina * 100) + '%';
    const pr = $('prompt'); pr.classList.toggle('hidden', !promptText); if (promptText) pr.textContent = promptText;
    $('cross').classList.toggle('hidden', !!G.cine);
  }
  $('flashOv').style.opacity = Math.min(0.7, (G.flash || 0) * 0.45);
  if (composer) composer.render(); else renderer.render(G.scene, G.camera);
  input.end();
}
boot().catch(e => { console.error(e); $('loading').querySelector('.over').textContent = 'שגיאה בטעינה: ' + e.message; });
window.__G = G; window.__input = input;
