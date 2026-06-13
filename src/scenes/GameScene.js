import { TILE, generateTextures } from '../utils/PixelArtGen.js?v=9';

const COLS = 32;
const ROWS = 28;
const SEED = 20260613;

const MAP_W = COLS * TILE;
const MAP_H = ROWS * TILE;

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    generateTextures(this);

    this.world = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);   // ground
    this.foamLayer = this.add.container(0, 0);   // shore foam
    this.decoLayer = this.add.container(0, 0);   // trees/rocks/flowers
    this.world.add([this.tileLayer, this.foamLayer, this.decoLayer]);

    const { width, height } = this.scale;
    this.minZoom = Math.max(width / MAP_W, height / MAP_H);
    this.maxZoom = 3.5;
    this.zoom = this.minZoom;
    this.camX = 0; this.camY = 0;

    this.seaTiles = [];
    this.foamTiles = [];

    this.buildMap();
    this.setupInput();
    this.centerCamera();

    // animate the sea (traveling shimmer + lapping foam)
    this.waterFrame = 0;
    this.time.addEvent({
      delay: 380, loop: true,
      callback: () => {
        this.waterFrame = (this.waterFrame + 1) % 3;
        const wf = this.waterFrame;
        this.seaTiles.forEach(s => {
          const f = (wf + s.c + s.r) % 3;
          s.spr.setTexture(`${s.deep ? 'sea' : 'shal'}${f}`);
        });
        this.foamTiles.forEach(s => {
          s.spr.setTexture(`foam${(wf + s.c) % 2}`);
        });
      },
    });

    this.addVignette();

    const hint = this.add.text(width / 2, height - 30,
      'Glisse pour explorer · pince pour zoomer', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
        backgroundColor: '#0e1a2eaa', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: hint, alpha: 0, delay: 3500, duration: 1500, onComplete: () => hint.destroy() });
  }

  // coastline: sea fills the bottom, with an organic wavy shore
  coastRow(col) {
    const base = ROWS * 0.60;
    const y = base
      + 2.0 * Math.sin(col * 0.45)
      + 1.2 * Math.sin(col * 0.21 + 1.7);
    return Math.round(Phaser.Math.Clamp(y, 5, ROWS - 2));
  }

  buildMap() {
    const r = rng(SEED);
    this.coast = [];
    for (let c = 0; c < COLS; c++) this.coast[c] = this.coastRow(c);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const sea = this.coast[col];
        const x = col * TILE, y = row * TILE;

        if (row >= sea) {
          // sea
          const deep = row >= sea + 2;
          const spr = this.add.image(x, y, deep ? 'sea0' : 'shal0').setOrigin(0, 0);
          this.tileLayer.add(spr);
          this.seaTiles.push({ spr, c: col, r: row, deep });
          // foam on the first sea row (shoreline)
          if (row === sea) {
            const foam = this.add.image(x, y, 'foam0').setOrigin(0, 0).setDepth(1);
            this.foamLayer.add(foam);
            this.foamTiles.push({ spr: foam, c: col });
          }
        } else if (row >= sea - 2) {
          // beach band
          this.tileLayer.add(this.add.image(x, y, 'sand').setOrigin(0, 0));
        } else {
          // grassland
          this.tileLayer.add(this.add.image(x, y, `grass${(r() * 4) | 0}`).setOrigin(0, 0));
        }
      }
    }

    // land bounds for a tile (true if grass, safe to plant)
    const isLand = (col, row) => row < this.coast[col] - 2;

    const place = (key, count) => {
      let tries = 0, made = 0;
      while (made < count && tries < count * 50) {
        tries++;
        const col = 1 + ((r() * (COLS - 2)) | 0);
        const row = 1 + ((r() * (ROWS - 2)) | 0);
        if (!isLand(col, row)) continue;
        const x = col * TILE + TILE / 2 + (r() - 0.5) * 16;
        const y = row * TILE + TILE - (r() * 6);
        const s = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
        this.decoLayer.add(s);
        made++;
      }
    };

    place('cypress', 11);
    place('olive', 9);
    place('shrub', 8);
    place('rock', 7);

    // flower clusters
    const flowers = ['flower_poppy', 'flower_lav', 'flower_daisy'];
    for (let cl = 0; cl < 14; cl++) {
      const col = 1 + ((r() * (COLS - 2)) | 0);
      const row = 1 + ((r() * (ROWS - 2)) | 0);
      if (!isLand(col, row)) continue;
      const kind = flowers[(r() * flowers.length) | 0];
      const n = 3 + ((r() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const fx = col * TILE + 16 + (r() - 0.5) * 40;
        const fy = row * TILE + 16 + (r() - 0.5) * 40;
        const f = this.add.image(fx, fy, kind).setOrigin(0.5, 1).setDepth(fy);
        this.decoLayer.add(f);
      }
    }
  }

  addVignette() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setScrollFactor(0).setDepth(900);
    for (let i = 0; i < 50; i++) {
      const a = (1 - i / 50) * 0.4;
      g.fillStyle(0x0a1424, a);
      g.fillRect(0, i, width, 1);
      g.fillRect(0, height - 1 - i, width, 1);
    }
  }

  // ── camera ──
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
    this.camX = mw <= width  ? (width - mw) / 2  : Phaser.Math.Clamp(this.camX, width - mw, 0);
    this.camY = mh <= height ? (height - mh) / 2 : Phaser.Math.Clamp(this.camY, height - mh, 0);
    this.apply();
  }

  apply() {
    this.world.setPosition(Math.round(this.camX), Math.round(this.camY));
    this.world.setScale(this.zoom);
  }

  setZoom(z, fx, fy) {
    const { width, height } = this.scale;
    fx = fx ?? width / 2; fy = fy ?? height / 2;
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

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
