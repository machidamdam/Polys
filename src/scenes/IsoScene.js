// Tile image specs (256×256 px, diamond top = 178×89)
const ISO_W = 178;
const ISO_H = 89;
const SPR   = 256;
const COLS  = 20;
const ROWS  = 20;

// Shift so leftmost column starts at x = 0
const OFF_X = (ROWS - 1) * ISO_W / 2 + SPR / 2;

export const MAP_PX_W = (COLS + ROWS - 2) * ISO_W / 2 + SPR;
export const MAP_PX_H = (COLS + ROWS - 2) * ISO_H / 2 + SPR;

export default class IsoScene extends Phaser.Scene {
  constructor() { super('IsoScene'); }

  preload() {
    this.load.image('t_full',   'assets/tiles/grass_full.png');
    this.load.image('t_edge',   'assets/tiles/grass_edge.png');
    this.load.image('t_corner', 'assets/tiles/grass_corner.png');
    this.load.image('t_ramp',   'assets/tiles/grass_ramp.png');
  }

  create() {
    this.world = this.add.container(0, 0);
    this.grid  = buildGrid();
    this.drawMap();
    this.setupCamera();
    this.setupInput();

    const { width, height } = this.scale;
    const hint = this.add.text(width / 2, height - 30,
      'Glisse · pince pour zoomer', {
        fontFamily: 'monospace', fontSize: '12px', color: '#fff',
        backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setDepth(1000);
    this.tweens.add({
      targets: hint, alpha: 0, delay: 3500, duration: 1500,
      onComplete: () => hint.destroy(),
    });
  }

  drawMap() {
    // Back-to-front: diagonal strips, low (col+row) first
    for (let d = 0; d < COLS + ROWS - 1; d++) {
      for (let col = Math.max(0, d - ROWS + 1); col <= Math.min(COLS - 1, d); col++) {
        const row = d - col;
        if (!this.isLand(col, row)) continue;

        const x = (col - row) * ISO_W / 2 + OFF_X;
        const y = (col + row) * ISO_H / 2;

        const hasR = this.isLand(col + 1, row);   // right-front neighbour
        const hasL = this.isLand(col, row + 1);   // left-front neighbour

        let key, flipX = false;
        if (hasR &&  hasL) key = 't_full';
        else if (hasR)     key = 't_edge';
        else if (hasL)   { key = 't_edge';   flipX = true; }
        else               key = 't_corner';

        this.world.add(
          this.add.image(x, y, key).setOrigin(0.5, 0).setFlipX(flipX),
        );
      }
    }
  }

  isLand(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS && this.grid[r][c] === 1;
  }

  // ── camera ──────────────────────────────────────────────────────────────────
  setupCamera() {
    const { width, height } = this.scale;
    this.minZoom = Math.max(width / MAP_PX_W, height / MAP_PX_H) * 1.06;
    this.maxZoom = 3;
    this.zoom = this.minZoom;
    this.camX = (width  - MAP_PX_W * this.zoom) / 2;
    this.camY = (height - MAP_PX_H * this.zoom) / 2;
    this.apply();
  }

  clampCamera() {
    const { width, height } = this.scale;
    const mw = MAP_PX_W * this.zoom, mh = MAP_PX_H * this.zoom;
    this.camX = mw <= width  ? (width  - mw) / 2 : Phaser.Math.Clamp(this.camX, width  - mw, 0);
    this.camY = mh <= height ? (height - mh) / 2 : Phaser.Math.Clamp(this.camY, height - mh, 0);
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
        const d = Phaser.Math.Distance.Between(ptrs[0].x, ptrs[0].y, ptrs[1].x, ptrs[1].y);
        const mx = (ptrs[0].x + ptrs[1].x) / 2, my = (ptrs[0].y + ptrs[1].y) / 2;
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

  update() {}
}

// ── Map generation ────────────────────────────────────────────────────────────
function buildGrid() {
  let s = 20260613 >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const g = [];
  for (let row = 0; row < ROWS; row++) {
    g[row] = [];
    for (let col = 0; col < COLS; col++) {
      const nx = (col - COLS / 2 + 0.5) / (COLS * 0.36);
      const ny = (row - ROWS / 2 + 0.5) / (ROWS * 0.36);
      const w  = 0.35 * Math.sin(col * 0.60) * Math.cos(row * 0.45)
               + 0.20 * Math.sin(col * 1.10 + 1.4) * Math.cos(row * 0.80);
      g[row][col] = (Math.hypot(nx, ny) + w) < 0.82 ? 1 : 0;
    }
  }
  return g;
}
