import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSolid,
  compileWallOpeningSegments,
  projectToSolidContract,
} from '../journey-solid.js';

// ─── Minimal THREE stub ───────────────────────────────────────────────────────
// Captures only what buildSolid actually calls so we can inspect mesh positions.
const THREE_STUB = {
  Group: class {
    constructor() { this.children = []; }
    add(child) { this.children.push(child); }
  },
  Mesh: class {
    constructor(geometry) {
      this.geometry = geometry;
      this.name = '';
      this.castShadow = false;
      this.receiveShadow = false;
      this.rotation = { x: 0, y: 0, z: 0 };
      this.userData = {};
      const self = this;
      this.position = { set(x, y, z) { self.px = x; self.py = y; self.pz = z; } };
    }
  },
  BoxGeometry: class {
    constructor(w, h, d) { this.w = w; this.h = h; this.d = d; }
    translate(x, y, z) { this.tx = x; this.ty = y; this.tz = z; }
  },
  MeshStandardMaterial: class { constructor() {} },
  Color: class { constructor() {} },
  DoubleSide: 2,
};

const project = {
  schema: 'hnm-project/1', units: 'mm',
  provenance: { source: 'plan.png', requiresConfirmation: false, scaleStatus: 'customer_confirmed' },
  calibration: { status: 'customer_confirmed' },
  verticalDimensions: { status: 'customer_confirmed', requiresSiteVerification: true },
  storeys: [{ id: 'level-1', envelope: [5000, 4000], height: 2800 }],
  geometry: {
    walls: [
      { id: 'w1', storeyId: 'level-1', path: { kind: 'line', start: [0, 0], end: [5000, 0] }, thickness: 150, height: 2800, structuralClass: 'structural' },
      { id: 'w2', storeyId: 'level-1', path: { kind: 'line', start: [5000, 0], end: [5000, 4000] }, thickness: 150, height: 2800, structuralClass: 'structural' },
      { id: 'w3', storeyId: 'level-1', path: { kind: 'line', start: [5000, 4000], end: [0, 4000] }, thickness: 150, height: 2800, structuralClass: 'structural' },
      { id: 'w4', storeyId: 'level-1', path: { kind: 'line', start: [0, 4000], end: [0, 0] }, thickness: 150, height: 2800, structuralClass: 'structural' },
    ],
    openings: [
      { id: 'd1', storeyId: 'level-1', wallId: 'w1', kind: 'door', span: { startRatio: .2, endRatio: .4, width: 1000 }, height: 2100, sill: 0 },
      { id: 'win1', storeyId: 'level-1', wallId: 'w3', kind: 'window', span: { startRatio: .2, endRatio: .5, width: 1500 }, height: 1200, sill: 900 },
    ],
    spaces: [{ id: 'r1', storeyId: 'level-1', name: 'LIVING', type: 'living', wallIds: ['w1', 'w2', 'w3', 'w4'], boundary: [[0, 0], [5000, 0], [5000, 4000], [0, 4000]], areaM2: 20 }],
  },
  relationships: { adjacency: [] }, issues: [],
};

test('authoritative project storey maps to production solid input', () => {
  const contract = projectToSolidContract(project);
  assert.equal(contract.schema, 'hnm-plan-contract/1');
  assert.deepEqual(contract.walls[0].a, [0, 0]);
  assert.equal(contract.walls[0].type, 'structural');
  assert.equal(contract.openings[0].wall, 'w1');
  assert.equal(contract.rooms[0].label, 'LIVING');
});

test('curved walls fail visibly until the curve compiler is available', () => {
  const curved = structuredClone(project);
  curved.geometry.walls[0].path.kind = 'arc';
  assert.throws(() => projectToSolidContract(curved), /curve mesh compiler/);
});

test('local hnm-project extrusion fails closed on a wall gap or unverified dimensions', () => {
  const gap = structuredClone(project);
  gap.geometry.walls[3].path.end = [0, 100];
  assert.throws(() => projectToSolidContract(gap), /DANGLING_WALL_ENDPOINTS/);

  const dimensions = structuredClone(project);
  dimensions.verticalDimensions.status = 'unverified';
  assert.throws(() => projectToSolidContract(dimensions), /VERTICAL_DIMENSIONS_UNVERIFIED/);
});

test('authoritative host wall is cut for mixed door and window openings', () => {
  const mixed = structuredClone(project);
  mixed.geometry.openings = [
    { id: 'door-a', storeyId: 'level-1', wallId: 'w1', kind: 'door',
      span: { startRatio: .1, endRatio: .25, width: 750 }, height: 2100, sill: 0 },
    { id: 'window-a', storeyId: 'level-1', wallId: 'w1', kind: 'window',
      span: { startRatio: .5, endRatio: .8, width: 1500 }, height: 1200, sill: 900 },
  ];
  const contract = projectToSolidContract(mixed);
  contract.rooms = [];
  const compiled = compileWallOpeningSegments(contract.walls, contract.openings);
  const hostSegments = compiled.filter((segment) => segment.hostWallId === 'w1');
  assert.equal(hostSegments.filter((segment) => segment.segmentKind === 'solid').length, 3);
  assert.deepEqual(hostSegments.filter((segment) => segment.segmentKind === 'opening')
    .map((segment) => [segment.opening.id, segment.opening.kind]), [
    ['door-a', 'door'],
    ['window-a', 'window'],
  ]);
  assert.equal(new Set(compiled.map((segment) => segment.id)).size, compiled.length);

  const { group, stats } = buildSolid(contract, THREE_STUB, { labels: false });
  const names = group.children.map((mesh) => mesh.name);
  const hostWallMeshes = group.children.filter((mesh) => mesh.name.startsWith('Wall_')
    && mesh.name.includes('w1'));

  assert.equal(hostWallMeshes.length, 3, 'two openings must leave three solid host-wall intervals');
  assert.equal(hostWallMeshes.some((mesh) => Math.abs(mesh.geometry.w - 5) < 1e-9), false,
    'the uncut 5 m host wall must not survive behind its openings');
  assert.ok(names.some((name) => name.includes('door-a')));
  assert.ok(names.some((name) => name.includes('window-a')));
  assert.equal(new Set(names).size, names.length, 'every semantic mesh name must be unique');
  assert.deepEqual(stats, {
    hostWalls: 4, walls: 4, solidSegments: 6, openingVoids: 2, legacyExperimentalVoids: 0,
    floors: 0, doors: 1, windows: 1, lintels: 1, sills: 1, heads: 1,
    glazings: 1, thresholds: 1, doorLeaves: 1, labels: 0, entrance: 0,
    parapets: 0, topH: 2.8,
  });

  const component = (openingId, name) => group.children.find((mesh) =>
    mesh.userData?.openingId === openingId && mesh.userData?.component === name);
  const sill = component('window-a', 'window-sill');
  const head = component('window-a', 'window-head');
  const glazing = component('window-a', 'window-glazing');
  const lintel = component('door-a', 'opening-lintel');
  const leaf = component('door-a', 'door-leaf');
  assert.deepEqual([sill.geometry.w, sill.geometry.h, sill.py], [1.5, .9, .45]);
  assert.ok(Math.abs(head.geometry.h - .7) < 1e-9);
  assert.ok(Math.abs(head.py - 2.45) < 1e-9);
  assert.ok(Math.abs(glazing.geometry.w - 1.5) < 1e-9);
  assert.ok(Math.abs(glazing.geometry.h - 1.2) < 1e-9);
  assert.ok(Math.abs(glazing.py - 1.5) < 1e-9);
  assert.ok(Math.abs(lintel.geometry.w - .75) < 1e-9);
  assert.ok(Math.abs(lintel.geometry.h - .7) < 1e-9);
  assert.ok(Math.abs(leaf.geometry.w - .6975) < 1e-9);
  assert.ok(Math.abs(leaf.geometry.h - 2.08) < 1e-9);
});

test('opening ratios stay on the original host after junction trimming', () => {
  const walls = [
    { id: 'host', a: [0, 1000], b: [3000, 1000], thickness: 150, height: 2800, type: 'partition' },
    { id: 'cross', a: [0, 0], b: [0, 5000], thickness: 150, height: 2800, type: 'structural' },
  ];
  const segments = compileWallOpeningSegments(walls, [
    { id: 'door', wall: 'host', kind: 'door', t0: .2, t1: .4, height: 2100, sill: 0 },
  ]);
  const opening = segments.find((segment) => segment.openingId === 'door');
  assert.deepEqual(opening.a, [600, 1000]);
  assert.deepEqual(opening.b, [1200, 1000]);
  assert.deepEqual(segments.find((segment) => segment.id === 'host::solid:0').a, [75, 1000]);
});

test('interval compiler rejects ambiguous opening inputs and the box path rejects diagonals', () => {
  const wall = { id: 'host', a: [0, 0], b: [3000, 0], thickness: 150, height: 2800 };
  assert.throws(() => compileWallOpeningSegments([wall], [
    { id: 'a', wall: 'host', t0: .2, t1: .6 },
    { id: 'b', wall: 'host', t0: .5, t1: .8 },
  ]), /invalid or overlapping/);
  assert.throws(() => compileWallOpeningSegments([wall], [
    { id: 'a', wall: 'missing', t0: .2, t1: .4 },
  ]), /references missing wall/);
  assert.throws(() => compileWallOpeningSegments([wall], [
    { id: 'same', wall: 'host', t0: .1, t1: .2 },
    { id: 'same', wall: 'host', t0: .3, t1: .4 },
  ]), /Opening IDs must be present and unique/);

  const diagonal = {
    schema: 'hnm-plan-contract/1', ok: true, units: 'mm', envelope: [3000, 3000],
    walls: [{ ...wall, a: [0, 0], b: [3000, 3000] }], openings: [], rooms: [],
  };
  assert.throws(() => buildSolid(diagonal, THREE_STUB, { labels: false }), /oriented wall mesher/);
});

test('single-opening legacy void walls stay explicitly experimental and unambiguous', () => {
  const wall = {
    id: 'legacy-void', a: [1000, 0], b: [1800, 0], thickness: 150,
    height: 2800, type: 'partition', void: true,
  };
  const opening = {
    id: 'legacy-door', wall: 'legacy-void', kind: 'door',
    t0: .2, t1: .8, height: 2100, sill: 0,
  };
  const segments = compileWallOpeningSegments([wall], [opening]);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].legacyExperimental, true);
  assert.deepEqual([segments[0].a, segments[0].b, segments[0].t0, segments[0].t1],
    [[1000, 0], [1800, 0], 0, 1]);
  const legacyBuild = buildSolid({
    schema: 'hnm-plan-contract/1', ok: true, units: 'mm', envelope: [3000, 2000],
    walls: [wall], openings: [opening], rooms: [],
  }, THREE_STUB, { labels: false });
  assert.equal(legacyBuild.stats.openingVoids, 1);
  assert.equal(legacyBuild.stats.legacyExperimentalVoids, 1);
  assert.equal(legacyBuild.group.children.every((mesh) =>
    mesh.userData?.legacyExperimental === true), true);
  assert.throws(() => compileWallOpeningSegments([wall], [opening, {
    ...opening, id: 'legacy-door-2', t0: .8, t1: 1,
  }]), /cannot represent multiple openings/);
});

test('a parapet classification cannot silently swallow a hosted opening', () => {
  const contract = {
    schema: 'hnm-plan-contract/1', ok: true, units: 'mm', envelope: [3000, 2000],
    walls: [{ id: 'balcony-edge', a: [0, 0], b: [3000, 0], thickness: 150,
      height: 2800, type: 'partition' }],
    openings: [{ id: 'ambiguous-window', wall: 'balcony-edge', kind: 'window',
      t0: .2, t1: .8, height: 1200, sill: 900 }],
    rooms: [{ id: 'balcony', label: 'BALCONY', areaM2: 6,
      cycle: ['balcony-edge'], poly: [] }],
  };
  assert.throws(() => buildSolid(contract, THREE_STUB, { labels: false }),
    /cannot silently discard opening ambiguous-window/);
});

test('buildSolid generates non-overlapping wall meshes for a 3-room plan', () => {
  // 3-room HDB-style plan (mm):
  //   Room A: x=[0,5000], y=[0,4000]
  //   Room B: x=[5000,9000], y=[0,4000]
  //   Room C: x=[0,9000], y=[4000,7000]
  //
  // Six structural walls on centrelines (thickness 150mm):
  const TH = 150;
  const contract = {
    schema: 'hnm-plan-contract/1', ok: true, units: 'mm',
    envelope: [9000, 7000],
    walls: [
      { id: 'W1', a: [0,    0],    b: [9000, 0],    thickness: TH, height: 2800, type: 'structural' },
      { id: 'W2', a: [0,    0],    b: [0,    7000], thickness: TH, height: 2800, type: 'structural' },
      { id: 'W3', a: [0,    7000], b: [9000, 7000], thickness: TH, height: 2800, type: 'structural' },
      { id: 'W4', a: [9000, 0],    b: [9000, 7000], thickness: TH, height: 2800, type: 'structural' },
      { id: 'W5', a: [5000, 0],    b: [5000, 4000], thickness: TH, height: 2800, type: 'partition' },
      { id: 'W6', a: [0,    4000], b: [9000, 4000], thickness: TH, height: 2800, type: 'structural' },
    ],
    openings: [],
    rooms: [],
    adjacency: [], issues: [],
  };

  const { group } = buildSolid(contract, THREE_STUB, { labels: false });

  // Collect only the solid Wall_ meshes (skip Lintel_, Sill_, Floor_, etc.)
  const wallMeshes = group.children.filter((m) => m.name.startsWith('Wall_'));
  assert.ok(wallMeshes.length >= 6, `expected ≥6 wall meshes, got ${wallMeshes.length}`);

  // Build XZ-plane AABBs from mesh position (px,pz) and BoxGeometry half-dims (w,d).
  // buildSolid converts mm→m: position and box dims are already in metres.
  const aabbs = wallMeshes.map((m) => {
    const hw = m.geometry.w / 2; // half-width  (X axis in metres)
    const hd = m.geometry.d / 2; // half-depth  (Z axis in metres)
    return {
      id: m.name,
      xmin: m.px - hw, xmax: m.px + hw,
      zmin: m.pz - hd, zmax: m.pz + hd,
    };
  });

  // Pairwise interior-overlap check (edge-touching is fine, interior overlap is not).
  const OVERLAP_EPS = 0.0001; // 0.1 mm in metres
  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      const A = aabbs[i], B = aabbs[j];
      const ox = Math.min(A.xmax, B.xmax) - Math.max(A.xmin, B.xmin);
      const oz = Math.min(A.zmax, B.zmax) - Math.max(A.zmin, B.zmin);
      const overlap = Math.min(ox, oz);
      assert.ok(
        overlap <= OVERLAP_EPS,
        `${A.id} ∩ ${B.id}: interior overlap ${(overlap * 1000).toFixed(1)} mm (ox=${(ox*1000).toFixed(1)}, oz=${(oz*1000).toFixed(1)})`
      );
    }
  }
});
