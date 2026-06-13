import { TILE, generateTextures } from '../utils/PixelArtGen.js?v=14';

const COLS = 36;
const ROWS = 52;
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
    // *1.06 leaves a little overflow on BOTH axes at min zoom, so you can
    // always pan in every direction while the map still fills the screen.
    this.minZoom = Math.max(width / MAP_W, height / MAP_H) * 1.06;
    this.maxZoom = 4;
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

  // Shoreline: lots of land to the north, sea at the south, curving into a bay.
  waterLevel(col) {
    const base = ROWS * 0.82;
    // bay: water reaches higher into the land around 70% across
    const bay = 9 * Math.exp(-Math.pow((col - COLS * 0.70) / (COLS * 0.16), 2));
    const wob = 1.4 * Math.sin(col * 0.5) + 0.8 * Math.sin(col * 0.27 + 1.1);
    return Math.round(Phaser.Math.Clamp(base - bay + wob, 6, ROWS - 1));
  }

  buildMap() {
    const r = rng(SEED);
    this.water = [];
    for (let c = 0; c < COLS; c++) this.water[c] = this.waterLevel(c);

    // ── ELEVATION (relief like Zeus) ──
    // Raised plateaus; cliffs are drawn on their downhill (south) edges.
    const hills = [
      { c: COLS * 0.48, r: ROWS * 0.28, rad: 6.5, marble: true },  // marble hill
      { c: COLS * 0.22, r: ROWS * 0.18, rad: 5.0, marble: false }, // forested hill
      { c: COLS * 0.74, r: ROWS * 0.70, rad: 5.0, marble: false }, // southern hill
    ];
    const isHigh = (col, row) =>
      hills.some(h => Phaser.Math.Distance.Between(col, row, h.c, h.r) < h.rad);

    // marble quarry sits on the marble hill (exposed bedrock + marble outcrops)
    const quarry = { c: COLS * 0.48, r: ROWS * 0.28, rad: 4.0 };
    const inQuarry = (col, row) =>
      Phaser.Math.Distance.Between(col, row, quarry.c, quarry.r) < quarry.rad;

    // ── ground tiles ──
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const sea = this.water[col];
        const x = col * TILE, y = row * TILE;

        if (row >= sea) {
          const deep = row >= sea + 3;
          const spr = this.add.image(x, y, deep ? 'sea0' : 'shal0').setOrigin(0, 0);
          this.tileLayer.add(spr);
          this.seaTiles.push({ spr, c: col, r: row, deep });
          if (row === sea) {
            const foam = this.add.image(x, y, 'foam0').setOrigin(0, 0).setDepth(1);
            this.foamLayer.add(foam);
            this.foamTiles.push({ spr: foam, c: col });
          }
        } else if (row >= sea - 2) {
          this.tileLayer.add(this.add.image(x, y, 'sand').setOrigin(0, 0));
        } else if (inQuarry(col, row)) {
          this.tileLayer.add(this.add.image(x, y, 'quarry').setOrigin(0, 0));
        } else if (isHigh(col, row)) {
          this.tileLayer.add(this.add.image(x, y, 'grass_high').setOrigin(0, 0));
        } else {
          this.tileLayer.add(this.add.image(x, y, `grass${(r() * 4) | 0}`).setOrigin(0, 0));
        }
      }
    }

    // ── cliffs: draw a rock wall wherever a plateau steps down to lowland ──
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!isHigh(col, row)) continue;
        const belowRow = row + 1;
        const belowIsLowland =
          belowRow < this.water[col] - 2 && !isHigh(col, belowRow);
        if (!belowIsLowland) continue;
        const key = inQuarry(col, row) ? 'cliff_marble' : 'cliff';
        const cliff = this.add.image(col * TILE, row * TILE + TILE - 6, key)
          .setOrigin(0, 0)
          .setDepth((row + 1) * TILE - 2);
        this.decoLayer.add(cliff);
      }
    }

    const isLand = (col, row) =>
      col >= 0 && col < COLS && row >= 1 &&
      row < this.water[col] - 2 && !inQuarry(col, row);

    const addDeco = (key, col, row) => {
      const x = col * TILE + TILE / 2 + (r() - 0.5) * 18;
      const y = row * TILE + TILE - (r() * 6);
      const s = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
      this.decoLayer.add(s);
    };

    // place `count` items in a soft disk around (cc,cr)
    const cluster = (keys, cc, cr, rad, count) => {
      let made = 0, tries = 0;
      while (made < count && tries < count * 8) {
        tries++;
        const ang = r() * Math.PI * 2;
        const dist = rad * Math.sqrt(r());           // uniform within disk
        const col = Math.round(cc + Math.cos(ang) * dist);
        const row = Math.round(cr + Math.sin(ang) * dist);
        if (!isLand(col, row)) continue;
        addDeco(keys[(r() * keys.length) | 0], col, row);
        made++;
      }
    };

    // ── ZONES (Zeus-like layout) ──
    // TWO dense forests → timber. High count + small radius = packed woods.
    cluster(['cypress', 'olive', 'olive', 'cypress', 'shrub'], COLS * 0.20, ROWS * 0.16, 6, 55);
    cluster(['olive', 'cypress', 'cypress', 'olive', 'shrub'], COLS * 0.74, ROWS * 0.74, 6, 50);

    // Rocky hills → stone.
    cluster(['rock', 'rock', 'shrub'],              COLS * 0.70, ROWS * 0.24, 4, 16);
    cluster(['rock', 'shrub'],                      COLS * 0.28, ROWS * 0.40, 4, 13);

    // Marble quarry → marble outcrops on the exposed bedrock of the marble hill.
    for (let i = 0; i < 9; i++) {
      const ang = r() * Math.PI * 2;
      const dist = quarry.rad * 0.85 * Math.sqrt(r());
      const col = Math.round(quarry.c + Math.cos(ang) * dist);
      const row = Math.round(quarry.r + Math.sin(ang) * dist);
      const x = col * TILE + TILE / 2 + (r() - 0.5) * 14;
      const y = row * TILE + TILE - (r() * 6);
      const s = this.add.image(x, y, r() > 0.4 ? 'marble' : 'rock').setOrigin(0.5, 1).setDepth(y);
      this.decoLayer.add(s);
    }

    // ── meadow flowers across the open plains ──
    const flowers = ['flower_poppy', 'flower_lav', 'flower_daisy'];
    for (let cl = 0; cl < 30; cl++) {
      const col = 2 + ((r() * (COLS - 4)) | 0);
      const row = 2 + ((r() * (ROWS - 4)) | 0);
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
    this.camX = (width - mw) / 2;        // centre horizontally
    this.camY = height - mh;             // start at the south (sea), drag up for land
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
