export const TILE = 32;

// ── Cohesive warm Stardew-ish palette ──────────────────────────────────────
const P = {
  grass:   ['#7cb342', '#82bd47', '#6fa838', '#88c44e'],
  grassHi: '#9bd45f',
  grassLo: '#5e9130',
  grassDk: '#4d7a28',

  trunk:   '#6b4326',
  trunkDk: '#54341d',
  leaf:    '#3f8c3a',
  leafHi:  '#5bb04f',
  leafLo:  '#2e6b2c',

  water:   '#4aa3d4',
  waterHi: '#74c2e8',
  waterLo: '#327fb0',
  sand:    '#e0cf94',
  sandDk:  '#c4ad6e',

  rock:    '#9a9a9a',
  rockHi:  '#bcbcbc',
  rockLo:  '#6e6e6e',

  bush:    '#4f9e42',
  bushHi:  '#6dbb58',
  bushLo:  '#3a7a30',

  out:     '#2c3a1a',
};

export function generateTextures(scene) {
  for (let i = 0; i < 4; i++) makeGrass(scene, `grass${i}`, i);
  makeTree(scene, 'tree0', 0);
  makeTree(scene, 'tree1', 1);
  makeBush(scene);
  makeRock(scene);
  makeFlower(scene, 'flower_r', '#e8556d', '#ff8095');
  makeFlower(scene, 'flower_y', '#f2c14e', '#ffe08a');
  makeFlower(scene, 'flower_w', '#f4f4f4', '#ffffff');
  makeFlower(scene, 'flower_p', '#a667d4', '#c79bee');
  makePond(scene, 'pond_a', 0);
  makePond(scene, 'pond_b', 1);
}

// ── helpers ─────────────────────────────────────────────────────────────────
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function canvas(scene, key, w, h) {
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ── grass tile (4 subtle variants so tiling looks natural) ──────────────────
function makeGrass(scene, key, variant) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const r = rng(1000 + variant * 77);

  // base — gentle horizontal banding for soft texture
  for (let y = 0; y < TILE; y++) {
    const band = P.grass[(y >> 3) % P.grass.length];
    px(ctx, 0, y, TILE, 1, band);
  }

  // scattered light & dark specks
  for (let i = 0; i < 18; i++) {
    const x = (r() * TILE) | 0, y = (r() * TILE) | 0;
    px(ctx, x, y, 1, 1, r() > 0.5 ? P.grassHi : P.grassLo);
  }

  // a few tiny grass blades
  const blades = 3 + ((r() * 3) | 0);
  for (let i = 0; i < blades; i++) {
    const x = 3 + ((r() * (TILE - 6)) | 0);
    const y = 6 + ((r() * (TILE - 10)) | 0);
    px(ctx, x, y, 1, 3, P.grassLo);
    px(ctx, x + 1, y + 1, 1, 2, P.grassHi);
  }
  tex.refresh();
}

// ── tree (chunky round canopy + trunk, bottom-anchored) ─────────────────────
function makeTree(scene, key, variant) {
  const W = 48, H = 64;
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2;

  // shadow
  px(ctx, 10, H - 6, W - 20, 4, 'rgba(0,0,0,0.18)');

  // trunk
  px(ctx, cx - 4, H - 22, 8, 18, P.trunk);
  px(ctx, cx - 4, H - 22, 2, 18, P.trunkDk);

  // canopy — stacked blocks forming a round bushy shape
  const canopy = variant === 0
    ? [[14,4,20,10],[8,12,32,12],[6,22,36,12],[10,34,28,8]]
    : [[16,2,16,10],[10,10,28,12],[8,20,32,12],[12,32,24,8]];

  // base leaf
  canopy.forEach(([x, y, w, h]) => px(ctx, x, y, w, h, P.leaf));
  // dark underside
  canopy.forEach(([x, y, w, h]) => px(ctx, x, y + h - 3, w, 3, P.leafLo));
  // highlights top-left
  canopy.forEach(([x, y, w]) => px(ctx, x + 2, y + 1, (w / 2) | 0, 2, P.leafHi));
  // a couple of leaf clusters
  const r = rng(variant * 999 + 5);
  for (let i = 0; i < 6; i++) {
    const x = 12 + ((r() * 24) | 0), y = 8 + ((r() * 26) | 0);
    px(ctx, x, y, 3, 3, r() > 0.5 ? P.leafHi : P.leafLo);
  }
  tex.refresh();
}

// ── bush ────────────────────────────────────────────────────────────────────
function makeBush(scene) {
  const W = 32, H = 28;
  const { tex, ctx } = canvas(scene, 'bush', W, H);
  px(ctx, 5, H - 5, W - 10, 3, 'rgba(0,0,0,0.15)');
  const blob = [[8,6,16,8],[4,12,24,10],[8,20,16,5]];
  blob.forEach(([x, y, w, h]) => px(ctx, x, y, w, h, P.bush));
  blob.forEach(([x, y, w, h]) => px(ctx, x, y + h - 2, w, 2, P.bushLo));
  px(ctx, 7, 8, 8, 2, P.bushHi);
  px(ctx, 6, 14, 10, 2, P.bushHi);
  // berries
  px(ctx, 12, 13, 2, 2, '#e8556d');
  px(ctx, 18, 16, 2, 2, '#e8556d');
  tex.refresh();
}

// ── rock ──────────────────────────────────────────────────────────────────
function makeRock(scene) {
  const W = 28, H = 22;
  const { tex, ctx } = canvas(scene, 'rock', W, H);
  px(ctx, 4, H - 4, W - 8, 3, 'rgba(0,0,0,0.15)');
  const blob = [[8,4,12,6],[4,10,20,8],[6,16,16,4]];
  blob.forEach(([x, y, w, h]) => px(ctx, x, y, w, h, P.rock));
  blob.forEach(([x, y, w, h]) => px(ctx, x, y + h - 2, w, 2, P.rockLo));
  px(ctx, 9, 5, 6, 2, P.rockHi);
  px(ctx, 6, 11, 8, 2, P.rockHi);
  tex.refresh();
}

// ── flower (tiny, sits on grass) ────────────────────────────────────────────
function makeFlower(scene, key, color, hi) {
  const S = 12;
  const { tex, ctx } = canvas(scene, key, S, S);
  // stem
  px(ctx, 5, 7, 1, 4, P.grassLo);
  // petals (plus shape)
  px(ctx, 4, 4, 4, 4, color);
  px(ctx, 5, 3, 2, 6, color);
  px(ctx, 3, 5, 6, 2, color);
  // highlight + center
  px(ctx, 5, 4, 1, 1, hi);
  px(ctx, 5, 5, 2, 2, '#f9e26a');
  tex.refresh();
}

// ── pond (organic blob, two shimmer frames) ─────────────────────────────────
function makePond(scene, key, frame) {
  const W = 192, H = 144, PXS = 2;
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2, cy = H / 2;
  const rx = 78, ry = 56;

  for (let py = 0; py < H; py += PXS) {
    for (let pxx = 0; pxx < W; pxx += PXS) {
      const nx = (pxx - cx) / rx;
      const ny = (py - cy) / ry;
      const ang = Math.atan2(ny, nx);
      // organic wobble on the edge
      const wob = 0.10 * Math.sin(ang * 3) + 0.06 * Math.sin(ang * 5 + 1.3);
      const d = Math.sqrt(nx * nx + ny * ny) / (1 + wob);

      let c = null;
      if (d < 0.62) {
        c = P.water;
        // shimmer ripples
        const rip = Math.sin((pxx * 0.18) + (py * 0.12) + frame * 1.7);
        if (rip > 0.75) c = P.waterHi;
      } else if (d < 0.92) {
        c = P.waterLo;
        const rip = Math.sin((pxx * 0.2) - (py * 0.1) + frame * 2.1);
        if (rip > 0.82) c = P.water;
      } else if (d < 1.0) {
        c = P.sand;
      } else if (d < 1.08) {
        c = P.sandDk;
      } else if (d < 1.16) {
        c = P.grassDk; // blend into grass
      }
      if (c) px(ctx, pxx, py, PXS, PXS, c);
    }
  }

  // lily pads (static, both frames)
  const pads = [[cx - 30, cy - 10], [cx + 24, cy + 6], [cx - 8, cy + 22]];
  pads.forEach(([x, y]) => {
    px(ctx, x - 4, y - 3, 10, 7, P.leaf);
    px(ctx, x - 4, y + 2, 10, 2, P.leafLo);
    px(ctx, x - 2, y - 2, 4, 2, P.leafHi);
    px(ctx, x, y, 2, 2, '#f4c1d4'); // tiny flower
  });

  tex.refresh();
}
