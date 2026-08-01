// journey-ml.js — trained room-role classifier: which detected space is the LIVING AREA
// (and which are bedrooms, baths, kitchen, stores, halls, balconies).
//
// A real trained model, honestly scoped: multinomial logistic regression over 8 geometric
// features per room, trained on the 12 surveyed catalog layouts (HDB / condo / landed) with
// mirror + jitter augmentation — hundreds of labelled rooms, weights shipped as JSON
// (plans/room-classifier.json). Inference is 8 multiply-adds per class: fully inspectable,
// no black box, and the room table stays human-overridable. It replaces the old
// "biggest room = living" guess with evidence: size, shape, position, adjacency, facade
// contact — so a condo whose master suite out-sizes the lounge still names the lounge.
//
// featurize() is THE contract: training and serving both call it, so they cannot drift.

export const CLASSES = ['LIVING', 'BED', 'BATH', 'KITCHEN', 'STORE', 'HALL', 'OUT'];
export const classOf = (lbl) => {
  if (/BATH|WC|ENSUITE|POWDER/.test(lbl)) return 'BATH';           // before BED: 'MASTER BATH'
  if (/LIVING|DINING|LOUNGE|FAMILY|SITTING|NOOK/.test(lbl)) return 'LIVING';
  if (/BED|MASTER|JUNIOR|STUDY/.test(lbl)) return 'BED';
  if (/KITCHEN|PANTRY/.test(lbl)) return 'KITCHEN';
  if (/STORE|UTILITY|SHELTER|WARDROBE|HS\b/.test(lbl)) return 'STORE';
  if (/HALL|FOYER|CORRIDOR|PASSAGE|LANDING|STAIR|ENTRY|ENTRANCE/.test(lbl)) return 'HALL';
  if (/BALCONY|LEDGE|A\/C|AC |AIR-CON|PLANTER|YARD|PATIO|PORCH|TERRACE|GARDEN/.test(lbl)) return 'OUT';
  return null;
};
/** Training label source: printed label, else the priced-room id ('living', 'kitchen'…). */
export const clsOfSpace = (s) => classOf(String(s.lbl || s.pid || s.key || '').toUpperCase());
export const nameFor = (cls) => ({
  LIVING: 'LIVING / DINING', BED: 'BEDROOM', BATH: 'BATH / WC', KITCHEN: 'KITCHEN',
  STORE: 'STORE / UTILITY', HALL: 'HALLWAY', OUT: 'BALCONY / SERVICE',
}[cls] || 'ROOM');

/** rooms: [{x,z,w,d}] in metres; env: {W,D}. Returns one 12-feature row per room. */
export function featurize(rooms, env) {
  const n = rooms.length;
  const areas = rooms.map((r) => r.w * r.d);
  const maxA = Math.max(...areas);
  const byArea = [...rooms].map((r, i) => [areas[i], i]).sort((a, b) => b[0] - a[0]);
  const rank = new Array(n); byArea.forEach(([, i], k) => { rank[i] = n > 1 ? 1 - k / (n - 1) : 1; });
  return rooms.map((r, i) => {
    const cx = r.x + r.w / 2, cz = r.z + r.d / 2;
    let edges = 0;
    if (r.x < 0.15) edges++; if (r.z < 0.15) edges++;
    if (env.W - (r.x + r.w) < 0.15) edges++; if (env.D - (r.z + r.d) < 0.15) edges++;
    let nb = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const o = rooms[j];
      const gx = Math.max(r.x, o.x) - Math.min(r.x + r.w, o.x + o.w);
      const gz = Math.max(r.z, o.z) - Math.min(r.z + r.d, o.z + o.d);
      const shX = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
      const shZ = Math.min(r.z + r.d, o.z + o.d) - Math.max(r.z, o.z);
      if ((gx < 0.35 && shZ > 0.5) || (gz < 0.35 && shX > 0.5)) nb++;
    }
    return [
      areas[i] / (env.W * env.D),
      Math.min(Math.max(r.w, r.d) / Math.max(0.1, Math.min(r.w, r.d)), 6) / 6,
      rank[i],
      Math.abs(cx - env.W / 2) / env.W,
      Math.abs(cz - env.D / 2) / env.D,
      edges / 4,
      Math.min(nb, 6) / 6,
      Math.min(n / 14, 1),
      areas[i] === maxA ? 1 : 0,      // the old heuristic, as evidence the model can weigh
      areas[i] / maxA,
      Math.min(r.w / env.W, 1),
      Math.min(r.d / env.D, 1),
    ];
  });
}

const softmax = (zs) => { const m = Math.max(...zs); const e = zs.map((z) => Math.exp(z - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
const scoreRow = (x, Wt, mu, sd) => Wt.map((w) => w[w.length - 1] + x.reduce((a, v, j) => a + w[j] * ((v - mu[j]) / sd[j]), 0));

/** Gradient-descent trainer (runs in-browser; deterministic given the same data).
 *  Inverse-frequency class weights keep rare-but-critical classes (LIVING, KITCHEN)
 *  from being drowned out by the bedroom/bath majority. */
export function trainSoftmax(X, Y, k, epochs, lr0) {
  const d = X[0].length, n = X.length;
  const mu = new Array(d).fill(0), sd = new Array(d).fill(0);
  X.forEach((x) => x.forEach((v, j) => { mu[j] += v / n; }));
  X.forEach((x) => x.forEach((v, j) => { sd[j] += (v - mu[j]) ** 2 / n; }));
  sd.forEach((v, j) => { sd[j] = Math.sqrt(v) || 1; });
  const Xs = X.map((x) => x.map((v, j) => (v - mu[j]) / sd[j]));
  const freq = new Array(k).fill(0); Y.forEach((y) => freq[y]++);
  const cw = freq.map((f) => f ? Math.min(3, n / (k * f)) : 0);
  const W = Array.from({ length: k }, () => new Array(d + 1).fill(0));
  for (let ep = 0; ep < epochs; ep++) {
    const lr = lr0 / (1 + ep / 300);
    const g = Array.from({ length: k }, () => new Array(d + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const p = softmax(W.map((w) => w[d] + Xs[i].reduce((a, v, j) => a + w[j] * v, 0)));
      const wt = cw[Y[i]];
      for (let c = 0; c < k; c++) {
        const err = (p[c] - (Y[i] === c ? 1 : 0)) * wt;
        for (let j = 0; j < d; j++) g[c][j] += err * Xs[i][j];
        g[c][d] += err;
      }
    }
    for (let c = 0; c < k; c++) for (let j = 0; j <= d; j++) W[c][j] -= (lr / n) * g[c][j] + 1e-4 * W[c][j];
  }
  return { classes: CLASSES, mu, sd, W };
}

/** Detection rooms (px) → metre rects for featurize. */
export function detToRects(det, mmPerPx) {
  const m = mmPerPx / 1000, e = det.envelope;
  return {
    rooms: det.rooms.map((r) => ({ x: (r.x0 - e.x0) * m, z: (r.y0 - e.y0) * m, w: (r.x1 - r.x0 + 1) * m, d: (r.y1 - r.y0 + 1) * m })),
    env: { W: (e.x1 - e.x0 + 1) * m, D: (e.y1 - e.y0 + 1) * m },
  };
}

/** Classify all rooms; at most one LIVING (the highest-probability claimant), and only
 *  when the evidence clears a threshold — a bedroom-only storey claims nothing. */
export function predictRooms(rooms, env, model) {
  const F = featurize(rooms, env);
  const raw = F.map((x) => softmax(scoreRow(x, model.W, model.mu, model.sd)));
  const li = CLASSES.indexOf('LIVING');
  let bestL = -1, bestP = 0;
  raw.forEach((p, i) => { if (p[li] > bestP) { bestP = p[li]; bestL = i; } });
  const claim = bestP >= 0.20 ? bestL : -1;
  return raw.map((p, i) => {
    let order = p.map((v, c) => [v, c]).sort((a, b) => b[0] - a[0]);
    let [conf, cls] = order[0];
    if (cls === li && i !== claim) { [conf, cls] = order[1]; }
    if (i === claim && cls !== li) { cls = li; conf = p[li]; }
    return { cls: CLASSES[cls], conf, probs: p };
  });
}
