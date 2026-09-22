import { loadPlayer } from '../data/playerStore.js';
import bubbleUrl from './clips/bubble.ogg';
import shotBodyUrl from './clips/shot-body.ogg';
import splashAUrl from './clips/splash-a.ogg';
import splashBUrl from './clips/splash-b.ogg';
import hitBodyUrl from './clips/hit-body.ogg';
import hurtUrl from './clips/hurt.ogg';
import crateUrl from './clips/crate.ogg';
import uiUrl from './clips/ui.ogg';
import musicUrl from './clips/music.ogg';

/**
 * Записи CC0, не синтезатор.
 * Вода: rubberduck, OpenGameArt. Удар и низ: Kenney Sci-fi.
 * Щелчок и сундук: Kenney Interface.
 * Фон: Underwater Ambient Pad, isaiah658, CC0. Тихий подводный цикл.
 */

const CLIPS = {
  bubble: bubbleUrl,
  shotBody: shotBodyUrl,
  splashA: splashAUrl,
  splashB: splashBUrl,
  hitBody: hitBodyUrl,
  hurt: hurtUrl,
  crate: crateUrl,
  ui: uiUrl,
  music: musicUrl,
};

let ctx;
let adMute = 0;
const buffers = new Map();
let loading = null;
let musicSource = null;
let musicGain = null;
let usingCustom = false;
const MUSIC_GAIN = 0.13;
const CUSTOM_GAIN = 0.22;
const MUSIC_MAX_BYTES = 20 * 1024 * 1024;

function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function preloadSfx() {
  if (loading) return loading;
  const c = audio();
  loading = (async () => {
    await Promise.all(
      Object.entries(CLIPS).map(async ([name, url]) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(url);
        const raw = await res.arrayBuffer();
        const buf = await c.decodeAudioData(raw.slice(0));
        buffers.set(name, buf);
      }),
    );
    await applyStoredMusic();
  })().catch((err) => {
    console.warn('sfx', err);
  });
  return loading;
}

export function unlockAudio() {
  const c = audio();
  if (c.state === 'suspended' && adMute === 0) c.resume();
  preloadSfx()?.then(() => startMusic());
}

/** Реклама площадки: глушим игру на время ролика и возвращаем звук после. */
export function pushAdMute() {
  adMute += 1;
  try {
    const c = audio();
    if (c.state === 'running') c.suspend();
  } catch {
    /* контекст ещё не создан */
  }
}

export function popAdMute() {
  if (adMute <= 0) return;
  adMute -= 1;
  if (adMute > 0) return;
  try {
    const c = audio();
    if (c.state === 'suspended' && (soundEnabled() || musicEnabled())) c.resume();
  } catch {
    /* ignore */
  }
}

function soundEnabled() {
  try {
    return loadPlayer().soundOn !== false;
  } catch {
    return true;
  }
}

function musicEnabled() {
  try {
    return loadPlayer().musicOn !== false;
  } catch {
    return true;
  }
}

function openMusicDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('seabattle-music', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('track')) {
        req.result.createObjectStore('track');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readStoredTrack() {
  return openMusicDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('track', 'readonly');
        const req = tx.objectStore('track').get('user');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      }),
  );
}

function writeStoredTrack(row) {
  return openMusicDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('track', 'readwrite');
        tx.objectStore('track').put(row, 'user');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function deleteStoredTrack() {
  return openMusicDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('track', 'readwrite');
        tx.objectStore('track').delete('user');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

async function applyStoredMusic() {
  try {
    const row = await readStoredTrack();
    if (!row?.data) {
      usingCustom = false;
      return;
    }
    const buf = await audio().decodeAudioData(row.data.slice(0));
    buffers.set('music', buf);
    usingCustom = true;
  } catch {
    usingCustom = false;
  }
}

async function loadStockMusic() {
  const res = await fetch(musicUrl);
  if (!res.ok) throw new Error('music');
  const raw = await res.arrayBuffer();
  buffers.set('music', await audio().decodeAudioData(raw.slice(0)));
  usingCustom = false;
}

function restartMusic() {
  const play = musicEnabled() && adMute === 0;
  stopMusic({ fade: false });
  if (play) startMusic();
}

export async function useCustomMusic(file) {
  if (file.size > MUSIC_MAX_BYTES) {
    const err = new Error('big');
    err.code = 'big';
    throw err;
  }
  const raw = await file.arrayBuffer();
  const buf = await audio().decodeAudioData(raw.slice(0));
  await writeStoredTrack({ name: file.name, data: raw });
  buffers.set('music', buf);
  usingCustom = true;
  if (musicEnabled()) restartMusic();
  return file.name;
}

export async function resetCustomMusic() {
  await deleteStoredTrack();
  await loadStockMusic();
  if (musicEnabled()) restartMusic();
}

function enabled() {
  if (adMute > 0) return false;
  return soundEnabled();
}

function startMusic() {
  if (!musicEnabled() || adMute > 0 || musicSource) return;
  const buf = buffers.get('music');
  if (!buf) return;
  const c = audio();
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const amp = c.createGain();
  const now = c.currentTime;
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(usingCustom ? CUSTOM_GAIN : MUSIC_GAIN, now + 1.6);
  src.connect(amp);
  amp.connect(c.destination);
  src.start(now);
  musicSource = src;
  musicGain = amp;
  src.onended = () => {
    if (musicSource === src) {
      musicSource = null;
      musicGain = null;
    }
  };
}

function stopMusic({ fade = true } = {}) {
  const src = musicSource;
  const amp = musicGain;
  musicSource = null;
  musicGain = null;
  if (!src) return;
  if (!fade) {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
    return;
  }
  try {
    const c = audio();
    const now = c.currentTime;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(Math.max(0.0001, amp.gain.value), now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    src.stop(now + 0.5);
  } catch {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
  }
}

export function setMusicOn(on) {
  if (on) {
    unlockAudio();
    startMusic();
  } else {
    stopMusic();
  }
}

function play(name, { gain = 0.5, rate = 1, duration, lowpass } = {}) {
  const buf = buffers.get(name);
  if (!buf) return;
  const c = audio();
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const amp = c.createGain();
  amp.gain.value = gain;
  if (lowpass) {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    src.connect(filter);
    filter.connect(amp);
  } else {
    src.connect(amp);
  }
  amp.connect(c.destination);
  const cap = duration == null ? undefined : duration / rate;
  src.start(c.currentTime, 0, cap);
}

function vary(base, spread) {
  return base + (Math.random() * 2 - 1) * spread;
}

preloadSfx();

export const sfx = {
  unlock: unlockAudio,
  shot() {
    if (!enabled()) return;
    play('bubble', { gain: 0.7, rate: vary(1.05, 0.06) });
    play('shotBody', { gain: 0.62, rate: vary(0.88, 0.04), duration: 0.65, lowpass: 480 });
  },
  splash() {
    if (!enabled()) return;
    const name = Math.random() < 0.5 ? 'splashA' : 'splashB';
    play(name, { gain: 0.55, rate: vary(1, 0.05), duration: 0.55 });
  },
  hit() {
    if (!enabled()) return;
    play('hitBody', { gain: 0.78, rate: vary(0.9, 0.04), duration: 0.9, lowpass: 1600 });
    play(Math.random() < 0.5 ? 'splashA' : 'splashB', {
      gain: 0.38,
      rate: vary(0.96, 0.04),
      duration: 0.5,
    });
  },
  hurt() {
    if (!enabled()) return;
    play('hurt', { gain: 0.62, rate: vary(0.94, 0.04), duration: 0.4 });
  },
  crate() {
    if (!enabled()) return;
    play('crate', { gain: 0.48, rate: vary(1, 0.02) });
  },
  ui() {
    if (!enabled()) return;
    play('ui', { gain: 0.32 });
  },
};
