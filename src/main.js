import MenuScene from './scenes/MenuScene.js?v=25';
import IsoScene  from './scenes/IsoScene.js?v=25';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a4a6e',   // sea blue — shows under transparent tile areas
  pixelArt: false,              // isometric sprites use anti-aliasing
  scene: [MenuScene, IsoScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { touch: true },
});

document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove',  e => e.preventDefault(), { passive: false });
