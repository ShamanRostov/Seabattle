import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { getContour } from './contour/contour.js';
import { bootPlatform } from './platform/platform.js';
import { preloadSfx } from './audio/sfx.js';

preloadSfx();

if (import.meta.env.DEV) window.__seabattleContour = () => getContour().id;

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05080c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  scene: [BootScene, MenuScene, GameScene],
};

bootPlatform().then(() => {
  window.game = new Phaser.Game(gameConfig);
});
