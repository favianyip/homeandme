import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuantitySchedule } from '../journey-quantities.js';

test('quantity schedule derives metric wall, opening, and room quantities', () => {
  const project = {
    schema: 'hnm-project/1', id: 'HNM-1', revision: { number: 2, geometrySha256: 'b'.repeat(64) },
    geometry: {
      walls: [
        { id: 'w1', path: { kind: 'line', start: [0, 0], end: [5000, 0] }, height: 2800, thickness: 150, structuralClass: 'structural' },
        { id: 'w2', path: { kind: 'line', start: [0, 0], end: [0, 3000] }, height: 2800, thickness: 100, structuralClass: 'partition' },
        { id: 'gap', path: { kind: 'line', start: [0, 0], end: [900, 0] }, height: 2800, thickness: 100, structuralClass: 'partition', isVoid: true },
      ],
      openings: [{ id: 'd1', wallId: 'w1', kind: 'door',
        span: { startRatio: .2, endRatio: .38, width: 900 }, height: 2100, sill: 0 }],
      spaces: [{ id: 'r1', type: 'living', areaM2: 20 }, { id: 'r2', type: 'bedroom', areaM2: 12 }],
    },
  };
  const schedule = buildQuantitySchedule(project);
  assert.equal(schedule.walls.structural.lengthM, 5);
  assert.equal(schedule.walls.structural.faceAreaM2, 24.22);
  assert.equal(schedule.walls.structural.volumeM3, 1.817);
  assert.equal(schedule.openings.door.clearAreaM2, 1.89);
  assert.equal(schedule.totals.internalFloorAreaM2, 32);
  assert.equal(schedule.projectRevision, 2);
});

test('quantity schedule prefers host intervals and room polygons over stale metadata', () => {
  const project = {
    schema: 'hnm-project/1',
    geometry: {
      walls: [{ id: 'w1', path: { kind: 'line', start: [0, 0], end: [5000, 0] },
        height: 2800, thickness: 150 }],
      openings: [{ id: 'd1', wallId: 'w1', kind: 'door',
        span: { startRatio: .2, endRatio: .4, width: 12 }, height: 2100 }],
      spaces: [{ id: 'r1', type: 'living', areaM2: 1,
        boundary: [[0, 0], [5000, 0], [5000, 4000], [0, 4000]] }],
    },
  };
  const schedule = buildQuantitySchedule(project);
  assert.equal(schedule.openings.door.clearWidthM, 1);
  assert.equal(schedule.openings.door.clearAreaM2, 2.1);
  assert.equal(schedule.totals.internalFloorAreaM2, 20);
});
