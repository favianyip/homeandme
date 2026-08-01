// journey-wallnet.js — learned wall-pixel model, weak-supervised on the customer corpus.
//
// The classical pipeline (threshold → morphology) reads most sheets well but fails on
// light-ink / broken-stroke scans. Those failures are FEATURE failures, not logic failures:
// "wall" is decided by a fixed threshold and fixed kernel radii. This module learns
// wall-ness from data instead — trained on the corpus sheets the classical cascade reads
// confidently (its structure mask = pseudo-ground-truth), then applied to the sheets it
// can't read. Teacher-student weak supervision: the student sees WIDER context per pixel
// (multi-scale density, run lengths, gap evidence), so it transfers to degraded ink where
// the teacher's fixed threshold breaks.
//
// Logistic regression over 13 geometric features per pixel. Weights live in
// plans/wall-model.json (~1 KB). Everything — features, trainer, inference — is in this
// file, in the browser, inspectable end to end.

// integral image over a Uint8Array mask
function integral(m, W, H) {
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += m[y * W + x];
      I[(y + 1) * (W + 1) + (x + 1)] = I[y * (W + 1) + (x + 1)] + row;
    }
  }
  return I;
}
function boxMean(I, W, H, x, y, r) {
  const x0 = Math.max(0, x - r), x1 = Math.min(W - 1, x + r), y0 = Math.max(0, y - r), y1 = Math.min(H - 1, y + r);
  const s = I[(y1 + 1) * (W + 1) + (x1 + 1)] - I[y0 * (W + 1) + (x1 + 1)] - I[(y1 + 1) * (W + 1) + x0] + I[y0 * (W + 1) + x0];
  return s / ((x1 - x0 + 1) * (y1 - y0 + 1));
}

/** Per-sheet feature context: precompute once, then featurize any pixel in O(1). */
export function featureContext(ink, W, H) {
  const I = integral(ink, W, H);
  // run lengths along row/col (capped 24)
  const hrun = new Uint8Array(W * H), vrun = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let run = 0;
    for (let x = 0; x < W; x++) { const i = y * W + x; run = ink[i] ? Math.min(24, run + 1) : 0; hrun[i] = run; }
    run = 0;
    for (let x = W - 1; x >= 0; x--) { const i = y * W + x; run = ink[i] ? Math.min(24, run + 1) : 0; if (run > hrun[i]) hrun[i] = run; }
  }
  for (let x = 0; x < W; x++) {
    let run = 0;
    for (let y = 0; y < H; y++) { const i = y * W + x; run = ink[i] ? Math.min(24, run + 1) : 0; vrun[i] = run; }
    run = 0;
    for (let y = H - 1; y >= 0; y--) { const i = y * W + x; run = ink[i] ? Math.min(24, run + 1) : 0; if (run > vrun[i]) vrun[i] = run; }
  }
  return { ink, I, hrun, vrun, W, H };
}

export const FEATURE_NAMES = ['ink', 'd1', 'd2', 'd4', 'd8', 'd16', 'hrun', 'vrun', 'runmax', 'gapH', 'gapV', 'edgeDist', 'bias'];

/** 13 features for pixel (x,y). gapH/gapV: evidence of aligned ink on BOTH sides along an
 *  axis — the signature of a broken stroke this pixel should bridge. */
export function featurize(ctx, x, y, out) {
  const { ink, I, hrun, vrun, W, H } = ctx;
  const i = y * W + x;
  out[0] = ink[i];
  out[1] = boxMean(I, W, H, x, y, 1);
  out[2] = boxMean(I, W, H, x, y, 2);
  out[3] = boxMean(I, W, H, x, y, 4);
  out[4] = boxMean(I, W, H, x, y, 8);
  out[5] = boxMean(I, W, H, x, y, 16);
  out[6] = hrun[i] / 24;
  out[7] = vrun[i] / 24;
  out[8] = Math.max(out[6], out[7]);
  let l = 0, r = 0, u = 0, d = 0;
  for (let o = 1; o <= 5; o++) {
    if (x - o >= 0 && ink[i - o]) l = 1;
    if (x + o < W && ink[i + o]) r = 1;
    if (y - o >= 0 && ink[i - o * W]) u = 1;
    if (y + o < H && ink[i + o * W]) d = 1;
  }
  out[9] = l && r ? 1 : 0;
  out[10] = u && d ? 1 : 0;
  out[11] = Math.min(x, y, W - 1 - x, H - 1 - y) / Math.max(W, H);
  out[12] = 1;
  return out;
}

/** SGD logistic regression. samples: {X: Float32Array(n*13), y: Uint8Array(n)} */
export function trainWallNet(X, y, dim, epochs, lr) {
  const n = y.length, w = new Float64Array(dim);
  const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let e = 0; e < epochs; e++) {
    for (let i = n - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    const k = lr / (1 + e * 0.3);
    for (let s = 0; s < n; s++) {
      const o = idx[s] * dim;
      let z = 0; for (let f = 0; f < dim; f++) z += w[f] * X[o + f];
      const p = 1 / (1 + Math.exp(-z)), g = p - y[idx[s]];
      for (let f = 0; f < dim; f++) w[f] -= k * g * X[o + f];
    }
  }
  return Array.from(w);
}

export function aucOf(X, y, w, dim) {
  const scores = [];
  for (let s = 0; s < y.length; s++) {
    let z = 0; for (let f = 0; f < dim; f++) z += w[f] * X[s * dim + f];
    scores.push([z, y[s]]);
  }
  scores.sort((a, b) => a[0] - b[0]);
  let rankSum = 0, nPos = 0;
  scores.forEach((s, r) => { if (s[1]) { rankSum += r + 1; nPos++; } });
  const nNeg = y.length - nPos;
  return nPos && nNeg ? (rankSum - nPos * (nPos + 1) / 2) / (nPos * nNeg) : 0.5;
}

/** Inference: ink mask → learned structure mask (replaces threshold+CLOSE in the pipeline).
 *  Evaluated on every pixel with any nearby ink; empty paper is skipped (p(wall)≈0 anyway). */
export function predictWallMask(ink, W, H, model) {
  const ctx = featureContext(ink, W, H);
  const w = model.weights, dim = w.length;
  const out = new Uint8Array(W * H), f = new Float64Array(dim);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // cheap gate: skip pixels with no ink within 2px (d2 would be 0 → certain negative)
    if (!ink[i]) {
      let near = 0;
      for (let o = 1; o <= 2 && !near; o++) {
        if (x - o >= 0 && ink[i - o]) near = 1;
        else if (x + o < W && ink[i + o]) near = 1;
        else if (y - o >= 0 && ink[i - o * W]) near = 1;
        else if (y + o < H && ink[i + o * W]) near = 1;
      }
      if (!near) continue;
    }
    featurize(ctx, x, y, f);
    let z = 0; for (let d = 0; d < dim; d++) z += w[d] * f[d];
    if (z > 0) out[i] = 1; // p > 0.5
  }
  return out;
}
