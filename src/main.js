import MenuScene    from './scenes/MenuScene.js?v=27';
import TopDownScene from './scenes/TopDownScene.js?v=27';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#3a5c1e',   // dark grass — no gaps visible even at seams
  pixelArt: true,               // nearest-neighbour scaling = crisp pixels
  antialias: false,
  roundPixels: true,
  scene: [MenuScene, TopDownScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { touch: true },
});

document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove',  e => e.preventDefault(), { passive: false });
