export const TILE = 32;

// ── Greek / Mediterranean palette ──────────────────────────────────────────
const P = {
  // dry olive-toned meadow
  grass:   ['#9aa653', '#a3ad5d', '#8d9a48', '#aeb968'],
  grassHi: '#c6c876',
  grassLo: '#7a8540',
  grassDk: '#5f6b32',

  cypress:   '#2f5d34',
  cypressHi: '#3f7a44',
  cypressLo: '#214726',

  olive:     '#869b6a',
  oliveHi:   '#a3b587',
  oliveLo:   '#5f7349',
  oliveFruit:'#3a4a2a',

  trunk:   '#7a5a3a',
  trunkDk: '#5c4327',

  marble:   '#ece6d6',
  marbleHi: '#fbf7ec',
  marbleLo: '#c9c0a8',
  marbleSh: '#a89c80',

  sea:      '#2f9bc4',
  seaHi:    '#5cc0e0',
  seaLo:    '#1f7aa0',
  sand:     '#e6d6a4',
  sandDk:   '#cbb878',

  rock:    '#c9bfa2',
  rockHi:  '#e2dcc6',
  rockLo:  '#9a8f72',
};

export function generateTextures(scene) {
  for (let i = 0; i < 4; i++) makeGrass(scene, `grass${i}`, i);
  makeCypress(scene);
  makeOlive(scene);
  makeColumn(scene, 'column', false);
  makeColumn(scene, 'column_broken', true);
  makeRock(scene);
  makeFlower(scene, 'flower_poppy', '#d83b2e', '#ff6a55');
  makeFlower(scene, 'flower_lav',   '#9a86c4', '#c2b0e6');
  makeFlower(scene, 'flower_w',     '#f4f4f4', '#ffffff');
  makeFlower(scene, 'flower_y',     '#f2c14e', '#ffe08a');
  makePond(scene, 'pond_a', 0);
  makePond(scene, 'pond_b', 1);
}

// helpers
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h)); }
function canvas(scene, key, w, h) { const tex = scene.textures.createCanvas(key, w, h); return { tex, ctx: tex.getContext() }; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ── grass (4 variants) ──────────────────────────────────────────────────────
function makeGrass(scene, key, variant) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const r = rng(2000 + variant * 91);
  for (let y = 0; y < TILE; y++) px(ctx, 0, y, TILE, 1, P.grass[(y >> 3) % P.grass.length]);
  for (let i = 0; i < 16; i++) px(ctx, (r() * TILE) | 0, (r() * TILE) | 0, 1, 1, r() > 0.5 ? P.grassHi : P.grassLo);
  // dry tufts
  const tufts = 2 + ((r() * 3) | 0);
  for (let i = 0; i < tufts; i++) {
    const x = 3 + ((r() * (TILE - 6)) | 0), y = 7 + ((r() * (TILE - 12)) | 0);
    px(ctx, x, y, 1, 3, P.grassLo); px(ctx, x + 1, y + 1, 1, 2, P.grassHi);
  }
  tex.refresh();
}

// ── cypress (tall, narrow, iconic) ──────────────────────────────────────────
function makeCypress(scene) {
  const W = 32, H = 76;
  const { tex, ctx } = canvas(scene, 'cypress', W, H);
  const cx = W / 2;
  px(ctx, cx - 6, H - 5, 12, 3, 'rgba(0,0,0,0.18)'); // shadow
  px(ctx, cx - 2, H - 10, 4, 8, P.trunk);            // trunk
  // tapered flame body
  for (let y = 4; y < H - 8; y++) {
    const t = (y - 4) / (H - 12);
    const w = 4 + t * 18;
    px(ctx, cx - w / 2, y, w, 1, P.cypress);
  }
  // shading
  for (let y = 6; y < H - 8; y += 1) {
    const t = (y - 4) / (H - 12);
    const w = 4 + t * 18;
    px(ctx, cx - w / 2, y, 2, 1, P.cypressLo);          // left dark
    px(ctx, cx + w / 2 - 2, y, 2, 1, P.cypressLo);      // right dark
  }
  const r = rng(7);
  for (let i = 0; i < 18; i++) {
    const t = r();
    const w = 4 + t * 14;
    const y = 6 + t * (H - 16);
    px(ctx, cx - w / 2 + r() * w, y, 1, 2, r() > 0.5 ? P.cypressHi : P.cypressLo);
  }
  tex.refresh();
}

// ── olive tree (round silvery canopy, gnarled trunk) ───────────────────────
function makeOlive(scene) {
  const W = 52, H = 56;
  const { tex, ctx } = canvas(scene, 'olive', W, H);
  const cx = W / 2;
  px(ctx, cx - 10, H - 5, 20, 3, 'rgba(0,0,0,0.18)');
  // gnarled trunk
  px(ctx, cx - 3, H - 22, 6, 18, P.trunk);
  px(ctx, cx - 3, H - 22, 2, 18, P.trunkDk);
  px(ctx, cx + 1, H - 16, 3, 8, P.trunkDk);
  // canopy clusters
  const blob = [[14,6,24,12],[8,14,36,12],[12,24,28,9]];
  blob.forEach(([x, y, w, h]) => px(ctx, x, y, w, h, P.olive));
  blob.forEach(([x, y, w, h]) => px(ctx, x, y + h - 3, w, 3, P.oliveLo));
  px(ctx, 16, 8, 12, 3, P.oliveHi);
  px(ctx, 12, 16, 14, 3, P.oliveHi);
  const r = rng(11);
  for (let i = 0; i < 8; i++) px(ctx, 12 + (r() * 28) | 0, 8 + (r() * 22) | 0, 2, 2, r() > 0.5 ? P.oliveHi : P.oliveFruit);
  tex.refresh();
}

// ── marble column (intact or broken ruin) ───────────────────────────────────
function makeColumn(scene, key, broken) {
  const W = 28, H = broken ? 40 : 60;
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2;
  px(ctx, cx - 9, H - 4, 18, 3, 'rgba(0,0,0,0.18)');
  // base
  px(ctx, cx - 9, H - 8, 18, 5, P.marbleLo);
  px(ctx, cx - 9, H - 8, 18, 1, P.marbleHi);
  const shaftTop = broken ? 10 : 8;
  const shaftBot = H - 8;
  // shaft with vertical fluting
  for (let x = cx - 7; x < cx + 7; x++) {
    const flute = ((x - (cx - 7)) % 3 === 0);
    px(ctx, x, shaftTop, 1, shaftBot - shaftTop, flute ? P.marbleSh : P.marble);
  }
  px(ctx, cx - 7, shaftTop, 2, shaftBot - shaftTop, P.marbleHi); // left highlight
  px(ctx, cx + 5, shaftTop, 2, shaftBot - shaftTop, P.marbleSh); // right shade
  if (broken) {
    // jagged broken top
    px(ctx, cx - 7, shaftTop, 4, 2, P.marbleLo);
    px(ctx, cx + 1, shaftTop - 2, 3, 2, P.marble);
    px(ctx, cx - 3, shaftTop - 1, 3, 1, P.marble);
  } else {
    // capital
    px(ctx, cx - 9, 4, 18, 5, P.marble);
    px(ctx, cx - 9, 4, 18, 1, P.marbleHi);
    px(ctx, cx - 9, 8, 18, 1, P.marbleSh);
  }
  tex.refresh();
}

// ── limestone rock ──────────────────────────────────────────────────────────
function makeRock(scene) {
  const W = 28, H = 22;
  const { tex, ctx } = canvas(scene, 'rock', W, H);
  px(ctx, 4, H - 4, W - 8, 3, 'rgba(0,0,0,0.15)');
  const blob = [[8,4,12,6],[4,10,20,8],[6,16,16,4]];
  blob.forEach(([x, y, w, h]) => px(ctx, x, y, w, h, P.rock));
  blob.forEach(([x, y, w, h]) => px(ctx, x, y + h - 2, w, 2, P.rockLo));
  px(ctx, 9, 5, 6, 2, P.rockHi); px(ctx, 6, 11, 8, 2, P.rockHi);
  tex.refresh();
}

// ── flower ──────────────────────────────────────────────────────────────────
function makeFlower(scene, key, color, hi) {
  const S = 12;
  const { tex, ctx } = canvas(scene, key, S, S);
  px(ctx, 5, 7, 1, 4, P.grassLo);
  px(ctx, 4, 4, 4, 4, color);
  px(ctx, 5, 3, 2, 6, color);
  px(ctx, 3, 5, 6, 2, color);
  px(ctx, 5, 4, 1, 1, hi);
  px(ctx, 5, 5, 2, 2, '#f9e26a');
  tex.refresh();
}

// ── Aegean pool (organic, two shimmer frames) ──────────────────────────────
function makePond(scene, key, frame) {
  const W = 200, H = 148, PXS = 2;
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2, cy = H / 2, rx = 80, ry = 58;
  for (let py = 0; py < H; py += PXS) {
    for (let pxx = 0; pxx < W; pxx += PXS) {
      const nx = (pxx - cx) / rx, ny = (py - cy) / ry;
      const ang = Math.atan2(ny, nx);
      const wob = 0.10 * Math.sin(ang * 3) + 0.05 * Math.sin(ang * 5 + 1.1);
      const d = Math.sqrt(nx * nx + ny * ny) / (1 + wob);
      let c = null;
      if (d < 0.6) {
        c = P.sea;
        if (Math.sin(pxx * 0.18 + py * 0.12 + frame * 1.7) > 0.78) c = P.seaHi;
      } else if (d < 0.92) {
        c = P.seaLo;
        if (Math.sin(pxx * 0.2 - py * 0.1 + frame * 2.1) > 0.84) c = P.sea;
      } else if (d < 1.0) c = P.sand;
      else if (d < 1.08) c = P.sandDk;
      else if (d < 1.16) c = P.grassDk;
      if (c) px(ctx, pxx, py, PXS, PXS, c);
    }
  }
  tex.refresh();
}
