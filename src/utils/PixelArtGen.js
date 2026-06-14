export const TILE = 32;

/*
  Mediterranean afternoon. Light from top-left.
  Outlines use a darkened hue of the object (never pure black).
*/

const C = {
  // grass
  g0: '#bcc86e', g1: '#a8b25c', g2: '#8f9a4c', g3: '#74803c', gOut: '#5a6430',
  // sand / beach
  s0: '#f0e2a8', s1: '#e2d088', s2: '#cdb96e', wet: '#bca85e',
  // sea
  d0: '#236f9e', d1: '#2c86b6', d2: '#4aa6d0', d3: '#1a5d86',   // deep
  h0: '#3aa0c6', h1: '#5cc0de', h2: '#8ce0ee', h3: '#2a88ad',   // shallow
  foam: '#eef8fa', foam2: '#c8e8f0',
  // wood
  w0: '#c49a64', w1: '#9c7644', w2: '#6f5230', wOut: '#4a3420',
  // cypress
  cy0: '#5cae6a', cy1: '#3f8c52', cy2: '#2c6c3e', cyOut: '#173d22',
  // olive
  ol0: '#cdd3a4', ol1: '#a4ac74', ol2: '#7c8455', olOut: '#4c5430', olive: '#3a4424',
  // stone
  m0: '#e6dcc4', m1: '#cabf9f', m2: '#a89c7c', mOut: '#6f6450',
};

// ────────────────────────────────────────────────────────────────────────────
export function generateTextures(scene) {
  for (let i = 0; i < 4; i++) makeGrass(scene, `grass${i}`, i);
  makeSand(scene);
  makeMarbleGround(scene, 'marble0', 0);
  makeMarbleGround(scene, 'marble1', 1);
  for (let f = 0; f < 3; f++) makeWater(scene, `sea${f}`, f, true);
  for (let f = 0; f < 3; f++) makeWater(scene, `shal${f}`, f, false);
  for (let f = 0; f < 2; f++) makeFoam(scene, `foam${f}`, f);
  makeCypress(scene);
  makeOlive(scene);
  makeShrub(scene);
  makeRock(scene);
  makeFlower(scene, 'flower_poppy',  '#d43020', '#f06848');
  makeFlower(scene, 'flower_lav',    '#9878d0', '#bca8ec');
  makeFlower(scene, 'flower_daisy',  '#f4f4e4', '#ffffff');
}

// helpers
function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }
function canvas(scene, key, w, h) { const tex = scene.textures.createCanvas(key, w, h); return { tex, ctx: tex.getContext() }; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function dither(ctx, x, y, w, h, a, b) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    px(ctx, x + i, y + j, 1, 1, ((i ^ j) & 1) ? b : a);
}

// ── GRASS ─────────────────────────────────────────────────────────────────
function makeGrass(scene, key, variant) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const r = rng(5000 + variant * 131);
  px(ctx, 0, 0, TILE, TILE, C.g1);
  dither(ctx, 0, 0, TILE, 3, C.g1, C.g0);            // soft top light
  dither(ctx, 0, TILE - 3, TILE, 3, C.g1, C.g2);     // soft bottom shade
  const blades = [[4,6],[11,20],[18,9],[24,23],[28,14],[7,27],[21,5]];
  blades.forEach(([bx, by]) => {
    if (r() < 0.45) return;
    px(ctx, bx, by, 1, 3, C.g3);
    px(ctx, bx + 1, by + 1, 1, 2, C.g0);
  });
  for (let i = 0; i < 3; i++) px(ctx, (r() * 30 + 1) | 0, (r() * 30 + 1) | 0, 1, 1, C.g3);
  tex.refresh();
}

// ── SAND / BEACH ────────────────────────────────────────────────────────────
function makeSand(scene) {
  const { tex, ctx } = canvas(scene, 'sand', TILE, TILE);
  const r = rng(909);
  px(ctx, 0, 0, TILE, TILE, C.s1);
  dither(ctx, 0, 0, TILE, 4, C.s1, C.s0);
  for (let i = 0; i < 10; i++) {
    const x = (r() * TILE) | 0, y = (r() * TILE) | 0;
    px(ctx, x, y, 1, 1, r() > 0.5 ? C.s0 : C.s2);
  }
  // a couple pebbles
  px(ctx, 8, 20, 2, 1, C.s2); px(ctx, 22, 11, 2, 1, C.s2);
  tex.refresh();
}

// ── MARBLE GROUND — flat whitish-grey rock patch (as in Zeus) ───────────────
function makeMarbleGround(scene, key, variant) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const base = '#d6d4ca', hi = '#e8e6dc', lo = '#bcbab0', vein = '#a8a89e';
  const r = rng(404 + variant * 53);
  px(ctx, 0, 0, TILE, TILE, base);
  // subtle mottling
  for (let i = 0; i < 14; i++) {
    const x = (r() * TILE) | 0, y = (r() * TILE) | 0;
    px(ctx, x, y, 2, 1, r() > 0.5 ? hi : lo);
  }
  // faint marble veins (thin diagonal grey streaks)
  for (let v = 0; v < 2; v++) {
    let x = (r() * TILE) | 0, y = (r() * 8) | 0;
    const dx = r() > 0.5 ? 1 : -1;
    while (y < TILE) { px(ctx, x, y, 1, 1, vein); x += dx * (r() > 0.6 ? 1 : 0); y += 1; }
  }
  tex.refresh();
}

// ── MOUNTAIN MASSIF — faceted rocky formation (relief + stone), like Zeus ───
export function makeMountain(scene, key, radTiles, seed) {
  const W = radTiles * 2 * TILE;
  const H = Math.round(radTiles * 2 * TILE * 1.15);
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2;
  const r = rng(seed);

  const P = { l: '#bdb9aa', m: '#979382', d: '#6f6a59', x: '#49463a',
              moss: '#6f8a46', mossHi: '#88a458' };

  // ground shadow
  ctx.fillStyle = 'rgba(35,30,12,0.20)';
  ctx.beginPath(); ctx.ellipse(cx + 4, H * 0.82, W * 0.46, H * 0.12, 0, 0, Math.PI * 2); ctx.fill();

  // rock lumps: peak at back, broad base in front (drawn back→front)
  const lumps = [
    [cx,            H * 0.34, W * 0.30, H * 0.32],   // main peak
    [cx - W * 0.27, H * 0.52, W * 0.21, H * 0.22],
    [cx + W * 0.26, H * 0.55, W * 0.23, H * 0.23],
    [cx - W * 0.08, H * 0.70, W * 0.30, H * 0.22],   // front mass
    [cx + W * 0.14, H * 0.74, W * 0.22, H * 0.17],
    [cx - W * 0.24, H * 0.74, W * 0.16, H * 0.13],
  ];

  for (const [lx, ly, lrx, lry] of lumps) {
    for (let y = -lry; y <= lry; y++) {
      for (let x = -lrx; x <= lrx; x++) {
        const nx = x / lrx, ny = y / lry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const t = (y + lry) / (2 * lry);          // 0 top → 1 bottom
        let c;
        if (r2 > 0.86) c = P.x;                    // dark rim / crevice
        else if (t < 0.26) c = P.l;
        else if (t < 0.56) c = P.m;
        else if (t < 0.82) c = P.d;
        else c = P.x;
        // light from top-left: lift the left flank one shade
        if (nx < -0.32 && r2 <= 0.86) {
          if (c === P.m) c = P.l; else if (c === P.d) c = P.m; else if (c === P.x && t < 0.85) c = P.d;
        }
        px(ctx, lx + x, ly + y, 1, 1, c);
      }
    }
    // sunlit cap highlight (top-left)
    px(ctx, lx - lrx * 0.3, ly - lry * 0.62, lrx * 0.5, 2, P.l);
    // moss flecks on top
    for (let i = 0; i < 5; i++) {
      const mx = lx + (r() - 0.5) * lrx, my = ly - lry * (0.2 + r() * 0.4);
      px(ctx, mx | 0, my | 0, 2, 1, r() > 0.5 ? P.moss : P.mossHi);
    }
  }
  tex.refresh();
  return { W, H, originY: 0.80 };   // base of the massif near the bottom
}

// ── WATER (seamless, no grid lines) ─────────────────────────────────────────
function makeWater(scene, key, frame, deep) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const base = deep ? C.d0 : C.h0;
  const mid  = deep ? C.d1 : C.h1;
  const lite = deep ? C.d2 : C.h2;
  // flat base — NO edge banding, so tiles join invisibly
  px(ctx, 0, 0, TILE, TILE, base);
  // fine uniform speckle (identical every tile → no visible seams)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      if (((x * 3 + y * 7) % 13) === 0) px(ctx, x, y, 1, 1, mid);
  // a few drifting sparkles, kept away from edges
  const r = rng(900 + frame * 53);
  for (let i = 0; i < 6; i++) {
    const x = 3 + ((r() * (TILE - 8)) | 0);
    const y = 3 + ((r() * (TILE - 8)) | 0);
    px(ctx, x, y, 2, 1, lite);
    px(ctx, x, y + 1, 1, 1, lite);
  }
  tex.refresh();
}

// ── FOAM (shoreline wave, top edge; transparent elsewhere) ─────────────────
function makeFoam(scene, key, frame) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const off = frame * 4;
  // wavy foam line near the top of the tile (land is above)
  for (let x = 0; x < TILE; x++) {
    const y = 4 + Math.round(2 * Math.sin((x + off) * 0.45));
    px(ctx, x, y, 1, 2, C.foam);
    px(ctx, x, y + 2, 1, 1, C.foam2);
  }
  // scattered foam bubbles
  for (let x = (off % 6); x < TILE; x += 6) {
    px(ctx, x, 8 + ((x % 3)), 1, 1, C.foam2);
  }
  tex.refresh();
}

// generic outlined vertical profile painter
function paintProfile(ctx, yTop, yBot, widthAt, cols, outline) {
  // outline pass (1px wider each side)
  for (let y = yTop; y <= yBot; y++) {
    const w = Math.max(1, Math.round(widthAt(y)));
    const x0 = Math.round(cols.cx - w / 2);
    px(ctx, x0 - 1, y, w + 2, 1, outline);
  }
  // fill pass: interior with shading
  for (let y = yTop; y <= yBot; y++) {
    const w = Math.max(1, Math.round(widthAt(y)));
    const x0 = Math.round(cols.cx - w / 2);
    const lw = Math.max(1, Math.floor(w * 0.28));
    const rw = Math.max(1, Math.floor(w * 0.22));
    const mw = Math.max(1, w - lw - rw);
    px(ctx, x0,           y, lw, 1, cols.hi);
    px(ctx, x0 + lw,      y, mw, 1, cols.mid);
    px(ctx, x0 + lw + mw, y, rw, 1, cols.lo);
  }
  // top & bottom outline caps
  const wTop = Math.max(1, Math.round(widthAt(yTop)));
  px(ctx, Math.round(cols.cx - wTop / 2) - 1, yTop - 1, wTop + 2, 1, outline);
  const wBot = Math.max(1, Math.round(widthAt(yBot)));
  px(ctx, Math.round(cols.cx - wBot / 2) - 1, yBot + 1, wBot + 2, 1, outline);
}

// ── CYPRESS (flame silhouette, outlined) ────────────────────────────────────
function makeCypress(scene) {
  const W = 26, H = 68;
  const { tex, ctx } = canvas(scene, 'cypress', W, H);
  const cx = W / 2;
  // ground shadow
  ctx.fillStyle = 'rgba(70,60,20,0.20)';
  ctx.beginPath(); ctx.ellipse(cx, H - 3, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  // trunk
  px(ctx, cx - 2, H - 11, 4, 9, C.w1);
  px(ctx, cx - 3, H - 11, 1, 9, C.wOut);
  px(ctx, cx + 2, H - 11, 1, 9, C.wOut);
  // canopy
  const yTop = 3, yBot = H - 11;
  const widthAt = (y) => {
    const t = (y - yTop) / (yBot - yTop);
    return 3 + 17 * Math.sin(t * 1.95 + 0.22);
  };
  paintProfile(ctx, yTop, yBot, widthAt,
    { cx, hi: C.cy0, mid: C.cy1, lo: C.cy2 }, C.cyOut);
  // a few texture flecks
  const r = rng(77);
  for (let i = 0; i < 10; i++) {
    const t = r(); const w = widthAt(yTop + t * (yBot - yTop));
    const x = cx - w / 2 + 1 + r() * Math.max(1, w - 2);
    px(ctx, x | 0, (yTop + t * (yBot - yTop)) | 0, 1, 2, r() > 0.5 ? C.cy0 : C.cy2);
  }
  tex.refresh();
}

// ── OLIVE (lobed round canopy, outlined) ────────────────────────────────────
function makeOlive(scene) {
  const W = 54, H = 56;
  const { tex, ctx } = canvas(scene, 'olive', W, H);
  const cx = W / 2;
  ctx.fillStyle = 'rgba(70,60,20,0.20)';
  ctx.beginPath(); ctx.ellipse(cx + 1, H - 3, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  // trunk (gnarled)
  px(ctx, cx - 2, H - 24, 4, 20, C.w1);
  px(ctx, cx - 3, H - 24, 1, 20, C.wOut);
  px(ctx, cx + 2, H - 24, 1, 20, C.wOut);
  px(ctx, cx + 1, H - 16, 3, 12, C.w2);
  // canopy = 3 overlapping lobes
  const lobes = [[cx - 11, 20, 13], [cx + 11, 22, 12], [cx, 16, 16]];
  // outline pass
  lobes.forEach(([lx, ly, rad]) => fillCircle(ctx, lx, ly, rad + 1, C.olOut));
  // fill pass
  lobes.forEach(([lx, ly, rad]) => {
    fillCircle(ctx, lx, ly, rad, C.ol1);
    fillCircle(ctx, lx - rad * 0.3, ly - rad * 0.35, rad * 0.55, C.ol0); // highlight
    fillCircleArc(ctx, lx, ly, rad, C.ol2);                              // bottom shade
  });
  // olives
  const r = rng(303);
  for (let i = 0; i < 10; i++) {
    const [lx, ly, rad] = lobes[(r() * 3) | 0];
    px(ctx, (lx + (r() - 0.5) * rad) | 0, (ly + (r() - 0.2) * rad * 0.6) | 0, 2, 2, C.olive);
  }
  tex.refresh();
}

function fillCircle(ctx, cx, cy, rad, color) {
  for (let y = -rad; y <= rad; y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, rad * rad - y * y)));
    px(ctx, cx - w, cy + y, w * 2 + 1, 1, color);
  }
}
function fillCircleArc(ctx, cx, cy, rad, color) {
  // bottom-right shaded crescent
  for (let y = 0; y <= rad; y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, rad * rad - y * y)));
    px(ctx, cx, cy + y, w, 1, color);
  }
}

// ── SHRUB (small bush) ──────────────────────────────────────────────────────
function makeShrub(scene) {
  const W = 28, H = 24;
  const { tex, ctx } = canvas(scene, 'shrub', W, H);
  const cx = W / 2;
  ctx.fillStyle = 'rgba(70,60,20,0.18)';
  ctx.beginPath(); ctx.ellipse(cx, H - 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  const lobes = [[cx - 6, 13, 7], [cx + 6, 14, 6], [cx, 10, 8]];
  lobes.forEach(([lx, ly, rad]) => fillCircle(ctx, lx, ly, rad + 1, C.cyOut));
  lobes.forEach(([lx, ly, rad]) => {
    fillCircle(ctx, lx, ly, rad, C.cy1);
    fillCircle(ctx, lx - rad * 0.3, ly - rad * 0.3, rad * 0.5, C.cy0);
    fillCircleArc(ctx, lx, ly, rad, C.cy2);
  });
  px(ctx, cx - 4, 12, 2, 2, '#d43020'); // berry
  px(ctx, cx + 3, 15, 2, 2, '#d43020');
  tex.refresh();
}

// ── ROCK (outlined boulder) ─────────────────────────────────────────────────
function makeRock(scene) {
  const W = 30, H = 22;
  const { tex, ctx } = canvas(scene, 'rock', W, H);
  ctx.fillStyle = 'rgba(70,60,20,0.18)';
  ctx.beginPath(); ctx.ellipse(15, H - 3, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  const rows = [[12,6],[9,12],[6,18],[5,20],[6,18],[8,14],[11,8]];
  // outline
  rows.forEach(([x0, w], i) => px(ctx, x0 - 1, i + 4, w + 2, 1, C.mOut));
  px(ctx, rows[0][0], 3, rows[0][1], 1, C.mOut);
  px(ctx, rows[rows.length-1][0] - 1, rows.length + 4, rows[rows.length-1][1] + 2, 1, C.mOut);
  // fill with shading
  rows.forEach(([x0, w], i) => {
    const y = i + 4;
    px(ctx, x0,        y, 2,     1, C.m0);
    px(ctx, x0 + 2,    y, w - 4, 1, C.m1);
    px(ctx, x0 + w - 2,y, 2,     1, C.m2);
  });
  dither(ctx, 11, 5, 6, 2, C.m1, C.m0);   // top highlight
  px(ctx, 7, 10, 14, 2, C.m2);            // mid shadow band
  tex.refresh();
}

// ── HIGHLAND MASK — defines the elevated region (a corner of the island) ────
// Shared by the scene (deco exclusion) and the cliff generator so they agree.
export function highlandMask(region) {
  const { cx, cy, Rx, Ry, ph } = region;
  const scaleAt = (a) =>
    1 + 0.10 * Math.sin(2 * a + ph[0]) + 0.06 * Math.sin(3 * a + ph[1])
      + 0.04 * Math.sin(5 * a + ph[2]);
  const isHi = (col, row) => {
    const nx = (col - cx) / Rx, ny = (row - cy) / Ry;
    return Math.hypot(nx, ny) <= scaleAt(Math.atan2(ny, nx));
  };
  return { isHi, scaleAt };
}

// nicer stacked boulder: lit top-left, shadowed core, crack, moss fleck
function stone(ctx, bx, by, size, seed) {
  const br = rng(seed);
  const bw = Math.max(4, (size * (0.85 + br() * 0.35)) | 0);
  const bh = Math.max(3, (size * (0.62 + br() * 0.28)) | 0);
  const HI = '#efe9d8', L = C.m0, M = C.m1, D = C.m2, X = C.mOut, MOSS = '#7c9450';
  for (let dy = -bh; dy <= bh; dy++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, bw * bw - (dy * bw / bh) ** 2)));
    if (hw < 1) continue;
    const t = (dy + bh) / (bh * 2);                       // 0 top → 1 bottom
    for (let dx = -hw; dx <= hw; dx++) {
      const u = (dx + hw) / (2 * hw);                     // 0 left → 1 right
      let c;
      if (dy === -bh || dy === bh || dx === -hw || dx === hw) c = X;   // outline
      else {
        const lum = (1 - t) * 0.6 + (1 - u) * 0.4;        // light top-left
        c = lum > 0.66 ? HI : lum > 0.46 ? L : lum > 0.28 ? M : D;
      }
      px(ctx, bx + dx, by + dy, 1, 1, c);
    }
  }
  // diagonal crack
  for (let i = -bh + 2; i < bh - 1; i++) {
    if (((i + bh) & 1) === 0) px(ctx, bx + (i * 0.5) | 0, by + i, 1, 1, X);
  }
  // moss fleck on the sunny shoulder
  if (br() < 0.6) px(ctx, bx - (bw * 0.3) | 0, by - (bh * 0.4) | 0, 2, 1, MOSS);
}

// ── HIGHLAND CLIFF — one sprite: the rocky cliff wrapping the raised corner ──
// The highland TOP is plain grass laid by the scene; this sprite is only the
// cliff face + boulder rim that wrap the south & east sides of the region,
// broken by walkable grass ramps. `region` is the highlandMask config,
// `ramps` = array of boundary angles (radians) where a ramp cuts through.
export function makeHighlandCliff(scene, key, cols, rows, region, ramps, seed) {
  const CLIFF = 30;
  const W = cols * TILE, H = rows * TILE;
  const { tex, ctx } = canvas(scene, key, W, H);
  const { isHi, scaleAt } = highlandMask(region);
  const { cx, cy, Rx, Ry } = region;

  // pixel-resolution highland mask
  const hi = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (isHi(x / TILE, y / TILE)) hi[y * W + x] = 1;
  const HI = (x, y) => x >= 0 && y >= 0 && x < W && y < H && hi[y * W + x] === 1;

  const angOf = (x, y) => Math.atan2((y / TILE - cy) / Ry, (x / TILE - cx) / Rx);
  const RW = 0.16;   // ramp angular half-width
  const isRamp = (x, y) => {
    const a = angOf(x, y);
    return ramps.some(ra => Math.abs(Math.atan2(Math.sin(a - ra), Math.cos(a - ra))) < RW);
  };

  // ── cliff faces: extrude every boundary pixel outward (down &/or right) ──
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!hi[y * W + x]) continue;
      const downLow  = !HI(x, y + 1);
      const rightLow = !HI(x + 1, y);
      if (!downLow && !rightLow) continue;
      const ramp = isRamp(x, y);

      if (downLow) {                                   // south-facing face
        for (let k = 1; k <= CLIFF; k++) {
          const yy = y + k; if (HI(x, yy)) break;
          const t = k / CLIFF;
          ctx.fillStyle = paintFace(t, x, k, ramp);
          ctx.fillRect(x, yy, 1, 1);
        }
        if (!ramp) px(ctx, x, y, 1, 1, C.mOut);        // dark lip on top
        // soft cast shadow on the flat below
        if (!ramp) { ctx.fillStyle = 'rgba(12,8,0,0.16)'; ctx.fillRect(x + 2, y + CLIFF + 1, 1, 3); }
      }
      if (rightLow) {                                  // east-facing face
        for (let k = 1; k <= CLIFF; k++) {
          const xx = x + k; if (HI(xx, y)) break;
          const t = k / CLIFF;
          ctx.fillStyle = paintFace(t, y, k, ramp);
          ctx.fillRect(xx, y, 1, 1);
        }
        if (!ramp) px(ctx, x, y, 1, 1, C.mOut);
      }
    }
  }

  // ── boulder rim along the boundary (skipping ramp mouths) ──
  // walk the boundary by angle and drop overlapping stones of varied size
  const STEP = 0.05;
  let bi = 0;
  for (let a = -0.2; a < Math.PI / 2 + 0.2; a += STEP) {
    const s = scaleAt(a);
    const colT = cx + Math.cos(a) * Rx * s;
    const rowT = cy + Math.sin(a) * Ry * s;
    const bx = Math.round(colT * TILE), by = Math.round(rowT * TILE);
    if (bx < 4 || by < 4 || bx > W - 4 || by > H - 4) continue;
    if (ramps.some(ra => Math.abs(Math.atan2(Math.sin(a - ra), Math.cos(a - ra))) < RW + 0.04)) continue;
    stone(ctx, bx, by, 11, seed + bi * 137 + 1);
    if ((bi & 1) === 0) stone(ctx, bx + 7, by + 4, 7, seed + bi * 91 + 53);   // small companion
    bi++;
  }

  tex.refresh();
  return { W, H };

  // layered rock vs. grass ramp colour for the face
  function paintFace(t, seedAxis, k, ramp) {
    if (ramp) return t < 0.32 ? C.g1 : t < 0.68 ? C.g2 : C.g3;
    let c = t < 0.18 ? C.m0 : t < 0.46 ? C.m1 : t < 0.78 ? C.m2 : C.mOut;
    if (((seedAxis * 5 + k * 3) % 9) === 0) c = (c === C.m2 ? C.m1 : c === C.m1 ? C.m0 : c);
    if ((seedAxis % 23) === 0 && k > 3 && k < CLIFF - 2) c = C.mOut;   // crevice
    return c;
  }
}

// ── FLOWER ──────────────────────────────────────────────────────────────────
function makeFlower(scene, key, color, hi) {
  const W = 14, H = 14;
  const { tex, ctx } = canvas(scene, key, W, H);
  px(ctx, 6, 8, 1, 5, C.g3);
  px(ctx, 7, 9, 1, 3, C.g0);
  // 5 petals around centre
  px(ctx, 5, 3, 4, 1, color);
  px(ctx, 4, 4, 1, 1, color); px(ctx, 9, 4, 1, 1, color);
  px(ctx, 3, 5, 1, 3, color); px(ctx, 10, 5, 1, 3, color);
  px(ctx, 4, 8, 1, 1, color); px(ctx, 9, 8, 1, 1, color);
  px(ctx, 5, 8, 4, 1, color);
  px(ctx, 6, 3, 1, 1, hi);
  // centre
  px(ctx, 5, 5, 4, 3, '#f8e890');
  px(ctx, 6, 6, 2, 1, '#d8b020');
  tex.refresh();
}
