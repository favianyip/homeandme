// journey-faithful.js — 1:1 3D from a plan detection: the traced drawing itself, extruded.
//
// The catalog path (journey-3d) rebuilds a plan from rectangular space records — right for
// priced layouts, but a detected plan loses its exact shape that way. Here nothing is
// re-authored: WALLS are the detected wall mask extruded pixel-exact (door gaps included,
// because they are gaps in the mask), FLOORS are the detected room regions (L-shapes stay
// L-shaped), OPENINGS become glass or door leaves exactly where the scan found them.
// Detection gaps render as gaps — this is a mirror, not an artist.

/** Exact rectangle decomposition of a mask: row runs, merged across rows with equal span.
 *  The union of returned rects IS the mask (no approximation). */
function decompose(test, W, x0, x1, y0, y1) {
  const rects = [];
  let active = []; // {x0,x1,y0,y1} still growing
  for (let y = y0; y <= y1; y++) {
    const runs = [];
    let s = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const on = x <= x1 && test(y * W + x);
      if (on && s < 0) s = x;
      else if (!on && s >= 0) { runs.push([s, x - 1]); s = -1; }
    }
    const next = [];
    for (const [a, b] of runs) {
      const m = active.find((r) => r.x0 === a && r.x1 === b && r.y1 === y - 1);
      if (m) { m.y1 = y; next.push(m); }
      else { const r = { x0: a, x1: b, y0: y, y1: y }; rects.push(r); next.push(r); }
    }
    active = next;
  }
  return rects;
}

const FLOOR_KIND = (name) => {
  if (/BATH|WC/.test(name)) return 'bath';
  if (/KITCHEN|YARD|UTILITY/.test(name)) return 'tile';
  if (/BALCONY|LEDGE|A\/C|PLANTER/.test(name)) return 'out';
  if (/LIVING|DINING|HALL|FOYER|CORRIDOR/.test(name)) return 'living';
  return 'timber';
};

/** Build the faithful group. det: analysePlan output (needs lbl + wall). Returns {group, stats}. */
export function buildFaithful(det, mmPerPx, names, THREE, guessName, opts) {
  const WH = (opts && opts.wallH) || 2.6;
  const mm = mmPerPx / 1000; // metres per pixel
  const env = det.envelope, W = det.W;
  const cx = (env.x0 + env.x1 + 1) / 2, cz = (env.y0 + env.y1 + 1) / 2;
  const X = (x) => (x - cx) * mm, Z = (y) => (y - cz) * mm;
  const M = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
  const mats = {
    wall: M(0xe9e6df), slab: M(0xd8d3c6),
    living: M(0xdcd5c5), timber: M(0xc9a97c), bath: M(0xb7c3c3), tile: M(0xcfc9b8), out: M(0xbfc4b4),
    door: M(0x8a6c48), lintel: M(0xe0dcd2), fix: M(0xd4cec0), wallS: M(0xb3392e), wallP: M(0x2f6bb0),
    glass: new THREE.MeshLambertMaterial({ color: 0x9fc4cf, transparent: true, opacity: 0.38 }),
    sill: M(0xf2efe8),
  };
  Object.entries(mats).forEach(([k, m]) => { m.name = 'mat-' + k; });
  const group = new THREE.Group(); group.name = 'traced-plan';
  const box = (w, h, d) => new THREE.BoxGeometry(Math.max(w, 0.01), h, Math.max(d, 0.01));
  const place = (geo, mat, x, y, z, name) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.name = name;
    m.castShadow = m.receiveShadow = true; group.add(m); return m;
  };
  const rectBox = (r, h, yC, mat, name) => place(
    box((r.x1 - r.x0 + 1) * mm, h, (r.y1 - r.y0 + 1) * mm), mat,
    X((r.x0 + r.x1 + 1) / 2), yC, Z((r.y0 + r.y1 + 1) / 2), name);

  // WALLS — the mask itself, extruded (specks < 4 px² skipped). Diagnostic mode splits the
  // mask by det.wallClass: red = structural, blue = partition — the owner-plan convention.
  const diag = opts && opts.diagnostic && det.wallClass;
  let wallRects;
  if (diag) {
    const s = decompose((i) => det.wall[i] && det.wallClass[i] === 2, W, env.x0, env.x1, env.y0, env.y1).filter((r) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) >= 4);
    const p = decompose((i) => det.wall[i] && det.wallClass[i] === 1, W, env.x0, env.x1, env.y0, env.y1).filter((r) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) >= 4);
    s.forEach((r, i) => rectBox(r, WH, WH / 2, mats.wallS, 'wall-structural-' + (i + 1)));
    p.forEach((r, i) => rectBox(r, WH, WH / 2, mats.wallP, 'wall-partition-' + (i + 1)));
    wallRects = s.concat(p);
  } else {
    wallRects = decompose((i) => det.wall[i], W, env.x0, env.x1, env.y0, env.y1)
      .filter((r) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) >= 4);
    wallRects.forEach((r, i) => rectBox(r, WH, WH / 2, mats.wall, 'wall-' + (i + 1)));
  }

  // FIXTURES — off by default: the deliverable is a walls-only drawing (opts.fixtures to show)
  let fixtures = 0;
  if (det.fixtures && opts && opts.fixtures) decompose((i) => det.fixtures[i], W, env.x0, env.x1, env.y0, env.y1)
    .filter((r) => { const w = (r.x1 - r.x0 + 1) * mm, d = (r.y1 - r.y0 + 1) * mm; return Math.min(w, d) >= 0.05 && w * d >= 0.015; }) // furniture-sized pieces only — no confetti
    .forEach((r) => rectBox(r, 0.45, 0.225, mats.fix, 'fixture-' + (++fixtures)));

  // FLOORS — each room's exact region; baths drop 25 mm
  let floorRects = 0;
  for (const room of det.rooms) {
    const name = (names && names[room.id]) || (guessName ? guessName(det, room) : 'ROOM');
    const kind = FLOOR_KIND(name);
    const drop = kind === 'bath' || kind === 'out' ? 0.025 : 0;
    const rects = decompose((i) => det.lbl[i] === room.id, W, room.x0, room.x1, room.y0, room.y1);
    rects.forEach((r, i) => rectBox(r, 0.05, -0.025 - drop, mats[kind], 'floor-' + name.replace(/[^A-Z0-9]+/gi, '_') + '-' + room.id + (rects.length > 1 ? '_' + (i + 1) : '')));
    floorRects += rects.length;
  }

  // OPENINGS — windows on the facade, door leaves + lintels inside
  let doors = 0, windows = 0;
  const dc = { entrance: 0, room: 0, wc: 0, arch: 0 };
  const T = Math.max(0.08, 4 * mm); // opening depth ≈ wall thickness
  for (const o of det.openings) {
    const len = (o.to - o.from + 1) * mm, mid = (o.from + o.to + 1) / 2;
    const facade = o.between && (o.between[0] === 0 || o.between[1] === 0);
    const px = o.horiz ? X(mid) : X(o.at), pz = o.horiz ? Z(o.at) : Z(mid);
    const w = o.horiz ? len : T, d = o.horiz ? T : len;
    if (facade) {
      windows++;
      const winTop = Math.min(2.4, WH - 0.05), sill = Math.min(0.9, WH * 0.35);
      place(box(w, winTop - sill, d), mats.glass, px, (winTop + sill) / 2, pz, 'window-' + windows);
      place(box(o.horiz ? len + 0.05 : T + 0.04, 0.06, o.horiz ? T + 0.04 : len + 0.05), mats.sill, px, sill, pz, 'sill-' + windows);
      if (WH > winTop + 0.05) place(box(w, WH - winTop, d), mats.wall, px, (WH + winTop) / 2, pz, 'window-head-' + windows);
    } else {
      doors++;
      // HDB-guideline door classes by clear width: entrance ≈ 1.0 m, room ≈ 0.85 m, WC ≈ 0.72 m;
      // anything ≥ 1.5 m is an archway/wall opening — no leaf
      const clearLen = len + 6 * mm; // morphology bleed compensation (~3 px/side) — classify on CLEAR width, render the traced void
      const cls = clearLen >= 1.5 ? 'arch' : clearLen >= 0.95 ? 'entrance' : clearLen >= 0.75 ? 'room' : 'wc';
      dc[cls]++;
      const doorH = Math.min(2.04, WH - 0.05);
      if (WH > doorH + 0.03) place(box(w, WH - doorH, d), mats.lintel, px, (WH + doorH) / 2, pz, 'lintel-' + doors);
      // threshold slab — continuous floor through the doorway, flush with the room floors
      place(box(o.horiz ? len : T + 0.02, 0.05, o.horiz ? T + 0.02 : len), mats.living, px, -0.026, pz, 'threshold-' + doors);
      if (cls !== 'arch') {
        const capL = cls === 'entrance' ? 1.0 : cls === 'room' ? 0.85 : 0.72;
        const leafLen = Math.min(len * 0.92, capL);
        const geo = new THREE.BoxGeometry(leafLen, doorH, 0.035);
        geo.translate(leafLen / 2, 0, 0); // hinge at origin
        const leaf = new THREE.Mesh(geo, mats.door);
        leaf.name = 'door-' + doors; leaf.castShadow = leaf.receiveShadow = true;
        const hx = o.horiz ? X(o.from) : X(o.at), hz = o.horiz ? Z(o.at) : Z(o.from);
        leaf.position.set(hx, doorH / 2, hz);
        leaf.rotation.y = (o.horiz ? 0 : -Math.PI / 2) + 0.42; // ajar, like the printed swing
        group.add(leaf);
      }
    }
  }

  // ground slab under everything
  const gw = (env.x1 - env.x0 + 1) * mm + 0.6, gd = (env.y1 - env.y0 + 1) * mm + 0.6;
  const slab = place(box(gw, 0.1, gd), mats.slab, 0, -0.11, 0, 'ground-slab');
  slab.castShadow = false;

  return { group, stats: { wallRects: wallRects.length, floorRects, doors, windows, fixtures, doorClasses: dc, meshes: group.children.length } };
}

/** How much of the envelope the trace explains (rooms + walls), 0..1 — shown to the user. */
export function traceCoverage(det) {
  const env = det.envelope;
  let room = 0, wall = 0, tot = 0;
  for (let y = env.y0; y <= env.y1; y++) for (let x = env.x0; x <= env.x1; x++) {
    const i = y * det.W + x; tot++;
    if (det.lbl[i] > 0) room++; else if (det.wall[i]) wall++;
  }
  return { coverage: (room + wall) / tot, roomFrac: room / tot, wallFrac: wall / tot };
}
