import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGeometryOperation, createProjectHistory } from '../journey-geometry-ops.js';

const project = {
  schema: 'hnm-project/1', units: 'mm', modifiedAt: '2026-08-02T00:00:00Z',
  revision: { number: 3, parentRevision: 2, geometrySha256: 'old' },
  provenance: { requiresConfirmation: false }, storeys: [{ id: 's1' }],
  geometry: {
    walls: [
      { id: 'w1', path: { kind: 'line', start: [0, 0], end: [3000, 0] } },
      { id: 'w2', path: { kind: 'line', start: [3000, 0], end: [3000, 2500] } },
    ],
    openings: [{ id: 'd1', wallId: 'w1', span: { startRatio: .2, endRatio: .5 } }],
    spaces: [{ id: 'r1', name: 'Room' }], columns: [], shafts: [], beams: [],
  }, relationships: { adjacency: [] }, issues: [],
};

test('moving a junction updates coincident wall endpoints and creates a revision', () => {
  const next = applyGeometryOperation(project, {
    type: 'wall.moveEndpoint', baseRevision: 3, wallId: 'w1', endpoint: 'end', point: [3100, 50],
  }, { now: '2026-08-02T01:00:00Z' });
  assert.deepEqual(next.geometry.walls[0].path.end, [3100, 50]);
  assert.deepEqual(next.geometry.walls[1].path.start, [3100, 50]);
  assert.deepEqual(project.geometry.walls[0].path.end, [3000, 0]);
  assert.equal(next.revision.number, 4);
  assert.equal(next.revision.geometrySha256, null);
  assert.equal(next.provenance.requiresConfirmation, true);
});

test('opening updates reject invalid hosted spans and stale edits', () => {
  assert.throws(() => applyGeometryOperation(project, {
    type: 'opening.update', openingId: 'd1', startRatio: .8, endRatio: .4,
  }), /span ratios/);
  assert.throws(() => applyGeometryOperation(project, {
    type: 'space.rename', baseRevision: 2, spaceId: 'r1', name: 'Study',
  }), /Stale operation/);
});

test('snapshot history supports undo, redo, and clears redo on a new edit', () => {
  const history = createProjectHistory(project);
  history.apply({ type: 'space.rename', spaceId: 'r1', name: 'Study' });
  assert.equal(history.current().geometry.spaces[0].name, 'Study');
  assert.equal(history.undo().geometry.spaces[0].name, 'Room');
  assert.equal(history.redo().geometry.spaces[0].name, 'Study');
  history.undo();
  history.apply({ type: 'space.rename', spaceId: 'r1', name: 'Bedroom' });
  assert.equal(history.canRedo(), false);
});

test('a human can add and accept a missing wall segment', () => {
  const added = applyGeometryOperation(project, {
    type: 'wall.add',
    wall: {
      id: 'w-gap', storeyId: 's1',
      path: { kind: 'line', start: [0, 2500], end: [3000, 2500] },
      thickness: 100, height: 2700, structuralClass: 'partition', confidence: 1,
    },
  });
  assert.equal(added.geometry.walls.at(-1).id, 'w-gap');

  const accepted = applyGeometryOperation(added, {
    type: 'wall.accept', wallId: 'w-gap',
  });
  assert.equal(accepted.geometry.walls.at(-1).accepted, true);
});

test('splitting a wall preserves hosted openings and room wall references', () => {
  const source = structuredClone(project);
  source.geometry.openings.push({
    id: 'd2', wallId: 'w1', span: { startRatio: .7, endRatio: .9 },
  });
  source.geometry.spaces[0].wallIds = ['w1', 'w2'];
  const next = applyGeometryOperation(source, {
    type: 'wall.split', wallId: 'w1', point: [1500, 0], newWallId: 'w1b',
  });

  assert.deepEqual(next.geometry.walls.find((wall) => wall.id === 'w1').path.end, [1500, 0]);
  assert.deepEqual(next.geometry.walls.find((wall) => wall.id === 'w1b').path.start, [1500, 0]);
  assert.deepEqual(next.geometry.openings.find((opening) => opening.id === 'd1').span, {
    startRatio: .4, endRatio: 1,
  });
  const moved = next.geometry.openings.find((opening) => opening.id === 'd2');
  assert.equal(moved.wallId, 'w1b');
  assert.ok(Math.abs(moved.span.startRatio - .4) < 1e-9);
  assert.ok(Math.abs(moved.span.endRatio - .8) < 1e-9);
  assert.deepEqual(next.geometry.spaces[0].wallIds, ['w1', 'w1b', 'w2']);
});

test('wall split and delete fail closed when they would damage openings or spaces', () => {
  assert.throws(() => applyGeometryOperation(project, {
    type: 'wall.split', wallId: 'w1', point: [900, 0], newWallId: 'w1b',
  }), /crosses/);
  assert.throws(() => applyGeometryOperation(project, {
    type: 'wall.delete', wallId: 'w1',
  }), /hosted openings/);
});

test('human opening additions and deletions are serialisable correction operations', () => {
  const added = applyGeometryOperation(project, {
    type: 'opening.add',
    opening: {
      id: 'win-2', wallId: 'w2', kind: 'window',
      span: { startRatio: .2, endRatio: .5 }, height: 1200, sill: 900,
    },
  });
  assert.equal(added.geometry.openings.at(-1).id, 'win-2');

  const removed = applyGeometryOperation(added, {
    type: 'opening.delete', openingId: 'win-2',
  });
  assert.equal(removed.geometry.openings.some((opening) => opening.id === 'win-2'), false);
});
