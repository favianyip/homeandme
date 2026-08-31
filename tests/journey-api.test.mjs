import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyServiceCapabilities,
  HomeAndMeProjectApi,
  journeyConfig,
  pollJob,
  SERVICE_CAPABILITY_ORDER,
  SERVICE_CAPABILITY_SCHEMA,
  SERVICE_CONTRACTS,
  validateServiceCapabilities,
} from '../journey-api.js';
import { createRenderRequest } from '../journey-render-contract.js';

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
  };
}

function capabilityManifest({
  releaseId = 'a'.repeat(40),
  runtimeEnvironment = 'production',
  serviceReady = true,
  capabilities = Object.fromEntries(SERVICE_CAPABILITY_ORDER.map((name) => [name, true])),
  contracts = SERVICE_CONTRACTS,
} = {}) {
  return {
    schema: SERVICE_CAPABILITY_SCHEMA,
    releaseId,
    runtimeEnvironment,
    serviceReady,
    contracts: { ...contracts },
    capabilities: { ...capabilities },
    dependencyOrder: [...SERVICE_CAPABILITY_ORDER],
  };
}

test('configured API enables only real service-backed capabilities', () => {
  const config = journeyConfig(
    { search: '?api=https%3A%2F%2Fevil.example' },
    { apiBaseUrl: 'https://staging.example', flags: { AI_ANALYSIS_ENABLED: true, DEMO_FALLBACK_ENABLED: true } },
  );
  assert.equal(config.apiBaseUrl, 'https://staging.example');
  assert.equal(config.flags.AI_ANALYSIS_ENABLED, true);
  assert.equal(config.flags.GEOMETRY_REVIEW_ENABLED, false);
  assert.equal(config.flags.LIVE_3D_ENABLED, false);
  assert.equal(config.flags.AI_RENDERING_ENABLED, false);
  assert.equal(config.flags.QUOTATION_ENABLED, false);
  assert.equal(config.flags.PAYMENTS_ENABLED, false);
  assert.equal(config.flags.DEMO_FALLBACK_ENABLED, true);
});

test('service capabilities enable only in explicit dependency order', () => {
  const configured = { apiBaseUrl: 'https://api.example', flags: {
    AI_ANALYSIS_ENABLED: true,
    GEOMETRY_REVIEW_ENABLED: true,
    LIVE_3D_ENABLED: true,
    AI_RENDERING_ENABLED: false,
    QUOTATION_ENABLED: true,
    PAYMENTS_ENABLED: true,
  } };
  const config = journeyConfig(undefined, configured);
  assert.deepEqual(config.flags, {
    ...configured.flags,
    AI_ANALYSIS_ENABLED: true,
    GEOMETRY_REVIEW_ENABLED: true,
    LIVE_3D_ENABLED: true,
    AI_RENDERING_ENABLED: false,
    QUOTATION_ENABLED: false,
    PAYMENTS_ENABLED: false,
  });
});

test('a configured non-local project API must use HTTPS even before rollout', () => {
  assert.throws(
    () => journeyConfig(undefined, { apiBaseUrl: 'http://api.example', flags: {} }),
    /must use HTTPS/,
  );
});

test('public capabilities require an exact production release pin and contract set', () => {
  const config = journeyConfig(undefined, {
    apiBaseUrl: 'https://api.homeandme.sg',
    expectedServiceReleaseId: 'a'.repeat(40),
    flags: Object.fromEntries(SERVICE_CAPABILITY_ORDER.map((name) => [name, true])),
  });
  const manifest = capabilityManifest({
    capabilities: {
      AI_ANALYSIS_ENABLED: true,
      GEOMETRY_REVIEW_ENABLED: true,
      LIVE_3D_ENABLED: true,
      AI_RENDERING_ENABLED: true,
      QUOTATION_ENABLED: true,
      PAYMENTS_ENABLED: false,
    },
  });

  const effective = applyServiceCapabilities(config, manifest);

  assert.equal(effective.flags.QUOTATION_ENABLED, true);
  assert.equal(effective.flags.PAYMENTS_ENABLED, false);
  assert.deepEqual(effective.serviceVerification, {
    schema: SERVICE_CAPABILITY_SCHEMA,
    releaseId: 'a'.repeat(40),
    runtimeEnvironment: 'production',
    serviceReady: true,
  });
  assert.throws(
    () => applyServiceCapabilities({ ...config, expectedServiceReleaseId: 'b'.repeat(40) }, manifest),
    /release pin/,
  );
  assert.throws(
    () => applyServiceCapabilities({ ...config, expectedServiceReleaseId: '' }, manifest),
    /release pin/,
  );
});

test('capability manifest rejects schema drift, broken dependencies and public staging', () => {
  const options = { baseUrl: 'https://api.homeandme.sg', expectedReleaseId: 'a'.repeat(40) };
  const extra = { ...capabilityManifest(), unexpected: true };
  assert.throws(() => validateServiceCapabilities(extra, options), /incompatible/);

  const broken = capabilityManifest({ capabilities: {
    AI_ANALYSIS_ENABLED: false,
    GEOMETRY_REVIEW_ENABLED: true,
    LIVE_3D_ENABLED: false,
    AI_RENDERING_ENABLED: false,
    QUOTATION_ENABLED: false,
    PAYMENTS_ENABLED: false,
  } });
  assert.throws(() => validateServiceCapabilities(broken, options), /without its dependency/);

  const staging = capabilityManifest({ runtimeEnvironment: 'staging' });
  assert.throws(() => validateServiceCapabilities(staging, options), /non-production/);

  const drifted = capabilityManifest({ contracts: { ...SERVICE_CONTRACTS, geometry: 'new-unreviewed/2' } });
  assert.throws(() => validateServiceCapabilities(drifted, options), /contracts/);
});

test('capability lookup is public, session-free and credentialed only by HttpOnly cookie', async () => {
  const requests = [];
  const manifest = capabilityManifest();
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.homeandme.sg', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, manifest); },
  });

  assert.deepEqual(await api.capabilities(), manifest);
  assert.equal(requests[0].url, 'https://api.homeandme.sg/api/v1/capabilities');
  assert.equal(requests[0].init.credentials, 'include');
  assert.equal(requests[0].init.headers.Authorization, undefined);
});

test('client persists only the project ID and relies on an HttpOnly cookie', async () => {
  const requests = [];
  let receiver;
  const fetchImpl = async function (url, init) {
    receiver = this;
    requests.push({ url, init });
    if (url.endsWith('/api/v1/projects')) return response(201, { projectId: 'HNM-1', guestToken: 'secret' });
    return response(200, { projectId: 'HNM-1', state: 'DRAFT' });
  };
  const api = new HomeAndMeProjectApi({ baseUrl: 'https://api.example', fetchImpl, storage: memoryStorage() });
  await api.createProject('hdb', null, 1);
  await api.project();
  assert.equal(requests[1].init.headers.Authorization, undefined);
  assert.equal(requests[1].init.credentials, 'include');
  assert.equal(receiver, globalThis);
  assert.deepEqual(api.session, { projectId: 'HNM-1' });
  assert.equal(requests[1].url, 'https://api.example/api/v1/projects/HNM-1');
});

test('legacy browser tokens are discarded from storage and never emitted as bearer authorization', async () => {
  const key = 'hnm_secure_guest_project_v1';
  const storage = memoryStorage({ [key]: JSON.stringify({ projectId: 'HNM-1', guestToken: 'legacy-secret' }) });
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage,
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, { state: 'DRAFT' }); },
  });
  assert.deepEqual(api.session, { projectId: 'HNM-1' });
  api._saveSession({ projectId: 'HNM-1', guestToken: 'must-not-persist' });
  assert.deepEqual(JSON.parse(storage.getItem(key)), { projectId: 'HNM-1' });
  await api._request('/api/v1/projects/HNM-1', { headers: { Authorization: 'Bearer must-not-send' } });
  assert.equal(requests[0].init.headers.Authorization, undefined);
  assert.equal(requests[0].init.credentials, 'include');
});

test('polling returns only after server completion', async () => {
  const statuses = ['queued', 'running', 'completed'];
  const seen = [];
  const api = { job: async () => ({ status: statuses.shift(), progressPercentage: seen.length * 50 }) };
  const result = await pollJob(api, 'job-1', (job) => seen.push(job.status), { intervalMs: 1, timeoutMs: 100 });
  assert.equal(result.status, 'completed');
  assert.deepEqual(seen, ['queued', 'running', 'completed']);
});

test('customer cancellation uses the authenticated project job route', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, { status: 'cancelled' }); },
  });
  api._saveSession({ projectId: 'HNM-1' });

  const cancelled = await api.cancelJob('job_123');

  assert.equal(cancelled.status, 'cancelled');
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/jobs/job_123');
  assert.equal(requests[0].init.method, 'DELETE');
  assert.equal(requests[0].init.credentials, 'include');
});

test('client rejects a signed artifact URL on another origin', async () => {
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url) => response(200, url.includes('signed-url') ? { url: 'https://evil.example/model.glb' } : {}),
  });
  api._saveSession({ projectId: 'HNM-1' });
  await assert.rejects(() => api.artifactBytes('approved_model_glb', 'model/gltf-binary'), /rejected/);
});

test('client surfaces fail-closed API errors', async () => {
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async () => response(409, { detail: 'approve a design before checkout' }),
  });
  api._saveSession({ projectId: 'HNM-1' });
  await assert.rejects(() => api.checkout('attempt-1'), /approve a design/);
});

test('revision request is bound to the approved design version', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(201, { status: 'requested' }); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  await api.requestRevision(3, 'Use warmer timber in the living room.', ['materials'], ['living']);
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/revisions');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    sourceDesignVersion: 3,
    instructions: 'Use warmer timber in the living room.',
    scopes: ['materials'],
    affectedRoomIds: ['living'],
  });
});

test('render history uses the authenticated project route', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, { renderSets: [] }); },
  });
  api._saveSession({ projectId: 'HNM-1' });

  const history = await api.renderHistory();

  assert.deepEqual(history.renderSets, []);
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/renders/history');
  assert.equal(requests[0].init.credentials, 'include');
});

test('render generation sends the geometry-bound render request', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(202, { jobId: 'render-1' }); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  assert.throws(() => api.generateRenders(), /deterministic render request/);
  assert.equal(requests.length, 0);
  const request = createRenderRequest({
    projectId: 'HNM-1', projectRevision: 2, geometrySha256: 'a'.repeat(64),
    modelVersion: 1, modelSha256: 'b'.repeat(64),
    createdAt: '2026-08-05T12:00:00+08:00',
    camera: { position: [4, 1.5, 5], target: [0, 1, 0] },
    scene: { materialRevision: 'palette-scandinavian-1' },
  });
  const foreign = { ...request, projectId: 'HNM-OTHER' };
  assert.throws(() => api.generateRenders(foreign), /another project/);
  assert.equal(requests.length, 0);
  await api.generateRenders(request);
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/renders');
  assert.deepEqual(JSON.parse(requests[0].init.body), request);
});

test('model approval sends the immutable model binding and explicit confirmation', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, { state: 'MODEL_APPROVED' }); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  await api.approveModel(3, 'b'.repeat(64), 'customer:HNM-1');
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/model/approve');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    modelVersion: 3,
    modelSha256: 'b'.repeat(64),
    reviewerActorId: 'customer:HNM-1',
    confirmLayoutAndModel: true,
  });
});

test('future viewer capture uploads version-bound color/depth evidence and camera state', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(201, { captureId: 'capture-1' }); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  const color = new Blob(['color'], { type: 'image/png' });
  const depth = new Blob(['depth'], { type: 'image/png' });
  const viewerState = { camera: { position: [0, 2, 5], target: [0, 1, 0] } };
  await api.uploadViewerCapture(color, depth, viewerState);

  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/captures');
  assert.ok(requests[0].init.body instanceof FormData);
  assert.equal(await requests[0].init.body.get('color').text(), 'color');
  assert.equal(await requests[0].init.body.get('depth').text(), 'depth');
  assert.deepEqual(JSON.parse(requests[0].init.body.get('viewer_state')), viewerState);
  assert.equal(requests[0].init.headers['Content-Type'], undefined);
});

test('viewer capture rejects non-Blob inputs before a network request', async () => {
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async () => { throw new Error('network should not be called'); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  assert.throws(() => api.uploadViewerCapture('color', 'depth', {}), /Blob/);
});

test('geometry and vertical approvals include the reviewer attestations required by the backend', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, {}); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  await api.approveGeometry(2, 'a'.repeat(64), 'customer:HNM-1');
  await api.proposeDimensions({
    sourceGeometryVersion: 2,
    sourceGeometrySha256: 'a'.repeat(64),
    geometry2dApprovalVersion: 1,
    geometry2dApprovalSha256: 'b'.repeat(64),
    reviewerActorId: 'customer:HNM-1',
    evidenceNote: 'Measured on site using a laser distance meter.',
    ceilingHeightMm: 2700,
    wallDimensions: [{ wallId: 'wall-1', heightMm: 2700 }],
    openingDimensions: [],
    confirmMetricScale: true,
    confirmVerticalDimensions: true,
    requiresSiteVerification: true,
  });
  await api.approveDimensions(3, 'c'.repeat(64), 'customer:HNM-1');

  assert.deepEqual(JSON.parse(requests[0].init.body), {
    geometryVersion: 2,
    geometrySha256: 'a'.repeat(64),
    reviewerActorId: 'customer:HNM-1',
    confirmMetricScale: true,
    confirmWallsRoomsOpenings: true,
  });
  assert.equal(requests[1].url, 'https://api.example/api/v1/projects/HNM-1/dimensions/propose');
  assert.deepEqual(JSON.parse(requests[2].init.body), {
    proposalVersion: 3,
    proposalSha256: 'c'.repeat(64),
    reviewerActorId: 'customer:HNM-1',
  });
});

test('layout approval sends the reviewer binding and safely encodes the layout ID', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, {}); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  await api.approveLayout('layout / 1', 'customer:HNM-1');
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/layouts/layout%20%2F%201/approve');
  assert.deepEqual(JSON.parse(requests[0].init.body), { reviewerActorId: 'customer:HNM-1' });
});

test('measured proposal and layout option review endpoints are authenticated GET recoveries', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(200, {}); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  await api.dimensionProposal();
  await api.layoutOptions();
  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/dimensions/proposal');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[1].url, 'https://api.example/api/v1/projects/HNM-1/layouts/options');
  assert.equal(requests[1].init.method, 'GET');
});

test('geometry correction is bound to source version, hash, mode and complete source evidence', async () => {
  const requests = [];
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url, init) => { requests.push({ url, init }); return response(201, { geometryVersion: 2 }); },
  });
  api._saveSession({ projectId: 'HNM-1' });
  const geometry = { project_id: 'HNM-1', revision: 1, scale_status: 'customer_confirmed', walls: [] };
  const evidence = {
    sourceArtifactRole: 'original_upload', sourceArtifactSha256: 'c'.repeat(64),
    evidenceNote: 'Marked the corrected entry on the original upload.',
    witnesses: [{
      entityType: 'opening', entityId: 'entry', operation: 'update',
      pixelBounds: { xMin: 20, yMin: 30, xMax: 160, yMax: 180 }, note: 'Visible entry opening.',
    }],
  };
  assert.throws(
    () => api.correctGeometry(1, 'a'.repeat(64), 'Measured entry width.', geometry),
    /requires complete source-image evidence/,
  );
  assert.equal(requests.length, 0);
  await api.correctGeometry(1, 'a'.repeat(64), 'Measured entry width.', geometry, { evidence });

  assert.equal(requests[0].url, 'https://api.example/api/v1/projects/HNM-1/geometry/correct');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    sourceGeometryVersion: 1,
    sourceGeometrySha256: 'a'.repeat(64),
    reason: 'Measured entry width.',
    geometry,
    correctionMode: 'bounded_edit',
    acknowledgeApprovalReset: false,
    evidence,
  });
  await api.calibrateGeometry(2, 'b'.repeat(64), 'wall-north', 5500, 'Tape measurement');
  assert.equal(requests[1].url, 'https://api.example/api/v1/projects/HNM-1/geometry/calibrate');
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    sourceGeometryVersion: 2,
    sourceGeometrySha256: 'b'.repeat(64),
    referenceWallId: 'wall-north',
    measuredLengthMm: 5500,
    evidenceNote: 'Tape measurement',
  });

  assert.throws(
    () => api.correctGeometry(2, 'b'.repeat(64), 'Retrace unit.', geometry, {
      correctionMode: 'major_retrace', acknowledgeApprovalReset: true,
    }),
    /unvalidated scale/,
  );
});
