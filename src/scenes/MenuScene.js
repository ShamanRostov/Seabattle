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
  GAME_TITLE,
  SIGHTS,
  PORTRAITS,
  ANCHOR_PACKS,
  RENAME_COST,
  GAME_COST,
  tryStartGame,
} from '../data/playerStore.js';
import { validatePlayerName } from '../data/nameFilter.js';

const W = 960;
const H = 540;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  init(data) {
    this.lastScore = data?.score ?? null;
    this.lastEarned = 0;
    this.openPanelOnStart = data?.openPanel || null;
  }

  create() {
    this.player = loadPlayer();
    if (this.lastScore != null && Number.isFinite(this.lastScore)) {
      const result = submitRunScore(this.player, this.lastScore);
      this.player = result.state;
      this.lastEarned = result.earnedAnchors;
    }

    this.panel = null;
    this.opticsSelected = this.player.equippedSight;

    if (this.game.canvas) this.game.canvas.style.cursor = 'default';
    this.input.setDefaultCursor('default');

    this.drawBackdrop();
    this.drawHeader();
    this.drawMainButtons();
    if (this.lastScore != null && Number.isFinite(this.lastScore)) this.drawScoreBanner();

    if (this.openPanelOnStart) {
      this.time.delayedCall(0, () => this.openPanel(this.openPanelOnStart));
    }
  }

  drawBackdrop() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x061018, 0x061018, 0x0a2030, 0x0c2840, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x1a4a6a, 0.35);
    g.fillEllipse(W / 2, H * 0.55, W * 1.2, 180);
    g.fillStyle(0x0a1824, 0.55);
    g.fillRect(0, H * 0.58, W, H * 0.42);

    this.titleText = this.add
      .text(W / 2, 40, GAME_TITLE[this.player.lang] || GAME_TITLE.ru, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '40px',
        color: '#e8f4ff',
        fontStyle: '700',
        stroke: '#041018',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
  }

  drawHeader() {
    const rank = getRank(this.player.careerScore);
    const name = this.player.name || t(this.player, 'unnamed');
    const portrait = getPortrait(this.player);

    this.headerPortrait = this.add.image(48, 88, portrait.texture);
    this.headerPortrait.setDisplaySize(56, 56);
    this.add.circle(48, 88, 30, 0x000000, 0).setStrokeStyle(2, 0x4a8ab0);

    this.headerName = this.add
      .text(90, 88, `${name}  ·  ${rankName(this.player, rank)}`, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '18px',
        color: '#9ec9e8',
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

  drawScoreBanner() {
    this.add.rectangle(W / 2, 128, 460, 48, 0x102838, 0.9).setStrokeStyle(1, 0x3a7a9a);
    const base = `${t(this.player, 'runScore')}: ${this.lastScore}`;
    const msg =
      this.lastEarned > 0 ? `${base}   (+${this.lastEarned})` : base;
    this.add
      .text(W / 2, 128, msg, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: '600',
      })
      .setOrigin(0.5);
  }

  drawMainButtons() {
    const items = [
      { key: 'profile', label: 'profile', y: 258 },
      { key: 'shop', label: 'shop', y: 318 },
      { key: 'optics', label: 'optics', y: 378 },
      { key: 'rating', label: 'rating', y: 438 },
      { key: 'settings', label: 'settings', y: 498 },
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
    const fill = 0xb83a2e;
    const hover = 0xd44a3a;
    const bg = this.add
      .rectangle(x, y, width, height, fill, 0.95)
      .setStrokeStyle(2, 0xff8a7a)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x - 28, y, t(this.player, 'battle'), {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const aIcon = this.add.image(x + 78, y, 'icon-anchor');
    aIcon.setDisplaySize(28, 28);
    const cost = this.add
      .text(x + 98, y, String(GAME_COST), {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffd27a',
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(hover, 1);
      this.input.setDefaultCursor('pointer');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(fill, 0.95);
      this.input.setDefaultCursor('default');
    });
    bg.on('pointerdown', () => {
      const next = tryStartGame(this.player);
      if (!next) {
        this.toast(t(this.player, 'notEnough'));
        return;
      }
      this.player = next;
      this.refreshHeader();
      this.scene.start('Game');
    });
  }

  /** Кнопка = интерактивный прямоугольник (без container — клики не «плывут») */
  makeHitButton(x, y, label, onClick, width = 280, height = 50, primary = false) {
    const fill = primary ? 0xb83a2e : 0x122230;
    const hover = primary ? 0xd44a3a : 0x1c3a50;
    const bg = this.add
      .rectangle(x, y, width, height, fill, 0.95)
      .setStrokeStyle(2, primary ? 0xff8a7a : 0x3a6a88)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: primary ? '24px' : '20px',
        color: '#ffffff',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(hover, 1);
      this.input.setDefaultCursor('pointer');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(fill, 0.95);
      this.input.setDefaultCursor('default');
    });
    bg.on('pointerdown', () => onClick());

    return { bg, text };
  }

  clearPanel() {
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

    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.6)
      .setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.clearPanel());
    this.panel.add(dim);

    const cardW = kind === 'optics' ? 880 : 720;
    const cardH = kind === 'optics' ? 480 : 420;
    const card = this.add
      .rectangle(W / 2, H / 2, cardW, cardH, 0x0d1a24, 0.98)
      .setStrokeStyle(2, 0x4a8ab0)
      .setInteractive();
    this.panel.add(card);

    const close = this.add
      .text(W / 2 + cardW / 2 - 28, H / 2 - cardH / 2 + 22, '✕', {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '28px',
        color: '#aaccee',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    close.on('pointerout', () => this.input.setDefaultCursor('default'));
    close.on('pointerdown', () => this.clearPanel());
    this.panel.add(close);

    if (kind === 'profile') this.buildProfilePanel();
    else if (kind === 'shop') this.buildShopPanel();
    else if (kind === 'optics') this.buildOpticsPanel();
    else if (kind === 'rating') this.buildRatingPanel();
    else if (kind === 'settings') this.buildSettingsPanel();
  }

  addPanelTitle(key) {
    const title = this.add
      .text(W / 2, H / 2 - 185, t(this.player, key), {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#e8f4ff',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    this.panel.add(title);
    return title;
  }

  buildProfilePanel() {
    this.addPanelTitle('profile');
    const rank = getRank(this.player.careerScore);
    const portrait = getPortrait(this.player);

    // портрет — левый верх панели
    this.panel.add(
      this.add.rectangle(W / 2 - 250, H / 2 - 70, 120, 120, 0x08141c, 1).setStrokeStyle(2, 0x4a8ab0),
    );
    if (this.textures.exists(portrait.texture)) {
      const img = this.add.image(W / 2 - 250, H / 2 - 70, portrait.texture);
      img.setDisplaySize(110, 110);
      this.panel.add(img);
    }

    const lines = [
      `${t(this.player, 'name')}: ${this.player.name || '—'}`,
      `${t(this.player, 'rank')}: ${rankName(this.player, rank)}`,
      `${t(this.player, 'career')}: ${this.player.careerScore} ${t(this.player, 'points')}`,
      `${t(this.player, 'anchors')}: ${this.player.anchors}`,
    ];
    lines.forEach((line, i) => {
      this.panel.add(
        this.add
          .text(W / 2 + 40, H / 2 - 120 + i * 36, line, {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: '20px',
            color: '#cde6f8',
          })
          .setOrigin(0.5),
      );
    });

    const free = !this.player.nameSetFree;
    if (free) {
      this.addPanelHitButton(W / 2, H / 2 + 130, t(this.player, 'setNameFree'), () => this.openNameEditor(), 360);
    } else {
      const bx = W / 2;
      const by = H / 2 + 130;
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
      this.toast(t(this.player, 'notEnough'));
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
    this.addPanelTitle('shop');

    this.addPanelHitButton(
      W / 2 - 120,
      H / 2 - 145,
      t(this.player, 'anchorsTab'),
      () => {
        this.shopTab = 'anchors';
        this.openPanel('shop');
      },
      180,
      40,
      this.shopTab === 'anchors' ? 0x2a6a4a : 0x1a3448,
    );
    this.addPanelHitButton(
      W / 2 + 120,
      H / 2 - 145,
      t(this.player, 'portraits'),
      () => {
        this.shopTab = 'portraits';
        this.openPanel('shop');
      },
      180,
      40,
      this.shopTab === 'portraits' ? 0x2a6a4a : 0x1a3448,
    );

    if (this.shopTab === 'portraits') {
      this.buildPortraitShop();
      return;
    }

    ANCHOR_PACKS.forEach((pack, i) => {
      const y = H / 2 - 45 + i * 85;
      const rowBg = this.add
        .rectangle(W / 2, y, 600, 72, 0x142838, 0.95)
        .setStrokeStyle(1, 0x3a6a88);
      this.panel.add(rowBg);

      const icon = this.add.image(W / 2 - 250, y, 'icon-anchor');
      icon.setDisplaySize(56, 56);
      this.panel.add(icon);

      const tag = pack.tagKey ? `  ·  ${t(this.player, pack.tagKey)}` : '';
      this.panel.add(
        this.add
          .text(W / 2 - 205, y, `${pack.anchors}${tag}`, {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: '28px',
            color: '#ffd27a',
            fontStyle: '700',
            stroke: '#000',
            strokeThickness: 4,
          })
          .setOrigin(0, 0.5),
      );

      this.addPanelHitButton(
        W / 2 + 200,
        y,
        t(this.player, pack.priceLabel),
        () => {
          this.player.anchors += pack.anchors;
          savePlayer(this.player);
          this.refreshHeader();
          this.toast(`+${pack.anchors}`);
          this.openPanel('shop');
        },
        160,
        48,
        0x2a6a4a,
      );
    });
  }

  buildPortraitShop() {
    PORTRAITS.forEach((p, i) => {
      const col = i % 4;
      const x = W / 2 - 240 + col * 160;
      const y = H / 2 + 20;
      const owned = this.player.ownedPortraits?.includes(p.id);
      const equipped = this.player.equippedPortrait === p.id;

      this.panel.add(
        this.add
          .rectangle(x, y, 140, 200, equipped ? 0x1a4030 : 0x142838, 0.98)
          .setStrokeStyle(2, equipped ? 0x5ad0a0 : 0x3a6a88),
      );
      if (this.textures.exists(p.texture)) {
        const img = this.add.image(x, y - 40, p.texture);
        img.setDisplaySize(100, 100);
        this.panel.add(img);
      }
      this.panel.add(
        this.add
          .text(x, y + 30, portraitName(this.player, p), {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: '14px',
            color: '#e8f4ff',
            fontStyle: '600',
          })
          .setOrigin(0.5),
      );

      let label;
      let fill = 0x1a3448;
      if (equipped) {
        label = t(this.player, 'equipped');
        fill = 0x2a6a4a;
      } else if (owned) {
        label = t(this.player, 'equip');
        fill = 0x2a5080;
      } else {
        label = `${t(this.player, 'buy')} ${p.price}`;
        fill = 0x1a5a78;
      }

      this.addPanelHitButton(x, y + 70, label, () => this.handlePortraitClick(p), 120, 36, fill);
    });
  }

  handlePortraitClick(p) {
    const owned = this.player.ownedPortraits?.includes(p.id);
    if (!owned) {
      if (p.price > 0 && this.player.anchors < p.price) {
        this.toast(t(this.player, 'notEnough'));
        return;
      }
      this.player.anchors -= p.price;
      if (!this.player.ownedPortraits) this.player.ownedPortraits = ['default'];
      this.player.ownedPortraits.push(p.id);
      this.player.equippedPortrait = p.id;
      savePlayer(this.player);
      this.refreshHeader();
      this.toast(t(this.player, 'portraitBought'));
      this.openPanel('shop');
      return;
    }
    this.player.equippedPortrait = p.id;
    savePlayer(this.player);
    this.refreshHeader();
    this.toast(t(this.player, 'portraitEquipped'));
    this.openPanel('shop');
  }

  buildOpticsPanel() {
    this.panel.add(
      this.add
        .text(W / 2, 48, t(this.player, 'optics'), {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: '#e8f4ff',
          fontStyle: '700',
        })
        .setOrigin(0.5),
    );

    this.opticsSelected = this.opticsSelected || this.player.equippedSight;
    const selected = SIGHTS.find((s) => s.id === this.opticsSelected) || SIGHTS[0];
    const ownedSel = this.player.ownedSights.includes(selected.id);
    const equippedSel = this.player.equippedSight === selected.id;

    const px = 200;
    const previewTop = 105;
    const previewH = 200;
    const previewCy = previewTop + previewH / 2;
    this.panel.add(
      this.add.rectangle(px, previewCy, 260, previewH, 0x08141c, 1).setStrokeStyle(2, 0x4a8ab0),
    );
    if (this.textures.exists(selected.texture)) {
      const preview = this.add.image(px, previewCy, selected.texture);
      preview.setDisplaySize(180, 180);
      this.panel.add(preview);
    }

    this.panel.add(
      this.add
        .text(px, previewTop + previewH + 18, sightName(this.player, selected), {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: '700',
        })
        .setOrigin(0.5),
    );

    const btnY = previewTop + previewH + 78;
    if (equippedSel) {
      this.panel.add(this.add.rectangle(px, btnY, 200, 48, 0x1a4030, 1).setStrokeStyle(2, 0x5ad0a0));
      this.panel.add(
        this.add
          .text(px, btnY, t(this.player, 'equipped'), {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: '18px',
            color: '#a8ffc8',
            fontStyle: '700',
          })
          .setOrigin(0.5),
      );
    } else if (ownedSel) {
      this.addPanelHitButton(px, btnY, t(this.player, 'equip'), () => this.equipSight(selected), 200, 48, 0x2a6a4a);
    } else {
      const buyBg = this.add
        .rectangle(px, btnY, 220, 52, 0x1a5a78, 1)
        .setStrokeStyle(2, 0x7ec8e8)
        .setInteractive({ useHandCursor: true });
      const aIcon = this.add.image(px - 68, btnY, 'icon-anchor');
      aIcon.setDisplaySize(34, 34);
      const buyTxt = this.add
        .text(px + 12, btnY, `${t(this.player, 'buy')}  ${selected.price}`, {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: '700',
        })
        .setOrigin(0.5);
      buyBg.on('pointerover', () => {
        buyBg.setFillStyle(0x247090, 1);
        this.input.setDefaultCursor('pointer');
      });
      buyBg.on('pointerout', () => {
        buyBg.setFillStyle(0x1a5a78, 1);
        this.input.setDefaultCursor('default');
      });
      buyBg.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.buySight(selected);
      });
      this.panel.add(buyBg);
      this.panel.add(aIcon);
      this.panel.add(buyTxt);
    }

    SIGHTS.forEach((sight, i) => {
      const y = 120 + i * 68;
      const owned = this.player.ownedSights.includes(sight.id);
      const equipped = this.player.equippedSight === sight.id;
      const isSel = sight.id === this.opticsSelected;

      const row = this.add
        .rectangle(640, y, 460, 60, isSel ? 0x1a4030 : 0x142838, 0.98)
        .setStrokeStyle(2, equipped ? 0x5ad0a0 : isSel ? 0x7ab0d0 : 0x3a6a88)
        .setInteractive({ useHandCursor: true });
      this.panel.add(row);

      if (this.textures.exists(sight.texture)) {
        const thumb = this.add.image(440, y, sight.texture);
        thumb.setDisplaySize(48, 48);
        this.panel.add(thumb);
      }

      this.panel.add(
        this.add
          .text(480, y, sightName(this.player, sight), {
            fontFamily: 'Segoe UI, system-ui, sans-serif',
            fontSize: '18px',
            color: '#e8f4ff',
            fontStyle: '600',
          })
          .setOrigin(0, 0.5),
      );

      const status = equipped
        ? t(this.player, 'equipped')
        : owned
          ? ''
          : String(sight.price);
      if (status) {
        this.panel.add(
          this.add
            .text(850, y, status, {
              fontFamily: 'Segoe UI, system-ui, sans-serif',
              fontSize: '15px',
              color: equipped ? '#a8ffc8' : '#ffd27a',
            })
            .setOrigin(1, 0.5),
        );
      }

      row.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      row.on('pointerout', () => this.input.setDefaultCursor('default'));
      row.on('pointerdown', () => {
        this.opticsSelected = sight.id;
        this.openPanel('optics');
      });
    });
  }

  buySight(sight) {
    if (this.player.ownedSights.includes(sight.id)) {
      this.equipSight(sight);
      return;
    }
    if (this.player.anchors < sight.price) {
      this.toast(t(this.player, 'notEnough'));
      return;
    }
    this.player.anchors -= sight.price;
    this.player.ownedSights.push(sight.id);
    this.player.equippedSight = sight.id;
    this.opticsSelected = sight.id;
    savePlayer(this.player);
    this.refreshHeader();
    this.toast(t(this.player, 'sightBought'));
    this.openPanel('optics');
  }

  equipSight(sight) {
    this.player.equippedSight = sight.id;
    this.opticsSelected = sight.id;
    savePlayer(this.player);
    this.toast(t(this.player, 'sightEquipped'));
    this.openPanel('optics');
  }

  buildRatingPanel() {
    this.addPanelTitle('rating');
    this.ratingMode = this.ratingMode || 'daily';

    this.addPanelHitButton(
      W / 2 - 100,
      H / 2 - 145,
      t(this.player, 'daily'),
      () => {
        this.ratingMode = 'daily';
        this.openPanel('rating');
      },
      170,
      44,
      this.ratingMode === 'daily' ? 0x2a6a4a : 0x1a3448,
    );
    this.addPanelHitButton(
      W / 2 + 100,
      H / 2 - 145,
      t(this.player, 'monthly'),
      () => {
        this.ratingMode = 'monthly';
        this.openPanel('rating');
      },
      170,
      44,
      this.ratingMode === 'monthly' ? 0x2a6a4a : 0x1a3448,
    );

    const tableTop = H / 2 - 95;
    const tableW = 620;
    const colX = {
      place: W / 2 - tableW / 2 + 40,
      name: W / 2 - 40,
      score: W / 2 + tableW / 2 - 50,
    };

    this.panel.add(
      this.add.rectangle(W / 2, tableTop, tableW, 36, 0x1a3448, 0.95).setStrokeStyle(1, 0x4a8ab0),
    );
    const headStyle = {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: '15px',
      color: '#8ab0c8',
      fontStyle: '700',
    };
    this.panel.add(this.add.text(colX.place, tableTop, t(this.player, 'colPlace'), headStyle).setOrigin(0.5));
    this.panel.add(this.add.text(colX.name, tableTop, t(this.player, 'colPlayer'), headStyle).setOrigin(0.5));
    this.panel.add(this.add.text(colX.score, tableTop, t(this.player, 'colScore'), headStyle).setOrigin(0.5));

    const rows = buildLeaderboard(this.player, this.ratingMode).slice(0, 8);
    rows.forEach((row, i) => {
      const y = tableTop + 38 + i * 34;
      const bgColor = row.me ? 0x2a4030 : i % 2 === 0 ? 0x102030 : 0x142838;
      this.panel.add(this.add.rectangle(W / 2, y, tableW, 32, bgColor, 0.92));

      const color = row.me ? '#ffd27a' : '#cde6f8';
      const style = {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '16px',
        color,
        fontStyle: row.me ? '700' : '500',
      };
      this.panel.add(this.add.text(colX.place, y, String(row.place), style).setOrigin(0.5));
      this.panel.add(this.add.text(colX.name, y, row.name, style).setOrigin(0.5));
      this.panel.add(this.add.text(colX.score, y, String(row.score), style).setOrigin(0.5));
    });
  }

  buildSettingsPanel() {
    this.addPanelTitle('settings');

    this.panel.add(
      this.add
        .text(W / 2, H / 2 - 100, t(this.player, 'language'), {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '20px',
          color: '#9ec9e8',
        })
        .setOrigin(0.5),
    );

    const langs = [
      { code: 'ru', label: 'Русский', x: W / 2 - 180 },
      { code: 'en', label: 'English', x: W / 2 },
      { code: 'es', label: 'Español', x: W / 2 + 180 },
    ];
    langs.forEach((L) => {
      const active = this.player.lang === L.code;
      this.addPanelHitButton(
        L.x,
        H / 2 - 40,
        L.label,
        () => {
          this.player.lang = L.code;
          savePlayer(this.player);
          this.scene.restart({ openPanel: 'settings' });
        },
        160,
        48,
        active ? 0x2a6a4a : 0x1a3448,
      );
    });

    const soundLabel = `${t(this.player, 'sound')}: ${
      this.player.soundOn ? t(this.player, 'on') : t(this.player, 'off')
    }`;
    this.addPanelHitButton(W / 2, H / 2 + 80, soundLabel, () => {
      this.player.soundOn = !this.player.soundOn;
      savePlayer(this.player);
      this.openPanel('settings');
    }, 260);
  }

  addPanelHitButton(x, y, label, onClick, width = 280, height = 46, fill = 0x1a3448) {
    const bg = this.add
      .rectangle(x, y, width, height, fill, 0.98)
      .setStrokeStyle(1, 0x4a8ab0)
      .setInteractive({ useHandCursor: true })
      .setDepth(60);
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: '600',
      })
      .setOrigin(0.5)
      .setDepth(61);
    bg.on('pointerover', () => {
      bg.setFillStyle(0x254860, 1);
      this.input.setDefaultCursor('pointer');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(fill, 0.98);
      this.input.setDefaultCursor('default');
    });
    bg.on('pointerdown', (pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
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
}
