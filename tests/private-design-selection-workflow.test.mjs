import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA,
  PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
} from '../private-functional-layout-workflow.js';
import {
  PRIVATE_DESIGN_SELECTION_RECEIPT_SCHEMA,
  PRIVATE_DESIGN_SELECTION_WORKFLOW_ENABLED,
  PRIVATE_DESIGN_SELECTION_WORKFLOW_SCHEMA,
  PrivateDesignSelectionWorkflow,
  canonicalPrivateDesignSha256,
  validatePrivateDesignReferenceCatalog,
  validatePrivateDesignSelectionHandoff,
  validatePrivateDesignSelectionRelease,
} from '../private-design-selection-workflow.js';
import {
  canonicalShellJson,
  sha256Hex,
} from '../journey-shell-review.js';

const PROJECT_ID = 'private-design-project-01';
const RELEASE = 'd'.repeat(40);
const BASE_URL = 'http://127.0.0.1:8124';
const hashes = Object.freeze({
  upload: 'a'.repeat(64),
  registration: 'b'.repeat(64),
  geometry: 'c'.repeat(64),
  topology: 'd'.repeat(64),
  shell: 'e'.repeat(64),
  shellApproval: 'f'.repeat(64),
  shellManifest: '1'.repeat(64),
  brief: '2'.repeat(64),
  assetLibrary: '3'.repeat(64),
  sourceGeometry: '4'.repeat(64),
  optionSet: '5'.repeat(64),
  layout: '6'.repeat(64),
});

const sourceReferences = Object.freeze({
  workflowContract: 'bare_shell_first/1',
  sourceArtifactSha256: hashes.upload,
  sourceRegistrationSha256: hashes.registration,
  geometryVersion: 2,
  geometrySha256: hashes.geometry,
  wholeUnitTopologySha256: hashes.topology,
  shellModelVersion: 1,
  shellModelSha256: hashes.shell,
  shellModelApprovalVersion: 1,
  shellModelApprovalSha256: hashes.shellApproval,
  furnitureBriefVersion: 1,
  furnitureBriefSha256: hashes.brief,
});

function releaseManifest(overrides = {}) {
  return {
    schema: 'homeandme-private-design-selection-capabilities/1',
    releaseId: RELEASE,
    runtimeEnvironment: 'test',
    serviceReady: true,
    scope: 'private-service-only',
    contracts: {
      projectApi: 'homeandme-project-api/2',
      workflow: 'bare_shell_first/1',
      approvedLayoutRecovery: 'spatialforge-current-approved-functional-layout/1',
      functionalLayoutEvidence: 'functional-layout-source-evidence/1',
      designReferenceCatalog: 'spatialforge-design-reference-catalog/1',
      designReference: 'spatialforge-design-reference/1',
      designSelection: 'spatialforge-design-selection/1',
      designSelectionSources: 'bare-shell-design-selection-sources/1',
      privacy: 'same-origin-private-no-store/1',
    },
    capabilities: {
      APPROVED_FUNCTIONAL_LAYOUT_RECOVERY: true,
      DESIGN_SELECTION: true,
      FURNISHED_MODEL: false,
      AI_RENDERING: false,
      QUOTATION: false,
      PAYMENTS: false,
    },
    dependencyOrder: [
      'APPROVED_FUNCTIONAL_LAYOUT_RECOVERY', 'DESIGN_SELECTION', 'FURNISHED_MODEL',
      'AI_RENDERING', 'QUOTATION', 'PAYMENTS',
    ],
    safeguards: {
      demoFallbackEnabled: false,
      publicJourneyWiringEnabled: false,
      furnishedModelEnabled: false,
      renderingEnabled: false,
      commerceEnabled: false,
    },
    ...overrides,
  };
}

function actor(claimedActorId) {
  const subjectSha256 = '7'.repeat(64);
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

async function layoutOptions() {
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
    const sha = await sha256Hex(new TextEncoder().encode(canonicalShellJson(option)));
    options.push({
      ...option,
      layoutSha256: sha,
      layoutId: `layout-${option.type}-${sha.slice(0, 10)}`,
    });
  }
  return {
    projectId: PROJECT_ID,
    optionSetVersion: 1,
    optionSetSha256: hashes.optionSet,
    sourceReferences: structuredClone(sourceReferences),
    assetLibraryVersion: 'measured-procedural-test/1',
    assetLibrarySha256: hashes.assetLibrary,
    sourceEvidence,
    ranking: {
      schemaVersion: '1.2',
      engineVersion: 'measured-brief-ranking-3',
      status: 'available',
      recommendedLayoutId: options[1].layoutId,
      orderedLayoutIds: [...options].sort((left, right) => left.rank - right.rank)
        .map((option) => option.layoutId),
      distinctSpatialOptionCount: 3,
      notScoredBriefFields: [],
      scoreMeaning: 'deterministic measured-geometry decision support; not detector accuracy or real-life similarity',
      assetScope: 'procedural measured envelopes only; visual assets require separate approval',
      learnedModelUsed: false,
    },
    options,
  };
}

async function approvedRecovery(options, fields = {}) {
  const selected = options.options[1];
  const layoutActor = actor('reviewer:functional-layout');
  const body = {
    schema: 'spatialforge-current-approved-functional-layout/1',
    projectId: PROJECT_ID,
    workflowContract: 'bare_shell_first/1',
    state: 'LAYOUT_APPROVED',
    sourceReferences: structuredClone(sourceReferences),
    optionSetVersion: 1,
    optionSetSha256: hashes.optionSet,
    selectedOption: {
      layoutId: selected.layoutId,
      layoutSha256: selected.layoutSha256,
      selectedOptionSha256: await sha256Hex(
        new TextEncoder().encode(canonicalShellJson(selected)),
      ),
    },
    approvedLayout: {
      version: 1,
      sha256: hashes.layout,
      status: 'approved',
      approvedAt: '2026-08-06T09:00:00+00:00',
    },
    approvalActor: layoutActor,
    approvalActorSha256: await sha256Hex(
      new TextEncoder().encode(canonicalShellJson(layoutActor)),
    ),
    privateContinuationLocks: {
      designSelection: true,
      furnishedModel: true,
      deterministicRender: true,
      quotation: true,
      payment: true,
    },
    customerReleaseEligible: false,
    ...fields,
  };
  return {
    ...body,
    recoveryReceiptSha256: await sha256Hex(
      new TextEncoder().encode(canonicalShellJson(body)),
    ),
  };
}

async function layoutSnapshot(options, recovery) {
  const selected = options.options[1];
  const approval = {
    schema: 'homeandme-private-functional-layout-approval/2',
    projectId: PROJECT_ID,
    optionSetVersion: 1,
    optionSetSha256: hashes.optionSet,
    layoutId: selected.layoutId,
    selectedLayoutSha256: selected.layoutSha256,
    selectedOptionSha256: recovery.selectedOption.selectedOptionSha256,
    layoutVersion: 1,
    layoutSha256: hashes.layout,
    reviewerActorId: recovery.approvalActor.actorId,
    claimedReviewerActorId: recovery.approvalActor.claimedActorId,
    approvalActor: structuredClone(recovery.approvalActor),
    approvalActorSha256: recovery.approvalActorSha256,
    recoveryReceiptSha256: recovery.recoveryReceiptSha256,
    recoveredAfterReload: true,
    designSelectionReleased: false,
    furnishedModelReleased: false,
    deterministicRenderReleased: false,
  };
  const review = {
    optionSetVersion: 1,
    optionSetSha256: hashes.optionSet,
    assetLibraryVersion: options.assetLibraryVersion,
    assetLibrarySha256: hashes.assetLibrary,
  };
  return {
    schema: PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
    enabled: true,
    phase: 'layout_approved',
    projectId: PROJECT_ID,
    releaseId: RELEASE,
    review,
    approval,
    designSelectionHandoff: {
      schema: PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA,
      projectId: PROJECT_ID,
      releaseId: RELEASE,
      sourceReferences: structuredClone(sourceReferences),
      roomIds: ['room-living', 'room-bedroom'],
      roomNames: { 'room-living': 'Living room', 'room-bedroom': 'Bedroom' },
      optionSetVersion: 1,
      optionSetSha256: hashes.optionSet,
      assetLibraryVersion: options.assetLibraryVersion,
      assetLibrarySha256: hashes.assetLibrary,
      layoutId: selected.layoutId,
      selectedLayoutSha256: selected.layoutSha256,
      selectedOptionSha256: recovery.selectedOption.selectedOptionSha256,
      layoutVersion: 1,
      layoutSha256: hashes.layout,
      layoutApprovalActor: structuredClone(recovery.approvalActor),
      layoutApprovalActorSha256: recovery.approvalActorSha256,
      recoveryReceiptSha256: recovery.recoveryReceiptSha256,
      customerReleaseEligible: false,
    },
    actions: {
      generateOptions: false,
      recoverOptions: false,
      approveLayout: false,
      designSelection: false,
      furnishedModel: false,
      deterministicRender: false,
    },
    downstreamLocks: {
      designSelection: true,
      furnishedModel: true,
      deterministicRender: true,
      quotation: true,
      payment: true,
    },
    truth: {
      sourcePixelsRendered: false,
      privateArtifactBytesRendered: false,
      customerReleaseEligible: false,
    },
  };
}

async function materialReference() {
  const material = (name, colour) => ({
    name,
    sourceType: 'procedural',
    baseColorSrgb: colour,
    roughness: 0.5,
    patternScaleMm: 120,
    reliefMm: 1,
    externalTextureArtifact: null,
  });
  const body = {
    schema: 'spatialforge-design-reference/1',
    referenceId: 'hnm-private-calm-v1',
    referenceVersion: 1,
    label: 'Private Calm',
    styleKey: 'private_calm',
    styleAliases: ['private_calm', 'calm'],
    preview: null,
    provenance: {
      origin: 'spatialforge-code-authored-procedural-materials',
      thirdPartyMediaConsumed: false,
      externalSourceUris: [],
      rightsBasis: 'original-procedural-definition',
      commercialUseAllowed: true,
      derivativeUseAllowed: true,
      renderPublicationAllowed: true,
      rawAssetRedistributionRequired: false,
      evidenceContract: 'no-external-binary-assets/1',
    },
    dimensions: {
      units: 'mm',
      meaning: 'physical procedural pattern repeat and maximum relief',
    },
    materials: {
      wall: material('Wall', [230, 230, 225]),
      floor: material('Floor', [150, 110, 70]),
      wood: material('Wood', [125, 85, 55]),
      stone: material('Stone', [210, 205, 195]),
      fabric: material('Fabric', [95, 110, 90]),
      linen: material('Linen', [205, 190, 165]),
      rug: material('Rug', [170, 145, 115]),
      ceramic: material('Ceramic', [240, 240, 235]),
      opening_frame: material('Opening frame', [115, 120, 118]),
    },
  };
  return {
    ...body,
    referenceSha256: await canonicalPrivateDesignSha256(body),
  };
}

async function designCatalog() {
  const reference = await materialReference();
  const body = {
    schema: 'spatialforge-design-reference-catalog/1',
    catalogVersion: 'procedural-test-1',
    references: [reference],
  };
  return {
    ...body,
    catalogSha256: await canonicalPrivateDesignSha256(body),
  };
}

function dashboard(state = 'LAYOUT_APPROVED', designSelectionVersion = null) {
  return {
    projectId: PROJECT_ID,
    propertyType: 'hdb',
    postalCode: null,
    levels: 1,
    state,
    proposalVersion: 1,
    calibrationVersion: 1,
    measuredProposalVersion: 1,
    geometryVersion: 2,
    approvedGeometryVersion: 2,
    workflowContract: 'bare_shell_first/1',
    shellModelVersion: 1,
    approvedShellModelVersion: 1,
    furnitureBriefVersion: 1,
    designSelectionVersion,
    designBriefVersion: null,
    layoutVersion: 1,
    approvedLayoutVersion: 1,
    modelVersion: null,
    approvedModelVersion: null,
    renderVersion: null,
    approvedDesignVersion: null,
    paymentStatus: 'none',
    createdAt: '2026-08-06T08:00:00+00:00',
    updatedAt: '2026-08-06T09:00:00+00:00',
    quote: null,
    receipt: null,
  };
}

async function selectionResponses(options, recovery, catalog) {
  const reference = catalog.references[0];
  const selectionActor = actor(null);
  const selectionSources = {
    contract: 'bare-shell-design-selection-sources/1',
    ...structuredClone(sourceReferences),
    shellArtifactManifestSha256: hashes.shellManifest,
    layoutOptionSetVersion: 1,
    layoutOptionSetSha256: hashes.optionSet,
    assetLibraryVersion: options.assetLibraryVersion,
    assetLibrarySha256: hashes.assetLibrary,
    selectedOptionSha256: recovery.selectedOption.selectedOptionSha256,
    layoutVersion: 1,
    layoutSha256: hashes.layout,
    layoutApprovalActor: structuredClone(recovery.approvalActor),
    designReferenceId: reference.referenceId,
    designReferenceSha256: reference.referenceSha256,
    actor: selectionActor,
  };
  const selection = {
    schema: 'spatialforge-design-selection/1',
    workflowContract: 'bare_shell_first/1',
    layoutVersion: 1,
    layoutSha256: hashes.layout,
    designReferenceId: reference.referenceId,
    designReferenceSha256: reference.referenceSha256,
    designReference: structuredClone(reference),
    confirmDesignReferenceRights: true,
    externalReferenceImagesConsumed: [],
    actor: selectionActor,
  };
  const designSelectionSha256 = await canonicalPrivateDesignSha256(selection);
  const common = {
    designSelectionVersion: 1,
    designSelectionSha256,
    sourceReferences: selectionSources,
    designSelection: selection,
    designReference: structuredClone(reference),
  };
  return {
    post: { ...dashboard('DESIGN_SELECTION_COMPLETE', 1), ...structuredClone(common) },
    get: {
      projectId: PROJECT_ID,
      state: 'DESIGN_SELECTION_COMPLETE',
      ...structuredClone(common),
    },
  };
}

function jsonResponse(url, payload, status = 200) {
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

async function fixture() {
  const options = await layoutOptions();
  const recovery = await approvedRecovery(options);
  const snapshot = await layoutSnapshot(options, recovery);
  const catalog = await designCatalog();
  const selections = await selectionResponses(options, recovery, catalog);
  return { options, recovery, snapshot, catalog, selections };
}

function service({ options, recovery, catalog, selections }, {
  initialState = 'LAYOUT_APPROVED',
  mutate = null,
} = {}) {
  let state = initialState;
  const trace = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    trace.push({ path, method: init.method, body: init.body, headers: init.headers });
    assert.equal(init.credentials, 'include');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.equal(Object.keys(init.headers).some((name) => name.toLowerCase() === 'authorization'), false);
    let payload;
    let status = 200;
    if (path === '/api/v1/private-design-selection-capabilities') payload = releaseManifest();
    else if (path === `/api/v1/projects/${PROJECT_ID}`) {
      payload = state === 'LAYOUT_APPROVED'
        ? dashboard()
        : dashboard('DESIGN_SELECTION_COMPLETE', 1);
    } else if (path === `/api/v1/projects/${PROJECT_ID}/layouts/options`) payload = options;
    else if (path === `/api/v1/projects/${PROJECT_ID}/layouts/approved`) payload = recovery;
    else if (path === '/api/v1/design-references') payload = catalog;
    else if (path === `/api/v1/projects/${PROJECT_ID}/design-selection`
      && init.method === 'POST') {
      const command = JSON.parse(init.body);
      assert.deepEqual(Object.keys(command).sort(), [
        'confirmDesignReferenceRights', 'designReferenceId', 'designReferenceSha256',
        'layoutSha256', 'layoutVersion',
      ]);
      state = 'DESIGN_SELECTION_COMPLETE';
      payload = selections.post;
      status = 201;
    } else if (path === `/api/v1/projects/${PROJECT_ID}/design-selection`) {
      payload = selections.get;
    } else throw new Error(`Unexpected private test route: ${path}`);
    if (mutate) payload = mutate({ path, method: init.method, payload: structuredClone(payload) });
    return jsonResponse(url, payload, status);
  };
  return { fetchImpl, trace, state: () => state };
}

test('release, layout handoff and procedural catalog validate exact hashes and privacy', async () => {
  const data = await fixture();
  const release = validatePrivateDesignSelectionRelease(releaseManifest(), {
    expectedReleaseId: RELEASE,
    baseUrl: `${BASE_URL}/`,
  });
  const handoff = await validatePrivateDesignSelectionHandoff(data.snapshot, {
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
  });
  const catalog = await validatePrivateDesignReferenceCatalog(data.catalog);

  assert.equal(release.capabilities.DESIGN_SELECTION, true);
  assert.equal(release.capabilities.FURNISHED_MODEL, false);
  assert.equal(handoff.handoff.layoutVersion, 1);
  assert.equal(catalog.references[0].preview, null);
  assert.doesNotMatch(JSON.stringify({ handoff, catalog }), /https?:\/\/|blob:|data:image|\/home\//i);
});

test('controller performs approved-layout preflight, POST, authenticated GET and stops', async () => {
  const data = await fixture();
  const fake = service(data);
  const workflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: data.snapshot,
    fetchImpl: fake.fetchImpl,
    enabled: true,
  });

  const ready = await workflow.connect();
  assert.equal(ready.schema, PRIVATE_DESIGN_SELECTION_WORKFLOW_SCHEMA);
  assert.equal(ready.phase, 'ready_to_select');
  assert.equal(ready.actions.selectDesignReference, true);
  const reference = ready.catalog.references[0];
  const completed = await workflow.selectReference({
    designReferenceId: reference.designReferenceId,
    designReferenceSha256: reference.designReferenceSha256,
    confirmDesignReferenceRights: true,
  });

  assert.equal(completed.phase, 'selection_complete');
  assert.equal(completed.selection.schema, PRIVATE_DESIGN_SELECTION_RECEIPT_SCHEMA);
  assert.equal(completed.selection.designReferenceId, reference.designReferenceId);
  assert.equal(completed.selection.recoveredAfterReload, false);
  assert.equal(completed.actions.selectDesignReference, false);
  assert.deepEqual(completed.downstreamLocks, {
    furnishedModel: true,
    deterministicRender: true,
    quotation: true,
    payment: true,
  });
  const writes = fake.trace.filter((entry) => entry.method !== 'GET');
  assert.deepEqual(writes.map((entry) => [entry.method, entry.path]), [
    ['POST', `/api/v1/projects/${PROJECT_ID}/design-selection`],
  ]);
  assert.equal(fake.trace.filter((entry) => (
    entry.path === `/api/v1/projects/${PROJECT_ID}/design-selection`
    && entry.method === 'GET'
  )).length, 1);
  assert.equal(fake.trace.some((entry) => /model|renders|quote|payment/.test(entry.path)), false);
});

test('new controller recovers authenticated selection when the exact layout handoff is rehydrated', async () => {
  const data = await fixture();
  const fake = service(data, { initialState: 'DESIGN_SELECTION_COMPLETE' });
  const workflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: data.snapshot,
    fetchImpl: fake.fetchImpl,
    enabled: true,
  });

  const recovered = await workflow.connect();

  assert.equal(recovered.phase, 'selection_complete');
  assert.equal(recovered.selection.recoveredAfterReload, true);
  assert.equal(fake.trace.some((entry) => entry.path.endsWith('/layouts/approved')), false);
  assert.equal(fake.trace.some((entry) => entry.path.endsWith('/design-selection')), true);
  assert.equal(fake.trace.some((entry) => /model|renders|quote|payment/.test(entry.path)), false);
});

test('default-off, wrong release/origin, unconfirmed rights and extra fields fail closed', async () => {
  const data = await fixture();
  let calls = 0;
  const disabled = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: data.snapshot,
    fetchImpl: async () => { calls += 1; },
  });
  assert.equal(PRIVATE_DESIGN_SELECTION_WORKFLOW_ENABLED, false);
  await assert.rejects(() => disabled.connect(), /disabled/i);
  assert.equal(calls, 0);
  assert.throws(() => validatePrivateDesignSelectionRelease(releaseManifest(), {
    expectedReleaseId: 'a'.repeat(40),
    baseUrl: `${BASE_URL}/`,
  }), /release identity/i);
  assert.throws(() => validatePrivateDesignSelectionRelease(releaseManifest(), {
    expectedReleaseId: RELEASE,
    baseUrl: 'http://private.example/',
  }), /HTTPS or an exact loopback/i);
  let unsafeOriginCalls = 0;
  const unsafeOrigin = new PrivateDesignSelectionWorkflow({
    baseUrl: 'http://private.example',
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: data.snapshot,
    fetchImpl: async () => { unsafeOriginCalls += 1; },
    enabled: true,
  });
  await assert.rejects(() => unsafeOrigin.connect(), /HTTPS or an exact loopback/i);
  assert.equal(unsafeOriginCalls, 0);

  const fake = service(data);
  const workflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: data.snapshot,
    fetchImpl: fake.fetchImpl,
    enabled: true,
  });
  const ready = await workflow.connect();
  const reference = ready.catalog.references[0];
  await assert.rejects(() => workflow.selectReference({
    designReferenceId: reference.designReferenceId,
    designReferenceSha256: '9'.repeat(64),
    confirmDesignReferenceRights: true,
  }), /absent or stale/i);
  await assert.rejects(() => workflow.selectReference({
    designReferenceId: reference.designReferenceId,
    designReferenceSha256: reference.designReferenceSha256,
    confirmDesignReferenceRights: false,
  }), /explicitly confirmed/i);
  await assert.rejects(() => workflow.selectReference({
    designReferenceId: reference.designReferenceId,
    designReferenceSha256: reference.designReferenceSha256,
    confirmDesignReferenceRights: true,
    referenceImageUrl: 'https://private.invalid/reference.png',
  }), /unreviewed data/i);
  assert.equal(fake.trace.some((entry) => entry.method === 'POST'), false);
});

test('stale layout, catalog media, cross-project data and receipt tampering fail closed', async () => {
  const invalidCatalogData = await fixture();
  const invalidCatalog = structuredClone(invalidCatalogData.catalog);
  invalidCatalog.catalogSha256 = '9'.repeat(64);
  await assert.rejects(
    () => validatePrivateDesignReferenceCatalog(invalidCatalog),
    /catalog content hash lost/i,
  );
  const invalidReference = structuredClone(invalidCatalogData.catalog);
  invalidReference.references[0].referenceSha256 = '8'.repeat(64);
  await assert.rejects(
    () => validatePrivateDesignReferenceCatalog(invalidReference),
    /reference content hash lost/i,
  );

  const staleLayoutData = await fixture();
  const staleLayout = service(staleLayoutData, {
    mutate: ({ path, payload }) => {
      if (path.endsWith('/layouts/approved')) {
        payload.approvedLayout.sha256 = '9'.repeat(64);
      }
      return payload;
    },
  });
  const staleWorkflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: staleLayoutData.snapshot,
    fetchImpl: staleLayout.fetchImpl,
    enabled: true,
  });
  await assert.rejects(() => staleWorkflow.connect(), /recovery receipt lost|layout hash lost/i);

  const mediaData = await fixture();
  const media = service(mediaData, {
    mutate: ({ path, payload }) => {
      if (path === '/api/v1/design-references') {
        payload.references[0].preview = 'https://private.invalid/reference.png';
      }
      return payload;
    },
  });
  const mediaWorkflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: mediaData.snapshot,
    fetchImpl: media.fetchImpl,
    enabled: true,
  });
  await assert.rejects(() => mediaWorkflow.connect(), /private media locator|preview boundary/i);

  const crossProjectData = await fixture();
  const crossProject = service(crossProjectData, {
    initialState: 'DESIGN_SELECTION_COMPLETE',
    mutate: ({ path, payload }) => {
      if (path.endsWith('/design-selection')) payload.projectId = 'another-project';
      return payload;
    },
  });
  const crossProjectWorkflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: crossProjectData.snapshot,
    fetchImpl: crossProject.fetchImpl,
    enabled: true,
  });
  await assert.rejects(() => crossProjectWorkflow.connect(), /another project|belongs/i);

  const tamperedData = await fixture();
  const tampered = service(tamperedData, {
    initialState: 'DESIGN_SELECTION_COMPLETE',
    mutate: ({ path, payload }) => {
      if (path.endsWith('/design-selection')) payload.designSelectionSha256 = '8'.repeat(64);
      return payload;
    },
  });
  const tamperedWorkflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: tamperedData.snapshot,
    fetchImpl: tampered.fetchImpl,
    enabled: true,
  });
  await assert.rejects(() => tamperedWorkflow.connect(), /content hash lost/i);

  const extraData = await fixture();
  const extra = service(extraData, {
    initialState: 'DESIGN_SELECTION_COMPLETE',
    mutate: ({ path, payload }) => {
      if (path.endsWith('/design-selection')) payload.unreviewed = true;
      return payload;
    },
  });
  const extraWorkflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: extraData.snapshot,
    fetchImpl: extra.fetchImpl,
    enabled: true,
  });
  await assert.rejects(() => extraWorkflow.connect(), /unreviewed data/i);

  const actorData = await fixture();
  const actorTamper = service(actorData, {
    initialState: 'DESIGN_SELECTION_COMPLETE',
    mutate: ({ path, payload }) => {
      if (path.endsWith('/design-selection')) {
        payload.designSelection.actor.claimedActorId = 'unexpected-claim';
        payload.sourceReferences.actor.claimedActorId = 'unexpected-claim';
      }
      return payload;
    },
  });
  const actorWorkflow = new PrivateDesignSelectionWorkflow({
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    expectedReleaseId: RELEASE,
    layoutSnapshot: actorData.snapshot,
    fetchImpl: actorTamper.fetchImpl,
    enabled: true,
  });
  await assert.rejects(() => actorWorkflow.connect(), /not the authenticated project customer/i);
});

test('private controller and browser fixture remain outside public Pages with flags off', async () => {
  const [workflow, fixtureHtml, allowlist, page, config] = await Promise.all([
    readFile(new URL('../private-design-selection-workflow.js', import.meta.url), 'utf8'),
    readFile(new URL('private-design-selection-workflow.browser.html', import.meta.url), 'utf8'),
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../config.js', import.meta.url), 'utf8'),
  ]);
  const entries = new Set(allowlist.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  for (const path of [
    'private-design-selection-workflow.js',
    'tests/private-design-selection-workflow.browser.html',
  ]) assert.equal(entries.has(path), false, path);
  assert.doesNotMatch(page, /private-design-selection/i);
  assert.match(workflow, /PRIVATE_DESIGN_SELECTION_WORKFLOW_ENABLED = false/);
  assert.doesNotMatch(workflow, /\/model\/generate|\/renders|\/quote|\/payment/i);
  assert.doesNotMatch(workflow, /Authorization['"\]]?\s*:/i);
  assert.match(fixtureHtml, /noindex,nofollow,noarchive/i);
  assert.doesNotMatch(fixtureHtml, /<img|<video|<canvas|<iframe|createObjectURL/i);
  for (const flag of [
    'AI_ANALYSIS_ENABLED', 'GEOMETRY_REVIEW_ENABLED', 'LIVE_3D_ENABLED',
    'AI_RENDERING_ENABLED', 'QUOTATION_ENABLED', 'PAYMENTS_ENABLED',
    'DEMO_FALLBACK_ENABLED',
  ]) assert.match(config, new RegExp(`${flag}:\\s*false`), flag);
});
