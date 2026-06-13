import { TILE, generateTextures } from '../utils/PixelArtGen.js';

const COLS = 28;
const ROWS = 24;
const SEED = 20260613;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    generateTextures(this);

    // Camera state
    this.camX = 0; this.camY = 0; this.zoom = 1.4;

    this.world = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.decoLayer = this.add.container(0, 0);
    this.world.add([this.tileLayer, this.decoLayer]);

    this.buildMap();
    this.setupInput();
    this.centerCamera();

    // gentle water shimmer
    this.shimmer = 0;
    this.time.addEvent({
      delay: 650, loop: true,
      callback: () => {
        this.shimmer ^= 1;
        if (this.pond) this.pond.setTexture(this.shimmer ? 'pond_b' : 'pond_a');
      },
    });

    // soft framing vignette (screen-space)
    this.addVignette();

    // tiny hint that fades
    const hint = this.add.text(this.scale.width / 2, this.scale.height - 30,
      'Glisse pour explorer · pince pour zoomer', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
        backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 1500,
      onComplete: () => hint.destroy() });
  }

  buildMap() {
    const r = rng(SEED);

    // ── grass base ──
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const variant = (r() * 4) | 0;
        const t = this.add.image(col * TILE, row * TILE, `grass${variant}`).setOrigin(0, 0);
        this.tileLayer.add(t);
      }
    }

    // ── pond (placed roughly center-left) ──
    const pondCX = COLS * TILE * 0.40;
    const pondCY = ROWS * TILE * 0.52;
    this.pond = this.add.image(pondCX, pondCY, 'pond_a').setOrigin(0.5, 0.5);
    this.pond.setDepth(pondCY);
    this.decoLayer.add(this.pond);
    const pondR = 110; // keep decorations away from water

    // ── scatter decorations ──
    const occupied = (x, y) => Phaser.Math.Distance.Between(x, y, pondCX, pondCY) < pondR;

    const place = (key, originY, count, depthBias = 0) => {
      let tries = 0, made = 0;
      while (made < count && tries < count * 30) {
        tries++;
        const x = 40 + r() * (COLS * TILE - 80);
        const y = 40 + r() * (ROWS * TILE - 80);
        if (occupied(x, y)) continue;
        const s = this.add.image(x, y, key).setOrigin(0.5, originY);
        s.setDepth(y + depthBias);
        this.decoLayer.add(s);
        made++;
      }
    };

    // trees around the edges look natural — place plenty
    place('tree0', 1, 9);
    place('tree1', 1, 9);
    place('bush', 1, 8);
    place('rock', 1, 6);

    // flower clusters
    const flowers = ['flower_r', 'flower_y', 'flower_w', 'flower_p'];
    for (let cluster = 0; cluster < 10; cluster++) {
      const cxp = 50 + r() * (COLS * TILE - 100);
      const cyp = 50 + r() * (ROWS * TILE - 100);
      if (occupied(cxp, cyp)) continue;
      const kind = flowers[(r() * flowers.length) | 0];
      const n = 3 + ((r() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const fx = cxp + (r() - 0.5) * 40;
        const fy = cyp + (r() - 0.5) * 40;
        const f = this.add.image(fx, fy, kind).setOrigin(0.5, 1);
        f.setDepth(fy);
        this.decoLayer.add(f);
      }
    }
  }

  addVignette() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setScrollFactor(0).setDepth(900);
    const edge = 0x0a1424;
    // top & bottom soft bands
    for (let i = 0; i < 60; i++) {
      const a = (1 - i / 60) * 0.5;
      g.fillStyle(edge, a);
      g.fillRect(0, i, width, 1);
      g.fillRect(0, height - 1 - i, width, 1);
    }
  }

  // ── camera ──
  centerCamera() {
    const { width, height } = this.scale;
    this.camX = (width - COLS * TILE * this.zoom) / 2;
    this.camY = (height - ROWS * TILE * this.zoom) / 2;
    this.apply();
  }

  apply() {
    this.world.setPosition(this.camX, this.camY);
    this.world.setScale(this.zoom);
  }

  setupInput() {
    let drag = null;
    this.prevPinch = null;
    this.input.addPointer(1);

    this.input.on('pointerdown', p => { drag = { px: p.x, py: p.y, cx: this.camX, cy: this.camY }; });

    this.input.on('pointermove', p => {
      const ptrs = this.input.manager.pointers.filter(pt => pt.isDown);
      if (ptrs.length === 2) {
        const d = Phaser.Math.Distance.Between(ptrs[0].x, ptrs[0].y, ptrs[1].x, ptrs[1].y);
        if (this.prevPinch !== null) {
          this.zoom = Phaser.Math.Clamp(this.zoom + (d - this.prevPinch) * 0.006, 0.7, 3.5);
          this.apply();
        }
        this.prevPinch = d;
        return;
      }
      this.prevPinch = null;
      if (!drag) return;
      this.camX = drag.cx + (p.x - drag.px);
      this.camY = drag.cy + (p.y - drag.py);
      this.apply();
    });

    this.input.on('pointerup', () => { drag = null; });
    this.input.on('wheel', (_, __, ___, dy) => {
      this.zoom = Phaser.Math.Clamp(this.zoom - dy * 0.001, 0.7, 3.5);
      this.apply();
    });
  }

  update() {}
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
