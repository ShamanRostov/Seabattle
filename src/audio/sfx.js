import { loadPlayer } from '../data/playerStore.js';

let ctx;

function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function unlockAudio() {
  const c = audio();
  if (c.state === 'suspended') c.resume();
}

function enabled() {
  try {
    return loadPlayer().soundOn !== false;
  } catch {
    return true;
  }
}

function env(duration, peak) {
  const c = audio();
  const g = c.createGain();
  g.connect(c.destination);
  const now = c.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  return { c, g, now };
}

function noise(duration, peak, freq) {
  const { c, g, now } = env(duration, peak);
  const len = Math.max(1, Math.floor(c.sampleRate * duration));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  src.connect(filter);
  filter.connect(g);
  src.start(now);
  src.stop(now + duration);
}

function tone(freq, duration, type, peak, slideTo) {
  const { c, g, now } = env(duration, peak);
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  o.connect(g);
  o.start(now);
  o.stop(now + duration + 0.02);
}

export const sfx = {
  unlock: unlockAudio,
  shot() {
    if (!enabled()) return;
    tone(240, 0.16, 'sawtooth', 0.12, 80);
    noise(0.1, 0.06, 1400);
  },
  splash() {
    if (!enabled()) return;
    noise(0.22, 0.1, 900);
  },
  hit() {
    if (!enabled()) return;
    noise(0.28, 0.16, 700);
    tone(90, 0.22, 'triangle', 0.14, 40);
  },
  hurt() {
    if (!enabled()) return;
    tone(180, 0.16, 'square', 0.08, 90);
  },
  crate() {
    if (!enabled()) return;
    tone(520, 0.1, 'sine', 0.08);
    tone(780, 0.14, 'sine', 0.07);
  },
  ui() {
    if (!enabled()) return;
    tone(660, 0.05, 'sine', 0.05);
  },
};
