import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  canonicalShellJson,
  PRIVATE_BARE_SHELL_REVIEW_ENABLED,
  PrivateBareShellReviewClient,
  sha256Hex,
} from '../journey-shell-review.js';

const PROJECT_ID = 'HNM-SHELL-1';
const API = 'https://api.example';
const JSON_HEADERS = { 'content-type': 'application/json' };

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function responseAt(response, url) {
  Object.defineProperty(response, 'url', { configurable: true, value: url });
  return response;
}

function artifactResponse(bytes, mediaType, overrides = {}) {
  const body = overrides.bytes || bytes;
  return new Response(body, {
    status: overrides.status || 200,
    headers: {
      'content-type': overrides.mediaType || mediaType,
      'content-length': String(overrides.declaredSize ?? body.byteLength),
      'cache-control': overrides.cacheControl || 'private, no-store',
      'x-content-type-options': overrides.nosniff || 'nosniff',
    },
  });
}

function makeGlb() {
  const document = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
  };
  const source = new TextEncoder().encode(JSON.stringify(document));
  const paddedSize = Math.ceil(source.byteLength / 4) * 4;
  const bytes = new ArrayBuffer(20 + paddedSize);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, paddedSize, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20, paddedSize).fill(0x20);
  new Uint8Array(bytes, 20, source.byteLength).set(source);
  return bytes;
}

function makePng(seed) {
  // The client intentionally performs only a bounded envelope check; the backend owns full PNG decode.
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, seed, 0, 0, 0, seed,
  ]).buffer;
}

async function makeFixture({
  version = 3,
  approvalStatus = 'ready',
  roomViewCount = 1,
  supplementaryViewCount = 0,
  mutateSceneManifest = () => {},
} = {}) {
  const geometrySha256 = '1'.repeat(64);
  const roomRecords = roomViewCount === 1
    ? [{ id: 'room-living', name: 'Living room', function: 'living' }]
    : Array.from({ length: roomViewCount }, (_, index) => ({
      id: `room-${String(index + 1).padStart(2, '0')}`,
      name: `Room ${String(index + 1).padStart(2, '0')}`,
      function: index === 0 ? 'living' : 'room',
    }));
  const hostedOpeningIds = Array.from(
    { length: supplementaryViewCount },
    (_, index) => `opening-${String(index + 1).padStart(2, '0')}`,
  );
  const coverage = {
    contract: 'canonical-room-and-hosted-opening-reference-coverage/2',
    cameraContract: 'room-rendered-solid-clearance-opening-coverage/3',
    authoritativeRoomIds: roomRecords.map((item) => item.id),
    coveredRoomIds: roomRecords.map((item) => item.id),
    uncoveredRoomIds: [],
    uncoveredRooms: [],
    hostedOpeningIds,
    coveredHostedOpeningIds: hostedOpeningIds,
    uncoveredHostedOpeningIds: [],
    openingCoverageComplete: true,
    complete: true,
    roomViewCount,
    supplementaryViewCount,
    totalViewCount: 1 + roomViewCount + supplementaryViewCount,
    minimumCameraWallSolidClearanceMm: 250,
    minimumNearPlaneWallSolidClearanceMm: 250,
    minimumCameraRoomBoundaryClearanceMm: 250,
    minimumCameraTargetDistanceMm: 750,
    nearClipMm: 50,
    sensorWidthMm: 36,
    sensorFit: 'HORIZONTAL',
    renderAspectRatio: '8:5',
    openingVisibilityContract: 'hosted-opening-centre-ray-frustum/1',
    orderingContract: 'legacy-primary-roles-then-canonical-room-id-then-hosted-opening-id/2',
  };
  const imageQuality = {
    contract: 'spatialforge-neutral-shell-png-quality/1',
    widthPixels: 640,
    heightPixels: 480,
    meanLuma: 150,
    stddevLuma: 40,
    whitePixelFraction: 0.1,
    blackPixelFraction: 0.01,
    passed: true,
    failureCodes: [],
  };
  const roles = {
    glb: 'shell_job_glb',
    manifest: 'shell_job_semantic_manifest',
    views: Array.from(
      { length: coverage.totalViewCount },
      (_, index) => `shell_job_review_${index + 1}`,
    ),
  };
  const glb = makeGlb();
  const referenceViews = [
    {
      view: 'overview', kind: 'whole_unit_overview', roomId: null, roomName: null, roomFunction: null,
      selectionContract: 'whole-unit-exterior-overview/2',
      openingVisibilityContract: 'hosted-opening-centre-ray-frustum/1',
      visibleHostedOpeningIds: [],
      artifactFilename: 'render-angle-1.png',
    },
    ...roomRecords.map((room, index) => ({
      view: roomViewCount === 1 ? 'room-living' : `room-${String(index + 1).padStart(2, '0')}`,
      roomId: room.id,
      roomName: room.name,
      roomFunction: room.function,
      kind: 'canonical_room',
      selectionContract: 'room-rendered-solid-clearance-opening-coverage/3',
      cameraOriginWallSolidClearanceMm: 300,
      nearPlaneWallSolidClearanceMm: 300,
      cameraBoundaryClearanceMm: 300,
      cameraTargetDistanceMm: 1000,
      nearClipMm: 50,
      sensorWidthMm: 36,
      sensorFit: 'HORIZONTAL',
      renderAspectRatio: '8:5',
      adjacentHostedOpeningIds: [],
      visibleHostedOpeningIds: [],
      openingVisibilityContract: 'hosted-opening-centre-ray-frustum/1',
      coverageFocusOpeningId: null,
      artifactFilename: `render-angle-${index + 2}.png`,
    })),
    ...hostedOpeningIds.map((openingId, index) => {
      const room = roomRecords[index % roomRecords.length];
      return {
        view: `coverage-${openingId}`,
        roomId: room.id,
        roomName: room.name,
        roomFunction: room.function,
        kind: 'hosted_opening_coverage',
        selectionContract: 'room-rendered-solid-clearance-opening-coverage/3',
        cameraOriginWallSolidClearanceMm: 300,
        nearPlaneWallSolidClearanceMm: 300,
        cameraBoundaryClearanceMm: 300,
        cameraTargetDistanceMm: 1000,
        nearClipMm: 50,
        sensorWidthMm: 36,
        sensorFit: 'HORIZONTAL',
        renderAspectRatio: '8:5',
        adjacentHostedOpeningIds: [openingId],
        visibleHostedOpeningIds: [openingId],
        openingVisibilityContract: 'hosted-opening-centre-ray-frustum/1',
        coverageFocusOpeningId: openingId,
        artifactFilename: `render-angle-${2 + roomViewCount + index}.png`,
      };
    }),
  ];
  const sceneManifest = {
    schema: 'spatialforge-shell-scene-manifest/2',
    artifactClass: 'shell_model',
    projectId: PROJECT_ID,
    geometrySha256,
    compilerVersion: 'spatialforge-bare-shell-compiler/2',
    coordinateContract: 'canonical-z-up-mm-to-blender-z-up-m-to-gltf-y-up/1',
    neutralMaterialContract: 'spatialforge-neutral-shell-review-material/1',
    reviewLightingContract: 'spatialforge-neutral-shell-review-lighting/2',
    reviewLightingParameters: {
      profile: 'preview', exposureEv: -1, roomAreaLightEnergyWatts: 420,
      keyAreaLightEnergyWatts: 1080, sunEnergy: 1.35, worldStrength: 0.26,
    },
    reviewExposureEv: -1,
    cameraContract: 'room-rendered-solid-clearance-opening-coverage/3',
    referenceViewContract: 'canonical-room-and-hosted-opening-reference-coverage/2',
    reviewImageQualityContract: 'spatialforge-neutral-shell-png-quality/1',
    renderProfile: 'preview',
    placements: [],
    referenceViews: structuredClone(referenceViews),
    referenceViewCoverage: coverage,
  };
  mutateSceneManifest(sceneManifest);
  const manifestBytes = new TextEncoder().encode(canonicalShellJson(sceneManifest)).buffer;
  const bytesByRole = new Map([
    [roles.glb, { bytes: glb, mediaType: 'model/gltf-binary' }],
    [roles.manifest, { bytes: manifestBytes, mediaType: 'application/json' }],
    ...roles.views.map((role, index) => [
      role,
      { bytes: makePng(index + 1), mediaType: 'image/png' },
    ]),
  ]);
  const hashes = Object.fromEntries(await Promise.all(
    [...bytesByRole].map(async ([role, item]) => [role, await sha256Hex(item.bytes)]),
  ));
  const artifactManifest = [...bytesByRole]
    .map(([role, item]) => ({ role, sha256: hashes[role], byteSize: item.bytes.byteLength }))
    .sort((left, right) => left.role.localeCompare(right.role));
  const reviewArtifactRoles = roles.views;
  const reviewViews = referenceViews.map((view, index) => ({
    view: view.view,
    roomId: view.roomId,
    roomName: view.roomName,
    roomFunction: view.roomFunction,
    artifactRole: roles.views[index],
    artifactFilename: view.artifactFilename,
    artifactSha256: hashes[roles.views[index]],
    imageQuality,
  }));
  const payload = {
    schema: 'spatialforge-shell-model/2',
    artifactClass: 'shell_model',
    geometryVersion: 2,
    geometrySha256,
    geometry2dApprovalVersion: 1,
    geometry2dApprovalSha256: '2'.repeat(64),
    verticalDimensionsApprovalVersion: 1,
    verticalDimensionsApprovalSha256: '3'.repeat(64),
    wholeUnitTopologySha256: '4'.repeat(64),
    coordinateContract: 'canonical-z-up-mm-to-blender-z-up-m-to-gltf-y-up/1',
    compilerVersion: 'spatialforge-bare-shell-compiler/2',
    neutralMaterialContract: 'spatialforge-neutral-shell-review-material/1',
    reviewLightingContract: 'spatialforge-neutral-shell-review-lighting/2',
    reviewLightingParameters: {
      profile: 'preview', exposureEv: -1, roomAreaLightEnergyWatts: 420,
      keyAreaLightEnergyWatts: 1080, sunEnergy: 1.35, worldStrength: 0.26,
    },
    reviewExposureEv: -1,
    cameraContract: 'room-rendered-solid-clearance-opening-coverage/3',
    referenceViewContract: 'canonical-room-and-hosted-opening-reference-coverage/2',
    reviewImageQualityContract: 'spatialforge-neutral-shell-png-quality/1',
    glbArtifactRole: roles.glb,
    sceneManifestArtifactRole: roles.manifest,
    sceneManifestSha256: hashes[roles.manifest],
    reviewArtifactRoles,
    reviewViews,
    referenceViewCoverage: coverage,
    rendererVersion: 'Blender 4.3',
    renderEngine: 'BLENDER_EEVEE_NEXT',
    renderProfile: 'preview',
    renderSamples: 16,
    renderResolution: { width: 640, height: 480 },
    artifactManifest,
    artifactManifestSha256: await sha256Hex(
      new TextEncoder().encode(canonicalShellJson(artifactManifest)),
    ),
  };
  const shell = {
    projectId: PROJECT_ID,
    shellModelVersion: version,
    shellModelSha256: await sha256Hex(new TextEncoder().encode(canonicalShellJson(payload))),
    approvalStatus,
    ...payload,
    artifacts: artifactManifest.map((entry) => ({
      ...entry,
      mediaType: bytesByRole.get(entry.role).mediaType,
      url: `/api/v1/projects/${PROJECT_ID}/shell-models/${version}/artifacts/${entry.role}`,
    })),
  };
  const project = {
    projectId: PROJECT_ID,
    workflowContract: 'bare_shell_first/1',
    shellModelVersion: version,
    approvedShellModelVersion: approvalStatus === 'approved' ? version : null,
    state: approvalStatus === 'approved' ? 'SHELL_APPROVED' : 'SHELL_READY',
  };
  return { shell, project, bytesByRole, roles };
}

function fakeService(fixture, {
  currentSequence = [fixture.shell, fixture.shell],
  projectSequence = [fixture.project, fixture.project],
  artifactOverride = () => null,
  approval = null,
} = {}) {
  const requests = [];
  let currentIndex = 0;
  let projectIndex = 0;
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    const parsed = new URL(url);
    const currentPath = `/api/v1/projects/${PROJECT_ID}/shell-models/current`;
    const dashboardPath = `/api/v1/projects/${PROJECT_ID}`;
    if (parsed.pathname === currentPath) {
      const item = currentSequence[Math.min(currentIndex, currentSequence.length - 1)];
      currentIndex += 1;
      return responseAt(jsonResponse(200, item), url);
    }
    if (parsed.pathname === dashboardPath) {
      const item = projectSequence[Math.min(projectIndex, projectSequence.length - 1)];
      projectIndex += 1;
      return responseAt(jsonResponse(200, item), url);
    }
    if (parsed.pathname.endsWith('/approve')) {
      return responseAt(jsonResponse(200, approval || {
        projectId: PROJECT_ID,
        state: 'SHELL_APPROVED',
        approvedShellModelVersion: fixture.shell.shellModelVersion,
        shellModelSha256: fixture.shell.shellModelSha256,
        shellModelApprovalVersion: 1,
        shellModelApprovalSha256: 'a'.repeat(64),
      }), url);
    }
    const role = decodeURIComponent(parsed.pathname.split('/').at(-1));
    const item = fixture.bytesByRole.get(role);
    if (!item) return responseAt(jsonResponse(404, { detail: 'missing artifact' }), url);
    return responseAt(
      artifactOverride(role, item) || artifactResponse(item.bytes, item.mediaType),
      url,
    );
  };
  return { fetchImpl, requests };
}

function client(fetchImpl, enabled = true) {
  return new PrivateBareShellReviewClient({
    baseUrl: API, projectId: PROJECT_ID, fetchImpl, enabled,
  });
}

test('private bare-shell browser client is disabled by default and absent from public deployment', async () => {
  assert.equal(PRIVATE_BARE_SHELL_REVIEW_ENABLED, false);
  let calls = 0;
  const review = client(async () => { calls += 1; }, false);
  await assert.rejects(() => review.recoverReviewState(), /disabled/);
  assert.equal(calls, 0);
  const deployList = await readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8');
  assert.doesNotMatch(deployList, /journey-shell-review\.js/);
});

test('client rejects API base paths so control and artifact routes share one exact origin root', () => {
  assert.throws(() => new PrivateBareShellReviewClient({
    baseUrl: `${API}/nested`, projectId: PROJECT_ID, fetchImpl: async () => {}, enabled: true,
  }), /HTTPS or a loopback API/);
});

test('recovery verifies all current shell bytes before exposing a renderable copy', async () => {
  const fixture = await makeFixture();
  const service = fakeService(fixture);
  const review = client(service.fetchImpl);

  const state = await review.recoverReviewState();

  assert.equal(state.recoveryStatus, 'review_ready');
  assert.equal(state.shellModelVersion, fixture.shell.shellModelVersion);
  assert.equal(state.shellModelSha256, fixture.shell.shellModelSha256);
  assert.equal(state.artifactCount, 4);
  assert.equal(state.verifiedArtifactCount, 4);
  assert.equal(state.verificationComplete, true);
  assert.equal(state.roomCount, 1);
  assert.equal(state.viewCount, 2);
  assert.ok(state.artifacts.every((item) => !('url' in item) && !('path' in item) && !('bytes' in item)));
  const glb = await review.verifiedArtifact(fixture.roles.glb, state);
  assert.equal(glb.mediaType, 'model/gltf-binary');
  assert.equal(await sha256Hex(glb.bytes), fixture.shell.artifactManifest
    .find((item) => item.role === fixture.roles.glb).sha256);
  assert.notEqual(glb.bytes, fixture.bytesByRole.get(fixture.roles.glb).bytes);
  assert.ok(service.requests.every((request) => request.init.credentials === 'include'));
  assert.ok(service.requests.every((request) => request.init.cache === 'no-store'));
  assert.ok(service.requests.every((request) => !request.init.headers?.Authorization));
});

test('recovery validates a dynamic 15-view v3 ledger: overview, ten rooms and four opening views', async () => {
  const fixture = await makeFixture({ roomViewCount: 10, supplementaryViewCount: 4 });
  const state = await client(fakeService(fixture).fetchImpl).recoverReviewState();

  assert.equal(state.roomCount, 10);
  assert.equal(state.viewCount, 15);
  assert.equal(state.reviewViews.length, 15);
  assert.equal(state.artifactCount, 17);
  assert.equal(state.verifiedArtifactCount, 17);
  assert.equal(state.reviewViews[10].roomId, 'room-10');
  assert.equal(state.reviewViews[11].view, 'coverage-opening-01');
  assert.equal(state.cameraContract, 'room-rendered-solid-clearance-opening-coverage/3');
});

test('recovery fails closed on role, URL, descriptor and coverage drift', async (t) => {
  const cases = [
    ['extra role', (shell) => { shell.artifacts.push({ ...shell.artifacts[0], role: 'extra' }); }, /duplicate, extra or missing/],
    ['cross-origin URL', (shell) => { shell.artifacts[0].url = 'https://public.example/model.glb'; }, /exact private route/],
    ['descriptor disagreement', (shell) => { shell.artifacts[0].sha256 = 'f'.repeat(64); }, /disagrees with its manifest/],
    ['incomplete room coverage', (shell) => { shell.referenceViewCoverage.complete = false; }, /coverage is incomplete/],
    ['missing overview', (shell) => { shell.reviewViews[0].view = 'room'; }, /begin with one room-neutral overview/],
    ['lighting parameter drift', (shell) => { shell.reviewLightingParameters.worldStrength = 0.08; }, /neutral-review contract is unsupported/],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, async () => {
      const fixture = await makeFixture();
      const shell = structuredClone(fixture.shell);
      mutate(shell);
      const service = fakeService(fixture, { currentSequence: [shell] });
      await assert.rejects(() => client(service.fetchImpl).recoverReviewState(), expected);
      assert.equal(service.requests.some((request) => request.url.includes('/artifacts/')), false);
    });
  }
});

test('recovery rejects stale dashboard pointers and clears bytes on a mid-review version change', async () => {
  const first = await makeFixture({ version: 3 });
  const staleProject = { ...first.project, shellModelVersion: 2 };
  const staleService = fakeService(first, { projectSequence: [staleProject] });
  await assert.rejects(() => client(staleService.fetchImpl).recoverReviewState(), /stale bare-shell pointer/);

  const second = await makeFixture({ version: 4 });
  const changingService = fakeService(first, {
    currentSequence: [first.shell, second.shell],
    projectSequence: [first.project, second.project],
  });
  const review = client(changingService.fetchImpl);
  await assert.rejects(() => review.recoverReviewState(), /changed during review recovery/);
  await assert.rejects(
    () => review.verifiedArtifact(first.roles.glb, first.shell),
    /No complete byte-verified receipt/,
  );
});

test('recovery binds semantic-manifest cameras to the exact shell review-view ledger', async () => {
  const fixture = await makeFixture({
    mutateSceneManifest: (manifest) => { manifest.referenceViews[1].roomId = 'room-other'; },
  });
  const service = fakeService(fixture);
  await assert.rejects(
    () => client(service.fetchImpl).recoverReviewState(),
    /review views disagree with the semantic manifest/,
  );
});

test('control and artifact responses reject redirects even when a fetch adapter follows them', async (t) => {
  await t.test('control redirect', async () => {
    const fixture = await makeFixture();
    const service = fakeService(fixture);
    const redirectedFetch = async (url, init) => {
      const response = await service.fetchImpl(url, init);
      if (new URL(url).pathname === `/api/v1/projects/${PROJECT_ID}`) {
        return responseAt(response, 'https://evil.example/project');
      }
      return response;
    };
    await assert.rejects(() => client(redirectedFetch).recoverReviewState(), /redirected or changed origin/);
    assert.equal(service.requests[0].init.redirect, 'error');
  });
  await t.test('artifact redirect', async () => {
    const fixture = await makeFixture();
    const service = fakeService(fixture);
    const redirectedFetch = async (url, init) => {
      const response = await service.fetchImpl(url, init);
      if (url.includes('/artifacts/')) return responseAt(response, 'https://evil.example/model.glb');
      return response;
    };
    await assert.rejects(() => client(redirectedFetch).recoverReviewState(), /redirected or changed origin/);
    const artifactRequest = service.requests.find((item) => item.url.includes('/artifacts/'));
    assert.equal(artifactRequest.init.redirect, 'error');
  });
});

test('recovery rejects artifact MIME, byte-size, hash and private-cache failures', async (t) => {
  const cases = [
    ['MIME', (item) => artifactResponse(item.bytes, item.mediaType, { mediaType: 'text/plain' }), /unsafe response headers/],
    ['declared size', (item) => artifactResponse(item.bytes, item.mediaType, { declaredSize: item.bytes.byteLength + 1 }), /stale declared size/],
    ['downloaded size', (item) => {
      const bytes = item.bytes.slice(0, item.bytes.byteLength - 1);
      return artifactResponse(bytes, item.mediaType);
    }, /stale declared size|byte size is stale/],
    ['hash', (item) => {
      const bytes = item.bytes.slice(0);
      new Uint8Array(bytes)[bytes.byteLength - 1] ^= 1;
      return artifactResponse(bytes, item.mediaType);
    }, /SHA-256 is stale/],
    ['cache', (item) => artifactResponse(item.bytes, item.mediaType, { cacheControl: 'public, max-age=60' }), /unsafe response headers/],
  ];
  for (const [name, override, expected] of cases) {
    await t.test(name, async () => {
      const fixture = await makeFixture();
      const service = fakeService(fixture, {
        artifactOverride: (role, item) => (role === fixture.roles.glb ? override(item) : null),
      });
      await assert.rejects(() => client(service.fetchImpl).recoverReviewState(), expected);
    });
  }
});

test('approval is impossible before full verification and posts the exact verified version/hash', async () => {
  const fixture = await makeFixture();
  const service = fakeService(fixture);
  const review = client(service.fetchImpl);
  const request = {
    shellModelVersion: fixture.shell.shellModelVersion,
    shellModelSha256: fixture.shell.shellModelSha256,
    reviewerActorId: 'reviewer:shell',
    confirmGeometryOnly: true,
  };
  await assert.rejects(() => review.approveCurrent(request), /complete byte-verified/);
  assert.equal(service.requests.length, 0);

  const state = await review.recoverReviewState();
  await assert.rejects(
    () => review.approveCurrent({ ...request, shellModelSha256: '0'.repeat(64) }),
    /does not match the verified receipt/,
  );
  assert.equal(service.requests.some((item) => item.url.endsWith('/approve')), false);
  const approved = await review.approveCurrent(request);
  assert.equal(approved.state, 'SHELL_APPROVED');
  assert.equal(approved.shellModelVersion, state.shellModelVersion);
  assert.equal(approved.shellModelSha256, state.shellModelSha256);
  const post = service.requests.find((item) => item.url.endsWith('/approve'));
  assert.equal(post.init.method, 'POST');
  assert.equal(post.url, `${API}/api/v1/projects/${PROJECT_ID}/shell-models/3/approve`);
  assert.deepEqual(JSON.parse(post.init.body), {
    shellModelSha256: fixture.shell.shellModelSha256,
    reviewerActorId: 'reviewer:shell',
    confirmGeometryOnly: true,
  });
});

test('an approved shell recovers as approved but cannot be approved through the ready-only action', async () => {
  const fixture = await makeFixture({ approvalStatus: 'approved' });
  const service = fakeService(fixture);
  const review = client(service.fetchImpl);
  const state = await review.recoverReviewState();
  assert.equal(state.recoveryStatus, 'approved');
  assert.equal(state.approvalStatus, 'approved');
  await assert.rejects(() => review.approveCurrent({
    ...state, reviewerActorId: 'reviewer:shell', confirmGeometryOnly: true,
  }), /complete byte-verified review receipt/);
});
