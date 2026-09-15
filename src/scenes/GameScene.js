import Phaser from 'phaser';
import { createGyroAim } from '../input/gyro.js';

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

/** Очки за тип корабля + бонус за дальнюю дистанцию (lane 0 = далеко). */
const SHIP_SCORE = {
  'ship-cargo': 100, // торговый — проще
  'ship-war': 250, // военный стреляет
  'ship-sub': 400, // лодка — быстрее / опаснее
};
const LANE_BONUS = [80, 50, 25, 0]; // далеко → близко
const INTERCEPT_SCORE = 75; // сбил вражескую торпеду

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.aimX = W / 2;
    this.aimTargetX = W / 2;
    this.aimSmooth = 10;
    this.lives = MAX_LIVES;
    this.score = 0;
    this.canFire = true;
    this.gameOver = false;
    this.holdLeft = false;
    this.holdRight = false;
    this.pointerOverUi = false;
    this.gyro = createGyroAim({ axis: 'gamma' });
    this._onMouseMove = null;

    this.world = this.add.container(0, 0);
    this.drawSea();
    this.ships = this.add.group();
    this.torpedoes = this.add.group();
    this.enemyTorpedoes = this.add.group();
    this.missiles = this.add.group();
    this.lifeCrate = null;

    this.spawnShip(200, 1, 'ship-cargo');
    this.spawnShip(480, -1, 'ship-war');
    this.spawnShip(760, 1, 'ship-sub');

    this.drawFrame();
    this.drawReticle();
    this.drawHud();
    this.bindInput();

    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (this.gameOver) return;
        if (this.ships.countActive(true) >= 5) return;
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.spawnShip(dir > 0 ? -80 : W + 80, dir);
      },
    });

    this.time.delayedCall(9000, () => this.trySpawnLifeCrate());
    this.time.addEvent({
      delay: 16000,
      loop: true,
      callback: () => this.trySpawnLifeCrate(),
    });

    this.time.delayedCall(4500, () => {
      if (this.hint?.active) this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 });
    });
  }

  drawSea() {
    const bg = this.add.image(W / 2, H / 2 + (WATERLINE - H * SEA_HORIZON_T), 'sea');
    bg.setDisplaySize(W * 1.15, H * 1.2);
    this.world.add(bg);
  }

  spawnShip(x, dir, forcedKey = null) {
    // 0 = далеко у горизонта, 3 = близко к игроку
    const lane = Phaser.Math.Between(0, 3);
    const y = WATERLINE - 8 + lane * 16;
    const roll = Math.random();
    const key =
      forcedKey ||
      (roll < 0.38 ? 'ship-cargo' : roll < 0.72 ? 'ship-war' : 'ship-sub');

    const foamW = 70 + lane * 18;
    const foam = this.add.ellipse(x, y + 2, foamW, 8 + lane * 2, 0xffffff, 0.18 + lane * 0.04);
    this.world.add(foam);

    const ship = this.add.image(x, y, key);
    ship.setOrigin(0.5, 0.98);
    const sizeMul = key === 'ship-sub' ? 0.82 : 1;
    const targetW = (85 + lane * 32 + Phaser.Math.Between(-8, 12)) * sizeMul;
    ship.setScale(targetW / Math.max(1, ship.width));
    this.applyShipFacing(ship, key, dir);
    ship.setDepth(10 + lane);
    foam.setDepth(9 + lane);

    const base = 12 + lane * 14 + (key === 'ship-sub' ? 8 : 0);
    const speed = base + Math.random() * (16 + lane * 10);

    // Разворот редко: у части кораблей вообще никогда, у остальных — через длинный интервал
    const mayTurn = Math.random() < 0.28;
    const turnIn = mayTurn ? Phaser.Math.Between(14000, 32000) : 999999;

    const canFireTorpedo = key === 'ship-war' || key === 'ship-sub';
    // Иногда грузовой запускает ракету (не раньше 3 сек в кадре)
    const mayLaunchMissile = key === 'ship-cargo' && Math.random() < 0.32;

    ship.setData({
      dir,
      speed,
      alive: true,
      lane,
      key,
      hitHalf: ship.displayWidth * (key === 'ship-sub' ? 0.42 : 0.36),
      foam,
      turnIn,
      turnsLeft: mayTurn ? Phaser.Math.Between(1, 2) : 0,
      visibleMs: 0,
      fireAfterMs: canFireTorpedo
        ? Phaser.Math.Between(key === 'ship-sub' ? 1500 : 2000, key === 'ship-sub' ? 4000 : 5000)
        : mayLaunchMissile
          ? Phaser.Math.Between(3000, 6500)
          : 0,
      hasFired: false,
      weapon: canFireTorpedo ? 'torpedo' : mayLaunchMissile ? 'missile' : null,
    });
    this.world.add(ship);
    this.ships.add(ship);
  }

  applyShipFacing(ship, key, dir) {
    // Спрайты: war — нос слева; cargo/sub — нос справа
    if (key === 'ship-war') ship.setFlipX(dir > 0);
    else ship.setFlipX(dir < 0);
  }

  reverseShip(ship) {
    const dir = -ship.getData('dir');
    ship.setData('dir', dir);
    this.applyShipFacing(ship, ship.getData('key'), dir);
    const lane = ship.getData('lane') || 0;
    const key = ship.getData('key');
    const base = 12 + lane * 14 + (key === 'ship-sub' ? 8 : 0);
    ship.setData('speed', base + Math.random() * (16 + lane * 10));
  }

  drawFrame() {
    const hole = this.make.graphics({ x: 0, y: 0 }, false);
    hole.fillStyle(0xffffff);
    hole.fillRoundedRect(28, 22, W - 56, H - 44, 22);
    this.world.setMask(hole.createGeometryMask());

    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0);
    const cover = this.make.graphics({ x: 0, y: 0 }, false);
    cover.fillStyle(0x05080c, 1);
    cover.fillRect(0, 0, W, H);
    rt.draw(cover);
    const cut = this.make.graphics({ x: 0, y: 0 }, false);
    cut.fillStyle(0xffffff);
    cut.fillRoundedRect(28, 22, W - 56, H - 44, 22);
    rt.erase(cut);
  }

  drawReticle() {
    this.reticle = this.add.container(this.aimX, WATERLINE);
    const g = this.add.graphics();
    g.lineStyle(2, 0xff3344, 0.95);
    g.lineBetween(-55, 0, 55, 0);
    g.lineBetween(0, -12, 0, 12);
    for (let i = -5; i <= 5; i += 1) {
      if (i === 0) continue;
      g.lineBetween(i * 9, -5, i * 9, 5);
    }
    this.reticle.add(g);
    this.reticle.setDepth(100);
  }

  drawHud() {
    const style = { fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#ff5a5a' };

    this.add.text(56, 40, 'ОЧКИ', { ...style, fontSize: '16px', fontStyle: '600' });
    this.scoreLabel = this.add.text(130, 36, '0', {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: '700',
      stroke: '#000000',
      strokeThickness: 4,
    });

    this.hearts = [];
    for (let i = 0; i < MAX_LIVES; i += 1) {
      const heart = this.add
        .text(56 + i * 36, 78, '♥', {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '28px',
          color: '#ff2d4a',
          stroke: '#4a0000',
          strokeThickness: 3,
        })
        .setOrigin(0, 0);
      this.hearts.push(heart);
    }

    this.hint = this.add
      .text(W / 2, 400, 'Мышь — прицел   ЛКМ / пробел — огонь   R — заново', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '14px',
        color: '#fff',
        backgroundColor: '#00000099',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5);

    this.gameOverText = this.add
      .text(W / 2, 200, 'ИГРА ОКОНЧЕНА', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '36px',
        color: '#fff',
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.restartText = this.add
      .text(W / 2, 250, 'R или клик — ещё раз', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffcccc',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.makeButton(64, 300, '◀', () => {
      this.holdLeft = true;
    });
    this.makeButton(896, 300, '▶', () => {
      this.holdRight = true;
    });
    this.makeButton(880, 48, 'ГИРО', async () => {
      const ok = await this.gyro.enable();
      this.hint.setAlpha(1);
      this.hint.setText(ok ? 'Гироскоп вкл' : 'Гироскоп недоступен');
    }, 90);

    this.input.on('pointerup', () => {
      this.holdLeft = false;
      this.holdRight = false;
    });

    this.refreshHud();
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

  setAimX(x) {
    this.aimTargetX = Phaser.Math.Clamp(x, AIM_MIN, AIM_MAX);
  }

  applyAim(delta) {
    const t = 1 - Math.exp(-this.aimSmooth * (delta / 1000));
    this.aimX = Phaser.Math.Linear(this.aimX, this.aimTargetX, t);
    if (this.reticle) this.reticle.x = this.aimX;
  }

  bindInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE,R');
    this.keys.SPACE.on('down', () => (this.gameOver ? this.restart() : this.tryFire()));
    this.keys.R.on('down', () => this.restart());

    const canvas = this.game.canvas;
    canvas.style.cursor = 'crosshair';

    this._onMouseMove = (e) => {
      if (this.gameOver || this.pointerOverUi) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * W;
      this.setAimX(x);
    };
    canvas.addEventListener('mousemove', this._onMouseMove);

    this.input.on('pointermove', (pointer) => {
      if (this.gameOver || this.pointerOverUi) return;
      this.setAimX(pointer.x);
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.pointerOverUi) return;
      if (this.gameOver) {
        this.restart();
        return;
      }
      this.setAimX(pointer.x);
      if (pointer.leftButtonDown()) this.tryFire();
    });

    this.events.once('shutdown', () => this.teardownInput());
  }

  teardownInput() {
    const canvas = this.game?.canvas;
    if (canvas && this._onMouseMove) {
      canvas.removeEventListener('mousemove', this._onMouseMove);
      canvas.style.cursor = 'default';
    }
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
    this.aimX = this.aimTargetX;
    if (this.reticle) this.reticle.x = this.aimX;

    const aimX = this.aimX;
    const startY = PLAYER_EDGE_Y - 10;
    const torpedo = this.makeTorpedoSprite(aimX, startY, { angle: -90, lengthPx: 108 });
    torpedo.setData({
      progress: 0,
      aimX,
      startY,
      hitChecked: false,
      startScale: torpedo.getData('startScale'),
      trail: torpedo.getData('trail'),
      enemy: false,
    });
    this.torpedoes.add(torpedo);

    this.time.delayedCall(200, () => {
      this.canFire = true;
    });
  }

  refreshHud() {
    if (this.scoreLabel) this.scoreLabel.setText(String(this.score));
  }

  pointsForShip(ship) {
    const key = ship.getData('key') || 'ship-cargo';
    const lane = ship.getData('lane') || 0;
    return (SHIP_SCORE[key] || 100) + (LANE_BONUS[lane] || 0);
  }

  addScore(points, x, y) {
    this.score += points;
    this.refreshHud();
    if (x != null && y != null) {
      const popup = this.add
        .text(x, y, `+${points}`, {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '22px',
          color: '#ffe566',
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
    if (this.lives >= MAX_LIVES) return false;
    const heart = this.hearts[this.lives];
    this.lives += 1;
    if (heart?.active) {
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
    if (this.gameOver) return;
    if (this.lives >= MAX_LIVES) return;
    if (this.lifeCrate?.active) return;
    this.spawnLifeCrate(Phaser.Math.Between(160, W - 160));
  }

  spawnLifeCrate(x) {
    if (this.lifeCrate?.active) this.destroyLifeCrate(false);

    const startY = 36;
    const landY = WATERLINE - 2;
    const root = this.add.container(x, startY);
    root.setDepth(45);

    const canopy = this.add.graphics();
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

    const cords = this.add.graphics();
    cords.lineStyle(1.5, 0xd8c8a0, 0.85);
    cords.lineBetween(-26, -8, -10, 10);
    cords.lineBetween(26, -8, 10, 10);
    cords.lineBetween(-8, -8, -4, 10);
    cords.lineBetween(8, -8, 4, 10);

    const box = this.add.graphics();
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

    root.setData({
      alive: true,
      landed: false,
      landLeft: CRATE_LAND_MS,
      hitHalf: 28,
      canopy,
      cords,
      box,
      swayT: Math.random() * Math.PI * 2,
      baseX: x,
    });

    this.lifeCrate = root;
    this.world.add(root);

    this.tweens.add({
      targets: root,
      y: landY,
      duration: CRATE_FALL_MS,
      ease: 'Sine.easeIn',
      onComplete: () => this.onLifeCrateLanded(root),
    });
  }

  onLifeCrateLanded(crate) {
    if (!crate?.active || !crate.getData('alive')) return;
    crate.setData('landed', true);
    crate.setData('landLeft', CRATE_LAND_MS);

    const canopy = crate.getData('canopy');
    const cords = crate.getData('cords');
    if (canopy) {
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
    this.spawnHit(x, WATERLINE - 8);
    this.destroyLifeCrate(false);
    if (this.gainLife()) {
      const popup = this.add
        .text(x, y - 18, '+♥', {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '28px',
          color: '#ff6b81',
          fontStyle: '700',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(120);
      this.tweens.add({
        targets: popup,
        y: y - 56,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy(),
      });
    }
    return true;
  }

  endGame(reason = 'ИГРА ОКОНЧЕНА') {
    this.gameOver = true;
    this.gameOverText.setText(reason);
    this.gameOverText.setVisible(true);
    this.restartText.setVisible(true);
    if (this.game.canvas) this.game.canvas.style.cursor = 'default';
  }

  destroyShip(ship) {
    if (!ship) return;
    const foam = ship.getData('foam');
    if (foam?.active) foam.destroy();
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
    missile.setAngle(angle - 90); // graphics drawn pointing up

    const body = this.add.graphics();
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
    missile.add(body);

    let trail = null;
    if (this.textures.exists('ember')) {
      trail = this.add.particles(0, 0, 'ember', {
        speed: { min: 20, max: 60 },
        angle: { min: 70, max: 110 },
        lifespan: { min: 180, max: 360 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.9, end: 0 },
        frequency: 16,
        quantity: 2,
        follow: missile,
        followOffset: { x: 0, y: 20 },
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
      missile.x = Phaser.Math.Linear(missile.getData('startX'), missile.getData('endX'), t);
      missile.y = Phaser.Math.Linear(missile.getData('startY'), missile.getData('endY'), t);
      // Slight grow as it approaches
      missile.setScale(Phaser.Math.Linear(0.85, 1.25, t));

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
    if (this.lives <= 0) this.endGame(`КОРАБЛЬ УНИЧТОЖЕН\nОчки: ${this.score}`);
  }

  update(_t, delta) {
    if (!this.gameOver) {
      let turn = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown || this.holdLeft) turn -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown || this.holdRight) turn += 1;
      turn += this.gyro.sample();
      if (turn) this.setAimX(this.aimTargetX + turn * 280 * (delta / 1000));
    }

    this.applyAim(delta);

    if (this.gameOver) return;

    this.ships.getChildren().forEach((ship) => {
      if (!ship.getData('alive')) return;

      let turnIn = ship.getData('turnIn') - delta;
      if (turnIn <= 0 && ship.getData('turnsLeft') > 0) {
        this.reverseShip(ship);
        ship.setData('turnsLeft', ship.getData('turnsLeft') - 1);
        turnIn =
          ship.getData('turnsLeft') > 0
            ? Phaser.Math.Between(18000, 40000)
            : 999999;
      }
      ship.setData('turnIn', turnIn);

      ship.x += ship.getData('dir') * ship.getData('speed') * (delta / 1000);
      const foam = ship.getData('foam');
      if (foam?.active) foam.x = ship.x;

      // Оружие: только после времени в видимой зоне
      const weapon = ship.getData('weapon');
      if (weapon && !ship.getData('hasFired')) {
        const onScreen = ship.x >= 70 && ship.x <= W - 70;
        if (onScreen) {
          const visibleMs = ship.getData('visibleMs') + delta;
          ship.setData('visibleMs', visibleMs);
          if (visibleMs >= ship.getData('fireAfterMs')) {
            ship.setData('hasFired', true);
            if (weapon === 'missile') this.fireCargoMissile(ship);
            else this.fireEnemyTorpedo(ship);
          }
        } else {
          ship.setData('visibleMs', 0);
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
    if (this.lives <= 0) this.endGame(`КОРАБЛЬ УНИЧТОЖЕН\nОчки: ${this.score}`);
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

    for (const ship of this.ships.getChildren()) {
      if (!ship.active || !ship.getData('alive')) continue;
      const dist = Math.abs(ship.x - aimX);
      const half = ship.getData('hitHalf') || ship.displayWidth * 0.35;
      if (dist <= half && dist < bestDist) {
        best = ship;
        bestDist = dist;
      }
    }

    if (best) {
      const pts = this.pointsForShip(best);
      this.spawnHit(best.x, WATERLINE - best.displayHeight * 0.3);
      this.addScore(pts, best.x, WATERLINE - best.displayHeight * 0.5);
      const dying = best;
      dying.setData('alive', false);
      dying.setData('hasFired', true);
      dying.getData('foam')?.destroy();
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
