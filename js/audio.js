// All sound is synthesized: muffled sea under water, waves and gulls above, swimming whoosh, bites, splashes,
// the sonar-like shark sense, treasure chimes, a calm pad. Nothing to download.
let ctx, master, seaG, seaF, waveG, musicG, swimG, swimF;
function noiseBuf(sec = 2) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = w * 0.4 + l * 3; } return b; }
function loopNoise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf(); s.loop = true; s.start(); return s; }

export const audio = {
  vol: 0.8,
  init() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = audio.vol; master.connect(ctx.destination);
    seaF = ctx.createBiquadFilter(); seaF.type = 'lowpass'; seaF.frequency.value = 300; seaG = ctx.createGain(); seaG.gain.value = 0; loopNoise().connect(seaF); seaF.connect(seaG); seaG.connect(master);
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 700; wf.Q.value = 0.5; waveG = ctx.createGain(); waveG.gain.value = 0; loopNoise().connect(wf); wf.connect(waveG); waveG.connect(master);
    swimF = ctx.createBiquadFilter(); swimF.type = 'lowpass'; swimF.frequency.value = 500; swimG = ctx.createGain(); swimG.gain.value = 0; loopNoise().connect(swimF); swimF.connect(swimG); swimG.connect(master);
    musicG = ctx.createGain(); musicG.gain.value = 0.05; musicG.connect(master);
    const chords = [[146.8, 220, 293.7, 349.2], [130.8, 196, 261.6, 329.6], [116.5, 174.6, 233.1, 293.7], [130.8, 196, 246.9, 329.6]];
    let ci = 0; const play = () => { const t = ctx.currentTime; for (const f of chords[ci % 4]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.8, t + 2); g.gain.linearRampToValueAtTime(0, t + 7.5); o.connect(g); g.connect(musicG); o.start(t); o.stop(t + 7.7); } ci++; };
    play(); setInterval(play, 6500);
  },
  setVol(v) { audio.vol = v; if (master) master.gain.value = v; },
  update(under, speed, depth, storm) {
    if (!ctx) return; const t = ctx.currentTime;
    seaG.gain.setTargetAtTime(under ? 0.32 : 0, t, 0.15); seaF.frequency.setTargetAtTime(220 + Math.max(0, 200 - depth * 3), t, 0.3);
    const w = 0.12 + 0.07 * Math.sin(t * 0.4) + (storm ? 0.25 : 0); waveG.gain.setTargetAtTime(under ? 0.02 : w, t, 0.15);
    swimG.gain.setTargetAtTime(Math.min(0.3, speed / 50), t, 0.2); swimF.frequency.setTargetAtTime(under ? 250 + speed * 25 : 600 + speed * 40, t, 0.2);
    musicG.gain.setTargetAtTime(storm ? 0.02 : 0.05, t, 1);
    if (!under && Math.random() < 0.002) audio.sfx('gull');
  },
  sfx(name) {
    if (!ctx) return; const t = ctx.currentTime;
    const tone = (f, d, type = 'sine', v = 0.2, at = 0, f2) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + at + d); g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(v, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + at + d); o.connect(g); g.connect(master); o.start(t + at); o.stop(t + at + d + 0.05); };
    const burst = (d, freq, v, type = 'lowpass', at = 0) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(d + 0.1); f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(v, t + at); g.gain.exponentialRampToValueAtTime(0.001, t + at + d); s.connect(f); f.connect(g); g.connect(master); s.start(t + at); s.stop(t + at + d + 0.1); };
    if (name === 'bite') { tone(140, 0.12, 'square', 0.12, 0, 60); burst(0.08, 1800, 0.25, 'highpass'); }
    if (name === 'gulp') { tone(300, 0.15, 'sine', 0.2, 0, 120); tone(500, 0.1, 'sine', 0.1, 0.08, 250); }
    if (name === 'splash') { burst(0.9, 1400, 0.6); burst(0.4, 300, 0.4); }
    if (name === 'ring') { tone(660, 0.25, 'triangle', 0.2); tone(990, 0.35, 'triangle', 0.16, 0.08); }
    if (name === 'pickup') { tone(520, 0.12, 'square', 0.08); tone(780, 0.18, 'square', 0.08, 0.08); }
    if (name === 'treasure') { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.5, 'triangle', 0.14, i * 0.09)); }
    if (name === 'sense') { tone(1400, 0.6, 'sine', 0.18, 0, 700); tone(1400, 0.5, 'sine', 0.06, 0.35, 700); tone(1400, 0.4, 'sine', 0.025, 0.7, 700); }
    if (name === 'sting') { tone(900, 0.2, 'sawtooth', 0.08, 0, 300); burst(0.2, 3000, 0.15, 'highpass'); }
    if (name === 'snip') { burst(0.06, 4000, 0.35, 'highpass'); tone(1200, 0.05, 'square', 0.06); }
    if (name === 'cheer') { burst(1.8, 1800, 0.3, 'bandpass'); [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.1)); }
    if (name === 'thunder') { burst(2.8, 200, 1.1); burst(0.3, 3000, 0.35, 'highpass'); }
    if (name === 'radio') { burst(0.1, 2500, 0.12, 'bandpass'); }
    if (name === 'gull') { tone(1800, 0.25, 'sine', 0.05, 0, 1200); tone(1700, 0.3, 'sine', 0.05, 0.3, 1100); }
    if (name === 'win') { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.7, 'triangle', 0.16, i * 0.15)); }
  },
};
