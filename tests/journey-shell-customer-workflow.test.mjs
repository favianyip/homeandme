import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PRIVATE_SHELL_CUSTOMER_WORKFLOW_ENABLED,
  PrivateShellCustomerWorkflow,
  functionalFurnitureBriefRequest,
  validatePrivateShellRelease,
  validateShellStructuralEvidence,
  validateShellVisualQuality,
} from '../journey-shell-customer-workflow.js';
import { canonicalShellJson, sha256Hex } from '../journey-shell-review.js';
import { registrationIntegritySha256 } from '../journey-source-registration.js';
import {
  PRIVATE_SHELL_WORKFLOW_SURFACE_ENABLED,
  PrivateShellWorkflowSurfaceController,
  privateShellStageRows,
} from '../private-shell-workflow-view.js';

const PROJECT_ID = 'HNM-SHELL-WORKFLOW-1';
const API = 'https://private-api.example';
const RELEASE = 'a'.repeat(64);
const JSON_PRIVATE_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
};

function responseAt(response, url) {
  Object.defineProperty(response, 'url', { configurable: true, value: url });
  return response;
}

function jsonResponse(url, payload, { status = 200, headers = JSON_PRIVATE_HEADERS } = {}) {
  return responseAt(new Response(JSON.stringify(payload), { status, headers }), url);
}

function bytesResponse(url, bytes, mediaType, { cacheControl = 'private, no-store' } = {}) {
  return responseAt(new Response(bytes, {
    status: 200,
    headers: {
      'content-type': mediaType,
      'content-length': String(bytes.byteLength),
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
    },
  }), url);
}

function makeGlb() {
  const document = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], nodes: [] };
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
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, seed, 0, 0, 0, seed,
  ]).buffer;
}

function quality() {
  return {
    contract: 'spatialforge-neutral-shell-png-quality/1',
    widthPixels: 640,
    heightPixels: 400,
    meanLuma: 148.5,
    stddevLuma: 42.25,
    whitePixelFraction: 0.12,
    blackPixelFraction: 0.02,
    passed: true,
    failureCodes: [],
  };
}

function releaseManifest() {
  const capabilities = {
    SOURCE_REGISTERED_2D_APPROVAL: true,
    VERTICAL_DIMENSIONS_APPROVAL: true,
    BARE_SHELL_GENERATION: true,
    BARE_SHELL_REVIEW: true,
    FUNCTIONAL_FURNITURE_BRIEF: true,
    DESIGN_SELECTION: false,
    FURNISHED_MODEL: false,
    AI_RENDERING: false,
    QUOTATION: false,
    PAYMENTS: false,
  };
  return {
    schema: 'homeandme-private-shell-capabilities/1',
    releaseId: RELEASE,
    runtimeEnvironment: 'test',
    serviceReady: true,
    scope: 'private-service-only',
    contracts: {
      projectApi: 'homeandme-project-api/2',
      workflow: 'bare_shell_first/1',
      geometry: 'spatialforge-canonical-geometry/1.0',
      sourceRegistration: 'hnm-source-pixel-metric-registration/1',
      shellModel: 'spatialforge-shell-model/2',
      shellSceneManifest: 'spatialforge-shell-scene-manifest/2',
      shellCompiler: 'spatialforge-bare-shell-compiler/2',
      shellCoordinate: 'canonical-z-up-mm-to-blender-z-up-m-to-gltf-y-up/1',
      shellMaterial: 'spatialforge-neutral-shell-review-material/1',
      shellLighting: 'spatialforge-neutral-shell-review-lighting/2',
      referenceViews: 'canonical-room-and-hosted-opening-reference-coverage/2',
      shellReview: 'homeandme-private-bare-shell-review/1',
      furnitureBrief: 'spatialforge-functional-furniture-brief/1',
      privacy: 'same-origin-private-no-store/1',
      visualQuality: 'spatialforge-neutral-shell-png-quality/1',
      camera: 'room-rendered-solid-clearance-opening-coverage/3',
      openingVisibility: 'hosted-opening-centre-ray-frustum/1',
    },
    capabilities,
    dependencyOrder: Object.keys(capabilities),
    safeguards: {
      demoFallbackEnabled: false,
      localGeometryAuthorshipEnabled: false,
      publicJourneyWiringEnabled: false,
      designRenderCommerceEnabled: false,
    },
  };
}

function walls() {
  return [
    { id: 'wall-south', kind: 'structural', start: { x: 0, y: 0 }, end: { x: 8000, y: 0 }, thickness: 180, height: 2800 },
    { id: 'wall-east', kind: 'structural', start: { x: 8000, y: 0 }, end: { x: 8000, y: 5000 }, thickness: 180, height: 2800 },
    { id: 'wall-north', kind: 'structural', start: { x: 8000, y: 5000 }, end: { x: 0, y: 5000 }, thickness: 180, height: 2800 },
    { id: 'wall-west', kind: 'structural', start: { x: 0, y: 5000 }, end: { x: 0, y: 0 }, thickness: 180, height: 2800 },
    { id: 'wall-divider', kind: 'partition', start: { x: 4000, y: 0 }, end: { x: 4000, y: 5000 }, thickness: 100, height: 2800 },
  ];
}

function openings() {
  return [
    { id: 'door-entry', wall_id: 'wall-south', kind: 'door', offset: 500, width: 900, height: 2100, sill: 0, swing: 'left', reviewed_usage: 'primary_entrance' },
    { id: 'door-bedroom', wall_id: 'wall-divider', kind: 'door', offset: 1800, width: 900, height: 2100, sill: 0, swing: 'right', reviewed_usage: 'interior_door' },
    { id: 'window-living', wall_id: 'wall-north', kind: 'window', offset: 4300, width: 1400, height: 1200, sill: 900, swing: 'none', reviewed_usage: 'exterior_window' },
    { id: 'window-bedroom', wall_id: 'wall-east', kind: 'window', offset: 2000, width: 1200, height: 1200, sill: 900, swing: 'none', reviewed_usage: 'exterior_window' },
  ];
}

function rooms() {
  return [
    {
      id: 'room-living', name: 'Living room', function: 'living',
      boundary: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 5000 }, { x: 0, y: 5000 }],
    },
    {
      id: 'room-bedroom', name: 'Bedroom', function: 'bedroom',
      boundary: [{ x: 4000, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 5000 }, { x: 4000, y: 5000 }],
    },
  ];
}

async function geometryReview({ geometryVersion = 2, geometrySha256 = '1'.repeat(64) } = {}) {
  const registration = {
    schema: 'hnm-source-pixel-metric-registration/1',
    sourceArtifactRole: 'original_upload',
    sourceArtifactSha256: 'f'.repeat(64),
    sourceImageSizePx: { width: 800, height: 500 },
    geometrySha256,
    pixelToMetric: { a: 10, b: 0, c: 0, d: 10, e: 0, f: 0 },
  };
  registration.registrationSha256 = await registrationIntegritySha256(registration);
  return {
    projectId: PROJECT_ID,
    geometryVersion,
    geometrySha256,
    approvalStatus: 'approved',
    validation: { valid: true, issues: [] },
    sourceReferences: {
      geometry2dApprovalVersion: 1,
      geometry2dApprovalSha256: '2'.repeat(64),
      verticalDimensionsApprovalVersion: 1,
      verticalDimensionsApprovalSha256: '3'.repeat(64),
      wholeUnitTopologySha256: '4'.repeat(64),
    },
    correctionEvidenceSource: {
      role: 'original_upload',
      sha256: 'f'.repeat(64),
      mediaType: 'image/png',
      byteSize: 100,
      intrinsicPixels: { width: 800, height: 500 },
      sourceGeometryAncestryVersions: [geometryVersion],
      pixelMetricRegistration: registration,
    },
    geometry: {
      project_id: PROJECT_ID,
      revision: geometryVersion,
      units: 'mm',
      walls: walls(),
      openings: openings(),
      rooms: rooms(),
    },
  };
}

function sceneWall(source, openingIds) {
  return {
    id: source.id,
    kind: source.kind,
    startMm: source.start,
    endMm: source.end,
    thicknessMm: source.thickness,
    heightMm: source.height,
    openingIds,
  };
}

function sceneOpening(source) {
  return {
    id: source.id,
    hostWallId: source.wall_id,
    kind: source.kind,
    offsetMm: source.offset,
    widthMm: source.width,
    heightMm: source.height,
    sillMm: source.sill,
    swing: source.swing,
    reviewedUsage: source.reviewed_usage,
  };
}

function roomView({ view, room, kind, visible, focus = null, filename }) {
  return {
    view,
    kind,
    roomId: room.id,
    roomName: room.name,
    roomFunction: room.function,
    selectionContract: 'room-rendered-solid-clearance-opening-coverage/3',
    cameraOriginWallSolidClearanceMm: 300,
    nearPlaneWallSolidClearanceMm: 300,
    cameraBoundaryClearanceMm: 300,
    cameraTargetDistanceMm: 1200,
    nearClipMm: 50,
    sensorWidthMm: 36,
    sensorFit: 'HORIZONTAL',
    renderAspectRatio: '8:5',
    adjacentHostedOpeningIds: openings().map((item) => item.id),
    visibleHostedOpeningIds: visible,
    openingVisibilityContract: 'hosted-opening-centre-ray-frustum/1',
    coverageFocusOpeningId: focus,
    artifactFilename: filename,
  };
}

async function shellFixture({ mutateManifest = () => {}, mutatePayload = () => {} } = {}) {
  const sourceWalls = walls();
  const sourceOpenings = openings();
  const sourceRooms = rooms();
  const hostedOpeningIds = sourceOpenings.map((item) => item.id).sort();
  const coverage = {
    contract: 'canonical-room-and-hosted-opening-reference-coverage/2',
    cameraContract: 'room-rendered-solid-clearance-opening-coverage/3',
    authoritativeRoomIds: sourceRooms.map((item) => item.id).sort(),
    coveredRoomIds: ['room-living', 'room-bedroom'],
    uncoveredRoomIds: [],
    uncoveredRooms: [],
    hostedOpeningIds,
    coveredHostedOpeningIds: hostedOpeningIds,
    uncoveredHostedOpeningIds: [],
    openingCoverageComplete: true,
    complete: true,
    roomViewCount: 2,
    supplementaryViewCount: 1,
    totalViewCount: 4,
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
  const referenceViews = [
    {
      view: 'overview', kind: 'whole_unit_overview', roomId: null, roomName: null,
      roomFunction: null, selectionContract: 'whole-unit-exterior-overview/2',
      openingVisibilityContract: 'hosted-opening-centre-ray-frustum/1',
      visibleHostedOpeningIds: [], artifactFilename: 'render-angle-1.png',
    },
    roomView({
      view: 'living', room: sourceRooms[0], kind: 'canonical_room',
      visible: ['door-entry', 'window-living'], filename: 'render-angle-2.png',
    }),
    roomView({
      view: 'bedroom', room: sourceRooms[1], kind: 'canonical_room',
      visible: ['door-bedroom'], filename: 'render-angle-3.png',
    }),
    roomView({
      view: 'opening-window-bedroom', room: sourceRooms[1], kind: 'hosted_opening_coverage',
      visible: ['window-bedroom'], focus: 'window-bedroom', filename: 'render-angle-4.png',
    }),
  ];
  const topologyBindings = sourceOpenings.map((item) => ({
    openingId: item.id,
    hostWallId: item.wall_id,
    kind: item.kind,
    bindingStatus: 'resolved',
  }));
  const wallOpenings = Object.fromEntries(sourceWalls.map((wall) => [
    wall.id, sourceOpenings.filter((opening) => opening.wall_id === wall.id).map((opening) => opening.id),
  ]));
  const manifest = {
    schema: 'spatialforge-shell-scene-manifest/2',
    artifactClass: 'shell_model',
    projectId: PROJECT_ID,
    geometryRevision: 2,
    geometrySha256: '1'.repeat(64),
    wholeUnitTopologySha256: '4'.repeat(64),
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
    walls: sourceWalls.map((wall) => sceneWall(wall, wallOpenings[wall.id])),
    openings: sourceOpenings.map(sceneOpening),
    rooms: sourceRooms.map((room) => ({
      id: room.id, name: room.name, function: room.function, boundaryMm: room.boundary,
    })),
    referenceViews,
    referenceViewCoverage: structuredClone(coverage),
    wholeUnitTopology: {
      schema: 'hnm-room-outside-portal-graph/1',
      readyForWholeUnit3d: true,
      issues: [],
      requiredRoomIds: sourceRooms.map((item) => item.id).sort(),
      reachableRoomIds: sourceRooms.map((item) => item.id).sort(),
      unreachableRoomIds: [],
      primaryEntranceId: 'door-entry',
      openingSideBindings: topologyBindings,
    },
  };
  mutateManifest(manifest);
  const manifestBytes = new TextEncoder().encode(canonicalShellJson(manifest)).buffer;
  const roles = {
    glb: 'shell_job_glb',
    manifest: 'shell_job_semantic_manifest',
    views: ['shell_job_review_1', 'shell_job_review_2', 'shell_job_review_3', 'shell_job_review_4'],
  };
  const artifacts = new Map([
    [roles.glb, { bytes: makeGlb(), mediaType: 'model/gltf-binary' }],
    [roles.manifest, { bytes: manifestBytes, mediaType: 'application/json' }],
    ...roles.views.map((role, index) => [role, { bytes: makePng(index + 1), mediaType: 'image/png' }]),
  ]);
  const hashes = Object.fromEntries(await Promise.all(
    [...artifacts].map(async ([role, item]) => [role, await sha256Hex(item.bytes)]),
  ));
  const reviewViews = referenceViews.map((view, index) => ({
    view: view.view,
    roomId: view.roomId,
    roomName: view.roomName,
    roomFunction: view.roomFunction,
    artifactRole: roles.views[index],
    artifactFilename: view.artifactFilename,
    artifactSha256: hashes[roles.views[index]],
    imageQuality: quality(),
  }));
  const artifactManifest = [...artifacts].map(([role, item]) => ({
    role, sha256: hashes[role], byteSize: item.bytes.byteLength,
  })).sort((left, right) => left.role.localeCompare(right.role));
  const payload = {
    schema: 'spatialforge-shell-model/2',
    artifactClass: 'shell_model',
    geometryVersion: 2,
    geometrySha256: '1'.repeat(64),
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
    reviewArtifactRoles: roles.views,
    reviewViews,
    referenceViewCoverage: structuredClone(coverage),
    rendererVersion: 'Blender 4.3',
    renderEngine: 'BLENDER_EEVEE_NEXT',
    renderProfile: 'preview',
    renderSamples: 16,
    renderResolution: { width: 640, height: 400 },
    artifactManifest,
    artifactManifestSha256: await sha256Hex(
      new TextEncoder().encode(canonicalShellJson(artifactManifest)),
    ),
  };
  mutatePayload(payload);
  const shell = {
    projectId: PROJECT_ID,
    shellModelVersion: 3,
    shellModelSha256: await sha256Hex(new TextEncoder().encode(canonicalShellJson(payload))),
    approvalStatus: 'ready',
    ...payload,
    artifacts: artifactManifest.map((entry) => ({
      ...entry,
      mediaType: artifacts.get(entry.role).mediaType,
      url: `/api/v1/projects/${PROJECT_ID}/shell-models/3/artifacts/${entry.role}`,
    })),
  };
  return { shell, artifacts, roles, manifest };
}

function projectDashboard(state = 'GEOMETRY_APPROVED', geometryVersion = 2) {
  const hasShell = ['SHELL_READY', 'SHELL_APPROVED', 'FURNITURE_BRIEF_COMPLETE'].includes(state);
  const approved = ['SHELL_APPROVED', 'FURNITURE_BRIEF_COMPLETE'].includes(state);
  return {
    projectId: PROJECT_ID,
    state,
    workflowContract: 'bare_shell_first/1',
    geometryVersion,
    approvedGeometryVersion: geometryVersion,
    shellModelVersion: hasShell ? 3 : null,
    approvedShellModelVersion: approved ? 3 : null,
    furnitureBriefVersion: state === 'FURNITURE_BRIEF_COMPLETE' ? 1 : null,
    designSelectionVersion: null,
    designBriefVersion: null,
    layoutVersion: null,
    approvedLayoutVersion: null,
    modelVersion: null,
    approvedModelVersion: null,
    renderVersion: null,
    approvedDesignVersion: null,
    paymentStatus: 'none',
    quote: null,
  };
}

async function fakeService({
  fixture = null,
  release = releaseManifest(),
  releaseUrl = null,
  releaseHeaders = JSON_PRIVATE_HEADERS,
  artifactCacheControl = 'private, no-store',
} = {}) {
  fixture ||= await shellFixture();
  let state = 'GEOMETRY_APPROVED';
  let currentGeometry = await geometryReview();
  let storedBrief = null;
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    const path = new URL(url).pathname;
    if (path === '/api/v1/private-shell-capabilities') {
      return jsonResponse(releaseUrl || url, release, { headers: releaseHeaders });
    }
    if (path === `/api/v1/projects/${PROJECT_ID}`) {
      return jsonResponse(url, projectDashboard(state, currentGeometry.geometryVersion));
    }
    if (path === `/api/v1/projects/${PROJECT_ID}/geometry`) return jsonResponse(url, currentGeometry);
    if (path === `/api/v1/projects/${PROJECT_ID}/shell-models` && init.method === 'POST') {
      state = 'SHELL_READY';
      return jsonResponse(url, {
        projectId: PROJECT_ID,
        jobId: 'job-shell-1',
        status: 'queued',
        stage: 'queued',
        progressPercentage: 0,
        message: 'Queued',
        retryable: false,
        cancellationRequested: false,
        warnings: [],
        resultReferences: {},
        correlationId: 'correlation-shell-1',
      }, { status: 202 });
    }
    if (path === `/api/v1/projects/${PROJECT_ID}/shell-models/current`) {
      const shell = structuredClone(fixture.shell);
      shell.approvalStatus = state === 'SHELL_READY' ? 'ready' : 'approved';
      return jsonResponse(url, shell);
    }
    if (path.endsWith('/approve') && init.method === 'POST') {
      state = 'SHELL_APPROVED';
      return jsonResponse(url, {
        projectId: PROJECT_ID,
        state,
        approvedShellModelVersion: 3,
        shellModelSha256: fixture.shell.shellModelSha256,
        shellModelApprovalVersion: 1,
        shellModelApprovalSha256: '9'.repeat(64),
      });
    }
    if (path === `/api/v1/projects/${PROJECT_ID}/furniture-brief` && init.method === 'POST') {
      const input = JSON.parse(init.body);
      state = 'FURNITURE_BRIEF_COMPLETE';
      storedBrief = {
        projectId: PROJECT_ID,
        state,
        furnitureBriefVersion: 1,
        furnitureBriefSha256: '8'.repeat(64),
        sourceReferences: {
          shellModelVersion: 3,
          shellModelSha256: fixture.shell.shellModelSha256,
          geometryVersion: 2,
          geometrySha256: '1'.repeat(64),
          actor: { actorId: 'reviewer:fixture' },
        },
        furnitureBrief: {
          schema: 'spatialforge-functional-furniture-brief/1',
          ...Object.fromEntries(Object.entries(input).filter(([key]) => !key.startsWith('shellModel'))),
          actor: { actorId: 'reviewer:fixture' },
        },
      };
      return jsonResponse(url, storedBrief, { status: 201 });
    }
    if (path === `/api/v1/projects/${PROJECT_ID}/furniture-brief` && init.method === 'GET') {
      return jsonResponse(url, storedBrief || { detail: 'missing' }, { status: storedBrief ? 200 : 409 });
    }
    const role = decodeURIComponent(path.split('/').at(-1));
    const artifact = fixture.artifacts.get(role);
    if (artifact) return bytesResponse(url, artifact.bytes, artifact.mediaType, { cacheControl: artifactCacheControl });
    return jsonResponse(url, { detail: 'missing' }, { status: 404 });
  };
  return {
    fetchImpl,
    requests,
    fixture,
    setState(value) { state = value; },
    replaceGeometry(value) { currentGeometry = value; },
  };
}

function workflow(fetchImpl, enabled = true) {
  return new PrivateShellCustomerWorkflow({
    baseUrl: `${API}/`,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    fetchImpl,
    enabled,
  });
}

function functionalInput() {
  return {
    householdMembers: 2,
    children: 0,
    elderlyOccupants: 0,
    pets: [],
    accessibilityNeeds: [],
    workFromHome: true,
    cookingFrequency: 'daily',
    storageRequirements: 'full-height storage near entry',
    roomNeeds: [
      { roomId: 'room-bedroom', intendedUse: 'sleep and study', functionalNeeds: ['bed', 'desk'] },
    ],
    existingInventory: [],
    specialFunctionalNeeds: 'Keep a clear route between entrance and bedroom.',
  };
}

test('private customer workflow defaults off and public pages/deployment do not import it', async () => {
  assert.equal(PRIVATE_SHELL_CUSTOMER_WORKFLOW_ENABLED, false);
  let calls = 0;
  const client = workflow(async () => { calls += 1; }, false);
  await assert.rejects(() => client.connect(), /disabled/);
  assert.equal(calls, 0);

  const [config, deploy, page, script] = await Promise.all([
    readFile(new URL('../config.js', import.meta.url), 'utf8'),
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../project-journey.js', import.meta.url), 'utf8'),
  ]);
  assert.match(config, /LIVE_3D_ENABLED:\s*false/);
  assert.match(config, /AI_RENDERING_ENABLED:\s*false/);
  assert.match(config, /QUOTATION_ENABLED:\s*false/);
  assert.match(config, /PAYMENTS_ENABLED:\s*false/);
  assert.match(config, /DEMO_FALLBACK_ENABLED:\s*false/);
  assert.doesNotMatch(deploy, /journey-shell-customer-workflow|private-shell-workflow/);
  assert.doesNotMatch(page, /journey-shell-customer-workflow/);
  assert.doesNotMatch(script, /journey-shell-customer-workflow/);
});

test('private review surface is disabled, mobile-aware and never wired into the public journey', async () => {
  assert.equal(PRIVATE_SHELL_WORKFLOW_SURFACE_ENABLED, false);
  let calls = 0;
  assert.throws(() => new PrivateShellWorkflowSurfaceController({
    enabled: false,
    fetchImpl: async () => { calls += 1; },
  }), /disabled/);
  assert.equal(calls, 0);
  assert.deepEqual(privateShellStageRows({ phase: 'shell_review' }).map((item) => item.status), [
    'complete', 'current', 'locked', 'locked',
  ]);
  const [css, fixture, source] = await Promise.all([
    readFile(new URL('../assets/css/private-shell-workflow.css', import.meta.url), 'utf8'),
    readFile(new URL('./private-shell-workflow.browser.html', import.meta.url), 'utf8'),
    readFile(new URL('../journey-shell-customer-workflow.js', import.meta.url), 'utf8'),
  ]);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(fixture, /noindex,nofollow,noarchive/);
  assert.match(fixture, /data-test-fixture="private-shell-workflow"/);
  assert.equal(source.match(/^\s+functionalNeeds:/gm)?.length, 1);
});

test('release handshake pins current shell/camera contracts and rejects downstream or local fallbacks', () => {
  const valid = validatePrivateShellRelease(releaseManifest(), {
    expectedReleaseId: RELEASE,
    baseUrl: `${API}/`,
  });
  assert.equal(valid.contracts.shellModel, 'spatialforge-shell-model/2');
  assert.equal(valid.contracts.camera, 'room-rendered-solid-clearance-opening-coverage/3');

  for (const mutate of [
    (value) => { value.contracts.camera = 'room-rendered-solid-clearance-opening-coverage/2'; },
    (value) => { value.contracts.openingVisibility = 'hosted-opening-centre-ray-frustum/0'; },
    (value) => { value.capabilities.DESIGN_SELECTION = true; },
    (value) => { value.safeguards.demoFallbackEnabled = true; },
    (value) => { value.safeguards.localGeometryAuthorshipEnabled = true; },
  ]) {
    const candidate = releaseManifest();
    mutate(candidate);
    assert.throws(() => validatePrivateShellRelease(candidate, {
      expectedReleaseId: RELEASE,
      baseUrl: `${API}/`,
    }), /unavailable/);
  }
});

test('happy path is approved source → shell generation → exact evidence → shell approval → functional brief', async () => {
  const service = await fakeService();
  const client = workflow(service.fetchImpl);

  let state = await client.connect();
  assert.equal(state.phase, 'shell_generation_ready');
  assert.equal(state.actions.generateShell, true);
  assert.equal(state.source.geometryVersion, 2);
  assert.equal(state.truth.geometryAuthority, 'server-only');

  const job = await client.generateShell();
  assert.equal(job.status, 'queued');
  state = await client.sync();
  assert.equal(state.phase, 'shell_review');
  assert.deepEqual(state.evidence.counts, {
    walls: 5, doors: 2, windows: 2, passages: 0,
    rooms: 2, hostedOpenings: 4, reviewViews: 4,
  });
  assert.equal(state.shell.reviewViews.length, 4);
  assert.equal(state.shell.verificationComplete, true);
  assert.equal(state.shell.artifactTransportContract, 'same-origin-private-no-store/1');
  assert.equal(state.shell.glbArtifact.mediaType, 'model/gltf-binary');
  assert.equal(state.shell.glbArtifact.role, service.fixture.shell.glbArtifactRole);
  assert.equal(state.visualQuality.status, 'passed');
  assert.equal(state.visualQuality.cameraContract, 'room-rendered-solid-clearance-opening-coverage/3');
  assert.equal(state.actions.approveShell, false);
  assert.equal(Object.values(state.downstreamLocks).every(Boolean), true);

  client.inspectCurrent({
    confirmWalls: true,
    confirmDoors: true,
    confirmWindows: true,
    confirmRooms: true,
    confirmEveryView: true,
    viewedArtifactRoles: state.shell.reviewViews.map((item) => item.artifactRole),
  });
  assert.equal(client.snapshot().actions.approveShell, true);
  await client.approveShell('reviewer:shell');
  state = client.snapshot();
  assert.equal(state.phase, 'shell_approved');
  assert.equal(state.actions.functionalFurnitureBrief, true);

  const brief = await client.saveFunctionalBrief(functionalInput());
  assert.equal(brief.furnitureBrief.schema, 'spatialforge-functional-furniture-brief/1');
  assert.equal(client.snapshot().phase, 'functional_brief_complete');
  assert.equal(Object.values(client.snapshot().downstreamLocks).every(Boolean), true);
  assert.equal(service.requests.some((item) => /design|render|quote|payment/.test(item.url)), false);
});

test('supplementary views are accepted only when every primary room and hosted opening is covered', async () => {
  const service = await fakeService();
  const client = workflow(service.fetchImpl);
  await client.connect();
  await client.generateShell();
  const state = await client.sync();
  assert.equal(state.phase, 'shell_review');
  assert.equal(state.shell.reviewViews[3].view, 'opening-window-bedroom');
  assert.equal(state.evidence.counts.reviewViews, state.evidence.counts.rooms + 2);

  const incomplete = await shellFixture({
    mutatePayload(payload) {
      payload.referenceViewCoverage.uncoveredHostedOpeningIds = ['window-bedroom'];
      payload.referenceViewCoverage.coveredHostedOpeningIds = payload.referenceViewCoverage
        .coveredHostedOpeningIds.filter((item) => item !== 'window-bedroom');
      payload.referenceViewCoverage.openingCoverageComplete = false;
      payload.referenceViewCoverage.complete = false;
    },
  });
  const blockedService = await fakeService({ fixture: incomplete });
  const blocked = workflow(blockedService.fetchImpl);
  await blocked.connect();
  await blocked.generateShell();
  const blockedState = await blocked.sync();
  assert.equal(blockedState.phase, 'blocked');
  assert.match(blockedState.blockers[0].message, /coverage/i);
});

test('unhosted scene opening and failed inline visual-quality evidence both lock approval', async (t) => {
  await t.test('unhosted opening', async () => {
    const fixture = await shellFixture({
      mutateManifest(manifest) {
        manifest.openings.find((item) => item.id === 'window-bedroom').hostWallId = 'wall-missing';
      },
    });
    const service = await fakeService({ fixture });
    const client = workflow(service.fetchImpl);
    await client.connect();
    await client.generateShell();
    const state = await client.sync();
    assert.equal(state.phase, 'blocked');
    assert.match(state.blockers[0].message, /unhosted/i);
    assert.equal(state.actions.approveShell, false);
  });

  await t.test('failed image quality', async () => {
    const fixture = await shellFixture({
      mutatePayload(payload) {
        payload.reviewViews[2].imageQuality.passed = false;
        payload.reviewViews[2].imageQuality.failureCodes = ['WHITE_PIXEL_FRACTION_ABOVE_MAXIMUM'];
      },
    });
    const service = await fakeService({ fixture });
    const client = workflow(service.fetchImpl);
    await client.connect();
    await client.generateShell();
    const state = await client.sync();
    assert.equal(state.phase, 'blocked');
    assert.match(state.blockers[0].message, /image-quality/i);
    assert.equal(state.actions.inspectShell, false);
  });
});

test('stale shell/source hashes and a new source revision invalidate inspection and artifacts', async () => {
  const service = await fakeService();
  const client = workflow(service.fetchImpl);
  await client.connect();
  await client.generateShell();
  const ready = await client.sync();
  client.inspectCurrent({
    confirmWalls: true,
    confirmDoors: true,
    confirmWindows: true,
    confirmRooms: true,
    confirmEveryView: true,
    viewedArtifactRoles: ready.shell.reviewViews.map((item) => item.artifactRole),
  });

  const replacement = await geometryReview({ geometryVersion: 4, geometrySha256: '7'.repeat(64) });
  service.replaceGeometry(replacement);
  service.setState('GEOMETRY_APPROVED');
  const after = await client.sync();
  assert.equal(after.phase, 'shell_generation_ready');
  assert.equal(after.shell, null);
  assert.equal(after.inspection, null);
  assert.equal(after.actions.approveShell, false);
  await assert.rejects(() => client.approveShell('reviewer:shell'), /inspection/);
});

test('cross-origin redirects and non-private release/artifact caching fail closed', async (t) => {
  await t.test('release redirect', async () => {
    const service = await fakeService({ releaseUrl: 'https://evil.example/capabilities' });
    await assert.rejects(() => workflow(service.fetchImpl).connect(), /redirected or changed origin/);
  });
  await t.test('release cache', async () => {
    const service = await fakeService({
      releaseHeaders: { ...JSON_PRIVATE_HEADERS, 'cache-control': 'public, max-age=60' },
    });
    await assert.rejects(() => workflow(service.fetchImpl).connect(), /unsafe MIME or cache/);
  });
  await t.test('artifact cache', async () => {
    const service = await fakeService({ artifactCacheControl: 'public, max-age=60' });
    const client = workflow(service.fetchImpl);
    await client.connect();
    await client.generateShell();
    const state = await client.sync();
    assert.equal(state.phase, 'blocked');
    assert.match(state.blockers[0].message, /unsafe response headers/);
  });
});

test('return-to-correction performs no local geometry mutation and relocks the functional brief', async () => {
  const service = await fakeService();
  const client = workflow(service.fetchImpl);
  await client.connect();
  await client.generateShell();
  await client.sync();
  const before = service.requests.length;
  const handoff = client.returnToCorrection();
  assert.equal(service.requests.length, before);
  assert.equal(handoff.requiresNewServerRevision, true);
  assert.match(handoff.route, /^editor\.html\?mode=service/);
  assert.ok(handoff.invalidates.includes('shell_model'));
  assert.ok(handoff.invalidates.includes('payment'));
  assert.equal(client.snapshot().phase, 'return_to_correction');
  assert.equal(client.snapshot().actions.functionalFurnitureBrief, false);
});

test('functional brief is closed to style/material fields and locked before shell approval', async () => {
  const service = await fakeService();
  const client = workflow(service.fetchImpl);
  await client.connect();
  await assert.rejects(() => client.saveFunctionalBrief(functionalInput()), /locked/);

  const bad = { ...functionalInput(), preferredStyle: 'scandinavian' };
  assert.throws(() => functionalFurnitureBriefRequest(
    bad,
    { shellModelVersion: 3, shellModelSha256: '1'.repeat(64) },
    ['room-bedroom'],
  ), /design-bearing/);
  assert.throws(() => functionalFurnitureBriefRequest(
    { ...functionalInput(), workFromHome: 'yes' },
    { shellModelVersion: 3, shellModelSha256: '1'.repeat(64) },
    ['room-bedroom'],
  ), /explicit boolean/);
});

test('pure evidence validators reject stale versions, unknown camera contract and unhosted topology', async () => {
  const fixture = await shellFixture();
  const service = await fakeService({ fixture });
  const client = workflow(service.fetchImpl);
  await client.connect();
  await client.generateShell();
  const state = await client.sync();
  assert.equal(validateShellVisualQuality(
    {
      ...state.shell,
      projectId: PROJECT_ID,
      geometrySha256: '1'.repeat(64),
      shellSchema: 'spatialforge-shell-model/2',
      compilerVersion: 'spatialforge-bare-shell-compiler/2',
      reviewLightingContract: 'spatialforge-neutral-shell-review-lighting/2',
      reviewLightingParameters: {
        profile: 'preview', exposureEv: -1, roomAreaLightEnergyWatts: 420,
        keyAreaLightEnergyWatts: 1080, sunEnergy: 1.35, worldStrength: 0.26,
      },
      reviewExposureEv: -1,
      renderProfile: 'preview',
      cameraContract: 'room-rendered-solid-clearance-opening-coverage/3',
      referenceViewContract: 'canonical-room-and-hosted-opening-reference-coverage/2',
      reviewImageQualityContract: 'spatialforge-neutral-shell-png-quality/1',
    },
    state.release,
  ).status, 'passed');
  assert.throws(() => validateShellVisualQuality({
    ...state.shell,
    shellSchema: 'spatialforge-shell-model/2',
    compilerVersion: 'spatialforge-bare-shell-compiler/2',
    reviewLightingContract: 'spatialforge-neutral-shell-review-lighting/2',
    reviewLightingParameters: {
      profile: 'preview', exposureEv: -1, roomAreaLightEnergyWatts: 420,
      keyAreaLightEnergyWatts: 1080, sunEnergy: 1.35, worldStrength: 0.26,
    },
    reviewExposureEv: -1,
    renderProfile: 'preview',
    cameraContract: 'room-rendered-solid-clearance-opening-coverage/2',
    referenceViewContract: 'canonical-room-and-hosted-opening-reference-coverage/2',
    reviewImageQualityContract: 'spatialforge-neutral-shell-png-quality/1',
  }, state.release), /pinned release/);
  assert.equal(typeof validateShellStructuralEvidence, 'function');
});
