import { TILE_SIZE, generateTileTextures, generateUnitTextures } from '../utils/PixelArtGen.js';

const MAP_W = 30;
const MAP_H = 30;

// Tile type constants
const T = { GRASS: 0, DIRT: 1, WATER: 2, STONE: 3, SAND: 4, FOREST: 5 };
const TILE_KEYS = ['grass', 'dirt', 'water', 'stone', 'sand', 'forest'];

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    generateTileTextures(this);
    generateUnitTextures(this);

    this.mapData = generateMap();

    // Root container that we pan/zoom
    this.worldContainer = this.add.container(0, 0);

    this.tileSprites = [];
    for (let y = 0; y < MAP_H; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        const type = this.mapData[y][x];
        const key = `tile_${TILE_KEYS[type]}`;
        const sx = x * TILE_SIZE;
        const sy = y * TILE_SIZE;
        const sprite = this.add.image(sx, sy, key).setOrigin(0, 0);
        this.worldContainer.add(sprite);
        this.tileSprites[y][x] = sprite;
      }
    }

    // Buildings layer
    this.buildingsContainer = this.add.container(0, 0);
    this.worldContainer.add(this.buildingsContainer);
    this.buildings = [];

    // Place a starting house
    this.placeBuilding(5, 5, 'house');
    this.placeBuilding(8, 5, 'market');
    this.placeBuilding(6, 10, 'temple');

    // Citizens
    this.unitsContainer = this.add.container(0, 0);
    this.worldContainer.add(this.unitsContainer);
    this.units = [];
    for (let i = 0; i < 5; i++) {
      this.spawnUnit('citizen', 4 + i * 2, 7);
    }

    // Camera/pan state
    this.camX = 0;
    this.camY = 0;
    this.camZoom = 1;

    // Center map on start
    const { width, height } = this.scale;
    this.camX = width / 2 - (MAP_W * TILE_SIZE) / 2;
    this.camY = height / 2 - (MAP_H * TILE_SIZE) / 2;
    this.updateCamera();

    this.setupInput();
    this.setupUI();

    // Resources
    this.resources = { food: 100, wood: 50, stone: 20, gold: 200, population: 5 };
    this.updateResourceUI();

    // Citizen movement timer
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: this.moveUnits,
      callbackScope: this,
    });

    this.selectedBuildingType = null;
  }

  placeBuilding(tileX, tileY, type) {
    const px = tileX * TILE_SIZE - 8;
    const py = tileY * TILE_SIZE - 24;
    const sprite = this.add.image(px, py, `building_${type}`).setOrigin(0, 0);
    sprite.setInteractive();
    sprite.on('pointerdown', () => this.onBuildingClick(tileX, tileY, type));
    this.buildingsContainer.add(sprite);
    this.buildings.push({ tileX, tileY, type, sprite });
  }

  spawnUnit(type, tileX, tileY) {
    const px = tileX * TILE_SIZE + 8;
    const py = tileY * TILE_SIZE + 8;
    const sprite = this.add.image(px, py, `unit_${type}`).setOrigin(0, 0);
    this.unitsContainer.add(sprite);
    this.units.push({ type, tileX, tileY, sprite, targetX: tileX, targetY: tileY });
  }

  moveUnits() {
    this.units.forEach(unit => {
      // Random walk near current position
      const dx = Phaser.Math.Between(-2, 2);
      const dy = Phaser.Math.Between(-2, 2);
      const nx = Phaser.Math.Clamp(unit.tileX + dx, 0, MAP_W - 1);
      const ny = Phaser.Math.Clamp(unit.tileY + dy, 0, MAP_H - 1);
      const type = this.mapData[ny][nx];
      if (type !== T.WATER && type !== T.FOREST) {
        unit.tileX = nx;
        unit.tileY = ny;
        this.tweens.add({
          targets: unit.sprite,
          x: nx * TILE_SIZE + 8,
          y: ny * TILE_SIZE + 8,
          duration: 800,
          ease: 'Linear',
        });
      }
    });
  }

  setupInput() {
    const { width, height } = this.scale;

    // Touch drag
    this.input.on('pointerdown', (p) => {
      this.dragStart = { x: p.x, y: p.y, camX: this.camX, camY: this.camY };
      this.dragging = false;
    });

    this.input.on('pointermove', (p) => {
      if (!this.dragStart) return;
      const dx = p.x - this.dragStart.x;
      const dy = p.y - this.dragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this.dragging = true;
      if (this.dragging) {
        this.camX = this.dragStart.camX + dx;
        this.camY = this.dragStart.camY + dy;
        this.updateCamera();
      }
    });

    this.input.on('pointerup', (p) => {
      if (!this.dragging && this.selectedBuildingType) {
        // Convert screen pos to tile
        const wx = (p.x - this.camX) / this.camZoom;
        const wy = (p.y - this.camY) / this.camZoom;
        const tx = Math.floor(wx / TILE_SIZE);
        const ty = Math.floor(wy / TILE_SIZE);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H) {
          this.tryBuild(tx, ty, this.selectedBuildingType);
        }
      }
      this.dragStart = null;
      this.dragging = false;
    });

    // Pinch zoom
    this.input.on('wheel', (p, dx, dy, dz) => {
      this.camZoom = Phaser.Math.Clamp(this.camZoom - dy * 0.001, 0.4, 2.5);
      this.updateCamera();
    });

    // Mobile pinch
    this.input.addPointer(1);
    this.prevPinchDist = null;
    this.input.on('pointermove', (p) => {
      const ptrs = this.input.manager.pointers.filter(pt => pt.isDown);
      if (ptrs.length === 2) {
        const dist = Phaser.Math.Distance.Between(ptrs[0].x, ptrs[0].y, ptrs[1].x, ptrs[1].y);
        if (this.prevPinchDist !== null) {
          const delta = dist - this.prevPinchDist;
          this.camZoom = Phaser.Math.Clamp(this.camZoom + delta * 0.005, 0.4, 2.5);
          this.updateCamera();
        }
        this.prevPinchDist = dist;
        this.dragging = true; // cancel tap-to-build during pinch
      } else {
        this.prevPinchDist = null;
      }
    });
  }

  updateCamera() {
    this.worldContainer.setPosition(this.camX, this.camY);
    this.worldContainer.setScale(this.camZoom);
  }

  setupUI() {
    const { width, height } = this.scale;

    // Resource bar background
    this.add.rectangle(0, 0, width, 50, 0x1a0a2e, 0.9).setOrigin(0, 0);
    this.add.rectangle(0, 48, width, 2, 0xffd700, 1).setOrigin(0, 0);

    // Resource texts
    const style = { fontFamily: 'monospace', fontSize: '12px', color: '#ffd700' };
    this.resTexts = {
      food:  this.add.text(8, 8, '🍞 100', style),
      wood:  this.add.text(80, 8, '🪵 50', style),
      stone: this.add.text(148, 8, '🪨 20', style),
      gold:  this.add.text(216, 8, '💰 200', style),
      pop:   this.add.text(width - 70, 8, '👤 5', style),
    };

    // Bottom build bar
    const barY = height - 60;
    this.add.rectangle(0, barY, width, 60, 0x1a0a2e, 0.92).setOrigin(0, 0);
    this.add.rectangle(0, barY, width, 2, 0xffd700, 1).setOrigin(0, 0);

    const btnStyle = { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' };
    const buildButtons = [
      { label: '🏠\nMaison', type: 'house', x: 30 },
      { label: '🏪\nMarché', type: 'market', x: 100 },
      { label: '🏛️\nTemple', type: 'temple', x: 170 },
    ];

    this.buildBtns = [];
    buildButtons.forEach(({ label, type, x }) => {
      const bg = this.add.rectangle(x, barY + 30, 60, 50, 0x2a1a4e, 1).setInteractive();
      const txt = this.add.text(x - 14, barY + 14, label, btnStyle);
      bg.on('pointerdown', () => this.selectBuildMode(type, bg));
      this.buildBtns.push({ bg, type });
    });

    // Info panel (hidden by default)
    this.infoPanel = this.add.container(width / 2, height - 120);
    this.infoPanelBg = this.add.rectangle(0, 0, 200, 50, 0x2a1a4e, 0.95);
    this.infoPanelText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffd700', align: 'center' }).setOrigin(0.5);
    this.infoPanel.add([this.infoPanelBg, this.infoPanelText]);
    this.infoPanel.setVisible(false);
  }

  selectBuildMode(type, btn) {
    if (this.selectedBuildingType === type) {
      this.selectedBuildingType = null;
      this.buildBtns.forEach(b => b.bg.setFillStyle(0x2a1a4e));
      this.infoPanel.setVisible(false);
    } else {
      this.selectedBuildingType = type;
      this.buildBtns.forEach(b => b.bg.setFillStyle(b.type === type ? 0x4a3a8e : 0x2a1a4e));
      this.infoPanelText.setText(`Touche la carte pour\nconstruire : ${type}`);
      this.infoPanel.setVisible(true);
    }
  }

  tryBuild(tx, ty, type) {
    const tileType = this.mapData[ty][tx];
    if (tileType === T.WATER || tileType === T.FOREST) {
      this.showMessage('Impossible de construire ici !');
      return;
    }
    const occupied = this.buildings.some(b => b.tileX === tx && b.tileY === ty);
    if (occupied) { this.showMessage('Emplacement occupé !'); return; }

    const costs = { house: { wood: 20, gold: 30 }, market: { wood: 30, gold: 50 }, temple: { stone: 40, gold: 100 } };
    const cost = costs[type];
    for (const [res, amount] of Object.entries(cost)) {
      if (this.resources[res] < amount) {
        this.showMessage(`Pas assez de ${res} !`);
        return;
      }
    }
    for (const [res, amount] of Object.entries(cost)) {
      this.resources[res] -= amount;
    }
    if (type === 'house') this.resources.population += 5;

    this.placeBuilding(tx, ty, type);
    this.selectedBuildingType = null;
    this.buildBtns.forEach(b => b.bg.setFillStyle(0x2a1a4e));
    this.infoPanel.setVisible(false);
    this.updateResourceUI();
    this.showMessage('Construction réussie !');
  }

  onBuildingClick(tx, ty, type) {
    if (this.dragging) return;
    this.showMessage(`${type} en (${tx},${ty})`);
  }

  showMessage(msg) {
    const { width, height } = this.scale;
    const txt = this.add.text(width / 2, height / 2, msg, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd700',
      backgroundColor: '#1a0a2ecc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5);
    this.tweens.add({
      targets: txt, y: height / 2 - 40, alpha: 0,
      duration: 1800, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  updateResourceUI() {
    const r = this.resources;
    this.resTexts.food.setText(`🍞 ${r.food}`);
    this.resTexts.wood.setText(`🪵 ${r.wood}`);
    this.resTexts.stone.setText(`🪨 ${r.stone}`);
    this.resTexts.gold.setText(`💰 ${r.gold}`);
    this.resTexts.pop.setText(`👤 ${r.population}`);
  }

  update() {}
}

function generateMap() {
  const map = [];
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      // Simple noise-based terrain
      const nx = x / MAP_W;
      const ny = y / MAP_H;
      const dist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
      const noise = simplerNoise(x * 0.3, y * 0.3);

      if (dist > 0.45) {
        map[y][x] = T.WATER;
      } else if (noise > 0.6) {
        map[y][x] = T.FOREST;
      } else if (noise > 0.45) {
        map[y][x] = T.GRASS;
      } else if (noise > 0.3) {
        map[y][x] = T.DIRT;
      } else if (dist > 0.38) {
        map[y][x] = T.SAND;
      } else {
        map[y][x] = T.GRASS;
      }
    }
  }
  // Ensure starting area is clear
  for (let y = 3; y < 14; y++) {
    for (let x = 3; x < 14; x++) {
      if (map[y][x] === T.WATER || map[y][x] === T.FOREST) {
        map[y][x] = T.GRASS;
      }
    }
  }
  return map;
}

function simplerNoise(x, y) {
  const a = Math.sin(x * 1.3 + y * 0.7) * 0.5 + 0.5;
  const b = Math.sin(x * 0.8 - y * 1.1 + 2.3) * 0.5 + 0.5;
  const c = Math.sin(x * 2.1 + y * 1.9 - 1.7) * 0.5 + 0.5;
  return (a + b + c) / 3;
}
