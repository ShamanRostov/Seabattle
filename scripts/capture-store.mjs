/**
 * Скрины боя и ролики витрин. Профиль браузера отдельный, сохранение игрока не трогает.
 */
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Extrim/AppData/Local/Temp/seabattle-store-tools/node_modules/puppeteer-core');
const ffmpeg = require('C:/Users/Extrim/AppData/Local/Temp/seabattle-store-tools/node_modules/ffmpeg-static');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'http://127.0.0.1:5173/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LANGS = [
  { id: 'ru', title: 'Кильватер' },
  { id: 'en', title: 'Keelwater' },
  { id: 'es', title: 'Keelwater' },
];

function player(lang, theme) {
  return {
    name: '',
    nameSetFree: false,
    anchors: 80,
    careerScore: 0,
    visualTheme: theme,
    equippedSight: theme === 'pirate' ? 'spyglass' : 'classic',
    ownedSights: ['classic', 'spyglass'],
    equippedPortrait: 'default',
    ownedPortraits: ['default', 'cabin'],
    soundOn: false,
    musicOn: false,
    customMusicName: '',
    aimControl: 'buttons',
    hintSeen: true,
    lang,
    daily: {},
    subAnchorDay: '',
    entryAdDay: '',
    entryAdCount: 0,
    shopAdDay: '',
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function grab(page, file) {
  const canvas = await page.$('canvas');
  const buf = await canvas.screenshot({ type: 'png' });
  const meta = await sharp(buf).metadata();
  await sharp(buf)
    .resize(1920, 1080, {
      kernel: 'lanczos3',
      fit: meta.width / meta.height > 1.7 ? 'fill' : 'cover',
    })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

async function openGame(browser, lang, theme) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((state) => {
    localStorage.setItem('seabattle_player_v1', JSON.stringify(state));
  }, player(lang, theme));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const menu = window.game?.scene?.getScene('Menu');
    return !!(menu?.scene?.isActive?.() && menu.titleText?.text);
  }, { timeout: 40000 });
  return page;
}

async function startBattle(page) {
  await page.evaluate(() => window.game.scene.start('Game'));
  await page.waitForFunction(() => window.game.scene.getScene('Game')?.scene?.isActive?.(), {
    timeout: 15000,
  });
  await sleep(800);
}

async function aimAndFire(page) {
  await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    const ships = g.ships.getChildren().filter((s) => s.active && s.getData('alive'));
    const ship = ships[Math.min(1, ships.length - 1)];
    if (ship) g.setAimX(ship.x);
    g.tryFire();
  });
}

async function record(page, ms, webmPath) {
  await page.exposeFunction('__storeChunk', (b64) => {
    fs.appendFileSync(webmPath, Buffer.from(b64, 'base64'));
  });
  const started = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas.captureStream || typeof MediaRecorder === 'undefined') return false;
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    const rec = new MediaRecorder(canvas.captureStream(30), {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });
    let pending = 0;
    window.__recStopped = false;
    rec.ondataavailable = (ev) => {
      if (!ev.data?.size) return;
      pending += 1;
      ev.data.arrayBuffer().then(async (raw) => {
        const buf = new Uint8Array(raw);
        const step = 8000;
        let bin = '';
        for (let i = 0; i < buf.length; i += step) {
          bin += String.fromCharCode(...buf.subarray(i, Math.min(i + step, buf.length)));
        }
        await window.__storeChunk(btoa(bin));
        pending -= 1;
        if (window.__recStopped && pending === 0) window.__recFlush?.();
      });
    };
    window.__rec = rec;
    rec.start(400);
    return true;
  });
  if (!started) throw new Error('MediaRecorder unavailable');

  const start = Date.now();
  while (Date.now() - start < ms) {
    await page.evaluate(() => {
      const g = window.game?.scene?.getScene('Game');
      if (!g?.scene?.isActive?.() || g.gameOver) return;
      const ships = g.ships.getChildren().filter((s) => s.active && s.getData('alive'));
      if (!ships.length) return;
      const aim = ships[Math.floor(Date.now() / 900) % ships.length];
      g.setAimX(aim.x);
      const flying = g.torpedoes.getChildren().some((t) => t.active);
      if (!flying) g.tryFire();
    });
    await sleep(320);
  }
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.__recFlush = resolve;
        window.__rec.onstop = () => {
          window.__recStopped = true;
          setTimeout(resolve, 1200);
        };
        window.__rec.stop();
      }),
  );
  await sleep(400);
}

function ffmpegRun(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve(err);
      else reject(new Error(err.slice(-800)));
    });
  });
}

async function encode(lang) {
  const tmp = path.join(ROOT, 'store', '_tmp');
  const webm = path.join(tmp, `${lang}.webm`);
  const yandexDir = path.join(ROOT, 'store', 'yandex', 'video');
  const crazyDir = path.join(ROOT, 'store', 'crazygames', 'video');
  fs.mkdirSync(yandexDir, { recursive: true });
  fs.mkdirSync(crazyDir, { recursive: true });
  const horizontal = path.join(yandexDir, `${lang}-horizontal.mp4`);
  const vertical = path.join(yandexDir, `${lang}-vertical.mp4`);
  const land = path.join(crazyDir, `${lang}-landscape.mp4`);
  const portrait = path.join(crazyDir, `${lang}-portrait.mp4`);
  const coverL = path.join(ROOT, 'store', 'crazygames', lang, 'cover-landscape-1920x1080.png');
  const coverP = path.join(ROOT, 'store', 'crazygames', lang, 'cover-portrait-800x1200.png');

  await ffmpegRun([
    '-y',
    '-i',
    webm,
    '-an',
    '-vf',
    'scale=1920:1080:flags=lanczos,fps=30',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-movflags',
    '+faststart',
    horizontal,
  ]);
  await ffmpegRun([
    '-y',
    '-i',
    horizontal,
    '-an',
    '-vf',
    'crop=ih*9/16:ih,scale=1080:1920:flags=lanczos',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-movflags',
    '+faststart',
    vertical,
  ]);
  await ffmpegRun([
    '-y',
    '-loop',
    '1',
    '-t',
    '0.5',
    '-i',
    coverL,
    '-i',
    horizontal,
    '-filter_complex',
    '[0:v]scale=1920:1080,fps=30,format=yuv420p,setpts=PTS-STARTPTS[c];[1:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[g];[c][g]concat=n=2:v=1:a=0[v]',
    '-map',
    '[v]',
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-movflags',
    '+faststart',
    land,
  ]);
  await ffmpegRun([
    '-y',
    '-loop',
    '1',
    '-t',
    '0.5',
    '-i',
    coverP,
    '-i',
    horizontal,
    '-filter_complex',
    '[0:v]scale=1080:1620,fps=30,format=yuv420p,setpts=PTS-STARTPTS[c];[1:v]crop=ih*2/3:ih,scale=1080:1620:flags=lanczos,fps=30,format=yuv420p,setpts=PTS-STARTPTS[g];[c][g]concat=n=2:v=1:a=0[v]',
    '-map',
    '[v]',
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '20',
    '-movflags',
    '+faststart',
    portrait,
  ]);
  console.log('encoded', lang);
}

async function shootLang(browser, lang) {
  const dir = path.join(ROOT, 'store', '_shots', lang.id);
  fs.mkdirSync(dir, { recursive: true });
  const page = await openGame(browser, lang.id, 'classic');
  const title = await page.evaluate(() => window.game.scene.getScene('Menu').titleText.text);
  if (title !== lang.title) throw new Error(`${lang.id} title is ${title}`);

  await startBattle(page);
  await grab(page, path.join(dir, '01-fleet.png'));
  await aimAndFire(page);
  await sleep(380);
  await grab(page, path.join(dir, '02-torpedo.png'));
  await sleep(700);
  await grab(page, path.join(dir, '03-hit.png'));

  if (!process.env.SHOTS_ONLY) {
    const webm = path.join(ROOT, 'store', '_tmp', `${lang.id}.webm`);
    fs.mkdirSync(path.dirname(webm), { recursive: true });
    fs.writeFileSync(webm, Buffer.alloc(0));
    await record(page, 17000, webm);
  }
  await page.close();

  const pirate = await openGame(browser, lang.id, 'pirate');
  await startBattle(pirate);
  await sleep(400);
  await grab(pirate, path.join(dir, '04-pirate.png'));
  await pirate.close();
  console.log('shot', lang.id);
}

function publishShots() {
  for (const lang of LANGS) {
    const src = path.join(ROOT, 'store', '_shots', lang.id);
    for (const platform of ['yandex', 'crazygames']) {
      const dest = path.join(ROOT, 'store', platform, 'screenshots', lang.id);
      fs.mkdirSync(dest, { recursive: true });
      for (const name of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, name), path.join(dest, name));
      }
    }
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720 },
});

try {
  for (const lang of LANGS) {
    await shootLang(browser, lang);
  }
} finally {
  await browser.close();
}

publishShots();
if (!process.env.SHOTS_ONLY) {
  for (const lang of LANGS) {
    await encode(lang.id);
  }
}
console.log('capture done');
