// ── Top-down tile map — Stardew Valley style ──────────────────────────────────
// Tileset: assets/tiles/sprout.png  (128×64, 8 cols × 4 rows of 16×16 tiles)
// Tile indices (left-to-right, top-to-bottom):
//   0-3  grass variants  |  4 dirt  |  5 sand  |  6 stone  |  7 water-deep
//   8-9  water-deep anim |  10-12   water-shallow anim

const TILE_SIZE   = 16;   // source tile in pixels
const SCALE       = 4;    // integer upscale → 64×64 on screen, pixel-perfect
const MAP_COLS    = 12;
const MAP_ROWS    = 12;
const SHEET_COLS  = 8;    // tiles per row in the spritesheet

// Map data: 12×12 of tile index 0 (grass base).
// Change any value to 4 (dirt), 5 (sand), 6 (stone), 7 (water), etc.
const MAP_DATA = Array.from({ length: MAP_ROWS }, () =>
  Array.from({ length: MAP_COLS }, () => 0)
);

export default class TopDownScene extends Phaser.Scene {
  constructor() { super('TopDownScene'); }

  preload() {
    this.load.spritesheet('sprout', 'assets/tiles/sprout.png', {
      frameWidth:  TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
  }

  create() {
    const map = this.make.tilemap({
      data:       MAP_DATA,
      tileWidth:  TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = map.addTilesetImage('sprout');
    const layer   = map.createLayer(0, tileset, 0, 0);

    // Integer upscale → crisp pixels, zero gaps
    layer.setScale(SCALE);

    this.layer = layer;
    this.setupCamera(map.widthInPixels * SCALE, map.heightInPixels * SCALE);
    this.setupInput();
    this.showHint();
  }

  // ── camera ──────────────────────────────────────────────────────────────────
  setupCamera(mapW, mapH) {
    const { width, height } = this.scale;
    this.mapW = mapW; this.mapH = mapH;
    this.minZoom = Math.min(width / mapW, height / mapH) * 0.95;
    this.maxZoom = 3;
    this.zoom    = Math.max(this.minZoom, 1);
    this.camX    = (width  - mapW * this.zoom) / 2;
    this.camY    = (height - mapH * this.zoom) / 2;
    this.apply();
  }

  clampCamera() {
    const { width, height } = this.scale;
    const mw = this.mapW * this.zoom, mh = this.mapH * this.zoom;
    this.camX = mw <= width  ? (width  - mw) / 2 : Phaser.Math.Clamp(this.camX, width  - mw, 0);
    this.camY = mh <= height ? (height - mh) / 2 : Phaser.Math.Clamp(this.camY, height - mh, 0);
    this.apply();
  }

  apply() {
    // The layer origin is at (0,0); we shift it via the camera offset.
    this.layer.setPosition(Math.round(this.camX), Math.round(this.camY));
    // We DO NOT use Phaser's built-in camera so we can keep simple integer math.
  }

  setZoom(z, fx, fy) {
    const { width, height } = this.scale;
    fx ??= width / 2; fy ??= height / 2;
    const wx = (fx - this.camX) / this.zoom;
    const wy = (fy - this.camY) / this.zoom;
    this.zoom = Phaser.Math.Clamp(z, this.minZoom, this.maxZoom);
    this.camX = fx - wx * this.zoom;
    this.camY = fy - wy * this.zoom;
    // Rescale layer proportionally to the base SCALE
    this.layer.setScale(SCALE * this.zoom);
    this.clampCamera();
  }

  // ── input ────────────────────────────────────────────────────────────────────
  setupInput() {
    let drag = null;
    this.prevPinch = null;
    this.input.addPointer(1);

    this.input.on('pointerdown', p => { drag = { px: p.x, py: p.y, cx: this.camX, cy: this.camY }; });
    this.input.on('pointermove', p => {
      const ptrs = this.input.manager.pointers.filter(pt => pt.isDown);
      if (ptrs.length === 2) {
        const d  = Phaser.Math.Distance.Between(ptrs[0].x, ptrs[0].y, ptrs[1].x, ptrs[1].y);
        const mx = (ptrs[0].x + ptrs[1].x) / 2;
        const my = (ptrs[0].y + ptrs[1].y) / 2;
        if (this.prevPinch !== null) this.setZoom(this.zoom + (d - this.prevPinch) * 0.006, mx, my);
        this.prevPinch = d;
        return;
      }
      this.prevPinch = null;
      if (!drag) return;
      this.camX = drag.cx + (p.x - drag.px);
      this.camY = drag.cy + (p.y - drag.py);
      this.clampCamera();
    });
    this.input.on('pointerup', () => { drag = null; });
    this.input.on('wheel', (p, __, ___, dy) => this.setZoom(this.zoom - dy * 0.001, p.x, p.y));
  }

  showHint() {
    const { width, height } = this.scale;
    const hint = this.add.text(width / 2, height - 30, 'Glisse · pince pour zoomer', {
      fontFamily: 'monospace', fontSize: '12px', color: '#fff',
      backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 1500,
      onComplete: () => hint.destroy() });
  }

  update() {}
}
