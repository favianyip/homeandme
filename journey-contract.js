// The plan contract — the single hand-off between detection and everything downstream
// (3D, DXF, SketchUp, area schedule). Produced by Stage 2, validated by hard gates here.
//
// Walls are centreline + thickness, never outline polygons. Rooms reference wall-segment ids
// rather than owning coordinates, so a room cannot disagree with the wall it sits against.
//
//   buildContract(reg, meta)   regulariser output -> contract object
//   validateContract(c)        -> { gates, blocking, warnings, clicksToFix, verdict }
//   toDXF(c)                   -> wall centrelines + openings, importable by SketchUp

export const SCHEMA = 'hnm-plan-contract/1';

export function buildContract(reg, meta) {
  const m = meta || {};
  if (!reg || !reg.ok) {
    return { schema: SCHEMA, ok: false, units: 'mm', source: m.source || null,
      scale: null, walls: [], openings: [], rooms: [], issues: (reg && reg.issues) || [] };
  }
  const names = m.names || {};
  return {
    schema: SCHEMA, ok: true, units: 'mm',
    source: m.source || null,
    lane: m.lane || 'raster',
    envelope: reg.envelope,
    scale: { mmPerPx: +reg.mmPerPx.toFixed(3), source: m.scaleSource || 'unknown',
      confidence: m.scaleConfidence != null ? m.scaleConfidence : 0.5 },
    axes: { rotationDeg: m.rotationDeg || 0, x: reg.axes.x, y: reg.axes.y },
    walls: reg.edges.map((e) => ({
      id: e.id, a: [e.a.x, e.a.y], b: [e.b.x, e.b.y],
      thickness: e.th, type: e.type, height: reg.wallH,
      void: !!e.void, confidence: e.void ? 0.7 : 0.95,
    })),
    openings: reg.openings.map((o) => ({
      id: o.id, wall: o.edge, t0: o.t0, t1: o.t1, kind: o.kind,
      width: o.width, between: o.between, autofixed: !!o.autofixed,
      source: o.source, confidence: o.confidence,
    })),
    rooms: reg.rooms.map((r) => {
      const sug = (m.suggested || {})[r.id];
      const bad = !!(m.suspect || {})[r.id];
      const traced = names[r.traced] || null;
      return {
        id: r.id, cycle: r.edges, poly: r.poly, areaM2: r.areaM2, minDim: r.minDim,
      cls: r.cls, clsNote: r.clsNote || null, suspectLabel: !!r.suspectLabel,
        fixInk: r.fixInk, labelSuspect: bad || undefined,
        label: sug ? (sug.label || 'BATH / WC (SUGGESTED)') : traced,
        labelSource: sug ? 'suggested' : traced ? (bad ? 'trace-suspect' : (m.labelSource || 'trace')) : 'none',
        confidence: sug ? sug.confidence : traced ? (bad ? 0.3 : 0.8) : 0.4,
      };
    }),
    adjacency: [...(reg.adjacency || new Map())].map(([id, set]) => [id, [...set]]),
    expected: m.expected || null,
    stats: reg.stats,
    issues: reg.issues,
  };
}

const GATE = (id, label, severity, pass, detail) => ({ id, label, severity, pass, detail });

/** The gates. A blocking gate that fails must stop publication — a visible honest failure is
 *  worth more than a silent broken walkthrough. */
export function validateContract(c) {
  const gates = [];
  if (!c || !c.ok) {
    gates.push(GATE('WATERTIGHT', 'Watertight', 'blocking', false,
      (c && c.issues && c.issues[0] && (c.issues[0].note || c.issues[0].code)) || 'no geometry'));
    return { gates, blocking: 1, warnings: 0, clicksToFix: 99, verdict: 'FAIL', reach: 0 };
  }
  const st = c.stats || {};

  // 1. watertight — every room is a closed cycle by construction, so what can still go wrong
  // is a region the graph failed to close: it shows up as missing floor area and free ends.
  const cov = st.coverage || 0;
  gates.push(GATE('WATERTIGHT', 'Watertight', 'blocking',
    !st.danglingEnds && cov >= 0.75 && c.rooms.length >= 3,
    st.danglingEnds + ' free end(s), ' + Math.round(cov * 100) + '% of envelope enclosed'));

  // 2. reachability — walk the door graph from the entrance
  const ids = c.rooms.map((r) => r.id);
  const adj = new Map(ids.map((id) => [id, []]));
  for (const [id, list] of c.adjacency || []) if (adj.has(id)) adj.set(id, list.filter((n) => adj.has(n)));
  const ext = new Set();
  for (const o of c.openings) {
    if ((o.between || []).length === 1 && o.kind !== 'window') ext.add(o.between[0]);
  }
  const biggest = c.rooms.slice().sort((a, b) => b.areaM2 - a.areaM2)[0];
  const start = [...ext][0] || (biggest && biggest.id);
  const seen = new Set(start ? [start] : []), stack = start ? [start] : [];
  while (stack.length) {
    for (const n of adj.get(stack.pop()) || []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  const reach = ids.length ? seen.size / ids.length : 0;
  gates.push(GATE('REACHABLE', 'Reachability', 'blocking', reach >= 0.999,
    seen.size + '/' + ids.length + ' rooms reachable from ' + (ext.size ? 'the entrance' : 'the largest room')));

  // 3. area sanity against the matched archetype. Compare LIKE WITH LIKE: archetype envelopes
  // are gross outside dimensions, so they must be checked against the envelope, not against the
  // sum of room polygons — that sum necessarily excludes wall footprints and trimmed ledges and
  // would under-read by 15–20% on every plan.
  if (c.expected && c.expected.areaM2) {
    const err = Math.abs(st.envArea - c.expected.areaM2) / c.expected.areaM2;
    const inner = st.envArea ? st.roomArea / st.envArea : 0;
    gates.push(GATE('AREA', 'Area sanity', 'warn', err <= 0.05,
      Math.round(err * 100) + '% vs ' + c.expected.areaM2 + ' m² expected · '
      + st.roomArea + ' m² of that is floor (' + Math.round(inner * 100) + '%)'));
  }

  // 4. orthogonality — free by construction, reported so a deskew failure is visible
  const skew = c.walls.filter((w) => w.a[0] !== w.b[0] && w.a[1] !== w.b[1]).length;
  gates.push(GATE('ORTHO', 'Orthogonality', 'warn', skew === 0, skew + ' off-axis segment(s)'));

  // 5. openings within buildable widths — a facade window band is legitimately wide, so the
  // 2.4 m cap applies to doors and interior openings only
  const badW = c.openings.filter((o) => {
    const max = o.kind === 'window' ? 6000 : 2400;
    return o.width < 600 || o.width > max;
  });
  gates.push(GATE('OPENINGS', 'Openings', 'warn', badW.length === 0,
    c.openings.length + ' opening(s), ' + badW.length + ' out of range, ' +
    c.openings.filter((o) => o.autofixed).length + ' auto-corrected'));

  // 6. scale plausibility
  if (c.expected && c.expected.mmPerPx) {
    const e = Math.abs(c.scale.mmPerPx - c.expected.mmPerPx) / c.expected.mmPerPx;
    gates.push(GATE('SCALE', 'Scale', 'warn', e <= 0.15, Math.round(e * 100) + '% off the archetype expectation'));
  }

  // 7. interior only — a room too narrow to stand in means an exterior ledge or a wall cavity
  // got modelled as space, which is what puts fins and slivers in the 3D
  const narrow = c.rooms.filter((r) => r.minDim && r.minDim < 1200);
  gates.push(GATE('INTERIOR', 'Interior only', 'warn', narrow.length === 0,
    narrow.length ? narrow.length + ' room(s) under 1.2 m wide' :
      'no slivers' + (st.exteriorTrimmed ? ' · ' + st.exteriorTrimmed + ' ledge(s) trimmed' : '')));

  // 8. a home cannot have no WC — every HDB type has a known count, so a shortfall is a
  // detection miss to be reported, never a property of the flat
  if (c.expected && c.expected.wc) {
    const wc = (c.stats || {}).wc || 0;
    gates.push(GATE('WC', 'Sanitary', 'warn', wc >= c.expected.wc,
      wc + ' of ' + c.expected.wc + ' WC traced' + (wc < c.expected.wc ? ' — see the suggested locations' : '')));
  }

  const blocking = gates.filter((g) => !g.pass && g.severity === 'blocking').length;
  const warnings = gates.filter((g) => !g.pass && g.severity === 'warn').length;
  // what a human must actually touch: a proposed door, an unlabelled room, an out-of-range
  // opening. Ink-derived geometry is evidence, not a question.
  const toTouch = c.rooms.filter((r) => !r.label).length +
    c.openings.filter((o) => o.confidence < 0.5).length + badW.length + narrow.length;
  return {
    gates, blocking, warnings, reach, entry: ext.size > 0,
    clicksToFix: blocking * 3 + toTouch,
    verdict: blocking ? 'BLOCK' : toTouch || warnings ? 'REVIEW' : 'PASS',
  };
}

/** Wall centrelines on one layer, openings on another. Imports natively into SketchUp and
 *  stays push-pull-able — the fastest path out of the browser and into a modeller. */
export function toDXF(c) {
  const L = ['0', 'SECTION', '2', 'ENTITIES'];
  const line = (layer, x1, y1, x2, y2) => L.push(
    '0', 'LINE', '8', layer, '10', x1.toFixed(1), '20', (-y1).toFixed(1),
    '11', x2.toFixed(1), '21', (-y2).toFixed(1));
  for (const w of c.walls || []) {
    line(w.void ? 'OPENINGS' : w.type === 'structural' ? 'WALL-STRUCTURAL' : 'WALL-PARTITION',
      w.a[0], w.a[1], w.b[0], w.b[1]);
  }
  for (const r of c.rooms || []) {
    const p = r.poly || [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      line('ROOM-' + (r.label || r.id).replace(/[^A-Z0-9]+/gi, '_').toUpperCase(), a[0], a[1], b[0], b[1]);
    }
  }
  L.push('0', 'ENDSEC', '0', 'EOF');
  return L.join('\n');
}
