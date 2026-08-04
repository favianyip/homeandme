import assert from 'node:assert/strict';
import test from 'node:test';

import { validateProject3dReadiness, validateProjectTopology } from '../journey-topology-gate.js';

function rectangle() {
  return {
    schema: 'hnm-project/1', units: 'mm',
    provenance: { requiresConfirmation: false, scaleStatus: 'customer_confirmed' },
    calibration: { status: 'customer_confirmed' },
    verticalDimensions: { status: 'customer_confirmed', requiresSiteVerification: true },
    storeys: [{ id: 's1', height: 2800 }],
    geometry: {
      walls: [
        { id: 'n', storeyId: 's1', path: { kind: 'line', start: [0, 4000], end: [6000, 4000] }, thickness: 150, height: 2800 },
        { id: 'e', storeyId: 's1', path: { kind: 'line', start: [6000, 4000], end: [6000, 0] }, thickness: 150, height: 2800 },
        { id: 's', storeyId: 's1', path: { kind: 'line', start: [6000, 0], end: [0, 0] }, thickness: 150, height: 2800 },
        { id: 'w', storeyId: 's1', path: { kind: 'line', start: [0, 0], end: [0, 4000] }, thickness: 150, height: 2800 },
      ],
      openings: [
        { id: 'entry', storeyId: 's1', wallId: 's', kind: 'door', span: { startRatio: .1, endRatio: .25 }, height: 2100, sill: 0 },
        { id: 'living-window', storeyId: 's1', wallId: 'n', kind: 'window', span: { startRatio: .2, endRatio: .5 }, height: 1200, sill: 900 },
      ],
      spaces: [
        { id: 'living', wallIds: ['n', 'e', 's', 'w'], boundary: [[0, 0], [6000, 0], [6000, 4000], [0, 4000]] },
      ],
      columns: [], shafts: [], beams: [],
    },
  };
}

test('a closed connected unit with hosted openings passes the topology gate', () => {
  const result = validateProjectTopology(rectangle());
  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
});

test('one visible wall gap blocks the entire project', () => {
  const project = rectangle();
  project.geometry.walls[3].path.end = [0, 3900];
  const result = validateProjectTopology(project);
  assert.equal(result.ok, false);
  assert.ok(result.blocking.some((item) => item.code === 'DANGLING_WALL_ENDPOINTS'));
});

test('room boundaries may use a partial span of a long wall at valid T-junctions', () => {
  const project = rectangle();
  project.geometry.walls.push({
    id: 'divider', storeyId: 's1',
    path: { kind: 'line', start: [3000, 0], end: [3000, 4000] },
    thickness: 100, height: 2800,
  });
  project.geometry.spaces = [
    { id: 'left', wallIds: ['s', 'divider', 'n', 'w'], boundary: [[0, 0], [3000, 0], [3000, 4000], [0, 4000]] },
    { id: 'right', wallIds: ['s', 'e', 'n', 'divider'], boundary: [[3000, 0], [6000, 0], [6000, 4000], [3000, 4000]] },
  ];
  const result = validateProjectTopology(project);
  assert.equal(result.ok, true, result.blocking.map((item) => `${item.code}: ${item.message}`).join('\n'));
  assert.equal(result.blocking.some((item) => item.code === 'ROOMS_OVERLAP'), false);
});

test('duplicate room slabs are blocked before local 3D preview', () => {
  const project = rectangle();
  project.geometry.spaces.push({
    ...structuredClone(project.geometry.spaces[0]),
    id: 'living-duplicate',
  });
  const result = validateProjectTopology(project);
  const overlap = result.blocking.find((item) => item.code === 'ROOMS_OVERLAP');
  assert.deepEqual(overlap?.objectIds, ['living', 'living-duplicate']);
  assert.match(overlap?.message || '', /duplicate the same slab boundary/i);
});

test('positive-area room overlap is blocked while a shared divider edge remains valid', () => {
  const project = rectangle();
  project.geometry.walls.push({
    id: 'divider', storeyId: 's1',
    path: { kind: 'line', start: [3000, 0], end: [3000, 4000] },
    thickness: 100, height: 2800,
  });
  project.geometry.spaces = [
    { id: 'whole-unit', wallIds: ['n', 'e', 's', 'w'], boundary: [[0, 0], [6000, 0], [6000, 4000], [0, 4000]] },
    { id: 'left-overlap', wallIds: ['s', 'divider', 'n', 'w'], boundary: [[0, 0], [3000, 0], [3000, 4000], [0, 4000]] },
  ];
  const result = validateProjectTopology(project);
  const overlap = result.blocking.find((item) => item.code === 'ROOMS_OVERLAP');
  assert.deepEqual(overlap?.objectIds, ['whole-unit', 'left-overlap']);
  assert.match(overlap?.message || '', /positive floor area/i);
});

test('a detached wall fragment and an unsplit crossing are rejected', () => {
  const project = rectangle();
  project.geometry.walls.push(
    { id: 'detached', path: { kind: 'line', start: [7000, 0], end: [7000, 1000] } },
    { id: 'cross-a', path: { kind: 'line', start: [1000, 1000], end: [5000, 3000] } },
    { id: 'cross-b', path: { kind: 'line', start: [1000, 3000], end: [5000, 1000] } },
  );
  const result = validateProjectTopology(project);
  assert.ok(result.blocking.some((item) => item.code === 'DISCONNECTED_WALL_NETWORK'));
  assert.ok(result.blocking.some((item) => item.code === 'UNSPLIT_WALL_CROSSING'));
});

test('overlapping openings and unverifiable rooms cannot be approved', () => {
  const project = rectangle();
  project.geometry.openings.push({
    id: 'entry-2', wallId: 's', kind: 'door', span: { startRatio: .2, endRatio: .4 },
    height: 2100, sill: 0,
  });
  project.geometry.spaces[0] = { id: 'living' };
  const result = validateProjectTopology(project);
  assert.ok(result.blocking.some((item) => item.code === 'OPENING_SPANS_OVERLAP'));
  assert.ok(result.blocking.some((item) => item.code === 'ROOM_BOUNDARY_UNVERIFIED'));
});

test('unassigned or duplicate door/window detections fail visibly', () => {
  const project = rectangle();
  project.geometry.openings.push({
    id: 'window-unassigned', kind: 'window', span: { startRatio: .2, endRatio: .4 },
    height: 1200, sill: 900,
  });
  project.geometry.openings.push({
    id: 'entry', wallId: 'n', kind: 'window', span: { startRatio: .2, endRatio: .4 },
    height: 1200, sill: 900,
  });
  const result = validateProjectTopology(project);
  assert.equal(result.ok, false);
  assert.ok(result.blocking.some((item) => item.code === 'OPENING_HOST_MISSING'));
  assert.ok(result.blocking.some((item) => item.code === 'DUPLICATE_GEOMETRY_ID'));
});

test('a finite but open wall list or self-intersecting room polygon is not called closed', () => {
  const project = rectangle();
  project.geometry.spaces[0].wallIds = ['n', 'e', 's'];
  project.geometry.spaces[0].boundary = [[0, 0], [6000, 4000], [0, 4000], [6000, 0]];
  const result = validateProjectTopology(project);
  assert.ok(result.blocking.some((item) => item.code === 'ROOM_WALL_CYCLE_UNVERIFIED'));
  assert.ok(result.blocking.some((item) => item.code === 'ROOM_BOUNDARY_UNVERIFIED'));
});

test('unverified scale and dropped opening candidates remain 2D blockers', () => {
  const project = rectangle();
  project.calibration.status = 'unverified';
  project.provenance.scaleStatus = 'unverified';
  project.issues = [{ code: 'OPENING_UNHOSTED', severity: 'warn', count: 2, note: '2 opening candidates have no host wall.' }];
  const result = validateProjectTopology(project);
  assert.ok(result.blocking.some((item) => item.code === 'SCALE_UNVERIFIED'));
  assert.ok(result.blocking.some((item) => item.code === 'UNASSIGNED_OPENING_CANDIDATES'));
});

test('strict 3D readiness requires confirmed review and valid ceiling, sill and head heights', () => {
  const project = rectangle();
  assert.equal(validateProject3dReadiness(project).ok, true);

  project.provenance.requiresConfirmation = true;
  project.verticalDimensions.status = 'unverified';
  project.geometry.openings[0].sill = 900;
  project.geometry.openings[0].height = 2100;
  const result = validateProject3dReadiness(project);
  assert.equal(result.ok, false);
  assert.ok(result.blocking.some((item) => item.code === 'GEOMETRY_CONFIRMATION_REQUIRED'));
  assert.ok(result.blocking.some((item) => item.code === 'VERTICAL_DIMENSIONS_UNVERIFIED'));
  assert.ok(result.blocking.some((item) => item.code === 'OPENING_VERTICAL_DIMENSIONS_INVALID'));
});

test('strict 3D readiness blocks silent omission of every door or every window', () => {
  const noDoor = rectangle();
  noDoor.geometry.openings = noDoor.geometry.openings.filter((opening) => opening.kind === 'window');
  assert.ok(validateProject3dReadiness(noDoor).blocking.some((item) => item.code === 'DOOR_SET_EMPTY'));

  const noWindow = rectangle();
  noWindow.geometry.openings = noWindow.geometry.openings.filter((opening) => opening.kind === 'door');
  assert.ok(validateProject3dReadiness(noWindow).blocking.some((item) => item.code === 'WINDOW_SET_EMPTY'));
});
