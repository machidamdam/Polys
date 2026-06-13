// Generates pixel art tiles as base64 textures at runtime
export const TILE_SIZE = 32;

const PALETTES = {
  grass:  ['#4a7c3f', '#5a9147', '#3d6b34', '#6aab55', '#4a7c3f'],
  dirt:   ['#8b6340', '#9e7350', '#7a5535', '#a67c55', '#8b6340'],
  water:  ['#2a6ca8', '#3480c0', '#1e5a90', '#4a90d0', '#2a6ca8'],
  stone:  ['#888888', '#999999', '#777777', '#aaaaaa', '#888888'],
  sand:   ['#c8a850', '#d4b860', '#b89840', '#dccc70', '#c8a850'],
  forest: ['#2d5a1e', '#3a7028', '#254d18', '#4a8830', '#2d5a1e'],
};

export function generateTileTextures(scene) {
  const types = ['grass', 'dirt', 'water', 'stone', 'sand', 'forest'];
  types.forEach(type => {
    const tex = scene.textures.createCanvas(`tile_${type}`, TILE_SIZE, TILE_SIZE);
    const ctx = tex.getContext();
    drawPixelTile(ctx, type, TILE_SIZE);
    tex.refresh();
  });
}

function drawPixelTile(ctx, type, size) {
  const pal = PALETTES[type] || PALETTES.grass;

  // Base fill
  ctx.fillStyle = pal[0];
  ctx.fillRect(0, 0, size, size);

  // Pixel noise for texture
  const rng = seededRand(type.charCodeAt(0) * 137);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const c = pal[Math.floor(rng() * pal.length)];
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 2, 2);
  }

  // Border shadow (top-left highlight, bottom-right shadow)
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 0, size, 1);
  ctx.fillRect(0, 0, 1, size);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, size - 1, size, 1);
  ctx.fillRect(size - 1, 0, 1, size);

  // Special decorations
  if (type === 'grass') {
    // Small grass blades
    ctx.fillStyle = '#6aab55';
    [[5,8],[12,20],[22,12],[28,25]] .forEach(([x,y]) => {
      ctx.fillRect(x, y - 4, 1, 4);
      ctx.fillRect(x + 1, y - 3, 1, 3);
    });
  }
  if (type === 'water') {
    // Wave lines
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    [8, 20].forEach(y => {
      for (let x = 2; x < size - 2; x += 4) {
        ctx.fillRect(x, y, 2, 1);
      }
    });
  }
  if (type === 'forest') {
    // Tree silhouette
    ctx.fillStyle = '#1a3d0e';
    ctx.fillRect(12, 6, 8, 8);
    ctx.fillRect(10, 12, 12, 6);
    ctx.fillRect(14, 18, 4, 8);
  }
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateUnitTextures(scene) {
  generateCitizen(scene);
  generateWorker(scene);
  generateSoldier(scene);
  generateBuilding(scene, 'house', '#c47c3a', '#8b5e2a');
  generateBuilding(scene, 'market', '#c4a03a', '#8b722a');
  generateBuilding(scene, 'temple', '#e8e0c8', '#b8b098');
}

function generateCitizen(scene) {
  const s = 16;
  const tex = scene.textures.createCanvas('unit_citizen', s, s);
  const ctx = tex.getContext();
  // Body (white robe)
  ctx.fillStyle = '#f0ead8';
  ctx.fillRect(5, 8, 6, 7);
  // Head
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(6, 4, 4, 4);
  // Hair
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(6, 4, 4, 2);
  // Belt
  ctx.fillStyle = '#8b6340';
  ctx.fillRect(5, 12, 6, 1);
  tex.refresh();
}

function generateWorker(scene) {
  const s = 16;
  const tex = scene.textures.createCanvas('unit_worker', s, s);
  const ctx = tex.getContext();
  ctx.fillStyle = '#8b6340';
  ctx.fillRect(5, 8, 6, 7);
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(6, 4, 4, 4);
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(6, 4, 4, 2);
  // Tool (pickaxe)
  ctx.fillStyle = '#888888';
  ctx.fillRect(11, 7, 2, 1);
  ctx.fillRect(12, 7, 1, 4);
  tex.refresh();
}

function generateSoldier(scene) {
  const s = 16;
  const tex = scene.textures.createCanvas('unit_soldier', s, s);
  const ctx = tex.getContext();
  ctx.fillStyle = '#c04020';
  ctx.fillRect(5, 8, 6, 7);
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(6, 4, 4, 4);
  // Helmet
  ctx.fillStyle = '#888888';
  ctx.fillRect(5, 2, 6, 4);
  ctx.fillStyle = '#cc2020';
  ctx.fillRect(7, 1, 2, 2);
  // Shield
  ctx.fillStyle = '#7070e0';
  ctx.fillRect(3, 9, 3, 5);
  ctx.fillStyle = '#4040b0';
  ctx.fillRect(4, 10, 1, 3);
  tex.refresh();
}

function generateBuilding(scene, name, wallColor, roofColor) {
  const s = 48;
  const tex = scene.textures.createCanvas(`building_${name}`, s, s);
  const ctx = tex.getContext();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(6, 38, 40, 8);

  // Walls
  ctx.fillStyle = wallColor;
  ctx.fillRect(8, 22, 32, 20);

  // Roof
  ctx.fillStyle = roofColor;
  ctx.fillRect(4, 14, 40, 10);
  // Roof peak
  ctx.fillStyle = roofColor;
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(24 - i, 14 - i * 0.3 | 0, i * 2, 1);
  }

  // Door
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(20, 32, 8, 10);

  // Window
  ctx.fillStyle = '#a8d0e8';
  ctx.fillRect(10, 26, 8, 6);
  ctx.fillRect(30, 26, 8, 6);

  tex.refresh();
}
