import Phaser from 'phaser';
import { createGyroAim } from '../input/gyro.js';

const VIEW_HALF = 260;
const TORPEDO_COOLDOWN_MS = 850;
const MAX_SHOTS = 10;
const W = 960;
const H = 540;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.viewAngle = 0;
    this.shotsLeft = MAX_SHOTS;
    this.score = 0;
    this.canFire = true;
    this.gameOver = false;
    this.holdLeft = false;
    this.holdRight = false;
    this.gyro = createGyroAim({ axis: 'gamma' });

    this.world = this.add.container(W / 2, H / 2);
    this.drawSeaBackdrop();
    this.ships = this.add.group();
    this.torpedoes = this.add.group();

    this.spawnShip(-320, 1);
    this.spawnShip(380, -1);
    this.spawnShip(80, 1);

    this.drawPeriscopeFrame();
    this.drawHud();
    this.bindInput();

    this.spawnTimer = this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (this.gameOver) return;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const startX = dir > 0 ? -450 : 450;
        this.spawnShip(startX + dir * -Phaser.Math.Between(0, 40), dir);
      },
    });
  }

  drawSeaBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x8fd0d0, 1);
    g.fillRect(-2200, -H / 2, 4400, H / 2);
    g.fillStyle(0x1a5555, 1);
    g.fillRect(-2200, 0, 4400, H / 2);

    // vertical diorama seams
    g.lineStyle(2, 0x000000, 0.12);
    g.lineBetween(-180, -H / 2, -180, H / 2);
    g.lineBetween(180, -H / 2, 180, H / 2);

    for (let i = 0; i < 20; i += 1) {
      const y = 16 + i * 11;
      g.lineStyle(1, 0xe8ffff, Math.max(0.05, 0.4 - i * 0.018));
      g.lineBetween(-2200, y, 2200, y);
    }

    this.drawCloud(g, -520, -150);
    this.drawCloud(g, 380, -140);
    this.drawCloud(g, -80, -170);

    g.fillStyle(0x4a3528, 1);
    g.fillTriangle(-980, 4, -780, -150, -560, 4);
    g.fillTriangle(560, 4, 760, -130, 980, 4);
    g.fillStyle(0xf4f4f4, 1);
    g.fillTriangle(-880, -90, -780, -150, -700, -70);
    g.fillTriangle(680, -80, 760, -130, 840, -65);

    this.world.add(g);
  }

  drawCloud(g, x, y) {
    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(x, y, 100, 30);
    g.fillEllipse(x + 40, y - 8, 70, 24);
    g.fillEllipse(x - 35, y - 4, 60, 20);
  }

  spawnShip(x, dir) {
    const depth = Phaser.Math.Between(0, 2);
    const y = 24 + depth * 20;
    const scale = 1 - depth * 0.2;
    const speed = (38 + Math.random() * 40) * (1 - depth * 0.12);
    const kind = Phaser.Math.Between(0, 1);

    const ship = this.add.container(x, y);
    const hull = this.add.graphics();
    if (kind === 0) {
      hull.fillStyle(0xc62828, 1);
      hull.fillRoundedRect(-40, -8, 80, 16, 5);
      hull.fillStyle(0x7f1d1d, 1);
      hull.fillRect(-6, -24, 12, 18);
      hull.fillStyle(0xfafafa, 1);
      hull.fillTriangle(-2, -24, 22, -18, -2, -12);
    } else {
      hull.fillStyle(0xb71c1c, 1);
      hull.fillRoundedRect(-28, -6, 56, 12, 4);
      hull.fillStyle(0x5d1010, 1);
      hull.fillRect(-10, -16, 8, 12);
      hull.fillRect(4, -14, 6, 10);
    }

    ship.add(hull);
    ship.setScale(scale);
    ship.setData({ dir, speed, alive: true, depth });
    this.world.add(ship);
    this.ships.add(ship);
  }

  drawPeriscopeFrame() {
    const hole = this.make.graphics({ x: 0, y: 0 }, false);
    hole.fillStyle(0xffffff);
    hole.fillRoundedRect(48, 36, W - 96, H - 72, 56);
    this.world.setMask(hole.createGeometryMask());

    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0);
    const cover = this.make.graphics({ x: 0, y: 0 }, false);
    cover.fillStyle(0x000000, 1);
    cover.fillRect(0, 0, W, H);
    rt.draw(cover);
    const cut = this.make.graphics({ x: 0, y: 0 }, false);
    cut.fillStyle(0xffffff, 1);
    cut.fillRoundedRect(48, 36, W - 96, H - 72, 56);
    rt.erase(cut);

    const reticle = this.add.graphics();
    reticle.lineStyle(2, 0xff2a2a, 0.95);
    reticle.lineBetween(W / 2 - 78, 365, W / 2 + 78, 365);
    for (let i = -7; i <= 7; i += 1) {
      const h = i === 0 ? 16 : 7;
      reticle.lineBetween(W / 2 + i * 9, 365 - h / 2, W / 2 + i * 9, 365 + h / 2);
    }
  }

  drawHud() {
    const glow = {
      fontFamily: 'Courier New, monospace',
      color: '#ff3b3b',
      stroke: '#660000',
      strokeThickness: 2,
    };

    this.add.text(64, 44, 'ПУСК', { ...glow, fontSize: '24px', fontStyle: 'bold' });
    this.shotTexts = [];
    for (let i = 1; i <= MAX_SHOTS; i += 1) {
      this.shotTexts.push(
        this.add.text(148 + (i - 1) * 30, 48, String(i), { ...glow, fontSize: '20px' }).setOrigin(0.5),
      );
    }

    this.add
      .text(W / 2, 448, 'ТОРПЕДИРОВАНО', { ...glow, fontSize: '18px', fontStyle: 'bold' })
      .setOrigin(0.5);

    this.scoreTexts = [];
    for (let i = 1; i <= MAX_SHOTS; i += 1) {
      this.scoreTexts.push(
        this.add.text(292 + (i - 1) * 38, 482, String(i), { ...glow, fontSize: '20px' }).setOrigin(0.5),
      );
    }

    this.hintText = this.add
      .text(W / 2, 400, '← →  цель   ПРОБЕЛ / ПУСК  огонь   R  заново', {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#ffb0b0',
      })
      .setOrigin(0.5)
      .setAlpha(0.75);

    this.gyroText = this.add
      .text(W / 2, 418, '', {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#ff8888',
      })
      .setOrigin(0.5);

    this.gameOverText = this.add
      .text(W / 2, 190, 'ИГРА ОКОНЧЕНА', {
        fontFamily: 'Courier New, monospace',
        fontSize: '40px',
        color: '#ffe0e0',
        fontStyle: 'bold',
        stroke: '#440000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.restartText = this.add
      .text(W / 2, 240, 'Нажми R или ПУСК', {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#ffaaaa',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.makeButton(70, 300, '◀', () => {
      this.holdLeft = true;
    });
    this.makeButton(890, 300, '▶', () => {
      this.holdRight = true;
    });
    this.makeButton(W / 2, 300, 'ПУСК', () => {
      if (this.gameOver) this.restart();
      else this.tryFire();
    }, 130);

    this.makeButton(880, 56, 'ГИРО', async () => {
      const ok = await this.gyro.enable();
      this.gyroText.setText(
        ok
          ? 'Гироскоп: вкл (наклон). G — смена оси'
          : 'Гироскоп недоступен — кнопки ◀ ▶',
      );
    }, 88);

    this.input.on('pointerup', () => {
      this.holdLeft = false;
      this.holdRight = false;
    });

    this.refreshHud();
  }

  makeButton(x, y, label, onDown, width = 72) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 52, 0x2a0000, 0.55).setStrokeStyle(2, 0xff4444);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#ff6666',
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(width, 52);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -26, width, 52),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', onDown);
    return container;
  }

  bindInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE,R,G');
    this.keys.SPACE.on('down', () => {
      if (this.gameOver) this.restart();
      else this.tryFire();
    });
    this.keys.R.on('down', () => this.restart());
    this.keys.G.on('down', () => {
      const next = this.gyro.state.axis === 'gamma' ? 'beta' : 'gamma';
      this.gyro.setAxis(next);
      this.gyroText.setText(`Ось гироскопа: ${next === 'gamma' ? 'влево/вправо' : 'вперёд/назад'}`);
    });
  }

  restart() {
    this.gyro.disable();
    this.scene.restart();
  }

  tryFire() {
    if (this.gameOver || !this.canFire || this.shotsLeft <= 0) return;

    this.shotsLeft -= 1;
    this.canFire = false;
    this.refreshHud();

    const aimX = this.viewAngle;
    const torpedo = this.add.rectangle(aimX, 155, 5, 20, 0xfff3a0);
    torpedo.setStrokeStyle(1, 0xffaa00);
    torpedo.setData({ progress: 0, aimX, spent: false });
    this.world.add(torpedo);
    this.torpedoes.add(torpedo);

    this.time.delayedCall(TORPEDO_COOLDOWN_MS, () => {
      this.canFire = true;
      if (this.shotsLeft <= 0 && !this.gameOver) this.endGame();
    });
  }

  highlightRow(texts, activeNumber) {
    texts.forEach((t, i) => {
      const n = i + 1;
      const on = activeNumber > 0 && n === activeNumber;
      t.setColor(on ? '#ffffff' : '#ff3b3b');
      t.setBackgroundColor(on ? '#aa0000' : null);
      t.setScale(on ? 1.15 : 1);
    });
  }

  refreshHud() {
    this.highlightRow(this.shotTexts, this.shotsLeft);
    this.highlightRow(this.scoreTexts, this.score);
  }

  endGame() {
    this.gameOver = true;
    this.gameOverText.setVisible(true);
    this.restartText.setVisible(true);
  }

  update(_time, delta) {
    let turn = 0;
    if (!this.gameOver) {
      if (this.cursors.left.isDown || this.keys.A.isDown || this.holdLeft) turn -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown || this.holdRight) turn += 1;
      turn += this.gyro.sample();
    }

    const turnSpeed = 60;
    this.viewAngle = Phaser.Math.Clamp(
      this.viewAngle + turn * turnSpeed * (delta / 1000),
      -VIEW_HALF,
      VIEW_HALF,
    );
    this.world.x = W / 2 - this.viewAngle;

    if (this.gameOver) return;

    this.ships.getChildren().forEach((ship) => {
      if (!ship.getData('alive')) return;
      ship.x += ship.getData('dir') * ship.getData('speed') * (delta / 1000);
      if (ship.x < -520 || ship.x > 520) ship.destroy();
    });

    this.torpedoes.getChildren().forEach((torpedo) => {
      let p = torpedo.getData('progress') + delta / 1350;
      torpedo.setData('progress', p);
      torpedo.y = Phaser.Math.Linear(155, 8, Math.min(p, 1));
      torpedo.setScale(Phaser.Math.Linear(1, 0.3, Math.min(p, 1)));
      torpedo.alpha = p > 0.88 ? 1 - (p - 0.88) / 0.12 : 1;

      if (p >= 0.9 && p < 1.08) this.checkTorpedoHit(torpedo);
      if (p >= 1.08) torpedo.destroy();
    });
  }

  checkTorpedoHit(torpedo) {
    if (torpedo.getData('spent')) return;
    const aimX = torpedo.getData('aimX');
    const hitRange = 30;

    for (const ship of this.ships.getChildren()) {
      if (!ship.active || !ship.getData('alive')) continue;
      if (Math.abs(ship.x - aimX) <= hitRange / ship.scaleX) {
        ship.setData('alive', false);
        torpedo.setData('spent', true);
        this.spawnSplash(ship.x, ship.y);
        this.tweens.add({
          targets: ship,
          alpha: 0,
          y: ship.y + 24,
          duration: 450,
          onComplete: () => ship.destroy(),
        });
        this.score = Math.min(MAX_SHOTS, this.score + 1);
        this.refreshHud();
        if (this.score >= MAX_SHOTS) this.endGame();
        break;
      }
    }
  }

  spawnSplash(x, y) {
    const splash = this.add.circle(x, y, 6, 0xffee88, 0.9);
    this.world.add(splash);
    this.tweens.add({
      targets: splash,
      scale: 4,
      alpha: 0,
      duration: 350,
      onComplete: () => splash.destroy(),
    });
  }
}
