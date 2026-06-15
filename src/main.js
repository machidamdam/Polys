import MenuScene    from './scenes/MenuScene.js?v=29';
import TopDownScene from './scenes/TopDownScene.js?v=29';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#3a5c1e',   // dark grass colour — any sub-pixel gap is invisible
  pixelArt: false,              // grass_seamless is a smooth texture, not pixel art
  roundPixels: true,            // snap world positions to integer px → no sub-px bleed
  scene: [MenuScene, TopDownScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { touch: true },
});

document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove',  e => e.preventDefault(), { passive: false });
