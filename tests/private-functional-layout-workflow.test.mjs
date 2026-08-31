import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CURRENT_APPROVED_FUNCTIONAL_LAYOUT_SCHEMA,
  PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA,
  PRIVATE_FUNCTIONAL_LAYOUT_REVIEW_SCHEMA,
  PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED,
  PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
  PrivateFunctionalLayoutWorkflow,
  validateApprovedFunctionalLayoutRecovery,
  validateFunctionalLayoutOptionSet,
} from '../private-functional-layout-workflow.js';
import {
  privateFunctionalLayoutViewModel,
} from '../private-functional-layout-view.js';
import {
  canonicalShellJson,
  sha256Hex,
} from '../journey-shell-review.js';
import {
  PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
  validatePrivateShellRelease,
} from '../journey-shell-customer-workflow.js';
import { registrationIntegritySha256 } from '../journey-source-registration.js';

const PROJECT_ID = 'private-layout-project-01';
const RELEASE = 'a'.repeat(40);
const hashes = Object.freeze({
  upload: 'a'.repeat(64),
  registration: null,
  geometry: 'b'.repeat(64),
  geometry2d: 'c'.repeat(64),
  vertical: 'd'.repeat(64),
  topology: 'e'.repeat(64),
  shell: 'f'.repeat(64),
  shellApproval: '1'.repeat(64),
  brief: '2'.repeat(64),
  assetLibrary: '3'.repeat(64),
  sourceGeometry: '4'.repeat(64),
  optionSet: '5'.repeat(64),
});

const releaseContracts = Object.freeze({
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
});

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
    contracts: { ...releaseContracts },
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

function authority(registrationSha256) {
  return Object.freeze({
    projectId: PROJECT_ID,
    releaseId: RELEASE,
    sourceArtifactSha256: hashes.upload,
    sourceRegistrationSha256: registrationSha256,
    geometryVersion: 2,
    geometrySha256: hashes.geometry,
    wholeUnitTopologySha256: hashes.topology,
    shellModelVersion: 1,
    shellModelSha256: hashes.shell,
    shellModelApprovalVersion: 1,
    shellModelApprovalSha256: hashes.shellApproval,
    furnitureBriefVersion: 1,
    furnitureBriefSha256: hashes.brief,
    roomIds: Object.freeze(['room-living', 'room-bedroom']),
    roomNames: Object.freeze({
      'room-living': 'Living room',
      'room-bedroom': 'Bedroom',
    }),
  });
}

function placement(index, roomId, assetId, x) {
  return {
    placementId: `pl-${index}-${roomId}`,
    assetId,
    roomId,
    x,
    y: 800,
    z: 0,
    rotationDegrees: 0,
    width: 1200,
    depth: 600,
    height: 800,
    clearance: 600,
    operationalClearanceMm: { left: 100, right: 100, back: 50, front: 600 },
    useSides: ['front'],
    useZonePolicy: 'all_groups_any_side',
    useSideGroups: [['front']],
    representation: 'measured-procedural-test-proxy/1',
  };
}

async function layoutPayload(boundary) {
  const sourceReferences = {
    workflowContract: 'bare_shell_first/1',
    sourceArtifactSha256: boundary.sourceArtifactSha256,
    sourceRegistrationSha256: boundary.sourceRegistrationSha256,
    geometryVersion: boundary.geometryVersion,
    geometrySha256: boundary.geometrySha256,
    wholeUnitTopologySha256: boundary.wholeUnitTopologySha256,
    shellModelVersion: boundary.shellModelVersion,
    shellModelSha256: boundary.shellModelSha256,
    shellModelApprovalVersion: boundary.shellModelApprovalVersion,
    shellModelApprovalSha256: boundary.shellModelApprovalSha256,
    furnitureBriefVersion: boundary.furnitureBriefVersion,
    furnitureBriefSha256: boundary.furnitureBriefSha256,
  };
  const sourceEvidence = {
    contract: 'functional-layout-source-evidence/1',
    geometrySha256: hashes.sourceGeometry,
    assetLibraryVersion: 'measured-procedural-test/1',
    assetLibrarySha256: hashes.assetLibrary,
    roomProgrammeContract: 'whole-unit-room-programme/1',
    operationalEnvelopeContract: 'directional-operational-envelope/2',
    pairwiseClearanceContract: 'facing-side-max-clearance/1',
    physicalRoomContract: 'wall-inner-face-usable-room/1',
    circulationContract: 'primary-entrance-portal-component-semantic-route/2',
    useZoneContract: 'all-groups-any-side-use-zone/1',
    windowAccessContract: 'height-aware-window-prism-unresolved-operation/1',
    furnitureBriefSha256: hashes.brief,
    functionalInputPolicyContract: 'supported-functional-layout-inputs/1',
  };
  const types = ['practical', 'storage_optimised', 'circulation_reserve'];
  const ranks = [2, 1, 3];
  const options = [];
  for (let index = 0; index < types.length; index += 1) {
    const eligible = index !== 2;
    const option = {
      type: types[index],
      assetLibraryVersion: 'measured-procedural-test/1',
      assetLibrarySha256: hashes.assetLibrary,
      sourceEvidence: structuredClone(sourceEvidence),
      roomProgramme: [
        { roomId: 'room-living', approvalBlocked: false },
        { roomId: 'room-bedroom', approvalBlocked: false },
      ],
      placements: [
        placement(index + 1, 'room-living', 'sofa-test', 600 + index * 100),
        placement(index + 1, 'room-bedroom', 'bed-test', 4500 + index * 100),
      ],
      warnings: [],
      solver: {
        status: eligible ? 'OPTIMAL' : 'INFEASIBLE',
        randomSeed: 0,
        workers: 1,
        rooms: [
          { roomId: 'room-living', status: eligible ? 'OPTIMAL' : 'INFEASIBLE' },
          { roomId: 'room-bedroom', status: eligible ? 'OPTIMAL' : 'INFEASIBLE' },
        ],
      },
      validation: {
        feasible: eligible,
        hardConstraintViolations: eligible ? [] : [{ code: 'blocked-route' }],
        doorSwingCheck: eligible ? 'passed' : 'failed',
        circulationCheck: eligible ? 'passed' : 'failed',
        programmeCheck: eligible ? 'passed' : 'failed',
      },
      scorecard: {
        eligibleForRecommendation: eligible,
        scoreBasisPoints: eligible ? 9200 - index * 200 : 0,
        decisionSupportOnly: true,
        learnedModelUsed: false,
      },
      rank: ranks[index],
      recommended: index === 1,
    };
    const digest = await sha256Hex(new TextEncoder().encode(canonicalShellJson(option)));
    options.push({
      ...option,
      layoutSha256: digest,
      layoutId: `layout-${option.type}-${digest.slice(0, 10)}`,
    });
  }
  const orderedLayoutIds = [...options].sort((left, right) => left.rank - right.rank)
    .map((option) => option.layoutId);
  return {
    projectId: PROJECT_ID,
    optionSetVersion: 1,
    optionSetSha256: hashes.optionSet,
    sourceReferences,
    assetLibraryVersion: 'measured-procedural-test/1',
    assetLibrarySha256: hashes.assetLibrary,
    sourceEvidence,
    ranking: {
      schemaVersion: '1.2',
      engineVersion: 'measured-brief-ranking-3',
      status: 'available',
      recommendedLayoutId: options[1].layoutId,
      orderedLayoutIds,
      distinctSpatialOptionCount: 3,
      notScoredBriefFields: [],
      scoreMeaning: 'deterministic measured-geometry decision support; not detector accuracy or real-life similarity',
      assetScope: 'procedural measured envelopes only; visual assets require separate approval',
      learnedModelUsed: false,
    },
    options,
  };
}

async function geometryReview(registrationSha256) {
  const registration = {
    schema: 'hnm-source-pixel-metric-registration/1',
    sourceArtifactRole: 'original_upload',
    sourceArtifactSha256: hashes.upload,
    sourceImageSizePx: { width: 800, height: 500 },
    geometrySha256: hashes.geometry,
    pixelToMetric: { a: 10, b: 0, c: 0, d: 10, e: 0, f: 0 },
    registrationSha256,
  };
  return {
    projectId: PROJECT_ID,
    geometryVersion: 2,
    geometrySha256: hashes.geometry,
    approvalStatus: 'approved',
    validation: { valid: true, issues: [] },
    sourceReferences: {
      geometry2dApprovalVersion: 1,
      geometry2dApprovalSha256: hashes.geometry2d,
      verticalDimensionsApprovalVersion: 1,
      verticalDimensionsApprovalSha256: hashes.vertical,
      wholeUnitTopologySha256: hashes.topology,
    },
    correctionEvidenceSource: {
      role: 'original_upload', sha256: hashes.upload, mediaType: 'image/png', byteSize: 100,
      intrinsicPixels: { width: 800, height: 500 }, sourceGeometryAncestryVersions: [2],
      pixelMetricRegistration: registration,
    },
    geometry: {
      project_id: PROJECT_ID,
      revision: 2,
      units: 'mm',
      walls: [
        { id: 'south', kind: 'structural', start: { x: 0, y: 0 }, end: { x: 8000, y: 0 }, thickness: 180, height: 2800 },
        { id: 'east', kind: 'structural', start: { x: 8000, y: 0 }, end: { x: 8000, y: 5000 }, thickness: 180, height: 2800 },
        { id: 'north', kind: 'structural', start: { x: 8000, y: 5000 }, end: { x: 0, y: 5000 }, thickness: 180, height: 2800 },
        { id: 'west', kind: 'structural', start: { x: 0, y: 5000 }, end: { x: 0, y: 0 }, thickness: 180, height: 2800 },
        { id: 'divider', kind: 'partition', start: { x: 4000, y: 0 }, end: { x: 4000, y: 5000 }, thickness: 100, height: 2800 },
      ],
      openings: [
        { id: 'entry', wall_id: 'south', kind: 'door', offset: 500, width: 900, height: 2100, sill: 0, swing: 'left', reviewed_usage: 'primary_entrance' },
        { id: 'bedroom-door', wall_id: 'divider', kind: 'door', offset: 1200, width: 900, height: 2100, sill: 0, swing: 'right', reviewed_usage: 'interior_door' },
        { id: 'living-window', wall_id: 'north', kind: 'window', offset: 4500, width: 1400, height: 1200, sill: 900, swing: 'none', reviewed_usage: 'exterior_window' },
      ],
      rooms: [
        { id: 'room-living', name: 'Living room', function: 'living', boundary: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 5000 }, { x: 0, y: 5000 }] },
        { id: 'room-bedroom', name: 'Bedroom', function: 'bedroom', boundary: [{ x: 4000, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 5000 }, { x: 4000, y: 5000 }] },
      ],
    },
  };
}

function dashboard(state = 'FURNITURE_BRIEF_COMPLETE') {
  return {
    projectId: PROJECT_ID,
    workflowContract: 'bare_shell_first/1',
    state,
    geometryVersion: 2,
    approvedGeometryVersion: 2,
    shellModelVersion: 1,
    approvedShellModelVersion: 1,
    furnitureBriefVersion: 1,
    layoutVersion: state === 'LAYOUT_APPROVED' ? 1 : null,
    approvedLayoutVersion: state === 'LAYOUT_APPROVED' ? 1 : null,
    designSelectionVersion: null,
    designBriefVersion: null,
    modelVersion: null,
    approvedModelVersion: null,
    renderVersion: null,
    approvedDesignVersion: null,
  };
}

function briefResponse() {
  return {
    projectId: PROJECT_ID,
    state: 'FURNITURE_BRIEF_COMPLETE',
    furnitureBriefVersion: 1,
    furnitureBriefSha256: hashes.brief,
    sourceReferences: {
      shellModelVersion: 1,
      shellModelSha256: hashes.shell,
      geometryVersion: 2,
      geometrySha256: hashes.geometry,
      actor: { actorId: 'reviewer:shell' },
    },
    furnitureBrief: { schema: 'spatialforge-functional-furniture-brief/1' },
  };
}

function shellSnapshot(registrationSha256) {
  const release = validatePrivateShellRelease(releaseManifest(), {
    expectedReleaseId: RELEASE,
    baseUrl: 'http://127.0.0.1:8123/',
  });
  return {
    schema: PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
    enabled: true,
    phase: 'functional_brief_complete',
    projectId: PROJECT_ID,
    release,
    project: dashboard(),
    source: {
      geometryVersion: 2,
      geometrySha256: hashes.geometry,
      geometry2dApprovalVersion: 1,
      geometry2dApprovalSha256: hashes.geometry2d,
      verticalDimensionsApprovalVersion: 1,
      verticalDimensionsApprovalSha256: hashes.vertical,
      registrationSha256,
    },
    shell: {
      shellModelVersion: 1,
      shellModelSha256: hashes.shell,
      geometrySha256: hashes.geometry,
      approvalStatus: 'approved',
      verificationComplete: true,
    },
    evidence: {
      shellModelSha256: hashes.shell,
      topology: { readyForWholeUnit3d: true },
      blockers: [],
      rooms: [
        { id: 'room-living', name: 'Living room' },
        { id: 'room-bedroom', name: 'Bedroom' },
      ],
    },
    furnitureBrief: briefResponse(),
  };
}

function shellApprovalReceipt() {
  return {
    projectId: PROJECT_ID,
    state: 'SHELL_APPROVED',
    approvedShellModelVersion: 1,
    shellModelSha256: hashes.shell,
    shellModelApprovalVersion: 1,
    shellModelApprovalSha256: hashes.shellApproval,
  };
}

async function registration() {
  const payload = {
    schema: 'hnm-source-pixel-metric-registration/1',
    sourceArtifactRole: 'original_upload',
    sourceArtifactSha256: hashes.upload,
    sourceImageSizePx: { width: 800, height: 500 },
    geometrySha256: hashes.geometry,
    pixelToMetric: { a: 10, b: 0, c: 0, d: 10, e: 0, f: 0 },
  };
  return registrationIntegritySha256(payload);
}

function privateJsonResponse(url, payload, status = 200) {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
  Object.defineProperty(response, 'url', { value: url });
  return response;
}

function approvalActor(claimedActorId = 'reviewer:functional-layout') {
  const subjectSha256 = '6'.repeat(64);
  return {
    schemaVersion: '1.0',
    actorId: `project_guest:${PROJECT_ID}:${subjectSha256.slice(0, 24)}`,
    provider: 'project_guest_token',
    subjectSha256,
    roles: ['project_guest'],
    credentialTransport: 'http_only_cookie',
    identityVerified: true,
    professionalIdentityVerified: false,
    claimedActorId,
    claimAcceptedAsProfessionalIdentity: false,
  };
}

async function approvedRecoveryPayload(boundary, optionSet, overrides = {}) {
  const selected = optionSet.options.find(
    (option) => option.layoutId === optionSet.ranking.recommendedLayoutId,
  );
  const actor = structuredClone(overrides.approvalActor || approvalActor());
  const receipt = {
    schema: CURRENT_APPROVED_FUNCTIONAL_LAYOUT_SCHEMA,
    projectId: PROJECT_ID,
    workflowContract: 'bare_shell_first/1',
    state: 'LAYOUT_APPROVED',
    sourceReferences: structuredClone(optionSet.sourceReferences),
    optionSetVersion: optionSet.optionSetVersion,
    optionSetSha256: optionSet.optionSetSha256,
    selectedOption: {
      layoutId: selected.layoutId,
      layoutSha256: selected.layoutSha256,
      selectedOptionSha256: await sha256Hex(
        new TextEncoder().encode(canonicalShellJson(selected)),
      ),
    },
    approvedLayout: {
      version: 1,
      sha256: '7'.repeat(64),
      status: 'approved',
      approvedAt: '2026-08-06T09:00:00+00:00',
    },
    approvalActor: actor,
    approvalActorSha256: await sha256Hex(
      new TextEncoder().encode(canonicalShellJson(actor)),
    ),
    privateContinuationLocks: {
      designSelection: true,
      furnishedModel: true,
      deterministicRender: true,
      quotation: true,
      payment: true,
    },
    customerReleaseEligible: false,
    ...overrides.fields,
  };
  return {
    ...receipt,
    recoveryReceiptSha256: await sha256Hex(
      new TextEncoder().encode(canonicalShellJson(receipt)),
    ),
  };
}

test('functional option validator binds all twelve upstream receipts and projects metadata only', async () => {
  const registrationSha256 = await registration();
  const boundary = authority(registrationSha256);
  const payload = await layoutPayload(boundary);
  const review = await validateFunctionalLayoutOptionSet(payload, boundary);

  assert.equal(review.schema, PRIVATE_FUNCTIONAL_LAYOUT_REVIEW_SCHEMA);
  assert.equal(review.status, 'available');
  assert.equal(review.options.length, 3);
  assert.equal(review.options.find((option) => option.recommended).type, 'storage_optimised');
  assert.equal(review.options[0].placementsByRoom.length, 2);
  assert.equal(review.learnedModelUsed, false);
  assert.equal(review.customerReleaseEligible, false);
  assert.deepEqual(review.blockers.map((item) => item.code), [
    'DESIGN_SELECTION_CAPABILITY_OFF',
    'FURNISHED_MODEL_CAPABILITY_OFF',
    'AI_RENDERING_CAPABILITY_OFF',
    'REAL_HDB_ACCURACY_UNPROVEN',
  ]);
  assert.doesNotMatch(JSON.stringify(review), /https?:|sourceArtifactSha256|shellModelApprovalSha256/i);
});

test('stale receipt, changed hash identity, media fields and false recommendation fail closed', async () => {
  const registrationSha256 = await registration();
  const boundary = authority(registrationSha256);

  const stale = await layoutPayload(boundary);
  stale.sourceReferences.sourceRegistrationSha256 = '9'.repeat(64);
  await assert.rejects(() => validateFunctionalLayoutOptionSet(stale, boundary), /sourceRegistrationSha256 lost/i);

  const changed = await layoutPayload(boundary);
  changed.options[0].layoutSha256 = '7'.repeat(64);
  await assert.rejects(() => validateFunctionalLayoutOptionSet(changed, boundary), /ID is not derived/i);

  const media = await layoutPayload(boundary);
  media.options[0].sourceImageUrl = 'https://private.invalid/source.png';
  await assert.rejects(() => validateFunctionalLayoutOptionSet(media, boundary), /private media field/i);

  const unsafe = await layoutPayload(boundary);
  unsafe.options[1].validation.circulationCheck = 'failed';
  await assert.rejects(() => validateFunctionalLayoutOptionSet(unsafe, boundary), /recommendation-eligible/i);
});

test('private controller performs the real brief → options → approval route chain and stops before design', async () => {
  const registrationSha256 = await registration();
  const boundary = authority(registrationSha256);
  const layoutSet = await layoutPayload(boundary);
  const geometry = await geometryReview(registrationSha256);
  let project = dashboard();
  const trace = [];
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url);
    trace.push({ path: parsed.pathname, method: init.method, credentials: init.credentials, headers: init.headers });
    assert.equal(init.credentials, 'include');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.equal(Object.keys(init.headers).some((name) => name.toLowerCase() === 'authorization'), false);
    if (parsed.pathname === '/api/v1/private-shell-capabilities') {
      return privateJsonResponse(url, releaseManifest());
    }
    if (parsed.pathname === `/api/v1/projects/${PROJECT_ID}`) {
      return privateJsonResponse(url, project);
    }
    if (parsed.pathname === `/api/v1/projects/${PROJECT_ID}/geometry`) {
      return privateJsonResponse(url, geometry);
    }
    if (parsed.pathname === `/api/v1/projects/${PROJECT_ID}/furniture-brief`) {
      return privateJsonResponse(url, briefResponse());
    }
    if (parsed.pathname === `/api/v1/projects/${PROJECT_ID}/layouts/generate`) {
      assert.equal(init.method, 'POST');
      project = dashboard('LAYOUT_READY');
      return privateJsonResponse(url, layoutSet, 201);
    }
    if (parsed.pathname === `/api/v1/projects/${PROJECT_ID}/layouts/options`) {
      return privateJsonResponse(url, layoutSet);
    }
    if (parsed.pathname.startsWith(`/api/v1/projects/${PROJECT_ID}/layouts/`)
      && parsed.pathname.endsWith('/approve')) {
      const request = JSON.parse(init.body);
      project = dashboard('LAYOUT_APPROVED');
      return privateJsonResponse(url, {
        ...project,
        layoutSha256: '6'.repeat(64),
        actor: approvalActor(request.reviewerActorId),
      });
    }
    throw new Error(`Unexpected test route: ${parsed.pathname}`);
  };
  const client = new PrivateFunctionalLayoutWorkflow({
    baseUrl: 'http://127.0.0.1:8123',
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    shellSnapshot: shellSnapshot(registrationSha256),
    shellApprovalReceipt: shellApprovalReceipt(),
    fetchImpl,
    enabled: true,
  });

  assert.equal((await client.connect()).phase, 'ready_to_generate');
  const options = await client.generateOptions();
  assert.equal(options.phase, 'layout_review');
  assert.equal(options.actions.approveLayout, true);
  assert.equal(options.actions.designSelection, false);
  const selected = options.review.options.find((option) => option.recommended);
  const approved = await client.approveLayout({
    layoutId: selected.layoutId,
    reviewerActorId: 'reviewer:functional-layout',
    confirmFunctionalFit: true,
  });
  assert.equal(approved.phase, 'layout_approved');
  assert.equal(approved.approval.layoutId, selected.layoutId);
  assert.equal(approved.approval.claimedReviewerActorId, 'reviewer:functional-layout');
  assert.match(approved.approval.reviewerActorId, /^project_guest:/);
  assert.equal(approved.approval.recoveredAfterReload, false);
  assert.equal(approved.approval.designSelectionReleased, false);
  assert.equal(approved.designSelectionHandoff.schema, PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA);
  assert.equal(approved.designSelectionHandoff.layoutVersion, approved.approval.layoutVersion);
  assert.equal(
    approved.designSelectionHandoff.layoutApprovalActorSha256,
    approved.approval.approvalActorSha256,
  );
  assert.equal(approved.designSelectionHandoff.customerReleaseEligible, false);
  assert.deepEqual(approved.downstreamLocks, {
    designSelection: true,
    furnishedModel: true,
    deterministicRender: true,
    quotation: true,
    payment: true,
  });
  assert.deepEqual(trace.filter((item) => item.method === 'POST').map((item) => item.path), [
    `/api/v1/projects/${PROJECT_ID}/layouts/generate`,
    `/api/v1/projects/${PROJECT_ID}/layouts/${selected.layoutId}/approve`,
  ]);
  assert.equal(trace.some((item) => /design-selection|model|renders/.test(item.path)), false);
});

test('controller is default-off and reload recovers the exact approved layout without downstream actions', async () => {
  const registrationSha256 = await registration();
  let fetches = 0;
  const disabled = new PrivateFunctionalLayoutWorkflow({
    baseUrl: 'http://127.0.0.1:8123',
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    shellSnapshot: shellSnapshot(registrationSha256),
    shellApprovalReceipt: shellApprovalReceipt(),
    fetchImpl: async () => { fetches += 1; },
  });
  assert.equal(PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED, false);
  await assert.rejects(() => disabled.connect(), /disabled/i);
  assert.equal(fetches, 0);

  const geometry = await geometryReview(registrationSha256);
  const boundary = authority(registrationSha256);
  const layoutSet = await layoutPayload(boundary);
  const recovery = await approvedRecoveryPayload(boundary, layoutSet);
  const trace = [];
  const fetchImpl = async (url) => {
    const path = new URL(url).pathname;
    trace.push(path);
    const payload = ({
      '/api/v1/private-shell-capabilities': releaseManifest(),
      [`/api/v1/projects/${PROJECT_ID}`]: dashboard('LAYOUT_APPROVED'),
      [`/api/v1/projects/${PROJECT_ID}/geometry`]: geometry,
      [`/api/v1/projects/${PROJECT_ID}/furniture-brief`]: briefResponse(),
      [`/api/v1/projects/${PROJECT_ID}/layouts/options`]: layoutSet,
      [`/api/v1/projects/${PROJECT_ID}/layouts/approved`]: recovery,
    })[path];
    if (!payload) throw new Error(`Unexpected route ${path}`);
    return privateJsonResponse(url, payload);
  };
  const reloaded = new PrivateFunctionalLayoutWorkflow({
    baseUrl: 'http://127.0.0.1:8123',
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    shellSnapshot: shellSnapshot(registrationSha256),
    shellApprovalReceipt: shellApprovalReceipt(),
    fetchImpl,
    enabled: true,
  });
  const result = await reloaded.connect();
  assert.equal(result.phase, 'layout_approved');
  assert.equal(result.approval.layoutId, layoutSet.ranking.recommendedLayoutId);
  assert.equal(result.approval.recoveredAfterReload, true);
  assert.equal(result.approval.recoveryReceiptSha256, recovery.recoveryReceiptSha256);
  assert.equal(result.designSelectionHandoff.schema, PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA);
  assert.equal(
    result.designSelectionHandoff.recoveryReceiptSha256,
    recovery.recoveryReceiptSha256,
  );
  assert.equal(result.actions.approveLayout, false);
  assert.equal(result.actions.designSelection, false);
  assert.deepEqual(result.downstreamLocks, {
    designSelection: true,
    furnishedModel: true,
    deterministicRender: true,
    quotation: true,
    payment: true,
  });
  assert.equal(trace.includes(`/api/v1/projects/${PROJECT_ID}/layouts/options`), true);
  assert.equal(trace.includes(`/api/v1/projects/${PROJECT_ID}/layouts/approved`), true);
  assert.equal(trace.some((path) => /design-selection|model|renders/.test(path)), false);
  const recoveredView = privateFunctionalLayoutViewModel(result);
  assert.deepEqual(recoveredView.steps.slice(2).map((item) => item.state), [
    'approved', 'locked', 'locked', 'locked',
  ]);
  assert.equal(recoveredView.canApprove, false);
});

test('approved-layout recovery rejects tampered hashes, stale pointers, media and unlocked stages', async () => {
  const registrationSha256 = await registration();
  const boundary = authority(registrationSha256);
  const optionSet = await layoutPayload(boundary);
  const review = await validateFunctionalLayoutOptionSet(optionSet, boundary);
  const project = dashboard('LAYOUT_APPROVED');
  const valid = await approvedRecoveryPayload(boundary, optionSet);
  const receipt = await validateApprovedFunctionalLayoutRecovery(
    valid,
    boundary,
    optionSet,
    review,
    project,
  );
  assert.equal(receipt.recoveredAfterReload, true);
  assert.equal(receipt.designSelectionReleased, false);

  const badActorHash = await approvedRecoveryPayload(boundary, optionSet, {
    fields: { approvalActorSha256: '8'.repeat(64) },
  });
  await assert.rejects(
    () => validateApprovedFunctionalLayoutRecovery(
      badActorHash, boundary, optionSet, review, project,
    ),
    /approval actor hash lost/i,
  );

  const unlocked = await approvedRecoveryPayload(boundary, optionSet, {
    fields: {
      privateContinuationLocks: {
        designSelection: false,
        furnishedModel: true,
        deterministicRender: true,
        quotation: true,
        payment: true,
      },
    },
  });
  await assert.rejects(
    () => validateApprovedFunctionalLayoutRecovery(
      unlocked, boundary, optionSet, review, project,
    ),
    /unlocked a downstream stage/i,
  );

  const staleProject = { ...project, approvedLayoutVersion: 2 };
  await assert.rejects(
    () => validateApprovedFunctionalLayoutRecovery(
      valid, boundary, optionSet, review, staleProject,
    ),
    /does not point/i,
  );

  const media = await approvedRecoveryPayload(boundary, optionSet, {
    fields: { privateArtifactUrl: 'https://private.invalid/layout.glb' },
  });
  await assert.rejects(
    () => validateApprovedFunctionalLayoutRecovery(
      media, boundary, optionSet, review, project,
    ),
    /private media (?:field|locator)/i,
  );

  const corruptReceipt = structuredClone(valid);
  corruptReceipt.recoveryReceiptSha256 = '9'.repeat(64);
  await assert.rejects(
    () => validateApprovedFunctionalLayoutRecovery(
      corruptReceipt, boundary, optionSet, review, project,
    ),
    /recovery receipt lost/i,
  );
});

test('view model exposes the six-stage seam without media or a fidelity claim', async () => {
  const registrationSha256 = await registration();
  const boundary = authority(registrationSha256);
  const review = await validateFunctionalLayoutOptionSet(await layoutPayload(boundary), boundary);
  const snapshot = {
    schema: PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
    enabled: true,
    phase: 'layout_review',
    projectId: PROJECT_ID,
    authority: {
      sourceRegistrationSha256: registrationSha256,
      geometryVersion: 2,
      geometrySha256: hashes.geometry,
      shellModelVersion: 1,
      shellModelSha256: hashes.shell,
      furnitureBriefVersion: 1,
      furnitureBriefSha256: hashes.brief,
    },
    review,
    approval: null,
    blockers: [],
    actions: {
      generateOptions: false, recoverOptions: false, approveLayout: true,
      designSelection: false, furnishedModel: false, deterministicRender: false,
    },
    truth: {
      sourcePixelsRendered: false,
      privateArtifactBytesRendered: false,
      learnedRankingUsed: false,
      detectorAccuracyClaim: false,
      asBuiltAccuracyClaim: false,
      customerReleaseEligible: false,
    },
  };
  const view = privateFunctionalLayoutViewModel(snapshot);
  assert.deepEqual(view.steps.map((item) => item.id), [
    'source', 'shell', 'furniture', 'design', 'model', 'render',
  ]);
  assert.deepEqual(view.steps.map((item) => item.state), [
    'verified', 'verified', 'review', 'locked', 'locked', 'locked',
  ]);
  assert.equal(view.options.length, 3);
  assert.equal(view.customerReleaseEligible, false);
  assert.doesNotMatch(JSON.stringify(view), /https?:|95\s*[–-]\s*99|as-built accuracy/i);
});

test('new private continuation is excluded from public Pages and all customer flags stay off', async () => {
  const [workflow, view, stylesheet, fixture, allowlist, page, config] = await Promise.all([
    readFile(new URL('../private-functional-layout-workflow.js', import.meta.url), 'utf8'),
    readFile(new URL('../private-functional-layout-view.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/private-functional-layout.css', import.meta.url), 'utf8'),
    readFile(new URL('private-functional-layout-workflow.browser.html', import.meta.url), 'utf8'),
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../config.js', import.meta.url), 'utf8'),
  ]);
  const entries = new Set(allowlist.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  for (const path of [
    'private-functional-layout-workflow.js',
    'private-functional-layout-view.js',
    'assets/css/private-functional-layout.css',
    'tests/private-functional-layout-workflow.browser.html',
  ]) assert.equal(entries.has(path), false, path);
  assert.doesNotMatch(page, /private-functional-layout/i);
  assert.match(workflow, /PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED = false/);
  assert.doesNotMatch(view, /innerHTML|createObjectURL|\.src\s*=/i);
  assert.match(stylesheet, /:focus-visible/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.match(fixture, /noindex,nofollow,noarchive/i);
  for (const flag of [
    'AI_ANALYSIS_ENABLED', 'GEOMETRY_REVIEW_ENABLED', 'LIVE_3D_ENABLED',
    'AI_RENDERING_ENABLED', 'QUOTATION_ENABLED', 'PAYMENTS_ENABLED',
    'DEMO_FALLBACK_ENABLED',
  ]) assert.match(config, new RegExp(`${flag}:\\s*false`), flag);
});

export { layoutPayload as privateFunctionalLayoutPayloadFixture };
