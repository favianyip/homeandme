import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLayoutReviewPreview,
  LAYOUT_REVIEW_PREVIEW_SCHEMA,
} from '../journey-layout-review.js';
import { ProjectJourneyApp } from '../project-journey.js';

const SHA = {
  geometry: 'a'.repeat(64),
  brief: 'b'.repeat(64),
  optionSet: 'c'.repeat(64),
  layout: 'd'.repeat(64),
};

function fixture() {
  const geometryReview = {
    projectId: 'HNM-REVIEW-1',
    geometryVersion: 4,
    geometrySha256: SHA.geometry,
    approvalStatus: 'approved',
    correctionEvidenceSource: {
      role: 'original_upload',
      signedUrl: 'https://private.invalid/never-copy-this',
    },
    validation: {
      valid: true,
      issues: [],
      whole_unit_topology: {
        ready_for_whole_unit_3d: true,
        primary_entrance_id: 'entry',
        issues: [],
      },
    },
    geometry: {
      project_id: 'HNM-REVIEW-1',
      revision: 4,
      units: 'mm',
      walls: [
        { id: 'south', start: { x: 0, y: 0 }, end: { x: 8000, y: 0 }, thickness: 180, kind: 'structural' },
        { id: 'east', start: { x: 8000, y: 0 }, end: { x: 8000, y: 5000 }, thickness: 180, kind: 'structural' },
        { id: 'north', start: { x: 8000, y: 5000 }, end: { x: 0, y: 5000 }, thickness: 180, kind: 'structural' },
        { id: 'west', start: { x: 0, y: 5000 }, end: { x: 0, y: 0 }, thickness: 180, kind: 'structural' },
        { id: 'divider', start: { x: 5000, y: 0 }, end: { x: 5000, y: 5000 }, thickness: 100, kind: 'partition' },
      ],
      openings: [
        { id: 'entry', wall_id: 'south', kind: 'door', offset: 700, width: 900, swing: 'left', reviewed_usage: 'primary_entrance' },
        { id: 'bedroom-door', wall_id: 'divider', kind: 'door', offset: 700, width: 900, swing: 'right', reviewed_usage: 'interior_door' },
        { id: 'living-window', wall_id: 'north', kind: 'window', offset: 4300, width: 1600, swing: 'none', reviewed_usage: 'exterior_window' },
      ],
      rooms: [
        {
          id: 'living', name: 'Living & Dining', function: 'living',
          boundary: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 5000 }, { x: 0, y: 5000 }],
        },
        {
          id: 'bedroom', name: 'Bedroom 2', function: 'bedroom',
          boundary: [{ x: 5000, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 5000 }, { x: 5000, y: 5000 }],
        },
      ],
    },
  };
  const layoutSet = {
    optionSetVersion: 7,
    optionSetSha256: SHA.optionSet,
    assetLibraryVersion: 'measured-assets-7',
    sourceReferences: {
      geometryVersion: 4,
      geometrySha256: SHA.geometry,
      designBriefVersion: 3,
      designBriefSha256: SHA.brief,
    },
    safeLayoutIds: ['layout-practical'],
    options: [{
      layoutId: 'layout-practical',
      type: 'practical',
      layoutSha256: SHA.layout,
      assetLibraryVersion: 'measured-assets-7',
      customerNote: 'private household routine that must not reach the projection',
      placements: [
        {
          placementId: 'living-sofa', assetId: 'sofa-2200', roomId: 'living',
          x: 400, y: 700, z: 0, rotationDegrees: 0,
          width: 2200, depth: 900, height: 850, clearance: 600,
          assetUrl: 'https://private.invalid/asset.glb',
        },
        {
          placementId: 'bedroom-bed', assetId: 'bed-queen-1600', roomId: 'bedroom',
          x: 5500, y: 1600, z: 0, rotationDegrees: 0,
          width: 1600, depth: 2050, height: 550, clearance: 600,
        },
      ],
      validation: {
        feasible: true,
        hardConstraintViolations: [],
        doorSwingCheck: 'passed',
        circulationCheck: 'passed',
      },
    }],
  };
  return { geometryReview, layoutSet };
}

const copy = (value) => structuredClone(value);

test('furnishing preview is bound to one approved geometry and exact option', () => {
  const { geometryReview, layoutSet } = fixture();
  const preview = buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1',
    geometryReview,
    layoutSet,
    layoutId: 'layout-practical',
  });

  assert.equal(preview.schema, LAYOUT_REVIEW_PREVIEW_SCHEMA);
  assert.deepEqual(preview.source, {
    geometryVersion: 4,
    geometrySha256: SHA.geometry,
    designBriefVersion: 3,
    designBriefSha256: SHA.brief,
  });
  assert.deepEqual(preview.bounds, {
    minX: 0, minY: 0, maxX: 8000, maxY: 5000, width: 8000, depth: 5000,
  });
  assert.equal(preview.rooms.length, 2);
  assert.equal(preview.walls.length, 5);
  assert.equal(preview.openings.length, 3);
  assert.equal(preview.placements.length, 2);
  assert.deepEqual(preview.openings[0].start, { x: 700, y: 0 });
  assert.deepEqual(preview.openings[0].end, { x: 1600, y: 0 });
  assert.equal(preview.openings[0].swing, 'left');
  assert.equal(preview.openings[0].reviewedUsage, 'primary_entrance');
  assert.equal(preview.placements[1].roomId, 'bedroom');
  assert.equal(Object.isFrozen(preview), true);
});

test('projection strips private source, customer and asset-media fields', () => {
  const { geometryReview, layoutSet } = fixture();
  const preview = buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', geometryReview, layoutSet, layoutId: 'layout-practical',
  });
  const serialized = JSON.stringify(preview);
  for (const privateValue of ['signedUrl', 'private.invalid', 'customerNote', 'assetUrl', 'household routine']) {
    assert.equal(serialized.includes(privateValue), false, privateValue);
  }
});

test('furnishing preview rejects incompatible opening operations and roles', () => {
  const invalidDoor = fixture();
  invalidDoor.geometryReview.geometry.openings[0].swing = 'none';
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...invalidDoor, layoutId: 'layout-practical',
  }), /operation incompatible/);

  const invalidWindow = fixture();
  invalidWindow.geometryReview.geometry.openings[2].reviewed_usage = 'interior_door';
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...invalidWindow, layoutId: 'layout-practical',
  }), /unreviewed or incompatible portal role/);
});

test('stale, unapproved or topology-incomplete geometry cannot produce a furnishing preview', () => {
  const original = fixture();
  const stale = copy(original);
  stale.layoutSet.sourceReferences.geometrySha256 = 'e'.repeat(64);
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...stale, layoutId: 'layout-practical',
  }), /stale against the approved geometry/);

  const unapproved = copy(original);
  unapproved.geometryReview.approvalStatus = 'pending_review';
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...unapproved, layoutId: 'layout-practical',
  }), /geometry is not approved/);

  const disconnected = copy(original);
  disconnected.geometryReview.validation.whole_unit_topology.ready_for_whole_unit_3d = false;
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...disconnected, layoutId: 'layout-practical',
  }), /no longer passes whole-unit validation/);
});

test('unknown-room, out-of-room and unverified rotated placements fail closed', () => {
  const original = fixture();
  const unknown = copy(original);
  unknown.layoutSet.options[0].placements[0].roomId = 'missing-room';
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...unknown, layoutId: 'layout-practical',
  }), /references an unknown room/);

  const outside = copy(original);
  outside.layoutSet.options[0].placements[0].x = 4800;
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...outside, layoutId: 'layout-practical',
  }), /is not contained by room living/);

  const rotated = copy(original);
  rotated.layoutSet.options[0].placements[0].rotationDegrees = 90;
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...rotated, layoutId: 'layout-practical',
  }), /no verified axis-aligned floor footprint/);

  const concaveBridge = copy(original);
  concaveBridge.geometryReview.geometry.rooms[0].boundary = [
    { x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 5000 },
    { x: 3500, y: 5000 }, { x: 3500, y: 1500 }, { x: 1500, y: 1500 },
    { x: 1500, y: 5000 }, { x: 0, y: 5000 },
  ];
  Object.assign(concaveBridge.layoutSet.options[0].placements[0], {
    x: 1000, y: 1000, width: 3000, depth: 1500,
  });
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...concaveBridge, layoutId: 'layout-practical',
  }), /is not contained by room living/);
});

test('service-safe ledger alone cannot authorize an invalid host opening or placement option', () => {
  const badOpening = fixture();
  badOpening.geometryReview.geometry.openings[0].wall_id = 'missing-wall';
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...badOpening, layoutId: 'layout-practical',
  }), /unknown host wall/);

  const unsafe = fixture();
  unsafe.layoutSet.options[0].validation.circulationCheck = 'failed';
  assert.throws(() => buildLayoutReviewPreview({
    projectId: 'HNM-REVIEW-1', ...unsafe, layoutId: 'layout-practical',
  }), /does not pass every hard service gate/);
});

test('customer approval does not call the service after furnishing evidence becomes stale', async () => {
  const stale = fixture();
  stale.layoutSet.sourceReferences.geometrySha256 = 'e'.repeat(64);
  let approvalCalls = 0;
  let renders = 0;
  const app = Object.create(ProjectJourneyApp.prototype);
  Object.assign(app, {
    state: { projectId: 'HNM-REVIEW-1' },
    phaseData: { geometry: stale.geometryReview, layouts: stale.layoutSet },
    error: null,
    render: () => { renders += 1; },
    workflow: {
      approveLayout: async () => { approvalCalls += 1; },
    },
  });
  const list = { querySelector: () => ({ value: 'layout-practical' }) };

  await app.approveLayout(list, { checked: true });

  assert.equal(approvalCalls, 0);
  assert.equal(renders, 1);
  assert.match(app.error.message, /evidence changed or is incomplete.*stale against the approved geometry/i);
});
