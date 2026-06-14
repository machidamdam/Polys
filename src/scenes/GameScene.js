import { TILE, generateTextures, makeHighlandCliff } from '../utils/PixelArtGen.js?v=19';

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
    this.decoLayer = this.add.container(0, 0);   // mountains/trees/rocks/flowers
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

  // Highland boundary: the elevated north region drops to lowland along this
  // irregular line. Rows ABOVE (smaller) the line are the raised highland.
  highlandEdge(col) {
    const base = ROWS * 0.34;
    const wob = 2.4 * Math.sin(col * 0.32 + 0.6) + 1.4 * Math.sin(col * 0.17 + 2.1);
    // the highland reaches further south on the left, receding on the right
    const tilt = -2.5 * Math.cos(col / COLS * Math.PI);
    return Math.round(Phaser.Math.Clamp(base + wob + tilt, 4, ROWS * 0.5));
  }

  buildMap() {
    const r = rng(SEED);
    this.water = [];
    for (let c = 0; c < COLS; c++) this.water[c] = this.waterLevel(c);

    // ── HIGHLAND — a large elevated region across the north of the island ──
    this.edge = [];
    for (let c = 0; c < COLS; c++) this.edge[c] = this.highlandEdge(c);
    // 3 ramps cut through the cliff (the only walkable ways up), 2 tiles wide
    const rampCenters = [Math.round(COLS * 0.18), Math.round(COLS * 0.50), Math.round(COLS * 0.80)];
    this.rampCols = [];
    for (let c = 0; c < COLS; c++)
      this.rampCols[c] = rampCenters.some(rc => Math.abs(c - rc) <= 1);
    const onCliff = (col, row) => Math.abs(row - this.edge[col]) <= 1;

    // marble deposit: a flat whitish-grey rock patch in the grassland (Zeus)
    const marble = { c: COLS * 0.30, r: ROWS * 0.64, rad: 3.4 };
    const inMarble = (col, row) =>
      Phaser.Math.Distance.Between(col, row, marble.c, marble.r) < marble.rad;

    // ── ground tiles (grass / sand / sea / flat marble) ──
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
        } else if (inMarble(col, row)) {
          this.tileLayer.add(this.add.image(x, y, `marble${(col + row) % 2}`).setOrigin(0, 0));
        } else {
          this.tileLayer.add(this.add.image(x, y, `grass${(r() * 4) | 0}`).setOrigin(0, 0));
        }
      }
    }

    // ── HIGHLAND CLIFF — one big sprite separating raised north from lowland ──
    const geo = makeHighlandCliff(this, 'highland', this.edge, this.rampCols, SEED + 777);
    const cliff = this.add.image(0, geo.top, 'highland').setOrigin(0, 0);
    cliff.setDepth(geo.baseDepth);   // lowland trees south of it overlap in front
    this.decoLayer.add(cliff);

    const isLand = (col, row) =>
      col >= 0 && col < COLS && row >= 1 && row < this.water[col] - 2 &&
      !onCliff(col, row) && !inMarble(col, row);

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
        const dist = rad * Math.sqrt(r());
        const col = Math.round(cc + Math.cos(ang) * dist);
        const row = Math.round(cr + Math.sin(ang) * dist);
        if (!isLand(col, row)) continue;
        addDeco(keys[(r() * keys.length) | 0], col, row);
        made++;
      }
    };

    // ── ZONES ──
    // Forests → timber: one big one in the lowland plains, one up on the highland.
    cluster(['cypress', 'olive', 'olive', 'cypress', 'shrub'], COLS * 0.20, ROWS * 0.56, 6, 54);
    cluster(['olive', 'cypress', 'cypress', 'olive', 'shrub'], COLS * 0.78, ROWS * 0.66, 5, 40);
    cluster(['cypress', 'olive', 'cypress', 'shrub'],          COLS * 0.62, ROWS * 0.16, 5, 30);

    // loose boulders / scree spilling from the cliff base into the lowland
    for (let c = 4; c < COLS - 4; c += 7) {
      if (this.rampCols[c]) continue;
      cluster(['rock', 'shrub'], c, this.edge[c] + 2.5, 2.5, 4);
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

    // paint back-to-front: sort all decorations by depth (y)
    this.decoLayer.sort('depth');
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
