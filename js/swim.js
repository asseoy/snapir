// How סנפיר moves: steer toward where the camera looks, W faster, S slow, Shift dash (stamina), Space up.
// At the surface the dorsal fin cuts the water; swim up fast enough and you breach – spin with A/D in the air.
// Seabed, the beach and solid things push back. Chase camera never sits on the waterline.
import * as THREE from 'three';
import { input } from './input.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const UP = new THREE.Vector3(0, 1, 0);
export function createSwim(G) {
  const W = G.world, cam = G.camera;
  const P = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), q: new THREE.Quaternion(), speed: 3, stamina: 1, camYaw: 0, camPitch: -0.1,
    air: false, airVel: new THREE.Vector3(), spin: 0, airTop: 0, bank: 0, carry: null, biteT: 0, biteCd: 0, senseCd: 0, slow: 0, st: { speed: 3, turn: 0, pitch: 0, bite: false, dash: false }, surfaced: false, frozen: false };
  const fwd = new THREE.Vector3(), aim = new THREE.Vector3(), m4 = new THREE.Matrix4(), qT = new THREE.Quaternion(), tmp = new THREE.Vector3(), camPos = new THREE.Vector3(), prev = new THREE.Vector3();
  let lastYaw = 0, wasUnder = true;
  P.place = (p, yaw) => { P.pos.copy(p); P.q.setFromAxisAngle(UP, yaw); P.camYaw = yaw + Math.PI; P.camPitch = -0.1; P.speed = 3; P.air = false; lastYaw = yaw; camPos.copy(p).add(new THREE.Vector3(-Math.sin(yaw) * 8, 2, -Math.cos(yaw) * 8)); };
  P.forward = () => fwd.set(0, 0, 1).applyQuaternion(P.q).clone();

  P.update = (dt) => {
    const ui = G.uiOpen || G.cine || P.frozen, st = P.st, t = G.t;
    if (!ui) { P.camYaw -= input.mx * 0.0021 * G.settings.sens; P.camPitch -= input.my * 0.0021 * G.settings.sens * (G.settings.invert ? -1 : 1); P.camPitch = clamp(P.camPitch, -1.3, 1.2); }
    aim.set(Math.sin(P.camYaw + Math.PI) * Math.cos(P.camPitch), Math.sin(P.camPitch), Math.cos(P.camYaw + Math.PI) * Math.cos(P.camPitch));
    const Wk = !ui && input.f > 0, Sk = !ui && input.f < 0, dashK = !ui && input.sprint && P.stamina > 0.04, upK = !ui && input.jump;
    const wy = W.waveAt(P.pos.x, P.pos.z, t);
    prev.copy(P.pos);
    P.biteT = Math.max(0, P.biteT - dt); P.biteCd = Math.max(0, P.biteCd - dt); P.senseCd = Math.max(0, P.senseCd - dt); P.slow = Math.max(0, P.slow - dt);
    if (!ui && input.lmb && P.biteCd <= 0) { input.lmb = false; P.biteT = 0.22; P.biteCd = 0.38; G.sfx && G.sfx('bite'); G.onBite && G.onBite(); }
    if (!ui && input.keys.KeyQ && P.senseCd <= 0) { P.senseCd = 5; G.onSense && G.onSense(); }

    if (!P.air) {
      // ---- swimming ----
      fwd.set(0, 0, 1).applyQuaternion(P.q);
      const target = (Sk ? 1.5 : dashK ? 19 : Wk ? 10 : 5) * (P.slow > 0 ? 0.45 : 1);
      P.speed += (target - P.speed) * (1 - Math.exp(-(dashK ? 2.4 : 1.6) * dt));
      P.stamina = clamp(P.stamina + (dashK ? -dt * 0.32 : dt * 0.09), 0, 1);
      const dir = tmp.copy(aim); if (upK) dir.y += 0.8; dir.normalize();
      m4.lookAt(new THREE.Vector3(), dir, UP); qT.setFromRotationMatrix(m4); qT.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
      const turnK = 2.6 + (1 - Math.min(1, P.speed / 12)) * 2.2;
      P.q.slerp(qT, 1 - Math.exp(-turnK * dt));
      const e = new THREE.Euler().setFromQuaternion(P.q, 'YXZ');
      let yr = e.y - lastYaw; if (yr > Math.PI) yr -= Math.PI * 2; if (yr < -Math.PI) yr += Math.PI * 2; yr /= Math.max(dt, 1e-4); lastYaw = e.y;
      fwd.set(0, 0, 1).applyQuaternion(P.q);
      P.vel.copy(fwd).multiplyScalar(P.speed);
      P.pos.addScaledVector(P.vel, dt);
      // breach: leaving the water fast and steep
      if (P.pos.y > wy - 0.5) {
        if (fwd.y > 0.3 && P.speed > 9) { P.air = true; P.airVel.copy(P.vel); P.airVel.y = Math.max(P.airVel.y, 6) * 1.25; P.spin = 0; P.airTop = P.pos.y; G.sfx && G.sfx('splash'); G.fx && G.fx.splash(P.pos, 1); }
        else { P.pos.y = wy - 0.5; if (fwd.y > 0) { const flat = new THREE.Quaternion().setFromAxisAngle(UP, e.y); P.q.slerp(flat, 1 - Math.exp(-4 * dt)); } }
      }
      P.surfaced = P.pos.y > wy - 0.9;
      st.turn = clamp(yr * 0.35, -1, 1); st.pitch = 0; st.dash = dashK; st.speed = P.speed;
      P.bank += (clamp(-yr * 0.25, -0.5, 0.5) - P.bank) * (1 - Math.exp(-4 * dt));
    } else {
      // ---- airborne ----
      P.airVel.y -= 17 * dt; P.pos.addScaledVector(P.airVel, dt); P.airTop = Math.max(P.airTop, P.pos.y);
      const spinIn = ui ? 0 : ((input.keys.KeyA ? 1 : 0) - (input.keys.KeyD ? 1 : 0));
      P.spin += spinIn * dt * 9;
      const d = P.airVel.clone().normalize(); m4.lookAt(new THREE.Vector3(), d, UP); qT.setFromRotationMatrix(m4); qT.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
      P.q.slerp(qT, 1 - Math.exp(-6 * dt)); P.bank = P.spin;
      st.turn = 0; st.speed = 6; st.dash = false; st.pitch = 0;
      if (P.pos.y < wy && P.airVel.y < 0) { // splash down
        P.air = false; P.speed = Math.min(14, P.airVel.length() * 0.7); G.fx && G.fx.splash(P.pos, 2); G.sfx && G.sfx('splash');
        const spins = Math.floor(Math.abs(P.spin) / (Math.PI * 2) + 0.15); const clean = Math.abs(((P.spin % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) > 2.2;
        G.onBreach && G.onBreach({ height: P.airTop - wy, spins, clean }); P.spin = 0; P.bank = 0;
      }
    }
    // ---- seabed, beach, solids, bounds ----
    let h = W.heightAt(P.pos.x, P.pos.z);
    for (let k = 0; k < 24 && h > -1.0; k++) { P.pos.x -= 0.6; h = W.heightAt(P.pos.x, P.pos.z); }   // the beach is to the east: slide back out to sea
    if (P.pos.y < h + 1.0) { P.pos.y = h + 1.0; if (fwd.y < 0) { const e2 = new THREE.Euler().setFromQuaternion(P.q, 'YXZ'); P.q.slerp(new THREE.Quaternion().setFromAxisAngle(UP, e2.y), 0.15); } }
    W.collide(P.pos, 0.9);
    const B = W.bounds; P.pos.x = clamp(P.pos.x, B.X0, B.X1); P.pos.z = clamp(P.pos.z, B.Z0, B.Z1);
    if (!P.air && P.pos.y > wy - 0.45) P.pos.y = wy - 0.45;
    st.bite = P.biteT > 0;
    // visuals
    const D = G.shark; D.root.position.copy(P.pos); D.root.quaternion.copy(P.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), P.bank));
    if (P.carry) { P.carry.position.copy(D.mouth || P.pos); P.carry.quaternion.copy(D.root.quaternion); }
    // bubbles / wake
    const under = P.pos.y < wy - 0.3; if (under !== wasUnder && !P.air) { wasUnder = under; }
    if (G.fx) { if (dashK && under && Math.random() < dt * 30) G.fx.bubble(D.mouth || P.pos, 1); if (P.surfaced && !P.air && P.speed > 4 && Math.random() < dt * 18) G.fx.wake(P.pos, P.vel); }

    // ---- camera ----
    if (!G.cine) {
      const dist = 7.5 + P.speed * 0.13 + (P.air ? 3 : 0);
      const off = new THREE.Vector3(Math.sin(P.camYaw) * Math.cos(P.camPitch), -Math.sin(P.camPitch) + 0.22, Math.cos(P.camYaw) * Math.cos(P.camPitch)).multiplyScalar(dist);
      const want = tmp.copy(P.pos).add(off);
      const ch = W.heightAt(want.x, want.z); if (want.y < ch + 1.2) want.y = ch + 1.2;
      const cwy = W.waveAt(want.x, want.z, t), sharkUnder = P.pos.y < wy - 0.2 && !P.air;
      if (sharkUnder && want.y > cwy - 0.7) want.y = cwy - 0.7; if (!sharkUnder && Math.abs(want.y - cwy) < 0.8) want.y = cwy + 0.8;
      camPos.lerp(want, 1 - Math.exp(-8 * dt));
      // keep the lerped camera off the waterline too
      const cw2 = W.waveAt(camPos.x, camPos.z, t); if (Math.abs(camPos.y - cw2) < 0.6) camPos.y = sharkUnder ? cw2 - 0.6 : cw2 + 0.6;
      cam.position.copy(camPos); cam.lookAt(P.pos.x, P.pos.y + 0.6, P.pos.z);
      cam.fov += ((60 + Math.min(16, (P.speed - 5) * 0.9) + (dashK ? 5 : 0)) - cam.fov) * (1 - Math.exp(-4 * dt)); cam.updateProjectionMatrix();
    }
  };
  G.swim = P; return P;
}
