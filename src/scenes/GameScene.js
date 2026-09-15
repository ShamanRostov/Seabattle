import Phaser from 'phaser';
import { createGyroAim } from '../input/gyro.js';

const W = 960;
const H = 540;
const MAX_SHOTS = 10;
const TORPEDO_MS = 1000;
const WATERLINE = 175;
const SEA_HORIZON_T = 0.62;
const AIM_MIN = 80;
const AIM_MAX = W - 80;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.aimX = W / 2;
    this.shotsLeft = MAX_SHOTS;
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

    this.spawnShip(220, 1);
    this.spawnShip(520, -1);
    this.spawnShip(780, 1);

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

    this.time.delayedCall(4500, () => {
      if (this.hint?.active) this.tweens.add({ targets: this.hint, alpha: 0, duration: 500 });
    });
  }

  drawSea() {
    const bg = this.add.image(W / 2, H / 2 + (WATERLINE - H * SEA_HORIZON_T), 'sea');
    bg.setDisplaySize(W * 1.15, H * 1.2);
    this.world.add(bg);
  }

  spawnShip(x, dir) {
    const lane = Phaser.Math.Between(0, 2);
    const y = WATERLINE + 4 + lane * 5;
    const key = Math.random() < 0.55 ? 'ship-cargo' : 'ship-war';

    const foam = this.add.ellipse(x, WATERLINE + 2 + lane * 5, 100 - lane * 14, 11, 0xffffff, 0.25);
    this.world.add(foam);

    const ship = this.add.image(x, y, key);
    ship.setOrigin(0.5, 0.98);
    const targetW = 160 - lane * 24;
    ship.setScale(targetW / Math.max(1, ship.width));
    // Art facing: cargo → right, war → left. Flip so bow matches movement.
    if (key === 'ship-war') ship.setFlipX(dir > 0);
    else ship.setFlipX(dir < 0);
    ship.setDepth(10 + lane);
    foam.setDepth(9 + lane);

    ship.setData({
      dir,
      speed: 28 + Math.random() * 22,
      alive: true,
      lane,
      hitHalf: ship.displayWidth * 0.36,
      foam,
    });
    this.world.add(ship);
    this.ships.add(ship);
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

    this.add.text(56, 40, 'ТОРПЕДЫ', { ...style, fontSize: '16px', fontStyle: '600' });
    this.shotTexts = [];
    for (let i = 1; i <= MAX_SHOTS; i += 1) {
      this.shotTexts.push(
        this.add.text(150 + (i - 1) * 28, 40, String(i), { ...style, fontSize: '18px' }).setOrigin(0.5, 0),
      );
    }

    this.add.text(W / 2, 460, 'ПОПАДАНИЯ', { ...style, fontSize: '15px', fontStyle: '600' }).setOrigin(0.5);
    this.scoreTexts = [];
    for (let i = 1; i <= MAX_SHOTS; i += 1) {
      this.scoreTexts.push(
        this.add.text(300 + (i - 1) * 36, 486, String(i), { ...style, fontSize: '18px' }).setOrigin(0.5),
      );
    }

    this.hint = this.add
      .text(W / 2, 400, 'Мышь двигает прицел   ЛКМ / пробел — огонь   R — заново', {
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
        fontSize: '42px',
        color: '#fff',
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 6,
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
    this.aimX = Phaser.Math.Clamp(x, AIM_MIN, AIM_MAX);
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
    if (this.gameOver || !this.canFire || this.shotsLeft <= 0) return;
    this.shotsLeft -= 1;
    this.canFire = false;
    this.refreshHud();

    const aimX = this.aimX;
    const startY = H - 70;
    const torpedo = this.add.ellipse(aimX, startY, 9, 26, 0xffe08a);
    torpedo.setStrokeStyle(1, 0xff9f1a);
    torpedo.setData({ progress: 0, aimX, startY, hitChecked: false });
    torpedo.setDepth(50);
    this.torpedoes.add(torpedo);

    this.time.delayedCall(450, () => {
      this.canFire = true;
      if (this.shotsLeft <= 0 && !this.gameOver) this.endGame();
    });
  }

  highlight(texts, n) {
    texts.forEach((t, i) => {
      const on = n > 0 && i + 1 === n;
      t.setColor(on ? '#ffffff' : '#ff5a5a');
      t.setBackgroundColor(on ? '#b91c1c' : null);
    });
  }

  refreshHud() {
    this.highlight(this.shotTexts, this.shotsLeft);
    this.highlight(this.scoreTexts, this.score);
  }

  endGame() {
    this.gameOver = true;
    this.gameOverText.setVisible(true);
    this.restartText.setVisible(true);
    if (this.game.canvas) this.game.canvas.style.cursor = 'default';
  }

  update(_t, delta) {
    if (!this.gameOver) {
      let turn = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown || this.holdLeft) turn -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown || this.holdRight) turn += 1;
      turn += this.gyro.sample();
      if (turn) this.setAimX(this.aimX + turn * 280 * (delta / 1000));
    }

    if (this.gameOver) return;

    this.ships.getChildren().forEach((ship) => {
      if (!ship.getData('alive')) return;
      ship.x += ship.getData('dir') * ship.getData('speed') * (delta / 1000);
      const foam = ship.getData('foam');
      if (foam?.active) foam.x = ship.x;
      if (ship.x < -120 || ship.x > W + 120) {
        foam?.destroy();
        ship.destroy();
      }
    });

    this.torpedoes.getChildren().forEach((torpedo) => {
      let p = torpedo.getData('progress') + delta / TORPEDO_MS;
      torpedo.setData('progress', p);
      const startY = torpedo.getData('startY');
      torpedo.x = torpedo.getData('aimX');
      torpedo.y = Phaser.Math.Linear(startY, WATERLINE, Math.min(p, 1));
      torpedo.setScale(Phaser.Math.Linear(1, 0.4, Math.min(p, 1)));
      torpedo.alpha = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1;

      if (p >= 0.9 && !torpedo.getData('hitChecked')) {
        torpedo.setData('hitChecked', true);
        this.resolveImpact(torpedo);
      }
      if (p >= 1) torpedo.destroy();
    });
  }

  resolveImpact(torpedo) {
    const aimX = torpedo.getData('aimX');
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
      best.setData('alive', false);
      best.getData('foam')?.destroy();
      this.spawnHit(best.x, WATERLINE - best.displayHeight * 0.3);
      this.tweens.add({
        targets: best,
        alpha: 0,
        y: best.y + 20,
        duration: 480,
        onComplete: () => best.destroy(),
      });
      this.score = Math.min(MAX_SHOTS, this.score + 1);
      this.refreshHud();
      if (this.score >= MAX_SHOTS) this.endGame();
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
