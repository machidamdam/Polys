// ── Isometric map ─────────────────────────────────────────────────────────────
// Tiles are isometric blocks (grass top + rocky sides). The walkable top face is
// a diamond; tessellation steps by the diamond size, NOT the full image size.
// Geometry below matches the committed tile art (diamond ≈ 236×88 in a 256-wide
// image). If you upload official 256×256 assets whose diamond is 178×89, just set
// ISO_W = 178 and ISO_H = 89.
const ISO_W = 236;   // diamond top width  (horizontal tessellation step ×2)
const ISO_H = 88;    // diamond top height (vertical   tessellation step ×2)

const COLS = 6;
const ROWS = 6;

// Files to load: key → relative path (no leading slash; case-sensitive on Pages)
const TILE_FILES = {
  t_full:   'assets/tiles/grass_full.png',
  t_edge:   'assets/tiles/grass_edge.png',
  t_corner: 'assets/tiles/grass_corner.png',
  t_ramp:   'assets/tiles/grass_ramp.png',
};

export default class IsoScene extends Phaser.Scene {
  constructor() { super('IsoScene'); }

  preload() {
    this.failed = [];

    // 1+3. Log the EXACT path requested for each image, and capture failures.
    for (const [key, path] of Object.entries(TILE_FILES)) {
      console.log(`[IsoScene] chargement ${key} ← ${path}`);
      this.load.image(key, path);
    }
    this.load.on('loaderror', file => {
      console.error(`[IsoScene] ÉCHEC chargement: ${file.src}`);
      this.failed.push(file.src);
    });
  }

  create() {
    // 4. If anything failed, build a visible fallback so we still see structure,
    //    and show a readable on-screen message.
    if (this.failed.length) this.makePlaceholder('t_full');

    this.world = this.add.container(0, 0);
    this.drawMap();
    this.setupCamera();
    this.setupInput();

    if (this.failed.length) this.showError();
    else this.showHint();
  }

  // 5. Fill a full COLS×ROWS map with grass_full, drawn at real tile size.
  drawMap() {
    const offX = (ROWS - 1) * ISO_W / 2;
    // Painter's order: back (low col+row) to front.
    for (let d = 0; d < COLS + ROWS - 1; d++) {
      for (let col = Math.max(0, d - ROWS + 1); col <= Math.min(COLS - 1, d); col++) {
        const row = d - col;
        const x = (col - row) * ISO_W / 2 + offX;
        const y = (col + row) * ISO_H / 2;
        this.world.add(this.add.image(x, y, 't_full').setOrigin(0.5, 0));
      }
    }
  }

  // Fallback diamond so a missing texture still renders at the right size.
  makePlaceholder(key) {
    const g = this.add.graphics();
    g.fillStyle(0x6f9a3c, 1).lineStyle(2, 0x3a5420, 1);
    g.beginPath();
    g.moveTo(ISO_W / 2, 0);
    g.lineTo(ISO_W, ISO_H / 2);
    g.lineTo(ISO_W / 2, ISO_H);
    g.lineTo(0, ISO_H / 2);
    g.closePath();
    g.fillPath(); g.strokePath();
    g.generateTexture(key, ISO_W, ISO_H);
    g.destroy();
  }

  showError() {
    const { width } = this.scale;
    const list = this.failed.map(s => '• ' + s.split('/assets/').pop()).join('\n');
    this.add.text(width / 2, 16,
      `⚠ Images introuvables (placeholder affiché) :\n${list}\n` +
      `Vérifie qu'elles sont bien dans assets/tiles/`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#fff',
        backgroundColor: '#a01818dd', padding: { x: 10, y: 8 }, align: 'center',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);
  }

  showHint() {
    const { width, height } = this.scale;
    const hint = this.add.text(width / 2, height - 30, 'Glisse · pince pour zoomer', {
      fontFamily: 'monospace', fontSize: '12px', color: '#fff',
      backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 1500,
      onComplete: () => hint.destroy() });
  }

  // ── camera ──────────────────────────────────────────────────────────────────
  setupCamera() {
    const { width, height } = this.scale;
    const mapW = (COLS + ROWS - 2) * ISO_W / 2 + ISO_W;
    const mapH = (COLS + ROWS - 2) * ISO_H / 2 + ISO_H * 2;
    this.mapW = mapW; this.mapH = mapH;
    this.minZoom = Math.min(width / mapW, height / mapH) * 0.95;
    this.maxZoom = 3;
    this.zoom = this.minZoom;
    this.camX = (width  - mapW * this.zoom) / 2;
    this.camY = (height - mapH * this.zoom) / 2;
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

    this.input.on('pointerdown', p => { drag = { px: p.x, py: p.y, cx: this.camX, cy: this.camY }; });
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
