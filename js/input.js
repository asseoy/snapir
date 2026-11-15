// Keyboard + mouse (pointer lock). mx/my are this frame's mouse deltas; ePressed is a one-frame edge.
export const input = { keys: {}, f: 0, sprint: false, jump: false, lmb: false, mx: 0, my: 0, ePressed: false, _e: false, locked: false };

addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  if (!input.keys[e.code] && e.code === 'KeyE') input._e = true;
  input.keys[e.code] = true;
});
addEventListener('keyup', e => { input.keys[e.code] = false; });
addEventListener('blur', () => { input.keys = {}; input.lmb = false; });
addEventListener('mousemove', e => { if (input.locked) { input.mx += e.movementX || 0; input.my += e.movementY || 0; } });
addEventListener('mousedown', e => { if (e.button === 0 && input.locked) input.lmb = true; });
addEventListener('mouseup', e => { if (e.button === 0) input.lmb = false; });
document.addEventListener('pointerlockchange', () => { input.locked = !!document.pointerLockElement; if (!input.locked) input.lmb = false; });

input.begin = () => {
  const k = input.keys;
  input.f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
  input.sprint = !!(k.ShiftLeft || k.ShiftRight);
  input.jump = !!k.Space;
  input.ePressed = input._e; input._e = false;
  if (input.touchFrame) input.touchFrame();   // phone/iPad controls (js/touch.js), only after a real touch
};
input.end = () => { input.mx = 0; input.my = 0; };
