import MenuScene from './scenes/MenuScene.js?v=13';
import GameScene from './scenes/GameScene.js?v=13';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#a8af60',   // matches grass so tile gaps are invisible
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scene: [MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    touch: true,
  },
};

const game = new Phaser.Game(config);

// Prevent default touch behaviours (scroll, zoom)
document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove',  e => e.preventDefault(), { passive: false });
