import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CAMERA_COORDINATE_CONTRACT,
  DETERMINISTIC_RENDERER,
  canTransitionRenderJob,
  createRenderRequest,
  validateRenderRequest,
} from '../journey-render-contract.js';

const fixture = JSON.parse(await readFile(
  new URL('./fixtures/hnm-render-request-v1.json', import.meta.url), 'utf8',
));

test('builder produces the backend-parity deterministic request fixture', () => {
  const request = createRenderRequest({
    projectId: 'HNM-1',
    projectRevision: 3,
    geometrySha256: 'a'.repeat(64),
    modelVersion: 2,
    modelSha256: 'b'.repeat(64),
    createdAt: '2026-08-05T12:00:00+08:00',
    camera: { position: [4, 1.2, 5], target: [0, 1, 0] },
    output: { height: 768 },
    scene: { materialRevision: 'palette-scandinavian-1' },
  });

  assert.deepEqual(request, fixture);
  assert.deepEqual(validateRenderRequest(request), { ok: true, errors: [] });
  assert.equal(request.renderer, DETERMINISTIC_RENDERER);
  assert.equal(CAMERA_COORDINATE_CONTRACT, 'three-glb-y-up-to-blender-z-up/1');
});

test('wire fixture validates without relying on builder defaults', () => {
  assert.deepEqual(validateRenderRequest(structuredClone(fixture)), { ok: true, errors: [] });
});

test('builder requires immutable model, geometry and material bindings', () => {
  const missingModel = structuredClone(fixture);
  delete missingModel.modelSha256;
  assert.throws(() => createRenderRequest(missingModel), /modelSha256 is required/);

  const missingRevision = structuredClone(fixture);
  delete missingRevision.projectRevision;
  assert.throws(() => createRenderRequest(missingRevision), /projectRevision is required/);

  const missingMaterial = structuredClone(fixture);
  delete missingMaterial.scene.materialRevision;
  assert.throws(() => createRenderRequest(missingMaterial), /materialRevision/);
});

test('unsupported, unused and unknown fields fail closed', () => {
  const mutations = [
    (request) => { request.mode = 'panorama'; },
    (request) => { request.output.format = 'image/jpeg'; },
    (request) => { request.output.width = 8192; },
    (request) => { request.scene.viewerState = { selectedRoom: 'living' }; },
    (request) => { request.scene.lightingPreset = 'interior-day'; },
    (request) => { request.conditioning.depthArtifactRole = 'capture-depth'; },
    (request) => { request.conditioning.preserveGeometry = false; },
    (request) => { request.prompt.positive = 'make this photorealistic'; },
    (request) => { request.renderer = 'unassigned'; },
    (request) => { request.camera.roll = 10; },
    (request) => { request.unknown = true; },
  ];

  for (const mutate of mutations) {
    const request = structuredClone(fixture);
    mutate(request);
    assert.equal(validateRenderRequest(request).ok, false);
  }
});

test('camera bounds, basis and output pixel ceiling match backend constraints', () => {
  const coincident = structuredClone(fixture);
  coincident.camera.target = [...coincident.camera.position];
  assert.match(validateRenderRequest(coincident).errors.join(' '), /must differ/);

  const parallel = structuredClone(fixture);
  parallel.camera.up = [0, 0, 1];
  parallel.camera.position = [0, 0, 1];
  parallel.camera.target = [0, 0, 0];
  assert.match(validateRenderRequest(parallel).errors.join(' '), /parallel/);

  const tooManyPixels = structuredClone(fixture);
  tooManyPixels.output = { ...tooManyPixels.output, width: 4096, height: 4096 };
  assert.match(validateRenderRequest(tooManyPixels).errors.join(' '), /8,388,608/);
});

test('render job transitions are explicit and terminal states stay terminal', () => {
  assert.equal(canTransitionRenderJob('queued', 'preparing'), true);
  assert.equal(canTransitionRenderJob('rendering', 'postprocessing'), true);
  assert.equal(canTransitionRenderJob('completed', 'rendering'), false);
  assert.equal(canTransitionRenderJob('failed', 'queued'), false);
});
