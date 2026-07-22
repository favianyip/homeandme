// journey-validate.js — pure-geometry validators for the plan-faithful demo.
// Consumes api.getScene() (rects + derived boundaries/doors/furniture from the SAME canonical
// plan data that generates the 3D) and returns PASS/FAIL per category plus a walkability
// overlay. Grid-BFS navigation is used as the recast-equivalent for this demo scale.
const PRIMARY = /bedbase|wardrobe|desk_|console|dining|counter|counterL|fridge|cashier|gondola|shelf_w|shelf_e|bookshelf|shoecab|washer|wc_|wc_tank|vanity|sidetable|stool|coffee|bench|sofa_|wic_|shelving|outdoor_seat|planter/;
const WALK_SOFT = /shower_tray|floortrap|towel|mirror|drum|rainshower|pillow|mattress|headboard|tv_|shelf_|uppercab|sink|hob|stair_|newel|hinge/;
const CELL = 0.1, CLEAR = 0.02;

const ix = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const rcx = (r, s) => ({ x0: r.x - s.cx, z0: r.z - s.cz, x1: r.x + r.w - s.cx, z1: r.z + r.d - s.cz });

export function validateScene(scene, doc, layoutLabel) {
  const rep = {
    plan: layoutLabel || (doc && doc.display_name) || 'layout',
    geometry: { ok: true, issues: [] },
    doors: { ok: true, issues: [] },
    connectivity: { ok: true, issues: [] },
    furniture: { ok: true, issues: [] },
    walkability: { ok: true, issues: [] },
    vertical: (doc && doc.assumed_verticals && doc.assumed_verticals.label) || 'ASSUMED FOR DEMO — HEIGHT NOT VERIFIED',
    warnings: (doc && doc.needs_review) ? doc.needs_review.slice() : [],
    provenance: doc ? doc.provenance : 'TYPICAL LAYOUT (NOT PLAN-TRACED)',
    overlay: { storeys: [] },
    counts: { rooms: 0, doors: 0, furniture: 0, routes: 0 },
  };
  if (!scene || !scene.storeys.length) { rep.geometry.ok = false; rep.geometry.issues.push('no scene'); rep.blocking = true; return rep; }

  scene.storeys.forEach((s) => {
    rep.counts.rooms += s.rects.length;
    rep.counts.doors += s.doors.length;
    rep.counts.furniture += s.furniture.length;
    // ---- geometry: bounds + overlaps ----
    s.rects.forEach((r) => {
      if (r.x < -0.01 || r.z < -0.01 || r.x + r.w > s.W + 0.01 || r.z + r.d > s.D + 0.01)
        rep.geometry.issues.push(`L${s.si + 1} ${r.key} outside plan envelope`);
      if (r.w <= 0.05 || r.d <= 0.05) rep.geometry.issues.push(`L${s.si + 1} ${r.key} degenerate`);
    });
    for (let i = 0; i < s.rects.length; i++) for (let j = i + 1; j < s.rects.length; j++) {
      const a = s.rects[i], b = s.rects[j];
      const ov = ix(a.x, a.x + a.w, b.x, b.x + b.w) * ix(a.z, a.z + a.d, b.z, b.z + b.d);
      if (ov > 0.02) rep.geometry.issues.push(`L${s.si + 1} overlap ${a.key}×${b.key} (${ov.toFixed(2)}m²)`);
    }
    // ---- doors ----
    const keySet = new Set(s.rects.map((r) => r.key));
    s.doors.forEach((d) => {
      if (d.w < 0.58) rep.doors.issues.push(`L${s.si + 1} ${d.into} door only ${(d.w * 1000) | 0}mm`);
      if (!keySet.has(d.into)) rep.doors.issues.push(`L${s.si + 1} door into unknown ${d.into}`);
      if (d.other !== 'EXTERIOR' && !keySet.has(d.other)) rep.doors.issues.push(`L${s.si + 1} door from unknown ${d.other}`);
      if (d.into === d.other) rep.doors.issues.push(`L${s.si + 1} door connects ${d.into} to itself`);
    });
    s.rects.filter((r) => r.id === 'bath').forEach((r) => {
      if (!s.doors.some((d) => d.into === r.key || d.other === r.key))
        rep.doors.issues.push(`L${s.si + 1} ${r.lbl || r.key}: WC/bath has NO door`);
    });
    // ---- furniture: containment, pairwise overlap, door-swing zones ----
    const prim = s.furniture.filter((f) => PRIMARY.test(f.name) && !WALK_SOFT.test(f.name));
    prim.forEach((f) => {
      const host = s.rects.find((r) => {
        const c = rcx(r, s);
        return (f.x0 + f.x1) / 2 >= c.x0 - 0.05 && (f.x0 + f.x1) / 2 <= c.x1 + 0.05 && (f.z0 + f.z1) / 2 >= c.z0 - 0.05 && (f.z0 + f.z1) / 2 <= c.z1 + 0.05;
      });
      if (!host) { rep.furniture.issues.push(`L${s.si + 1} ${f.name} outside any room`); return; }
      const c = rcx(host, s);
      if (f.x0 < c.x0 - 0.09 || f.x1 > c.x1 + 0.09 || f.z0 < c.z0 - 0.09 || f.z1 > c.z1 + 0.09)
        rep.furniture.issues.push(`L${s.si + 1} ${f.name} pokes through ${host.key} wall`);
    });
    for (let i = 0; i < prim.length; i++) for (let j = i + 1; j < prim.length; j++) {
      const a = prim[i], b = prim[j];
      const ov = ix(a.x0, a.x1, b.x0, b.x1) * ix(a.z0, a.z1, b.z0, b.z1);
      const dep = Math.min(ix(a.x0, a.x1, b.x0, b.x1), ix(a.z0, a.z1, b.z0, b.z1));
      if (ov > 0.06 && dep > 0.12) rep.furniture.issues.push(`L${s.si + 1} ${a.name} ∩ ${b.name}`);
    }
    s.doors.forEach((d) => {
      const swKey = d.sw || d.into;
      const intoR = s.rects.find((r) => r.key === swKey); if (!intoR) return;
      const c = rcx(intoR, s);
      const perpDir = d.horiz ? ((c.z0 + c.z1) / 2 > d.base ? 1 : -1) : ((c.x0 + c.x1) / 2 > d.base ? 1 : -1);
      const depth = d.w * 0.85;
      const sw = d.horiz
        ? { x0: d.p0, x1: d.p1, z0: Math.min(d.base, d.base + perpDir * depth), z1: Math.max(d.base, d.base + perpDir * depth) }
        : { z0: d.p0, z1: d.p1, x0: Math.min(d.base, d.base + perpDir * depth), x1: Math.max(d.base, d.base + perpDir * depth) };
      prim.forEach((f) => {
        const ov = ix(f.x0, f.x1, sw.x0, sw.x1) * ix(f.z0, f.z1, sw.z0, sw.z1);
        const dep = Math.min(ix(f.x0, f.x1, sw.x0, sw.x1), ix(f.z0, f.z1, sw.z0, sw.z1));
        if (ov > 0.05 && dep > 0.14) rep.furniture.issues.push(`L${s.si + 1} ${f.name} blocks ${d.into} door swing [swing ${sw.x0.toFixed(1)},${sw.z0.toFixed(1)}→${sw.x1.toFixed(1)},${sw.z1.toFixed(1)} vs ${f.x0.toFixed(1)},${f.z0.toFixed(1)}→${f.x1.toFixed(1)},${f.z1.toFixed(1)}]`);
      });
    });
    // ---- connectivity graph ----
    const edges = {};
    const link = (a, b) => { (edges[a] = edges[a] || new Set()).add(b); (edges[b] = edges[b] || new Set()).add(a); };
    s.doors.forEach((d) => {
      if (d.kind === 'entry' || d.kind === 'frontdoor') link('ENTRY', d.into); // main door — even when it opens off an interior porch/footway rect
      if (d.other !== 'EXTERIOR') link(d.into, d.other);
    });
    // open boundaries: touching pairs with uncovered shared interval
    for (let i = 0; i < s.rects.length; i++) for (let j = i + 1; j < s.rects.length; j++) {
      const a = s.rects[i], b = s.rects[j];
      let line = null, lo = 0, hi = 0, horiz = false;
      if (Math.abs(a.x + a.w - b.x) < 0.06 || Math.abs(b.x + b.w - a.x) < 0.06) {
        horiz = false; line = Math.abs(a.x + a.w - b.x) < 0.06 ? a.x + a.w : a.x;
        lo = Math.max(a.z, b.z); hi = Math.min(a.z + a.d, b.z + b.d);
      } else if (Math.abs(a.z + a.d - b.z) < 0.06 || Math.abs(b.z + b.d - a.z) < 0.06) {
        horiz = true; line = Math.abs(a.z + a.d - b.z) < 0.06 ? a.z + a.d : a.z;
        lo = Math.max(a.x, b.x); hi = Math.min(a.x + a.w, b.x + b.w);
      }
      if (line == null || hi - lo < 0.55) continue;
      const lineC = line - (horiz ? s.cz : s.cx);
      const loC = lo - (horiz ? s.cx : s.cz), hiC = hi - (horiz ? s.cx : s.cz);
      let covered = 0;
      s.bounds.forEach((bd) => {
        if (bd.horiz !== horiz || Math.abs(bd.base - lineC) > 0.09) return;
        covered += ix(bd.a, bd.b, loC, hiC);
        if (bd.portal) covered -= ix(bd.portal[0], bd.portal[1], loC, hiC);
      });
      if (hi - lo - covered > 0.55) link(a.key, b.key);
    }
    s.graphEdges = edges;
  });
  // vertical portals: stacked pass halls
  for (let f = 0; f + 1 < scene.storeys.length; f++) {
    const a = scene.storeys[f].rects.find((r) => r.key === 'hall');
    const b = scene.storeys[f + 1].rects.find((r) => r.key === 'hall');
    if (a && b && ix(a.x, a.x + a.w, b.x, b.x + b.w) > 0.5 && ix(a.z, a.z + a.d, b.z, b.z + b.d) > 0.5) {
      scene.storeys[f].stairUp = true; scene.storeys[f + 1].stairDown = true;
    } else if (scene.storeys.length > 1) {
      rep.connectivity.issues.push(`stairs not stacked between L${f + 1} and L${f + 2}`);
    }
  }
  // BFS over graph, storey by storey (upper storeys start at the stair)
  scene.storeys.forEach((s) => {
    const seen = new Set();
    const start = s.si === 0 ? 'ENTRY' : (s.rects.some((r) => r.key === 'hall') ? 'hall' : null);
    if (start == null) { rep.connectivity.issues.push(`L${s.si + 1} has no stair landing`); return; }
    const q = [start]; seen.add(start);
    while (q.length) { const n = q.shift(); (s.graphEdges[n] || []).forEach((m) => { if (!seen.has(m)) { seen.add(m); q.push(m); } }); }
    if (s.si === 0 && !seen.has('ENTRY')) rep.connectivity.issues.push('no main entrance found');
    s.rects.forEach((r) => {
      if (r.key === 'ac') return;
      if (!seen.has(r.key)) rep.connectivity.issues.push(`L${s.si + 1} ${r.lbl || r.key} unreachable (graph)`);
    });
  });
  // ---- walkability grid ----
  scene.storeys.forEach((s) => {
    const ox = -s.cx - 0.2, oz = -s.cz - 0.2;
    const cols = Math.ceil((s.W + 0.4) / CELL), rows = Math.ceil((s.D + 0.4) / CELL);
    const walk = new Uint8Array(cols * rows);
    const at = (x, z) => [Math.floor((x - ox) / CELL), Math.floor((z - oz) / CELL)];
    s.rects.forEach((r) => {
      if (r.key === 'ac') return;
      const c = rcx(r, s);
      const [c0, r0] = at(c.x0 + 0.02, c.z0 + 0.02), [c1, r1] = at(c.x1 - 0.02, c.z1 - 0.02);
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) if (rr >= 0 && cc >= 0 && rr < rows && cc < cols) walk[rr * cols + cc] = 1;
    });
    s.bounds.forEach((bd) => {
      const half = bd.thick / 2 + CELL * 0.45;
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
        const x = ox + (cc + 0.5) * CELL, z = oz + (rr + 0.5) * CELL;
        const along = bd.horiz ? x : z, perp = bd.horiz ? z : x;
        if (along < bd.a - 0.02 || along > bd.b + 0.02 || Math.abs(perp - bd.base) > half) continue;
        if (bd.portal && along >= bd.portal[0] - 0.02 && along <= bd.portal[1] + 0.02) continue;
        walk[rr * cols + cc] = 0;
      }
    });
    s.furniture.forEach((f) => {
      if (WALK_SOFT.test(f.name)) return;
      const [c0, r0] = at(f.x0 - CLEAR, f.z0 - CLEAR), [c1, r1] = at(f.x1 + CLEAR, f.z1 + CLEAR);
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++)
        if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && walk[rr * cols + cc] === 1) walk[rr * cols + cc] = 2;
    });
    // start cell
    let start = null;
    if (s.si === 0) {
      const e = s.doors.find((d) => d.kind === 'entry' || d.kind === 'frontdoor') || s.doors[0];
      if (e) {
        const intoR = s.rects.find((r) => r.key === e.into);
        const c = intoR ? rcx(intoR, s) : null;
        const mid = (e.p0 + e.p1) / 2;
        const perpDir = c ? ((e.horiz ? (c.z0 + c.z1) / 2 : (c.x0 + c.x1) / 2) > e.base ? 1 : -1) : 1;
        start = e.horiz ? [mid, e.base + perpDir * 0.25] : [e.base + perpDir * 0.25, mid];
      }
    } else {
      const h = s.rects.find((r) => r.key === 'hall');
      if (h) { const c = rcx(h, s); start = [(c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2]; }
    }
    const routes = [], portals = [];
    s.doors.forEach((d) => portals.push(d.horiz ? [(d.p0 + d.p1) / 2, d.base] : [d.base, (d.p0 + d.p1) / 2]));
    if (!start) { rep.walkability.issues.push(`L${s.si + 1}: no start point`); }
    else {
      const [sc, sr] = at(start[0], start[1]);
      const src = sr * cols + sc;
      const prev = new Int32Array(cols * rows).fill(-1);
      if (walk[src] !== 1) { let f = -1; for (let dd = 1; dd < 6 && f < 0; dd++) for (let rr = sr - dd; rr <= sr + dd && f < 0; rr++) for (let cc = sc - dd; cc <= sc + dd && f < 0; cc++) if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && walk[rr * cols + cc] === 1) f = rr * cols + cc; if (f >= 0) prev[f] = f; }
      else prev[src] = src;
      const q = []; for (let i = 0; i < prev.length; i++) if (prev[i] === i) q.push(i);
      while (q.length) {
        const n = q.shift(); const nr = (n / cols) | 0, nc = n % cols;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
          const rr = nr + dr, cc = nc + dc; if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) return;
          const m = rr * cols + cc; if (walk[m] === 1 && prev[m] === -1) { prev[m] = n; q.push(m); }
        });
      }
      s.rects.forEach((r) => {
        if (r.key === 'ac' || r.pass) return;
        const c = rcx(r, s);
        let best = -1, bd2 = 1e9, anyFree = false;
        const [c0, r0] = at(c.x0 + 0.05, c.z0 + 0.05), [c1, r1] = at(c.x1 - 0.05, c.z1 - 0.05);
        const mx = (c.x0 + c.x1) / 2, mz = (c.z0 + c.z1) / 2;
        for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
          if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
          const m = rr * cols + cc; if (walk[m] !== 1) continue;
          anyFree = true;
          if (prev[m] === -1) continue; // free but not reached (enclosed pocket) — not a valid target
          const x = ox + (cc + 0.5) * CELL, z = oz + (rr + 0.5) * CELL;
          const d2 = (x - mx) * (x - mx) + (z - mz) * (z - mz);
          if (d2 < bd2) { bd2 = d2; best = m; }
        }
        if (!anyFree) { rep.walkability.issues.push(`L${s.si + 1} ${r.lbl || r.key}: no free floor cell`); routes.push({ ok: false, pts: [] }); return; }
        if (best < 0) { rep.walkability.issues.push(`L${s.si + 1} ${r.lbl || r.key}: no walkable route from ${s.si === 0 ? 'entrance' : 'stair'}`); routes.push({ ok: false, pts: [[mx, mz]] }); return; }
        const pts = []; let n = best, guard = 0;
        while (n !== prev[n] && guard++ < 40000) { pts.push([ox + ((n % cols) + 0.5) * CELL, oz + (((n / cols) | 0) + 0.5) * CELL]); n = prev[n]; }
        pts.push([ox + ((n % cols) + 0.5) * CELL, oz + (((n / cols) | 0) + 0.5) * CELL]);
        routes.push({ ok: true, pts: pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1).reverse() });
      });
    }
    rep.counts.routes += routes.length;
    rep.overlay.storeys.push({ si: s.si, cell: CELL, origin: [ox, oz], cols, rows, walk: Array.from(walk), routes, portals });
  });
  ['geometry', 'doors', 'connectivity', 'furniture', 'walkability'].forEach((k) => { rep[k].ok = rep[k].issues.length === 0; });
  rep.blocking = !(rep.geometry.ok && rep.doors.ok && rep.connectivity.ok && rep.walkability.ok);
  rep.furnitureAdvisory = !rep.furniture.ok;
  return rep;
}
