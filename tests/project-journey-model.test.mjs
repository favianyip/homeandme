import assert from 'node:assert/strict';
import test from 'node:test';

import { journeyConfig } from '../journey-api.js';
import { WorkflowPhase } from '../journey-service-workflow.js';
import {
  approvedRenderRequest,
  auditCanonicalGeometry,
  canonicalGeometryChanges,
  canonicalGeometryToPlanContract,
  geometryCorrectionSourceBinding,
  presentWorkflow,
  previewApprovalState,
  projectToCanonicalGeometry,
  serviceAvailability,
  validateCorrectionWitnesses,
  wholeUnitCamera,
} from '../project-journey-model.js';

const HASH = { geometry: 'a'.repeat(64), model: 'b'.repeat(64) };

function allCapabilities({ quotation = true } = {}) {
  return journeyConfig(undefined, {
    apiBaseUrl: 'https://api.example',
    flags: {
      AI_ANALYSIS_ENABLED: true,
      GEOMETRY_REVIEW_ENABLED: true,
      LIVE_3D_ENABLED: true,
      AI_RENDERING_ENABLED: true,
      QUOTATION_ENABLED: quotation,
      PAYMENTS_ENABLED: false,
    },
  });
}

function rectangle({ minX = 0, minY = 0, width = 9000, depth = 6000, height = 2800 } = {}) {
  const x1 = minX; const x2 = minX + width;
  const y1 = minY; const y2 = minY + depth;
  return {
    schema_version: '1.0', project_id: 'HNM-1', revision: 3, units: 'mm',
    coordinate_system: 'right_handed_z_up', topology_mode: 'partitioned_plan',
    level_elevation_mm: 0, scale_status: 'customer_confirmed',
    walls: [
      { id: 'south', start: { x: x1, y: y1 }, end: { x: x2, y: y1 }, thickness: 180, height, kind: 'structural' },
      { id: 'east', start: { x: x2, y: y1 }, end: { x: x2, y: y2 }, thickness: 180, height, kind: 'structural' },
      { id: 'north', start: { x: x2, y: y2 }, end: { x: x1, y: y2 }, thickness: 180, height, kind: 'structural' },
      { id: 'west', start: { x: x1, y: y2 }, end: { x: x1, y: y1 }, thickness: 180, height, kind: 'structural' },
    ],
    openings: [
      { id: 'entry', wall_id: 'south', kind: 'door', offset: 1000, width: 900, height: 2100, sill: 0, swing: 'left' },
      { id: 'window', wall_id: 'north', kind: 'window', offset: 1200, width: 1600, height: 1100, sill: 900, swing: 'none' },
    ],
    rooms: [{
      id: 'living', name: 'Living', function: 'living',
      boundary: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
    }],
  };
}

function cameraNdc(camera, point, aspectRatio = 1) {
  const subtract = (a, b) => a.map((value, index) => value - b[index]);
  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const normalise = (value) => {
    const length = Math.hypot(...value);
    return value.map((axis) => axis / length);
  };
  const forward = normalise(subtract(camera.target, camera.position));
  const right = normalise(cross(forward, camera.up));
  const up = normalise(cross(right, forward));
  const relative = subtract(point, camera.position);
  const depth = dot(relative, forward);
  const verticalTan = Math.tan((camera.fovDegrees * Math.PI) / 360);
  return {
    x: dot(relative, right) / (depth * verticalTan * aspectRatio),
    y: dot(relative, up) / (depth * verticalTan),
    depth,
  };
}

function envelopeCorners({ minX, minY, width, depth, height, thickness = 180 }) {
  const half = thickness / 2000;
  const xs = [minX / 1000 - half, (minX + width) / 1000 + half];
  const ys = [0, height / 1000];
  const zs = [-(minY + depth) / 1000 - half, -minY / 1000 + half];
  return xs.flatMap((x) => ys.flatMap((y) => zs.map((z) => [x, y, z])));
}

test('public flags-off state exposes no live customer workflow capability', () => {
  const config = journeyConfig(undefined, { apiBaseUrl: '', flags: {
    AI_ANALYSIS_ENABLED: false,
    GEOMETRY_REVIEW_ENABLED: false,
    LIVE_3D_ENABLED: false,
    AI_RENDERING_ENABLED: false,
    QUOTATION_ENABLED: false,
    PAYMENTS_ENABLED: false,
  } });
  assert.equal(serviceAvailability(config).live, false);
  const view = presentWorkflow(config);
  assert.equal(view.blocked, true);
  assert.ok(view.ledger.every((act) => act.state === 'locked'));
  assert.deepEqual(view.actions, []);
});

test('workflow rail moves monotonically through design brief before model generation', () => {
  const config = allCapabilities();
  const phases = [
    WorkflowPhase.AWAITING_UPLOAD,
    WorkflowPhase.GEOMETRY_REVIEW,
    WorkflowPhase.DIMENSIONS_REVIEW,
    WorkflowPhase.GEOMETRY_APPROVED,
    WorkflowPhase.LAYOUT_PREPARATION,
    WorkflowPhase.LAYOUT_REVIEW,
    WorkflowPhase.MODEL_REVIEW,
    WorkflowPhase.MODEL_APPROVED,
    WorkflowPhase.RENDER_REVIEW,
    WorkflowPhase.DESIGN_APPROVED,
  ];
  const indexes = phases.map((phase) => {
    const view = presentWorkflow(config, { phase, projectId: 'HNM-1', actions: [] });
    return view.ledger.findIndex((act) => act.state === 'active');
  });
  assert.deepEqual(indexes, [0, 1, 1, 2, 3, 3, 3, 4, 4, 5]);
  assert.ok(indexes.every((value, index) => index === 0 || value >= indexes[index - 1]));
});

test('design-approved receipt remains visible when quotation rollout is off', () => {
  const view = presentWorkflow(allCapabilities({ quotation: false }), {
    phase: WorkflowPhase.DESIGN_APPROVED, projectId: 'HNM-1', actions: [],
  });
  assert.equal(view.presentation.act, 'handover');
  assert.equal(view.ledger[5].state, 'active');
  assert.equal(view.ledger[5].enabled, true);
});

test('revision and failure phases keep honest, non-negative rail progress', () => {
  const config = allCapabilities();
  const revision = presentWorkflow(config, { phase: WorkflowPhase.REVISION_REQUIRED, actions: [] });
  const failure = presentWorkflow(config, { phase: WorkflowPhase.TERMINAL_FAILURE, actions: [] });
  const unknown = presentWorkflow(config, { phase: WorkflowPhase.BLOCKED, actions: [] });
  assert.equal(revision.presentation.act, 'design');
  assert.ok(revision.progressIndex > failure.progressIndex);
  assert.ok(failure.progressIndex > 0);
  assert.ok(unknown.progressIndex > 0);
});

test('canonical geometry uses shared project and solid gates without inventing evidence', () => {
  const geometry = rectangle();
  const contract = canonicalGeometryToPlanContract(geometry);
  assert.equal(contract.schema, 'hnm-plan-contract/1');
  assert.deepEqual(contract.envelope, [9000, 6000]);
  assert.deepEqual(contract.rooms[0].cycle, ['south', 'east', 'north', 'west']);
  const pending = auditCanonicalGeometry(geometry, { geometrySha256: HASH.geometry });
  assert.equal(pending.base.ok, true);
  assert.equal(pending.readiness.ok, false);
  assert.ok(pending.readiness.blocking.some((issue) => issue.code === 'GEOMETRY_CONFIRMATION_REQUIRED'));
  const approved = auditCanonicalGeometry(geometry, {
    geometrySha256: HASH.geometry, approved2d: true, approvedVertical: true,
  });
  assert.equal(approved.readiness.ok, true);
  assert.equal(approved.solid.schema, 'hnm-plan-contract/1');
  const returned = projectToCanonicalGeometry(approved.project, geometry);
  assert.deepEqual(returned.walls, geometry.walls);
  assert.deepEqual(returned.openings, geometry.openings);
});

test('geometry correction evidence requires an exact source binding and exact per-diff pixel coverage', () => {
  const source = rectangle();
  const corrected = structuredClone(source);
  corrected.openings[0].width = 1000;
  corrected.rooms[0].name = 'Living and Dining';
  const changes = canonicalGeometryChanges(source, corrected);
  assert.deepEqual(changes, [
    { entityType: 'opening', entityId: 'entry', operation: 'update' },
    { entityType: 'room', entityId: 'living', operation: 'update' },
  ]);

  const sourceSha256 = 'c'.repeat(64);
  const authoritativeBinding = {
    role: 'original_upload',
    sha256: sourceSha256,
    mediaType: 'image/png',
    byteSize: 123456,
    intrinsicPixels: { width: 2400, height: 1600 },
    sourceGeometryAncestryVersions: [1, 2],
  };
  assert.deepEqual(geometryCorrectionSourceBinding({
    geometryVersion: 2,
    correctionEvidenceSource: authoritativeBinding,
    sourceReferences: { artifactManifest: [{ role: 'original_upload', sha256: sourceSha256 }] },
  }), {
    sourceArtifactRole: 'original_upload',
    sourceArtifactSha256: sourceSha256,
    mediaType: 'image/png',
    byteSize: 123456,
    intrinsicPixels: { width: 2400, height: 1600 },
    sourceGeometryAncestryVersions: [1, 2],
  });
  assert.throws(() => geometryCorrectionSourceBinding({ correctionEvidenceSource: null }), /unavailable or incomplete/);
  assert.throws(() => geometryCorrectionSourceBinding({
    geometryVersion: 2,
    correctionEvidenceSource: { ...authoritativeBinding, intrinsicPixels: { width: 2400 } },
  }), /unavailable or incomplete/);
  assert.throws(() => geometryCorrectionSourceBinding({
    geometryVersion: 2,
    correctionEvidenceSource: authoritativeBinding,
    sourceReferences: { artifactManifest: [{ role: 'original_upload', sha256: 'd'.repeat(64) }] },
  }), /conflicting/);
  assert.throws(() => geometryCorrectionSourceBinding({
    geometryVersion: 3,
    correctionEvidenceSource: authoritativeBinding,
  }), /unavailable or incomplete/);
  assert.throws(() => geometryCorrectionSourceBinding({
    geometryVersion: 2,
    correctionEvidenceSource: { ...authoritativeBinding, sourceGeometryAncestryVersions: [1, 2, 2] },
  }), /unavailable or incomplete/);

  assert.throws(() => geometryCorrectionSourceBinding({
    sourceReferences: { artifactManifest: [{ role: 'original_upload', sha256: sourceSha256 }] },
  }), /authoritative.*unavailable or incomplete/i);
  assert.throws(() => geometryCorrectionSourceBinding({ sourceReferences: {} }), /authoritative.*unavailable or incomplete/i);
  assert.throws(() => geometryCorrectionSourceBinding({
    sourceReferences: {
      artifactManifest: [{ role: 'original_upload', sha256: sourceSha256 }],
      evidenceBinding: { sourceArtifactRole: 'original_upload', sourceArtifactSha256: 'd'.repeat(64) },
    },
  }), /authoritative.*unavailable or incomplete/i);

  const evidence = {
    sourceArtifactRole: 'original_upload', sourceArtifactSha256: sourceSha256, evidenceNote: 'Marked both changed regions.',
    witnesses: [
      { ...changes[0], pixelBounds: { xMin: 20, yMin: 30, xMax: 160, yMax: 180 }, note: 'Visible entry opening.' },
      { ...changes[1], pixelBounds: { xMin: 10, yMin: 10, xMax: 390, yMax: 290 }, note: 'Visible room label and region.' },
    ],
  };
  assert.deepEqual(validateCorrectionWitnesses({ changes, evidence, imageWidth: 400, imageHeight: 300 }), { ok: true, errors: [] });

  const incomplete = validateCorrectionWitnesses({
    changes, evidence: { ...evidence, witnesses: evidence.witnesses.slice(0, 1) }, imageWidth: 400, imageHeight: 300,
  });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.errors.join(' '), /exactly once/);

  const duplicate = validateCorrectionWitnesses({
    changes, evidence: { ...evidence, witnesses: [evidence.witnesses[0], evidence.witnesses[0]] }, imageWidth: 400, imageHeight: 300,
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.errors.join(' '), /duplicate/);

  const outOfBounds = structuredClone(evidence);
  outOfBounds.witnesses[1].pixelBounds.xMax = 401;
  const bounded = validateCorrectionWitnesses({ changes, evidence: outOfBounds, imageWidth: 400, imageHeight: 300 });
  assert.equal(bounded.ok, false);
  assert.match(bounded.errors.join(' '), /outside/);

  const noImage = validateCorrectionWitnesses({ changes, evidence, imageWidth: 0, imageHeight: null });
  assert.equal(noImage.ok, false);
  assert.match(noImage.errors.join(' '), /intrinsic pixel dimensions/);
});

test('whole-unit camera frames every 9x6 bounding-box corner with conservative margin', () => {
  const camera = wholeUnitCamera(rectangle());
  assert.deepEqual(camera.target, [4.5, 1.4, -3]);
  for (const corner of envelopeCorners({ minX: 0, minY: 0, width: 9000, depth: 6000, height: 2800 })) {
    const ndc = cameraNdc(camera, corner);
    assert.ok(ndc.depth > camera.near, `corner is behind near plane: ${JSON.stringify(ndc)}`);
    assert.ok(Math.abs(ndc.x) <= 0.86, `horizontal clipping risk: ${JSON.stringify(ndc)}`);
    assert.ok(Math.abs(ndc.y) <= 0.86, `vertical clipping risk: ${JSON.stringify(ndc)}`);
  }
});

test('whole-unit camera is aspect-aware and frames compact tall and shifted units', () => {
  const cases = [
    { geometry: rectangle({ width: 3000, depth: 3000, height: 6000 }), bounds: { minX: 0, minY: 0, width: 3000, depth: 3000, height: 6000 }, aspect: 1 },
    { geometry: rectangle({ minX: 125000, minY: 72000, width: 9000, depth: 6000, height: 3200 }), bounds: { minX: 125000, minY: 72000, width: 9000, depth: 6000, height: 3200 }, aspect: 16 / 9 },
    { geometry: rectangle({ minX: -9000, minY: 44000, width: 4200, depth: 11000, height: 2800 }), bounds: { minX: -9000, minY: 44000, width: 4200, depth: 11000, height: 2800 }, aspect: 9 / 16 },
  ];
  for (const item of cases) {
    const camera = wholeUnitCamera(item.geometry, { aspectRatio: item.aspect });
    for (const corner of envelopeCorners(item.bounds)) {
      const ndc = cameraNdc(camera, corner, item.aspect);
      assert.ok(ndc.depth > camera.near);
      assert.ok(Math.abs(ndc.x) <= 0.86, `horizontal clipping risk: ${JSON.stringify({ item, ndc })}`);
      assert.ok(Math.abs(ndc.y) <= 0.86, `vertical clipping risk: ${JSON.stringify({ item, ndc })}`);
    }
  }
});

test('preview approval state stays fail-closed until the exact artifact loads and is confirmed', () => {
  const identity = {
    artifactVersion: 3,
    artifactSha256: HASH.model,
    currentVersion: 3,
    currentSha256: HASH.model,
  };
  assert.deepEqual(previewApprovalState(identity), { canConfirm: false, canApprove: false });
  assert.deepEqual(previewApprovalState({ ...identity, loaded: true }), { canConfirm: true, canApprove: false });
  assert.deepEqual(previewApprovalState({ ...identity, loaded: true, confirmed: true }), { canConfirm: true, canApprove: true });
  assert.equal(previewApprovalState({ ...identity, loaded: true, confirmed: true, currentVersion: 4 }).canApprove, false);
  assert.equal(previewApprovalState({ ...identity, loaded: true, confirmed: true, currentSha256: HASH.geometry }).canApprove, false);
});

test('render request is derived from approved geometry bounds and immutable versions', () => {
  const geometry = { geometryVersion: 3, geometrySha256: HASH.geometry, geometry: rectangle() };
  const request = approvedRenderRequest({
    workflowState: { projectId: 'HNM-1' },
    geometry,
    model: { modelVersion: 2, modelSha256: HASH.model, materialVersion: 'palette-scandinavian-1' },
    createdAt: '2026-08-05T12:00:00+08:00',
  });
  assert.deepEqual(request.camera.target, [4.5, 1.4, -3]);
  assert.ok(request.camera.position[0] > request.camera.target[0]);
  assert.ok(request.camera.position[1] > request.camera.target[1]);
  assert.equal(request.geometrySha256, HASH.geometry);
  assert.equal(request.modelVersion, 2);
});
