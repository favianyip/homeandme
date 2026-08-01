// journey-vision.js — in-browser floor-plan detection: walls, rooms, openings, areas.
import { predictWallMask } from './journey-wallnet.js';
//
// Pipeline (classical CV on canvas pixels — no ML, every step inspectable):
//   1. threshold to ink            grey < 150 = drawn line
//   2. CLOSE (dilate+erode r2)     double-line partitions become solid strokes
//   3. OPEN  (erode+dilate r2)     kills dimension lines, door arcs, window lines, text strokes
//                                  → what survives is STRUCTURE (the wall mask)
//   4. envelope                    histogram of wall pixels per row/col (ignores title block)
//   5. dilate walls r4, flood-fill exterior from the border; remaining pockets = ROOMS
//                                  (the dilation closes ≤8px door openings so rooms don't leak)
//   6. openings                    gaps in the ORIGINAL wall mask between adjacent rooms,
//                                  and along the envelope (facade fenestration)
//   7. scale                       match envelope proportions against the archetype knowledge
//                                  distilled from the uploaded corpus; the customer confirms
//
// Output: a draft hnm-plan-scene floor (spaces in metres) the 3D engine can build — plus the
// masks, so the UI can show exactly what was detected and let a human correct it.

function morph1D(src, W, H, r, horiz, isErode) {
  const out = new Uint8Array(W * H);
  const len = horiz ? W : H, lines = horiz ? H : W;
  for (let l = 0; l < lines; l++) {
    for (let i = 0; i < len; i++) {
      let v = isErode ? 1 : 0;
      for (let d = -r; d <= r; d++) {
        const j = i + d;
        if (j < 0 || j >= len) { if (isErode) { v = 0; break; } continue; }
        const idx = horiz ? l * W + j : j * W + l;
        if (isErode) { if (!src[idx]) { v = 0; break; } }
        else if (src[idx]) { v = 1; break; }
      }
      out[horiz ? l * W + i : i * W + l] = v;
    }
  }
  return out;
}
const erode = (m, W, H, r) => morph1D(morph1D(m, W, H, r, true, true), W, H, r, false, true);
const dilate = (m, W, H, r) => morph1D(morph1D(m, W, H, r, true, false), W, H, r, false, false);
// Manhattan distance to the nearest mask pixel — O(N), radius-independent
function manhattanDT(mask, W, H) {
  const d = new Int32Array(W * H), INF = 1e9;
  for (let i = 0; i < W * H; i++) d[i] = mask[i] ? 0 : INF;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;
    if (x > 0 && d[i - 1] + 1 < d[i]) d[i] = d[i - 1] + 1;
    if (y > 0 && d[i - W] + 1 < d[i]) d[i] = d[i - W] + 1; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x;
    if (x < W - 1 && d[i + 1] + 1 < d[i]) d[i] = d[i + 1] + 1;
    if (y < H - 1 && d[i + W] + 1 < d[i]) d[i] = d[i + W] + 1; }
  return d;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image failed to load'));
    im.src = src;
  });
}

// Seal doorway gaps: a door pierces an otherwise straight wall run — bridge a gap ≤ G
// only when BOTH flanks continue colinear wall runs ≥ L in the same scan line. A bath's
// opposite jambs are cross-sections of PERPENDICULAR walls (run length ≈ wall thickness),
// so small rooms never seal shut.
function runSeal(mask, W, H, G, L, horiz, out) {
  const len = horiz ? W : H, lines = horiz ? H : W;
  for (let l = 0; l < lines; l++) {
    let runEnd = -1, runLen = 0, x = 0;
    while (x < len) {
      if (mask[horiz ? l * W + x : x * W + l]) {
        const s = x;
        while (x < len && mask[horiz ? l * W + x : x * W + l]) x++;
        const thisLen = x - s;
        if (runEnd >= 0) { const gap = s - runEnd - 1;
          if (gap > 0 && gap <= G && runLen >= L && thisLen >= L)
            for (let g = runEnd + 1; g < s; g++) out[horiz ? l * W + g : g * W + l] = 1;
        }
        runEnd = x - 1; runLen = thisLen;
      } else x++;
    }
  }
}

async function core(src, THR, close, wallModel, rotDeg) {
  const img = await loadImage(src);
  const k = Math.min(1, 1000 / img.naturalWidth);
  const iW = Math.max(1, Math.round(img.naturalWidth * k)), iH = Math.max(1, Math.round(img.naturalHeight * k));
  // Deskew happens HERE, before any thresholding, for two reasons. It is upstream of the envelope
  // and the room flood, which is where the previous attempt went wrong — rotating in Stage 2 could
  // not un-inflate an envelope already decided in Stage 1. And drawing through a canvas transform
  // resamples bilinearly, where the Stage 2 rotation was nearest-neighbour and stippled thin wall
  // ink badly enough to cost a click per sheet.
  const r = ((rotDeg || 0) * Math.PI) / 180;
  const ac = Math.abs(Math.cos(r)), as = Math.abs(Math.sin(r));
  const W = r ? Math.round(iW * ac + iH * as) : iW;
  const H = r ? Math.round(iW * as + iH * ac) : iH;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
  if (r) {
    cx.translate(W / 2, H / 2); cx.rotate(r);
    cx.drawImage(img, -iW / 2, -iH / 2, iW, iH);
    cx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    cx.drawImage(img, 0, 0, W, H);
  }
  const px = cx.getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    if (px[j + 3] > 100 && (px[j] * 0.3 + px[j + 1] * 0.59 + px[j + 2] * 0.11) < THR) ink[i] = 1;
  }
  // cancel printed wording: compact glyph components (room labels, dimension digits, notes)
  // otherwise pour into solid blobs under the closing morphology and mint walls in the middle
  // of rooms. A glyph is a component small in BOTH dimensions — window double-lines, door
  // leaves and dashed beams are long in one axis and survive.
  {
    const T = 13; // glyph size at the 1000px working width — absolute, so tall sheets don't overshoot and eat door leaves or window ticks
    const cc = new Uint8Array(W * H); const st = []; const comp = [];
    for (let s0 = 0; s0 < W * H; s0++) {
      if (!ink[s0] || cc[s0]) continue;
      cc[s0] = 1; st.length = 0; st.push(s0); comp.length = 0; comp.push(s0);
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      while (st.length) {
        const p = st.pop();
        const y = (p / W) | 0, x = p - y * W;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && ink[p - 1] && !cc[p - 1]) { cc[p - 1] = 1; st.push(p - 1); comp.push(p - 1); }
        if (x < W - 1 && ink[p + 1] && !cc[p + 1]) { cc[p + 1] = 1; st.push(p + 1); comp.push(p + 1); }
        if (p >= W && ink[p - W] && !cc[p - W]) { cc[p - W] = 1; st.push(p - W); comp.push(p - W); }
        if (p < W * H - W && ink[p + W] && !cc[p + W]) { cc[p + W] = 1; st.push(p + W); comp.push(p + W); }
      }
      const gw = x1 - x0 + 1, gh = y1 - y0 + 1;
      // letter-shaped only: dashes, jamb ticks and short wall ticks are thin in one dim and
      // MUST stay — they are barrier lines; removing them leaks the exterior flood into rooms
      if (gw <= T && gh <= T && gw >= 4 && gh >= 5 && comp.length >= 12) for (const p of comp) ink[p] = 0;
    }
  }
  const closed = erode(dilate(ink, W, H, 2), W, H, 2);
  // Structure source: classical morphology, or the learned wall-pixel model (trained on the
  // corpus) when a model is passed — prediction replaces STRUCTURE only; the segmentation
  // barrier below still uses every drawn line, so windows keep confining rooms.
  const wall = wallModel ? erode(dilate(predictWallMask(ink, W, H, wallModel), W, H, 2), W, H, 2)
    : dilate(erode(closed, W, H, 2), W, H, 2);
  // SEGMENTATION uses every drawn line as a barrier (windows and door leaves are thin lines —
  // erasing them lets the exterior flood in through every window and dissolve the rooms, the
  // failure mode measured on the corpus: 0 rooms detected). The thick mask is only for wall
  // rendering and opening scans.
  const barrier = dilate(closed, W, H, 2);
  // Region closing (opt-in second pass): newer HDB order sheets omit facade fin walls
  // ("refer to Block Plan") — the drawn envelope has REAL gaps and the exterior floods the
  // rooms. Plug any envelope gap narrower than ~2R at the facade plane, growing the exterior
  // back geodesically so it never crosses drawn ink; and seal arc-less doorway gaps that sit
  // in otherwise straight wall runs (colinear flanks ≥ L; a bath's perpendicular jambs never
  // qualify, so small rooms don't seal shut).
  const outside = new Uint8Array(W * H), doorSeal = new Uint8Array(W * H);
  if (close) {
    const R = Math.max(10, Math.round(Math.min(W, H) / 30));
    const dInk = manhattanDT(closed, W, H);
    const ext = new Uint8Array(W * H); const q = [];
    const push = (i) => { if (!ext[i] && dInk[i] > R) { ext[i] = 1; q.push(i); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (q.length) { const i = q.pop(); const x = i % W;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
      if (i >= W) push(i - W); if (i < W * H - W) push(i + W); }
    let frontier = [];
    for (let i = 0; i < W * H; i++) if (ext[i]) { outside[i] = 1; frontier.push(i); }
    for (let step = 0; step < R + 2 && frontier.length; step++) {
      const nxt = [];
      for (const i of frontier) { const x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i >= W ? i - W : -1, i < W * H - W ? i + W : -1])
          if (j >= 0 && !outside[j] && !closed[j]) { outside[j] = 1; nxt.push(j); }
      }
      frontier = nxt;
    }
    const G = Math.round(W * 0.10), L = Math.round(W * 0.04);
    runSeal(wall, W, H, G, L, true, doorSeal);
    runSeal(wall, W, H, G, L, false, doorSeal);
  }

  // envelope: rows/cols carrying real wall mass (title text below the plan never reaches 8px)
  const colN = new Int32Array(W), rowN = new Int32Array(H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (wall[y * W + x]) { colN[x]++; rowN[y]++; }
  const MIN = 8;
  // largest contiguous wall-mass band per axis — a title table or legend below the plan
  // carries wall-like borders but sits in its own band, separated by clear paper
  const band = (prof, n) => {
    const tol = Math.max(6, Math.round(n * 0.02));
    const segs = []; let s = -1, gap = 0;
    for (let i = 0; i < n; i++) {
      if (prof[i] >= MIN) { if (s < 0) s = i; gap = 0; }
      else if (s >= 0 && ++gap > tol) { segs.push([s, i - gap]); s = -1; }
    }
    if (s >= 0) segs.push([s, n - 1 - gap < s ? s : n - 1 - gap]);
    if (!segs.length) return [0, -1];
    const sum = ([a, b]) => { let t = 0; for (let i = a; i <= b; i++) t += prof[i]; return t; };
    const best = Math.max(...segs.map(sum));
    // keep every band with comparable mass (a lightly-inked plan fragments into several);
    // only genuinely minor bands — title tables, legends — fall below the cut
    const kept = segs.filter((g) => sum(g) >= best * 0.3);
    let a = Math.min(...kept.map((g) => g[0])), b = Math.max(...kept.map((g) => g[1]));
    while (b > a && prof[b] < MIN) b--; while (a < b && prof[a] < MIN) a++;
    return [a, b];
  };
  // Building envelope, structure-first: the flat is the union of LARGE thick-stroke connected
  // components. Dimension chains touch the walls only through 1–2px extension lines, which
  // break under erosion — so intact printed dimension chains (v2 corpus) no longer inflate
  // the envelope or mint phantom rooms between extension lines. Title-box borders and text
  // erode to small components and fall below the area cut. Falls back to the wall-mass band
  // method when erosion leaves nothing big (very light scans).
  const er1 = erode(closed, W, H, 1);
  const cc = new Int32Array(W * H), ccs = [], st2 = [];
  for (let s0 = 0; s0 < W * H; s0++) {
    if (!er1[s0] || cc[s0]) continue;
    const id2 = ccs.length + 1; cc[s0] = id2; st2.length = 0; st2.push(s0);
    let area = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (st2.length) {
      const p = st2.pop(); area++;
      const y = (p / W) | 0, x = p - y * W;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && er1[p - 1] && !cc[p - 1]) { cc[p - 1] = id2; st2.push(p - 1); }
      if (x < W - 1 && er1[p + 1] && !cc[p + 1]) { cc[p + 1] = id2; st2.push(p + 1); }
      if (p >= W && er1[p - W] && !cc[p - W]) { cc[p - W] = id2; st2.push(p - W); }
      if (p < W * H - W && er1[p + W] && !cc[p + W]) { cc[p + W] = id2; st2.push(p + W); }
    }
    ccs.push({ area, x0, x1, y0, y1 });
  }
  const big = ccs.length ? Math.max(...ccs.map((c) => c.area)) : 0;
  // keep every substantial component (a detached utility/WC wing erodes to a small CC but is
  // still the flat), then absorb mid-size components within a wall's reach of the kept region —
  // title blocks and legends sit much farther out and stay excluded.
  // keep every substantial component (a detached utility/WC wing erodes to a small CC but is
  // still the flat), then absorb mid-size components within a wall's reach of the kept region —
  // title blocks and legends sit much farther out and stay excluded.
  //
  // NOTE: an attempt to narrow this to proximity-accretion from the largest component was
  // reverted. It was written for sheets that showed a section drawing pulled into the envelope,
  // but it excluded legitimate eroded fragments of the flat, and because the loop below deletes
  // all wall ink outside the envelope it destroyed real doors: median clicks-to-fix across the
  // corpus went 4 → 5, worse on six sheets and better on none. Fixing envelope contamination
  // needs a sheet that exhibits it in the corpus to develop against; it cannot be done blind.
  const keptCC = ccs.filter((c) => c.area >= Math.max(400, big * 0.15));
  let ex0, ex1, ey0, ey1;
  if (keptCC.length && big >= 1200) {
    ex0 = Math.max(0, Math.min(...keptCC.map((c) => c.x0)) - 2);
    ex1 = Math.min(W - 1, Math.max(...keptCC.map((c) => c.x1)) + 2);
    ey0 = Math.max(0, Math.min(...keptCC.map((c) => c.y0)) - 2);
    ey1 = Math.min(H - 1, Math.max(...keptCC.map((c) => c.y1)) + 2);
  } else {
    const [bx0, bx1] = band(colN, W), [by0, by1] = band(rowN, H);
    ex0 = bx0; ex1 = bx1; ey0 = by0; ey1 = by1;
  }
  if (ex1 - ex0 < 40 || ey1 - ey0 < 40) return { error: 'no plan structure found — is this a floor plan drawing?' };

  // PLAN BODY, distinct from the envelope and deliberately so. The envelope must stay permissive
  // because the loop below deletes all ink outside it, and narrowing it destroyed real doors
  // (see the reverted attempt above). But SCALE and plan-type must not be computed from a box
  // that swallowed a title block. So: accrete from the largest component outward, admitting only
  // components within a short reach of what is already accreted. A title block or a legend sits
  // far out across clear paper and never joins. Nothing is deleted on the strength of this box —
  // it only decides which proportions the archetype matcher is shown.
  let body = { x0: ex0, x1: ex1, y0: ey0, y1: ey1, split: false };
  if (keptCC.length > 1 && big >= 1200) {
    const seed = keptCC.reduce((m, c) => (c.area > m.area ? c : m), keptCC[0]);
    const b = { x0: seed.x0, x1: seed.x1, y0: seed.y0, y1: seed.y1 };
    const rest = keptCC.filter((c) => c !== seed);
    for (let pass = 0; pass < 6; pass++) {
      const reach = Math.max(24, Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.08);
      let grew = false;
      for (let i = rest.length - 1; i >= 0; i--) {
        const c = rest[i];
        const gx = Math.max(0, Math.max(b.x0 - c.x1, c.x0 - b.x1));
        const gy = Math.max(0, Math.max(b.y0 - c.y1, c.y0 - b.y1));
        if (Math.hypot(gx, gy) > reach) continue;
        b.x0 = Math.min(b.x0, c.x0); b.x1 = Math.max(b.x1, c.x1);
        b.y0 = Math.min(b.y0, c.y0); b.y1 = Math.max(b.y1, c.y1);
        rest.splice(i, 1); grew = true;
      }
      if (!grew) break;
    }
    const shrunk = (b.x1 - b.x0) * (b.y1 - b.y0) < (ex1 - ex0) * (ey1 - ey0) * 0.92;
    if (b.x1 - b.x0 >= 40 && b.y1 - b.y0 >= 40) {
      body = { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, split: shrunk };
    }
  }

  // drop wall blobs outside the envelope (dimension ticks, title block frames) — and clear
  // the line BARRIER out there too: extension lines between the facade and a dimension chain
  // would otherwise seal that pocket off from the exterior flood and mint a phantom "room".
  // Outside the envelope only paper exists as far as segmentation is concerned.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (x < ex0 - 4 || x > ex1 + 4 || y < ey0 - 4 || y > ey1 + 4) { wall[y * W + x] = 0; barrier[y * W + x] = 0; }

  // room segmentation on the line barrier, confined to the closed region, doors sealed
  const wallD = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) wallD[i] = barrier[i] || outside[i] || doorSeal[i];
  const lbl = new Int32Array(W * H); // 0 = unvisited, -1 = exterior, n>0 = room id
  const stack = [];
  const flood = (sx, sy, id) => {
    stack.length = 0; stack.push(sy * W + sx); lbl[sy * W + sx] = id;
    let area = 0, x0 = sx, x1 = sx, y0 = sy, y1 = sy;
    while (stack.length) {
      const p = stack.pop(); area++;
      const y = (p / W) | 0, x = p - y * W;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && !lbl[p - 1] && !wallD[p - 1]) { lbl[p - 1] = id; stack.push(p - 1); }
      if (x < W - 1 && !lbl[p + 1] && !wallD[p + 1]) { lbl[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && !lbl[p - W] && !wallD[p - W]) { lbl[p - W] = id; stack.push(p - W); }
      if (y < H - 1 && !lbl[p + W] && !wallD[p + W]) { lbl[p + W] = id; stack.push(p + W); }
    }
    return { area, x0, x1, y0, y1 };
  };
  for (let x = 0; x < W; x++) { if (!lbl[x] && !wallD[x]) flood(x, 0, -1); if (!lbl[(H - 1) * W + x] && !wallD[(H - 1) * W + x]) flood(x, H - 1, -1); }
  for (let y = 0; y < H; y++) { if (!lbl[y * W] && !wallD[y * W]) flood(0, y, -1); if (!lbl[y * W + W - 1] && !wallD[y * W + W - 1]) flood(W - 1, y, -1); }
  const envArea = (ex1 - ex0) * (ey1 - ey0);
  const rooms = [];
  for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) {
    const p = y * W + x;
    if (!lbl[p] && !wallD[p]) {
      const r = flood(x, y, rooms.length + 1);
      // real rooms only: a WC is ~1.5 m² (≥ 0.6% of the envelope); door-arc pockets, text
      // islands and dimension slivers fall below that or fill their box poorly
      const fill = r.area / ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1));
      if (r.area >= Math.max(1200, envArea * 0.006) && fill >= 0.42) rooms.push(Object.assign({ id: rooms.length + 1 }, r));
      else { // reabsorb specks so they don't hold ids
        for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) if (lbl[yy * W + xx] === rooms.length + 1) lbl[yy * W + xx] = -2;
      }
    }
  }
  // grow bboxes back over the barrier dilation
  rooms.forEach((r) => { r.x0 = Math.max(ex0, r.x0 - 2); r.x1 = Math.min(ex1, r.x1 + 2); r.y0 = Math.max(ey0, r.y0 - 2); r.y1 = Math.min(ey1, r.y1 + 2); });

  // openings between adjacent rooms: gap runs in the ORIGINAL wall mask
  const openings = [];
  const gapRuns = (fixed0, fixed1, lo, hi, horiz, a, b) => {
    // only claim openings where the band substantially IS a wall — a partition too thin to
    // survive the thick mask must read "unknown", not "one giant opening"
    let covered = 0;
    for (let t = lo; t <= hi; t++) {
      for (let s = fixed0; s <= fixed1; s++) if (wall[horiz ? s * W + t : t * W + s]) { covered++; break; }
    }
    if (covered < (hi - lo) * 0.25) return;
    let run = null;
    const cap = a === 0 || b === 0 ? 150 : 90; // facade fenestration runs long (a 2 m window ≈ 120 px); interior door gaps: door + frame at coarse scales
    const push = (r) => { if (r[1] - r[0] >= 5 && r[1] - r[0] <= cap) openings.push({ horiz, at: (fixed0 + fixed1) / 2, f0: fixed0, f1: fixed1, from: r[0], to: r[1], between: [a, b] }); };
    for (let t = lo; t <= hi; t++) {
      let blocked = false;
      for (let s = fixed0; s <= fixed1; s++) { if (wall[horiz ? s * W + t : t * W + s]) { blocked = true; break; } }
      if (!blocked) { if (!run) run = [t, t]; else run[1] = t; }
      else if (run) { push(run); run = null; }
    }
    if (run) push(run);
  };
  const NEAR = Math.max(16, Math.min(50, Math.round(Math.min(ex1 - ex0, ey1 - ey0) * 0.08)));
  const clearStrip = (x0, x1, y0, y1, ids) => {
    const ix0 = x0 + 4, ix1 = x1 - 4, iy0 = y0 + 4, iy1 = y1 - 4; // forgive corner nicks from grown bboxes
    if (ix1 <= ix0 || iy1 <= iy0) return true; // strip thinner than the margin — nothing can hide in it
    return !rooms.some((o) => !ids.includes(o.id) && o.x0 < ix1 && o.x1 > ix0 && o.y0 < iy1 && o.y1 > iy0);
  };
  for (const a of rooms) for (const b of rooms) {
    if (b.id <= a.id) continue;
    const xo = [Math.max(a.x0, b.x0), Math.min(a.x1, b.x1)], yo = [Math.max(a.y0, b.y0), Math.min(a.y1, b.y1)];
    // adjacency is scale-aware: a poured party wall runs 17–47 px — a fixed 16 px gate made
    // most real door gaps invisible. The strip guard keeps corridor-separated pairs out.
    if (xo[1] - xo[0] > 14 && a.y1 < b.y0 && b.y0 - a.y1 < NEAR && clearStrip(xo[0] + 3, xo[1] - 3, a.y1, b.y0, [a.id, b.id])) gapRuns(a.y1, b.y0, xo[0] + 3, xo[1] - 3, true, a.id, b.id);
    if (yo[1] - yo[0] > 14 && a.x1 < b.x0 && b.x0 - a.x1 < NEAR && clearStrip(a.x1, b.x0, yo[0] + 3, yo[1] - 3, [a.id, b.id])) gapRuns(a.x1, b.x0, yo[0] + 3, yo[1] - 3, false, a.id, b.id);
  }
  // facade fenestration: gaps between each envelope-touching room and the outside. The gate
  // is scale-aware — a poured exterior wall band runs 17–47 px thick, so a fixed 10 px gate
  // means the scan never runs. Guard: skip a side when another room sits in the scan strip.
  for (const r of rooms) {
    if (r.y0 - ey0 < NEAR && clearStrip(r.x0 + 3, r.x1 - 3, ey0, r.y0, [r.id])) gapRuns(ey0 - 2, r.y0 + 2, r.x0 + 3, r.x1 - 3, true, 0, r.id);
    if (ey1 - r.y1 < NEAR && clearStrip(r.x0 + 3, r.x1 - 3, r.y1, ey1, [r.id])) gapRuns(r.y1 - 2, ey1 + 2, r.x0 + 3, r.x1 - 3, true, r.id, 0);
    if (r.x0 - ex0 < NEAR && clearStrip(ex0, r.x0, r.y0 + 3, r.y1 - 3, [r.id])) gapRuns(ex0 - 2, r.x0 + 2, r.y0 + 3, r.y1 - 3, false, 0, r.id);
    if (ex1 - r.x1 < NEAR && clearStrip(r.x1, ex1, r.y0 + 3, r.y1 - 3, [r.id])) gapRuns(r.x1 - 2, ex1 + 2, r.y0 + 3, r.y1 - 3, false, r.id, 0);
  }
  return { W, H, ink, wall, lbl, rooms, openings, body, skewDeg: rotDeg || 0, W0: iW, H0: iH,
    envelope: { x0: ex0, x1: ex1, y0: ey0, y1: ey1 } };
}

/** Dominant skew of the plan body, by projection-profile energy.
 *  A long wall aligned to a candidate axis piles into ONE projection bin and scores quadratically;
 *  scattered annotation, dimension ticks and title text spread across bins and score almost
 *  nothing. Length beats count — which is the property a per-pixel gradient histogram lacks, and
 *  why the earlier estimator read 0° on a sheet visibly 25° off axis. Returns the angle and its
 *  energy gain over 0°, so the caller can rotate only when alignment measurably improves. */
export function planSkew(mask, W, e) {
  const mx = Math.round((e.x1 - e.x0) * 0.03), my = Math.round((e.y1 - e.y0) * 0.03);
  const x0 = e.x0 + mx, x1 = e.x1 - mx, y0 = e.y0 + my, y1 = e.y1 - my;
  if (x1 - x0 < 40 || y1 - y0 < 40) return { deg: 0, gain: 1 };
  const step = Math.max(1, Math.round(Math.max(x1 - x0, y1 - y0) / 300));
  const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, pts = [];
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) if (mask[y * W + x]) pts.push((x - cxm) / step, (y - cym) / step);
  }
  if (pts.length < 200) return { deg: 0, gain: 1 };
  const R = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step / 2) + 2;
  const bins = 2 * R + 1, pu = new Float64Array(bins), pv = new Float64Array(bins);
  const score = (deg) => {
    const r = (deg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
    pu.fill(0); pv.fill(0);
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i], y = pts[i + 1];
      pu[R + Math.round(x * cos + y * sin)]++;
      pv[R + Math.round(y * cos - x * sin)]++;
    }
    let s = 0;
    for (let i = 0; i < bins; i++) s += pu[i] * pu[i] + pv[i] * pv[i];
    return s;
  };
  const base = score(0);
  let best = base, bd = 0;
  for (let d = -44; d <= 44; d += 0.5) {
    if (!d) continue;
    const s = score(d);
    if (s > best) { best = s; bd = d; }
  }
  return { deg: bd, gain: base > 0 ? best / base : 1 };
}

/** What kind of sheet is this, and did we read it? Applying flat priors — two WCs, 0.85 m interior
 *  doors, a 20-archetype scale library — to a commercial floor plate produced a 29 m² bedroom and a
 *  31 m² toilet, stated with full confidence. Refusing clearly is a better product than that.
 *
 *  Two kinds of evidence, and they must NOT be pooled. Coverage and space count say "we could not
 *  read this sheet"; drawings outside the body, heavy skew and impossible size say "this is not a
 *  flat". Pooling them told a genuine HDB sheet from our own corpus that it wasn't an HDB plan,
 *  purely because our trace of it failed — blaming the user's file for our own defect. So a
 *  not-a-flat claim now REQUIRES at least one sheet-type signal.
 *
 *  Both tests are ratios, not absolute sizes. Measured on the Marina sheet the absolute tests were
 *  useless: scale itself was wrong (14.04 mm/px) so every area test compared against a fiction.
 *  A wrong ruler cancels out of a ratio. */
export function planTypeCheck(det, mmPerPx) {
  const b = det.body || det.envelope;
  const bodyPx = Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
  const roomPx = (det.rooms || []).reduce((s, r) => s + (r.area || 0), 0);
  const cov = roomPx / bodyPx;
  const n = (det.rooms || []).length;
  // Slivers are counted but NOT allowed to refuse a sheet on their own. Excluding them outright
  // flipped a good HDB sheet (1482a0b19ffb: 5 rooms, 3 habitable) from ok to unreadable, and no
  // dimension floor separates the cases — the sheet we wanted to refuse has 0.98–1.00 m slivers,
  // this one has real 1.0–1.2 m spaces. So the observation only ever corroborates.
  const habitable = (det.rooms || []).filter((r) => {
    const w = ((r.x1 - r.x0) * mmPerPx) / 1000, h = ((r.y1 - r.y0) * mmPerPx) / 1000;
    return Math.min(w, h) >= 1.2;
  }).length;
  const unread = [], type = [];
  if (cov < 0.45) unread.push('only ' + Math.round(cov * 100) + '% of it resolved into rooms');
  if (n < 4) unread.push('only ' + n + (n === 1 ? ' space' : ' spaces') + ' could be traced');
  if (det.body && det.body.split) type.push('the sheet carries drawings outside the plan body');
  if (Math.abs(det.skewDeg || 0) > 12) type.push('the plan sits ' + Math.round(Math.abs(det.skewDeg)) + '° off axis');
  const m2 = (bodyPx * mmPerPx * mmPerPx) / 1e6;
  if (m2 > 220) type.push('the plan body works out at ' + Math.round(m2) + ' m² — larger than any HDB flat');
  if (type.length && habitable < 4 && n >= 4) {
    type.push('only ' + habitable + ' of its ' + n + ' spaces are wide enough to stand in');
  }
  // A not-a-flat verdict needs sheet-type evidence. Trace failures alone mean we failed, not the sheet.
  const kind = type.length && unread.length + type.length >= 2 ? 'not-unit'
    : unread.length >= 2 ? 'unreadable' : 'ok';
  return { kind, isUnitPlan: kind !== 'not-unit', why: type.concat(unread), coverage: +cov.toFixed(2) };
}

/** Cascade: plain read first (threshold 150), then light-ink and region-closing passes for
 *  sheets the plain read fails on — keep the best-scoring result. Scoring prefers a plausible
 *  room count (5–16) and a credible main space (biggest room 8–40% of the envelope). */
export async function analysePlan(src, opts) {
  const score = (d) => {
    if (!d || d.error) return -1;
    const env = d.envelope ? (d.envelope.x1 - d.envelope.x0) * (d.envelope.y1 - d.envelope.y0) : 1;
    // credible rooms only — sliver fragments must not let a fragmented pass masquerade as a
    // plausible 5–16 room read and stop the cascade before the clean pass runs
    const cred = d.rooms.filter((r) => {
      const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
      return r.area >= env * 0.008 && Math.max(w, h) <= Math.min(w, h) * 6;
    });
    const n = cred.length;
    let s = n >= 5 && n <= 16 ? 2 : n > 0 ? 1 : 0;
    if (n) { const mx = Math.max(...cred.map((r) => r.area)) / env;
      if (mx >= 0.08 && mx <= 0.40) s += 1; }
    const sliv = d.rooms.length - n;
    s -= Math.min(2, 0.4 * sliv); // proportional: fragmented reads sink below clean ones
    d._sliverFree = sliv === 0;
    return s;
  };
  let best = null;
  const passes = [[150, false, null], [150, true, null], [205, false, null], [205, true, null]];
  if (opts && opts.wallModel) passes.push([205, false, opts.wallModel], [205, true, opts.wallModel]);
  for (const [thr, close, mdl] of passes) {
    let d = null; try { d = await core(src, thr, close, mdl); } catch (e) { d = { error: e.message, rooms: [] }; }
    const s = score(d);
    if (!best || s > best.s) best = { d, s, p: [thr, close, mdl] };
    if (best.s >= 3 && best.d && best.d._sliverFree) break; // early exit only on a clean, sliver-free read
  }
  // Deskew retry, self-validating. Estimate the plan body's skew from the winning read and, if it
  // is real, run that same pass again on a rotated raster — keeping the result only when it scores
  // BETTER. A sheet already square to its page peaks at 0° and never reaches this branch, so the
  // corpus cannot regress; a rotated sheet gets its envelope and rooms found in the square frame.
  if (best && best.d && !best.d.error && (!opts || opts.deskew !== false)) {
    const sk = planSkew(best.d.wall, best.d.W, best.d.envelope);
    if (Math.abs(sk.deg) >= 1.5 && Math.abs(sk.deg) <= 44 && sk.gain >= 1.12) {
      let rd = null;
      try { rd = await core(src, best.p[0], best.p[1], best.p[2], -sk.deg); } catch (e) { rd = null; }
      const rs = score(rd);
      // The cascade score counts rooms, not openings, so a rotated read can score higher while
      // quietly losing doors — measured, on two corpus sheets, 8 → 5 and 9 → 5. Openings are the
      // thing walkability depends on, so the rotation must not cost any.
      const keep = rd && !rd.error && rs > best.s
        && (rd.openings || []).length >= (best.d.openings || []).length;
      if (keep) best = { d: rd, s: rs, p: best.p };
    }
  }
  if (best.d && !best.d.error) { pruneFixtures(best.d); smoothWalls(best.d); fillFloorHoles(best.d); growFloors(best.d); findFacadeWindows(best.d); }
  return best.d;
}

/** Grow room labels into the unclaimed 1–3 px fringe left along walls by smoothing and under
 *  scrubbed ink, so floors meet walls without cracks. Single-owner rule per step — growth
 *  never crosses a doorway into another room. */
export function growFloors(det) {
  const { W, lbl, wall } = det, e = det.envelope;
  for (let it = 0; it < 3; it++) {
    const claims = [];
    for (let y = e.y0 + 1; y < e.y1; y++) for (let x = e.x0 + 1; x < e.x1; x++) {
      const p = y * W + x;
      if (lbl[p] > 0 || wall[p] || lbl[p] === -1) continue;
      let id = 0, multi = false;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        const v = lbl[q];
        if (v > 0) { if (id && v !== id) multi = true; id = v; }
      }
      if (id && !multi) claims.push([p, id]);
    }
    if (!claims.length) break;
    for (const [p, id] of claims) lbl[p] = id;
  }
}

/** Interior door widths in metres — HDB guideline sanity: entrance ≈ 1.0 m, room doors
 *  ≈ 0.8–0.9 m, WC ≈ 0.7 m. A median far outside that band means the scale is wrong. */
/** HDB guideline minimum: an interior doorway below 0.8 m clear cannot fit a person (or a
 *  wheelchair) — widen the traced void symmetrically to 0.85 m. Mutates the wall mask inside
 *  the opening's own band only; runs once per detection. */
export function widenDoors(det, mmPerPx) {
  if (det._doorsWidened || !mmPerPx) return;
  det._doorsWidened = true;
  const mm = mmPerPx / 1000, W = det.W;
  for (const o of det.openings) {
    if (!o.between || o.between[0] === 0 || o.between[1] === 0 || o.f0 == null) continue;
    const clear = (o.to - o.from + 1 + 6) * mm;
    if (clear >= 0.8) continue;
    const grow = Math.max(0, Math.round(0.85 / mm) - 6 - (o.to - o.from + 1));
    if (!grow) continue;
    const g0 = Math.floor(grow / 2);
    const nf = Math.max(o.f0 != null ? 1 : 1, o.from - g0), nt = o.to + (grow - g0);
    for (let t = nf; t <= nt; t++) for (let s = o.f0; s <= o.f1; s++) {
      const p = o.horiz ? s * W + t : t * W + s;
      if (p >= 0 && p < det.wall.length) det.wall[p] = 0;
    }
    o.from = nf; o.to = nt; o._widened = true;
  }
}

/** Classify wall ink by local thickness (the red/blue diagnostic convention): structural RC
 *  prints ≥ ~130 mm thick, hollow partitions ~100 mm. det.wallClass: 2 = structural (red),
 *  1 = partition (blue). Returns the structural share of wall mass. */
export function classifyWalls(det, mmPerPx) {
  const { W, H, wall } = det, mm = mmPerPx / 1000;
  const hR = new Int32Array(W * H), vR = new Int32Array(W * H);
  for (let y = 0; y < H; y++) { let s = -1; for (let x = 0; x <= W; x++) { if (x < W && wall[y * W + x]) { if (s < 0) s = x; } else if (s >= 0) { const len = x - s; for (let k = s; k < x; k++) hR[y * W + k] = len; s = -1; } } }
  for (let x = 0; x < W; x++) { let s = -1; for (let y = 0; y <= H; y++) { if (y < H && wall[y * W + x]) { if (s < 0) s = y; } else if (s >= 0) { const len = y - s; for (let k = s; k < y; k++) vR[k * W + x] = len; s = -1; } } }
  const cls = new Uint8Array(W * H);
  let sPx = 0, pPx = 0;
  for (let i = 0; i < W * H; i++) if (wall[i]) {
    if (Math.min(hR[i], vR[i]) * mm >= 0.13) { cls[i] = 2; sPx++; } else { cls[i] = 1; pPx++; }
  }
  det.wallClass = cls;
  det.structFrac = sPx + pPx ? sPx / (sPx + pPx) : 0;
  return det.structFrac;
}

export function doorStats(det, mmPerPx) {
  const mm = mmPerPx / 1000, BLEED = 3; // closing (r=2) + smoothing narrow every gap ~3 px per side
  const widths = det.openings.filter((o) => o.between && o.between[0] !== 0 && o.between[1] !== 0)
    .map((o) => (o.to - o.from + 1 + 2 * BLEED) * mm).sort((a, b) => a - b);
  const median = widths.length ? widths[widths.length >> 1] : 0;
  return { widths, median };
}

/** 3×3 majority smoothing on the wall mask: kills the 1 px staircase jitter along wall faces
 *  (the "not clean" look in 3D) without moving real geometry — door gaps (≥5 px) and wall
 *  cores (≥4 px) survive a majority-of-9 vote; only edge noise flips. */
export function smoothWalls(det) {
  const { W } = det, e = det.envelope, w0 = det.wall;
  const out = w0.slice();
  for (let pass = 0; pass < 2; pass++) {
    const src = pass ? out.slice() : w0;
    for (let y = e.y0 + 1; y < e.y1; y++) for (let x = e.x0 + 1; x < e.x1; x++) {
      const p = y * W + x;
      const n = src[p - 1 - W] + src[p - W] + src[p + 1 - W] + src[p - 1] + src[p] + src[p + 1] + src[p - 1 + W] + src[p + W] + src[p + 1 + W];
      out[p] = n >= 5 ? 1 : 0;
    }
  }
  det.wall = out;
}

/** Fill enclosed floor pockets: door-swing arcs, fixture footprints and label shadows punch
 *  holes in a room's flooded region — any unclaimed interior pocket whose only neighbour is a
 *  single room (never the exterior) IS that room's floor. Cuts floor fragmentation ~10×. */
export function fillFloorHoles(det) {
  const { W, H, lbl, wall } = det, e = det.envelope;
  const cc = new Uint8Array(W * H); const st = [];
  for (let y = e.y0; y <= e.y1; y++) for (let x = e.x0; x <= e.x1; x++) {
    const s0 = y * W + x;
    if (cc[s0] || wall[s0] || lbl[s0] > 0 || lbl[s0] === -1) continue;
    cc[s0] = 1; st.length = 0; st.push(s0);
    const px = [s0]; const owners = new Set(); let open = false;
    while (st.length) {
      const p = st.pop();
      const py = (p / W) | 0, px2 = p - py * W;
      if (px2 <= e.x0 || px2 >= e.x1 || py <= e.y0 || py >= e.y1) open = true;
      const nbrs = [px2 > 0 ? p - 1 : -1, px2 < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < W * H - W ? p + W : -1];
      for (const q of nbrs) {
        if (q < 0) continue;
        if (lbl[q] > 0) owners.add(lbl[q]);
        else if (lbl[q] === -1) open = true;
        else if (!wall[q] && !cc[q]) { cc[q] = 1; st.push(q); px.push(q); }
      }
    }
    if (!open && owners.size === 1) {
      const id = owners.values().next().value;
      for (const p of px) lbl[p] = id;
    }
  }
}

/** Split fixture ink (toilets, basins, counters, free-standing casework) out of the wall mask:
 *  wall components that neither touch the envelope frame nor reach wall-network size are
 *  fixtures — kept in det.fixtures to render as low furniture, never full-height columns. */
export function pruneFixtures(det) {
  const { W, H, wall } = det, e = det.envelope;
  const cc = new Int32Array(W * H), comps = [], st = [];
  for (let y = e.y0; y <= e.y1; y++) for (let x = e.x0; x <= e.x1; x++) {
    const s0 = y * W + x;
    if (!wall[s0] || cc[s0]) continue;
    const id = comps.length + 1; cc[s0] = id; st.length = 0; st.push(s0);
    let area = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (st.length) {
      const p = st.pop(); area++;
      const py = (p / W) | 0, px = p - py * W;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px > e.x0 && wall[p - 1] && !cc[p - 1]) { cc[p - 1] = id; st.push(p - 1); }
      if (px < e.x1 && wall[p + 1] && !cc[p + 1]) { cc[p + 1] = id; st.push(p + 1); }
      if (py > e.y0 && wall[p - W] && !cc[p - W]) { cc[p - W] = id; st.push(p - W); }
      if (py < e.y1 && wall[p + W] && !cc[p + W]) { cc[p + W] = id; st.push(p + W); }
    }
    comps.push({ id, area, x0, x1, y0, y1 });
  }
  det.fixtures = new Uint8Array(W * H);
  if (!comps.length) return;
  const maxA = Math.max(...comps.map((c) => c.area));
  const envMax = Math.max(e.x1 - e.x0, e.y1 - e.y0);
  const fix = new Set(), drop = new Set();
  for (const c of comps) {
    const touches = c.x0 <= e.x0 + 3 || c.x1 >= e.x1 - 3 || c.y0 <= e.y0 + 3 || c.y1 >= e.y1 - 3;
    const bboxMax = Math.max(c.x1 - c.x0, c.y1 - c.y0);
    if (touches) { if (c.area < 60 && bboxMax <= 14) drop.add(c.id); continue; } // border ticks: dimension stubs, not wall fins
    if (c.area < 25) { drop.add(c.id); continue; } // specks: neither wall nor furniture
    if (c.area < maxA * 0.02 && bboxMax < envMax * 0.12) fix.add(c.id);
  }
  if (!fix.size && !drop.size) return;
  for (let y = e.y0; y <= e.y1; y++) for (let x = e.x0; x <= e.x1; x++) {
    const p = y * W + x, id = cc[p];
    if (!id) continue;
    if (drop.has(id)) wall[p] = 0;
    else if (fix.has(id)) { det.fixtures[p] = 1; wall[p] = 0; }
  }
}

/** Recover double-line window symbols that morphology merges into solid wall: along each
 *  facade band, columns whose INK profile is 2+ thin parallel lines (never one poured mass)
 *  for a sustained run are fenestration. Added as facade openings (between exterior 0 and the
 *  room), which the 3D build already renders as glass + sill. */
export function findFacadeWindows(det) {
  const { W, H, ink, wall, rooms, openings } = det, e = det.envelope;
  const clash = (horiz, at, f, t) => openings.some((o) => o.horiz === horiz && Math.abs(o.at - at) < 9 && Math.min(o.to, t) - Math.max(o.from, f) > 3);
  const scan = (f0, f1, lo, hi, horiz, rid) => {
    const at = (f0 + f1) / 2;
    let run = null;
    const flush = () => {
      if (run && run[1] - run[0] >= 14 && run[1] - run[0] <= 220 && !clash(horiz, at, run[0], run[1]))
        openings.push({ horiz, at, from: run[0], to: run[1], between: [0, rid] });
      run = null;
    };
    for (let t = lo; t <= hi; t++) {
      let runs = 0, cur = 0, maxRun = 0, white = 0, gapOk = false, prev = false, hasWall = false;
      for (let s = f0; s <= f1; s++) {
        const p = horiz ? s * W + t : t * W + s;
        if (wall[p]) hasWall = true;
        if (ink[p]) { if (!prev && runs >= 1 && white >= 2) gapOk = true; cur++; if (cur > maxRun) maxRun = cur; if (!prev) runs++; prev = true; white = 0; }
        else { prev = false; cur = 0; white++; }
      }
      const isWin = hasWall && runs >= 2 && maxRun <= 4 && gapOk;
      if (isWin) { if (!run) run = [t, t]; else run[1] = t; }
      else flush();
    }
    flush();
  };
  const NEAR = Math.min(50, Math.round(Math.min(e.x1 - e.x0, e.y1 - e.y0) * 0.08));
  const clearStrip = (x0, x1, y0, y1, self) => !rooms.some((o) => o.id !== self && o.x0 < x1 && o.x1 > x0 && o.y0 < y1 && o.y1 > y0);
  for (const r of rooms) {
    if (r.y0 - e.y0 < NEAR && clearStrip(r.x0 + 3, r.x1 - 3, e.y0, r.y0, r.id)) scan(Math.max(0, e.y0 - 3), r.y0 + 4, r.x0 + 3, r.x1 - 3, true, r.id);
    if (e.y1 - r.y1 < NEAR && clearStrip(r.x0 + 3, r.x1 - 3, r.y1, e.y1, r.id)) scan(r.y1 - 4, Math.min(H - 1, e.y1 + 3), r.x0 + 3, r.x1 - 3, true, r.id);
    if (r.x0 - e.x0 < NEAR && clearStrip(e.x0, r.x0, r.y0 + 3, r.y1 - 3, r.id)) scan(Math.max(0, e.x0 - 3), r.x0 + 4, r.y0 + 3, r.y1 - 3, false, r.id);
    if (e.x1 - r.x1 < NEAR && clearStrip(r.x1, e.x1, r.y0 + 3, r.y1 - 3, r.id)) scan(r.x1 - 4, Math.min(W - 1, e.x1 + 3), r.y0 + 3, r.y1 - 3, false, r.id);
  }
}

/** Small-cell correction: a 1–7 m² cell whose region contains fixture ink (a toilet or basin
 *  was drawn in it) is a BATH / WC, whatever the geometric prior guessed. */
export function refineSmallCells(det, names, mmPerPx) {
  if (!det || !mmPerPx) return names;
  const mm = mmPerPx / 1000;
  let wcBudget = 2 - det.rooms.filter((r) => names[r.id] === 'BATH / WC').length; // HDB flats carry 2 sanitary cells — never mint more
  if (wcBudget <= 0) return names;
  const cand = [];
  for (const r of det.rooms) {
    const a = (r.x1 - r.x0) * (r.y1 - r.y0) * mm * mm;
    if (a < 0.8 || a > 7.5) continue;
    if (/BEDROOM|KITCHEN|LIVING|BALCONY|YARD|BATH/.test(names[r.id] || '')) continue;
    const rw = r.x1 - r.x0, rh = r.y1 - r.y0, e2 = det.envelope;
    const hugs = r.x0 - e2.x0 < 10 || e2.x1 - r.x1 < 10 || r.y0 - e2.y0 < 10 || e2.y1 - r.y1 < 10;
    if (hugs && Math.max(rw, rh) >= Math.max(1, Math.min(rw, rh)) * 3.5) continue;
    const bx = Math.round(rw * 0.15), by = Math.round(rh * 0.15);
    let fx = 0;
    for (let y = r.y0 + by; y <= r.y1 - by; y++) for (let x = r.x0 + bx; x <= r.x1 - bx; x++) {
      const p = y * det.W + x;
      if ((det.fixtures && det.fixtures[p]) || (det.ink[p] && det.lbl[p] !== r.id)) fx++;
    }
    const dens = fx * mm * mm;
    if (dens > 0.04) cand.push({ id: r.id, dens });
  }
  cand.sort((p, q) => q.dens - p.dens).slice(0, wcBudget).forEach((c) => { names[c.id] = 'BATH / WC'; });
  return names;
}

/** Scale candidates: which archetype envelope explains these pixel proportions?
 *  Measured on the sheet ENVELOPE, not the plan body. Tried the body and it was worse: the
 *  archetype envelopes are calibrated against the full traced extent, so handing the matcher a
 *  tighter box shifts the proportions and picks a different archetype — area error went 0% → 17%
 *  on one corpus sheet and appeared on three others. The body box is kept for plan-typing only. */
export function scaleCandidates(det, archetypes) {
  const pw = det.envelope.x1 - det.envelope.x0, ph = det.envelope.y1 - det.envelope.y0;
  const out = [];
  for (const a of (archetypes || [])) for (const [w, d] of a.envelopes_m) {
    for (const [ew, ed] of [[w, d], [d, w]]) {
      const s1 = ew * 1000 / pw, s2 = ed * 1000 / ph;
      const skew = Math.abs(s1 - s2) / Math.max(s1, s2);
      if (skew < 0.07) out.push({ name: a.name, flat_type: a.flat_type, mmPerPx: (s1 + s2) / 2, skew, env: [ew, ed] });
    }
  }
  return out.sort((x, y) => x.skew - y.skew).slice(0, 5);
}

/** Draft plan-scene floor from a detection + confirmed scale (mm per px). */
export function toPlanDoc(det, mmPerPx, names) {
  const m = (v) => +(v * mmPerPx / 1000).toFixed(2);
  const { x0, y0 } = det.envelope;
  const spaces = det.rooms.map((r, i) => {
    const name = (names && names[r.id]) || guessName(det, r);
    return {
      key: `r${r.id}`, lbl: name,
      x: m(r.x0 - x0), z: m(r.y0 - y0), w: m(r.x1 - r.x0), d: m(r.y1 - r.y0),
      aux: /BATH|STORE|SHELTER|YARD|HALL/.test(name) ? 1 : undefined,
      pass: /HALL|FOYER/.test(name) ? 1 : undefined,
    };
  });
  return {
    schema: 'hnm-plan-scene/2', plan_id: 'detected-' + Date.now(), display_name: 'DETECTED FROM UPLOADED PLAN',
    provenance: 'AUTO-DETECTED FROM CUSTOMER UPLOAD — CONFIRM BEFORE USE',
    trace_confidence: 'low', source_type: 'auto_detection',
    detection: { rooms: det.rooms.length, openings: det.openings.length, mm_per_px: +mmPerPx.toFixed(2) },
    floors: [{
      width_m: m(det.envelope.x1 - x0), depth_m: m(det.envelope.y1 - y0),
      voids: [], spaces,
    }],
  };
}

/** Journey-ready document: same spaces grammar as plans/*.json, plus the flags
 *  createModel needs — priced-room ids, door walls, facade flip — so a detected
 *  plan builds through the SAME 3D path as the catalog layouts. */
export function toJourneyDoc(det, mmPerPx, names) {
  const env = det.envelope, m = (v) => +(v * mmPerPx / 1000).toFixed(2);
  const fac = det.openings.filter((o) => o.between && o.between[1] === 0 && o.horiz);
  const midY = (env.y0 + env.y1) / 2;
  const flip = fac.filter((o) => o.at > midY).length >= fac.filter((o) => o.at < midY).length;
  const A = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
  const ordered = [...det.rooms].sort((a, b) => A(b) - A(a));
  const pool = { living: 1, kitchen: 1, family: 1, master: 1, common: 1, common2: 1, study: 1 };
  const spaces = ordered.map((r) => {
    const name = (names && names[r.id]) || guessName(det, r);
    const sp = { key: 'r' + r.id, lbl: name, x: m(r.x0 - env.x0), z: flip ? m(env.y1 - r.y1) : m(r.y0 - env.y0), w: m(r.x1 - r.x0), d: m(r.y1 - r.y0) };
    if (/HALL|FOYER|CORRIDOR|PASSAGE/.test(name)) { sp.pass = 1; return sp; }
    if (/SHELTER/.test(name)) { sp.key = 'hs'; sp.aux = 1; return sp; }
    if (/BATH/.test(name)) { sp.pid = 'bath'; return sp; }
    if (/STORE|UTILITY|YARD|BALCONY|A\/C|LEDGE|WC/.test(name)) { sp.aux = 1; return sp; }
    if (/KITCHEN/.test(name) && pool.kitchen) { sp.pid = 'kitchen'; pool.kitchen = 0; return sp; }
    if (/LIVING|DINING/.test(name)) {
      const nx = pool.living ? 'living' : pool.family ? 'family' : null;
      if (nx) { sp.pid = nx; pool[nx] = 0; }
      return sp;
    }
    if (/MAIN BEDROOM|MASTER/.test(name) && pool.master) { sp.pid = 'master'; pool.master = 0; return sp; }
    if (/BED/.test(name)) {
      const nx = pool.master ? 'master' : pool.common ? 'common' : pool.common2 ? 'common2' : pool.study ? 'study' : null;
      if (nx) { sp.pid = nx; pool[nx] = 0; }
      return sp;
    }
    return sp;
  });
  // door walls: each room opens toward the corridor, else the living space, else its widest-doored neighbour
  const byId = {}; det.rooms.forEach((r) => { byId[r.id] = r; });
  const spById = {}; spaces.forEach((sp) => { spById[+sp.key.replace(/\D/g, '')] = sp; });
  const sideOf = (o, r) => {
    if (o.horiz) return Math.abs(o.at - r.y0) < Math.abs(o.at - r.y1) ? (flip ? 'N' : 'S') : (flip ? 'S' : 'N');
    return Math.abs(o.at - r.x0) < Math.abs(o.at - r.x1) ? 'W' : 'E';
  };
  spaces.forEach((sp) => {
    if (sp.pass) return;
    const id = +sp.key.replace(/\D/g, ''), r = byId[id];
    if (!r) return;
    const opts = det.openings.filter((o) => o.between && o.between[0] > 0 && o.between[1] > 0 && (o.between[0] === id || o.between[1] === id));
    if (!opts.length) return;
    const rank = (o) => { const other = spById[o.between[0] === id ? o.between[1] : o.between[0]]; if (!other) return 0; if (other.pass) return 3; if (other.pid === 'living') return 2; return 1; };
    opts.sort((a, b) => rank(b) - rank(a) || (b.to - b.from) - (a.to - a.from));
    sp.dw = sideOf(opts[0], r);
  });
  const seen = {}, priced = [];
  spaces.forEach((sp) => { if (sp.pid && !seen[sp.pid]) { seen[sp.pid] = 1; priced.push(sp.pid); } });
  const order = ['living', 'kitchen', 'family', 'master', 'common', 'common2', 'study', 'bath'];
  priced.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const W = m(env.x1 - env.x0), D = m(env.y1 - env.y0);
  return {
    doc: {
      schema: 'hnm-plan-scene/2', plan_id: 'detected-' + Date.now(), layout_key: 'detected',
      display_name: 'DETECTED FROM UPLOADED PLAN', provenance: 'AUTO-DETECTED — CONFIRM BEFORE USE',
      trace_confidence: 'low', source_type: 'auto_detection',
      detection: { rooms: det.rooms.length, openings: det.openings.length, mm_per_px: +mmPerPx.toFixed(2), facade_flip: flip },
      floors: [{ width_m: W, depth_m: D, voids: [], spaces }],
    },
    rooms: priced.length ? priced : ['living'], sqm: +(W * D).toFixed(1),
  };
}

export function guessName(det, r) {
  const pw = det.envelope.x1 - det.envelope.x0, ph = det.envelope.y1 - det.envelope.y0;
  const frac = ((r.x1 - r.x0) * (r.y1 - r.y0)) / (pw * ph);
  const biggest = det.rooms.every((o) => ((o.x1 - o.x0) * (o.y1 - o.y0)) <= ((r.x1 - r.x0) * (r.y1 - r.y0)));
  if (biggest) return 'LIVING / DINING';
  if (frac < 0.025) return 'STORE / WC';
  if (frac < 0.06) return 'BATH / WC';
  return 'BEDROOM';
}
