// Phone / iPad controls. Nothing here runs on a computer until a real touch happens (or ?touch is in the URL):
// then a left joystick (up = fast like W, down = slow like S, sideways = steer, in the air = spin like A/D),
// right-side drag = look/steer, and blocks for bite, dash, up, shark sense and pause appear.
// Everything is written into the same `input` the keyboard and mouse use, once per frame in input.begin().
import { input } from './input.js';

const $ = id => document.getElementById(id);
const QS = new URLSearchParams(location.search);
// A device whose main input is touch: phones (pointer:coarse) and iPads (report as Macintosh with touch points,
// and may claim pointer:fine). A Windows laptop with a touchscreen and a mouse is not one – it keeps full quality.
export const TOUCH_DEVICE = QS.has('touch') || (navigator.maxTouchPoints > 0 &&
  (matchMedia('(pointer:coarse)').matches || /Macintosh|iPad|iPhone|Android/.test(navigator.userAgent)));
if (TOUCH_DEVICE) document.documentElement.classList.add('touchdev');

export function initTouch(G, hooks) {
  let on = false, root = null, shown = false;
  const T = { jx: 0, jy: 0, joy: null, look: null, dash: null, up: null, q: 0, enter: 0, last: 0 };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function build() {
    root = document.createElement('div'); root.id = 'tc'; root.className = 'hidden';
    root.innerHTML = `
      <div id="tcJoy"><span class="jUp">מהר</span><span class="jDn">לאט</span><i id="tcKnob"></i></div>
      <button id="tcPause" data-k="pause" aria-label="עצירה"><i></i><i></i></button>
      <div id="tcBtns">
        <button class="tcb" id="tcSense" data-k="sense">חוש</button>
        <button class="tcb" id="tcUp" data-k="up">למעלה</button>
        <button class="tcb" id="tcDash" data-k="dash">זינוק</button>
        <button class="tcb big" id="tcBite" data-k="bite">נשיכה</button>
      </div>`;
    document.body.appendChild(root);
    root.addEventListener('touchstart', onStart, { passive: false });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd, { passive: false });
    root.addEventListener('touchcancel', onEnd, { passive: false });
    // a mouse or trackpad on a touch device (iPad + keyboard case) can still take the desktop pointer-lock path
    root.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && !e.target.closest('[data-k]') && hooks.lock) hooks.lock(); });
    root.addEventListener('contextmenu', e => e.preventDefault());
    const em = document.querySelector('#radio em'); if (em) em.textContent = 'נגיעה כאן – דלג';
  }

  const joyEl = () => $('tcJoy'), knob = () => $('tcKnob');
  let joyHome = null;
  function joyPlace(x, y) { const j = joyEl(); j.style.left = (x - j.offsetWidth / 2) + 'px'; j.style.top = (y - j.offsetHeight / 2) + 'px'; j.style.bottom = 'auto'; }
  function joyReset() { const j = joyEl(); j.style.left = j.style.top = j.style.bottom = ''; knob().style.transform = ''; j.classList.remove('on'); T.jx = T.jy = 0; }
  function inRect(el, x, y) { if (!el || el.classList.contains('hidden') || !el.offsetParent) return false; const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }

  function press(k, id, el) {
    el.classList.add('down');
    if (k === 'bite') input.lmb = true;
    else if (k === 'sense') T.q = 1;
    else if (k === 'dash') T.dash = id;
    else if (k === 'up') T.up = id;
    else if (k === 'pause') { if (G.playing && !G.uiOpen && !G.ended) hooks.pause(); }
  }

  function onStart(e) {
    e.preventDefault(); hooks.audio && hooks.audio();
    for (const t of e.changedTouches) {
      const b = t.target.closest && t.target.closest('[data-k]');
      if (b) { b._tid = t.identifier; press(b.dataset.k, t.identifier, b); continue; }
      if (inRect($('radio'), t.clientX, t.clientY)) { T.enter = 1; continue; }
      const leftZone = t.clientX < innerWidth * 0.5 && t.clientY > innerHeight * 0.3;
      if (leftZone && T.joy === null) {
        T.joy = t.identifier; const j = joyEl(); j.classList.add('on');
        const half = j.offsetWidth / 2, x = clamp(t.clientX, half + 6, innerWidth * 0.5), y = clamp(t.clientY, half + 6, innerHeight - half - 6);
        joyPlace(x, y); joyHome = { x, y }; joyMove(t);
      } else if (T.look === null) { T.look = { id: t.identifier, x: t.clientX, y: t.clientY }; }
    }
  }
  function joyMove(t) {
    const R = joyEl().offsetWidth * 0.42; let dx = t.clientX - joyHome.x, dy = t.clientY - joyHome.y; const L = Math.hypot(dx, dy);
    if (L > R) { dx *= R / L; dy *= R / L; }
    knob().style.transform = `translate(${dx}px,${dy}px)`; T.jx = dx / R; T.jy = -dy / R;
  }
  function onMove(e) {
    e.preventDefault();
    const k = lookK();
    for (const t of e.changedTouches) {
      if (t.identifier === T.joy) joyMove(t);
      else if (T.look && t.identifier === T.look.id) { input.mx += (t.clientX - T.look.x) * k; input.my += (t.clientY - T.look.y) * k; T.look.x = t.clientX; T.look.y = t.clientY; }
    }
  }
  function onEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const id = t.identifier;
      if (id === T.joy) { T.joy = null; joyReset(); }
      if (T.look && id === T.look.id) T.look = null;
      if (id === T.dash) T.dash = null;
      if (id === T.up) T.up = null;
      root.querySelectorAll('[data-k]').forEach(b => { if (b._tid === id) { b._tid = undefined; b.classList.remove('down'); } });
    }
  }
  // swim.js turns the camera by mx * 0.0021 rad. A drag across the long side of the screen ≈ 1.6π, any orientation.
  const lookK = () => (Math.PI * 1.6 / Math.max(innerWidth, innerHeight, 1)) / 0.0021;

  function clearAll() {
    T.joy = null; T.look = null; T.dash = null; T.up = null; T.q = 0; T.enter = 0; input.lmb = false;
    if (root) { joyReset(); root.querySelectorAll('.down').forEach(b => b.classList.remove('down')); }
    input.keys.KeyA = input.keys.KeyD = input.keys.KeyQ = input.keys.Enter = false;
  }

  // runs at the end of input.begin(), only after touch mode is on
  function frame() {
    const now = performance.now(), dt = Math.min(0.05, T.last ? (now - T.last) / 1000 : 0); T.last = now;
    const want = G.playing && (!G.uiOpen || G.cine) && !G.ended;
    if (want !== shown) { shown = want; root.classList.toggle('hidden', !want); if (!want) clearAll(); }
    if (!shown) return;
    const k = input.keys, air = G.swim && G.swim.air;
    if (T.jy > 0.35) input.f = 1; else if (T.jy < -0.35) input.f = -1;
    if (T.dash !== null) input.sprint = true;
    if (T.up !== null) input.jump = true;
    if (air) { k.KeyA = T.jx < -0.35; k.KeyD = T.jx > 0.35; }
    else {
      if (k.KeyA || k.KeyD) k.KeyA = k.KeyD = false;
      const x = Math.abs(T.jx) < 0.12 ? 0 : T.jx; input.mx += x * Math.abs(x) * 900 * dt;   // full stick ≈ 1.9 rad/s
    }
    k.KeyQ = T.q > 0; T.q = 0;
    k.Enter = T.enter > 0; T.enter = 0;
  }

  function activate() {
    if (on) return; on = true; G.touch = true;
    document.documentElement.classList.add('touch');
    const n = $('mobileNote'); n && n.classList.add('hidden');
    build(); input.touchFrame = frame;
    addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearAll(); if (G.playing && !G.uiOpen && !G.ended) hooks.pause(); } });
    hooks.audio && hooks.audio();
  }
  if (QS.has('touch')) activate();
  addEventListener('touchstart', activate, { passive: true, capture: true, once: true });
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') activate(); }, { passive: true, capture: true });
  // iOS only lets audio start inside a touch gesture
  addEventListener('touchend', () => { if (G.playing) hooks.audio && hooks.audio(); }, { passive: true, capture: true, once: true });
  return { activate };
}
