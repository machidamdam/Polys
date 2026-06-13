import { TILE, generateTextures } from '../utils/PixelArtGen.js';

const COLS = 30;
const ROWS = 26;
const SEED = 20260613;

const MAP_W = COLS * TILE;
const MAP_H = ROWS * TILE;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    generateTextures(this);

    this.world = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.decoLayer = this.add.container(0, 0);
    this.world.add([this.tileLayer, this.decoLayer]);

    // zoom limits: never smaller than what fills the screen
    const { width, height } = this.scale;
    this.minZoom = Math.max(width / MAP_W, height / MAP_H);
    this.maxZoom = 3.5;
    this.zoom = this.minZoom;
    this.camX = 0; this.camY = 0;

    this.buildMap();
    this.setupInput();
    this.clampCamera();
    this.centerCamera();

    // water shimmer
    this.shimmer = 0;
    this.time.addEvent({
      delay: 650, loop: true,
      callback: () => { this.shimmer ^= 1; if (this.pond) this.pond.setTexture(this.shimmer ? 'pond_b' : 'pond_a'); },
    });

    this.addVignette();

    const hint = this.add.text(width / 2, height - 30,
      'Glisse pour explorer · pince pour zoomer', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
        backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 1500, onComplete: () => hint.destroy() });
  }

  buildMap() {
    const r = rng(SEED);

    // grass base
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++)
        this.tileLayer.add(this.add.image(col * TILE, row * TILE, `grass${(r() * 4) | 0}`).setOrigin(0, 0));

    // pond
    const pondCX = MAP_W * 0.62, pondCY = MAP_H * 0.40;
    this.pond = this.add.image(pondCX, pondCY, 'pond_a').setOrigin(0.5, 0.5).setDepth(pondCY);
    this.decoLayer.add(this.pond);
    const pondR = 120;
    const blocked = (x, y) => Phaser.Math.Distance.Between(x, y, pondCX, pondCY) < pondR;

    const place = (key, count, originY = 1) => {
      let tries = 0, made = 0;
      while (made < count && tries < count * 40) {
        tries++;
        const x = 40 + r() * (MAP_W - 80);
        const y = 50 + r() * (MAP_H - 90);
        if (blocked(x, y)) continue;
        const s = this.add.image(x, y, key).setOrigin(0.5, originY).setDepth(y);
        this.decoLayer.add(s);
        made++;
      }
    };

    // a small ruined temple: a row of columns
    const rowY = MAP_H * 0.74;
    const startX = MAP_W * 0.18;
    for (let i = 0; i < 5; i++) {
      const cx = startX + i * 46;
      if (blocked(cx, rowY)) continue;
      const key = (i === 1 || i === 3) ? 'column_broken' : 'column';
      const s = this.add.image(cx, rowY, key).setOrigin(0.5, 1).setDepth(rowY);
      this.decoLayer.add(s);
    }

    // greek flora
    place('cypress', 10);
    place('olive', 9);
    place('column', 3);
    place('column_broken', 4);
    place('rock', 7);

    // poppy & lavender clusters
    const flowers = ['flower_poppy', 'flower_lav', 'flower_w', 'flower_y'];
    for (let cl = 0; cl < 12; cl++) {
      const cxp = 50 + r() * (MAP_W - 100), cyp = 50 + r() * (MAP_H - 100);
      if (blocked(cxp, cyp)) continue;
      const kind = flowers[(r() * flowers.length) | 0];
      const n = 3 + ((r() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const f = this.add.image(cxp + (r() - 0.5) * 44, cyp + (r() - 0.5) * 44, kind).setOrigin(0.5, 1);
        f.setDepth(f.y);
        this.decoLayer.add(f);
      }
    }
  }

  addVignette() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setScrollFactor(0).setDepth(900);
    for (let i = 0; i < 60; i++) {
      const a = (1 - i / 60) * 0.45;
      g.fillStyle(0x0a1424, a);
      g.fillRect(0, i, width, 1);
      g.fillRect(0, height - 1 - i, width, 1);
    }
  }

  // ── camera with clamping ──
  centerCamera() {
    const { width, height } = this.scale;
    const mw = MAP_W * this.zoom, mh = MAP_H * this.zoom;
    if (mw <= width) this.camX = (width - mw) / 2;
    if (mh <= height) this.camY = (height - mh) / 2;
    this.clampCamera();
  }

  clampCamera() {
    const { width, height } = this.scale;
    const mw = MAP_W * this.zoom, mh = MAP_H * this.zoom;
    // horizontal
    if (mw <= width) this.camX = (width - mw) / 2;
    else this.camX = Phaser.Math.Clamp(this.camX, width - mw, 0);
    // vertical
    if (mh <= height) this.camY = (height - mh) / 2;
    else this.camY = Phaser.Math.Clamp(this.camY, height - mh, 0);
    this.apply();
  }

  apply() {
    this.world.setPosition(this.camX, this.camY);
    this.world.setScale(this.zoom);
  }

  setZoom(z, focusX, focusY) {
    const { width, height } = this.scale;
    const fx = focusX ?? width / 2, fy = focusY ?? height / 2;
    // world point under the focus before zoom
    const wx = (fx - this.camX) / this.zoom;
    const wy = (fy - this.camY) / this.zoom;
    this.zoom = Phaser.Math.Clamp(z, this.minZoom, this.maxZoom);
    // keep that world point under the focus after zoom
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
        const midX = (ptrs[0].x + ptrs[1].x) / 2, midY = (ptrs[0].y + ptrs[1].y) / 2;
        if (this.prevPinch !== null) this.setZoom(this.zoom + (d - this.prevPinch) * 0.006, midX, midY);
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

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
