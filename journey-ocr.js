// Printed-dimension reader for scanned floor plans — machine-set digits only.
// No external model: glyphs are classified against synthetic templates rendered
// in-canvas from standard sans fonts, so every verdict is reproducible on-device.
const GX = 9, GY = 13;
let TPL = null, FONT = null;

/** Exemplar glyphs harvested from real sheets (plans/digit-font.json) — the HDB drafting
 *  font, self-calibrated from title-block numerical codes whose digits are known from the
 *  corpus filenames. Resets the template cache so exemplars join the pool. */
export function loadFontPack(pack) { FONT = pack && pack.glyphs ? pack.glyphs : pack; TPL = null; }

export function gridOf(d, w, h) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (d.data[(y * w + x) * 4] < 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0 || y1 - y0 < 4) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const v = new Float32Array(GX * GY);
  let vmax = 0;
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const ax = x0 + Math.floor(gx * bw / GX), bx = Math.max(x0 + Math.floor((gx + 1) * bw / GX), ax + 1);
    const ay = y0 + Math.floor(gy * bh / GY), by = Math.max(y0 + Math.floor((gy + 1) * bh / GY), ay + 1);
    let n = 0, k = 0;
    for (let y = ay; y < by && y <= y1; y++) for (let x = ax; x < bx && x <= x1; x++) { k++; if (d.data[(y * w + x) * 4] < 128) n++; }
    const val = k ? n / k : 0;
    v[gy * GX + gx] = val; if (val > vmax) vmax = val;
  }
  // normalize by peak cell: stroke WEIGHT cancels (thin single-stroke CAD digits vs filled
  // sans templates), leaving shape — without this every real HDB glyph fails the distance cut
  if (vmax > 0) for (let i = 0; i < v.length; i++) v[i] /= vmax;
  return { v, ar: bw / bh };
}

function templates() {
  if (TPL) return TPL;
  TPL = [];
  for (const font of ['Arial', 'Helvetica', 'Verdana', '"Courier New"']) for (const wgt of ['400', '700']) for (const px of [16, 22, 30]) for (const sx of [1, 0.82]) {
    // sx 0.82: condensed variants — CAD drafting fonts (HDB sheets) draw digits narrower
    // than regular sans faces; without these every real run fails the distance cut
    for (let dg = 0; dg <= 9; dg++) {
      const c = document.createElement('canvas'); c.width = 40; c.height = 48;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff'; g.fillRect(0, 0, 40, 48);
      g.fillStyle = '#000'; g.font = wgt + ' ' + px + 'px ' + font; g.textBaseline = 'middle'; g.textAlign = 'center';
      g.save(); g.scale(sx, 1); g.fillText(String(dg), 20 / sx, 24); g.restore();
      const t = gridOf(g.getImageData(0, 0, 40, 48), 40, 48);
      if (t) TPL.push({ dg, v: t.v, ar: t.ar });
    }
  }
  if (FONT) for (const [dg, grids] of Object.entries(FONT))
    for (const g of grids) TPL.push({ dg: +dg, v: Float32Array.from(g.v), ar: g.ar });
  return TPL;
}

function classify(cell) {
  let best = 1e9, b2 = 1e9, dg = -1;
  for (const t of templates()) {
    let s = 0;
    for (let i = 0; i < cell.v.length; i++) { const e = cell.v[i] - t.v[i]; s += e * e; }
    s = s / cell.v.length + Math.min(1, Math.abs(t.ar - cell.ar)) * 0.045;
    if (s < best) { if (t.dg !== dg) b2 = best; dg = t.dg; best = s; }
    else if (t.dg !== dg && s < b2) b2 = s;
  }
  return { dg, dist: best, margin: b2 - best };
}

/** Read candidate dimension figures (mm) off the sheet. Horizontal runs of 3–5
 *  clean digits only — rotated (vertical) figures are out of scope and said so. */
export async function readDimensions(src, thr = 165, lim = { dist: 0.19, margin: 0.002 }, SC = 2) {
  // dist 0.19: measured on the v2 corpus — true reads (9300, 6000, 2820) come in at ≤0.15
  // in this drafting font; misreads cluster above 0.2 and at 0.30 they started validating
  // against wrong archetypes by coincidence. The unvalidated 'printed' path stays at ≤0.12.
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('image load failed')); i.src = src; });
  const W = img.width * SC, H = img.height * SC, N = W * H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H), px = d.data;
  const ink = new Uint8Array(N);
  for (let i = 0, j = 0; i < N; i++, j += 4) if (px[j + 3] > 100 && (px[j] * 0.3 + px[j + 1] * 0.59 + px[j + 2] * 0.11) < thr) ink[i] = 1;
  const lbl = new Int32Array(N); let id = 0; const rawComps = [], stack = [], hist = {};
  for (let s0 = 0; s0 < N; s0++) {
    if (!ink[s0] || lbl[s0]) continue;
    id++; lbl[s0] = id; stack.length = 0; stack.push(s0);
    let x0 = W, x1 = 0, y0 = H, y1 = 0, area = 0;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p / W) | 0;
      area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && ink[p - 1] && !lbl[p - 1]) { lbl[p - 1] = id; stack.push(p - 1); }
      if (x < W - 1 && ink[p + 1] && !lbl[p + 1]) { lbl[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && ink[p - W] && !lbl[p - W]) { lbl[p - W] = id; stack.push(p - W); }
      if (y < H - 1 && ink[p + W] && !lbl[p + W]) { lbl[p + W] = id; stack.push(p + W); }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (h >= 3 && h <= 60 && w <= 60) hist[Math.min(59, h)] = (hist[Math.min(59, h)] || 0) + 1;
    // accept up to ~4 fused digits wide — HDB drafting figures touch ("2900" is one blob);
    // splitComp below cuts them at ink valleys
    if (h >= 8 && h <= 46 && w >= 3 && w <= h * 4.6 && area >= 10 && area <= w * h * 0.92)
      rawComps.push({ x0, x1, y0, y1, w, h, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
  }
  const splitComp = (k) => {
    if (k.w <= k.h * 1.2) return [k];
    const prof = new Int32Array(k.w);
    for (let x = k.x0; x <= k.x1; x++) for (let y = k.y0; y <= k.y1; y++) if (ink[y * W + x]) prof[x - k.x0]++;
    const spans = [];
    const rec = (a, b, depth) => {
      if (b - a + 1 <= k.h * 1.2 || depth > 3) { spans.push([a, b]); return; }
      const m = Math.max(3, Math.round(k.h * 0.35));
      let mi = -1, mv = 1e9;
      for (let x = a + m; x <= b - m; x++) if (prof[x] < mv) { mv = prof[x]; mi = x; }
      if (mi < 0 || mv > k.h * 0.35) { spans.push([a, b]); return; }
      rec(a, mi, depth + 1); rec(mi + 1, b, depth + 1);
    };
    rec(0, k.w - 1, 0);
    return spans.map(([a, b]) => {
      let x0 = k.x0 + a, x1 = k.x0 + b, y0 = k.y1, y1 = k.y0;
      for (let x = x0; x <= x1; x++) for (let y = k.y0; y <= k.y1; y++) if (ink[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    }).filter((s) => s.h >= 8 && s.h <= 46 && s.w >= 3 && s.w <= s.h * 1.25);
  };
  const comps = rawComps.flatMap(splitComp);
  comps.sort((a, b) => a.cx - b.cx);
  const used = new Uint8Array(comps.length), runs = [];
  for (let i = 0; i < comps.length; i++) {
    if (used[i]) continue;
    const run = [comps[i]]; let cur = comps[i];
    for (let j = i + 1; j < comps.length; j++) {
      if (used[j]) continue;
      const n = comps[j];
      if (Math.abs(n.cy - cur.cy) > cur.h * 0.45) continue;
      if (n.x0 < cur.x1 - 2 || n.x0 - cur.x1 > cur.h * 0.9) continue;
      if (n.h / cur.h > 1.45 || cur.h / n.h > 1.45) continue;
      run.push(n); used[j] = 1; cur = n;
    }
    if (run.length >= 3 && run.length <= 8) runs.push(run); // 8: title-block numerical codes (calibration); mm range filter keeps them out of reads
  }
  const reads = [], codes = [];
  const dbg = { runs: runs.length, rej_grid: 0, rej_dist: 0, rej_margin: 0, rej_range: 0, best_dists: [] };
  for (const run of runs) {
    let txt = '', ok = true, mMin = 1, dMax = 0;
    for (const ch of run) {
      const cell = gridOf(g.getImageData(ch.x0, ch.y0, ch.w, ch.h), ch.w, ch.h);
      if (!cell) { ok = false; dbg.rej_grid++; break; }
      const r = classify(cell);
      if (dbg.best_dists.length < 40) dbg.best_dists.push(+r.dist.toFixed(3));
      if (r.dg < 0 || r.dist > lim.dist) { ok = false; dbg.rej_dist++; break; }
      if (r.margin < lim.margin) { ok = false; dbg.rej_margin++; break; }
      txt += r.dg; mMin = Math.min(mMin, r.margin); dMax = Math.max(dMax, r.dist);
    }
    if (!ok) continue;
    if (run.length >= 7) { codes.push({ code: txt, conf: +mMin.toFixed(3) }); continue; } // title-block numerical codes — the sheet self-identifies
    const n = +txt;
    if (n >= 800 && n <= 20000) reads.push({ n, x: run[0].x0, y: run[0].y0, digits: run.length, conf: +mMin.toFixed(3), d: +dMax.toFixed(3) });
    else dbg.rej_range++;
  }
  reads.sort((a, b) => b.digits - a.digits || b.conf - a.conf);
  return { reads: reads.slice(0, 40), codes, glyph_candidates: comps.length, dbg: Object.assign(dbg, { hist }) };
}

/** Does any printed figure agree with an archetype scale? Failing that, can a
 *  4–5 digit figure serve as the printed overall width itself? */
export function confirmScale(reads, det, cands) {
  const pw = det.envelope.x1 - det.envelope.x0, ph = det.envelope.y1 - det.envelope.y0;
  let best = null;
  for (const c of cands || []) for (const rd of reads) {
    for (const [axis, pxLen] of [['width', pw], ['depth', ph]]) {
      const exp = pxLen * c.mmPerPx, err = Math.abs(rd.n - exp) / exp;
      if (err < 0.03 && (!best || err < best.err)) best = { kind: 'archetype', cand: c, mmPerPx: c.mmPerPx, read: rd, axis, err };
    }
  }
  if (best) return best;
  for (const rd of reads) {
    if (rd.digits < 4 || (rd.d || 0) > 0.12) continue; // unvalidated path: clean glyphs only
    const s = rd.n / pw, sqm = (pw * s / 1000) * (ph * s / 1000);
    if (s >= 4 && s <= 45 && sqm >= 25 && sqm <= 700) return { kind: 'printed', mmPerPx: s, read: rd, axis: 'width', err: 0 };
  }
  return null;
}
