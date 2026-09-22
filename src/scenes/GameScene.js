import Phaser from 'phaser';
import { createGyroAim } from '../input/gyro.js';
import { sfx } from '../audio/sfx.js';
import { getContour } from '../contour/contour.js';
import { gameplayStart, gameplayStop, onPlatformPause, showInterstitial, showRewarded } from '../platform/platform.js';
import {
  loadPlayer,
  savePlayer,
  t,
  isPirateTheme,
  getLoadoutPerks,
  CRATE_LOOT_META,
  CRATE_ANCHOR_BONUS,
  pickCrateLoot,
  formatDuration,
  anchorWord,
  anchorsFromScore,
} from '../data/playerStore.js';

const W = 960;
const H = 540;
const MAX_LIVES = 5;
const TORPEDO_MS = 1000;
const ENEMY_TORPEDO_MS = 1500;
const WATERLINE = 175;
const SEA_HORIZON_T = 0.62;
const AIM_MIN = 80;
const AIM_MAX = W - 80;
const PLAYER_EDGE_Y = H - 48;
const TORPEDO_HIT_RADIUS = 28;
const CRATE_LAND_MS = 2000; // окно на торпеду после приводнения
const CRATE_FALL_MS = 3800;
/** Шанс, что акула проглотит ящик при приводнении */
const SHARK_EAT_CHANCE = 0.34;
/** Длительность временных баффов из сундука */
const CRATE_BUFF_MS = 10000;
const TRIPLE_SPREAD = 38;

/**
 * Лёгкое волнение воды.
 * Откат: поставь false — море снова статичное.
 */
const SEA_WAVES_ENABLED = true;

/** Очки за тип корабля + бонус за дальнюю дистанцию (lane 0 = далеко). */
const SHIP_SCORE = {
  'ship-cargo': 100, // торговый — проще
  'ship-container': 120, // контейнеровоз (объёмный стиль)
  'ship-war': 250, // военный стреляет
  'ship-brig': 320, // пиратский бриг — опаснее военного
  'ship-sub': 400, // лодка — быстрее / опаснее
};
const LANE_BONUS = [80, 50, 25, 0]; // далеко → близко
const INTERCEPT_SCORE = 75; // сбил вражескую торпеду
/** Штраф за каждый выстрел (меньше минимума за корабль = 100). */
const SHOT_PENALTY = 20;
/** До этой отметки темп обычный. Дальше ступень каждую минуту, без потолка по времени. */
const PRESSURE_START_MS = 60 * 1000;
const PRESSURE_STEP_MS = 60 * 1000;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.playerState = loadPlayer();
    this.perks = getLoadoutPerks(this.playerState);
    this.maxLives = MAX_LIVES + (this.perks.bonusStartLife || 0);

    this.aimX = W / 2;
    this.aimTargetX = W / 2;
    this.aimSmooth = 10;
    this.lives = this.maxLives;
    this.score = 0;
    this.battleTimeMs = 0;
    this.buffTripleMs = 0;
    this.buffRumMs = 0;
    this.echoReadyMs = 0;
    this.canFire = true;
    this.gameOver = false;
    this.briefing = false;
    this.simPaused = false;
    this.platformPaused = false;
    this.continueUsed = false;
    this.continueOpen = false;
    this._wentToMenu = false;
    this._menuCall = null;
    this.holdLeft = false;
    this.holdRight = false;
    this.pointerOverUi = false;
    this.touchAim = getContour().mobile;
    this.gyro = createGyroAim();
    this._onMouseMove = null;
    if (this.touchAim) this.input.addPointer(2);

    this.world = this.add.container(0, 0);
    this.drawSea();
    this.ships = this.add.group();
    this.torpedoes = this.add.group();
    this.enemyTorpedoes = this.add.group();
    this.missiles = this.add.group();
    this.lifeCrate = null;

    this.spawnShip(160, 1, 'ship-cargo');
    this.spawnShip(420, -1, 'ship-container');
    this.spawnShip(680, 1, 'ship-war');
    this.spawnShip(860, -1, isPirateTheme(this.playerState) ? 'ship-brig' : 'ship-sub');

    this.drawFrame();
    this.drawReticle();
    this.drawHud();
    this.bindInput();
    this.drawMobileControls();

    this.announcedLevel = 0;
    this.scheduleNextSpawn();

    this.time.delayedCall(9000, () => this.trySpawnLifeCrate());
    this.time.addEvent({
      delay: 16000,
      loop: true,
      callback: () => this.trySpawnLifeCrate(),
    });
    this.drawBriefing();
    this._offPause = onPlatformPause((paused) => {
      this.platformPaused = paused;
      if (paused) {
        this.releaseAimCapture();
        this.showBattleCursor();
      } else if (!this.gameOver && !this.continueOpen) {
        this.hideBattleCursor();
      }
    });
    if (!this.briefing) gameplayStart();
  }

  drawSea() {
    const pirate = isPirateTheme(loadPlayer());
    const fill = this.add.graphics();
    fill.fillStyle(pirate ? 0x1f9eb8 : 0x08344e, 1);
    fill.fillRect(0, 0, W, H);
    fill.setDepth(0);
    this.world.add(fill);

    const bg = this.add.image(W / 2, H / 2, 'sea');
    bg.setDepth(0);
    this.world.add(bg);
    this.placeSeaImage(bg);
    this.seaBg = bg;
    this.seaBgBaseY = bg.y;
    this.seaBgBaseX = bg.x;
    this.seaWaveTime = 0;

    if (!SEA_WAVES_ENABLED) return;

    const ripple = this.add.image(bg.x, bg.y, 'sea');
    ripple.setDisplaySize(bg.displayWidth * 1.04, bg.displayHeight * 1.04);
    ripple.setAlpha(pirate ? 0.14 : 0.22);
    ripple.setTint(pirate ? 0xffe0b0 : 0xa8d8ff);
    ripple.setBlendMode(Phaser.BlendModes.ADD);
    ripple.setDepth(1);
    this.world.add(ripple);
    this.seaRipple = ripple;

    this.seaGlints = this.add.graphics();
    this.seaGlints.setDepth(2);
    this.seaGlints.setAlpha(0.55);
    this.world.add(this.seaGlints);
  }

  /** Горизонт текстуры садится на ватерлинию, низ кадра остаётся водой. */
  placeSeaImage(img) {
    const src = img.texture.getSourceImage();
    const horizonT = Phaser.Math.Clamp(this.estimateHorizonT(src), 0.22, 0.68);
    const dispH = Math.ceil((H - WATERLINE + 48) / (1 - horizonT));
    const aspect = src.width / Math.max(1, src.height);
    const dispW = Math.max(W + 140, dispH * aspect);
    img.setDisplaySize(dispW, dispH);
    const top = WATERLINE - horizonT * dispH;
    img.setPosition(W / 2, top + dispH / 2);
  }

  estimateHorizonT(src) {
    const w = src.width;
    const h = src.height;
    const cols = 36;
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < cols; i += 1) {
      const sx = Math.floor(((i + 0.5) / cols) * w);
      ctx.drawImage(src, sx, 0, 1, h, i, 0, 1, h);
    }
    const data = ctx.getImageData(0, 0, cols, h).data;
    const pix = (x, y) => {
      const i = (y * cols + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    // Закат над бирюзой: небо оранжевое, вода — где зелёный и синий обгоняют красный.
    let skyR = 0;
    let skyB = 0;
    const skyY = Math.floor(h * 0.22);
    for (let x = 0; x < cols; x += 1) {
      const [r, , b] = pix(x, skyY);
      skyR += r;
      skyB += b;
    }
    if (skyR > skyB + cols * 25) {
      for (let y = Math.floor(h * 0.3); y < h * 0.72; y += 1) {
        let cyan = 0;
        for (let x = 0; x < cols; x += 1) {
          const [r, g, b] = pix(x, y);
          if (g > r + 6 && b + 8 > r) cyan += 1;
        }
        if (cyan >= cols * 0.45) return y / h;
      }
    }

    const lum = new Float32Array(h);
    for (let y = 0; y < h; y += 1) {
      let sum = 0;
      for (let x = 0; x < cols; x += 1) {
        const [r, g, b] = pix(x, y);
        sum += r * 0.3 + g * 0.59 + b * 0.11;
      }
      lum[y] = sum / cols;
    }
    const rad = Math.max(2, Math.floor(h * 0.006));
    const smooth = new Float32Array(h);
    for (let y = 0; y < h; y += 1) {
      let sum = 0;
      let n = 0;
      for (let k = -rad; k <= rad; k += 1) {
        const yy = y + k;
        if (yy < 0 || yy >= h) continue;
        sum += lum[yy];
        n += 1;
      }
      smooth[y] = sum / n;
    }
    const step = Math.max(3, Math.floor(h * 0.012));
    let best = 0;
    let bestY = Math.floor(h * 0.45);
    for (let y = Math.floor(h * 0.2); y < h * 0.7; y += 1) {
      const drop = smooth[Math.max(0, y - step)] - smooth[Math.min(h - 1, y + step)];
      if (drop > best) {
        best = drop;
        bestY = y;
      }
    }
    return best < 6 ? 0.48 : bestY / h;
  }

  updateSeaWaves(time, delta) {
    if (!SEA_WAVES_ENABLED || !this.seaBg) return;

    this.seaWaveTime += delta;
    const t = this.seaWaveTime;

    // Море не сдвигается под корпусами — иначе корабли скользят над водой.
    this.seaBg.y = this.seaBgBaseY;
    this.seaBg.x = this.seaBgBaseX;

    if (this.seaRipple) {
      this.seaRipple.y = this.seaBgBaseY;
      this.seaRipple.x = this.seaBgBaseX;
      this.seaRipple.setAlpha(0.22 + (Math.sin(t * 0.0025) * 0.5 + 0.5) * 0.18);
      this.seaRipple.setScale(
        1.02 + Math.sin(t * 0.0013) * 0.015,
        1.03 + Math.cos(t * 0.0016) * 0.02,
      );
    }

    if (this.seaGlints) {
      const g = this.seaGlints;
      g.clear();
      const baseY = WATERLINE + 12;
      for (let i = 0; i < 7; i += 1) {
        const alpha = 0.45 - i * 0.04;
        g.lineStyle(2.5 - i * 0.15, 0xffffff, alpha);
        const y = baseY + i * 20 + Math.sin(t * 0.0022 + i * 0.9) * 7;
        const phase = t * 0.0018 + i * 1.4;
        const drift = ((phase * 55) % (W + 120)) - 60;
        g.beginPath();
        for (let x = 0; x <= W + 100; x += 12) {
          const yy = y + Math.sin((x + phase * 90) * 0.028 + i) * 5;
          if (x === 0) g.moveTo(drift + x, yy);
          else g.lineTo(drift + x, yy);
        }
        g.strokePath();
      }

      // Блики-овалы на гребнях
      g.fillStyle(0xffffff, 0.18);
      for (let i = 0; i < 6; i += 1) {
        const gx = ((t * 0.04 + i * 170) % (W + 100)) - 40;
        const gy = WATERLINE + 28 + i * 18 + Math.sin(t * 0.002 + i) * 6;
        g.fillEllipse(gx, gy, 48 + (i % 3) * 10, 6);
      }
    }
  }

  spawnShip(x, dir, forcedKey = null) {
    // 0 = далеко у горизонта, 3 = близко к игроку
    const lane = Phaser.Math.Between(0, 3);
    const y = WATERLINE + 4 + lane * 14;
    const pirate = isPirateTheme(this.playerState || loadPlayer());
    const level = this.pressureLevel();
    const roll = Math.random();
    let key = forcedKey;
    if (!key && level > 0 && roll < Math.min(0.62, level * 0.2)) {
      const arm = Math.random();
      key = pirate
        ? arm < 0.4
          ? 'ship-sub'
          : arm < 0.7
            ? 'ship-brig'
            : 'ship-war'
        : arm < 0.45
          ? 'ship-sub'
          : 'ship-war';
    }
    if (!key) {
      if (pirate) {
        // cargo 26% / container 22% / war 22% / brig 14% / sub 16%
        key =
          roll < 0.26
            ? 'ship-cargo'
            : roll < 0.48
              ? 'ship-container'
              : roll < 0.7
                ? 'ship-war'
                : roll < 0.84
                  ? 'ship-brig'
                  : 'ship-sub';
      } else {
        key =
          roll < 0.28
            ? 'ship-cargo'
            : roll < 0.52
              ? 'ship-container'
              : roll < 0.78
                ? 'ship-war'
                : 'ship-sub';
      }
    }

    const foamW = 70 + lane * 18;
    const foam = this.add.ellipse(
      x,
      y + 2,
      foamW * (pirate ? 1.15 : 1),
      (8 + lane * 2) * (pirate ? 1.4 : 1),
      pirate ? 0xfff6e0 : 0xffffff,
      pirate ? 0.45 : 0.18 + lane * 0.04,
    );
    this.world.add(foam);
    const shadow = this.add.ellipse(x, y + 5, foamW * 0.85, pirate ? 11 : 7, 0x041820, pirate ? 0.28 : 0.4);
    shadow.setDepth(8 + lane);
    this.world.add(shadow);

    const ship = this.add.image(x, y, key);
    ship.setOrigin(0.5, 0.98);
    const sizeMul =
      (key === 'ship-sub' ? 0.95 : key === 'ship-container' ? 1.26 : key === 'ship-brig' ? 1.04 : key === 'ship-cargo' ? 0.92 : 1) *
      (pirate ? 1.12 : 1);
    const targetW = (85 + lane * 32 + Phaser.Math.Between(-8, 12)) * sizeMul;
    ship.setScale(targetW / Math.max(1, ship.width));
    // Прозрачный киль уже съеден. Опускаем дальше, чтобы вода резала непрозрачный борт.
    const keel = { 'ship-sub': 0.34, 'ship-container': 0.24, 'ship-cargo': 0.22, 'ship-war': 0.24, 'ship-brig': 0.24 };
    ship.y = y + ship.displayHeight * (keel[key] || 0.14);
    shadow.setDisplaySize(targetW * 0.72, pirate ? 12 : 8);
    this.applyShipFacing(ship, key, dir);
    ship.setDepth(10 + lane);
    foam.setDepth(9 + lane);

    const base = 12 + lane * 14 + (key === 'ship-sub' ? 8 : key === 'ship-brig' ? 4 : 0);
    const speed = base + Math.random() * (16 + lane * 10);

    // Развороты: почти каждый корабль хотя бы раз, пока ещё на экране
    const turnsLeft = Math.random() < 0.85 ? Phaser.Math.Between(1, 2) : 0;
    const turnIn = turnsLeft > 0 ? Phaser.Math.Between(2800, 7000) : 999999;

    const canFireTorpedo = key === 'ship-war' || key === 'ship-sub' || key === 'ship-brig';
    // Иногда грузовой запускает ракету (не раньше 3 сек в кадре). После 5-й минуты чаще.
    const missileChance = Math.min(0.8, 0.32 + this.pressureLevel() * 0.12);
    const mayLaunchMissile =
      (key === 'ship-cargo' || key === 'ship-container') && Math.random() < missileChance;

    const fireLo = key === 'ship-sub' ? 1500 : key === 'ship-brig' ? 1800 : 2000;
    const fireHi = key === 'ship-sub' ? 4000 : key === 'ship-brig' ? 4500 : 5000;
    const rush = Math.max(0.4, 1 - this.pressureLevel() * 0.15);

    ship.setData({
      dir,
      speed,
      alive: true,
      lane,
      key,
      hitHalf: ship.displayWidth * (key === 'ship-sub' ? 0.42 : 0.36),
      foam,
      shadow,
      surfaceY: y,
      wakeAcc: 0,
      turnIn,
      turnsLeft,
      visibleMs: 0,
      fireAfterMs: canFireTorpedo
        ? Math.round(Phaser.Math.Between(fireLo, fireHi) * rush)
        : mayLaunchMissile
          ? Math.round(Phaser.Math.Between(3000, 6500) * rush)
          : 0,
      reloadMs: 0,
      hasFired: false,
      weapon: canFireTorpedo ? 'torpedo' : mayLaunchMissile ? 'missile' : null,
    });
    this.world.add(ship);
    this.ships.add(ship);
  }

  /** 0 до 1:00, затем 1, 2, 3… каждую минуту. */
  pressureLevel() {
    if (this.battleTimeMs < PRESSURE_START_MS) return 0;
    return 1 + Math.floor((this.battleTimeMs - PRESSURE_START_MS) / PRESSURE_STEP_MS);
  }

  shipCap() {
    const caps = [5, 7, 9, 11, 12];
    return caps[Math.min(this.pressureLevel(), caps.length - 1)];
  }

  spawnDelayMs() {
    const delays = [3000, 1800, 1200, 900, 700];
    return delays[Math.min(this.pressureLevel(), delays.length - 1)];
  }

  /** Пауза между повторными залпами. На спокойном море повторных залпов нет. */
  repeatFireMs() {
    const gaps = [0, 4200, 2600, 1700, 1200];
    return gaps[Math.min(this.pressureLevel(), gaps.length - 1)];
  }

  scheduleNextSpawn() {
    this._spawnCall = this.time.delayedCall(this.spawnDelayMs(), () => {
      if (this.gameOver) return;
      if (!this.briefing && this.ships.countActive(true) < this.shipCap()) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.spawnShip(dir > 0 ? -80 : W + 80, dir);
      }
      if (!this.gameOver) this.scheduleNextSpawn();
    });
  }

  announcePressure(level) {
    const player = this.playerState || loadPlayer();
    const lines =
      player.lang === 'en'
        ? ['THEY CLOSE IN', 'THE STORM BUILDS', 'THE SEA HOLDS']
        : player.lang === 'es'
          ? ['CIERRAN EL CERCO', 'ARRECIA EL TEMPORAL', 'EL MAR NO SUELTA']
          : ['КОЛЬЦО СЖИМАЕТСЯ', 'ШТОРМ КРЕПЧАЕТ', 'МОРЕ НЕ ОТПУСКАЕТ'];
    const label = lines[Math.min(Math.max(level, 1), lines.length) - 1];
    const popup = this.add
      .text(W / 2, 86, label, {
        fontFamily: this.hudFont || 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffd27a',
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(140);
    this.tweens.add({
      targets: popup,
      y: 64,
      alpha: 0,
      delay: 1100,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  applyShipFacing(ship, key, dir) {
    // Пиратские боковые спрайты: нос влево → flip при движении вправо
    if (isPirateTheme(loadPlayer())) {
      ship.setFlipX(dir > 0);
      return;
    }
    // Классика: нос влево у war/container; нос вправо у cargo/sub
    if (key === 'ship-war' || key === 'ship-container') ship.setFlipX(dir > 0);
    else ship.setFlipX(dir < 0);
  }

  reverseShip(ship) {
    const dir = -ship.getData('dir');
    ship.setData('dir', dir);
    this.applyShipFacing(ship, ship.getData('key'), dir);
    const lane = ship.getData('lane') || 0;
    const key = ship.getData('key');
    const base = 12 + lane * 14 + (key === 'ship-sub' ? 8 : key === 'ship-brig' ? 4 : 0);
    ship.setData('speed', base + Math.random() * (16 + lane * 10));
    // короткий «рывок» — чтобы разворот было видно
    this.tweens.add({
      targets: ship,
      scaleX: ship.scaleX * 1.08,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  drawFrame() {
    const pirate = isPirateTheme(this.playerState);
    const hole = this.make.graphics({ x: 0, y: 0 }, false);
    hole.fillStyle(0xffffff);
    hole.fillRoundedRect(28, 22, W - 56, H - 44, 22);
    this.world.setMask(hole.createGeometryMask());

    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(90);
    const cover = this.make.graphics({ x: 0, y: 0 }, false);
    cover.fillStyle(pirate ? 0x1a1008 : 0x12161a, 1);
    cover.fillRect(0, 0, W, H);
    rt.draw(cover);
    const cut = this.make.graphics({ x: 0, y: 0 }, false);
    cut.fillStyle(0xffffff);
    cut.fillRoundedRect(28, 22, W - 56, H - 44, 22);
    rt.erase(cut);

    this.drawVignette(pirate);
    this.drawBezel(pirate);
  }

  drawVignette(pirate) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H * 0.46, H * 0.72);
    glow.addColorStop(0, 'rgba(0,0,0,0)');
    glow.addColorStop(1, pirate ? 'rgba(40,18,4,0.45)' : 'rgba(0,0,0,0.5)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = pirate ? 'rgba(255,236,200,0.14)' : 'rgba(210,230,240,0.16)';
    ctx.lineWidth = 1;
    const scratches = [
      [80, 70, 210, 96],
      [640, 120, 820, 150],
      [140, 400, 280, 430],
      [700, 360, 860, 410],
      [400, 80, 470, 140],
    ];
    scratches.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    if (this.textures.exists('vignette')) this.textures.remove('vignette');
    this.textures.addCanvas('vignette', canvas);
    const veil = this.add.image(W / 2, H / 2, 'vignette').setDepth(80);
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff);
    mask.fillRoundedRect(28, 22, W - 56, H - 44, 22);
    veil.setMask(mask.createGeometryMask());
  }

  drawBezel(pirate) {
    const g = this.add.graphics().setDepth(96);
    const metal = pirate ? 0x8a5a28 : 0x6d767c;
    const edge = pirate ? 0xe6c27a : 0xd5dde2;
    g.lineStyle(16, metal, 1);
    g.strokeRoundedRect(20, 14, W - 40, H - 28, 26);
    g.lineStyle(3, edge, 0.85);
    g.strokeRoundedRect(34, 28, W - 68, H - 56, 16);
    g.lineStyle(2, pirate ? 0x3a2208 : 0x1c2226, 0.9);
    g.strokeRoundedRect(28, 22, W - 56, H - 44, 22);
  }

  drawReticle() {
    const pirate = isPirateTheme(this.playerState);
    this.reticle = this.add.container(this.aimX, WATERLINE).setDepth(100);
    const g = this.add.graphics();
    const color = pirate ? 0xf0d090 : 0xff4a4a;
    const arm = 22;
    const gap = 11;
    g.lineStyle(2, color, 0.92);
    // Уголки: центр пустой, корабль виден.
    g.strokeRect(-arm, -arm, 10, 10);
    g.strokeRect(arm - 10, -arm, 10, 10);
    g.strokeRect(-arm, arm - 10, 10, 10);
    g.strokeRect(arm - 10, arm - 10, 10, 10);
    g.lineStyle(1.5, color, 0.8);
    g.lineBetween(-arm - 8, 0, -gap, 0);
    g.lineBetween(gap, 0, arm + 8, 0);
    g.lineBetween(0, -arm - 6, 0, -gap);
    g.lineBetween(0, gap, 0, arm + 6);
    g.fillStyle(color, 0.95);
    g.fillCircle(0, 0, 1.6);
    this.reticle.add(g);
  }

  drawHud() {
    const player = this.playerState;
    const pirate = isPirateTheme(player);
    const font = pirate
      ? 'Georgia, "Palatino Linotype", serif'
      : 'Segoe UI, system-ui, sans-serif';
    this.hudFont = font;
    const scoreWord =
      player.lang === 'en' ? 'SCORE' : player.lang === 'es' ? 'PUNTOS' : 'ОЧКИ';
    const timeWord =
      player.lang === 'en' ? 'TIME' : player.lang === 'es' ? 'TIEMPO' : 'ВРЕМЯ';
    const labelColor = pirate ? '#f0d9a8' : '#ff5a5a';
    const valueColor = pirate ? '#fff6e4' : '#ffffff';
    const stroke = pirate ? '#3a2208' : '#000000';
    const style = { fontFamily: font, color: labelColor };

    this.add
      .text(56, 40, scoreWord, { ...style, fontSize: '16px', fontStyle: '700' })
      .setDepth(120);
    this.scoreLabel = this.add
      .text(130, 36, '0', {
        fontFamily: font,
        fontSize: '28px',
        color: valueColor,
        fontStyle: '700',
        stroke,
        strokeThickness: 4,
      })
      .setDepth(120);

    this.add
      .text(W - 56, 40, timeWord, { ...style, fontSize: '16px', fontStyle: '700' })
      .setOrigin(1, 0)
      .setDepth(120);
    this.timeLabel = this.add
      .text(W - 56, 58, '0:00', {
        fontFamily: font,
        fontSize: '28px',
        color: valueColor,
        fontStyle: '700',
        stroke,
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(120);

    this.ensureLifeIcon(pirate);
    this.hearts = [];
    for (let i = 0; i < this.maxLives; i += 1) {
      const heart = this.add
        .image(68 + i * 34, 96, this.lifeKey)
        .setDepth(120)
        .setScale(1);
      this.hearts.push(heart);
    }

    this.gameOverText = this.add
      .text(W / 2, 200, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '32px',
        color: '#fff',
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setVisible(false);

    // На мобильных контурах прицел ведут кнопки или гироскоп, выстрел — своя кнопка.
    this.buffLabel = this.add
      .text(W / 2, 72, '', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffe8a0',
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(130);
    this.refreshHud();
  }

  ensureLifeIcon(pirate) {
    const key = pirate ? 'life-pirate' : 'life-classic';
    this.lifeKey = key;
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.translate(16, 17);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-16, -6, -8, -16, 0, -7);
    ctx.bezierCurveTo(8, -16, 16, -6, 0, 7);
    ctx.closePath();
    ctx.fillStyle = pirate ? '#c4333c' : '#e4253c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pirate ? '#f0d090' : '#4a0008';
    ctx.stroke();
    ctx.fillStyle = pirate ? 'rgba(255, 228, 170, 0.45)' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-4, -5, 3.2, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    this.textures.addCanvas(key, canvas);
  }

  drawBriefing() {
    if (this.playerState.hintSeen) return;
    this.briefing = true;
    const pirate = isPirateTheme(this.playerState);
    const layer = this.add.container(0, 0).setDepth(220);
    this.briefingLayer = layer;
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5));
    if (pirate && this.textures.exists('panel')) {
      layer.add(this.add.image(W / 2, H / 2, 'panel').setDisplaySize(700, 360));
    } else {
      layer.add(
        this.add
          .rectangle(W / 2, H / 2, 620, 300, 0x0d1a24, 0.97)
          .setStrokeStyle(2, 0x4a8ab0),
      );
    }
    const font = pirate
      ? 'Georgia, "Palatino Linotype", serif'
      : 'Segoe UI, system-ui, sans-serif';
    layer.add(
      this.add
        .text(W / 2, H / 2 - 16, t(this.playerState, 'hintBody'), {
          fontFamily: font,
          fontSize: pirate ? '22px' : '20px',
          color: pirate ? '#3a2208' : '#e8f4ff',
          align: 'center',
          lineSpacing: 10,
          wordWrap: { width: 480 },
        })
        .setOrigin(0.5),
    );
    layer.add(
      this.add
        .text(W / 2, H / 2 + 118, t(this.playerState, 'hintGo'), {
          fontFamily: font,
          fontSize: '16px',
          color: pirate ? '#8a5a20' : '#9ec9e8',
        })
        .setOrigin(0.5),
    );
  }

  dismissBriefing() {
    if (!this.briefing) return;
    this.briefing = false;
    this.briefingLayer?.destroy(true);
    this.briefingLayer = null;
    this.playerState.hintSeen = true;
    savePlayer(this.playerState);
    this.mobileLayer?.setVisible(true);
    sfx.unlock();
    gameplayStart();
  }

  makeButton(x, y, label, onDown, width = 64) {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 48, 0x111827, 0.7).setStrokeStyle(2, 0xff5555);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '18px',
        color: '#ff7777',
      })
      .setOrigin(0.5);
    c.add([bg, t]);
    c.setSize(width, 48);
    c.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -24, width, 48), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => {
      this.pointerOverUi = true;
    });
    c.on('pointerout', () => {
      this.pointerOverUi = false;
    });
    c.on('pointerdown', () => onDown());
    return c;
  }

  drawMobileControls() {
    if (!this.touchAim) return;
    this.mobileAim = this.playerState.aimControl === 'gyro' ? 'gyro' : 'buttons';
    const layer = this.add.container(0, 0).setDepth(140);
    this.mobileLayer = layer;
    this.steerIds = { left: null, right: null };
    layer.add(this.makeFireButton(W - 86, H - 78));
    if (this.mobileAim === 'buttons') {
      this.addSteerButtons(layer);
    } else {
      this.gyro.enable().then((ok) => {
        if (!this.scene?.isActive()) {
          this.gyro.disable();
          return;
        }
        if (ok || !this.mobileLayer?.active) return;
        this.mobileAim = 'buttons';
        this.addSteerButtons(this.mobileLayer);
      });
    }
    if (this.briefing) layer.setVisible(false);
  }

  addSteerButtons(layer) {
    layer.add(this.makeSteerButton(78, H - 78, 'left'));
    layer.add(this.makeSteerButton(172, H - 78, 'right'));
  }

  makeFireButton(x, y) {
    const pirate = isPirateTheme(this.playerState);
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    if (pirate) {
      g.fillStyle(0x5a3014, 1);
      g.fillCircle(0, 0, 42);
      g.lineStyle(5, 0xe6c27a, 1);
      g.strokeCircle(0, 0, 42);
      g.fillStyle(0x3a2010, 1);
      g.fillRoundedRect(-18, 8, 36, 14, 4);
      g.fillStyle(0x24160c, 1);
      g.beginPath();
      g.moveTo(-9, 10);
      g.lineTo(-7, -18);
      g.lineTo(7, -18);
      g.lineTo(9, 10);
      g.closePath();
      g.fillPath();
      g.lineStyle(3, 0xe6c27a, 1);
      g.strokeCircle(0, -18, 6);
    } else {
      g.fillStyle(0x0c1c28, 1);
      g.fillCircle(0, 0, 42);
      g.lineStyle(4, 0x9fd4ea, 1);
      g.strokeCircle(0, 0, 42);
      g.lineStyle(2, 0x3d6478, 1);
      g.strokeCircle(0, 0, 33);
      g.fillStyle(0xc42828, 1);
      g.fillCircle(0, 0, 22);
      g.fillStyle(0xffe0e0, 0.45);
      g.fillCircle(-7, -7, 6);
    }
    c.add(g);
    c.setSize(88, 88);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, 44), Phaser.Geom.Circle.Contains);
    const press = (down) => {
      c.setScale(down ? 0.94 : 1);
      this.pointerOverUi = down;
    };
    c.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      press(true);
      if (this.briefing) {
        this.dismissBriefing();
        return;
      }
      if (this.continueOpen || this.simPaused || this.gameOver) return;
      this.tryFire();
    });
    c.on('pointerup', () => press(false));
    c.on('pointerout', () => press(false));
    c.on('pointerupoutside', () => press(false));
    return c;
  }

  makeSteerButton(x, y, side) {
    const pirate = isPirateTheme(this.playerState);
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    if (pirate) {
      g.fillStyle(0x5a3014, 1);
      g.fillCircle(0, 0, 34);
      g.lineStyle(4, 0xe6c27a, 1);
      g.strokeCircle(0, 0, 34);
    } else {
      g.fillStyle(0x102430, 0.92);
      g.fillCircle(0, 0, 34);
      g.lineStyle(3, 0x8ec8e8, 1);
      g.strokeCircle(0, 0, 34);
    }
    const glyph = this.add
      .text(0, -2, side === 'left' ? '‹' : '›', {
        fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
        fontSize: '42px',
        color: pirate ? '#fff4d8' : '#d7f2ff',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    c.add([g, glyph]);
    c.setSize(72, 72);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, 36), Phaser.Geom.Circle.Contains);
    const hold = (down, pointer) => {
      if (down) {
        this.steerIds[side] = pointer?.id ?? true;
        if (side === 'left') this.holdLeft = true;
        else this.holdRight = true;
        this.pointerOverUi = true;
        c.setScale(0.94);
        return;
      }
      const id = pointer?.id;
      if (id != null && this.steerIds[side] !== id && this.steerIds[side] !== true) return;
      this.steerIds[side] = null;
      if (side === 'left') this.holdLeft = false;
      else this.holdRight = false;
      this.pointerOverUi = this.holdLeft || this.holdRight;
      c.setScale(1);
    };
    c.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      hold(true, pointer);
    });
    c.on('pointerup', (pointer) => hold(false, pointer));
    c.on('pointerout', (pointer) => hold(false, pointer));
    c.on('pointerupoutside', (pointer) => hold(false, pointer));
    return c;
  }

  setAimX(x) {
    let next = x;
    if (this.buffRumMs > 0) next = W - x;
    this.aimTargetX = Phaser.Math.Clamp(next, AIM_MIN, AIM_MAX);
  }

  /** Инкремент прицела от клавиш/гиро (ром инвертирует направление) */
  nudgeAim(deltaX) {
    const dir = this.buffRumMs > 0 ? -1 : 1;
    this.aimTargetX = Phaser.Math.Clamp(this.aimTargetX + deltaX * dir, AIM_MIN, AIM_MAX);
  }

  applyAim(delta) {
    const t = 1 - Math.exp(-this.aimSmooth * (delta / 1000));
    this.aimX = Phaser.Math.Linear(this.aimX, this.aimTargetX, t);
    if (this.reticle) this.reticle.x = this.aimX;
  }

  bindInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE,R');
    this.keys.SPACE.on('down', () => {
      if (this.briefing) {
        this.dismissBriefing();
        return;
      }
      if (this.continueOpen || this.simPaused || this.gameOver) return;
      this.tryFire();
    });
    this.keys.R.on('down', () => {
      if (this.continueOpen || this.simPaused) return;
      if (this.gameOver) this.goToMenu();
      else this.restart();
    });

    const canvas = this.game.canvas;
    this.hideBattleCursor();

    this._onMouseMove = (e) => {
      if (this.touchAim || this.gameOver || this.continueOpen || this.pointerOverUi) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0) return;
      if (document.pointerLockElement === canvas) {
        this.nudgeAim(e.movementX * (W / rect.width));
        return;
      }
      const x = ((e.clientX - rect.left) / rect.width) * W;
      this.setAimX(x);
    };
    window.addEventListener('mousemove', this._onMouseMove);

    this.input.on('pointermove', (pointer) => {
      if (this.touchAim || this.gameOver || this.pointerOverUi) return;
      if (document.pointerLockElement === canvas) return;
      this.setAimX(pointer.x);
    });

    this.input.on('pointerdown', (pointer) => {
      sfx.unlock();
      if (this.briefing) {
        this.dismissBriefing();
        this.captureAim();
        return;
      }
      if (this.continueOpen || this.simPaused) return;
      if (this.pointerOverUi) return;
      if (this.gameOver) {
        this.goToMenu();
        return;
      }
      if (this.touchAim) return;
      if (document.pointerLockElement !== canvas) this.setAimX(pointer.x);
      if (pointer.leftButtonDown()) this.tryFire();
      this.captureAim();
    });

    this.events.once('shutdown', () => {
      this.teardownInput();
      this._offPause?.();
      this.continueLayer?.destroy(true);
      gameplayStop();
    });
  }

  hideBattleCursor() {
    if (this.touchAim) return;
    document.body.classList.add('sb-aim');
    if (this.game?.canvas) this.game.canvas.style.cursor = 'none';
    this.input?.setDefaultCursor('none');
  }

  showBattleCursor() {
    document.body.classList.remove('sb-aim');
    if (this.game?.canvas) this.game.canvas.style.cursor = 'default';
    this.input?.setDefaultCursor('default');
  }

  captureAim() {
    if (this.touchAim || this.gameOver || this.continueOpen || this.platformPaused) return;
    const canvas = this.game?.canvas;
    if (!canvas || document.pointerLockElement === canvas) return;
    const request = canvas.requestPointerLock?.();
    if (request && typeof request.catch === 'function') request.catch(() => {});
  }

  releaseAimCapture() {
    const canvas = this.game?.canvas;
    if (canvas && document.pointerLockElement === canvas) document.exitPointerLock?.();
  }

  teardownInput() {
    if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove);
    this.releaseAimCapture();
    this.showBattleCursor();
    this.gyro.disable();
  }

  restart() {
    this.teardownInput();
    this.scene.restart();
  }

  tryFire() {
    if (this.gameOver || !this.canFire) return;
    // Пока своя торпеда в полёте — вторую нельзя
    if (this.torpedoes.countActive(true) > 0) return;

    this.canFire = false;
    sfx.shot();
    this.aimX = this.aimTargetX;
    if (this.reticle) this.reticle.x = this.aimX;

    const aimX = this.aimX;
    const startY = PLAYER_EDGE_Y - 10;
    const aims =
      this.buffTripleMs > 0
        ? [aimX - TRIPLE_SPREAD, aimX, aimX + TRIPLE_SPREAD].map((x) =>
            Phaser.Math.Clamp(x, AIM_MIN, AIM_MAX),
          )
        : [aimX];

    // Эхо-ядро (Весёлый Роджер) — доп. торпеда со смещением, если кулдаун готов
    const echoOk = this.perks.echoShot && this.echoReadyMs <= 0 && this.buffTripleMs <= 0;
    if (echoOk) {
      const side = Math.random() < 0.5 ? -1 : 1;
      aims.push(
        Phaser.Math.Clamp(aimX + side * (this.perks.echoSpread || 32), AIM_MIN, AIM_MAX),
      );
      this.echoReadyMs = this.perks.echoCooldownMs || 4500;
    }

    aims.forEach((ax) => {
      const torpedo = this.makeTorpedoSprite(ax, startY, { angle: -90, lengthPx: 108 });
      torpedo.setData({
        progress: 0,
        aimX: ax,
        startY,
        hitChecked: false,
        startScale: torpedo.getData('startScale'),
        trail: torpedo.getData('trail'),
        enemy: false,
      });
      this.torpedoes.add(torpedo);
    });

    const penalty = Math.max(
      5,
      Math.round(SHOT_PENALTY * (this.perks.shotPenaltyMult ?? 1) + (this.perks.shotPenaltyAdd || 0)),
    );
    this.addScore(-penalty, aimX, startY - 24);

    this.time.delayedCall(200, () => {
      this.canFire = true;
    });
  }

  refreshHud() {
    if (this.scoreLabel) this.scoreLabel.setText(String(this.score));
    this.refreshBuffHud();
  }

  refreshBuffHud() {
    if (!this.buffLabel) return;
    const player = loadPlayer();
    const parts = [];
    if (this.buffTripleMs > 0) {
      const sec = Math.ceil(this.buffTripleMs / 1000);
      parts.push(
        player.lang === 'en'
          ? `TRIPLE ${sec}s`
          : player.lang === 'es'
            ? `TRIPLE ${sec}s`
            : `ТРОЙНОЙ ${sec}с`,
      );
    }
    if (this.buffRumMs > 0) {
      const sec = Math.ceil(this.buffRumMs / 1000);
      parts.push(
        player.lang === 'en' ? `RUM ${sec}s` : player.lang === 'es' ? `RON ${sec}s` : `РОМ ${sec}с`,
      );
    }
    this.buffLabel.setText(parts.join('  ·  '));
  }

  tickBuffs(delta) {
    let changed = false;
    if (this.buffTripleMs > 0) {
      this.buffTripleMs = Math.max(0, this.buffTripleMs - delta);
      changed = true;
    }
    if (this.buffRumMs > 0) {
      this.buffRumMs = Math.max(0, this.buffRumMs - delta);
      changed = true;
    }
    if (this.echoReadyMs > 0) {
      this.echoReadyMs = Math.max(0, this.echoReadyMs - delta);
    }
    if (changed) this.refreshBuffHud();
    this.updateCrateScan();
  }

  pointsForShip(ship) {
    const key = ship.getData('key') || 'ship-cargo';
    const lane = ship.getData('lane') || 0;
    let pts = (SHIP_SCORE[key] || 100) + (LANE_BONUS[lane] || 0);
    const mult = this.perks.scoreByShip?.[key];
    if (mult) pts = Math.round(pts * mult);
    if (this.perks.critChance > 0 && Math.random() < this.perks.critChance) {
      pts = Math.round(pts * (this.perks.critMult || 1.5));
      return { pts, crit: true };
    }
    return { pts, crit: false };
  }

  addScore(points, x, y) {
    this.score = Math.max(0, this.score + points);
    this.refreshHud();
    if (x != null && y != null && points !== 0) {
      const popup = this.add
        .text(x, y, points > 0 ? `+${points}` : `${points}`, {
          fontFamily: this.hudFont || 'Segoe UI, system-ui, sans-serif',
          fontSize: '22px',
          color: points > 0 ? '#ffe566' : '#ff8a8a',
          fontStyle: '700',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(120);
      this.tweens.add({
        targets: popup,
        y: y - 40,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy(),
      });
    }
  }

  loseLife() {
    if (this.lives <= 0) return;
    this.lives -= 1;
    sfx.hurt();
    const heart = this.hearts[this.lives];
    if (heart?.active) {
      this.tweens.add({
        targets: heart,
        scale: 1.6,
        alpha: 0,
        duration: 280,
        onComplete: () => heart.setVisible(false),
      });
    }
  }

  gainLife() {
    if (this.lives >= this.maxLives) return false;
    const heart = this.hearts[this.lives];
    this.lives += 1;
    if (heart?.active) {
      this.tweens.killTweensOf(heart);
      heart.setVisible(true);
      heart.setAlpha(1);
      heart.setScale(0.4);
      this.tweens.add({
        targets: heart,
        scale: 1,
        duration: 280,
        ease: 'Back.easeOut',
      });
    }
    return true;
  }

  trySpawnLifeCrate() {
    if (this.gameOver || this.briefing) return;
    if (this.lifeCrate?.active) return;
    this.spawnLifeCrate(Phaser.Math.Between(160, W - 160));
  }

  spawnLifeCrate(x) {
    if (this.lifeCrate?.active) this.destroyLifeCrate(false);

    const startY = 36;
    const landY = WATERLINE - 2;
    const root = this.add.container(x, startY);
    root.setDepth(45);

    const pirate = isPirateTheme(loadPlayer());
    const useBalloon = pirate && this.textures.exists('balloon-crate');
    const useCrate = pirate && this.textures.exists('crate');

    let canopy;
    let cords;
    let box;

    if (useBalloon) {
      // сундук на воздушном шаре — один спрайт
      box = this.add.image(0, 0, 'balloon-crate');
      box.setOrigin(0.5, 0.92);
      box.setDisplaySize(78, 150);
      canopy = box; // при приводнении «улетает» шар вместе с верхом
      cords = null;
      root.add(box);
      root.setData('balloon', true);
    } else if (useCrate) {
      box = this.add.image(0, 6, 'crate');
      box.setDisplaySize(56, 50);
      canopy = this.add.graphics();
      canopy.fillStyle(0xf5efe0, 0.92);
      canopy.beginPath();
      canopy.moveTo(-30, -6);
      canopy.lineTo(-24, -26);
      canopy.lineTo(0, -34);
      canopy.lineTo(24, -26);
      canopy.lineTo(30, -6);
      canopy.closePath();
      canopy.fillPath();
      canopy.lineStyle(2, 0xb85a3a, 1);
      canopy.strokePath();
      cords = this.add.graphics();
      cords.lineStyle(1.5, 0xd8c8a0, 0.85);
      cords.lineBetween(-24, -6, -8, 8);
      cords.lineBetween(24, -6, 8, 8);
      root.add([canopy, cords, box]);
    } else {
      canopy = this.add.graphics();
      canopy.fillStyle(0xe8eef5, 0.95);
      canopy.beginPath();
      canopy.moveTo(-34, -8);
      canopy.lineTo(-28, -28);
      canopy.lineTo(0, -36);
      canopy.lineTo(28, -28);
      canopy.lineTo(34, -8);
      canopy.closePath();
      canopy.fillPath();
      canopy.lineStyle(2, 0xc45a4a, 1);
      canopy.strokePath();
      canopy.lineStyle(1.5, 0xc45a4a, 0.9);
      for (let i = -2; i <= 2; i += 1) {
        canopy.lineBetween(i * 12, -30, i * 6, -8);
      }

      cords = this.add.graphics();
      cords.lineStyle(1.5, 0xd8c8a0, 0.85);
      cords.lineBetween(-26, -8, -10, 10);
      cords.lineBetween(26, -8, 10, 10);
      cords.lineBetween(-8, -8, -4, 10);
      cords.lineBetween(8, -8, 4, 10);

      box = this.add.graphics();
      box.fillStyle(0xb8894a, 1);
      box.fillRoundedRect(-14, 10, 28, 24, 3);
      box.lineStyle(2, 0x6e4a22, 1);
      box.strokeRoundedRect(-14, 10, 28, 24, 3);
      box.lineStyle(1.5, 0x8a6230, 1);
      box.lineBetween(-14, 22, 14, 22);
      box.lineBetween(0, 10, 0, 34);
      box.fillStyle(0xff2d4a, 1);
      box.fillCircle(0, 22, 7);
      box.fillStyle(0xffffff, 1);
      box.fillRect(-4, 20, 8, 4);
      box.fillRect(-1.5, 17.5, 3, 9);

      root.add([canopy, cords, box]);
    }

    const loot = pickCrateLoot();
    const sharkChance = Math.min(0.85, SHARK_EAT_CHANCE * (this.perks.sharkEatMult ?? 1));
    const baseHit = useBalloon ? 32 : 28;

    root.setData({
      alive: true,
      landed: false,
      landLeft: CRATE_LAND_MS,
      hitHalf: baseHit * (this.perks.crateHitMult ?? 1),
      canopy,
      cords,
      box,
      swayT: Math.random() * Math.PI * 2,
      baseX: x,
      sharkThreat: Math.random() < sharkChance,
      sharkTriggered: false,
      balloon: !!useBalloon,
      loot,
      scanned: false,
      scanMark: null,
    });

    this.lifeCrate = root;
    this.world.add(root);

    this.tweens.add({
      targets: root,
      y: landY,
      duration: useBalloon ? CRATE_FALL_MS + 900 : CRATE_FALL_MS,
      ease: useBalloon ? 'Sine.easeOut' : 'Sine.easeIn',
      onComplete: () => this.onLifeCrateLanded(root),
    });
  }

  onLifeCrateLanded(crate) {
    if (!crate?.active || !crate.getData('alive')) return;

    if (crate.getData('sharkThreat') && !crate.getData('sharkTriggered')) {
      this.triggerSharkEat(crate);
      return;
    }

    crate.setData('landed', true);
    crate.setData('landLeft', CRATE_LAND_MS);

    const canopy = crate.getData('canopy');
    const cords = crate.getData('cords');
    const box = crate.getData('box');

    if (crate.getData('balloon') && box) {
      // шар улетает вверх, остаётся сундук
      if (this.textures.exists('crate')) {
        const ghost = this.add.image(crate.x, crate.y - 70, 'balloon-crate');
        ghost.setOrigin(0.5, 0.92);
        ghost.setDisplaySize(78, 150);
        ghost.setDepth(46);
        this.world.add(ghost);
        this.tweens.add({
          targets: ghost,
          y: crate.y - 220,
          alpha: 0,
          scaleX: 0.55,
          scaleY: 0.55,
          duration: 700,
          ease: 'Sine.easeIn',
          onComplete: () => ghost.destroy(),
        });
        box.setTexture('crate');
        box.setOrigin(0.5, 0.9);
        box.setDisplaySize(52, 46);
        box.setPosition(0, 0);
      } else {
        this.tweens.add({
          targets: box,
          y: -90,
          alpha: 0.15,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 650,
        });
      }
    } else {
      if (canopy && canopy !== box) {
        this.tweens.add({
          targets: canopy,
          alpha: 0,
          y: -20,
          scaleX: 1.2,
          scaleY: 0.3,
          duration: 280,
          onComplete: () => canopy.destroy(),
        });
      }
      if (cords) {
        this.tweens.add({
          targets: cords,
          alpha: 0,
          duration: 200,
          onComplete: () => cords.destroy(),
        });
      }
    }

    const splash = this.add.ellipse(crate.x, WATERLINE, 10, 4, 0xffffff, 0.55).setDepth(44);
    this.tweens.add({
      targets: splash,
      scaleX: 4,
      scaleY: 2,
      alpha: 0,
      duration: 360,
      onComplete: () => splash.destroy(),
    });

    this.tweens.add({
      targets: crate,
      y: WATERLINE + 4,
      duration: 420,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  triggerSharkEat(crate) {
    if (!crate?.active || crate.getData('sharkTriggered')) return;
    crate.setData('sharkTriggered', true);
    crate.setData('alive', false);
    this.tweens.killTweensOf(crate);

    const cx = crate.x;
    const startY = WATERLINE + 70;
    const peakY = WATERLINE - 70;
    const endY = WATERLINE + 90;
    const dir = Math.random() < 0.5 ? -1 : 1;

    const shark = this.textures.exists('shark')
      ? this.add.image(cx - dir * 40, startY, 'shark')
      : this.add.rectangle(cx, startY, 120, 48, 0x6a7a88);
    shark.setDepth(48);
    shark.setAlpha(0.95);
    if (shark.setDisplaySize) {
      shark.setDisplaySize(150, 90);
      shark.setFlipX(dir < 0);
      shark.setOrigin(0.55, 0.55);
    }
    this.world.add(shark);

    // всплеск при выпрыгивании
    const splash1 = this.add.ellipse(cx, WATERLINE + 4, 16, 6, 0xc8e8ff, 0.7).setDepth(46);
    this.tweens.add({
      targets: splash1,
      scaleX: 5,
      scaleY: 2.5,
      alpha: 0,
      duration: 420,
      onComplete: () => splash1.destroy(),
    });

    // прыжок к ящику
    this.tweens.add({
      targets: shark,
      x: cx + dir * 10,
      y: peakY,
      angle: dir * -18,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // проглатывание
        if (crate.active) {
          this.tweens.add({
            targets: crate,
            scaleX: 0.05,
            scaleY: 0.05,
            alpha: 0,
            x: shark.x + dir * 18,
            y: shark.y + 8,
            duration: 180,
            ease: 'Back.easeIn',
            onComplete: () => {
              if (crate.active) crate.destroy();
              if (this.lifeCrate === crate) this.lifeCrate = null;
            },
          });
        } else if (this.lifeCrate === crate) {
          this.lifeCrate = null;
        }

        // нырок обратно
        this.tweens.add({
          targets: shark,
          x: cx + dir * 90,
          y: endY,
          angle: dir * 28,
          duration: 520,
          delay: 90,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            const splash2 = this.add
              .ellipse(shark.x, WATERLINE + 2, 20, 8, 0xaadfff, 0.75)
              .setDepth(46);
            this.tweens.add({
              targets: splash2,
              scaleX: 4.5,
              scaleY: 2.2,
              alpha: 0,
              duration: 480,
              onComplete: () => splash2.destroy(),
            });
            if (this.textures.exists('splash')) {
              const burst = this.add.particles(shark.x, WATERLINE, 'splash', {
                speed: { min: 40, max: 120 },
                angle: { min: 220, max: 320 },
                lifespan: 500,
                scale: { start: 0.7, end: 0 },
                quantity: 8,
                emitting: false,
              });
              burst.setDepth(47);
              burst.explode(10);
              this.time.delayedCall(600, () => burst.destroy());
            }
            shark.destroy();
          },
        });
      },
    });
  }

  destroyLifeCrate(sinking = true) {
    const crate = this.lifeCrate;
    this.lifeCrate = null;
    if (!crate?.active) return;
    crate.setData('alive', false);
    if (!sinking) {
      crate.destroy();
      return;
    }
    this.tweens.add({
      targets: crate,
      y: crate.y + 36,
      alpha: 0,
      duration: 450,
      onComplete: () => {
        if (crate.active) crate.destroy();
      },
    });
  }

  collectLifeCrate() {
    const crate = this.lifeCrate;
    if (!crate?.active || !crate.getData('alive') || !crate.getData('landed')) return false;
    const x = crate.x;
    const y = crate.y;
    let loot = crate.getData('loot') || pickCrateLoot();
    this.spawnHit(x, WATERLINE - 8);
    sfx.crate();
    this.destroyLifeCrate(false);

    if (loot === 'life' && this.lives >= this.maxLives) {
      loot = pickCrateLoot(['life']);
    }

    // Корсар: шанс отменить плохой лут
    if (
      (loot === 'scoreDown' || loot === 'rum') &&
      this.perks.badLootSaveChance > 0 &&
      Math.random() < this.perks.badLootSaveChance
    ) {
      this.showCratePopup(
        x,
        y,
        this.playerState.lang === 'en'
          ? 'SAVED!'
          : this.playerState.lang === 'es'
            ? '¡SALVADO!'
            : 'СПАСЁН!',
        '#7CFF9A',
      );
      return true;
    }

    this.applyCrateLoot(loot, x, y);
    return true;
  }

  showCratePopup(x, y, label, color) {
    const popup = this.add
      .text(x, y - 18, label, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '24px',
        color,
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: popup,
      y: y - 64,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  applyCrateLoot(loot, x, y) {
    const player = this.playerState || loadPlayer();
    let label = '';
    let color = '#ffe566';

    if (loot === 'life') {
      this.gainLife();
      label = '+♥';
      color = '#ff6b81';
    } else if (loot === 'score2') {
      const before = this.score;
      this.score = before * 2;
      this.refreshHud();
      label = `x2! +${this.score - before}`;
      color = '#7CFF9A';
    } else if (loot === 'scoreDown') {
      const before = this.score;
      this.score = Math.max(0, Math.floor(before / 1.5));
      this.refreshHud();
      label = `÷1.5 −${before - this.score}`;
      color = '#ff8a8a';
    } else if (loot === 'anchors') {
      const bonus = CRATE_ANCHOR_BONUS;
      this.playerState = {
        ...this.playerState,
        anchors: (this.playerState.anchors || 0) + bonus,
      };
      savePlayer(this.playerState);
      label = `+${bonus} ${anchorWord(player.lang, bonus)}`;
      color = '#ffd27a';
    } else if (loot === 'triple') {
      this.buffTripleMs = CRATE_BUFF_MS;
      label =
        player.lang === 'en'
          ? 'TRIPLE SALVO!'
          : player.lang === 'es'
            ? '¡SALVA TRIPLE!'
            : 'ТРОЙНОЙ ЗАЛП!';
      color = '#7AD0FF';
    } else if (loot === 'rum') {
      this.buffRumMs = CRATE_BUFF_MS;
      label =
        player.lang === 'en' ? 'RUM! REVERSED' : player.lang === 'es' ? '¡RON! AL REVÉS' : 'РОМ! НАОБОРОТ';
      color = '#E8A0FF';
    }

    this.refreshBuffHud();
    if (label) this.showCratePopup(x, y, label, color);
  }

  /** Голограф: содержимое сундука видно только после приводнения */
  updateCrateScan() {
    const crate = this.lifeCrate;
    if (!crate?.active || !crate.getData('alive')) return;
    if (!crate.getData('landed')) return;
    if (!this.perks.scanCrate) return;

    const half = (crate.getData('hitHalf') || 28) + 36;
    const near = Math.abs(this.aimX - crate.x) <= half;
    if (near && !crate.getData('scanned')) {
      this.revealCrateLoot(crate);
    }
  }

  revealCrateLoot(crate) {
    if (!crate?.active || crate.getData('scanned')) return;
    crate.setData('scanned', true);
    const loot = crate.getData('loot');
    const meta = CRATE_LOOT_META[loot] || CRATE_LOOT_META.life;
    const box = crate.getData('box');
    const lang = this.playerState?.lang || 'ru';

    if (box?.setTint) {
      box.setTint(meta.tint);
    } else if (box?.clearTint) {
      /* graphics box — skip */
    }

    // Убираем старую метку
    const old = crate.getData('scanMark');
    if (old?.active) old.destroy();

    let mark;
    if (meta.icon && this.textures.exists(meta.icon)) {
      mark = this.add.image(0, crate.getData('balloon') ? -20 : 0, meta.icon);
      if (meta.icon === 'torpedo') mark.setDisplaySize(36, 72).setAngle(-90);
      else mark.setDisplaySize(40, 40);
    } else {
      mark = this.add
        .text(0, crate.getData('balloon') ? -18 : 0, meta.label[lang] || meta.label.ru, {
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          color: '#fff',
          fontStyle: '700',
          stroke: '#000',
          strokeThickness: 5,
        })
        .setOrigin(0.5);
    }
    crate.add(mark);
    crate.setData('scanMark', mark);

    // Прячем «секретную» коробку визуально сильнее — лут поверх
    if (box?.setAlpha) box.setAlpha(0.35);
  }

  endGame(reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.holdLeft = false;
    this.holdRight = false;
    this.mobileLayer?.setVisible(false);
    const player = loadPlayer();
    const text =
      reason ||
      (player.lang === 'en'
        ? 'GAME OVER'
        : player.lang === 'es'
          ? 'FIN DEL JUEGO'
          : 'ИГРА ОКОНЧЕНА');
    this.gameOverText.setText(text);
    this.gameOverText.setVisible(true);
    this.releaseAimCapture();
    this.showBattleCursor();
    gameplayStop();
    this._menuCall = this.time.delayedCall(2200, () => this.goToMenu());
  }

  destroyedMessage() {
    const player = loadPlayer();
    const timeStr = formatDuration(this.battleTimeMs);
    const earned = anchorsFromScore(this.score);
    const extra = earned > 0 ? `\n+${earned} ${anchorWord(player.lang, earned)}` : '';
    if (player.lang === 'en') {
      return `SHIP DESTROYED\nScore: ${this.score}\nTime: ${timeStr}${extra}`;
    }
    if (player.lang === 'es') {
      return `BARCO DESTRUIDO\nPuntos: ${this.score}\nTiempo: ${timeStr}${extra}`;
    }
    return `КОРАБЛЬ УНИЧТОЖЕН\nОчки: ${this.score}\nВремя: ${timeStr}${extra}`;
  }

  goToMenu() {
    if (this._wentToMenu) return;
    this._wentToMenu = true;
    if (this._menuCall) {
      this._menuCall.remove(false);
      this._menuCall = null;
    }
    this.simPaused = true;
    gameplayStop();
    const leave = () => {
      if (!this.scene?.isActive()) return;
      this.teardownInput();
      this.scene.start('Menu', { score: this.score, timeMs: this.battleTimeMs });
    };
    showInterstitial().then(leave, leave);
  }

  onLivesGone() {
    if (this.gameOver || this.continueOpen) return;
    if (getContour().ads && !this.continueUsed) {
      this.openContinueOffer();
      return;
    }
    this.endGame(this.destroyedMessage());
  }

  openContinueOffer() {
    this.simPaused = true;
    this.continueOpen = true;
    gameplayStop();
    this.releaseAimCapture();
    this.showBattleCursor();
    const pirate = isPirateTheme(this.playerState);
    const layer = this.add.container(0, 0).setDepth(240);
    this.continueLayer = layer;
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62));
    if (pirate && this.textures.exists('panel')) {
      layer.add(this.add.image(W / 2, H / 2, 'panel').setDisplaySize(640, 320));
    } else {
      layer.add(
        this.add.rectangle(W / 2, H / 2, 560, 260, 0x0d1a24, 0.97).setStrokeStyle(2, 0x4a8ab0),
      );
    }
    const font = pirate ? 'Georgia, "Palatino Linotype", serif' : 'Segoe UI, system-ui, sans-serif';
    layer.add(
      this.add
        .text(W / 2, H / 2 - 58, t(this.playerState, 'adContinueTitle'), {
          fontFamily: font,
          fontSize: '22px',
          color: pirate ? '#3a2208' : '#e8f4ff',
          align: 'center',
          lineSpacing: 6,
        })
        .setOrigin(0.5),
    );
    const yes = this.add
      .rectangle(W / 2 - 110, H / 2 + 58, 180, 48, 0x2a6a4a, 1)
      .setInteractive({ useHandCursor: true });
    const no = this.add
      .rectangle(W / 2 + 110, H / 2 + 58, 180, 48, 0x6a3030, 1)
      .setInteractive({ useHandCursor: true });
    const yesText = this.add
      .text(W / 2 - 110, H / 2 + 58, t(this.playerState, 'adContinueYes'), {
        fontFamily: font,
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const noText = this.add
      .text(W / 2 + 110, H / 2 + 58, t(this.playerState, 'adContinueNo'), {
        fontFamily: font,
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    layer.add([yes, no, yesText, noText]);
    yes.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      this.acceptContinue();
    });
    no.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      this.declineContinue();
    });
  }

  acceptContinue() {
    if (this.adBusy || !this.continueOpen) return;
    this.adBusy = true;
    showRewarded().then((ok) => {
      this.adBusy = false;
      if (!this.scene?.isActive()) return;
      this.closeContinueOffer();
      if (!ok) {
        this.endGame(this.destroyedMessage());
        return;
      }
      this.continueUsed = true;
      this.simPaused = false;
      this.hearts?.forEach((heart) => this.tweens.killTweensOf(heart));
      for (let i = 0; i < 3; i += 1) this.gainLife();
      this.hideBattleCursor();
      gameplayStart();
    });
  }

  declineContinue() {
    this.closeContinueOffer();
    this.endGame(this.destroyedMessage());
  }

  closeContinueOffer() {
    this.continueOpen = false;
    this.continueLayer?.destroy(true);
    this.continueLayer = null;
  }

  destroyShip(ship) {
    if (!ship) return;
    const foam = ship.getData('foam');
    if (foam?.active) foam.destroy();
    const shadow = ship.getData('shadow');
    if (shadow?.active) shadow.destroy();
    ship.setData('alive', false);
    if (ship.active) ship.destroy();
  }

  makeTorpedoSprite(x, y, { angle, tint = null, lengthPx = 108 } = {}) {
    const torpedo = this.add.image(x, y, 'torpedo');
    torpedo.setOrigin(0.5, 0.55);
    torpedo.setAngle(angle);
    const startScale = lengthPx / Math.max(1, torpedo.width);
    torpedo.setScale(startScale);
    torpedo.setDepth(55);
    if (tint != null) torpedo.setTint(tint);

    let trail = null;
    if (this.textures.exists('bubble')) {
      const towardBottom = angle > 0;
      trail = this.add.particles(0, 0, 'bubble', {
        speed: { min: 12, max: 48 },
        angle: towardBottom ? { min: 255, max: 285 } : { min: 75, max: 105 },
        lifespan: { min: 320, max: 600 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.55, end: 0 },
        frequency: 24,
        quantity: 2,
        follow: torpedo,
        followOffset: { x: 0, y: towardBottom ? -Math.round(lengthPx * 0.35) : Math.round(lengthPx * 0.35) },
      });
      trail.setDepth(53);
    }

    torpedo.setData({ startScale, trail });
    return torpedo;
  }

  fireEnemyTorpedo(ship) {
    if (this.gameOver || !ship.active || !ship.getData('alive')) return;
    // Только из видимой зоны
    if (ship.x < 70 || ship.x > W - 70) return;

    const startX = ship.x;
    const startY = ship.y - 6;
    const endX = Phaser.Math.Clamp(this.aimX, AIM_MIN, AIM_MAX);
    const endY = PLAYER_EDGE_Y;
    const angle = Phaser.Math.RadToDeg(Math.atan2(endY - startY, endX - startX));
    const torpedo = this.makeTorpedoSprite(startX, startY, {
      angle,
      tint: 0xff8866,
      lengthPx: 96,
    });
    torpedo.setData({
      progress: 0,
      startX,
      endX,
      startY,
      endY,
      hitChecked: false,
      startScale: torpedo.getData('startScale'),
      trail: torpedo.getData('trail'),
      enemy: true,
    });
    this.enemyTorpedoes.add(torpedo);
  }

  fireCargoMissile(ship) {
    if (this.gameOver || !ship.active || !ship.getData('alive')) return;
    if (ship.x < 70 || ship.x > W - 70) return;

    const startX = ship.x;
    const startY = ship.y - 18;
    const endX = Phaser.Math.Clamp(this.aimX, AIM_MIN, AIM_MAX);
    const endY = PLAYER_EDGE_Y;
    const angle = Phaser.Math.RadToDeg(Math.atan2(endY - startY, endX - startX));

    const missile = this.add.container(startX, startY);
    missile.setDepth(58);
    // Нос нарисован вверх. Поворот heading+90 направляет его по полёту, пламя остаётся сзади.
    missile.setAngle(angle + 90);

    const pirate = isPirateTheme(this.playerState);
    const cannonArt = pirate && this.textures.exists('cannonball');
    if (cannonArt) {
      const art = this.add.image(0, 0, 'cannonball');
      // Центр чугунного ядра, пламя нарисовано вниз — позади полёта.
      art.setOrigin(0.5, 0.31);
      art.setScale(64 / (art.height * 0.53));
      missile.add(art);
    } else {
      const body = this.add.graphics();
      if (pirate) {
        body.fillStyle(0xff6a00, 0.45);
        body.fillCircle(0, 8, 16);
        body.fillStyle(0xff9100, 0.9);
        body.fillTriangle(-9, 2, 9, 2, 0, 24);
        body.fillStyle(0xfff3c4, 0.95);
        body.fillTriangle(-4, 2, 4, 2, 0, 16);
        body.fillStyle(0x1a1a1a, 1);
        body.fillCircle(0, 0, 9);
        body.fillStyle(0x8a8a8a, 0.9);
        body.fillCircle(-3, -3, 3);
      } else {
        body.fillStyle(0xf0f0f0, 1);
        body.fillRoundedRect(-5, -22, 10, 36, 3);
        body.fillStyle(0xc62828, 1);
        body.fillTriangle(-5, -22, 5, -22, 0, -34);
        body.fillStyle(0x37474f, 1);
        body.fillRect(-7, 10, 4, 10);
        body.fillRect(3, 10, 4, 10);
        body.fillStyle(0xff9100, 1);
        body.fillTriangle(-4, 14, 4, 14, 0, 28);
        body.fillStyle(0xffe082, 0.9);
        body.fillTriangle(-2, 14, 2, 14, 0, 22);
      }
      missile.add(body);
    }

    const tail = cannonArt ? 78 : pirate ? 16 : 22;
    let trail = null;
    if (this.textures.exists('ember')) {
      trail = this.add.particles(0, 0, 'ember', {
        speed: { min: cannonArt ? 12 : pirate ? 30 : 20, max: cannonArt ? 40 : pirate ? 90 : 60 },
        angle: { min: 70, max: 110 },
        lifespan: { min: 180, max: cannonArt ? 280 : pirate ? 480 : 360 },
        scale: { start: cannonArt ? 0.4 : pirate ? 1.1 : 0.7, end: 0 },
        alpha: { start: cannonArt ? 0.55 : 0.9, end: 0 },
        frequency: cannonArt ? 40 : pirate ? 12 : 16,
        quantity: cannonArt ? 1 : pirate ? 3 : 2,
        follow: missile,
        followOffset: { x: 0, y: tail },
        blendMode: 'ADD',
      });
      trail.setDepth(57);
    }

    missile.setData({
      progress: 0,
      startX,
      endX,
      startY,
      endY,
      hitChecked: false,
      trail,
      tail,
      guaranteed: true,
    });
    this.missiles.add(missile);
  }

  updateMissiles(delta) {
    const MISSILE_MS = 900;
    this.missiles.getChildren().forEach((missile) => {
      if (!missile.active) return;
      let p = missile.getData('progress') + delta / MISSILE_MS;
      missile.setData('progress', p);
      const t = Math.min(p, 1);
      const startX = missile.getData('startX');
      const startY = missile.getData('startY');
      const endX = missile.getData('endX');
      const endY = missile.getData('endY');
      missile.x = Phaser.Math.Linear(startX, endX, t);
      missile.y = Phaser.Math.Linear(startY, endY, t);
      missile.setScale(Phaser.Math.Linear(0.85, 1.25, t));
      const trail = missile.getData('trail');
      if (trail) {
        const dx = endX - startX;
        const dy = endY - startY;
        const len = Math.hypot(dx, dy) || 1;
        const tail = missile.getData('tail') || 18;
        trail.followOffset.x = (-dx / len) * tail;
        trail.followOffset.y = (-dy / len) * tail;
      }

      if (p >= 1 && !missile.getData('hitChecked')) {
        missile.setData('hitChecked', true);
        this.onMissileHitPlayer(missile);
      }
    });
  }

  onMissileHitPlayer(missile) {
    const trail = missile.getData('trail');
    if (trail?.active) {
      trail.stop();
      this.time.delayedCall(300, () => trail.destroy());
    }
    if (missile.active) missile.destroy();
    if (this.gameOver) return;
    // Гарантированное попадание — жизнь снимается всегда
    this.loseLife();
    this.cameras.main.shake(160, 0.012);
    this.cameras.main.flash(140, 220, 40, 20);
    if (this.lives <= 0) this.onLivesGone();
  }

  update(_t, delta) {
    this.updateSeaWaves(_t, delta);
    if (this.simPaused || this.platformPaused) return;
    if (this.briefing) {
      this.applyAim(delta);
      return;
    }

    if (!this.gameOver) {
      this.battleTimeMs += delta;
      if (this.timeLabel) this.timeLabel.setText(formatDuration(this.battleTimeMs));
      const level = this.pressureLevel();
      if (level > this.announcedLevel) {
        this.announcedLevel = level;
        this.announcePressure(level);
      }

      let turn = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown || this.holdLeft) turn -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown || this.holdRight) turn += 1;
      turn += this.gyro.sample();
      if (turn) this.nudgeAim(turn * 280 * (delta / 1000));
    }

    this.applyAim(delta);

    if (!this.gameOver) this.tickBuffs(delta);

    if (this.gameOver) return;

    this.ships.getChildren().forEach((ship) => {
      if (!ship.getData('alive')) return;

      let turnIn = ship.getData('turnIn') - delta;
      if (turnIn <= 0 && ship.getData('turnsLeft') > 0) {
        this.reverseShip(ship);
        ship.setData('turnsLeft', ship.getData('turnsLeft') - 1);
        turnIn =
          ship.getData('turnsLeft') > 0
            ? Phaser.Math.Between(4000, 9000)
            : 999999;
      }
      ship.setData('turnIn', turnIn);

      ship.x += ship.getData('dir') * ship.getData('speed') * (delta / 1000);
      const foam = ship.getData('foam');
      const surfaceY = ship.getData('surfaceY') ?? ship.y;
      if (foam?.active) {
        foam.x = ship.x;
        foam.y = surfaceY;
      }
      const shadow = ship.getData('shadow');
      if (shadow?.active) {
        shadow.x = ship.x;
        shadow.y = surfaceY + 2;
      }

      // След пены за кораблём (пиратский toy-режим — заметнее)
      if (isPirateTheme(loadPlayer())) {
        let wakeAcc = (ship.getData('wakeAcc') || 0) + delta;
        if (wakeAcc > 85) {
          wakeAcc = 0;
          const dir = ship.getData('dir');
          const blob = this.add.ellipse(
            ship.x - dir * (ship.displayWidth * 0.28 + Phaser.Math.Between(0, 10)),
            surfaceY + Phaser.Math.Between(-1, 2),
            Phaser.Math.Between(18, 32),
            Phaser.Math.Between(7, 12),
            0xfff6e0,
            0.55,
          );
          blob.setDepth((ship.getData('lane') || 0) + 8);
          this.world.add(blob);
          this.tweens.add({
            targets: blob,
            alpha: 0,
            scaleX: 1.7,
            scaleY: 0.6,
            x: blob.x - dir * Phaser.Math.Between(28, 50),
            duration: 780,
            ease: 'Sine.easeOut',
            onComplete: () => blob.destroy(),
          });
        }
        ship.setData('wakeAcc', wakeAcc);
      }

      // Оружие: только после времени в видимой зоне
      const weapon = ship.getData('weapon');
      if (weapon) {
        const onScreen = ship.x >= 70 && ship.x <= W - 70;
        if (!onScreen) {
          ship.setData('visibleMs', 0);
        } else if (!ship.getData('hasFired')) {
          const visibleMs = ship.getData('visibleMs') + delta;
          ship.setData('visibleMs', visibleMs);
          if (visibleMs >= ship.getData('fireAfterMs')) {
            ship.setData('hasFired', true);
            ship.setData('reloadMs', 0);
            if (weapon === 'missile') this.fireCargoMissile(ship);
            else this.fireEnemyTorpedo(ship);
          }
        } else if (this.pressureLevel() > 0) {
          const reloadMs = ship.getData('reloadMs') + delta;
          if (reloadMs >= this.repeatFireMs()) {
            ship.setData('reloadMs', 0);
            if (weapon === 'missile') this.fireCargoMissile(ship);
            else this.fireEnemyTorpedo(ship);
          } else {
            ship.setData('reloadMs', reloadMs);
          }
        }
      }

      if (ship.x < -140 || ship.x > W + 140) {
        this.destroyShip(ship);
      }
    });

    this.updateLifeCrate(delta);
    this.updatePlayerTorpedoes(delta);
    this.updateEnemyTorpedoes(delta);
    this.updateMissiles(delta);
    this.checkTorpedoCollisions();
  }

  updateLifeCrate(delta) {
    const crate = this.lifeCrate;
    if (!crate?.active || !crate.getData('alive')) return;

    if (!crate.getData('landed')) {
      const swayT = crate.getData('swayT') + delta * 0.0032;
      crate.setData('swayT', swayT);
      crate.x = crate.getData('baseX') + Math.sin(swayT) * 18;
      crate.angle = Math.sin(swayT) * 6;
      return;
    }

    crate.angle = 0;
    let left = crate.getData('landLeft') - delta;
    crate.setData('landLeft', left);
    // мигание в последнюю секунду
    if (left < 1000) {
      crate.alpha = 0.45 + 0.55 * Math.abs(Math.sin(left * 0.02));
    }
    if (left <= 0) {
      // если торпеда уже летит в ящик — ждём попадания
      const pending = this.torpedoes.getChildren().some(
        (t) =>
          t.active &&
          !t.getData('hitChecked') &&
          Math.abs(t.getData('aimX') - crate.x) <= (crate.getData('hitHalf') || 28),
      );
      if (!pending) this.destroyLifeCrate(true);
    }
  }

  updatePlayerTorpedoes(delta) {
    this.torpedoes.getChildren().forEach((torpedo) => {
      if (!torpedo.active) return;
      let p = torpedo.getData('progress') + delta / TORPEDO_MS;
      torpedo.setData('progress', p);
      const startY = torpedo.getData('startY');
      const startScale = torpedo.getData('startScale') || 0.12;
      torpedo.x = torpedo.getData('aimX');
      torpedo.y = Phaser.Math.Linear(startY, WATERLINE + 6, Math.min(p, 1));
      torpedo.setScale(Phaser.Math.Linear(startScale, startScale * 0.32, Math.min(p, 1)));
      torpedo.alpha = p > 0.88 ? 1 - (p - 0.88) / 0.12 : 1;

      if (p >= 0.9 && !torpedo.getData('hitChecked')) {
        torpedo.setData('hitChecked', true);
        this.stopTorpedoTrail(torpedo);
        this.resolveImpact(torpedo);
      }
      if (p >= 1) this.killTorpedo(torpedo);
    });
  }

  updateEnemyTorpedoes(delta) {
    this.enemyTorpedoes.getChildren().forEach((torpedo) => {
      if (!torpedo.active) return;
      let p = torpedo.getData('progress') + delta / ENEMY_TORPEDO_MS;
      torpedo.setData('progress', p);
      const startY = torpedo.getData('startY');
      const endY = torpedo.getData('endY');
      const startX = torpedo.getData('startX');
      const endX = torpedo.getData('endX') ?? startX;
      const startScale = torpedo.getData('startScale') || 0.1;
      const t = Math.min(p, 1);
      torpedo.x = Phaser.Math.Linear(startX, endX, t);
      torpedo.y = Phaser.Math.Linear(startY, endY, t);
      // Growing slightly as it approaches the player
      torpedo.setScale(Phaser.Math.Linear(startScale * 0.7, startScale * 1.15, t));
      torpedo.alpha = 1;

      if (p >= 1 && !torpedo.getData('hitChecked')) {
        torpedo.setData('hitChecked', true);
        this.onEnemyTorpedoHitPlayer(torpedo);
      }
    });
  }

  checkTorpedoCollisions() {
    const players = this.torpedoes.getChildren();
    const enemies = this.enemyTorpedoes.getChildren();
    for (const mine of players) {
      if (!mine.active || mine.getData('hitChecked')) continue;
      for (const enemy of enemies) {
        if (!enemy.active || enemy.getData('hitChecked')) continue;
        const dx = mine.x - enemy.x;
        const dy = mine.y - enemy.y;
        if (dx * dx + dy * dy <= TORPEDO_HIT_RADIUS * TORPEDO_HIT_RADIUS) {
          mine.setData('hitChecked', true);
          enemy.setData('hitChecked', true);
          const x = (mine.x + enemy.x) / 2;
          const y = (mine.y + enemy.y) / 2;
          this.spawnHit(x, y);
          this.addScore(INTERCEPT_SCORE, x, y - 20);
          this.killTorpedo(mine);
          this.killTorpedo(enemy);
          break;
        }
      }
    }
  }

  stopTorpedoTrail(torpedo) {
    const trail = torpedo.getData('trail');
    if (trail?.active) {
      trail.stop();
      this.time.delayedCall(400, () => trail.destroy());
    }
  }

  killTorpedo(torpedo) {
    if (!torpedo?.active) return;
    this.stopTorpedoTrail(torpedo);
    torpedo.destroy();
  }

  onEnemyTorpedoHitPlayer(torpedo) {
    this.killTorpedo(torpedo);
    if (this.gameOver) return;
    this.loseLife();
    this.cameras.main.flash(120, 180, 30, 30);
    if (this.lives <= 0) this.onLivesGone();
  }

  resolveImpact(torpedo) {
    const aimX = torpedo.getData('aimX');

    const crate = this.lifeCrate;
    if (
      crate?.active &&
      crate.getData('alive') &&
      crate.getData('landed') &&
      Math.abs(crate.x - aimX) <= (crate.getData('hitHalf') || 28)
    ) {
      this.collectLifeCrate();
      return;
    }

    let best = null;
    let bestDist = Infinity;
    const hitMult = this.perks.hitRadiusMult ?? 1;

    for (const ship of this.ships.getChildren()) {
      if (!ship.active || !ship.getData('alive')) continue;
      const dist = Math.abs(ship.x - aimX);
      const half = (ship.getData('hitHalf') || ship.displayWidth * 0.35) * hitMult;
      if (dist <= half && dist < bestDist) {
        best = ship;
        bestDist = dist;
      }
    }

    if (best) {
      const { pts, crit } = this.pointsForShip(best);
      this.spawnHit(best.x, WATERLINE - best.displayHeight * 0.3);
      this.addScore(pts, best.x, WATERLINE - best.displayHeight * 0.5);
      if (crit) {
        this.showCratePopup(best.x, WATERLINE - best.displayHeight * 0.75, 'CRIT!', '#ffd27a');
      }
      sfx.hit();
      const dying = best;
      dying.setData('alive', false);
      dying.setData('hasFired', true);
      dying.getData('foam')?.destroy();
      dying.getData('shadow')?.destroy();
      this.tweens.add({
        targets: dying,
        alpha: 0,
        y: dying.y + 20,
        duration: 480,
        onComplete: () => {
          if (dying.active) dying.destroy();
        },
      });
    } else {
      if (this.perks.missPenaltyAdd > 0) {
        this.addScore(-this.perks.missPenaltyAdd, aimX, WATERLINE - 20);
      }
      sfx.splash();
      const ripple = this.add.ellipse(aimX, WATERLINE, 6, 3, 0xffffff, 0.5);
      ripple.setDepth(40);
      this.tweens.add({
        targets: ripple,
        scaleX: 5,
        scaleY: 2.5,
        alpha: 0,
        duration: 300,
        onComplete: () => ripple.destroy(),
      });
    }
  }

  spawnHit(x, y) {
    const depth = 70;

    // 1) White flash
    const flash = this.add.circle(x, y, 14, 0xffffff, 0.95).setDepth(depth + 3);
    this.tweens.add({
      targets: flash,
      scale: 6,
      alpha: 0,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    // 2) Main fireball sprite
    if (this.textures.exists('explosion')) {
      const boom = this.add
        .image(x, y - 10, 'explosion')
        .setDepth(depth + 2)
        .setScale(0.12)
        .setAlpha(0.95)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: boom,
        scale: 0.72,
        alpha: 0,
        angle: Phaser.Math.Between(-15, 15),
        y: y - 28,
        duration: 620,
        ease: 'Cubic.easeOut',
        onComplete: () => boom.destroy(),
      });
    }

    // 3) Secondary fire core
    const core = this.add.circle(x, y, 10, 0xffaa33, 0.9).setDepth(depth + 1);
    this.tweens.add({
      targets: core,
      scale: 4.5,
      alpha: 0,
      duration: 380,
      onComplete: () => core.destroy(),
    });

    // 4) Sparks / embers
    if (this.textures.exists('spark')) {
      const sparks = this.add.particles(x, y, 'spark', {
        speed: { min: 80, max: 260 },
        angle: { min: 200, max: 340 },
        lifespan: { min: 300, max: 700 },
        quantity: 18,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 180,
        blendMode: 'ADD',
        emitting: false,
      });
      sparks.setDepth(depth + 4);
      sparks.explode(22);
      this.time.delayedCall(800, () => sparks.destroy());
    }

    if (this.textures.exists('ember')) {
      const embers = this.add.particles(x, y - 6, 'ember', {
        speed: { min: 40, max: 140 },
        angle: { min: 240, max: 300 },
        lifespan: 900,
        quantity: 10,
        scale: { start: 1.1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        gravityY: -40,
        blendMode: 'ADD',
        emitting: false,
      });
      embers.setDepth(depth + 4);
      embers.explode(14);
      this.time.delayedCall(1000, () => embers.destroy());
    }

    // 5) Smoke
    if (this.textures.exists('smoke')) {
      const smoke = this.add.particles(x, y - 8, 'smoke', {
        speed: { min: 20, max: 70 },
        angle: { min: 250, max: 290 },
        lifespan: 1100,
        quantity: 8,
        scale: { start: 0.6, end: 2.4 },
        alpha: { start: 0.55, end: 0 },
        gravityY: -30,
        emitting: false,
      });
      smoke.setDepth(depth);
      smoke.explode(10);
      this.time.delayedCall(1200, () => smoke.destroy());
    }

    // 6) Water column / splash
    if (this.textures.exists('splash')) {
      const splash = this.add.particles(x, WATERLINE, 'splash', {
        speed: { min: 60, max: 180 },
        angle: { min: 250, max: 290 },
        lifespan: 500,
        quantity: 14,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.8, end: 0 },
        gravityY: 320,
        emitting: false,
      });
      splash.setDepth(depth);
      splash.explode(16);
      this.time.delayedCall(700, () => splash.destroy());
    }

    const ring = this.add.ellipse(x, WATERLINE, 20, 8, 0xffffff, 0.45).setDepth(depth - 1);
    this.tweens.add({
      targets: ring,
      scaleX: 7,
      scaleY: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => ring.destroy(),
    });
  }
}
