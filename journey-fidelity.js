// journey-fidelity.js — is the traced model 1:1 with the source drawing?
//
// The other validators ask "is this model buildable and walkable". This one asks the harder
// question: "does it reproduce the sheet". Three independent tests, all pure geometry off the
// plan document, so a NEW plan gets the same guarantee the day it is traced:
//
//   1. COVERAGE   every m² of the bounding box is either an allocated space or a DECLARED void.
//                 Catches the silent failure mode — a room, balcony or ledge left off the trace
//                 shows up as unallocated area instead of quietly vanishing.
//   2. CHAINS     every dimension string printed on the sheet is declared and realised.
//                 `axis` chains must sum to the envelope AND land their cumulative cuts on real
//                 wall lines; `clear` chains must each be matched by a real room extent.
//   3. ENVELOPE   overall width/depth equal the printed overall, and rooms stay inside it.
//
// A plan that cannot answer these declares `trace_confidence` and the unresolved dims, so a
// low-confidence trace is visible instead of implied-exact.

const TOL_CUT = 0.08;    // wall centre-line slop: printed cut vs modelled rect edge
const TOL_CLEAR = 0.05;  // clear-dim slop: printed room size vs modelled rect size
const TOL_SUM = 0.003;   // chain arithmetic
const TOL_GAP = 0.02;    // ignore sub-20mm coverage slivers (rounding, not missing rooms)
const MIN_GAP_AREA = 0.05;

const mm = (v) => (v > 40 ? v / 1000 : v); // chains are printed in mm; accept m for convenience
const isOut = (s) => !!(s.out || s.outdoor) || s.key === 'ac' || /^ledge/.test(s.key || '');

/* exact rectangle decomposition: split the envelope on every rect/void edge, then count covers
   per cell. No sampling, so a 20mm sliver is found as reliably as a missing 12m² balcony. */
function coverage(W, D, boxes) {
  const xs = new Set([0, W]), zs = new Set([0, D]);
  boxes.forEach((b) => { xs.add(b.x); xs.add(b.x + b.w); zs.add(b.z); zs.add(b.z + b.d); });
  const X = [...xs].filter((v) => v > -TOL_GAP && v < W + TOL_GAP).sort((a, b) => a - b);
  const Z = [...zs].filter((v) => v > -TOL_GAP && v < D + TOL_GAP).sort((a, b) => a - b);
  const gaps = [], overlaps = [];
  let gapArea = 0, overArea = 0;
  for (let i = 0; i + 1 < X.length; i++) for (let j = 0; j + 1 < Z.length; j++) {
    const w = X[i + 1] - X[i], d = Z[j + 1] - Z[j];
    if (w < TOL_GAP || d < TOL_GAP) continue;
    const mx = (X[i] + X[i + 1]) / 2, mz = (Z[j] + Z[j + 1]) / 2;
    const hits = boxes.filter((b) => mx > b.x && mx < b.x + b.w && mz > b.z && mz < b.z + b.d);
    const cell = { x: X[i], z: Z[j], w, d, area: w * d };
    if (!hits.length) { gaps.push(cell); gapArea += cell.area; }
    else if (hits.length > 1) { overlaps.push(Object.assign(cell, { keys: hits.map((h) => h.key) })); overArea += cell.area; }
  }
  return { gaps: gaps.filter((g) => g.area >= MIN_GAP_AREA), overlaps, gapArea, overArea };
}

function chainCheck(ch, floor, spaces, voids) {
  const axis = ch.axis === 'z' ? 'z' : 'x';
  const env = axis === 'x' ? floor.width_m : floor.depth_m;
  const band = ch.band ? [mm(ch.band[0]), mm(ch.band[1])] : null;
  const cross = axis === 'x' ? 'z' : 'x';
  const crossSize = axis === 'x' ? 'd' : 'w';
  const inBand = (s) => !band || (s[cross] < band[1] - 0.01 && s[cross] + s[crossSize] > band[0] + 0.01);
  const pool = [...spaces, ...voids].filter(inBand);
  const printed = ch.printed.map(mm);
  const label = `${ch.label || (axis + ' chain')}`;
  const out = { label, axis, mode: ch.mode || 'axis', printed: ch.printed, issues: [] };

  if (out.mode === 'clear') {
    // every printed clear dim must be some room's real extent in this band, each room used once
    const size = axis === 'x' ? 'w' : 'd';
    const used = new Set();
    printed.forEach((p, k) => {
      const hit = pool.findIndex((s, i) => !used.has(i) && Math.abs(s[size] - p) <= TOL_CLEAR);
      if (hit < 0) out.issues.push(`printed ${ch.printed[k]} not realised by any ${axis === 'x' ? 'width' : 'depth'} in the model`);
      else used.add(hit);
    });
    return out;
  }
  // axis chain: arithmetic, then cumulative cuts must exist as wall lines
  const sum = printed.reduce((a, b) => a + b, 0);
  const total = ch.total != null ? mm(ch.total) : sum;
  if (Math.abs(sum - total) > TOL_SUM) out.issues.push(`chain sums to ${(sum * 1000) | 0} but is printed as ${(total * 1000) | 0}`);
  const from = mm(ch.from || 0);
  if (!ch.partial && Math.abs(from + total - env) > TOL_SUM)
    out.issues.push(`chain spans ${((from + total) * 1000) | 0} but the envelope ${axis} is ${(env * 1000) | 0}`);
  const edges = new Set();
  pool.forEach((s) => { edges.add(s[axis]); edges.add(s[axis] + (axis === 'x' ? s.w : s.d)); });
  const edgeList = [...edges];
  let cur = from;
  printed.forEach((p, k) => {
    cur += p;
    if (k === printed.length - 1 && !ch.partial) return; // final cut is the envelope edge
    if (!edgeList.some((e) => Math.abs(e - cur) <= TOL_CUT))
      out.issues.push(`cut at ${(cur * 1000) | 0} (after printed ${ch.printed.slice(0, k + 1).join('+')}) has no wall line in the model`);
  });
  return out;
}

export function checkFidelity(doc) {
  const rep = {
    plan: (doc && doc.display_name) || 'layout',
    confidence: (doc && doc.trace_confidence) || 'undeclared',
    envelope: { ok: true, issues: [] },
    coverage: { ok: true, issues: [], gapArea: 0, overArea: 0 },
    chains: { ok: true, issues: [], declared: 0, tested: [] },
    area: { ok: true, issues: [], internal_sqm: 0, stated_sqm: null },
    unresolved: (doc && doc.unresolved_dims) || [],
    ok: true,
  };
  if (!doc || !doc.floors) { rep.ok = false; rep.envelope.ok = false; rep.envelope.issues.push('no plan document'); return rep; }

  doc.floors.forEach((floor, fi) => {
    const L = `L${fi + 1}`;
    const W = floor.width_m, D = floor.depth_m;
    const spaces = (floor.spaces || []).map((s) => ({ key: s.key, x: s.x, z: s.z, w: s.w, d: s.d, out: isOut(s) }));
    const voids = (floor.voids || []).map((v, i) => ({ key: v.key || `void${i + 1}`, x: v.x, z: v.z, w: v.w, d: v.d, isVoid: true, note: v.note || '' }));

    if (!(W > 0 && D > 0)) rep.envelope.issues.push(`${L} envelope missing`);
    spaces.concat(voids).forEach((b) => {
      if (b.x < -0.005 || b.z < -0.005 || b.x + b.w > W + 0.005 || b.z + b.d > D + 0.005)
        rep.envelope.issues.push(`${L} ${b.key} breaks the envelope`);
    });

    const cov = coverage(W, D, spaces.concat(voids));
    rep.coverage.gapArea += cov.gapArea; rep.coverage.overArea += cov.overArea;
    cov.gaps.forEach((g) => rep.coverage.issues.push(
      `${L} ${g.area.toFixed(2)}m² unallocated at x${g.x.toFixed(2)}–${(g.x + g.w).toFixed(2)} z${g.z.toFixed(2)}–${(g.z + g.d).toFixed(2)} — trace a space or declare a void`));
    cov.overlaps.forEach((o) => rep.coverage.issues.push(`${L} ${o.keys.join(' ∩ ')} overlap ${o.area.toFixed(2)}m²`));

    (floor.dim_chains || doc.dim_chains || []).forEach((ch) => {
      const r = chainCheck(ch, floor, spaces, voids);
      rep.chains.declared++;
      rep.chains.tested.push(Object.assign({ floor: L }, r));
      r.issues.forEach((i) => rep.chains.issues.push(`${L} ${r.label}: ${i}`));
    });
    if (!(floor.dim_chains || doc.dim_chains || []).length)
      rep.chains.issues.push(`${L} no printed dimension chain declared — fidelity to the sheet is unverifiable`);

    rep.area.internal_sqm += spaces.filter((s) => !s.out).reduce((t, s) => t + s.w * s.d, 0);
  });

  const stated = doc.stated_area_sqm;
  if (stated) {
    rep.area.stated_sqm = stated;
    const pct = Math.abs(rep.area.internal_sqm - stated) / stated;
    if (pct > 0.05) rep.area.issues.push(`internal area ${rep.area.internal_sqm.toFixed(1)}m² vs printed ${stated}m² (${(pct * 100).toFixed(1)}% out)`);
  }
  if (!/^(high|medium|low)$/.test(rep.confidence))
    rep.envelope.issues.push('trace_confidence not declared (high | medium | low)');

  ['envelope', 'coverage', 'chains', 'area'].forEach((k) => { rep[k].ok = rep[k].issues.length === 0; });
  rep.ok = rep.envelope.ok && rep.coverage.ok && rep.chains.ok && rep.area.ok;
  return rep;
}
