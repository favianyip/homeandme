import assert from 'node:assert/strict';
import test from 'node:test';

import {
  JourneyServiceWorkflow,
  SERVICE_WORKFLOW_SCHEMA,
  SERVICE_WORKFLOW_STORAGE_KEY,
  WorkflowGuardError,
  WorkflowPhase,
} from '../journey-service-workflow.js';
import {
  DYNAMIC_REFERENCE_VIEW_CONTRACT,
  DYNAMIC_REFERENCE_VIEW_ORDER,
  modelArtifactContract,
} from '../journey-model-artifacts.js';
import { createRenderRequest } from '../journey-render-contract.js';

const SHA = {
  geometry: 'a'.repeat(64),
  geometry2d: 'b'.repeat(64),
  proposal: 'c'.repeat(64),
  approvedGeometry: 'd'.repeat(64),
  layout: 'e'.repeat(64),
  model: 'f'.repeat(64),
  optionSet: '1'.repeat(64),
  layoutOption: '2'.repeat(64),
  sceneManifest: '3'.repeat(64),
  glb: '4'.repeat(64),
  scene: '5'.repeat(64),
  preview1: '6'.repeat(64),
  preview2: '7'.repeat(64),
};

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    dump: () => new Map(data),
  };
}

function workflowError(code) {
  return (error) => error instanceof WorkflowGuardError && error.code === code;
}

function verifiedModelReceipt(model) {
  const contract = modelArtifactContract(model);
  return {
    modelVersion: contract.modelVersion,
    modelSha256: contract.modelSha256,
    artifacts: contract.reviewArtifacts.map((artifact) => ({
      role: artifact.role,
      sha256: artifact.sha256,
      byteSize: artifact.byteSize,
      contentType: artifact.mediaType,
    })),
  };
}

class FakeProjectApi {
  constructor() {
    this.session = null;
    this.trace = [];
    this.eventList = [];
    this.jobs = new Map();
    this.verticalReview = null;
    this.layoutSet = null;
    this.modelOverrides = {};
    this.geometryDocument = {
      project_id: 'HNM-1',
      revision: 1,
      units: 'mm',
      scale_status: 'customer_confirmed',
      walls: [
        { id: 'wall-1', height: 2800 },
        { id: 'wall-2', height: 2800 },
      ],
      openings: [{ id: 'door-1', wall_id: 'wall-1', height: 2100, sill: 0 }],
      rooms: [{ id: 'room-1', name: 'Living' }],
    };
    this.geometryValidation = {
      valid: true,
      issues: [],
      room_areas_mm2: { 'room-1': 12000000 },
      bounding_box_mm: [0, 0, 5000, 4000],
    };
    this.dashboard = {
      projectId: 'HNM-1', propertyType: 'hdb', postalCode: null, levels: 1,
      state: 'DRAFT', geometryVersion: null, approvedGeometryVersion: null,
      designBriefVersion: null, layoutVersion: null, approvedLayoutVersion: null,
      modelVersion: null, approvedModelVersion: null, renderVersion: null,
      approvedDesignVersion: null,
    };
  }

  requireSession() {
    if (!this.session?.projectId) throw new Error('No saved project session.');
    return this.session;
  }

  async createProject(propertyType, postalCode, levels) {
    this.trace.push(['createProject', { propertyType, postalCode, levels }]);
    this.session = { projectId: 'HNM-1' };
    Object.assign(this.dashboard, { propertyType, postalCode, levels, state: 'DRAFT' });
    return { projectId: 'HNM-1', state: 'DRAFT' };
  }

  async project() {
    this.requireSession();
    return { ...this.dashboard };
  }

  async events() {
    return { projectId: 'HNM-1', events: this.eventList.map((event) => ({ ...event, payload: { ...event.payload } })) };
  }

  queue(kind, projectState, readyState, pointer, value) {
    const jobId = `job-${kind}`;
    this.dashboard.state = projectState;
    this.jobs.set(jobId, { kind, pollsRemaining: 1, readyState, pointer, value });
    this.eventList.push({ event_type: 'job.queued', payload: { jobId, kind } });
    return { jobId, status: 'queued' };
  }

  async uploadFloorPlan(file) {
    this.trace.push(['uploadFloorPlan', file.name]);
    return this.queue('floor_plan_analysis', 'ANALYSIS_QUEUED', 'NEEDS_VERIFICATION', 'geometryVersion', 1);
  }

  async job(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('job not found');
    if (job.pollsRemaining > 0) {
      job.pollsRemaining -= 1;
      return { jobId, status: 'running', progressPercentage: 50, message: 'Working' };
    }
    this.dashboard.state = job.readyState;
    this.dashboard[job.pointer] = job.value;
    return { jobId, status: 'completed', progressPercentage: 100, message: 'Complete' };
  }

  async geometry() {
    const geometryVersion = this.dashboard.geometryVersion;
    const geometrySha256 = geometryVersion === 1 ? SHA.geometry : SHA.approvedGeometry;
    return {
      projectId: 'HNM-1', geometryVersion, geometrySha256,
      approvalStatus: this.dashboard.approvedGeometryVersion ? 'approved' : 'pending_review',
      geometry: structuredClone(this.geometryDocument),
      validation: structuredClone(this.geometryValidation),
      artifactRoles: {},
    };
  }

  async calibrateGeometry(sourceGeometryVersion, sourceGeometrySha256, referenceWallId, measuredLengthMm, evidenceNote) {
    this.trace.push(['calibrateGeometry', {
      sourceGeometryVersion, sourceGeometrySha256, referenceWallId, measuredLengthMm, evidenceNote,
    }]);
    Object.assign(this.dashboard, { state: 'NEEDS_VERIFICATION', geometryVersion: 2 });
    this.geometryDocument.revision = 2;
    this.geometryDocument.scale_status = 'customer_confirmed';
    return {
      projectId: 'HNM-1', geometryVersion: 2, geometrySha256: SHA.approvedGeometry,
      geometry: structuredClone(this.geometryDocument), validation: structuredClone(this.geometryValidation),
    };
  }

  async _request(path, { body }) {
    this.trace.push(['request', path, structuredClone(body)]);
    if (path.endsWith('/geometry/approve')) {
      this.dashboard.state = 'DIMENSIONS_REVIEW';
      return {
        ...this.dashboard,
        geometry2dApprovalVersion: 1,
        geometry2dApprovalSha256: SHA.geometry2d,
      };
    }
    if (path.endsWith('/dimensions/propose')) {
      const { reviewerActorId: _reviewerActorId, ...review } = body;
      this.verticalReview = structuredClone(review);
      return {
        ...this.dashboard,
        verticalDimensionsProposalVersion: 1,
        verticalDimensionsProposalSha256: SHA.proposal,
        verticalDimensionsProposal: structuredClone(this.verticalReview),
      };
    }
    if (path.endsWith('/dimensions/approve')) {
      Object.assign(this.dashboard, {
        state: 'GEOMETRY_APPROVED', geometryVersion: 2, approvedGeometryVersion: 2,
      });
      this.geometryDocument.revision = 2;
      return { ...this.dashboard, geometrySha256: SHA.approvedGeometry };
    }
    if (path.includes('/layouts/') && path.endsWith('/approve')) {
      Object.assign(this.dashboard, {
        state: 'LAYOUT_APPROVED', layoutVersion: 1, approvedLayoutVersion: 1,
      });
      return { ...this.dashboard, layoutSha256: SHA.layout };
    }
    throw new Error(`Unexpected request: ${path}`);
  }

  async dimensionProposal() {
    this.trace.push(['dimensionProposal']);
    if (!this.verticalReview) throw new Error('vertical dimensions review is not available');
    return {
      projectId: 'HNM-1',
      verticalDimensionsProposalVersion: 1,
      verticalDimensionsProposalSha256: SHA.proposal,
      approvalStatus: 'pending_review',
      verticalDimensionsProposal: structuredClone(this.verticalReview),
      validation: structuredClone(this.geometryValidation),
      sourceReferences: {
        geometryVersion: this.verticalReview.sourceGeometryVersion,
        geometrySha256: this.verticalReview.sourceGeometrySha256,
        geometry2dApprovalVersion: this.verticalReview.geometry2dApprovalVersion,
        geometry2dApprovalSha256: this.verticalReview.geometry2dApprovalSha256,
      },
    };
  }

  async putDesignBrief(brief) {
    this.trace.push(['putDesignBrief', structuredClone(brief)]);
    Object.assign(this.dashboard, { state: 'DESIGN_BRIEF_COMPLETE', designBriefVersion: 1 });
    return { projectId: 'HNM-1', state: 'DESIGN_BRIEF_COMPLETE', designBriefVersion: 1 };
  }

  async generateLayouts() {
    this.trace.push(['generateLayouts']);
    this.dashboard.state = 'LAYOUT_READY';
    this.layoutSet = {
      projectId: 'HNM-1', optionSetVersion: 1,
      optionSetSha256: SHA.optionSet,
      sourceReferences: {
        geometryVersion: 2, geometrySha256: SHA.approvedGeometry,
        designBriefVersion: 1, designBriefSha256: '0'.repeat(64),
      },
      assetLibraryVersion: 'hnm-assets-test/1',
      options: [
        {
          layoutId: 'layout-safe', type: 'practical',
          layoutSha256: SHA.layoutOption,
          assetLibraryVersion: 'hnm-assets-test/1',
          placements: [{
            placementId: 'pl-1', assetId: 'sofa-3-seat', roomId: 'room-1',
            x: 750, y: 1000, z: 0, rotationDegrees: 0,
            width: 2100, depth: 900, height: 850, clearance: 600,
          }],
          validation: {
            feasible: true, hardConstraintViolations: [],
            doorSwingCheck: 'passed', circulationCheck: 'passed',
          },
        },
        {
          layoutId: 'layout-blocked', type: 'unsafe',
          layoutSha256: '3'.repeat(64),
          assetLibraryVersion: 'hnm-assets-test/1',
          placements: [],
          validation: {
            feasible: false, hardConstraintViolations: ['blocked exit'],
            doorSwingCheck: 'failed', circulationCheck: 'failed',
          },
        },
      ],
    };
    return structuredClone(this.layoutSet);
  }

  async layoutOptions() {
    this.trace.push(['layoutOptions']);
    if (!this.layoutSet) throw new Error('layout options are not available');
    return structuredClone(this.layoutSet);
  }

  async generateModel() {
    this.trace.push(['generateModel']);
    return this.queue('model_generation', 'MODEL_GENERATING', 'MODEL_READY', 'modelVersion', 1);
  }

  async model() {
    return {
      projectId: 'HNM-1', modelVersion: 1, modelSha256: SHA.model,
      geometryVersion: 2, geometrySha256: SHA.approvedGeometry,
      layoutVersion: 1, layoutSha256: SHA.layout,
      designBriefVersion: 1, designBriefSha256: '0'.repeat(64),
      materialVersion: 'palette-scandinavian-1',
      glbArtifactRole: 'model-1-glb', sceneArtifactRole: 'model-1-blend',
      sceneManifestArtifactRole: 'model-1-scene-manifest',
      sceneManifestSha256: SHA.sceneManifest,
      previewArtifactRoles: ['model-1-p1', 'model-1-p2'],
      previewViews: [
        {
          view: 'overview', roomId: null, roomName: null, roomFunction: null,
          artifactRole: 'model-1-p1',
          artifactFilename: 'render-angle-1.png', artifactSha256: SHA.preview1,
        },
        {
          view: 'living', roomId: 'room-1', roomName: 'Living', roomFunction: 'living',
          artifactRole: 'model-1-p2',
          artifactFilename: 'render-angle-2.png', artifactSha256: SHA.preview2,
        },
      ],
      referenceViewCoverage: {
        contract: DYNAMIC_REFERENCE_VIEW_CONTRACT,
        authoritativeRoomIds: ['room-1'], coveredRoomIds: ['room-1'],
        uncoveredRoomIds: [], uncoveredRooms: [], complete: true,
        roomViewCount: 1, totalViewCount: 2,
        orderingContract: DYNAMIC_REFERENCE_VIEW_ORDER,
      },
      artifactManifest: [
        { role: 'model-1-glb', sha256: SHA.glb, byteSize: 4096 },
        { role: 'model-1-blend', sha256: SHA.scene, byteSize: 8192 },
        { role: 'model-1-scene-manifest', sha256: SHA.sceneManifest, byteSize: 1024 },
        { role: 'model-1-p1', sha256: SHA.preview1, byteSize: 2048 },
        { role: 'model-1-p2', sha256: SHA.preview2, byteSize: 2048 },
      ],
      approvalStatus: this.dashboard.approvedModelVersion === 1 ? 'approved' : 'ready',
      ...this.modelOverrides,
    };
  }

  async approveModel(modelVersion, modelSha256, reviewerActorId) {
    this.trace.push(['approveModel', { modelVersion, modelSha256, reviewerActorId }]);
    Object.assign(this.dashboard, { state: 'MODEL_APPROVED', approvedModelVersion: modelVersion });
    return { ...this.dashboard, modelSha256 };
  }

  async uploadViewerCapture(color, depth, viewerState) {
    this.trace.push(['uploadViewerCapture', { color, depth, viewerState: structuredClone(viewerState) }]);
    return {
      projectId: 'HNM-1', captureId: 'capture-0001',
      colorArtifactRole: 'capture-color-0001',
      depthArtifactRole: 'capture-depth-0001',
      viewerStateArtifactRole: 'capture-state-0001',
      sourceBinding: {
        projectId: 'HNM-1', geometryVersion: 2, geometrySha256: SHA.approvedGeometry,
        layoutVersion: 1, layoutSha256: SHA.layout,
        designBriefVersion: 1, designBriefSha256: '0'.repeat(64),
        modelVersion: 1, modelSha256: SHA.model,
      },
    };
  }

  async generateRenders(renderRequest) {
    this.trace.push(['generateRenders', renderRequest]);
    return this.queue('render_generation', 'RENDER_QUEUED', 'RENDER_READY', 'renderVersion', 1);
  }

  async renders() {
    return {
      schema: 'hnm-render-set/1',
      projectId: 'HNM-1', renderVersion: 1, renderSetId: 'render-set-0001',
      renderer: { id: 'blender-approved-scene/1' },
      aiPostProcessing: null,
      externalConditioningConsumed: [],
      views: [{ name: 'requested-camera', artifactRole: 'render-requested-camera' }],
    };
  }

  async approveDesign(renderSetId) {
    this.trace.push(['approveDesign', renderSetId]);
    Object.assign(this.dashboard, { state: 'QUOTE_READY', approvedDesignVersion: 1 });
    return { ...this.dashboard };
  }
}

function makeWorkflow(api, storage = memoryStorage()) {
  return new JourneyServiceWorkflow({
    api, storage,
    pollOptions: { intervalMs: 1, timeoutMs: 100 },
  });
}

test('uncalibrated geometry can be anchored only through a current measured wall revision', async () => {
  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  Object.assign(api.dashboard, { state: 'UNCALIBRATED_REVIEW', geometryVersion: 1 });
  api.geometryDocument.scale_status = 'reference_validated';
  const workflow = makeWorkflow(api);

  const before = await workflow.resume();
  assert.equal(before.phase, WorkflowPhase.CALIBRATION_REVIEW);
  assert.ok(before.actions.includes('calibrate_geometry'));
  await assert.rejects(
    () => workflow.calibrateGeometry({
      referenceWallId: 'missing', measuredLengthMm: 4200, evidenceNote: 'Laser measurement.',
    }),
    workflowError('INVALID_REFERENCE_WALL'),
  );

  const after = await workflow.calibrateGeometry({
    referenceWallId: 'wall-1', measuredLengthMm: 4200, evidenceNote: 'Laser measurement on site.',
  });
  assert.equal(after.phase, WorkflowPhase.GEOMETRY_REVIEW);
  assert.deepEqual(api.trace.at(-1), ['calibrateGeometry', {
    sourceGeometryVersion: 1,
    sourceGeometrySha256: SHA.geometry,
    referenceWallId: 'wall-1',
    measuredLengthMm: 4200,
    evidenceNote: 'Laser measurement on site.',
  }]);
});

test('service controller runs the customer workflow through every explicit review gate', async () => {
  const api = new FakeProjectApi();
  const storage = memoryStorage();
  let workflow = makeWorkflow(api, storage);

  let state = await workflow.start({
    file: { name: 'verified-hdb-plan.pdf' }, propertyType: 'hdb', postalCode: '560123', levels: 1,
  });
  assert.equal(state.phase, WorkflowPhase.GEOMETRY_REVIEW);
  const geometry = await workflow.reviewGeometry();

  await assert.rejects(
    () => workflow.approveGeometry2d({
      geometryVersion: geometry.geometryVersion,
      geometrySha256: geometry.geometrySha256,
      reviewerActorId: 'customer:HNM-1',
    }),
    workflowError('CONFIRMATION_REQUIRED'),
  );

  state = await workflow.approveGeometry2d({
    geometryVersion: geometry.geometryVersion,
    geometrySha256: geometry.geometrySha256,
    reviewerActorId: 'customer:HNM-1',
    confirmMetricScale: true,
    confirmWallsRoomsOpenings: true,
  });
  assert.equal(state.phase, WorkflowPhase.DIMENSIONS_REVIEW);

  // A new controller instance can resume the hash-bound 2D approval from local storage.
  workflow = makeWorkflow(api, storage);
  const proposed = await workflow.proposeVerticalDimensions({
    reviewerActorId: 'customer:HNM-1',
    evidenceNote: 'Tape measurement completed on site.',
    ceilingHeightMm: 2800,
    wallDimensions: [
      { wallId: 'wall-1', heightMm: 2800 },
      { wallId: 'wall-2', heightMm: 2800 },
    ],
    openingDimensions: [
      { openingId: 'door-1', heightMm: 2100, sillMm: 0, swing: 'left' },
    ],
    confirmMetricScale: true,
    confirmVerticalDimensions: true,
    requiresSiteVerification: true,
  });
  assert.equal(proposed.proposal.version, 1);
  assert.equal(proposed.proposal.sha256, SHA.proposal);
  assert.equal(proposed.proposal.review.ceilingHeightMm, 2800);
  assert.equal(proposed.proposal.review.evidenceNote, 'Tape measurement completed on site.');
  assert.deepEqual(proposed.proposal.review.wallDimensions, [
    { wallId: 'wall-1', heightMm: 2800 },
    { wallId: 'wall-2', heightMm: 2800 },
  ]);
  assert.deepEqual(proposed.proposal.review.openingDimensions, [
    { openingId: 'door-1', heightMm: 2100, sillMm: 0, swing: 'left' },
  ]);

  state = await workflow.approveVerticalDimensions({
    proposalVersion: 1,
    proposalSha256: SHA.proposal,
    reviewerActorId: 'customer:HNM-1',
    confirmVerticalDimensions: true,
  });
  assert.equal(state.phase, WorkflowPhase.GEOMETRY_APPROVED);

  state = await workflow.submitDesignBrief({
    householdMembers: 4,
    roomsToRenovate: ['Living'],
    preferredStyles: ['scandinavian'],
  });
  assert.equal(state.phase, WorkflowPhase.LAYOUT_PREPARATION);

  const generated = await workflow.generateLayouts();
  assert.deepEqual(generated.safeLayoutIds, ['layout-safe']);
  await assert.rejects(
    () => workflow.approveLayout({
      layoutId: 'layout-blocked', reviewerActorId: 'customer:HNM-1', confirmLayout: true,
    }),
    workflowError('UNSAFE_LAYOUT'),
  );

  // Another authenticated device recovers the immutable option set without regenerating it.
  workflow = makeWorkflow(api, memoryStorage());
  const layouts = await workflow.reviewLayouts();
  assert.equal(layouts.optionSetVersion, 1);
  assert.equal(layouts.optionSetSha256, SHA.optionSet);
  assert.equal(layouts.options[0].layoutSha256, SHA.layoutOption);
  assert.equal(layouts.options[0].placements[0].assetId, 'sofa-3-seat');
  state = await workflow.approveLayout({
    layoutId: 'layout-safe', reviewerActorId: 'customer:HNM-1', confirmLayout: true,
  });
  assert.equal(state.phase, WorkflowPhase.LAYOUT_APPROVED);

  state = await workflow.generateModel();
  assert.equal(state.phase, WorkflowPhase.MODEL_PROCESSING);

  // Job IDs can also be recovered from the authenticated event stream on another device store.
  workflow = makeWorkflow(api, memoryStorage());
  state = await workflow.resume();
  assert.deepEqual(state.activeJob, { kind: 'model_generation', jobId: 'job-model_generation' });
  state = await workflow.waitForActiveJob();
  assert.equal(state.phase, WorkflowPhase.MODEL_REVIEW);

  const model = await workflow.reviewModel();
  await assert.rejects(
    () => workflow.approveModel({
      modelVersion: model.modelVersion,
      modelSha256: model.modelSha256,
      reviewerActorId: 'customer:HNM-1',
    }),
    workflowError('CONFIRMATION_REQUIRED'),
  );
  await assert.rejects(
    () => workflow.approveModel({
      modelVersion: model.modelVersion,
      modelSha256: model.modelSha256,
      reviewerActorId: 'customer:HNM-1',
      confirmLayoutAndModel: true,
    }),
    workflowError('UNVERIFIED_MODEL_ARTIFACTS'),
  );
  const staleReceipt = verifiedModelReceipt(model);
  staleReceipt.modelSha256 = '0'.repeat(64);
  await assert.rejects(
    () => workflow.approveModel({
      modelVersion: model.modelVersion,
      modelSha256: model.modelSha256,
      reviewerActorId: 'customer:HNM-1',
      confirmLayoutAndModel: true,
      artifactReceipt: staleReceipt,
    }),
    workflowError('UNVERIFIED_MODEL_ARTIFACTS'),
  );
  state = await workflow.approveModel({
    modelVersion: model.modelVersion,
    modelSha256: model.modelSha256,
    reviewerActorId: 'customer:HNM-1',
    confirmLayoutAndModel: true,
    artifactReceipt: verifiedModelReceipt(model),
  });
  assert.equal(state.phase, WorkflowPhase.MODEL_APPROVED);
  assert.deepEqual(state.actions, ['generate_render']);
  state = await workflow.generateRenders({
    renderRequest: createRenderRequest({
      projectId: 'HNM-1', projectRevision: 2,
      geometrySha256: SHA.approvedGeometry,
      modelVersion: 1, modelSha256: SHA.model,
      createdAt: '2026-08-05T12:00:00+08:00',
      camera: { position: [4, 1.5, 5], target: [0, 1, 0] },
      scene: { materialRevision: 'palette-scandinavian-1' },
    }),
  });
  assert.equal(api.trace.some(([name]) => name === 'uploadViewerCapture'), false);
  assert.equal(state.phase, WorkflowPhase.RENDER_PROCESSING);
  state = await workflow.waitForActiveJob();
  assert.equal(state.phase, WorkflowPhase.RENDER_REVIEW);
  const renders = await workflow.reviewRenders();
  assert.equal(renders.renderSetId, 'render-set-0001');
  state = await workflow.approveDesign({ renderSetId: renders.renderSetId, confirmDesign: true });
  assert.equal(state.phase, WorkflowPhase.DESIGN_APPROVED);

  const approvalCalls = api.trace.filter(([name, path]) => name === 'request' && /approve$/.test(path));
  assert.equal(approvalCalls.length, 3);
  assert.deepEqual(approvalCalls[0][2], {
    geometryVersion: 1,
    geometrySha256: SHA.geometry,
    reviewerActorId: 'customer:HNM-1',
    confirmMetricScale: true,
    confirmWallsRoomsOpenings: true,
  });
});

test('model review rejects an incomplete authoritative artifact manifest before approval', async () => {
  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  Object.assign(api.dashboard, {
    state: 'MODEL_READY',
    geometryVersion: 2,
    approvedGeometryVersion: 2,
    designBriefVersion: 1,
    layoutVersion: 1,
    approvedLayoutVersion: 1,
    modelVersion: 1,
  });
  const complete = await api.model();
  api.modelOverrides = { artifactManifest: complete.artifactManifest.slice(0, -1) };
  const workflow = makeWorkflow(api);

  await assert.rejects(() => workflow.reviewModel(), workflowError('INVALID_MODEL_ARTIFACTS'));
  assert.equal(api.trace.some(([name]) => name === 'approveModel'), false);
});

test('resume fails closed when server state or non-recoverable review data is unknown', async () => {
  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  api.dashboard.state = 'NEW_UNRECOGNISED_STATE';
  let workflow = makeWorkflow(api);
  let state = await workflow.resume();
  assert.equal(state.phase, WorkflowPhase.BLOCKED);
  assert.equal(state.blocked, true);
  assert.deepEqual(state.actions, []);

  api.dashboard.state = 'LAYOUT_READY';
  workflow = makeWorkflow(api, memoryStorage());
  state = await workflow.resume();
  assert.equal(state.phase, WorkflowPhase.LAYOUT_REVIEW);
  assert.equal(state.blocked, true);
  assert.match(state.blockedReason, /option set.*(?:unavailable|could not be recovered)/i);
  await assert.rejects(() => workflow.reviewLayouts(), workflowError('MISSING_LAYOUT_OPTIONS'));
  assert.equal(api.trace.some(([name]) => name === 'generateLayouts'), false);
});

test('another authenticated device recovers the complete measured proposal before approval', async () => {
  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  Object.assign(api.dashboard, { state: 'NEEDS_VERIFICATION', geometryVersion: 1 });
  const first = makeWorkflow(api, memoryStorage());
  await first.approveGeometry2d({
    geometryVersion: 1,
    geometrySha256: SHA.geometry,
    reviewerActorId: 'customer:HNM-1',
    confirmMetricScale: true,
    confirmWallsRoomsOpenings: true,
  });
  await first.proposeVerticalDimensions({
    reviewerActorId: 'customer:HNM-1', evidenceNote: 'Measured with a laser on site.', ceilingHeightMm: 2800,
    wallDimensions: [{ wallId: 'wall-1', heightMm: 2800 }, { wallId: 'wall-2', heightMm: 2800 }],
    openingDimensions: [{ openingId: 'door-1', heightMm: 2100, sillMm: 0, swing: 'right' }],
    confirmMetricScale: true, confirmVerticalDimensions: true, requiresSiteVerification: true,
  });

  const recovered = makeWorkflow(api, memoryStorage());
  const state = await recovered.resume();
  assert.equal(state.blocked, false);
  assert.ok(state.actions.includes('approve_vertical_dimensions'));
  assert.equal(recovered.saved.verticalProposal.sha256, SHA.proposal);
  assert.equal(recovered.saved.verticalProposal.review.openingDimensions[0].swing, 'right');
  assert.equal(recovered.saved.geometry2dApproval.sourceGeometrySha256, SHA.geometry);
});

test('stale geometry, incomplete dimensions and stale render requests never call mutating endpoints', async () => {
  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  api.dashboard.state = 'NEEDS_VERIFICATION';
  api.dashboard.geometryVersion = 1;
  const workflow = makeWorkflow(api);

  await assert.rejects(
    () => workflow.approveGeometry2d({
      geometryVersion: 1,
      geometrySha256: '9'.repeat(64),
      reviewerActorId: 'customer:HNM-1',
      confirmMetricScale: true,
      confirmWallsRoomsOpenings: true,
    }),
    workflowError('STALE_GEOMETRY'),
  );
  assert.equal(api.trace.some(([name]) => name === 'request'), false);

  // Seed a real 2D receipt, then prove partial wall evidence is blocked client-side.
  await workflow.approveGeometry2d({
    geometryVersion: 1,
    geometrySha256: SHA.geometry,
    reviewerActorId: 'customer:HNM-1',
    confirmMetricScale: true,
    confirmWallsRoomsOpenings: true,
  });
  const requestsBefore = api.trace.filter(([name]) => name === 'request').length;
  await assert.rejects(
    () => workflow.proposeVerticalDimensions({
      reviewerActorId: 'customer:HNM-1', evidenceNote: 'Verified on site.', ceilingHeightMm: 2800,
      wallDimensions: [{ wallId: 'wall-1', heightMm: 2800 }],
      openingDimensions: [{ openingId: 'door-1', heightMm: 2100, sillMm: 0, swing: 'left' }],
      confirmMetricScale: true, confirmVerticalDimensions: true, requiresSiteVerification: true,
    }),
    workflowError('INCOMPLETE_DIMENSIONS'),
  );
  assert.equal(api.trace.filter(([name]) => name === 'request').length, requestsBefore);

  Object.assign(api.dashboard, {
    state: 'MODEL_APPROVED', geometryVersion: 2, approvedGeometryVersion: 2,
    designBriefVersion: 1, layoutVersion: 1, approvedLayoutVersion: 1,
    modelVersion: 1, approvedModelVersion: 1,
  });
  api.geometryDocument.revision = 2;
  await assert.rejects(
    () => workflow.generateRenders(),
    workflowError('MISSING_RENDER_REQUEST'),
  );
  const unsupportedConditioning = createRenderRequest({
    projectId: 'HNM-1', projectRevision: 2,
    geometrySha256: SHA.approvedGeometry,
    modelVersion: 1, modelSha256: SHA.model,
    createdAt: '2026-08-05T12:00:00+08:00',
    camera: { position: [4, 1.5, 5], target: [0, 1, 0] },
    scene: { materialRevision: 'palette-scandinavian-1' },
  });
  unsupportedConditioning.conditioning.depthArtifactRole = 'depth-1';
  await assert.rejects(
    () => workflow.generateRenders({ renderRequest: unsupportedConditioning }),
    workflowError('INVALID_RENDER_REQUEST'),
  );
  const staleGeometry = createRenderRequest({
    projectId: 'HNM-1', projectRevision: 2,
    geometrySha256: SHA.geometry,
    modelVersion: 1, modelSha256: SHA.model,
    createdAt: '2026-08-05T12:00:00+08:00',
    camera: { position: [4, 1.5, 5], target: [0, 1, 0] },
    scene: { materialRevision: 'palette-scandinavian-1' },
  });
  await assert.rejects(
    () => workflow.generateRenders({ renderRequest: staleGeometry }),
    workflowError('STALE_RENDER_REQUEST'),
  );
  assert.equal(api.trace.some(([name]) => name === 'generateRenders'), false);
});

test('unverified scale or server geometry blockers never reach the 2D approval endpoint', async () => {
  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  api.dashboard.state = 'NEEDS_VERIFICATION';
  api.dashboard.geometryVersion = 1;
  const workflow = makeWorkflow(api);
  const approval = {
    geometryVersion: 1,
    geometrySha256: SHA.geometry,
    reviewerActorId: 'customer:HNM-1',
    confirmMetricScale: true,
    confirmWallsRoomsOpenings: true,
  };

  api.geometryDocument.scale_status = 'unvalidated';
  await assert.rejects(() => workflow.approveGeometry2d(approval), workflowError('UNVERIFIED_SCALE'));
  assert.equal(api.trace.some(([name]) => name === 'request'), false);

  api.geometryDocument.scale_status = 'customer_confirmed';
  api.geometryValidation = {
    valid: false,
    issues: [{ code: 'OPEN_WALL_CHAIN', message: 'A wall gap remains.', object_ids: ['wall-2'] }],
    room_areas_mm2: {},
    bounding_box_mm: [0, 0, 5000, 4000],
  };
  await assert.rejects(() => workflow.approveGeometry2d(approval), workflowError('GEOMETRY_BLOCKED'));
  assert.equal(api.trace.some(([name]) => name === 'request'), false);
});

test('controller never replaces an existing project and has no demo-only construction path', async () => {
  assert.throws(() => new JourneyServiceWorkflow(), workflowError('SERVICE_REQUIRED'));

  const api = new FakeProjectApi();
  api.session = { projectId: 'HNM-1' };
  const storage = memoryStorage();
  const workflow = makeWorkflow(api, storage);
  await assert.rejects(
    () => workflow.start({ file: { name: 'another-plan.png' } }),
    workflowError('EXISTING_PROJECT'),
  );
  assert.equal(api.trace.length, 0);
  assert.equal(storage.getItem(SERVICE_WORKFLOW_STORAGE_KEY), null);
});

test('a fresh upload keeps its durable analysis job recoverable when foreground polling fails', async () => {
  const api = new FakeProjectApi();
  const storage = memoryStorage();
  const workflow = new JourneyServiceWorkflow({
    api,
    storage,
    poll: async () => { throw new Error('temporary polling failure'); },
  });
  await assert.rejects(
    () => workflow.start({ file: { name: 'authorised-plan.png' }, propertyType: 'hdb', levels: 1 }),
    /temporary polling failure/,
  );
  const resumed = await workflow.resume();
  assert.equal(resumed.phase, WorkflowPhase.ANALYSIS_PROCESSING);
  assert.deepEqual(resumed.activeJob, { kind: 'floor_plan_analysis', jobId: 'job-floor_plan_analysis' });
  assert.equal(JSON.parse(storage.getItem(SERVICE_WORKFLOW_STORAGE_KEY)).jobs.floor_plan_analysis, 'job-floor_plan_analysis');
});

test('local workflow persistence contains only allowlisted recovery IDs and approval hashes', () => {
  const storage = memoryStorage();
  const workflow = makeWorkflow(new FakeProjectApi(), storage);
  workflow.saved = {
    schema: SERVICE_WORKFLOW_SCHEMA,
    projectId: 'HNM-1',
    jobs: {
      floor_plan_analysis: 'job-floor-plan-1',
      model_generation: 'https://signed.example/private-model?token=secret',
      unknown_kind: 'customer-note-must-not-persist',
    },
    geometry2dApproval: {
      sourceGeometryVersion: 1,
      sourceGeometrySha256: SHA.geometry,
      version: 1,
      sha256: SHA.geometry2d,
    },
    verticalProposal: {
      review: {
        evidenceNote: 'Sensitive tape measurement completed in the customer home.',
        ceilingHeightMm: 2800,
        wallDimensions: [{ wallId: 'wall-1', heightMm: 2800 }],
      },
    },
    layouts: { options: [{ placements: [{ assetId: 'customer-sofa', x: 1234, y: 5678 }] }] },
    renderCapture: {
      captureId: 'capture-private',
      colorArtifactRole: 'signed-artifact-role',
      sourceBinding: { projectId: 'HNM-1', geometrySha256: SHA.geometry },
    },
    approvedLayout: { layoutId: 'layout-private', version: 1, sha256: SHA.layout },
    userText: 'customer free text',
  };

  workflow._persist();
  const raw = storage.getItem(SERVICE_WORKFLOW_STORAGE_KEY);
  assert.deepEqual(JSON.parse(raw), {
    schema: SERVICE_WORKFLOW_SCHEMA,
    projectId: 'HNM-1',
    jobs: { floor_plan_analysis: 'job-floor-plan-1' },
    geometry2dApproval: {
      sourceGeometryVersion: 1,
      sourceGeometrySha256: SHA.geometry,
      version: 1,
      sha256: SHA.geometry2d,
    },
  });
  for (const forbidden of [
    'evidenceNote', 'ceilingHeightMm', 'wallDimensions', 'placements', 'customer-sofa',
    'renderCapture', 'sourceBinding', 'signed.example', 'token=secret', 'artifact',
    'approvedLayout', 'customer free text',
  ]) assert.equal(raw.includes(forbidden), false, forbidden);
});

test('workflow storage migration discards legacy and oversized private snapshots', () => {
  const legacyStorage = memoryStorage();
  legacyStorage.setItem('hnm_service_workflow_v1', JSON.stringify({
    schema: 'hnm-service-workflow/1',
    projectId: 'HNM-1',
    verticalProposal: { review: { evidenceNote: 'private measurement note' } },
  }));
  const migrated = makeWorkflow(new FakeProjectApi(), legacyStorage);
  assert.equal(legacyStorage.getItem('hnm_service_workflow_v1'), null);
  assert.deepEqual(migrated.saved, { schema: SERVICE_WORKFLOW_SCHEMA, projectId: null, jobs: {} });
  assert.match(migrated._storageWarning, /Legacy workflow resume data was discarded/i);

  const oversizedStorage = memoryStorage();
  oversizedStorage.setItem(SERVICE_WORKFLOW_STORAGE_KEY, JSON.stringify({
    schema: SERVICE_WORKFLOW_SCHEMA,
    projectId: 'HNM-1',
    evidenceNote: 'private'.repeat(1000),
  }));
  const oversized = makeWorkflow(new FakeProjectApi(), oversizedStorage);
  assert.equal(oversizedStorage.getItem(SERVICE_WORKFLOW_STORAGE_KEY), null);
  assert.deepEqual(oversized.saved, { schema: SERVICE_WORKFLOW_SCHEMA, projectId: null, jobs: {} });
  assert.match(oversized._storageWarning, /Oversized workflow resume data was discarded/i);
});
