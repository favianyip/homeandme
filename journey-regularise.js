// Stage 2 — the regulariser.
//
// Turns probabilistic evidence (a wall mask + a traced label map) into a clean axis-aligned
// plan in millimetres. The key move is that geometry is never traced: the wall centrelines
// define an ARRANGEMENT of the envelope into cells, every cell is assigned to a room, and
// walls are what sits between cells of different rooms. Because the cells tile the envelope
// exactly, the result is watertight by construction — a room cannot leak, and coverage cannot
// silently drop. Tracing can only get the axes wrong, never the topology.
//
//   scanBands   pixels -> wall bands (centreline + thickness), junction-overshoot resistant
//   mergeLine   bands  -> one wall per line, recording every gap it bridges (doorways)
//   cluster     centres-> a small set of exact shared axes
//   arrangement axes   -> cells -> rooms (merged cells) + walls (cell boundaries)
//   clearRuns   ink    -> openings, measured where a boundary has no wall ink

const TAU = Math.PI * 2;

function scanBands(mask, W, env, horiz, minLen, maxThick) {
  const aFrom = horiz ? env.y0 : env.x0, aTo = horiz ? env.y1 : env.x1;
  const bFrom = horiz ? env.x0 : env.y0, bTo = horiz ? env.x1 : env.y1;
  const on = horiz ? (a, b) => mask[a * W + b] : (a, b) => mask[b * W + a];
  const done = [];
  let open = [];
  for (let a = aFrom; a <= aTo; a++) {
    const line = [];
    let s = -1;
    for (let b = bFrom; b <= bTo + 1; b++) {
      const hit = b <= bTo && on(a, b);
      if (hit && s < 0) s = b;
      else if (!hit && s >= 0) { if (b - s >= minLen) line.push([s, b - 1]); s = -1; }
    }
    const used = new Uint8Array(line.length), next = [];
    for (const bd of open) {
      let pick = -1, most = 0;
      for (let i = 0; i < line.length; i++) {
        if (used[i]) continue;
        const ov = Math.min(bd.b1, line[i][1]) - Math.max(bd.b0, line[i][0]) + 1;
        const short = Math.min(bd.b1 - bd.b0, line[i][1] - line[i][0]) + 1;
        if (ov > 0 && ov / short > 0.6 && ov > most) { most = ov; pick = i; }
      }
      if (pick < 0) { done.push(bd); continue; }
      used[pick] = 1;
      bd.a1 = a;
      bd.spans.push(line[pick]);
      bd.b0 = Math.min(bd.b0, line[pick][0]);
      bd.b1 = Math.max(bd.b1, line[pick][1]);
      next.push(bd);
    }
    for (let i = 0; i < line.length; i++) {
      if (!used[i]) next.push({ a0: a, a1: a, b0: line[i][0], b1: line[i][1], spans: [line[i]] });
    }
    open = next;
  }
  for (const bd of open) done.push(bd);
  const out = [];
  for (const bd of done) {
    const th = bd.a1 - bd.a0 + 1;
    if (th > maxThick) continue; // hatch fill or a filled fixture, not a wall
    const s0 = bd.spans.map((s) => s[0]).sort((p, q) => p - q);
    const s1 = bd.spans.map((s) => s[1]).sort((p, q) => p - q);
    const lo = s0[s0.length >> 1], hi = s1[s1.length >> 1];
    if (hi - lo + 1 < minLen) continue;
    out.push({ c: (bd.a0 + bd.a1) / 2, lo, hi, th, span: hi - lo });
  }
  return out;
}

function mergeLine(bands, cTol, maxGap) {
  const src = bands.slice().sort((p, q) => p.c - q.c || p.lo - q.lo);
  const groups = [];
  for (const b of src) {
    let g = null;
    for (const G of groups) {
      if (Math.abs(G.c - b.c) > cTol) continue;
      if (b.lo - G.hi > maxGap || G.lo - b.hi > maxGap) continue;
      g = G; break;
    }
    if (!g) { groups.push({ c: b.c, lo: b.lo, hi: b.hi, th: b.th, n: 1, span: b.span }); continue; }
    g.c = (g.c * g.n + b.c) / (g.n + 1);
    g.n++;
    g.lo = Math.min(g.lo, b.lo);
    g.hi = Math.max(g.hi, b.hi);
    g.th = Math.max(g.th, b.th);
    g.span = g.hi - g.lo;
  }
  return groups;
}

/** 1-D single-link clustering, weighted by how much wall each centreline represents. */
function cluster(items, tol) {
  if (!items.length) return [];
  const s = items.slice().sort((a, b) => a.c - b.c), runs = [[s[0]]];
  for (let i = 1; i < s.length; i++) {
    const run = runs[runs.length - 1];
    if (s[i].c - run[run.length - 1].c <= tol) run.push(s[i]);
    else runs.push([s[i]]);
  }
  return runs.map((r) => {
    const wsum = r.reduce((a, b) => a + b.span, 0) || r.length;
    return {
      c: r.reduce((a, b) => a + b.c * (b.span || 1), 0) / wsum,
      th: Math.max(...r.map((b) => b.th)),
      span: Math.max(...r.map((b) => b.span)),
    };
  });
}

/** Trace the outline of a set of grid cells, clockwise in screen coordinates. */
function outline(cells, xs, ys, nx) {
  const segs = [];
  for (const k of cells) {
    const i = k % nx, j = (k / nx) | 0;
    const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
    if (j === 0 || !cells.has(k - nx)) segs.push([[x0, y0], [x1, y0]]);
    if (!cells.has(k + 1) || i === xs.length - 2) segs.push([[x1, y0], [x1, y1]]);
    if (!cells.has(k + nx) || j === ys.length - 2) segs.push([[x1, y1], [x0, y1]]);
    if (i === 0 || !cells.has(k - 1)) segs.push([[x0, y1], [x0, y0]]);
  }
  if (!segs.length) return [];
  const K = (p) => p[0] + ',' + p[1];
  const from = new Map();
  for (const s of segs) if (!from.has(K(s[0]))) from.set(K(s[0]), s);
  const startK = K(segs[0][0]);
  const pts = [];
  let cur = segs[0], guard = 0;
  while (cur && guard++ < 20000) {
    pts.push(cur[0]);
    const nk = K(cur[1]);
    if (nk === startK) break;
    cur = from.get(nk);
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[(i - 1 + pts.length) % pts.length], c = pts[i], n = pts[(i + 1) % pts.length];
    const collinear = (p[0] === c[0] && c[0] === n[0]) || (p[1] === c[1] && c[1] === n[1]);
    if (!collinear) out.push(c);
  }
  return out.length > 3 ? out : pts;
}

/** Point in rectilinear polygon — ray cast. Used to place a fixture cluster inside a room. */
function inPoly(pts, x, y) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

/** Connected blobs of fixture ink — the drawn sanitary and kitchen equipment the wall pass set
 *  aside. A WC pan and a basin are 0.1–0.5 m² each, so the size window is deliberately narrow. */
export function fixtureClusters(det, mmPerPx) {
  const src = det.fixtures;
  if (!src) return [];
  const { W, H, envelope: e } = det;
  const seen = new Uint8Array(W * H), out = [], st = [];
  for (let y = e.y0; y <= e.y1; y++) for (let x = e.x0; x <= e.x1; x++) {
    const p = y * W + x;
    if (seen[p] || !src[p]) continue;
    let n = 0, x0 = x, x1 = x, y0 = y, y1 = y;
    seen[p] = 1;
    st.push(p);
    while (st.length) {
      const q = st.pop(), qx = q % W, qy = (q / W) | 0;
      n++;
      if (qx < x0) x0 = qx;
      if (qx > x1) x1 = qx;
      if (qy < y0) y0 = qy;
      if (qy > y1) y1 = qy;
      for (const r of [q - 1, q + 1, q - W, q + W]) {
        if (r >= 0 && r < W * H && !seen[r] && src[r]) { seen[r] = 1; st.push(r); }
      }
    }
    const areaM2 = (n * mmPerPx * mmPerPx) / 1e6;
    if (areaM2 >= 0.03 && areaM2 <= 2.2) {
      out.push({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, areaM2: +areaM2.toFixed(2),
        w: Math.round((x1 - x0 + 1) * mmPerPx), d: Math.round((y1 - y0 + 1) * mmPerPx) });
    }
  }
  return out;
}

/** How a room is enclosed: structural walls need an HDB permit to touch, partitions do not. */
export function enclosureOf(reg, rid) {
  let s = 0, p = 0;
  for (const e of (reg.edges || [])) {
    if (e.void || !e.sides || !e.sides.includes(rid)) continue;
    if (e.type === 'structural') s += e.len; else p += e.len;
  }
  const tot = Math.max(1, s + p);
  return { structuralMm: Math.round(s), partitionMm: Math.round(p),
    partitionShare: +(p / tot).toFixed(2), alterable: p / tot >= 0.6 };
}

/** A home cannot have no WC. Every HDB flat type has a known count, so when the trace finds
 *  fewer, that is a detection miss and not a property of the flat — say so, and nominate where.
 *  Two tiers of answer: a whole room that reads like a WC, or, when the trace never separated
 *  one, the fixture cluster itself as a location inside whichever room swallowed it. */
export function inferWCs(det, reg, mmPerPx, opts) {
  const O = Object.assign({ target: 2, names: {} }, opts || {});
  const isWC = (s) => /BATH|WC|TOILET|SHOWER/i.test(s || '');
  // ONE plausibility window, used for counting and for nominating alike. An HDB WC is 1–5.5 m²
  // and never more than ~2.4 m across; an 11 m² face carrying a BATH label is a merge that the
  // label rode along with, and trusting it would silently satisfy the target.
  const plausible = (r) => r.areaM2 >= 1 && r.areaM2 <= 5.5 && r.minDim <= 2400;
  // what the DETECTOR found, independent of what survived the rebuild — otherwise a WC the
  // rebuild dissolved is reported as "not found", which blames the wrong stage and hides the
  // more useful fault
  const tr = [];
  for (const r of (det.rooms || [])) {
    if (!isWC(O.names[r.id])) continue;
    const w = (r.x1 - r.x0) * mmPerPx / 1000, d = (r.y1 - r.y0) * mmPerPx / 1000;
    const a = w * d;
    if (a >= 1 && a <= 5.5) tr.push({ id: r.id, areaM2: +a.toFixed(2) });
  }
  if (!reg || !reg.ok) return { target: O.target, traced: tr.length, found: 0, lost: tr.length, suggestions: [], zones: [], suspect: [] };
  const labelled = reg.rooms.filter((r) => isWC(O.names[r.traced]));
  const found = labelled.filter(plausible).length;
  const lost = Math.max(0, tr.length - found);
  const suspect = labelled.filter((r) => !plausible(r)).map((r) => ({
    room: r.id, areaM2: r.areaM2, minDim: r.minDim, label: O.names[r.traced] || 'BATH / WC',
  }));
  const need = Math.max(0, O.target - found);
  const e = det.envelope;
  const mmX = (p) => (p - e.x0) * mmPerPx, mmY = (p) => (p - e.y0) * mmPerPx;
  const clusters = fixtureClusters(det, mmPerPx);
  if (!need) return { target: O.target, traced: tr.length, found, lost, suggestions: [], zones: [], suspect, clusters: clusters.length };

  const inside = (r, c) => r.poly && r.poly.length > 2 && inPoly(r.poly, mmX(c.cx), mmY(c.cy));
  const scored = [];
  for (const r of reg.rooms) {
    const label = O.names[r.traced] || '';
    if (isWC(label) && plausible(r)) continue;
    // hard filters, not penalties: an HDB WC is 1–5.5 m² and never more than ~2.4 m across.
    // Scoring a 7 m² hallway down was how a hallway got nominated as a bathroom.
    if (r.areaM2 < 1 || r.areaM2 > 5.5 || r.minDim > 2400) continue;
    const enc = enclosureOf(reg, r.id);
    const cl = clusters.filter((c) => inside(r, c));
    let score = 0;
    const why = [];
    if (cl.length >= 2) { score += 3; why.push(cl.length + ' drawn fittings inside it'); }
    else if (cl.length === 1) { score += 2; why.push('a drawn fitting inside it'); }
    if (r.fixInk >= 0.08) { score += 1; why.push('fitting ink across its floor'); }
    if (r.areaM2 <= 4.5) { score += 2; why.push(r.areaM2 + ' m² is WC scale'); }
    else score += 1;
    if (!label || /STORE|UTILITY|HALL|YARD|SERVICE/i.test(label)) { score += 1; why.push(label ? 'currently read as ' + label : 'no printed label'); }
    if (/BED|LIVING|DINING|KITCHEN/i.test(label)) score -= 2;
    // never top-rank a place the customer could not build: enclosure ranks, it does not decorate
    if (enc.alterable) score += 1;
    else if (enc.partitionShare < 0.2) { score -= 3; why.push('though it is almost entirely structural wall'); }
    scored.push({ room: r.id, tracedId: r.traced, areaM2: r.areaM2, minDim: r.minDim, label, score, why,
      fittings: cl.length, enclosure: enc });
  }
  scored.sort((a, b) => b.score - a.score
    || b.enclosure.partitionShare - a.enclosure.partitionShare || a.areaM2 - b.areaM2);
  const suggestions = scored.filter((s) => s.score >= 4).slice(0, need).map((s) => Object.assign(s, {
    kind: 'room', confidence: Math.min(0.6, 0.2 + s.score * 0.05),
  }));

  // fallback: no room reads like a WC, so nominate the fixture cluster itself
  const zones = [];
  if (suggestions.length < need && clusters.length) {
    const used = new Uint8Array(clusters.length);
    for (let i = 0; i < clusters.length; i++) {
      if (used[i]) continue;
      const grp = [clusters[i]];
      used[i] = 1;
      for (let j = i + 1; j < clusters.length; j++) {
        if (used[j]) continue;
        const d = Math.hypot((clusters[j].cx - clusters[i].cx) * mmPerPx, (clusters[j].cy - clusters[i].cy) * mmPerPx);
        if (d < 1800) { used[j] = 1; grp.push(clusters[j]); }
      }
      const cx = grp.reduce((a, c) => a + c.cx, 0) / grp.length;
      const cy = grp.reduce((a, c) => a + c.cy, 0) / grp.length;
      const host = reg.rooms.find((r) => inPoly(r.poly, mmX(cx), mmY(cy)));
      if (host && isWC(O.names[host.traced]) && plausible(host)) continue;
      const hostBad = !!(host && isWC(O.names[host.traced]) && !plausible(host));
      zones.push({ kind: 'zone', at: [Math.round(mmX(cx)), Math.round(mmY(cy))], atPx: [Math.round(cx), Math.round(cy)],
        fittings: grp.length, areaM2: +grp.reduce((a, c) => a + c.areaM2, 0).toFixed(2),
        host: host ? host.id : null, hostLabel: host ? (O.names[host.traced] || host.id) : 'unassigned space',
        hostArea: host ? host.areaM2 : null, hostSuspect: hostBad,
        enclosure: host ? enclosureOf(reg, host.id) : null,
        confidence: grp.length >= 2 ? 0.45 : 0.3 });
    }
    zones.sort((a, b) => b.fittings - a.fittings || b.areaM2 - a.areaM2);
  }
  return { target: O.target, traced: tr.length, found, lost, need, suggestions, suspect,
    zones: zones.slice(0, need - suggestions.length), clusters: clusters.length };
}

/** Dominant wall orientation, from the gradient directions of the wall mask's own edges.
 *  A per-pixel gradient histogram was the first attempt and it fails on a real sheet: the title
 *  block, dimension strings and drawing border are all axis-aligned ink, and there are far more
 *  of those pixels than of building wall. They outvote the plan body — measured 0° on a sheet
 *  visibly 25° off axis.
 *
 *  Projection-profile scoring instead. Bin all ink by its projection onto each candidate axis and
 *  score the energy of that profile: a long wall aligned with the axis piles into ONE bin and
 *  scores quadratically, while scattered annotation spreads across bins and scores almost nothing.
 *  Length beats count, which is the property we need. Returns the best angle and its gain over 0°,
 *  so the caller can rotate only when alignment demonstrably improves. */
function dominantAngle(mask, W, H, e) {
  // margin in: the drawing frame is a long axis-aligned rectangle and would otherwise dominate
  const mx = Math.round((e.x1 - e.x0) * 0.03), my = Math.round((e.y1 - e.y0) * 0.03);
  const x0 = e.x0 + mx, x1 = e.x1 - mx, y0 = e.y0 + my, y1 = e.y1 - my;
  if (x1 - x0 < 40 || y1 - y0 < 40) return { deg: 0, gain: 1 };
  const step = Math.max(1, Math.round(Math.max(x1 - x0, y1 - y0) / 300));
  const pts = [];
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) if (mask[y * W + x]) pts.push(x - (x0 + x1) / 2, y - (y0 + y1) / 2);
  }
  if (pts.length < 200) return { deg: 0, gain: 1 };
  const R = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step / 2) + 2;
  const bins = 2 * R + 1, pu = new Float64Array(bins), pv = new Float64Array(bins);
  const score = (deg) => {
    const r = deg * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
    pu.fill(0); pv.fill(0);
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i] / step, y = pts[i + 1] / step;
      pu[R + Math.round(x * cos + y * sin)]++;
      pv[R + Math.round(-x * sin + y * cos)]++;
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

/** Deskew: rotate the evidence so the dominant walls run square to the axes.
 *  The arrangement scans rows and columns, so a plan drawn at an angle yields wall stubs shorter
 *  than minWall in every line — no bands, no axes, no cells. This was step 1 of the original plan
 *  and was never built, because every corpus sheet happens to be square to its page.
 *  Detected openings are dropped rather than rotated: they are axis-aligned descriptors with no
 *  meaning in the rotated frame. The ink-scan clear runs, the primary source, are recomputed. */
function deskewDet(det) {
  const { W, H, wall, lbl, envelope: e } = det;
  const dom = dominantAngle(wall, W, H, e);
  // Rotate only when alignment measurably improves — a 12% gain in profile energy over 0°. This
  // replaces an arbitrary degree threshold with the thing we actually care about, and it protects
  // the corpus for free: a sheet already square to its page scores best at 0°, so gain is 1 and
  // nothing rotates. (Rotating 1–3° scans cost median clicks-to-fix 4 → 5; nearest-neighbour
  // resampling stipples thin wall ink, so a rotation must earn its keep.)
  if (Math.abs(dom.deg) < 1.5 || Math.abs(dom.deg) > 44 || dom.gain < 1.12) {
    return Object.assign({}, det, { skewDeg: 0 });
  }
  const r = -dom.deg * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;
  const fwd = (x, y) => {
    const dx = x - cx, dy = y - cy;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  };
  const cs = [[e.x0, e.y0], [e.x1, e.y0], [e.x1, e.y1], [e.x0, e.y1]].map(([x, y]) => fwd(x, y));
  const nx0 = Math.min(...cs.map((c) => c[0])), ny0 = Math.min(...cs.map((c) => c[1]));
  const PAD = 4;
  const NW = Math.ceil(Math.max(...cs.map((c) => c[0])) - nx0) + PAD * 2;
  const NH = Math.ceil(Math.max(...cs.map((c) => c[1])) - ny0) + PAD * 2;
  if (!(NW > 8 && NH > 8) || NW * NH > 36e6) return Object.assign({}, det, { skewDeg: 0 });
  const nw = new Uint8Array(NW * NH), nl = lbl ? new Int32Array(NW * NH) : null;
  let bx0 = NW, bx1 = -1, by0 = NH, by1 = -1;
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      const rx = x - PAD + nx0, ry = y - PAD + ny0;
      const sx = Math.round(rx * cos + ry * sin + cx), sy = Math.round(-rx * sin + ry * cos + cy);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const si = sy * W + sx, di = y * NW + x;
      nw[di] = wall[si];
      if (nl) nl[di] = lbl[si];
      if (nw[di] || (nl && nl[di] > 0)) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  }
  if (bx1 - bx0 < 8 || by1 - by0 < 8) return Object.assign({}, det, { skewDeg: 0 });
  const map = (x, y) => {
    const p = fwd(x, y);
    return [p[0] - nx0 + PAD, p[1] - ny0 + PAD];
  };
  const rooms = (det.rooms || []).map((rm) => {
    const pts = [[rm.x0, rm.y0], [rm.x1, rm.y0], [rm.x1, rm.y1], [rm.x0, rm.y1]].map(([a, b]) => map(a, b));
    return Object.assign({}, rm, {
      x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
      y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])),
    });
  });
  return Object.assign({}, det, {
    W: NW, H: NH, wall: nw, lbl: nl, rooms, openings: [], map,
    envelope: { x0: bx0, y0: by0, x1: bx1, y1: by1 },
    skewDeg: +dom.deg.toFixed(2),
  });
}

export function regularise(rawDet, mmPerPx, opts) {
  const O = Object.assign({
    minWall: 620,   // shorter than this is a fixture edge or a dimension tick, not a wall    maxThick: 420,  // thicker than this is hatch fill, not a wall
    axisTol: 180,   // centrelines within this distance share an axis
    minCell: 450,   // axes closer than this collapse — no room is 450 mm wide
    maxGap: 2300,   // widest gap treated as an opening rather than two walls
    minOpen: 550,   // shortest clear run that counts as an opening
    minRoomDim: 1200, // a habitable space is never narrower than this in its minor axis
    minInnerDim: 800, // an interior strip narrower than this is a wall cavity, not a room
    minRoom: 1.6, maxRoom: 90, grid: 25, wallH: 2600,
  }, opts || {});
  const issues = [], dbg = {};
  const fail = (code, note) => ({
    ok: false, walls: [], edges: [], rooms: [], openings: [], axes: { x: [], y: [] },
    issues: [{ code, severity: 'blocking', note }], stats: dbg,
  });
  if (!rawDet || rawDet.error) return fail('NO_EVIDENCE', (rawDet && rawDet.error) || 'no detection');
  if (!mmPerPx || !isFinite(mmPerPx)) return fail('NO_SCALE', 'scale not resolved');

  const det = O.deskew === false ? Object.assign({}, rawDet, { skewDeg: 0 }) : deskewDet(rawDet);
  dbg.skewDeg = det.skewDeg || 0;

  const { W, H, wall, lbl, envelope: env } = det;
  const px = (mm) => Math.max(2, Math.round(mm / mmPerPx));
  const q = (v) => Math.round(v / O.grid) * O.grid;
  const mmX = (p) => (p - env.x0) * mmPerPx, mmY = (p) => (p - env.y0) * mmPerPx;
  const pxX = (mm) => env.x0 + mm / mmPerPx, pxY = (mm) => env.y0 + mm / mmPerPx;
  const envW = q(mmX(env.x1)), envD = q(mmY(env.y1));
  const ink = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < W && yi < H ? wall[yi * W + xi] : 0;
  };
  const label = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (!lbl || xi < 0 || yi < 0 || xi >= W || yi >= H) return 0;
    const v = lbl[yi * W + xi];
    return v > 0 ? v : 0;
  };

  // ---- axes: wall centrelines, clustered, plus the envelope edges
  const hB = scanBands(wall, W, env, true, px(O.minWall), px(O.maxThick));
  const vB = scanBands(wall, W, env, false, px(O.minWall), px(O.maxThick));
  const hL = mergeLine(hB, px(O.axisTol), px(O.maxGap));
  const vL = mergeLine(vB, px(O.axisTol), px(O.maxGap));
  Object.assign(dbg, { bandsH: hB.length, bandsV: vB.length, linesH: hL.length, linesV: vL.length });
  if (hL.length < 2 || vL.length < 2) {
    return fail('NO_WALL_GRID', 'bands h/v ' + hB.length + '/' + vB.length + ' -> lines ' + hL.length + '/' + vL.length);
  }

  // The outermost axis must land on the outer wall's CENTRELINE, not on the envelope edge:
  // an axis at the edge has no wall ink under it, so the whole facade would read as one long
  // opening — which both invents windows and starves the door graph.
  // `seeds` are anchor coordinates from rooms that must survive (a WC's bounding walls are
  // shorter than minWall, so they are never found as bands — without a seeded axis the room has
  // no cell to exist in and is lost before any guard can protect it).
  const axisSet = (lines, toMM, limit, seeds) => {
    const cl = cluster(lines.map((g) => ({ c: toMM(g.c), th: g.th * mmPerPx, span: g.span * mmPerPx })), O.axisTol);
    const kept = [];
    for (const a of cl) {
      const c = Math.min(Math.max(q(a.c), 0), limit);
      const prev = kept[kept.length - 1];
      if (prev && c - prev.c < O.minCell) { // same wall seen twice, or a cell too thin to be a room
        if (a.span > (prev.span || 0)) { prev.c = c; prev.th = q(a.th); prev.span = a.span; }
        continue;
      }
      kept.push({ c, th: Math.max(O.grid, q(a.th)), span: a.span, real: true });
    }
    for (const s of (seeds || [])) {
      const c = Math.min(Math.max(q(s), 0), limit);
      if (c <= 0 || c >= limit) continue;
      if (kept.some((k) => Math.abs(k.c - c) < 260)) continue;
      kept.push({ c, th: 100, span: 0, real: true, seeded: true });
    }
    kept.sort((a, b) => a.c - b.c);
    if (!kept.length || kept[0].c > O.minCell) kept.unshift({ c: 0, th: 150, span: 0, real: false });
    if (limit - kept[kept.length - 1].c > O.minCell) kept.push({ c: limit, th: 150, span: 0, real: false });
    return kept;
  };
  const anchors = (O.anchors || []).map((a) => {
    if (!det.map) return a;
    const pts = [[a.x0, a.y0], [a.x1, a.y0], [a.x1, a.y1], [a.x0, a.y1]].map(([x, y]) => det.map(x, y));
    return Object.assign({}, a, {
      x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
      y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])),
    });
  });
  const KEEP = new Set(anchors.map((a) => a.id));
  const seedX = [], seedY = [];
  for (const a of anchors) { seedX.push(mmX(a.x0), mmX(a.x1)); seedY.push(mmY(a.y0), mmY(a.y1)); }
  const AX = axisSet(vL, mmX, envW, seedX), AY = axisSet(hL, mmY, envD, seedY);
  const xs = AX.map((a) => a.c), ys = AY.map((a) => a.c);
  const nx = xs.length - 1, ny = ys.length - 1;
  dbg.grid = nx + 'x' + ny;
  if (nx < 2 || ny < 2) return fail('NO_WALL_GRID', 'arrangement is ' + nx + 'x' + ny + ' cells');

  // ---- assign every cell of the arrangement to a traced room (or to wall body / outside)
  const OUT = -1, ABS = 0;
  const cellRoom = new Int32Array(nx * ny).fill(ABS);
  const cellInk = new Float32Array(nx * ny);
  const cellFix = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
    const tally = new Map();
    let hits = 0, fix = 0, tot = 0;
    for (let a = 1; a <= 4; a++) for (let b = 1; b <= 4; b++) {
      const X = pxX(x0 + ((x1 - x0) * a) / 5), Y = pxY(y0 + ((y1 - y0) * b) / 5);
      tot++;
      if (ink(X, Y)) hits++;
      if (det.fixtures) {
        const xi = Math.round(X), yi = Math.round(Y);
        if (xi >= 0 && yi >= 0 && xi < W && yi < H && det.fixtures[yi * W + xi]) fix++;
      }
      const id = label(X, Y);
      if (id) tally.set(id, (tally.get(id) || 0) + 1);
    }
    cellInk[k] = hits / Math.max(1, tot);
    cellFix[k] = fix / Math.max(1, tot);
    let win = 0, most = 0;
    for (const [id, n] of tally) if (n > most) { most = n; win = id; }
    cellRoom[k] = most >= tot * 0.25 ? win : ABS;
  }

  // ---- connected groups of same-room cells
  const group = new Int32Array(nx * ny).fill(-2);
  const groups = [];
  for (let k = 0; k < nx * ny; k++) {
    if (group[k] !== -2 || cellRoom[k] === ABS) continue;
    const gi = groups.length, st = [k], cells = new Set();
    group[k] = gi;
    while (st.length) {
      const c = st.pop();
      cells.add(c);
      const i = c % nx, j = (c / nx) | 0;
      const nb = [];
      if (i > 0) nb.push(c - 1);
      if (i < nx - 1) nb.push(c + 1);
      if (j > 0) nb.push(c - nx);
      if (j < ny - 1) nb.push(c + nx);
      for (const m of nb) if (group[m] === -2 && cellRoom[m] === cellRoom[k]) { group[m] = gi; st.push(m); }
    }
    groups.push({ id: gi, traced: cellRoom[k], cells });
  }

  const areaOf = (cells) => {
    let A = 0;
    for (const k of cells) {
      const i = k % nx, j = (k / nx) | 0;
      A += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
    }
    return A / 1e6;
  };
  const border = (k, gi) => { // shared edge length between cell k and group gi
    const i = k % nx, j = (k / nx) | 0;
    let L = 0;
    if (i > 0 && group[k - 1] === gi) L += ys[j + 1] - ys[j];
    if (i < nx - 1 && group[k + 1] === gi) L += ys[j + 1] - ys[j];
    if (j > 0 && group[k - nx] === gi) L += xs[i + 1] - xs[i];
    if (j < ny - 1 && group[k + nx] === gi) L += xs[i + 1] - xs[i];
    return L;
  };
  const neighbourGroups = (k) => {
    const i = k % nx, j = (k / nx) | 0, out = new Set();
    if (i > 0) out.add(group[k - 1]);
    if (i < nx - 1) out.add(group[k + 1]);
    if (j > 0) out.add(group[k - nx]);
    if (j < ny - 1) out.add(group[k + nx]);
    out.delete(-2);
    return [...out].filter((g) => g >= 0);
  };

  // unclaimed cells: outside the flat if they sit on the envelope edge with no ink,
  // otherwise absorbed by the neighbour they share the most wall with
  for (let pass = 0; pass < 6; pass++) {
    let moved = 0;
    for (let k = 0; k < nx * ny; k++) {
      if (group[k] !== -2) continue;
      const i = k % nx, j = (k / nx) | 0;
      const edge = i === 0 || j === 0 || i === nx - 1 || j === ny - 1;
      const cands = neighbourGroups(k);
      if (!cands.length) { if (edge && cellInk[k] < 0.25 && pass === 5) group[k] = OUT; continue; }
      let best = -1, bestL = 0;
      for (const g of cands) { const L = border(k, g); if (L > bestL) { bestL = L; best = g; } }
      if (edge && cellInk[k] < 0.12 && areaOf([k]) > 4 && pass === 0) { group[k] = OUT; moved++; continue; }
      group[k] = best;
      groups[best].cells.add(k);
      moved++;
    }
    if (!moved) break;
  }
  for (let k = 0; k < nx * ny; k++) if (group[k] === -2) group[k] = OUT;

  // ---- trim to the flat's own boundary. A drawing sheet carries things that are not the flat:
  // RC ledges, planter boxes, AC ledges, the common corridor, the block's chamfered edge. They
  // are not ours to model, and modelling them is what puts fins on the outside of the 3D. The
  // test is dimensional, not cosmetic: a perimeter strip too narrow to stand in is not a room.
  const PROTECT = /BATH|WC|TOILET|KITCHEN|BED|LIVING|DINING|HALL/i;
  const names = O.names || {};
  const bboxOf = (cells) => {
    let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
    for (const k of cells) {
      const i = k % nx, j = (k / nx) | 0;
      if (i < i0) i0 = i;
      if (i > i1) i1 = i;
      if (j < j0) j0 = j;
      if (j > j1) j1 = j;
    }
    return { w: xs[i1 + 1] - xs[i0], d: ys[j1 + 1] - ys[j0] };
  };
  const minDimOf = (cells) => { const b = bboxOf(cells); return Math.min(b.w, b.d); };
  const onPerimeter = (cells) => {
    for (const k of cells) {
      const i = k % nx, j = (k / nx) | 0;
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) return true;
    }
    return false;
  };
  let trimmed = 0;
  for (const g of groups) {
    if (!g.cells.size) continue;
    const label = names[g.traced] || '';
    if (PROTECT.test(label) || KEEP.has(g.traced)) continue;
    // a narrow perimeter space holding sanitary or kitchen fixture ink is a WC or a yard, not a
    // ledge — the label may be missing or unread, but the drawn fixture is evidence enough
    let fixture = false;
    for (const k of g.cells) if (cellFix[k] > 0.08) { fixture = true; break; }
    if (fixture) continue;
    if (!onPerimeter(g.cells) || minDimOf(g.cells) >= O.minRoomDim) continue;
    for (const k of g.cells) group[k] = OUT;
    g.cells.clear();
    trimmed++;
  }
  dbg.exteriorTrimmed = trimmed;
  if (trimmed) issues.push({ code: 'EXTERIOR_TRIMMED', severity: 'info', count: trimmed, note: trimmed + ' perimeter strip(s) under ' + O.minRoomDim + ' mm dropped as ledge / corridor, not flat' });

  // absorb slivers — a face under minRoom, or an interior strip too narrow to stand in, is not
  // a room: it is a wall thickness, a duct or a fixture
  for (let pass = 0; pass < 8; pass++) {
    let moved = 0;
    for (const g of groups) {
      if (!g.cells.size) continue;
      if (KEEP.has(g.traced)) continue; // an anchored room is never absorbed
      if (areaOf(g.cells) >= O.minRoom && minDimOf(g.cells) >= O.minInnerDim) continue;
      // a small space holding fixture ink is a WC or a store, not a wall cavity: an HDB WC is
      // only about 1.5 m², so absorbing it is how a flat ends up with no toilet at all
      let fixture = false;
      for (const k of g.cells) if (cellFix[k] > 0.08) { fixture = true; break; }
      if (fixture && areaOf(g.cells) >= 1.1 && minDimOf(g.cells) >= 750) continue;
      const nb = new Map();
      for (const k of g.cells) for (const o of neighbourGroups(k)) {
        if (o !== g.id) nb.set(o, (nb.get(o) || 0) + border(k, o));
      }
      if (!nb.size) continue;
      let best = -1, bestL = 0;
      for (const [o, L] of nb) if (L > bestL && groups[o].cells.size) { bestL = L; best = o; }
      if (best < 0) continue;
      for (const k of g.cells) { group[k] = best; groups[best].cells.add(k); }
      g.cells.clear();
      moved++;
    }
    if (!moved) break;
  }

  const live = groups.filter((g) => g.cells.size
    && (KEEP.has(g.traced) || (areaOf(g.cells) >= Math.min(O.minRoom, 1.1) && areaOf(g.cells) <= O.maxRoom)));
  dbg.groups = groups.length;
  dbg.rooms = live.length;
  if (!live.length) return fail('NO_ROOMS', 'no cell group reached ' + O.minRoom + ' m²');
  const rooms = live.map((g, n) => {
    g.rid = 'r' + (n + 1);
    const bb = bboxOf(g.cells);
    let fx = 0;
    for (const k of g.cells) if (cellFix[k] > fx) fx = cellFix[k];
    return { id: g.rid, gi: g.id, traced: g.traced, areaM2: +areaOf(g.cells).toFixed(2),
      minDim: Math.round(Math.min(bb.w, bb.d)), fixInk: +fx.toFixed(2),
      poly: outline(g.cells, xs, ys, nx), edges: [] };
  });
  const ridOf = (gi) => (gi >= 0 && groups[gi] && groups[gi].rid) || null;

  // ---- printed labels beat every inference we make. A drafted sheet sets the room's name and
  // area inside the room; if a label falls in a room's polygon, that IS the room's name, and it
  // is written back into `names` so every downstream consumer — WC counting, the entrance test,
  // the space grammar, the panel — reads ground truth instead of a guess. Printed area is kept
  // separately as a CHECK on our geometry, never as a replacement for it.
  const printedHits = [];
  if (O.printed && O.printed.length) {
    for (const p of O.printed) {
      const px = mmX(p.x), py = mmY(p.y);
      const host = rooms.find((r) => inPoly(r.poly, px, py));
      if (!host) continue;
      if (host.printedName) continue; // first label wins; two names in one room means our walls merged rooms
      host.printedName = p.name;
      if (p.areaM2) host.printedAreaM2 = p.areaM2;
      names[host.traced] = p.name;
      printedHits.push({ room: host.id, name: p.name, areaM2: p.areaM2 || null,
        ourAreaM2: host.areaM2,
        errPct: p.areaM2 ? +(((host.areaM2 - p.areaM2) / p.areaM2) * 100).toFixed(1) : null });
    }
  }

  // ---- walls: the boundaries between cells of different rooms. Openings are the stretches of
  // a boundary with no wall ink — measured, not guessed, so doors appear even when the swing
  // arc was never detected.
  const clearRuns = (dir, c, t0, t1, th) => {
    const half = Math.max(1, th / 2 / mmPerPx);
    const runs = [];
    let open = null;
    const step = Math.max(O.grid, mmPerPx);
    for (let t = t0; t <= t1 + 1e-6; t += step) {
      let solid = false;
      for (let o = -half - 1.5; o <= half + 1.5 && !solid; o++) {
        const X = dir === 'v' ? pxX(c) + o : pxX(t);
        const Y = dir === 'v' ? pxY(t) : pxY(c) + o;
        if (ink(X, Y)) solid = true;
      }
      if (!solid) { if (open == null) open = t; }
      else if (open != null) { runs.push([open, t]); open = null; }
    }
    if (open != null) runs.push([open, t1]);
    // a pier under 300 mm is drafting noise, not two openings: merge across it, or one window
    // band fragments into half a dozen "windows" and buries the real defects in the gate report
    const merged = [];
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last && r[0] - last[1] < 300) last[1] = r[1];
      else merged.push([r[0], r[1]]);
    }
    return merged.map(([a, b]) => [Math.max(t0, a), Math.min(t1, b)]).filter(([a, b]) => b - a >= O.minOpen);
  };

  // ---- detected openings, indexed onto the axis they belong to. The detector's door evidence
  // is a SOURCE of openings, not merely a confidence upgrade on ink-derived ones: a swing arc
  // drawn across a doorway leaves ink there, so the ink test alone misses real doors.
  const detVoids = [];
  let unhosted = 0;
  for (const o of (det.openings || [])) {
    if (o.from == null || o.to == null || o.at == null) continue;
    const near = (v, ax) => {
      let best = null, d = O.axisTol * 1.8;
      for (const a of ax) { const e = Math.abs(a.c - v); if (e < d) { d = e; best = a.c; } }
      return best;
    };
    const asH = near(mmY(o.at), AY), asV = near(mmX(o.at), AX);
    const facade = o.between && (o.between[0] === 0 || o.between[1] === 0);
    if (asH != null) detVoids.push({ dir: 'h', c: asH, t0: mmX(Math.min(o.from, o.to)), t1: mmX(Math.max(o.from, o.to)), facade });
    else if (asV != null) detVoids.push({ dir: 'v', c: asV, t0: mmY(Math.min(o.from, o.to)), t1: mmY(Math.max(o.from, o.to)), facade });
    else unhosted++;
  }
  // merge detected voids that share an axis and are separated by less than a real pier, so one
  // window band cannot arrive as six slivers
  detVoids.sort((p, r) => p.dir.localeCompare(r.dir) || p.c - r.c || p.t0 - r.t0);
  const dv = [];
  for (const d of detVoids) {
    const last = dv[dv.length - 1];
    if (last && last.dir === d.dir && Math.abs(last.c - d.c) <= 1 && d.t0 - last.t1 < 300) {
      last.t1 = Math.max(last.t1, d.t1);
      last.facade = last.facade || d.facade;
    } else dv.push(Object.assign({}, d));
  }

  const edges = [];
  const addRun = (dir, c, t0, t1, th, sides, real) => {
    const type = th >= 130 ? 'structural' : 'partition';
    const mk = (a, b, isVoid, src) => {
      if (b - a < O.grid) return;
      edges.push({
        id: 'e' + edges.length, dir, wall: dir + Math.round(c), th, type,
        a: dir === 'v' ? { x: c, y: a } : { x: a, y: c },
        b: dir === 'v' ? { x: c, y: b } : { x: b, y: c },
        t0: a, t1: b, len: b - a, void: isVoid, src: src || null, sides,
      });
    };
    if (!real) { mk(t0, t1, false); return; } // a synthetic boundary carries no ink to read
    const voids = clearRuns(dir, c, t0, t1, th).map((r) => ({ a: r[0], b: r[1], src: 'ink' }));
    for (const d of dv) {
      if (d.dir !== dir || Math.abs(d.c - c) > 1) continue;
      const a = Math.max(t0, d.t0), b = Math.min(t1, d.t1);
      if (b - a < O.minOpen) continue; // never emit an opening the contract gate would reject
      if (voids.some((v) => Math.min(v.b, b) - Math.max(v.a, a) > 0)) continue;
      voids.push({ a, b, src: d.facade ? 'detected-facade' : 'detected' });
    }
    voids.sort((p, r) => p.a - r.a);
    let cursor = t0;
    for (const v of voids) {
      if (v.a < cursor) continue;
      mk(cursor, v.a, false);
      mk(v.a, v.b, true, v.src);
      cursor = v.b;
    }
    mk(cursor, t1, false);
  };

  for (let i = 0; i <= nx; i++) {
    const c = xs[i], th = (AX[i] && AX[i].th) || 100;
    let run = null;
    for (let j = 0; j < ny; j++) {
      const L = i > 0 ? group[j * nx + i - 1] : OUT;
      const R = i < nx ? group[j * nx + i] : OUT;
      const key = L === R ? null : L + '|' + R;
      if (run && run.key === key) { run.t1 = ys[j + 1]; continue; }
      if (run) addRun('v', c, run.t0, run.t1, th, run.sides, AX[i] && AX[i].real);
      run = key ? { key, t0: ys[j], t1: ys[j + 1], sides: [ridOf(L), ridOf(R)] } : null;
    }
    if (run) addRun('v', c, run.t0, run.t1, th, run.sides, AX[i] && AX[i].real);
  }
  for (let j = 0; j <= ny; j++) {
    const c = ys[j], th = (AY[j] && AY[j].th) || 100;
    let run = null;
    for (let i = 0; i < nx; i++) {
      const T = j > 0 ? group[(j - 1) * nx + i] : OUT;
      const B = j < ny ? group[j * nx + i] : OUT;
      const key = T === B ? null : T + '|' + B;
      if (run && run.key === key) { run.t1 = xs[i + 1]; continue; }
      if (run) addRun('h', c, run.t0, run.t1, th, run.sides, AY[j] && AY[j].real);
      run = key ? { key, t0: xs[i], t1: xs[i + 1], sides: [ridOf(T), ridOf(B)] } : null;
    }
    if (run) addRun('h', c, run.t0, run.t1, th, run.sides, AY[j] && AY[j].real);
  }
  dbg.edges = edges.length;
  if (edges.length < 4) return fail('NO_WALL_GRID', 'only ' + edges.length + ' boundary segments');

  // ---- no room may be unreachable. First: a room with no opening at all. Then, after the door
  // graph is known, any CLUSTER the walk cannot reach gets a door proposed on its longest shared
  // boundary with the reachable part. An honest low-confidence door beats a sealed room.
  const pt = (e, t) => (e.dir === 'v' ? { x: e.a.x, y: t } : { x: t, y: e.a.y });
  let proposed = 0, carveSeq = 0;
  const carve = (cand, w) => {
    const mid = (cand.t0 + cand.t1) / 2;
    const a = q(mid - w / 2), b = q(mid + w / 2);
    const seq = carveSeq++;
    const clone = (t0, t1, isVoid) => ({
      id: 'p' + seq + '_' + Math.round(t0), dir: cand.dir, wall: cand.wall, th: cand.th,
      type: cand.type, a: pt(cand, t0), b: pt(cand, t1), t0, t1, len: t1 - t0, void: isVoid,
      src: isVoid ? 'proposed' : cand.src, sides: cand.sides,
    });
    const parts = [clone(cand.t0, a, false), clone(a, b, true), clone(b, cand.t1, false)]
      .filter((e) => e.len >= O.grid);
    edges.splice(edges.indexOf(cand), 1, ...parts);
    proposed++;
    return parts.find((e) => e.void);
  };
  const bestBoundary = (test) => edges
    .filter((e) => !e.void && e.sides.filter(Boolean).length === 2 && e.len >= 1200 && test(e))
    .sort((a, b) => b.len - a.len)[0];

  const voidsOf = (rid) => edges.filter((e) => e.void && e.sides.includes(rid)).length;
  for (const r of rooms) {
    if (voidsOf(r.id)) continue;
    const cand = bestBoundary((e) => e.sides.includes(r.id));
    if (cand) carve(cand, 900);
  }

  const byRoom = new Map(rooms.map((r) => [r.id, r]));
  const openings = [];
  const rebuild = () => {
    openings.length = 0;
    for (const r of rooms) r.edges = [];
    for (const e of edges) for (const s of e.sides) if (s && byRoom.has(s)) byRoom.get(s).edges.push(e.id);
    for (const e of edges) {
      if (!e.void) continue;
      const sides = e.sides.filter(Boolean);
      openings.push({
        id: 'o' + (openings.length + 1), wall: e.wall, edge: e.id, t0: e.t0, t1: e.t1,
        width: Math.round(e.len), between: sides,
        kind: e.src === 'detected-facade' || sides.length < 2 ? 'window' : e.len < 1300 ? 'door' : 'opening',
        source: e.src || 'ink',
        confidence: e.src === 'proposed' ? 0.35 : e.src && e.src.startsWith('detected') ? 0.9 : 0.7,
      });
    }
  };
  rebuild();

  // stitch unreachable clusters until the whole flat is walkable
  const walk = () => {
    const adj = new Map(rooms.map((r) => [r.id, new Set()]));
    for (const o of openings) {
      if (o.kind === 'window' || o.between.length !== 2) continue;
      adj.get(o.between[0]).add(o.between[1]);
      adj.get(o.between[1]).add(o.between[0]);
    }
    const entry = openings.find((o) => o.between.length === 1 && o.kind !== 'window');
    const start = (entry && entry.between[0]) ||
      rooms.slice().sort((a, b) => b.areaM2 - a.areaM2)[0].id;
    const seen = new Set([start]), st = [start];
    while (st.length) for (const n of adj.get(st.pop()) || []) if (!seen.has(n)) { seen.add(n); st.push(n); }
    return { adj, seen, start };
  };
  let w = walk();
  for (let pass = 0; pass < 12 && w.seen.size < rooms.length; pass++) {
    const cand = bestBoundary((e) => {
      const [p, r] = e.sides;
      return (w.seen.has(p) && !w.seen.has(r)) || (w.seen.has(r) && !w.seen.has(p));
    });
    if (!cand) break;
    carve(cand, 900);
    rebuild();
    w = walk();
  }
  if (proposed) issues.push({ code: 'DOOR_PROPOSED', severity: 'warn', count: proposed, note: proposed + ' door(s) proposed to reach an otherwise sealed room — confirm position' });
  if (w.seen.size < rooms.length) {
    issues.push({ code: 'UNREACHABLE', severity: 'blocking', count: rooms.length - w.seen.size, note: (rooms.length - w.seen.size) + ' room(s) cannot be reached and no boundary was long enough for a door' });
  }
  if (unhosted) issues.push({ code: 'OPENING_UNHOSTED', severity: 'warn', count: unhosted, note: unhosted + ' detected opening(s) sat on no wall axis' });
  for (const o of openings) if (o.kind === 'door' && o.width < 800) { o.width = 850; o.autofixed = true; }

  // ---- the entrance. A single-sided opening was unconditionally a window, so the front door —
  // which by definition has the outside on one side — could never be found. An HDB main door is
  // 900–1000 mm; a window sits on a cill of at least 1.0 m, so it is the FACADE it sits on that
  // separates them: corridor elevations are largely blank, window walls are not.
  const facades = new Map();
  const edgeById = new Map(edges.map((e) => [e.id, e]));
  for (const o of openings) {
    if (o.between.length !== 1) continue;
    const e = edgeById.get(o.edge);
    if (!e) continue;
    const k = e.dir + ':' + e.c;
    if (!facades.has(k)) facades.set(k, []);
    facades.get(k).push(o);
  }
  let bestEntry = null, bestScore = 0;
  const fewest = Math.min(...[...facades.values()].map((l) => l.length));
  const largest = rooms.slice().sort((a, b) => b.areaM2 - a.areaM2)[0];
  for (const [k, list] of facades) {
    for (const o of list) {
      if (o.width < 850 || o.width > 1200) continue;
      const host = rooms.find((r) => r.id === o.between[0]);
      const label = host ? (O.names[host.traced] || '') : '';
      // HARD requirement, not one of several ways to reach the threshold: a front door opens onto
      // an access space. Width and detected-ness alone were enough to hang a leaf in a bedroom.
      // But "access space" must be judged on CONNECTIVITY, not on a name — the arrival hall of
      // this sheet is named KITCHEN, and a name-only test rejected it before the plausibility
      // escape below could ever fire. A space that connects three or more others IS the hub,
      // whatever the label says. Wet, exterior and service spaces never qualify.
      const links = host && w.adj.get(host.id) ? w.adj.get(host.id).size : 0;
      const hubby = host && links >= 3 && host.areaM2 >= 6;
      const namedAccess = /HALL|FOYER|ENTRY|LIVING/i.test(label);
      const access = host && (namedAccess || hubby || (largest && host.id === largest.id));
      if (!access) continue;
      // A name can be wrong, and vetoing on the name alone is exactly how the front door goes
      // missing. An HDB kitchen is 7–9 m², so a 15 m² "KITCHEN" is a mislabelled living space
      // and must not veto the entrance. Wet rooms and genuinely small service spaces still do.
      const badName = /KITCHEN|YARD|SERVICE|UTILITY|STORE|SHELTER|BATH|WC|TOILET/i.test(label);
      const nameImplausible = /KITCHEN|STORE|UTILITY|YARD/i.test(label) && host.areaM2 > 12;
      if (badName && !nameImplausible && !hubby) continue;
      let score = 3;
      if (hubby) score += 1;                             // the space the flat opens into
      if (o.width >= 900 && o.width <= 1010) score += 2; // HDB main door leaf
      if (list.length === fewest) score += 2;            // the blankest elevation: the corridor side
      if (o.source && o.source.startsWith('detected')) score += 1;
      if (score > bestScore) { bestScore = score; bestEntry = o; }
    }
  }
  if (bestEntry && bestScore >= 4) {
    bestEntry.kind = 'entrance';
    bestEntry.confidence = Math.min(0.75, 0.35 + bestScore * 0.05);
  } else {
    issues.push({ code: 'NO_ENTRANCE', severity: 'warn',
      note: 'no opening on the outer boundary is both a main-door width (850–1200 mm) and onto a hall or living space' });
  }

  const adj = w.adj;
  const exterior = [];
  for (const o of openings) {
    if (o.between.length === 1) exterior.push({ room: o.between[0], o: o.id });
  }
  const isolated = rooms.filter((r) => !adj.get(r.id).size && !exterior.some((e) => e.room === r.id)).length;
  if (isolated) issues.push({ code: 'NO_OPENING', severity: 'warn', count: isolated, note: isolated + ' room(s) have no door' });

  // ---- SPACE GRAMMAR: classify every space, then let the class govern openings.
  // A name alone is a shrug; a class carries rules. Five classes, decided from evidence we
  // already hold — printed label, area, minor dimension, how much of the boundary is on the
  // outer edge, and how many interior doors the space has.
  const EXT_LABEL = /A\/?C|AIRCON|AIR-?CON|LEDGE|PLANTER|VOID|RC/i;
  const roomsOnEdge = new Map();
  for (const r of rooms) for (const id of r.edges) roomsOnEdge.set(id, (roomsOnEdge.get(id) || 0) + 1);
  const WET_LABEL = /BATH|WC|TOILET|SHOWER/i;
  const SVC_LABEL = /STORE|UTILITY|YARD|SERVICE|SHELTER|\bHS\b/i;
  const HAB_LABEL = /BED|LIVING|DINING|KITCHEN|STUDY/i;
  for (const r of rooms) {
    const label = names[r.traced] || '';
    const doors = (adj.get(r.id) || new Set()).size;
    const ext = exterior.filter((e) => e.room === r.id).length;
    // share of this room's boundary sitting on the flat's outer edge
    let onEdge = 0, total = 0;
    for (const id of r.edges) {
      const e = edgeById.get(id);
      if (!e) continue;
      total += e.len;
      if ((roomsOnEdge.get(id) || 0) === 1) onEdge += e.len;
    }
    const edgeShare = total ? onEdge / total : 0;
    let cls = 'habitable';
    if (EXT_LABEL.test(label)) cls = 'exterior';
    else if (WET_LABEL.test(label)) cls = 'wet';
    else if (edgeShare > 0.55 && doors === 0 && r.minDim < 1600) cls = 'exterior';
    else if (/BALCONY/i.test(label) && r.minDim < 1600) cls = 'exterior';
    else if (SVC_LABEL.test(label)) cls = 'service';
    else if (!HAB_LABEL.test(label) && r.minDim < 1600 && doors >= 3) cls = 'circulation';
    else if (!HAB_LABEL.test(label) && !label) cls = 'unknown';
    r.cls = cls;
    // "HALLWAY" is the fallback name for a leftover face — an HDB flat has almost no true
    // hallway. Keep the name only where the space really is circulation.
    if (/HALL|CORRIDOR|PASSAGE/i.test(label) && cls !== 'circulation') {
      r.clsNote = cls === 'exterior' ? 'named HALLWAY but reads as an exterior ledge'
        : 'named HALLWAY but connects only ' + doors + ' space(s) — not circulation';
      r.suspectLabel = true;
    }
  }
  // openings the grammar forbids: an exterior slab has no window and no interior door, and a
  // wet room has a high vent rather than a window
  let vetoed = 0;
  for (let i = openings.length - 1; i >= 0; i--) {
    const o = openings[i];
    if (o.kind !== 'window') continue;
    const host = rooms.find((r) => r.id === (o.between || [])[0]);
    if (!host || (host.cls !== 'exterior' && host.cls !== 'wet')) continue;
    const e = edgeById.get(o.edge);
    if (e) e.void = false; // the boundary goes back to solid wall
    openings.splice(i, 1);
    vetoed++;
  }
  if (vetoed) issues.push({ code: 'WINDOW_VETOED', severity: 'info', count: vetoed,
    note: vetoed + ' window(s) removed from exterior ledges or wet rooms, where a window cannot be' });
  const suspectLabels = rooms.filter((r) => r.suspectLabel).length;
  if (suspectLabels) issues.push({ code: 'LABEL_SUSPECT', severity: 'warn', count: suspectLabels,
    note: suspectLabels + ' room name does not match how the space is connected' });

  const roomArea = rooms.reduce((s, r) => s + r.areaM2, 0);
  const envArea = (envW * envD) / 1e6;
  return {
    ok: true, mmPerPx, wallH: O.wallH,
    envelope: [envW, envD], axes: { x: xs, y: ys },
    walls: edges, edges, rooms, openings, adjacency: adj, exterior, issues,
    stats: Object.assign(dbg, {
      wallSegments: edges.length, danglingEnds: 0,
      coverage: +(roomArea / Math.max(1, envArea)).toFixed(3),
      roomArea: +roomArea.toFixed(1), envArea: +envArea.toFixed(1),
      doors: openings.filter((o) => o.kind === 'door' || o.kind === 'entrance').length,
      entrance: openings.filter((o) => o.kind === 'entrance').length,
      windows: openings.filter((o) => o.kind === 'window').length,
      proposed,
      structural: edges.filter((e) => e.type === 'structural' && !e.void).length,
      exteriorTrimmed: trimmed,
      printed: printedHits,
      printedTotalM2: O.printedTotal || 0,
      spaces: rooms.reduce((m, r) => { m[r.cls] = (m[r.cls] || 0) + 1; return m; }, {}),
      windowsVetoed: vetoed,
      skewDeg: det.skewDeg || 0,
      minRoomDim: rooms.length ? Math.min(...rooms.map((r) => r.minDim)) : 0,
    }),
  };
}
