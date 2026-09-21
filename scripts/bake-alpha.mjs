/**
 * Bake flat magenta / black backplates into real PNG alpha.
 * Soft matte + color unmix, so the pink fringe does not stay opaque.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const gen = path.resolve('../Users/Extrim/.cursor/projects/c-MyProject-Seabattle/assets');
const genDir = 'C:/Users/Extrim/.cursor/projects/c-MyProject-Seabattle/assets';
const pub = path.resolve('public/assets');

const magentaJobs = [
  [path.join(genDir, 'pirate-sub.png'), path.join(pub, 'pirate/ship-sub.png')],
  [path.join(genDir, 'pirate-container.png'), path.join(pub, 'pirate/ship-container.png')],
  [path.join(genDir, 'pirate-cargo.png'), path.join(pub, 'pirate/ship-cargo.png')],
  [path.join(genDir, 'pirate-war.png'), path.join(pub, 'pirate/ship-war.png')],
  [path.join(genDir, 'pirate-brig.png'), path.join(pub, 'pirate/ship-brig.png')],
  [path.join(genDir, 'classic-cargo.png'), path.join(pub, 'ship-cargo.png')],
  [path.join(genDir, 'classic-sub.png'), path.join(pub, 'ship-sub.png')],
  [path.join(pub, 'ship-war.png'), path.join(pub, 'ship-war.png')],
  [path.join(pub, 'ship-container.png'), path.join(pub, 'ship-container.png')],
  [path.join(pub, 'torpedo.png'), path.join(pub, 'torpedo.png')],
  [path.join(pub, 'sight-classic.png'), path.join(pub, 'sight-classic.png')],
  [path.join(pub, 'sight-holo.png'), path.join(pub, 'sight-holo.png')],
  [path.join(pub, 'sight-brass.png'), path.join(pub, 'sight-brass.png')],
  [path.join(pub, 'sight-diamond.png'), path.join(pub, 'sight-diamond.png')],
  [path.join(pub, 'sight-minimal.png'), path.join(pub, 'sight-minimal.png')],
  [path.join(pub, 'ui/sight-classic.png'), path.join(pub, 'ui/sight-classic.png')],
  [path.join(pub, 'ui/sight-holo.png'), path.join(pub, 'ui/sight-holo.png')],
  [path.join(pub, 'ui/sight-brass.png'), path.join(pub, 'ui/sight-brass.png')],
  [path.join(pub, 'ui/sight-diamond.png'), path.join(pub, 'ui/sight-diamond.png')],
  [path.join(pub, 'ui/sight-minimal.png'), path.join(pub, 'ui/sight-minimal.png')],
];

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function sampleCorner(data, width, height) {
  const pts = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  const acc = [0, 0, 0];
  for (const [x, y] of pts) {
    const i = (y * width + x) * 4;
    acc[0] += data[i];
    acc[1] += data[i + 1];
    acc[2] += data[i + 2];
  }
  return acc.map((v) => v / 4);
}

function keyMagenta(data, width, height) {
  const bg = sampleCorner(data, width, height);
  const plate = bg[0] > 140 && bg[1] < 90 && bg[0] - bg[1] > 90 && bg[2] > 50;
  if (!plate) {
    console.log('  skip, corners are not magenta', bg.map((n) => Math.round(n)).join(','));
    return false;
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    const inner = 32;
    const outer = 110;
    let a = dist <= inner ? 0 : dist >= outer ? 255 : ((dist - inner) / (outer - inner)) * 255;
    // Hot-pink plates compress away from pure magenta. Kill that rim, keep red paint (low blue).
    if (r > 155 && g < 120 && b > 75 && r - g > 50 && b - g > 30) a = Math.min(a, 16);
    if (a <= 2) {
      data[i + 3] = 0;
      continue;
    }
    if (a < 252) {
      const af = a / 255;
      data[i] = clampByte((r - bg[0] * (1 - af)) / af);
      data[i + 1] = clampByte((g - bg[1] * (1 - af)) / af);
      data[i + 2] = clampByte((b - bg[2] * (1 - af)) / af);
    } else if (r > 180 && b > 140 && g < 90) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = clampByte(a);
  }
  return true;
}

function keyBlack(data) {
  const threshold = 16;
  const outer = 46;
  for (let i = 0; i < data.length; i += 4) {
    const m = Math.max(data[i], data[i + 1], data[i + 2]);
    const a = m <= threshold ? 0 : m >= outer ? 255 : ((m - threshold) / (outer - threshold)) * 255;
    data[i + 3] = clampByte(a);
  }
}

function crop(data, width, height, pad = 2) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 10) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return { data, width, height };
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const si = ((y + minY) * width + (x + minX)) * 4;
      const di = (y * cw + x) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }
  return { data: out, width: cw, height: ch };
}

async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function writePng(file, raw) {
  const tmp = `${file}.baking.png`;
  await sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, file);
}

async function bakeMagenta(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('missing', src);
    return;
  }
  const raw = await loadRaw(src);
  const ok = keyMagenta(raw.data, raw.width, raw.height);
  if (!ok) return;
  const cropped = crop(raw.data, raw.width, raw.height);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await writePng(dest, cropped);
  console.log('magenta', path.basename(dest), cropped.width, cropped.height);
}

async function bakeBlack(src, dest) {
  const raw = await loadRaw(src);
  keyBlack(raw.data);
  const cropped = crop(raw.data, raw.width, raw.height, 4);
  await writePng(dest, cropped);
  console.log('black', path.basename(dest), cropped.width, cropped.height);
}

const only = process.argv.slice(2);
const wanted = (file) => only.length === 0 || only.some((name) => file.includes(name));

for (const [src, dest] of magentaJobs) {
  if (!wanted(src) && !wanted(dest)) continue;
  await bakeMagenta(src, dest);
}
if (only.length) {
  console.log('partial', only.join(','));
} else {
await bakeBlack(path.join(pub, 'explosion.png'), path.join(pub, 'explosion.png'));

const seaSrc = path.join(genDir, 'pirate-sea-islands.png');
const seaDest = path.join(pub, 'pirate/sea.jpg');
await sharp(seaSrc).jpeg({ quality: 84 }).toFile(seaDest);
console.log('sea', seaDest);
}
