import { TILE, generateTextures } from '../utils/PixelArtGen.js';

const COLS = 20;
const ROWS = 20;

const EMPTY = 0;
const ROAD  = 1;
const HOUSE = 2;

const COSTS = {
  road:  { wood: 2,  gold: 0 },
  house: { wood: 10, gold: 20 },
};

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    generateTextures(this);

    this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(EMPTY));

    // Camera state
    this.camX = 0;
    this.camY = 0;
    this.zoom  = 1;

    // Containers (world-space)
    this.world = this.add.container(0, 0);
    this.tileLayer     = this.add.container(0, 0);
    this.buildingLayer = this.add.container(0, 0);
    this.cursorLayer   = this.add.container(0, 0);
    this.world.add([this.tileLayer, this.buildingLayer, this.cursorLayer]);

    this.drawAllTiles();

    // Cursor sprite
    this.cursorSprite = this.add.image(0, 0, 'cursor').setOrigin(0, 0).setVisible(false);
    this.cursorLayer.add(this.cursorSprite);

    // Resources
    this.res = { wood: 80, gold: 100, pop: 0, houses: 0 };

    this.mode = null; // 'road' | 'house' | null

    this.setupInput();
    this.setupUI();
    this.centerCamera();
    this.updateUI();
  }

  // ─── MAP ──────────────────────────────────────────────────────────────────

  drawAllTiles() {
    this.tileLayer.removeAll(true);
    this.buildingLayer.removeAll(true);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = this.grid[r][c];
        const x = c * TILE;
        const y = r * TILE;

        if (val === ROAD) {
          const key = this.roadKey(c, r);
          this.tileLayer.add(this.add.image(x, y, key).setOrigin(0, 0));
        } else {
          this.tileLayer.add(this.add.image(x, y, 'grass').setOrigin(0, 0));
        }

        if (val === HOUSE) {
          const sprite = this.add.image(x, y - 8, 'house').setOrigin(0, 0);
          this.buildingLayer.add(sprite);
        }
      }
    }
  }

  roadKey(c, r) {
    const h = (c > 0 && this.grid[r][c-1] === ROAD) || (c < COLS-1 && this.grid[r][c+1] === ROAD);
    const v = (r > 0 && this.grid[r-1][c] === ROAD) || (r < ROWS-1 && this.grid[r+1][c] === ROAD);
    if (h && v) return 'road_c';
    if (v)      return 'road_v';
    return 'road_h';
  }

  // ─── CAMERA ───────────────────────────────────────────────────────────────

  centerCamera() {
    const { width, height } = this.scale;
    const mapW = COLS * TILE * this.zoom;
    const mapH = ROWS * TILE * this.zoom;
    this.camX = (width  - mapW) / 2;
    this.camY = (height - mapH) / 2 + 20;
    this.applyCamera();
  }

  applyCamera() {
    this.world.setPosition(this.camX, this.camY);
    this.world.setScale(this.zoom);
  }

  screenToTile(sx, sy) {
    const wx = (sx - this.camX) / this.zoom;
    const wy = (sy - this.camY) / this.zoom;
    return { c: Math.floor(wx / TILE), r: Math.floor(wy / TILE) };
  }

  // ─── INPUT ────────────────────────────────────────────────────────────────

  setupInput() {
    let dragStart = null;
    let moved = false;
    this.prevPinch = null;

    this.input.on('pointerdown', p => {
      dragStart = { px: p.x, py: p.y, cx: this.camX, cy: this.camY };
      moved = false;
    });

    this.input.on('pointermove', p => {
      // Pinch zoom (2 fingers)
      const ptrs = this.input.manager.pointers.filter(pt => pt.isDown);
      if (ptrs.length === 2) {
        const d = Phaser.Math.Distance.Between(ptrs[0].x, ptrs[0].y, ptrs[1].x, ptrs[1].y);
        if (this.prevPinch !== null) {
          this.zoom = Phaser.Math.Clamp(this.zoom + (d - this.prevPinch) * 0.006, 0.5, 3);
          this.applyCamera();
        }
        this.prevPinch = d;
        moved = true;
        return;
      }
      this.prevPinch = null;

      if (!dragStart) return;
      const dx = p.x - dragStart.px;
      const dy = p.y - dragStart.py;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      if (moved) {
        this.camX = dragStart.cx + dx;
        this.camY = dragStart.cy + dy;
        this.applyCamera();
      }

      // Move cursor
      if (this.mode) {
        const { c, r } = this.screenToTile(p.x, p.y);
        if (this.inBounds(c, r)) {
          this.cursorSprite.setPosition(c * TILE, r * TILE).setVisible(true);
        }
      }
    });

    this.input.on('pointerup', p => {
      if (!moved && this.mode) {
        const { c, r } = this.screenToTile(p.x, p.y);
        this.tryPlace(c, r);
      }
      dragStart = null;
    });

    // Wheel zoom (desktop / trackpad)
    this.input.on('wheel', (_, __, ___, dy) => {
      this.zoom = Phaser.Math.Clamp(this.zoom - dy * 0.001, 0.5, 3);
      this.applyCamera();
    });

    this.input.addPointer(1);
  }

  // ─── BUILD ────────────────────────────────────────────────────────────────

  tryPlace(c, r) {
    if (!this.inBounds(c, r)) return;
    if (this.grid[r][c] !== EMPTY) {
      this.toast('Emplacement déjà occupé !');
      return;
    }

    const cost = COSTS[this.mode];
    if (this.res.wood < cost.wood || this.res.gold < cost.gold) {
      this.toast('Ressources insuffisantes !');
      return;
    }

    this.res.wood -= cost.wood;
    this.res.gold -= cost.gold;

    if (this.mode === 'road') {
      this.grid[r][c] = ROAD;
    } else if (this.mode === 'house') {
      this.grid[r][c] = HOUSE;
      this.res.pop  += 5;
      this.res.houses += 1;
    }

    this.drawAllTiles();
    this.updateUI();
  }

  inBounds(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS;
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  setupUI() {
    const { width, height } = this.scale;

    // ── Top bar ──
    this.add.rectangle(0, 0, width, 44, 0x1a0a2e).setOrigin(0, 0);
    this.add.rectangle(0, 44, width, 2, 0xffd700).setOrigin(0, 0);

    const ts = { fontFamily: 'monospace', fontSize: '13px', color: '#ffd700' };
    this.txtWood = this.add.text(10,  14, '', ts);
    this.txtGold = this.add.text(110, 14, '', ts);
    this.txtPop  = this.add.text(210, 14, '', ts);

    // ── Bottom bar ──
    const bh = 70;
    const by = height - bh;
    this.add.rectangle(0, by, width, bh, 0x1a0a2e).setOrigin(0, 0);
    this.add.rectangle(0, by, width, 2, 0xffd700).setOrigin(0, 0);

    this.btnRoad  = this.makeBtn(width / 2 - 70, by + 10, '🛤️  Route\n(-2 bois)', 'road');
    this.btnHouse = this.makeBtn(width / 2 + 70, by + 10, '🏠 Maison\n(-10🪵 -20💰)', 'house');

    // Cancel button (top-right)
    this.btnCancel = this.add.text(width - 10, 14, '✕', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff6060',
    }).setOrigin(1, 0.5).setInteractive().setVisible(false);
    this.btnCancel.on('pointerdown', () => this.setMode(null));
  }

  makeBtn(cx, y, label, mode) {
    const bg = this.add.rectangle(cx, y + 25, 120, 50, 0x2a1a4e).setInteractive();
    const txt = this.add.text(cx, y + 25, label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    bg.on('pointerdown', () => this.setMode(mode));
    return { bg, txt };
  }

  setMode(m) {
    this.mode = m;
    const active = 0x4a3a8e;
    const idle   = 0x2a1a4e;
    this.btnRoad.bg.setFillStyle( m === 'road'  ? active : idle);
    this.btnHouse.bg.setFillStyle(m === 'house' ? active : idle);
    this.cursorSprite.setVisible(false);
    this.btnCancel.setVisible(m !== null);
    if (!m) this.cursorSprite.setVisible(false);
  }

  updateUI() {
    const r = this.res;
    this.txtWood.setText(`🪵 ${r.wood}`);
    this.txtGold.setText(`💰 ${r.gold}`);
    this.txtPop.setText(`👤 ${r.pop}`);
  }

  toast(msg) {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height / 2 - 60, msg, {
      fontFamily: 'monospace', fontSize: '14px', color: '#fff',
      backgroundColor: '#1a0a2eee', padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }

  update() {}
}
