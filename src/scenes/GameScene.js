import Phaser from 'phaser';

const VIEW_HALF = 220;
const TORPEDO_COOLDOWN_MS = 900;
const MAX_SHOTS = 10;

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

    this.world = this.add.container(480, 270);

    this.drawSeaBackdrop();
    this.ships = this.add.group();
    this.torpedoes = this.add.group();

    this.spawnShip(-320, 1);
    this.spawnShip(380, -1);
    this.spawnShip(120, 1);

    this.drawPeriscopeFrame();
    this.drawHud();
    this.bindInput();

    this.time.addEvent({
      delay: 2800,
      loop: true,
      callback: () => {
        if (this.gameOver) return;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const startX = dir > 0 ? -420 - Math.random() * 80 : 420 + Math.random() * 80;
        this.spawnShip(startX, dir);
      },
    });
  }

  drawSeaBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x7ec8c8, 1);
    g.fillRect(-2000, -270, 4000, 270);
    g.fillStyle(0x1f5c5c, 1);
    g.fillRect(-2000, 0, 4000, 270);

    for (let i = 0; i < 18; i += 1) {
      const y = 20 + i * 12;
      g.lineStyle(1, 0xd8f0f0, 0.35 - i * 0.015);
      g.lineBetween(-2000, y, 2000, y);
    }

    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(-500, -160, 90, 28);
    g.fillEllipse(-430, -168, 70, 22);
    g.fillEllipse(420, -150, 100, 30);

    g.fillStyle(0x5a4030, 1);
    g.fillTriangle(-900, 0, -750, -140, -600, 0);
    g.fillTriangle(650, 0, 780, -120, 920, 0);
    g.fillStyle(0xf2f2f2, 1);
    g.fillTriangle(-820, -90, -750, -140, -700, -70);
    g.fillTriangle(720, -80, 780, -120, 840, -70);

    this.world.add(g);
  }

  spawnShip(x, dir) {
    const depth = Phaser.Math.Between(0, 2);
    const y = 28 + depth * 18;
    const scale = 1 - depth * 0.18;
    const speed = (40 + Math.random() * 35) * (1 - depth * 0.15);

    const ship = this.add.container(x, y);
    const hull = this.add.graphics();
    hull.fillStyle(0xc62828, 1);
    hull.fillRoundedRect(-36, -8, 72, 16, 4);
    hull.fillStyle(0x8b1e1e, 1);
    hull.fillRect(-8, -22, 10, 16);
    hull.fillStyle(0xf5f5f5, 1);
    hull.fillTriangle(-4, -22, 18, -18, -4, -14);

    ship.add(hull);
    ship.setScale(scale);
    ship.setData('dir', dir);
    ship.setData('speed', speed);
    ship.setData('alive', true);

    this.world.add(ship);
    this.ships.add(ship);
  }

  drawPeriscopeFrame() {
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRoundedRect(40, 30, 880, 480, 48);
    this.world.setMask(maskShape.createGeometryMask());

    const frame = this.add.graphics();
    frame.fillStyle(0x000000, 1);
    frame.fillRect(0, 0, 960, 540);
    frame.fillStyle(0xffffff, 1);
    frame.fillRoundedRect(40, 30, 880, 480, 48);
    // Re-draw black only outside: use two-pass by covering with black then punching is hard in Graphics.
    // Simpler: opaque black borders.
    frame.clear();
    frame.fillStyle(0x000000, 1);
    frame.fillRect(0, 0, 960, 36);
    frame.fillRect(0, 504, 960, 36);
    frame.fillRect(0, 0, 44, 540);
    frame.fillRect(916, 0, 44, 540);

    this.add.graphics()
      .lineStyle(2, 0xff3b30, 0.95)
      .lineBetween(410, 360, 550, 360)
      .lineBetween(480, 352, 480, 368);
    for (let i = -6; i <= 6; i += 1) {
      if (i === 0) continue;
      const h = 8;
      this.add.graphics()
        .lineStyle(2, 0xff3b30, 0.95)
        .lineBetween(480 + i * 10, 360 - h / 2, 480 + i * 10, 360 + h / 2);
    }
  }

  drawHud() {
    const style = {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ff4d4d',
    };

    this.add.text(70, 48, 'ПУСК', { ...style, fontSize: '22px', fontStyle: 'bold' });
    this.shotTexts = [];
    for (let i = 1; i <= MAX_SHOTS; i += 1) {
      this.shotTexts.push(this.add.text(150 + (i - 1) * 28, 50, String(i), style).setOrigin(0.5));
    }

    this.add
      .text(480, 455, 'ТОРПЕДИРОВАНО', { ...style, fontSize: '16px', fontStyle: 'bold' })
      .setOrigin(0.5);

    this.scoreTexts = [];
    for (let i = 1; i <= MAX_SHOTS; i += 1) {
      this.scoreTexts.push(this.add.text(300 + (i - 1) * 36, 485, String(i), style).setOrigin(0.5));
    }

    this.add
      .text(480, 400, '[ ПРОБЕЛ / ПУСК ]', {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#ffaaaa',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.gameOverText = this.add
      .text(480, 200, 'ИГРА ОКОНЧЕНА', {
        fontFamily: 'Courier New, monospace',
        fontSize: '36px',
        color: '#ffdddd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.makeButton(80, 300, '◀', () => {
      this.holdLeft = true;
    });
    this.makeButton(880, 300, '▶', () => {
      this.holdRight = true;
    });
    this.makeButton(480, 300, 'ПУСК', () => this.tryFire(), 120);

    this.input.on('pointerup', () => {
      this.holdLeft = false;
      this.holdRight = false;
    });

    this.refreshHud();
  }

  makeButton(x, y, label, onDown, width = 72) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 56, 0x330000, 0.55).setStrokeStyle(2, 0xff4444);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#ff6666',
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(width, 56);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -28, width, 56),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', onDown);
    return container;
  }

  bindInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE');
    this.keys.SPACE.on('down', () => this.tryFire());
  }

  tryFire() {
    if (this.gameOver || !this.canFire || this.shotsLeft <= 0) return;

    this.shotsLeft -= 1;
    this.canFire = false;
    this.refreshHud();

    const aimX = this.viewAngle;
    const torpedo = this.add.rectangle(aimX, 150, 6, 18, 0xffee88);
    torpedo.setData('progress', 0);
    torpedo.setData('aimX', aimX);
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
      t.setColor(on ? '#ffffff' : '#ff4d4d');
      t.setBackgroundColor(on ? '#990000' : null);
    });
  }

  refreshHud() {
    this.highlightRow(this.shotTexts, this.shotsLeft);
    this.highlightRow(this.scoreTexts, this.score);
  }

  endGame() {
    this.gameOver = true;
    this.gameOverText.setVisible(true);
  }

  update(_time, delta) {
    if (this.gameOver) return;

    const turnSpeed = 55;
    let turn = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown || this.holdLeft) turn -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown || this.holdRight) turn += 1;
    this.viewAngle = Phaser.Math.Clamp(
      this.viewAngle + turn * turnSpeed * (delta / 1000),
      -VIEW_HALF,
      VIEW_HALF,
    );
    this.world.x = 480 - this.viewAngle;

    this.ships.getChildren().forEach((ship) => {
      if (!ship.getData('alive')) return;
      ship.x += ship.getData('dir') * ship.getData('speed') * (delta / 1000);
      if (ship.x < -500 || ship.x > 500) ship.destroy();
    });

    this.torpedoes.getChildren().forEach((torpedo) => {
      let p = torpedo.getData('progress') + delta / 1400;
      torpedo.setData('progress', p);
      torpedo.y = Phaser.Math.Linear(150, 10, Math.min(p, 1));
      torpedo.setScale(Phaser.Math.Linear(1, 0.35, Math.min(p, 1)));
      torpedo.alpha = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;

      if (p >= 0.92 && p < 1.05) this.checkTorpedoHit(torpedo);
      if (p >= 1.05) torpedo.destroy();
    });
  }

  checkTorpedoHit(torpedo) {
    if (torpedo.getData('spent')) return;
    const aimX = torpedo.getData('aimX');
    const hitRange = 28;

    for (const ship of this.ships.getChildren()) {
      if (!ship.active || !ship.getData('alive')) continue;
      if (Math.abs(ship.x - aimX) <= hitRange / ship.scaleX) {
        ship.setData('alive', false);
        torpedo.setData('spent', true);
        this.tweens.add({
          targets: ship,
          alpha: 0,
          y: ship.y + 20,
          duration: 400,
          onComplete: () => ship.destroy(),
        });
        this.score = Math.min(MAX_SHOTS, this.score + 1);
        this.refreshHud();
        if (this.score >= MAX_SHOTS) this.endGame();
        break;
      }
    }
  }
}
