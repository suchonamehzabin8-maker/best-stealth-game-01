// audio.js — every sound is synthesized with WebAudio: no audio files, no
// network. Footsteps tick as you walk (louder and nearer when a warden walks
// close by), a two-note sting when a warden grows suspicious, a low alarm
// pulse while the hunt is on, a pluck when a relic is pocketed, and a little
// chime when the vault door opens.

export function createAudio() {
  return {
    ctx: null,
    master: null,
    muted: false,
    alarmOsc: null,
    alarmGain: null,
    padStarted: false,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio.ctx = new Ctx();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.5;
  audio.master.connect(audio.ctx.destination);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}

function blip(audio, freq, dur, type, vol, when = 0) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A short filtered noise burst: a footstep on the gallery floor.
export function playFootstep(audio, sneaking, side) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime;
  const buffer = audio.ctx.createBuffer(1, 2205, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = sneaking ? 320 : 700;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(sneaking ? 0.05 : 0.14, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  src.start(t0);
  // A guard's step is lower and heavier; the side alternates the pitch a touch.
  void side;
}

// A warden's step, heard from a distance: low, soft, directional by volume.
export function playGuardStep(audio, distance) {
  if (!audio.ctx || audio.muted) return;
  const vol = Math.max(0, 0.16 * (1 - distance / 420));
  if (vol <= 0.01) return;
  const t0 = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(95, t0);
  osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.09);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + 0.12);
}

export function playSuspicionSting(audio) {
  blip(audio, 392, 0.16, 'triangle', 0.22);
  blip(audio, 466, 0.22, 'triangle', 0.22, 0.12);
}

export function playAlarmStart(audio) {
  blip(audio, 220, 0.3, 'sawtooth', 0.16);
  blip(audio, 174, 0.4, 'sawtooth', 0.16, 0.18);
}

export function playPickup(audio) {
  blip(audio, 660, 0.12, 'triangle', 0.25);
  blip(audio, 880, 0.18, 'triangle', 0.25, 0.09);
}

export function playPebble(audio) {
  blip(audio, 1150, 0.05, 'square', 0.1);
  blip(audio, 320, 0.08, 'sine', 0.18, 0.16);
}

export function playWinChime(audio) {
  [523, 659, 784, 1046].forEach((f, i) => blip(audio, f, 0.3, 'triangle', 0.22, i * 0.11));
}

export function playCaught(audio) {
  blip(audio, 196, 0.35, 'sawtooth', 0.2);
  blip(audio, 147, 0.5, 'sawtooth', 0.2, 0.2);
}

// A quiet low pad under everything, started on the first gesture.
export function startAmbientPad(audio) {
  if (!audio.ctx || audio.padStarted || audio.muted) return;
  audio.padStarted = true;
  const osc = audio.ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const osc2 = audio.ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 55.6;
  const gain = audio.ctx.createGain();
  gain.gain.value = 0.035;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(audio.master);
  osc.start();
  osc2.start();
}
