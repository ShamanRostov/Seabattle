import Phaser from 'phaser';

/**
 * Soft chroma: magenta (+ near-corner pink).
 * Water only stripped from the bottom strip so grey warship paint survives.
 */
function prepareSprite(scene, key, { stripWaterBottom = 0.12 } = {}) {
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage();
  const w = src.width;
  const h = src.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const pick = (x, y) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const corners = [pick(1, 1), pick(w - 2, 1), pick(1, h - 2), pick(w - 2, h - 2)];
  const bg = [0, 1, 2].map((c) => Math.round(corners.reduce((s, p) => s + p[c], 0) / 4));

  const nearBg = (r, g, b) => {
    // Only treat as backdrop if close to magenta/pink corner color — not grey hull
    if (bg[0] < 160 || bg[2] < 140) return false;
    const dr = r - bg[0];
    const dg = g - bg[1];
    const db = b - bg[2];
    return Math.sqrt(dr * dr + dg * dg + db * db) < 38;
  };

  const waterLineY = Math.floor(h * (1 - stripWaterBottom));

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      const magenta =
        (r > 185 && b > 155 && g < 95 && r - g > 80 && b - g > 70) ||
        (r > 210 && b > 170 && g < 130 && r - g > 60);
      const waterBottom =
        y >= waterLineY &&
        b > 100 &&
        b > r + 30 &&
        b > g + 20 &&
        r < 95 &&
        g < 125;

      if (magenta || nearBg(r, g, b) || waterBottom) {
        d[i + 3] = 0;
      } else {
        d[i + 3] = 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(img, 0, 0);

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  let out = canvas;
  if (maxX > minX && maxY > minY) {
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, out).refresh();
}

function keyBlackToAlpha(scene, key, threshold = 28) {
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage();
  const w = src.width;
  const h = src.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] < threshold && d[i + 1] < threshold && d[i + 2] < threshold) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas).refresh();
}

function makeParticleDot(scene, key, color, size = 8) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(color, 1);
  g.fillCircle(size, size, size);
  g.generateTexture(key, size * 2, size * 2);
  g.destroy();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('sea', 'assets/sea.png');
    this.load.image('ship-cargo', 'assets/ship-cargo.png');
    this.load.image('ship-war', 'assets/ship-war.png');
    this.load.image('explosion', 'assets/explosion.png');
  }

  create() {
    prepareSprite(this, 'ship-cargo', { stripWaterBottom: 0.14 });
    prepareSprite(this, 'ship-war', { stripWaterBottom: 0.22 });
    keyBlackToAlpha(this, 'explosion', 32);

    makeParticleDot(this, 'spark', 0xffdd66, 5);
    makeParticleDot(this, 'smoke', 0x555555, 10);
    makeParticleDot(this, 'ember', 0xff5522, 4);
    makeParticleDot(this, 'splash', 0xaadfff, 6);

    this.scene.start('Game');
  }
}
