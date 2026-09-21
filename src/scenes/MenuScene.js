import Phaser from 'phaser';
import {
  loadPlayer,
  savePlayer,
  getRank,
  submitRunScore,
  buildLeaderboard,
  t,
  sightName,
  portraitName,
  rankName,
  getPortrait,
  getPortraits,
  getSights,
  getThemeId,
  isPirateTheme,
  setVisualTheme,
  GAME_TITLE,
  ANCHOR_PACKS,
  RENAME_COST,
  GAME_COST,
  tryStartGame,
  perkText,
  formatDuration,
  anchorWord,
} from '../data/playerStore.js';
import { validatePlayerName } from '../data/nameFilter.js';
import { sfx } from '../audio/sfx.js';

const W = 960;
const H = 540;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.lastScore = data?.score ?? null;
    this.lastTimeMs = data?.timeMs ?? 0;
    this.lastEarned = 0;
    this.openPanelOnStart = data?.openPanel || null;
  }

  create() {
    this.player = loadPlayer();
    if (this.lastScore != null && Number.isFinite(this.lastScore)) {
      const result = submitRunScore(this.player, this.lastScore, this.lastTimeMs || 0);
      this.player = result.state;
      this.lastEarned = result.earnedAnchors;
    }

    this.panel = null;
    this.opticsSelected = this.player.equippedSight;
    this.pirate = isPirateTheme(this.player);

    if (this.game.canvas) this.game.canvas.style.cursor = 'default';
    this.input.setDefaultCursor('default');

    this.drawBackdrop();
    this.drawHeader();
    this.drawMainButtons();

    const reopen =
      this.openPanelOnStart || this.game.registry.get('menuOpenPanel') || null;
    if (reopen) {
      this.game.registry.remove('menuOpenPanel');
      this.time.delayedCall(0, () => this.openPanel(reopen));
    }
  }

  drawBackdrop() {
    this.pirate = isPirateTheme(this.player);

    if (this.pirate && this.textures.exists('menu-bg')) {
      const bg = this.add.image(W / 2, H / 2, 'menu-bg');
      bg.setDisplaySize(W, H);
      bg.setAlpha(0.92);
      this.add.rectangle(W / 2, H / 2, W, H, 0x1a0e08, 0.28);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x061018, 0x061018, 0x0a2030, 0x0c2840, 1);
      g.fillRect(0, 0, W, H);
      g.fillStyle(0x1a4a6a, 0.35);
      g.fillEllipse(W / 2, H * 0.55, W * 1.2, 180);
      g.fillStyle(0x0a1824, 0.55);
      g.fillRect(0, H * 0.58, W, H * 0.42);
    }

    const titleColor = this.pirate ? '#fff4d8' : '#e8f4ff';
    const titleStroke = this.pirate ? '#3a2208' : '#041018';
    this.titleText = this.add
      .text(W / 2, 40, GAME_TITLE[this.player.lang] || GAME_TITLE.ru, {
        fontFamily: this.pirate
          ? 'Georgia, "Palatino Linotype", serif'
          : 'Georgia, "Times New Roman", serif',
        fontSize: '40px',
        color: titleColor,
        fontStyle: '700',
        stroke: titleStroke,
        strokeThickness: 6,
      })
      .setOrigin(0.5);
  }

  drawHeader() {
    const rank = getRank(this.player.careerScore);
    const name = this.player.name || t(this.player, 'unnamed');
    const portrait = getPortrait(this.player);
    const pirate = this.pirate;

    this.headerPortrait = this.add.image(48, 88, portrait.texture);
    this.headerPortrait.setDisplaySize(56, 56);
    this.add
      .circle(48, 88, 30, 0x000000, 0)
      .setStrokeStyle(2, pirate ? 0xc9a227 : 0x4a8ab0);

    this.headerName = this.add
      .text(90, 88, `${name}  ·  ${rankName(this.player, rank)}`, {
        fontFamily: pirate
          ? 'Georgia, "Palatino Linotype", serif'
          : 'Segoe UI, system-ui, sans-serif',
        fontSize: '18px',
        color: pirate ? '#f0d9a8' : '#9ec9e8',
      })
      .setOrigin(0, 0.5);

    this.headerAnchorIcon = this.add.image(W - 145, 88, 'icon-anchor');
    this.headerAnchorIcon.setDisplaySize(52, 52);
    this.headerAnchors = this.add
      .text(W - 36, 88, String(this.player.anchors), {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffd27a',
        fontStyle: '700',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(1, 0.5);
  }

  refreshHeader() {
    const rank = getRank(this.player.careerScore);
    const name = this.player.name || t(this.player, 'unnamed');
    this.headerName.setText(`${name}  ·  ${rankName(this.player, rank)}`);
    this.headerAnchors.setText(String(this.player.anchors));
    const portrait = getPortrait(this.player);
    if (this.headerPortrait && this.textures.exists(portrait.texture)) {
      this.headerPortrait.setTexture(portrait.texture);
    }
  }

  drawMainButtons() {
    const items = [
      { key: 'profile', label: 'profile', y: 268 },
      { key: 'shop', label: 'shop', y: 338 },
      { key: 'rating', label: 'rating', y: 408 },
      { key: 'settings', label: 'settings', y: 478 },
    ];

    // В бой — с ценой в якорях
    this.makePlayButton(W / 2, 188);

    items.forEach((item) => {
      this.makeHitButton(
        W / 2,
        item.y,
        t(this.player, item.label),
        () => this.openPanel(item.key),
        280,
        50,
        false,
      );
    });
  }

  makePlayButton(x, y) {
    const width = 320;
    const height = 54;
    const pirateBtn = this.pirate && this.textures.exists('btn-battle');
    const pirateWood = this.pirate && this.textures.exists('btn-wood');
    let bg;
    if (pirateBtn || pirateWood) {
      bg = this.add.image(x, y, pirateBtn ? 'btn-battle' : 'btn-wood');
      bg.setDisplaySize(width + 36, height + 22);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setTint(0xffe8b8);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.clearTint();
        this.input.setDefaultCursor('default');
      });
    } else {
      const fill = 0xb83a2e;
      const hover = 0xd44a3a;
      bg = this.add
        .rectangle(x, y, width, height, fill, 0.95)
        .setStrokeStyle(2, 0xff8a7a)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setFillStyle(hover, 1);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(fill, 0.95);
        this.input.setDefaultCursor('default');
      });
    }
    const pirate = pirateBtn || pirateWood;
    const text = this.add
      .text(x - 28, y, t(this.player, 'battle'), {
        fontFamily: pirate
          ? 'Georgia, "Palatino Linotype", serif'
          : 'Segoe UI, system-ui, sans-serif',
        fontSize: '24px',
        color: pirate ? '#fff8e8' : '#ffffff',
        fontStyle: '700',
        stroke: pirate ? '#4a1808' : undefined,
        strokeThickness: pirate ? 4 : 0,
      })
      .setOrigin(0.5);
    const aIcon = this.add.image(x + 78, y, 'icon-anchor');
    aIcon.setDisplaySize(28, 28);
    this.add
      .text(x + 98, y, String(GAME_COST), {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffd27a',
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);

    bg.on('pointerdown', () => {
      sfx.unlock();
      sfx.ui();
      const next = tryStartGame(this.player);
      if (!next) {
        this.needAnchors();
        return;
      }
      this.player = next;
      this.refreshHeader();
      this.scene.start('Game');
    });
  }

  /** Кнопка = интерактивный прямоугольник (без container — клики не «плывут») */
  makeHitButton(x, y, label, onClick, width = 280, height = 50, primary = false) {
    const pirate = this.pirate && this.textures.exists('btn-wood');
    let bg;
    if (pirate) {
      bg = this.add.image(x, y, 'btn-wood');
      bg.setDisplaySize(width + 28, height + 16);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setTint(0xfff0d0);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.clearTint();
        this.input.setDefaultCursor('default');
      });
    } else {
      const fill = primary ? 0xb83a2e : 0x122230;
      const hover = primary ? 0xd44a3a : 0x1c3a50;
      bg = this.add
        .rectangle(x, y, width, height, fill, 0.95)
        .setStrokeStyle(2, primary ? 0xff8a7a : 0x3a6a88)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setFillStyle(hover, 1);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(fill, 0.95);
        this.input.setDefaultCursor('default');
      });
    }
    const text = this.add
      .text(x, y, label, {
        fontFamily: pirate
          ? 'Georgia, "Palatino Linotype", serif'
          : 'Segoe UI, system-ui, sans-serif',
        fontSize: primary ? '24px' : '20px',
        color: pirate ? '#3a2208' : '#ffffff',
        fontStyle: '700',
        stroke: pirate ? '#fff6e0' : undefined,
        strokeThickness: pirate ? 2 : 0,
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => {
      sfx.unlock();
      sfx.ui();
      onClick();
    });

    return { bg, text };
  }

  clearPanel() {
    if (this._ratingWheelHandler) {
      this.input.off('wheel', this._ratingWheelHandler);
      this._ratingWheelHandler = null;
    }
    if (this.ratingMaskGfx) {
      this.ratingMaskGfx.destroy();
      this.ratingMaskGfx = null;
    }
    this.ratingScroll = null;
    this.closePortraitDetail();
    this.closeSightDetail();
    if (this.panel) {
      this.panel.destroy(true);
      this.panel = null;
    }
    this.closeNameEditor();
    this.input.setDefaultCursor('default');
  }

  openPanel(kind) {
    this.clearPanel();
    this.panel = this.add.container(0, 0).setDepth(50);
    const pirate = this.pirate;

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, pirate ? 0x1a0c04 : 0x000000, pirate ? 0.55 : 0.6)
      .setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.clearPanel());
    this.panel.add(dim);

    const cardW = kind === 'rating' && pirate ? 780 : 720;
    const cardH = kind === 'rating' && pirate ? 460 : 420;

    if (pirate && this.textures.exists('panel')) {
      // рамка толще пергамента — контент держим с запасом
      const frame = this.add.image(W / 2, H / 2, 'panel');
      frame.setDisplaySize(cardW + 48, cardH + 52);
      frame.setInteractive();
      this.panel.add(frame);
      const card = this.add
        .rectangle(W / 2, H / 2 + 4, cardW - 100, cardH - 90, 0xfff6e8, 0.02)
        .setInteractive();
      this.panel.add(card);
      this.panelPad = { x: 70, y: 58, cardW, cardH };
    } else {
      const card = this.add
        .rectangle(W / 2, H / 2, cardW, cardH, 0x0d1a24, 0.98)
        .setStrokeStyle(2, 0x4a8ab0)
        .setInteractive();
      this.panel.add(card);
      this.panelPad = { x: 24, y: 24, cardW, cardH };
    }

    // крестик: светлый круг + тёмный ✕, внутри пергамента
    const closeX = W / 2 + cardW / 2 - (pirate ? 72 : 28);
    const closeY = H / 2 - cardH / 2 + (pirate ? 48 : 22);
    if (pirate) {
      const closeBg = this.add
        .circle(closeX, closeY, 18, 0xfff0d0, 1)
        .setStrokeStyle(2, 0x8a5a28)
        .setInteractive({ useHandCursor: true })
        .setDepth(70);
      closeBg.on('pointerover', () => {
        closeBg.setFillStyle(0xffe0a0, 1);
        this.input.setDefaultCursor('pointer');
      });
      closeBg.on('pointerout', () => {
        closeBg.setFillStyle(0xfff0d0, 1);
        this.input.setDefaultCursor('default');
      });
      closeBg.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.clearPanel();
      });
      this.panel.add(closeBg);
    }
    const close = this.add
      .text(closeX, closeY, '✕', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: pirate ? '22px' : '28px',
        color: pirate ? '#5a2808' : '#aaccee',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(71)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    close.on('pointerout', () => this.input.setDefaultCursor('default'));
    close.on('pointerdown', () => this.clearPanel());
    this.panel.add(close);

    if (kind === 'profile') this.buildProfilePanel();
    else if (kind === 'shop') this.buildShopPanel();
    else if (kind === 'optics') {
      // совместимость: оптика теперь вкладка магазина
      this.shopTab = 'optics';
      this.buildShopPanel();
    } else if (kind === 'rating') this.buildRatingPanel();
    else if (kind === 'settings') this.buildSettingsPanel();
  }

  addPanelTitle(key, yOffset = 0) {
    const pirate = this.pirate;
    const b = this.panelBounds();
    const title = this.add
      .text(W / 2, b.top + (pirate ? 4 : 0) + yOffset, t(this.player, key), {
        fontFamily: 'Georgia, serif',
        fontSize: pirate ? '26px' : '28px',
        color: pirate ? '#5a3410' : '#e8f4ff',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    this.panel.add(title);
    return title;
  }

  /** Безопасная зона контента внутри плашки (учитывает толстую деревянную рамку) */
  panelBounds() {
    const pad = this.panelPad || { cardW: 720, cardH: 420, x: 24, y: 24 };
    const { cardW, cardH } = pad;
    if (this.pirate) {
      const insetX = 72;
      const insetTop = 68;
      const insetBottom = 42;
      return {
        left: W / 2 - cardW / 2 + insetX,
        right: W / 2 + cardW / 2 - insetX,
        top: H / 2 - cardH / 2 + insetTop,
        bottom: H / 2 + cardH / 2 - insetBottom,
        width: cardW - insetX * 2,
        height: cardH - insetTop - insetBottom,
        midX: W / 2,
        midY: H / 2,
      };
    }
    return {
      left: W / 2 - cardW / 2 + 24,
      right: W / 2 + cardW / 2 - 24,
      top: H / 2 - cardH / 2 + 36,
      bottom: H / 2 + cardH / 2 - 24,
      width: cardW - 48,
      height: cardH - 60,
      midX: W / 2,
      midY: H / 2,
    };
  }

  buildProfilePanel() {
    this.addPanelTitle('profile');
    const rank = getRank(this.player.careerScore);
    const portrait = getPortrait(this.player);
    const pirate = this.pirate;
    const b = this.panelBounds();
    const btnY = b.bottom - 30;
    const contentBottom = btnY - 40;
    const portraitSize = pirate ? 112 : 110;
    const textBlockW = pirate ? 280 : 0;
    const groupW = pirate ? portraitSize + 28 + textBlockW : 0;
    const portraitX = pirate ? W / 2 - groupW / 2 + portraitSize / 2 : W / 2 - 250;
    const portraitCy = (b.top + 44 + contentBottom) / 2;
    const textX = pirate ? portraitX + portraitSize / 2 + 28 : W / 2 + 40;
    const textOrigin = pirate ? 0 : 0.5;
    const textMaxW = pirate ? textBlockW : 0;
    const lineH = pirate ? 36 : 34;
    const lines = [
      `${t(this.player, 'name')}: ${this.player.name || '—'}`,
      `${t(this.player, 'rank')}: ${rankName(this.player, rank)}`,
      `${t(this.player, 'career')}: ${this.player.careerScore} ${t(this.player, 'points')}`,
      `${this.player.anchors} ${anchorWord(this.player.lang, this.player.anchors)}`,
    ];
    const textBlockH = (lines.length - 1) * lineH;
    const textTop = portraitCy - textBlockH / 2;

    this.panel.add(
      this.add
        .rectangle(portraitX, portraitCy, portraitSize, portraitSize, pirate ? 0xf3e2c0 : 0x08141c, 1)
        .setStrokeStyle(2, pirate ? 0xc9a227 : 0x4a8ab0),
    );
    if (this.textures.exists(portrait.texture)) {
      const img = this.add.image(portraitX, portraitCy, portrait.texture);
      img.setDisplaySize(portraitSize - 10, portraitSize - 10);
      this.panel.add(img);
    }

    lines.forEach((line, i) => {
      this.panel.add(
        this.add
          .text(textX, textTop + i * lineH, line, {
            fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
            fontSize: pirate ? '20px' : '20px',
            color: pirate ? '#3a2208' : '#cde6f8',
            fontStyle: '600',
            wordWrap: textMaxW ? { width: textMaxW } : undefined,
          })
          .setOrigin(textOrigin, 0.5),
      );
    });

    const free = !this.player.nameSetFree;
    if (free) {
      this.addPanelHitButton(
        W / 2,
        btnY,
        t(this.player, 'setNameFree'),
        () => this.openNameEditor(),
        pirate ? Math.min(320, b.width - 40) : 360,
        46,
        pirate ? 0xc4a06a : 0x1a3448,
        pirate ? '18px' : '16px',
      );
    } else if (pirate && this.textures.exists('btn-wood')) {
      const bx = W / 2;
      const bg = this.add.image(bx, btnY, 'btn-wood');
      bg.setDisplaySize(Math.min(320, b.width - 40), 52);
      bg.setInteractive({ useHandCursor: true });
      const label = this.add
        .text(bx - 30, btnY, t(this.player, 'renameCost'), {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          color: '#3a2208',
          fontStyle: '700',
        })
        .setOrigin(0.5);
      const aIcon = this.add.image(bx + 62, btnY, 'icon-anchor');
      aIcon.setDisplaySize(24, 24);
      const cost = this.add
        .text(bx + 88, btnY, String(RENAME_COST), {
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          color: '#5a3410',
          fontStyle: '700',
        })
        .setOrigin(0, 0.5);
      bg.on('pointerover', () => {
        bg.setTint(0xfff0d0);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.clearTint();
        this.input.setDefaultCursor('default');
      });
      bg.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.openNameEditor();
      });
      this.panel.add(bg);
      this.panel.add(label);
      this.panel.add(aIcon);
      this.panel.add(cost);
    } else {
      const bx = W / 2;
      const by = btnY;
      const bw = 360;
      const bh = 46;
      const bg = this.add
        .rectangle(bx, by, bw, bh, 0x1a3448, 0.98)
        .setStrokeStyle(1, 0x4a8ab0)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(bx - 36, by, t(this.player, 'renameCost'), {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: '600',
        })
        .setOrigin(0.5);
      const aIcon = this.add.image(bx + 70, by, 'icon-anchor');
      aIcon.setDisplaySize(26, 26);
      const cost = this.add
        .text(bx + 100, by, String(RENAME_COST), {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '18px',
          color: '#ffd27a',
          fontStyle: '700',
        })
        .setOrigin(0, 0.5);
      bg.on('pointerover', () => {
        bg.setFillStyle(0x254860, 1);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x1a3448, 0.98);
        this.input.setDefaultCursor('default');
      });
      bg.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.openNameEditor();
      });
      this.panel.add(bg);
      this.panel.add(label);
      this.panel.add(aIcon);
      this.panel.add(cost);
    }
  }

  openNameEditor() {
    const free = !this.player.nameSetFree;
    if (!free && this.player.anchors < RENAME_COST) {
      this.needAnchors();
      return;
    }

    this.closeNameEditor();
    const wrap = document.createElement('div');
    wrap.id = 'sb-name-editor';
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);font-family:Segoe UI,system-ui,sans-serif;';

    const card = document.createElement('div');
    card.style.cssText =
      'position:relative;background:#0d1a24;border:2px solid #4a8ab0;border-radius:14px;padding:28px 32px 24px;width:min(440px,92vw);box-shadow:0 16px 48px rgba(0,0,0,.65);';

    const title = document.createElement('div');
    title.textContent = t(this.player, 'enterName');
    title.style.cssText = 'color:#e8f4ff;font-size:22px;font-weight:700;margin-bottom:14px;';

    const input = document.createElement('input');
    input.id = 'sb-name-input';
    input.maxLength = 16;
    input.value = this.player.name || '';
    input.placeholder = t(this.player, 'namePlaceholder');
    input.style.cssText =
      'width:100%;box-sizing:border-box;padding:14px 14px;font-size:18px;border-radius:8px;border:2px solid #3a6a88;background:#08141c;color:#fff;outline:none;';

    const errBox = document.createElement('div');
    errBox.id = 'sb-name-error';
    errBox.setAttribute('role', 'alert');
    errBox.style.cssText =
      'display:none;margin-top:14px;padding:14px 16px;border-radius:10px;background:#c62828;border:2px solid #ff8a80;color:#ffffff;font-size:18px;font-weight:700;text-align:center;line-height:1.35;box-shadow:0 0 0 3px rgba(198,40,40,.35);';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;margin-top:18px;justify-content:flex-end;';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.textContent = t(this.player, 'cancel');
    btnCancel.style.cssText =
      'padding:12px 20px;border-radius:8px;border:1px solid #4a8ab0;background:#1a3448;color:#fff;font-size:16px;cursor:pointer;';

    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.textContent = t(this.player, 'save');
    btnSave.style.cssText =
      'padding:12px 20px;border-radius:8px;border:none;background:#2a6a4a;color:#fff;font-size:16px;font-weight:700;cursor:pointer;';

    row.append(btnCancel, btnSave);
    card.append(title, input, errBox, row);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    input.focus();
    input.select();

    const showError = (msg) => {
      errBox.textContent = msg;
      errBox.style.display = 'block';
      input.style.borderColor = '#ff5252';
      input.style.boxShadow = '0 0 0 3px rgba(255,82,82,.35)';
      card.style.borderColor = '#ff5252';
      // нативная подсказка браузера — всегда поверх
      try {
        input.setCustomValidity(msg);
        input.reportValidity();
      } catch {
        /* ignore */
      }
    };
    const clearError = () => {
      errBox.style.display = 'none';
      errBox.textContent = '';
      input.style.borderColor = '#3a6a88';
      input.style.boxShadow = 'none';
      card.style.borderColor = '#4a8ab0';
      try {
        input.setCustomValidity('');
      } catch {
        /* ignore */
      }
    };
    input.addEventListener('input', clearError);

    const finish = (save) => {
      if (save) {
        const cleaned = String(input.value || '').trim().slice(0, 16);
        const check = validatePlayerName(cleaned);
        if (!check.ok) {
          const msg =
            check.reason === 'empty'
              ? t(this.player, 'emptyName')
              : check.reason === 'too_short'
                ? t(this.player, 'nameShort')
                : check.reason === 'bad_chars'
                  ? t(this.player, 'nameChars')
                  : t(this.player, 'nameBad');
          showError(msg);
          return;
        }
        if (!free) this.player.anchors -= RENAME_COST;
        this.player.name = cleaned;
        this.player.nameSetFree = true;
        savePlayer(this.player);
        this.refreshHeader();
        this.closeNameEditor();
        this.openPanel('profile');
        this.toast(t(this.player, 'nameSaved'));
        return;
      }
      this.closeNameEditor();
      this.openPanel('profile');
    };

    btnCancel.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    };
    btnSave.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      }
      if (e.key === 'Escape') finish(false);
    });
  }

  closeNameEditor() {
    document.getElementById('sb-name-editor')?.remove();
  }

  buildShopPanel() {
    this.shopTab = this.shopTab || 'anchors';
    this.addPanelTitle('shop', this.pirate ? -14 : 0);
    const b = this.panelBounds();
    const pirate = this.pirate;
    const tabY = b.top + 44;
    const tabW = pirate ? 120 : 124;
    const tabFont = pirate ? '15px' : '15px';
    const tabSpread = pirate ? 220 : 260;
    const tabs = [
      { id: 'anchors', label: 'anchorsTab', x: W / 2 - tabSpread },
      { id: 'portraits', label: 'portraits', x: W / 2 },
      { id: 'optics', label: 'optics', x: W / 2 + tabSpread },
    ];

    tabs.forEach((tab) => {
      this.addPanelHitButton(
        tab.x,
        tabY,
        t(this.player, tab.label),
        () => {
          this.shopTab = tab.id;
          this.openPanel('shop');
        },
        tabW,
        40,
        this.shopTab === tab.id ? 0x2a6a4a : pirate ? 0xc4a06a : 0x1a3448,
        tabFont,
        { compact: true },
      );
    });

    if (this.shopTab === 'portraits') {
      this.buildPortraitShop(tabY);
      return;
    }
    if (this.shopTab === 'optics') {
      this.buildOpticsShop(tabY);
      return;
    }

    const listTop = tabY + 52;
    const listBottom = b.bottom - 10;
    const n = ANCHOR_PACKS.length;
    const step = (listBottom - listTop) / n;
    const rowH = Math.min(pirate ? 68 : 74, step - 6);
    const qtySize = pirate ? '26px' : '28px';

    ANCHOR_PACKS.forEach((pack, i) => {
      const y = listTop + step * i + step / 2;
      const rowW = Math.min(pirate ? b.width - 12 : 600, b.width);
      const rowBg = this.add
        .rectangle(
          W / 2,
          y,
          rowW,
          rowH,
          pirate ? (i % 2 === 0 ? 0xf3e2c0 : 0xead4a8) : 0x142838,
          0.95,
        )
        .setStrokeStyle(1, pirate ? 0xc9a66a : 0x3a6a88);
      this.panel.add(rowBg);

      const icon = this.add.image(W / 2 - rowW / 2 + 40, y, 'icon-anchor');
      icon.setDisplaySize(pirate ? 44 : 56, pirate ? 44 : 56);
      this.panel.add(icon);

      const tag = pack.tagKey ? `  ·  ${t(this.player, pack.tagKey)}` : '';
      this.panel.add(
        this.add
          .text(W / 2 - rowW / 2 + 78, y, `${pack.anchors} ${anchorWord(this.player.lang, pack.anchors)}${tag}`, {
            fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
            fontSize: qtySize,
            color: pirate ? '#5a3410' : '#ffd27a',
            fontStyle: '700',
            stroke: pirate ? undefined : '#000',
            strokeThickness: pirate ? 0 : 4,
          })
          .setOrigin(0, 0.5),
      );

      this.addPanelHitButton(
        W / 2 + rowW / 2 - 88,
        y,
        t(this.player, pack.priceLabel),
        () => {
          this.player.anchors += pack.anchors;
          savePlayer(this.player);
          this.refreshHeader();
          this.toast(`+${pack.anchors} ${anchorWord(this.player.lang, pack.anchors)}`);
          this.openPanel('shop');
        },
        156,
        Math.min(40, rowH - 14),
        0x2a6a4a,
        pirate ? '26px' : '28px',
        { compact: true },
      );
    });
  }

  buildPortraitShop(tabY) {
    const pirate = this.pirate;
    const b = this.panelBounds();
    const portraits = getPortraits(this.player);
    const cardW = pirate ? 128 : 140;
    const cardH = pirate ? 168 : 190;
    const gap = pirate ? 14 : 20;
    const totalW = portraits.length * cardW + (portraits.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + cardW / 2;
    const cardsTop = (tabY ?? b.top + 44) + 36;
    const y = Math.min(cardsTop + cardH / 2, b.bottom - cardH / 2 - 6);

    portraits.forEach((p, i) => {
      const x = startX + i * (cardW + gap);
      const owned = this.player.ownedPortraits?.includes(p.id);
      const equipped = this.player.equippedPortrait === p.id;

      const card = this.add
        .rectangle(
          x,
          y,
          cardW,
          cardH,
          pirate ? (equipped ? 0xe8c878 : 0xf3e2c0) : equipped ? 0x1a4030 : 0x142838,
          0.98,
        )
        .setStrokeStyle(2, pirate ? (equipped ? 0x8a6230 : 0xc9a66a) : equipped ? 0x5ad0a0 : 0x3a6a88)
        .setInteractive({ useHandCursor: true });
      this.panel.add(card);

      if (this.textures.exists(p.texture)) {
        const img = this.add.image(x, y - 28, p.texture);
        img.setDisplaySize(pirate ? 88 : 100, pirate ? 88 : 100);
        this.panel.add(img);
      }
      this.panel.add(
        this.add
          .text(x, y + cardH / 2 - 18, portraitName(this.player, p), {
            fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
            fontSize: pirate ? '15px' : '14px',
            color: pirate ? '#3a2208' : '#e8f4ff',
            fontStyle: '700',
          })
          .setOrigin(0.5),
      );

      if (equipped) {
        this.panel.add(
          this.add
            .text(x, y + cardH / 2 - 42, '●', {
              fontSize: '12px',
              color: pirate ? '#2a6a4a' : '#5ad0a0',
            })
            .setOrigin(0.5),
        );
      } else if (!owned) {
        this.panel.add(
          this.add
            .text(x, y - cardH / 2 + 14, `${p.price}`, {
              fontFamily: 'Segoe UI, system-ui, sans-serif',
              fontSize: '12px',
              color: pirate ? '#8a5a20' : '#ffd27a',
              fontStyle: '700',
            })
            .setOrigin(0.5),
        );
      }

      card.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      card.on('pointerout', () => this.input.setDefaultCursor('default'));
      card.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.openPortraitDetail(p);
      });
    });
  }

  closePortraitDetail() {
    if (this.portraitDetail) {
      this.portraitDetail.destroy(true);
      this.portraitDetail = null;
    }
  }

  openPortraitDetail(p) {
    this.closePortraitDetail();
    this.closeSightDetail();
    const pirate = this.pirate;
    const owned = this.player.ownedPortraits?.includes(p.id);
    const equipped = this.player.equippedPortrait === p.id;
    const detail = this.add.container(0, 0).setDepth(90);
    this.portraitDetail = detail;

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
      .setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.closePortraitDetail());
    detail.add(dim);

    // почти на весь экран 960×540 — место под длинные описания
    const cardW = 640;
    const cardH = 510;
    if (pirate && this.textures.exists('panel')) {
      const frame = this.add.image(W / 2, H / 2, 'panel');
      frame.setDisplaySize(cardW + 56, cardH + 56);
      frame.setInteractive();
      detail.add(frame);
    } else {
      const card = this.add
        .rectangle(W / 2, H / 2, cardW, cardH, 0x0d1a24, 0.98)
        .setStrokeStyle(2, 0x4a8ab0)
        .setInteractive();
      detail.add(card);
    }

    const padTop = pirate ? 72 : 34;
    const padBottom = pirate ? 58 : 40;
    const padX = pirate ? 88 : 48;
    const contentTop = H / 2 - cardH / 2 + padTop;
    const contentBottom = H / 2 + cardH / 2 - padBottom;

    const closeX = W / 2 + cardW / 2 - (pirate ? 56 : 28);
    const closeY = H / 2 - cardH / 2 + (pirate ? 42 : 22);
    if (pirate) {
      const closeBg = this.add
        .circle(closeX, closeY, 18, 0xfff0d0, 1)
        .setStrokeStyle(2, 0x8a5a28)
        .setInteractive({ useHandCursor: true });
      closeBg.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.closePortraitDetail();
      });
      detail.add(closeBg);
    }
    const close = this.add
      .text(closeX, closeY, '✕', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: pirate ? '22px' : '28px',
        color: pirate ? '#5a2808' : '#aaccee',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closePortraitDetail());
    detail.add(close);

    detail.add(
      this.add
        .text(W / 2, contentTop - 10, portraitName(this.player, p), {
          fontFamily: 'Georgia, serif',
          fontSize: pirate ? '26px' : '28px',
          color: pirate ? '#5a3410' : '#e8f4ff',
          fontStyle: '700',
        })
        .setOrigin(0.5, 0),
    );

    const avSize = 108;
    const avY = contentTop + 130;
    detail.add(
      this.add
        .rectangle(W / 2, avY, avSize + 14, avSize + 14, pirate ? 0xf3e2c0 : 0x08141c, 1)
        .setStrokeStyle(3, pirate ? 0xc9a227 : 0x4a8ab0),
    );
    if (this.textures.exists(p.texture)) {
      const img = this.add.image(W / 2, avY, p.texture);
      img.setDisplaySize(avSize, avSize);
      detail.add(img);
    }

    const btnY = contentBottom - 28;
    const desc = perkText(this.player, p) || '—';
    detail.add(
      this.add
        .text(W / 2, avY + avSize / 2 + 24, desc, {
          fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
          fontSize: pirate ? '17px' : '18px',
          color: pirate ? '#3a2208' : '#cde6f8',
          align: 'center',
          lineSpacing: 8,
          wordWrap: { width: cardW - padX * 2 },
        })
        .setOrigin(0.5, 0),
    );

    let btnLabel;
    let fill = 0x1a3448;
    if (equipped) {
      btnLabel = t(this.player, 'equipped');
      fill = 0x2a6a4a;
    } else if (owned) {
      btnLabel = t(this.player, 'equip');
      fill = 0x2a5080;
    } else {
      btnLabel = `${t(this.player, 'buy')} · ${p.price}`;
      fill = 0x1a5a78;
    }

    const prevPanel = this.panel;
    this.panel = detail;
    this.addPanelHitButton(
      W / 2,
      btnY,
      btnLabel,
      () => {
        if (equipped) {
          this.closePortraitDetail();
          return;
        }
        this.handlePortraitClick(p);
        this.closePortraitDetail();
      },
      280,
      50,
      fill,
      pirate ? '18px' : '17px',
    );
    this.panel = prevPanel;
  }

  handlePortraitClick(p) {
    const owned = this.player.ownedPortraits?.includes(p.id);
    if (!owned) {
      if (p.price > 0 && this.player.anchors < p.price) {
        this.needAnchors();
        return;
      }
      this.player.anchors -= p.price;
      if (!this.player.ownedPortraits) this.player.ownedPortraits = ['default'];
      this.player.ownedPortraits.push(p.id);
      this.player.equippedPortrait = p.id;
      savePlayer(this.player);
      this.refreshHeader();
      this.toast(t(this.player, 'portraitBought'));
      this.shopTab = 'portraits';
      this.openPanel('shop');
      return;
    }
    this.player.equippedPortrait = p.id;
    savePlayer(this.player);
    this.refreshHeader();
    this.toast(t(this.player, 'portraitEquipped'));
    this.shopTab = 'portraits';
    this.openPanel('shop');
  }

  buildOpticsShop(tabY) {
    const sights = getSights(this.player);
    const pirate = this.pirate;
    const b = this.panelBounds();
    const n = sights.length;
    const cardW = pirate ? (n <= 3 ? 150 : 118) : n <= 3 ? 160 : 120;
    const cardH = pirate ? 168 : 180;
    const gap = pirate ? 14 : 16;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = W / 2 - totalW / 2 + cardW / 2;
    const cardsTop = (tabY ?? b.top + 44) + 36;
    const y = Math.min(cardsTop + cardH / 2, b.bottom - cardH / 2 - 6);

    sights.forEach((sight, i) => {
      const x = startX + i * (cardW + gap);
      const owned = this.player.ownedSights.includes(sight.id);
      const equipped = this.player.equippedSight === sight.id;

      const card = this.add
        .rectangle(
          x,
          y,
          cardW,
          cardH,
          pirate ? (equipped ? 0xe8c878 : 0xf3e2c0) : equipped ? 0x1a4030 : 0x142838,
          0.98,
        )
        .setStrokeStyle(2, pirate ? (equipped ? 0x8a6230 : 0xc9a66a) : equipped ? 0x5ad0a0 : 0x3a6a88)
        .setInteractive({ useHandCursor: true });
      this.panel.add(card);

      if (this.textures.exists(sight.texture)) {
        const img = this.add.image(x, y - 18, sight.texture);
        img.setDisplaySize(pirate ? 92 : 104, pirate ? 92 : 104);
        this.panel.add(img);
      }

      this.panel.add(
        this.add
          .text(x, y + cardH / 2 - 22, sightName(this.player, sight), {
            fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
            fontSize: pirate ? '14px' : '13px',
            color: pirate ? '#3a2208' : '#e8f4ff',
            fontStyle: '700',
            align: 'center',
            wordWrap: { width: cardW - 12 },
          })
          .setOrigin(0.5),
      );

      if (equipped) {
        this.panel.add(
          this.add
            .text(x, y + cardH / 2 - 42, '●', {
              fontSize: '12px',
              color: pirate ? '#2a6a4a' : '#5ad0a0',
            })
            .setOrigin(0.5),
        );
      } else if (!owned && sight.price > 0) {
        this.panel.add(
          this.add
            .text(x, y - cardH / 2 + 14, String(sight.price), {
              fontFamily: 'Segoe UI, system-ui, sans-serif',
              fontSize: '12px',
              color: pirate ? '#8a5a20' : '#ffd27a',
              fontStyle: '700',
            })
            .setOrigin(0.5),
        );
      }

      card.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      card.on('pointerout', () => this.input.setDefaultCursor('default'));
      card.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.openSightDetail(sight);
      });
    });
  }

  closeSightDetail() {
    if (this.sightDetail) {
      this.sightDetail.destroy(true);
      this.sightDetail = null;
    }
  }

  openSightDetail(sight) {
    this.closeSightDetail();
    this.closePortraitDetail();
    const pirate = this.pirate;
    const owned = this.player.ownedSights.includes(sight.id);
    const equipped = this.player.equippedSight === sight.id;
    const detail = this.add.container(0, 0).setDepth(90);
    this.sightDetail = detail;

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.72)
      .setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.closeSightDetail());
    detail.add(dim);

    const cardW = 640;
    const cardH = 510;
    if (pirate && this.textures.exists('panel')) {
      const frame = this.add.image(W / 2, H / 2, 'panel');
      frame.setDisplaySize(cardW + 56, cardH + 56);
      frame.setInteractive();
      detail.add(frame);
    } else {
      const card = this.add
        .rectangle(W / 2, H / 2, cardW, cardH, 0x0d1a24, 0.98)
        .setStrokeStyle(2, 0x4a8ab0)
        .setInteractive();
      detail.add(card);
    }

    const padTop = pirate ? 72 : 34;
    const padBottom = pirate ? 58 : 40;
    const padX = pirate ? 88 : 48;
    const contentTop = H / 2 - cardH / 2 + padTop;
    const contentBottom = H / 2 + cardH / 2 - padBottom;

    const closeX = W / 2 + cardW / 2 - (pirate ? 56 : 28);
    const closeY = H / 2 - cardH / 2 + (pirate ? 42 : 22);
    if (pirate) {
      const closeBg = this.add
        .circle(closeX, closeY, 18, 0xfff0d0, 1)
        .setStrokeStyle(2, 0x8a5a28)
        .setInteractive({ useHandCursor: true });
      closeBg.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.closeSightDetail();
      });
      detail.add(closeBg);
    }
    const close = this.add
      .text(closeX, closeY, '✕', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: pirate ? '22px' : '28px',
        color: pirate ? '#5a2808' : '#aaccee',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeSightDetail());
    detail.add(close);

    detail.add(
      this.add
        .text(W / 2, contentTop - 10, sightName(this.player, sight), {
          fontFamily: 'Georgia, serif',
          fontSize: pirate ? '24px' : '26px',
          color: pirate ? '#5a3410' : '#e8f4ff',
          fontStyle: '700',
        })
        .setOrigin(0.5, 0),
    );

    const avSize = 108;
    const avY = contentTop + 130;
    detail.add(
      this.add
        .rectangle(W / 2, avY, avSize + 14, avSize + 14, pirate ? 0xf3e2c0 : 0x08141c, 1)
        .setStrokeStyle(3, pirate ? 0xc9a227 : 0x4a8ab0),
    );
    if (this.textures.exists(sight.texture)) {
      const img = this.add.image(W / 2, avY, sight.texture);
      img.setDisplaySize(avSize, avSize);
      detail.add(img);
    }

    const btnY = contentBottom - 28;
    const desc = perkText(this.player, sight) || '—';
    detail.add(
      this.add
        .text(W / 2, avY + avSize / 2 + 24, desc, {
          fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
          fontSize: pirate ? '17px' : '18px',
          color: pirate ? '#3a2208' : '#cde6f8',
          align: 'center',
          lineSpacing: 8,
          wordWrap: { width: cardW - padX * 2 },
        })
        .setOrigin(0.5, 0),
    );

    let btnLabel;
    let fill = 0x1a3448;
    if (equipped) {
      btnLabel = t(this.player, 'equipped');
      fill = 0x2a6a4a;
    } else if (owned) {
      btnLabel = t(this.player, 'equip');
      fill = 0x2a5080;
    } else {
      btnLabel = `${t(this.player, 'buy')} · ${sight.price}`;
      fill = 0x1a5a78;
    }

    const prevPanel = this.panel;
    this.panel = detail;
    this.addPanelHitButton(
      W / 2,
      btnY,
      btnLabel,
      () => {
        if (equipped) {
          this.closeSightDetail();
          return;
        }
        if (owned) this.equipSight(sight);
        else this.buySight(sight);
        this.closeSightDetail();
      },
      280,
      50,
      fill,
      pirate ? '18px' : '17px',
    );
    this.panel = prevPanel;
  }

  buySight(sight) {
    if (this.player.ownedSights.includes(sight.id)) {
      this.equipSight(sight);
      return;
    }
    if (this.player.anchors < sight.price) {
      this.needAnchors();
      return;
    }
    this.player.anchors -= sight.price;
    this.player.ownedSights.push(sight.id);
    this.player.equippedSight = sight.id;
    savePlayer(this.player);
    this.refreshHeader();
    this.toast(t(this.player, 'sightBought'));
    this.shopTab = 'optics';
    this.openPanel('shop');
  }

  equipSight(sight) {
    this.player.equippedSight = sight.id;
    savePlayer(this.player);
    this.toast(t(this.player, 'sightEquipped'));
    this.shopTab = 'optics';
    this.openPanel('shop');
  }

  buildRatingPanel() {
    this.addPanelTitle('rating', this.pirate ? -14 : 0);
    this.ratingMode = this.ratingMode || 'daily';
    const pirate = this.pirate;
    const b = this.panelBounds();
    const tabY = b.top + 42;

    this.addPanelHitButton(
      W / 2 - 100,
      tabY,
      t(this.player, 'daily'),
      () => {
        this.ratingMode = 'daily';
        this.openPanel('rating');
      },
      150,
      38,
      this.ratingMode === 'daily' ? 0x2a6a4a : pirate ? 0xc4a06a : 0x1a3448,
      pirate ? '17px' : '16px',
    );
    this.addPanelHitButton(
      W / 2 + 100,
      tabY,
      t(this.player, 'monthly'),
      () => {
        this.ratingMode = 'monthly';
        this.openPanel('rating');
      },
      150,
      38,
      this.ratingMode === 'monthly' ? 0x2a6a4a : pirate ? 0xc4a06a : 0x1a3448,
      pirate ? '17px' : '16px',
    );

    const tableTop = tabY + 46;
    const tableBottom = b.bottom - 6;
    const tableW = Math.min(pirate ? b.width - 8 : 620, b.width);
    const rows = buildLeaderboard(this.player, this.ratingMode);
    const headH = pirate ? 34 : 28;
    const rowH = pirate ? 34 : 36;
    const bodyTop = tableTop + headH / 2 + 2;
    const bodyH = Math.max(80, tableBottom - bodyTop);
    const colX = {
      place: W / 2 - tableW / 2 + 40,
      name: W / 2 - 36,
      score: W / 2 + tableW / 2 - 120,
      time: W / 2 + tableW / 2 - 40,
    };

    // статичный заголовок
    const headBg = pirate ? 0xc9a66a : 0x1a3448;
    const headStroke = pirate ? 0x8a6230 : 0x4a8ab0;
    this.panel.add(
      this.add.rectangle(W / 2, tableTop, tableW, headH, headBg, 0.95).setStrokeStyle(1, headStroke),
    );
    const headStyle = {
      fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
      fontSize: pirate ? '16px' : '13px',
      color: pirate ? '#3a2208' : '#8ab0c8',
      fontStyle: '700',
    };
    this.panel.add(this.add.text(colX.place, tableTop, t(this.player, 'colPlace'), headStyle).setOrigin(0.5));
    this.panel.add(this.add.text(colX.name, tableTop, t(this.player, 'colPlayer'), headStyle).setOrigin(0.5));
    this.panel.add(this.add.text(colX.score, tableTop, t(this.player, 'colScore'), headStyle).setOrigin(0.5));
    this.panel.add(this.add.text(colX.time, tableTop, t(this.player, 'colTime'), headStyle).setOrigin(0.5));

    // прокручиваемое тело
    const list = this.add.container(0, 0);
    this.panel.add(list);

    rows.forEach((row, i) => {
      const y = bodyTop + rowH * (i + 0.5);
      const bgColor = pirate
        ? row.me
          ? 0xe8c878
          : i % 2 === 0
            ? 0xf3e2c0
            : 0xead4a8
        : row.me
          ? 0x2a4030
          : i % 2 === 0
            ? 0x102030
            : 0x142838;
      list.add(this.add.rectangle(W / 2, y, tableW, rowH - 2, bgColor, 0.95));

      const color = pirate ? (row.me ? '#5a2808' : '#3a2208') : row.me ? '#ffd27a' : '#cde6f8';
      const style = {
        fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
        fontSize: pirate ? '17px' : '16px',
        color,
        fontStyle: row.me ? '700' : '500',
      };
      list.add(this.add.text(colX.place, y, String(row.place), style).setOrigin(0.5));
      list.add(this.add.text(colX.name, y, row.name, style).setOrigin(0.5));
      list.add(this.add.text(colX.score, y, String(row.score), style).setOrigin(0.5));
      list.add(this.add.text(colX.time, y, formatDuration(row.timeMs), style).setOrigin(0.5));
    });

    const contentH = rows.length * rowH;
    const maxScroll = Math.max(0, contentH - bodyH);

    const maskGfx = this.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(W / 2 - tableW / 2, bodyTop, tableW, bodyH);
    list.setMask(maskGfx.createGeometryMask());
    this.ratingMaskGfx = maskGfx;

    this.ratingScroll = { list, y: 0, maxScroll, bodyTop, bodyH, tableW };

    const applyScroll = (next) => {
      const y = Phaser.Math.Clamp(next, 0, maxScroll);
      this.ratingScroll.y = y;
      list.y = -y;
    };

    const zone = this.add
      .zone(W / 2, bodyTop + bodyH / 2, tableW, bodyH)
      .setInteractive({ useHandCursor: maxScroll > 0 });
    this.panel.add(zone);

    let dragY = null;
    let dragScroll = 0;
    zone.on('pointerdown', (pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      if (maxScroll <= 0) return;
      dragY = pointer.y;
      dragScroll = this.ratingScroll.y;
    });
    zone.on('pointermove', (pointer) => {
      if (dragY == null || !pointer.isDown) return;
      applyScroll(dragScroll - (pointer.y - dragY));
    });
    zone.on('pointerup', () => {
      dragY = null;
    });
    zone.on('pointerout', () => {
      dragY = null;
    });

    this._ratingWheelHandler = (pointer, _gos, _dx, dy) => {
      if (!this.ratingScroll || this.ratingScroll.maxScroll <= 0) return;
      const px = pointer?.x ?? this.input.activePointer.x;
      const py = pointer?.y ?? this.input.activePointer.y;
      if (px < W / 2 - tableW / 2 || px > W / 2 + tableW / 2 || py < bodyTop || py > bodyTop + bodyH) {
        return;
      }
      applyScroll(this.ratingScroll.y + dy * 0.45);
    };
    this.input.on('wheel', this._ratingWheelHandler);

    // подсказка, что список можно листать
    if (maxScroll > 0) {
      this.panel.add(
        this.add
          .text(W / 2 + tableW / 2 - 8, tableBottom - 2, '↕', {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: '14px',
            color: pirate ? '#8a6230' : '#6a90a8',
          })
          .setOrigin(1, 1)
          .setAlpha(0.7),
      );
    }
  }

  buildSettingsPanel() {
    this.addPanelTitle('settings');
    const pirate = this.pirate;
    const b = this.panelBounds();
    const labelColor = pirate ? '#5a3410' : '#9ec9e8';
    const labelStyle = {
      fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
      fontSize: pirate ? '20px' : '18px',
      color: labelColor,
      fontStyle: '700',
    };

    const bodyTop = b.top + 38;
    const bodyBottom = b.bottom - 8;
    const sectionH = (bodyBottom - bodyTop) / 3;

    // Visual
    let y = bodyTop + sectionH * 0.18;
    this.panel.add(this.add.text(W / 2, y, t(this.player, 'visualMode'), labelStyle).setOrigin(0.5));
    y += 38;
    const themes = [
      { id: 'classic', label: t(this.player, 'themeClassic'), x: W / 2 - 130 },
      { id: 'pirate', label: t(this.player, 'themePirate'), x: W / 2 + 130 },
    ];
    themes.forEach((th) => {
      const active = getThemeId(this.player) === th.id;
      this.addPanelHitButton(
        th.x,
        y,
        th.label,
        () => {
          if (getThemeId(this.player) === th.id) return;
          this.player = setVisualTheme(this.player, th.id);
          this.game.registry.set('menuOpenPanel', 'settings');
          this.scene.start('Boot');
        },
        230,
        44,
        active ? 0x2a6a4a : pirate ? 0xc4a06a : 0x1a3448,
        pirate ? '17px' : '16px',
      );
    });

    // Language
    y = bodyTop + sectionH * 1.18;
    this.panel.add(this.add.text(W / 2, y, t(this.player, 'language'), labelStyle).setOrigin(0.5));
    y += 38;
    const langs = [
      { code: 'ru', label: 'Русский', x: W / 2 - 160 },
      { code: 'en', label: 'English', x: W / 2 },
      { code: 'es', label: 'Español', x: W / 2 + 160 },
    ];
    langs.forEach((L) => {
      const active = this.player.lang === L.code;
      this.addPanelHitButton(
        L.x,
        y,
        L.label,
        () => {
          this.player.lang = L.code;
          savePlayer(this.player);
          this.scene.restart({ openPanel: 'settings' });
        },
        140,
        42,
        active ? 0x2a6a4a : pirate ? 0xc4a06a : 0x1a3448,
        pirate ? '17px' : '16px',
      );
    });

    // Sound
    y = bodyTop + sectionH * 2.35;
    const soundLabel =
      t(this.player, 'sound') +
      ': ' +
      (this.player.soundOn ? t(this.player, 'on') : t(this.player, 'off'));
    this.addPanelHitButton(
      W / 2,
      Math.min(y, b.bottom - 26),
      soundLabel,
      () => {
        this.player.soundOn = !this.player.soundOn;
        savePlayer(this.player);
        if (this.player.soundOn) {
          sfx.unlock();
          sfx.ui();
        }
        this.openPanel('settings');
      },
      260,
      44,
      pirate ? 0xc4a06a : 0x1a3448,
      pirate ? '18px' : '16px',
    );
  }
  addPanelHitButton(x, y, label, onClick, width = 280, height = 46, fill = 0x1a3448, fontSize = null, opts = {}) {
    const pirate = this.pirate && this.textures.exists('btn-wood');
    let bg;
    let textColor = '#ffffff';
    const padX = opts.compact ? 10 : 24;
    const padY = opts.compact ? 6 : 14;

    if (pirate) {
      bg = this.add.image(x, y, 'btn-wood');
      bg.setDisplaySize(width + padX, height + padY);
      bg.setInteractive({ useHandCursor: true }).setDepth(60);
      // активные (зелёные) — чуть теплее тинт
      if (fill === 0x2a6a4a) bg.setTint(0xc8f0a8);
      else if (fill === 0xc4a06a) bg.clearTint();
      textColor = '#3a2208';
      bg.on('pointerover', () => {
        bg.setTint(fill === 0x2a6a4a ? 0xd8ffb8 : 0xfff0d0);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        if (fill === 0x2a6a4a) bg.setTint(0xc8f0a8);
        else bg.clearTint();
        this.input.setDefaultCursor('default');
      });
    } else {
      const stroke = 0x4a8ab0;
      const hover = 0x254860;
      bg = this.add
        .rectangle(x, y, width, height, fill, 0.98)
        .setStrokeStyle(1, stroke)
        .setInteractive({ useHandCursor: true })
        .setDepth(60);
      bg.on('pointerover', () => {
        bg.setFillStyle(hover, 1);
        this.input.setDefaultCursor('pointer');
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(fill, 0.98);
        this.input.setDefaultCursor('default');
      });
    }

    const size = fontSize || (pirate ? '17px' : '16px');
    const text = this.add
      .text(x, y, label, {
        fontFamily: pirate ? 'Georgia, serif' : 'Segoe UI, system-ui, sans-serif',
        fontSize: size,
        color: textColor,
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(61);
    bg.on('pointerdown', (pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      sfx.unlock();
      sfx.ui();
      onClick();
    });
    this.panel.add(bg);
    this.panel.add(text);
    return bg;
  }

  toast(msg) {
    const tip = this.add
      .text(W / 2, H - 36, msg, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '18px',
        color: '#fff',
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(200);
    this.tweens.add({
      targets: tip,
      alpha: 0,
      y: H - 60,
      duration: 1400,
      ease: 'Cubic.easeOut',
      onComplete: () => tip.destroy(),
    });
  }

  /** Не хватает якорей — тост и открыть магазин (вкладка якорей) */
  needAnchors() {
    this.toast(t(this.player, 'notEnough'));
    this.shopTab = 'anchors';
    this.openPanel('shop');
  }
}
