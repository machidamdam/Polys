export const TILE = 32;

/*
  Light source: top-left.
  Palette is intentionally small and warm — Mediterranean afternoon light.
  No pure black outlines: shadows use darkened hues.
*/

const G = {
  // ── grass ──
  g0: '#b8c46a',  // highlight (sun-bleached)
  g1: '#a8af60',  // base
  g2: '#919851',  // mid shadow
  g3: '#767d40',  // dark shadow
  g4: '#5e6432',  // cast shadow / blade dark

  // ── stone / marble ──
  m0: '#f2ecdc',  // bright face
  m1: '#ddd3b8',  // mid face
  m2: '#bfb398',  // shadow face
  m3: '#9e9278',  // deep shadow
  m4: '#7e7460',  // darkest grout

  // ── trunk / wood ──
  w0: '#c49a64',  // highlight
  w1: '#a07848',  // base
  w2: '#7a5a34',  // shadow
  w3: '#5a3c20',  // dark

  // ── cypress ──
  cy0: '#5cac6c',  // highlight
  cy1: '#3f8c52',  // base
  cy2: '#2a6c3c',  // shadow
  cy3: '#1a4c28',  // deep shadow

  // ── olive ──
  ol0: '#c8cfa0',  // silver leaf highlight
  ol1: '#a0a870',  // base
  ol2: '#7c8455',  // shadow
  ol3: '#505830',  // dark

  // ── water / Aegean ──
  sea0: '#7ed4f0',  // sparkle
  sea1: '#48aed8',  // surface
  sea2: '#2888b8',  // deep
  sea3: '#1a6898',  // darkest
  sand: '#e8d898',
  sandDk: '#c8b870',
};

// ────────────────────────────────────────────────────────────────────────────
export function generateTextures(scene) {
  for (let i = 0; i < 4; i++) makeGrass(scene, `grass${i}`, i);
  makeCypress(scene);
  makeOlive(scene);
  makeColumn(scene, 'column', false);
  makeColumn(scene, 'column_broken', true);
  makeRock(scene);
  makeFlower(scene, 'flower_poppy',  '#d43020', '#f06848');
  makeFlower(scene, 'flower_lav',    '#9878d0', '#bca8ec');
  makeFlower(scene, 'flower_daisy',  '#f0f0e0', '#ffffff');
  makeFlower(scene, 'flower_yellow', '#e8c830', '#f8e060');
  makePond(scene, 'pond_a', 0);
  makePond(scene, 'pond_b', 1);
}

// ── shared helpers ───────────────────────────────────────────────────────────
function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}

function canvas(scene, key, w, h) {
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ── dithering helper: 2×2 Bayer pattern between two colors ──────────────────
function dither2(ctx, x, y, w, h, ca, cb) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      // Bayer 2×2 pattern
      const b = ((dx & 1) ^ (dy & 1));
      px(ctx, x + dx, y + dy, 1, 1, b ? cb : ca);
    }
  }
}

// ── GRASS ───────────────────────────────────────────────────────────────────
// Flat, fully opaque. Use dithered banding, not noise, for clean look.
function makeGrass(scene, key, variant) {
  const { tex, ctx } = canvas(scene, key, TILE, TILE);
  const r = rng(3000 + variant * 113);

  // Fill with base color
  px(ctx, 0, 0, TILE, TILE, G.g1);

  // Dithered horizontal bands for gentle lighting
  dither2(ctx, 0, 0, TILE, 4, G.g1, G.g0);         // top highlight band
  dither2(ctx, 0, TILE - 4, TILE, 4, G.g1, G.g2);  // bottom shadow band

  // A handful of deliberate 1-2px grass strokes (not random noise)
  const blades = [
    [3, 5], [9, 18], [16, 8], [22, 24], [27, 14], [6, 27], [20, 4], [29, 21],
  ];
  blades.forEach(([bx, by], i) => {
    if (r() < 0.4) return; // only show some on each variant
    px(ctx, bx, by,     1, 3, G.g4);
    px(ctx, bx + 1, by + 1, 1, 2, G.g0);
  });

  // Tiny scattered pebbles / dirt flecks (1px)
  for (let i = 0; i < 4; i++) {
    const fx = (r() * (TILE - 4) + 2) | 0, fy = (r() * (TILE - 4) + 2) | 0;
    px(ctx, fx, fy, 1, 1, G.g3);
  }

  tex.refresh();
}

// ── CYPRESS ─────────────────────────────────────────────────────────────────
function makeCypress(scene) {
  const W = 28, H = 80;
  const { tex, ctx } = canvas(scene, 'cypress', W, H);

  // Soft shadow on ground
  ctx.fillStyle = 'rgba(80,70,20,0.22)';
  ctx.beginPath(); ctx.ellipse(W / 2, H - 3, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Trunk (visible at base)
  px(ctx, 12, H - 12, 4, 10, G.w1);
  px(ctx, 12, H - 12, 1, 10, G.w0);
  px(ctx, 15, H - 12, 1, 10, G.w3);

  // Flame-shaped canopy, tapered top to wide middle then taper again
  for (let y = 4; y < H - 10; y++) {
    const t = (y - 4) / (H - 14);
    // narrow at top, wide at 60%, narrow again at base
    const peak = 0.5;
    const w = t < peak
      ? 2 + t / peak * 16
      : 18 - (t - peak) / (1 - peak) * 10;
    const xOff = (W - w) / 2;

    // 3-shade columns: left dark / center bright / right dark
    const lw = Math.floor(w * 0.22), rw = Math.floor(w * 0.22);
    const mw = Math.max(1, Math.round(w) - lw - rw);
    px(ctx, xOff,       y, lw,  1, G.cy3);
    px(ctx, xOff + lw,  y, mw,  1, y < 20 ? G.cy0 : G.cy1);
    px(ctx, xOff + lw + mw, y, rw, 1, G.cy2);
  }

  tex.refresh();
}

// ── OLIVE ───────────────────────────────────────────────────────────────────
function makeOlive(scene) {
  const W = 56, H = 60;
  const { tex, ctx } = canvas(scene, 'olive', W, H);

  // Ground shadow
  ctx.fillStyle = 'rgba(80,70,20,0.20)';
  ctx.beginPath(); ctx.ellipse(W / 2 + 2, H - 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

  // Gnarled trunk — two strokes offset
  px(ctx, 24, H - 26, 3, 22, G.w1);
  px(ctx, 27, H - 20, 3, 16, G.w2);
  px(ctx, 24, H - 26, 1, 22, G.w0); // highlight left
  px(ctx, 29, H - 20, 1, 16, G.w3); // shadow right

  // Canopy: oval, painted row by row with 3 shades
  const cxc = W / 2, cyc = 22, rx = 20, ry = 16;
  for (let y = cyc - ry; y <= cyc + ry; y++) {
    const dy = (y - cyc) / ry;
    const rowW = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx * 2;
    const x0 = cxc - rowW / 2;
    // left highlight quarter
    const hw = Math.floor(rowW * 0.35);
    const sw = Math.ceil(rowW * 0.2);
    px(ctx, x0,       y, hw, 1, dy < -0.3 ? G.ol0 : G.ol1);
    px(ctx, x0 + hw,  y, Math.max(0, rowW - hw - sw), 1, G.ol1);
    px(ctx, x0 + rowW - sw, y, sw, 1, G.ol3);
  }
  // top highlight dither
  for (let y = cyc - ry; y < cyc - ry + 6; y++) {
    const dy = (y - cyc) / ry;
    const rowW = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx * 2;
    const x0 = cxc - rowW / 2;
    dither2(ctx, x0 + 2, y, rowW - 4, 1, G.ol1, G.ol0);
  }
  // tiny silver leaf flecks
  const r = rng(42);
  for (let i = 0; i < 14; i++) {
    const fx = (cxc - rx + 4 + r() * (rx * 2 - 8)) | 0;
    const fy = (cyc - ry + 4 + r() * (ry * 2 - 8)) | 0;
    px(ctx, fx, fy, 2, 1, G.ol0);
  }

  tex.refresh();
}

// ── COLUMN ──────────────────────────────────────────────────────────────────
function makeColumn(scene, key, broken) {
  const W = 24, H = broken ? 36 : 56;
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2;

  // Ground shadow
  ctx.fillStyle = 'rgba(80,70,20,0.20)';
  ctx.beginPath(); ctx.ellipse(cx, H - 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Base plinth
  px(ctx, cx - 9, H - 7, 18, 5, G.m1);
  px(ctx, cx - 9, H - 7, 18, 1, G.m0); // top highlight
  px(ctx, cx - 9, H - 3, 18, 1, G.m3); // bottom shadow

  const shaftY = broken ? 8 : 6;
  const shaftBot = H - 7;
  const shaftW = 12;
  const x0 = cx - shaftW / 2;

  // Shaft — fluted with 3 stripes
  px(ctx, x0,          shaftY, 2, shaftBot - shaftY, G.m0); // highlight flute
  px(ctx, x0 + 2,      shaftY, 4, shaftBot - shaftY, G.m1); // mid
  px(ctx, x0 + 6,      shaftY, 4, shaftBot - shaftY, G.m1); // mid
  px(ctx, x0 + 10,     shaftY, 2, shaftBot - shaftY, G.m2); // shadow flute
  // subtle centre line
  px(ctx, x0 + 5,      shaftY, 1, shaftBot - shaftY, G.m3);
  px(ctx, x0 + 9,      shaftY, 1, shaftBot - shaftY, G.m3);

  if (!broken) {
    // Capital (Doric echinus + abacus)
    px(ctx, cx - 10, 2, 20, 5, G.m1);
    px(ctx, cx - 10, 2, 20, 1, G.m0);  // top highlight
    px(ctx, cx - 10, 6, 20, 1, G.m3);  // bottom shadow
    px(ctx, cx - 8,  6, 16, 1, G.m2);  // abacus detail
  } else {
    // Jagged break at top
    px(ctx, x0,      shaftY, 3, 2, G.m2);
    px(ctx, x0 + 5,  shaftY - 3, 4, 3, G.m1);
    px(ctx, x0 + 9,  shaftY, 2, 2, G.m2);
    px(ctx, x0 + 3,  shaftY - 1, 2, 1, G.m3);
  }

  tex.refresh();
}

// ── ROCK ────────────────────────────────────────────────────────────────────
function makeRock(scene) {
  const W = 32, H = 24;
  const { tex, ctx } = canvas(scene, 'rock', W, H);

  // Shadow
  ctx.fillStyle = 'rgba(80,70,20,0.18)';
  ctx.beginPath(); ctx.ellipse(16, H - 3, 11, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Rock body — irregular lumpy silhouette via row-by-row widths
  const rows = [
    [12, 8], [9, 14], [7, 18], [6, 20], [6, 20],
    [7, 18], [9, 14], [12, 8],
  ];
  rows.forEach(([x0, w], i) => {
    const y = i + 6;
    px(ctx, x0,      y, 2, 1, G.m0);              // highlight left
    px(ctx, x0 + 2,  y, w - 4, 1, G.m1);          // mid
    px(ctx, x0 + w - 2, y, 2, 1, G.m2);           // shadow right
  });
  // top highlight patch (dithered)
  dither2(ctx, 11, 7, 7, 2, G.m1, G.m0);
  // dark underside
  px(ctx, 8, 12, 16, 2, G.m2);

  tex.refresh();
}

// ── FLOWER ──────────────────────────────────────────────────────────────────
function makeFlower(scene, key, color, hi) {
  const W = 14, H = 14;
  const { tex, ctx } = canvas(scene, key, W, H);
  // stem
  px(ctx, 6, 8, 1, 5, G.g3);
  px(ctx, 7, 9, 1, 3, G.g0);
  // 4 petals
  px(ctx, 5, 4, 4, 1, color); // top
  px(ctx, 5, 8, 4, 1, color); // bottom
  px(ctx, 3, 5, 1, 4, color); // left  (actually 3 not 4)
  px(ctx, 3, 6, 1, 2, color);
  px(ctx, 10, 5, 1, 4, color); // right
  px(ctx, 10, 6, 1, 2, color);
  // petal highlight
  px(ctx, 6, 4, 1, 1, hi);
  // centre
  px(ctx, 5, 5, 4, 3, '#f8f0a0');
  px(ctx, 6, 5, 2, 3, '#f0d840');
  px(ctx, 6, 6, 2, 1, '#d0b020');
  tex.refresh();
}

// ── POND (Aegean blue, 2-frame shimmer) ────────────────────────────────────
function makePond(scene, key, frame) {
  const W = 224, H = 160, PS = 2;
  const { tex, ctx } = canvas(scene, key, W, H);
  const cx = W / 2, cy = H / 2, rx = 90, ry = 62;

  for (let py = 0; py < H; py += PS) {
    for (let pxx = 0; pxx < W; pxx += PS) {
      const nx = (pxx - cx) / rx, ny = (py - cy) / ry;
      const ang = Math.atan2(ny, nx);
      // organic edge wobble
      const wob = 0.08 * Math.sin(ang * 3 + 0.5) + 0.05 * Math.sin(ang * 7 + 1.8);
      const d = Math.sqrt(nx * nx + ny * ny) / (1 + wob);

      let c = null;
      if (d < 0.55) {
        // inner deep
        c = G.sea2;
        const rip = Math.sin(pxx * 0.14 + py * 0.09 + frame * 1.9);
        const rip2 = Math.sin(pxx * 0.22 - py * 0.16 + frame * 2.7 + 1.2);
        if (rip > 0.7)  c = G.sea1;
        if (rip2 > 0.82) c = G.sea0;
      } else if (d < 0.78) {
        c = G.sea1;
        if (Math.sin(pxx * 0.18 + py * 0.12 + frame * 1.5) > 0.75) c = G.sea0;
      } else if (d < 0.95) {
        c = G.sea3;
        if (Math.sin(pxx * 0.2 - py * 0.1 + frame * 2.1) > 0.80) c = G.sea2;
      } else if (d < 1.02) {
        c = G.sand;
      } else if (d < 1.10) {
        // dithered sand-to-grass transition
        c = ((pxx / PS + py / PS) % 2 === 0) ? G.sandDk : G.g2;
      } else if (d < 1.18) {
        c = G.g2;
      }
      if (c) px(ctx, pxx, py, PS, PS, c);
    }
  }

  // lily pads
  const pads = [[-30, -10], [28, 8], [-6, 26], [18, -22]];
  pads.forEach(([ox, oy]) => {
    const lx = cx + ox, ly = cy + oy;
    // pad oval
    for (let dy = -4; dy <= 4; dy++) {
      const pw = Math.round(Math.sqrt(1 - (dy / 4) ** 2) * 10);
      const shade = dy < 0 ? '#4a9a50' : '#2d7030';
      px(ctx, lx - pw, ly + dy, pw * 2, 1, shade);
    }
    px(ctx, lx - 3, ly - 1, 6, 1, '#6ab860'); // highlight
    // small flower
    px(ctx, lx - 1, ly - 2, 2, 2, '#f8c0d0');
    px(ctx, lx,     ly - 3, 1, 1, '#ffffff');
  });

  tex.refresh();
}
