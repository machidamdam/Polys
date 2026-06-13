export const TILE = 32;

// Stardew-inspired warm palette
const C = {
  grassBase:   '#5d9e4a',
  grassLight:  '#6db85a',
  grassDark:   '#4a8038',
  grassShadow: '#3d6b30',
  roadBase:    '#b89460',
  roadLight:   '#ccaa72',
  roadDark:    '#9a7844',
  roadLine:    '#8a6c38',
  houseWall:   '#e8d5a8',
  houseWallDk: '#c4b080',
  houseRoof:   '#c04a2e',
  houseRoofDk: '#922e18',
  houseDoor:   '#7a4a20',
  houseWin:    '#a8d0e8',
  houseWinFr:  '#6a9ab8',
  outline:     '#2a1a0e',
};

export function generateTextures(scene) {
  makeTile(scene, 'grass', drawGrass);
  makeTile(scene, 'road_h', ctx => drawRoad(ctx, 'h'));
  makeTile(scene, 'road_v', ctx => drawRoad(ctx, 'v'));
  makeTile(scene, 'road_c', ctx => drawRoad(ctx, 'c'));
  makeSprite(scene, 'house', 32, 40, drawHouse);
  makeSprite(scene, 'cursor', 32, 32, drawCursor);
}

function makeTile(scene, key, fn) {
  const tex = scene.textures.createCanvas(key, TILE, TILE);
  fn(tex.getContext());
  tex.refresh();
}

function makeSprite(scene, key, w, h, fn) {
  const tex = scene.textures.createCanvas(key, w, h);
  fn(tex.getContext(), w, h);
  tex.refresh();
}

function drawGrass(ctx) {
  // Base
  fill(ctx, 0, 0, TILE, TILE, C.grassBase);

  // Subtle pixel variation
  const pts = [
    [2,3],[7,1],[14,5],[20,2],[27,4],[4,10],[11,8],[18,11],[25,9],[30,6],
    [3,16],[9,14],[16,18],[23,15],[29,17],[5,23],[12,21],[19,25],[26,22],[31,20],
    [1,28],[8,27],[15,30],[22,28],[28,26],
  ];
  pts.forEach(([x,y]) => {
    fill(ctx, x, y, 2, 2, Math.random() > 0.5 ? C.grassLight : C.grassDark);
  });

  // Tiny grass blades
  [[5,6],[13,19],[22,8],[28,24],[8,27],[19,13]].forEach(([x,y]) => {
    fill(ctx, x,   y,   1, 3, C.grassDark);
    fill(ctx, x+1, y+1, 1, 2, C.grassLight);
  });
}

function drawRoad(ctx, dir) {
  fill(ctx, 0, 0, TILE, TILE, C.roadBase);

  // Texture dots
  [[3,3],[10,6],[18,2],[25,5],[6,14],[14,11],[22,15],[29,12],
   [2,22],[9,19],[17,23],[24,20],[7,28],[15,26],[23,29],[30,25]].forEach(([x,y]) => {
    fill(ctx, x, y, 2, 1, C.roadLight);
    fill(ctx, x+1, y+1, 1, 1, C.roadDark);
  });

  // Edge lines
  if (dir === 'h' || dir === 'c') {
    fill(ctx, 0, 0, TILE, 2, C.roadDark);
    fill(ctx, 0, TILE-2, TILE, 2, C.roadDark);
    // Center dashes
    for (let x = 4; x < TILE; x += 8) fill(ctx, x, 15, 4, 2, C.roadLight);
  }
  if (dir === 'v' || dir === 'c') {
    fill(ctx, 0, 0, 2, TILE, C.roadDark);
    fill(ctx, TILE-2, 0, 2, TILE, C.roadDark);
    // Center dashes
    for (let y = 4; y < TILE; y += 8) fill(ctx, 15, y, 2, 4, C.roadLight);
  }
}

function drawHouse(ctx, w, h) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(4, 34, 24, 6);

  // Wall
  fill(ctx, 4, 18, 24, 18, C.houseWall);
  fill(ctx, 4, 30, 24, 2, C.houseWallDk); // base shadow

  // Roof (triangle-ish)
  fill(ctx, 2, 10, 28, 10, C.houseRoof);
  fill(ctx, 4,  6, 24,  6, C.houseRoof);
  fill(ctx, 8,  2, 16,  6, C.houseRoofDk);
  fill(ctx, 2, 18,  2,  2, C.houseRoofDk); // left edge
  fill(ctx,28, 18,  2,  2, C.houseRoofDk); // right edge

  // Outline top
  fill(ctx, 0,  8,  2,  12, C.outline);
  fill(ctx,30,  8,  2,  12, C.outline);

  // Door
  fill(ctx, 13, 26, 8, 10, C.houseDoor);
  fill(ctx, 14, 27, 2,  4, '#a06030'); // highlight

  // Windows
  fill(ctx,  6, 22, 8, 6, C.houseWin);
  fill(ctx, 20, 22, 8, 6, C.houseWin);
  // Window frames
  fill(ctx,  6, 22, 8, 1, C.houseWinFr);
  fill(ctx,  6, 22, 1, 6, C.houseWinFr);
  fill(ctx, 20, 22, 8, 1, C.houseWinFr);
  fill(ctx, 20, 22, 1, 6, C.houseWinFr);

  // Chimney
  fill(ctx, 22, 0, 5, 8, C.houseWallDk);
  fill(ctx, 22, 0, 5, 2, '#555');
}

function drawCursor(ctx) {
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(2, 2, TILE - 4, TILE - 4);
}

function fill(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
