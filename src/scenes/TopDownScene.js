// ── Top-down flat map (Stardew style) ─────────────────────────────────────────
// Each cell samples a 64×64 crop from assets/tiles/grass_seamless.png (256×256).
// Sampling offset = (col*TILE % 256, row*TILE % 256) → different region per cell.
// The seamless property of the texture guarantees zero visible borders.
// No scaling: the 256→64 is done by cropping, never by drawImage scaling,
// so imageSmoothingEnabled = false has full effect.

const TILE  = 64;   // pixels per cell on screen
const TEX   = 256;  // grass_seamless.png natural size
const COLS  = 12;
const ROWS  = 12;

// ── Map data: 2D array of tile IDs ────────────────────────────────────────────
// 0 = grass (only tile for now; extend this table later)
const TILE_GRASS = 0;

export const MAP = Array.from({ length: ROWS },
  () => new Array(COLS).fill(TILE_GRASS)
);

// ── Scene ─────────────────────────────────────────────────────────────────────
export default class TopDownScene extends Phaser.Scene {
  constructor() { super('TopDownScene'); }

  preload() {
    this.loadOk = true;

    const path = 'assets/tiles/grass_seamless.png';
    console.log(`[TopDownScene] chargement ← ${path}`);
    this.load.image('grass_seamless', path);

    this.load.on('loaderror', file => {
      const url = file.src ?? file.url ?? path;
      console.error(`[TopDownScene] ÉCHEC : ${url}`);
      this.loadOk = false;
      this.failedUrl = url;
    });
  }

  create() {
    if (!this.loadOk) {
      this.showError(this.failedUrl);
      return;
    }

    const mapW = COLS * TILE;   // 768 px
    const mapH = ROWS * TILE;   // 768 px

    // ── Bake the map into a single canvas texture ──────────────────────────────
    // drawImage with source crop → 1:1 pixel, no resampling, seamless joins.
    const src = this.textures.get('grass_seamless').getSourceImage();
    const tex = this.textures.createCanvas('map_baked', mapW, mapH);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (MAP[row][col] === TILE_GRASS) {
          const srcX = (col * TILE) % TEX;
          const srcY = (row * TILE) % TEX;
          ctx.drawImage(src, srcX, srcY, TILE, TILE,
                             col * TILE, row * TILE, TILE, TILE);
        }
      }
    }
    tex.refresh();

    // ── World container — receives pan/zoom transform ──────────────────────────
    this.world = this.add.container(0, 0);
    this.world.add(this.add.image(0, 0, 'map_baked').setOrigin(0, 0));

    this.mapW = mapW;
    this.mapH = mapH;

    this.minZoom = Math.min(
      this.scale.width  / mapW,
      this.scale.height / mapH
    ) * 0.96;
    this.maxZoom = 4;
    this.zoom = this.minZoom;

    this.centerCamera();
    this.setupInput();
    this.showHint();
  }

  // ── Camera ────────────────────────────────────────────────────────────────────
  centerCamera() {
    const { width, height } = this.scale;
    this.camX = (width  - this.mapW * this.zoom) / 2;
    this.camY = (height - this.mapH * this.zoom) / 2;
    this.clampCamera();
  }

  clampCamera() {
    const { width, height } = this.scale;
    const mw = this.mapW * this.zoom;
    const mh = this.mapH * this.zoom;
    this.camX = mw <= width  ? (width  - mw) / 2
                             : Phaser.Math.Clamp(this.camX, width  - mw, 0);
    this.camY = mh <= height ? (height - mh) / 2
                             : Phaser.Math.Clamp(this.camY, height - mh, 0);
    this.apply();
  }

  apply() {
    this.world.setPosition(Math.round(this.camX), Math.round(this.camY));
    this.world.setScale(this.zoom);
  }

  setZoom(z, fx, fy) {
    const { width, height } = this.scale;
    fx ??= width / 2; fy ??= height / 2;
    const wx = (fx - this.camX) / this.zoom;
    const wy = (fy - this.camY) / this.zoom;
    this.zoom = Phaser.Math.Clamp(z, this.minZoom, this.maxZoom);
    this.camX = fx - wx * this.zoom;
    this.camY = fy - wy * this.zoom;
    this.clampCamera();
  }

  // ── Input ─────────────────────────────────────────────────────────────────────
  setupInput() {
    let drag = null;
    this.prevPinch = null;
    this.input.addPointer(1);

    this.input.on('pointerdown', p => {
      drag = { px: p.x, py: p.y, cx: this.camX, cy: this.camY };
    });
    this.input.on('pointermove', p => {
      const ptrs = this.input.manager.pointers.filter(pt => pt.isDown);
      if (ptrs.length === 2) {
        const d  = Phaser.Math.Distance.Between(
          ptrs[0].x, ptrs[0].y, ptrs[1].x, ptrs[1].y);
        const mx = (ptrs[0].x + ptrs[1].x) / 2;
        const my = (ptrs[0].y + ptrs[1].y) / 2;
        if (this.prevPinch !== null)
          this.setZoom(this.zoom + (d - this.prevPinch) * 0.006, mx, my);
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
    this.input.on('wheel', (p, __, ___, dy) =>
      this.setZoom(this.zoom - dy * 0.001, p.x, p.y));
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  showHint() {
    const { width, height } = this.scale;
    const hint = this.add.text(width / 2, height - 30,
      'Glisse · pince pour zoomer', {
        fontFamily: 'monospace', fontSize: '12px', color: '#fff',
        backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.tweens.add({
      targets: hint, alpha: 0, delay: 3500, duration: 1500,
      onComplete: () => hint.destroy(),
    });
  }

  showError(url) {
    const { width } = this.scale;
    this.add.text(width / 2, 20,
      `⚠ Image introuvable :\n${url}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#fff',
        backgroundColor: '#aa1111cc', padding: { x: 12, y: 8 }, align: 'center',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);
  }

  update() {}
}
