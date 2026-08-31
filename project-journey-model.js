import { contractToProject, validateProject } from './journey-project.js';
import { projectToSolidContract } from './journey-solid.js';
import { validateProject3dReadiness } from './journey-topology-gate.js';
import { createRenderRequest, validateRenderRequest } from './journey-render-contract.js';
import { WorkflowPhase } from './journey-service-workflow.js';
import { normalizePixelMetricRegistration } from './journey-source-registration.js';

export const PROJECT_JOURNEY_ACTS = Object.freeze([
  Object.freeze({
    id: 'intake', number: '01', label: 'Plan intake', short: 'Upload & private analysis',
    capability: 'AI_ANALYSIS_ENABLED',
  }),
  Object.freeze({
    id: 'geometry', number: '02', label: 'Geometry review', short: 'Correct & confirm every line',
    capability: 'GEOMETRY_REVIEW_ENABLED',
  }),
  Object.freeze({
    id: 'design', number: '03', label: 'Life & design brief', short: 'Rooms, needs and material direction',
    capability: 'LIVE_3D_ENABLED',
  }),
  Object.freeze({
    id: 'model', number: '04', label: '3D & furniture', short: 'Approved shell and safe layout',
    capability: 'LIVE_3D_ENABLED',
  }),
  Object.freeze({
    id: 'render', number: '05', label: 'Scene render', short: 'One approved deterministic scene',
    capability: 'AI_RENDERING_ENABLED',
  }),
  Object.freeze({
    id: 'handover', number: '06', label: 'Review & handover', short: 'Design approval before quotation',
    capability: 'AI_RENDERING_ENABLED',
  }),
]);

export const PHASE_PRESENTATION = Object.freeze({
  [WorkflowPhase.AWAITING_UPLOAD]: Object.freeze({
    act: 'intake', eyebrow: 'Private plan intake', title: 'Begin with the drawing you actually own',
    copy: 'JPG and PNG plans enter a private project. Detection proposes geometry; it never approves it. PDF vector review is not yet available here.',
    status: 'ready', primary: 'Create project & analyse plan',
  }),
  [WorkflowPhase.ANALYSIS_PROCESSING]: Object.freeze({
    act: 'intake', eyebrow: 'Analysis in progress', title: 'The proposal is being assembled',
    copy: 'The service is finding walls, rooms, doors and windows. This is a proposal until every blocker is reviewed.',
    status: 'working', primary: 'Continue analysis',
  }),
  [WorkflowPhase.CALIBRATION_REVIEW]: Object.freeze({
    act: 'geometry', eyebrow: 'Metric calibration required', title: 'One known measurement must anchor the plan',
    copy: '3D stays locked until a real dimension is bound to this exact geometry revision.',
    status: 'blocked', primary: null,
  }),
  [WorkflowPhase.TWO_D_REVIEW]: Object.freeze({
    act: 'geometry', eyebrow: 'Native plan review required', title: 'Accept the correct drawing layer first',
    copy: 'The vector proposal must be reviewed in the dedicated 2D service before geometry approval.',
    status: 'blocked', primary: null,
  }),
  [WorkflowPhase.GEOMETRY_REVIEW]: Object.freeze({
    act: 'geometry', eyebrow: 'Correction desk', title: 'Confirm walls, rooms and every opening',
    copy: 'A connected wall graph, closed rooms, hosted doors and windows, and confirmed scale are mandatory.',
    status: 'review', primary: 'Review current geometry',
  }),
  [WorkflowPhase.DIMENSIONS_REVIEW]: Object.freeze({
    act: 'geometry', eyebrow: 'Vertical survey', title: 'Add what a 2D plan cannot tell us',
    copy: 'Ceiling, wall, door and window heights need measured evidence before a metric model is approved.',
    status: 'review', primary: 'Review dimensions',
  }),
  [WorkflowPhase.GEOMETRY_APPROVED]: Object.freeze({
    act: 'design', eyebrow: 'Geometry approved', title: 'Tell the layout engine how the home should live',
    copy: 'Household needs and style preferences become a versioned brief. Geometry remains immutable.',
    status: 'ready', primary: 'Save design brief',
  }),
  [WorkflowPhase.LAYOUT_PREPARATION]: Object.freeze({
    act: 'model', eyebrow: 'Furniture planning', title: 'Generate layouts against hard clearances',
    copy: 'Only options passing room, wall, door-swing and circulation checks may be selected.',
    status: 'ready', primary: 'Generate safe layouts',
  }),
  [WorkflowPhase.LAYOUT_REVIEW]: Object.freeze({
    act: 'model', eyebrow: 'Furniture review', title: 'Choose a feasible furnishing example',
    copy: 'The proposal is an example, not a renovation instruction. Review circulation and room use before approval.',
    status: 'review', primary: 'Approve selected layout',
  }),
  [WorkflowPhase.LAYOUT_APPROVED]: Object.freeze({
    act: 'model', eyebrow: 'Layout approved', title: 'Compile the whole unit as one versioned model',
    copy: 'The service binds approved geometry, furniture and design brief into GLB and an approved Blender scene.',
    status: 'ready', primary: 'Generate 3D model',
  }),
  [WorkflowPhase.MODEL_PROCESSING]: Object.freeze({
    act: 'model', eyebrow: '3D compilation', title: 'The approved shell and furniture are being built',
    copy: 'The model remains unavailable until immutable geometry, layout and material bindings pass.',
    status: 'working', primary: 'Continue model build',
  }),
  [WorkflowPhase.MODEL_REVIEW]: Object.freeze({
    act: 'model', eyebrow: 'Model review', title: 'Walk through the approved geometry before rendering',
    copy: 'Inspect the whole unit, openings and furniture. Approval targets the exact model version and hash shown here.',
    status: 'review', primary: 'Approve this model',
  }),
  [WorkflowPhase.MODEL_APPROVED]: Object.freeze({
    act: 'render', eyebrow: 'Scene ready', title: 'Render the approved camera—not a reimagined room',
    copy: 'The current renderer opens the approved Blender scene directly. It does not alter geometry with prompts.',
    status: 'ready', primary: 'Render approved scene',
  }),
  [WorkflowPhase.RENDER_PROCESSING]: Object.freeze({
    act: 'render', eyebrow: 'Render in progress', title: 'The requested camera is being rendered',
    copy: 'The job is bound to the approved geometry, model and material revisions and can be resumed safely.',
    status: 'working', primary: 'Continue render',
  }),
  [WorkflowPhase.RENDER_REVIEW]: Object.freeze({
    act: 'render', eyebrow: 'Design review', title: 'Review the image against the approved model',
    copy: 'The render is a design visualisation. It is not an as-built survey or a promise of exact lighting and finish.',
    status: 'review', primary: 'Approve this design',
  }),
  [WorkflowPhase.DESIGN_APPROVED]: Object.freeze({
    act: 'handover', eyebrow: 'Design approved', title: 'The visual brief is versioned and ready for professional review',
    copy: 'Quotation and renovation still require confirmed scope, site measurements and professional checks.',
    status: 'complete', primary: null,
  }),
  [WorkflowPhase.REVISION_REQUIRED]: Object.freeze({
    act: 'design', eyebrow: 'Revision requested', title: 'The approved chain is paused for a controlled change',
    copy: 'A revision must create a new version and re-run affected downstream approvals.',
    status: 'blocked', primary: null,
  }),
  [WorkflowPhase.TERMINAL_FAILURE]: Object.freeze({
    act: 'intake', eyebrow: 'Project stopped', title: 'This run cannot advance automatically',
    copy: 'The service has retained the project evidence. A human must review the failure before anything is retried.',
    status: 'blocked', primary: null,
  }),
  [WorkflowPhase.BLOCKED]: Object.freeze({
    act: 'geometry', eyebrow: 'Unrecognised service state', title: 'The safe action is to stop here',
    copy: 'No local fallback can advance a project whose server state is unknown.',
    status: 'blocked', primary: null,
  }),
});

const PHASE_ORDER = Object.freeze([
  WorkflowPhase.AWAITING_UPLOAD,
  WorkflowPhase.ANALYSIS_PROCESSING,
  WorkflowPhase.CALIBRATION_REVIEW,
  WorkflowPhase.TWO_D_REVIEW,
  WorkflowPhase.GEOMETRY_REVIEW,
  WorkflowPhase.DIMENSIONS_REVIEW,
  WorkflowPhase.GEOMETRY_APPROVED,
  WorkflowPhase.LAYOUT_PREPARATION,
  WorkflowPhase.LAYOUT_REVIEW,
  WorkflowPhase.LAYOUT_APPROVED,
  WorkflowPhase.MODEL_PROCESSING,
  WorkflowPhase.MODEL_REVIEW,
  WorkflowPhase.MODEL_APPROVED,
  WorkflowPhase.RENDER_PROCESSING,
  WorkflowPhase.RENDER_REVIEW,
  WorkflowPhase.DESIGN_APPROVED,
]);

const EXCEPTION_PHASE_PROGRESS = Object.freeze({
  [WorkflowPhase.REVISION_REQUIRED]: PHASE_ORDER.indexOf(WorkflowPhase.GEOMETRY_APPROVED),
  [WorkflowPhase.TERMINAL_FAILURE]: PHASE_ORDER.indexOf(WorkflowPhase.ANALYSIS_PROCESSING),
  [WorkflowPhase.BLOCKED]: PHASE_ORDER.indexOf(WorkflowPhase.GEOMETRY_REVIEW),
});

const capabilityState = (config, capability) => config?.flags?.[capability] === true;

export function serviceAvailability(config) {
  const serviceConfigured = typeof config?.apiBaseUrl === 'string' && config.apiBaseUrl.length > 0;
  const analysisEnabled = capabilityState(config, 'AI_ANALYSIS_ENABLED');
  if (!serviceConfigured) {
    return Object.freeze({
      live: false,
      code: 'SERVICE_NOT_CONFIGURED',
      title: 'Live project service is not connected on this site',
      message: 'Uploads, approvals, 3D generation and rendering stay disabled. No browser-only floor-plan or 3D fallback is offered.',
    });
  }
  if (!analysisEnabled) {
    return Object.freeze({
      live: false,
      code: 'ANALYSIS_NOT_RELEASED',
      title: 'Private plan analysis has not been released here',
      message: 'The API address exists, but its first dependency is disabled. No downstream stage may be opened.',
    });
  }
  return Object.freeze({ live: true, code: 'SERVICE_READY', title: 'Private project service connected', message: 'Every stage follows the authenticated server state.' });
}

export function capabilityLedger(config) {
  return PROJECT_JOURNEY_ACTS.map((act) => ({
    ...act,
    enabled: Boolean(config?.apiBaseUrl) && capabilityState(config, act.capability),
  }));
}

export function presentWorkflow(config, workflowState = null) {
  const availability = serviceAvailability(config);
  const phase = workflowState?.phase || WorkflowPhase.AWAITING_UPLOAD;
  const presentation = PHASE_PRESENTATION[phase] || PHASE_PRESENTATION[WorkflowPhase.BLOCKED];
  const ledger = capabilityLedger(config);
  const activeIndex = Math.max(0, ledger.findIndex((act) => act.id === presentation.act));
  const orderedProgress = PHASE_ORDER.indexOf(phase);
  const progressIndex = orderedProgress >= 0 ? orderedProgress : EXCEPTION_PHASE_PROGRESS[phase] ?? 0;
  return {
    availability,
    phase,
    presentation,
    ledger: ledger.map((act, index) => ({
      ...act,
      state: !act.enabled ? 'locked' : index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'waiting',
    })),
    projectId: workflowState?.projectId || null,
    serverState: workflowState?.serverState || null,
    actions: [...(workflowState?.actions || [])],
    blocked: !availability.live || workflowState?.blocked === true,
    blockedReason: !availability.live ? availability.message : workflowState?.blockedReason || null,
    persistenceWarning: workflowState?.persistenceWarning || null,
    progressIndex,
    progressTotal: PHASE_ORDER.length - 1,
  };
}

const point = (value) => {
  if (Array.isArray(value)) return [Number(value[0]), Number(value[1])];
  return [Number(value?.x), Number(value?.y)];
};

const finitePoint = (value) => value.length === 2 && value.every(Number.isFinite);
const wallLength = (wall) => Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
const EPS = 1;
const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function pointOnWall(p, wall) {
  const length = wallLength(wall);
  if (!length) return false;
  if (Math.abs(cross(wall.a, wall.b, p)) / length > EPS) return false;
  const dot = (p[0] - wall.a[0]) * (wall.b[0] - wall.a[0])
    + (p[1] - wall.a[1]) * (wall.b[1] - wall.a[1]);
  return dot >= -EPS && dot <= length * length + EPS;
}

function wallCycleForBoundary(boundary, walls) {
  const ids = [];
  for (let index = 0; index < boundary.length; index += 1) {
    const start = boundary[index];
    const end = boundary[(index + 1) % boundary.length];
    const hosted = walls.filter((wall) => pointOnWall(start, wall) && pointOnWall(end, wall));
    if (hosted.length !== 1) return [];
    if (!ids.includes(hosted[0].id)) ids.push(hosted[0].id);
  }
  return ids;
}

/**
 * Convert the service's canonical millimetre geometry into the shared browser project contract.
 * This adapter does not invent scale, heights or room-wall cycles. Missing evidence remains a
 * visible 3D blocker in `auditCanonicalGeometry`.
 */
export function canonicalGeometryToPlanContract(geometry) {
  if (!geometry || geometry.units !== 'mm') throw new TypeError('Canonical geometry must use millimetres.');
  const walls = (geometry.walls || []).map((wall) => {
    const a = point(wall.start || wall.a);
    const b = point(wall.end || wall.b);
    if (!wall.id || !finitePoint(a) || !finitePoint(b) || wallLength({ a, b }) <= 0) {
      throw new TypeError(`Wall ${wall?.id || 'missing'} has invalid geometry.`);
    }
    return {
      id: wall.id, a, b,
      thickness: Number(wall.thickness),
      height: Number(wall.height),
      type: wall.kind || wall.type || 'unknown',
      confidence: wall.confidence,
    };
  });
  const byId = new Map(walls.map((wall) => [wall.id, wall]));
  const openings = (geometry.openings || []).map((opening) => {
    const host = byId.get(opening.wall_id || opening.wall);
    const length = host ? wallLength(host) : 0;
    const offset = Number(opening.offset);
    const width = Number(opening.width);
    const explicitStart = Number(opening.t0 ?? opening.span?.startRatio);
    const explicitEnd = Number(opening.t1 ?? opening.span?.endRatio);
    return {
      id: opening.id,
      wall: opening.wall_id || opening.wall || null,
      kind: opening.kind || 'opening',
      t0: Number.isFinite(explicitStart) ? explicitStart : offset / length,
      t1: Number.isFinite(explicitEnd) ? explicitEnd : (offset + width) / length,
      width,
      height: Number(opening.height),
      sill: Number(opening.sill),
      handing: opening.swing || opening.handing || 'unknown',
      reviewedUsage: opening.reviewed_usage || opening.reviewedUsage || 'unspecified',
      confidence: opening.confidence,
    };
  });
  const rooms = (geometry.rooms || []).map((room) => {
    const boundary = (room.boundary || room.poly || []).map(point);
    return {
      id: room.id,
      label: room.name || room.label || null,
      cls: room.function || room.cls || 'unknown',
      poly: boundary,
      cycle: Array.isArray(room.wall_ids || room.cycle)
        ? [...(room.wall_ids || room.cycle)]
        : wallCycleForBoundary(boundary, walls),
      areaM2: room.area_m2 ?? room.areaM2,
      confidence: room.confidence,
    };
  });
  const points = walls.flatMap((wall) => [wall.a, wall.b]);
  const minX = Math.min(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1]));
  const maxX = Math.max(...points.map((p) => p[0]));
  const maxY = Math.max(...points.map((p) => p[1]));
  return {
    schema: 'hnm-plan-contract/1', ok: true, units: 'mm',
    source: geometry.project_id || null,
    envelope: points.length ? [maxX - minX, maxY - minY] : [0, 0],
    walls, openings, rooms, adjacency: [], issues: geometry.issues || [],
  };
}

export function auditCanonicalGeometry(geometry, {
  projectId = geometry?.project_id,
  geometrySha256 = null,
  approved2d = false,
  approvedVertical = false,
} = {}) {
  const contract = canonicalGeometryToPlanContract(geometry);
  const heights = contract.walls.map((wall) => wall.height).filter(Number.isInteger);
  const storeyHeight = heights.length && new Set(heights).size === 1 ? heights[0] : 0;
  const project = contractToProject(contract, {
    projectId,
    revision: geometry.revision || 1,
    geometrySha256,
    scaleStatus: geometry.scale_status || 'unverified',
    verticalDimensionsStatus: approvedVertical ? 'customer_confirmed' : 'unverified',
    storeyHeight,
  });
  project.provenance.requiresConfirmation = !approved2d;
  const base = validateProject(project);
  const readiness = validateProject3dReadiness(project);
  let solid = null;
  if (readiness.ok) solid = projectToSolidContract(project);
  return { contract, project, base, readiness, solid };
}

/** Return an edited browser project to the backend GeometryDocument without promoting evidence. */
export function projectToCanonicalGeometry(project, sourceGeometry) {
  const base = validateProject(project);
  if (!base.ok) throw new TypeError(`Edited project is invalid: ${base.errors.join('; ')}`);
  if (!sourceGeometry || sourceGeometry.units !== 'mm') {
    throw new TypeError('The source canonical geometry is required.');
  }
  const integerPoint = (value, label) => {
    const converted = { x: Math.round(Number(value?.[0])), y: Math.round(Number(value?.[1])) };
    if (!Number.isFinite(converted.x) || !Number.isFinite(converted.y)) {
      throw new TypeError(`${label} contains a non-finite point.`);
    }
    return converted;
  };
  const walls = (project.geometry?.walls || []).map((wall) => ({
    id: wall.id,
    start: integerPoint(wall.path?.start, `Wall ${wall.id}`),
    end: integerPoint(wall.path?.end, `Wall ${wall.id}`),
    thickness: Math.round(Number(wall.thickness)),
    height: Math.round(Number(wall.height)),
    kind: ['structural', 'partition'].includes(wall.structuralClass)
      ? wall.structuralClass : 'unknown',
  }));
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  const sourceOpeningById = new Map(
    (sourceGeometry.openings || []).map((opening) => [opening.id, opening]),
  );
  const supportedSwing = new Set(['left', 'right', 'double', 'sliding', 'none', 'unknown']);
  const openings = (project.geometry?.openings || []).map((opening) => {
    const wall = wallById.get(opening.wallId);
    if (!wall) throw new TypeError(`Opening ${opening.id} has no current host wall.`);
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    const startRatio = Number(opening.span?.startRatio);
    const endRatio = Number(opening.span?.endRatio);
    const canonical = {
      id: opening.id,
      wall_id: opening.wallId,
      kind: (() => {
        if (!['door', 'window', 'opening'].includes(opening.kind)) {
          throw new TypeError(`Opening ${opening.id} has an unsupported canonical kind.`);
        }
        return opening.kind;
      })(),
      offset: Math.round(length * startRatio),
      width: Math.round(length * (endRatio - startRatio)),
      height: Math.round(Number(opening.height)),
      sill: Math.round(Number(opening.sill)),
      swing: supportedSwing.has(opening.handing) ? opening.handing : 'unknown',
    };
    const reviewedUsage = opening.reviewedUsage || 'unspecified';
    const sourceOpening = sourceOpeningById.get(opening.id);
    if (reviewedUsage !== 'unspecified'
      || Object.hasOwn(sourceOpening || {}, 'reviewed_usage')
      || Object.hasOwn(sourceOpening || {}, 'reviewedUsage')) {
      canonical.reviewed_usage = reviewedUsage;
    }
    return canonical;
  });
  const rooms = (project.geometry?.spaces || []).map((space) => ({
    id: space.id,
    name: String(space.name || space.id),
    boundary: (space.boundary || []).map((value) => integerPoint(value, `Room ${space.id}`)),
    function: space.type || null,
  }));
  return {
    schema_version: sourceGeometry.schema_version || '1.0',
    project_id: sourceGeometry.project_id,
    revision: sourceGeometry.revision,
    units: 'mm',
    coordinate_system: sourceGeometry.coordinate_system || 'right_handed_z_up',
    topology_mode: sourceGeometry.topology_mode || 'partitioned_plan',
    level_elevation_mm: sourceGeometry.level_elevation_mm || 0,
    scale_status: sourceGeometry.scale_status,
    walls,
    openings,
    rooms,
  };
}

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

/** Mirror the backend's entity-level canonical diff keys without manufacturing evidence. */
export function canonicalGeometryChanges(sourceGeometry, correctedGeometry) {
  if (!sourceGeometry || !correctedGeometry) throw new TypeError('Source and corrected geometry are required.');
  const changes = [];
  for (const [entityType, key] of [['wall', 'walls'], ['opening', 'openings'], ['room', 'rooms']]) {
    const beforeItems = Array.isArray(sourceGeometry[key]) ? sourceGeometry[key] : [];
    const afterItems = Array.isArray(correctedGeometry[key]) ? correctedGeometry[key] : [];
    const before = new Map(beforeItems.map((item) => [item?.id, item]));
    const after = new Map(afterItems.map((item) => [item?.id, item]));
    if ([...before.keys(), ...after.keys()].some((id) => typeof id !== 'string' || !id)) {
      throw new TypeError(`Every ${entityType} must have an ID before correction evidence can be collected.`);
    }
    if (before.size !== beforeItems.length || after.size !== afterItems.length) {
      throw new TypeError(`Duplicate ${entityType} IDs prevent a deterministic correction diff.`);
    }
    for (const entityId of [...new Set([...before.keys(), ...after.keys()])].sort()) {
      const prior = before.get(entityId);
      const next = after.get(entityId);
      if (!prior) changes.push({ entityType, entityId, operation: 'add' });
      else if (!next) changes.push({ entityType, entityId, operation: 'delete' });
      else if (stableJson(prior) !== stableJson(next)) changes.push({ entityType, entityId, operation: 'update' });
    }
  }
  return changes;
}

/** Resolve only the complete authoritative original-upload binding from authenticated geometry metadata. */
export function geometryCorrectionSourceBinding(geometryReview) {
  const references = geometryReview?.sourceReferences;
  const manifest = Array.isArray(references?.artifactManifest) ? references.artifactManifest : [];
  const manifestMatches = manifest.filter((item) => item?.role === 'original_upload');
  if (manifestMatches.length > 1) throw new TypeError('Geometry metadata contains duplicate original-upload bindings.');
  const legacyCandidates = [
    manifestMatches[0]?.sha256,
    references?.evidenceBinding?.sourceArtifactRole === 'original_upload'
      ? references.evidenceBinding.sourceArtifactSha256 : null,
  ].filter(Boolean);
  const authoritative = geometryReview?.correctionEvidenceSource;
  if (!authoritative || authoritative.role !== 'original_upload'
    || !/^[a-f0-9]{64}$/.test(authoritative.sha256 || '')
    || !['image/png', 'image/jpeg', 'image/webp', 'image/tiff'].includes(authoritative.mediaType)
    || !Number.isInteger(authoritative.byteSize) || authoritative.byteSize <= 0
    || !Number.isInteger(authoritative.intrinsicPixels?.width) || authoritative.intrinsicPixels.width <= 0
    || !Number.isInteger(authoritative.intrinsicPixels?.height) || authoritative.intrinsicPixels.height <= 0
    || !Array.isArray(authoritative.sourceGeometryAncestryVersions)
    || authoritative.sourceGeometryAncestryVersions.length === 0
    || !authoritative.sourceGeometryAncestryVersions.every((version) => Number.isInteger(version) && version >= 1)
    || new Set(authoritative.sourceGeometryAncestryVersions).size !== authoritative.sourceGeometryAncestryVersions.length
    || !Number.isInteger(geometryReview?.geometryVersion) || geometryReview.geometryVersion < 1
    || !authoritative.sourceGeometryAncestryVersions.includes(geometryReview.geometryVersion)) {
    throw new TypeError('The authoritative original-upload correction binding is unavailable or incomplete.');
  }
  if (legacyCandidates.some((digest) => digest !== authoritative.sha256)) {
    throw new TypeError('Geometry metadata contains conflicting original-upload SHA-256 bindings.');
  }
  const pixelMetricRegistration = normalizePixelMetricRegistration(
    authoritative.pixelMetricRegistration,
    {
      sourceArtifactSha256: authoritative.sha256,
      imageWidth: authoritative.intrinsicPixels.width,
      imageHeight: authoritative.intrinsicPixels.height,
      geometrySha256: geometryReview.geometrySha256,
    },
  );
  return Object.freeze({
    sourceArtifactRole: authoritative.role,
    sourceArtifactSha256: authoritative.sha256,
    mediaType: authoritative.mediaType,
    byteSize: authoritative.byteSize,
    intrinsicPixels: Object.freeze({ ...authoritative.intrinsicPixels }),
    sourceGeometryAncestryVersions: Object.freeze([...authoritative.sourceGeometryAncestryVersions]),
    pixelMetricRegistration,
  });
}

/** Validate exact witness coverage and intrinsic source-image bounds before a correction request. */
export function validateCorrectionWitnesses({ changes, evidence, imageWidth, imageHeight } = {}) {
  const errors = [];
  const expected = Array.isArray(changes) ? changes : [];
  const witnesses = Array.isArray(evidence?.witnesses) ? evidence.witnesses : [];
  const key = (item) => `${item?.entityType || ''}\u0000${item?.entityId || ''}\u0000${item?.operation || ''}`;
  const expectedKeys = new Set(expected.map(key));
  const suppliedKeys = witnesses.map(key);
  if (!expected.length) errors.push('At least one canonical geometry change is required.');
  if (new Set(suppliedKeys).size !== suppliedKeys.length) errors.push('Correction witnesses contain a duplicate entity operation.');
  if (suppliedKeys.length !== expectedKeys.size
    || suppliedKeys.some((value) => !expectedKeys.has(value))
    || [...expectedKeys].some((value) => !suppliedKeys.includes(value))) {
    errors.push('Correction witnesses must cover every canonical geometry change exactly once.');
  }
  if (!Number.isInteger(imageWidth) || imageWidth <= 0 || !Number.isInteger(imageHeight) || imageHeight <= 0) {
    errors.push('The verified original upload has no intrinsic pixel dimensions.');
  }
  if (evidence?.sourceArtifactRole !== 'original_upload' || !/^[a-f0-9]{64}$/.test(evidence?.sourceArtifactSha256 || '')) {
    errors.push('Correction evidence is not bound to an exact original-upload SHA-256.');
  }
  if (typeof evidence?.evidenceNote !== 'string' || evidence.evidenceNote.trim().length < 3 || evidence.evidenceNote.length > 2000) {
    errors.push('Correction evidence requires a 3–2000 character note.');
  }
  for (const witness of witnesses) {
    const bounds = witness?.pixelBounds;
    if (!bounds || !['xMin', 'yMin', 'xMax', 'yMax'].every((axis) => Number.isInteger(bounds[axis]))) {
      errors.push(`Witness ${witness?.entityType || '?'}:${witness?.entityId || '?'} has no integer pixel box.`);
      continue;
    }
    if (bounds.xMin < 0 || bounds.yMin < 0 || bounds.xMax <= bounds.xMin || bounds.yMax <= bounds.yMin
      || bounds.xMax > imageWidth || bounds.yMax > imageHeight) {
      errors.push(`Witness ${witness.entityType}:${witness.entityId} falls outside the original upload.`);
    }
    if (typeof witness?.note !== 'string' || witness.note.trim().length < 3 || witness.note.length > 1000) {
      errors.push(`Witness ${witness?.entityType || '?'}:${witness?.entityId || '?'} requires a 3–1000 character note.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function approvedRenderRequest({ workflowState, model, geometry, camera, output, createdAt } = {}) {
  const outputWidth = Number(output?.width || 1024);
  const outputHeight = Number(output?.height || 1024);
  const derivedCamera = camera || wholeUnitCamera(geometry?.geometry, {
    aspectRatio: outputWidth / outputHeight,
  });
  const request = createRenderRequest({
    projectId: workflowState?.projectId,
    projectRevision: geometry?.geometry?.revision,
    geometrySha256: geometry?.geometrySha256,
    modelVersion: model?.modelVersion,
    modelSha256: model?.modelSha256,
    createdAt,
    camera: derivedCamera,
    output,
    scene: { materialRevision: model?.materialVersion },
  });
  const validation = validateRenderRequest(request);
  if (!validation.ok) throw new TypeError(`Render request is invalid: ${validation.errors.join('; ')}`);
  return request;
}

const dot3 = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const cross3 = (left, right) => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];
const normalise3 = (value) => {
  const length = Math.hypot(...value);
  if (!(length > 0)) throw new TypeError('Camera basis contains a zero-length vector.');
  return value.map((axis) => axis / length);
};

/**
 * Return whether a private preview can unlock its associated customer approval control.
 * Artifact identity is checked here as well as in the click handler so a stale async load cannot
 * unlock a newer model or render revision.
 */
export function previewApprovalState({
  loaded = false,
  confirmed = false,
  busy = false,
  artifactVersion,
  artifactSha256,
  currentVersion,
  currentSha256,
} = {}) {
  const sameVersion = Number.isInteger(artifactVersion)
    && artifactVersion >= 1
    && artifactVersion === currentVersion;
  const sameHash = typeof artifactSha256 === 'string'
    && /^[a-f0-9]{64}$/.test(artifactSha256)
    && artifactSha256 === currentSha256;
  const previewReady = loaded === true && sameVersion && sameHash;
  return Object.freeze({
    canConfirm: previewReady && busy !== true,
    canApprove: previewReady && confirmed === true && busy !== true,
  });
}

/**
 * Frame the full canonical unit in glTF/Three Y-up coordinates.
 * Canonical plan (x, y) millimetres maps to glTF (x, z=-y) metres.
 */
export function wholeUnitCamera(geometry, {
  aspectRatio = 1,
  fovDegrees = 50,
  frameMargin = 1.2,
} = {}) {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0 || aspectRatio > 8) {
    throw new TypeError('Whole-unit camera requires a positive output aspect ratio.');
  }
  if (!Number.isFinite(fovDegrees) || fovDegrees < 10 || fovDegrees > 100) {
    throw new TypeError('Whole-unit camera requires a conservative perspective FOV.');
  }
  if (!Number.isFinite(frameMargin) || frameMargin < 1.05 || frameMargin > 2) {
    throw new TypeError('Whole-unit camera frame margin must be between 1.05 and 2.');
  }
  const walls = geometry?.walls || [];
  const points = walls.flatMap((wall) => [point(wall.start || wall.a), point(wall.end || wall.b)])
    .filter(finitePoint);
  if (!points.length) throw new TypeError('Whole-unit camera requires finite wall geometry.');
  const halfThickness = Math.max(0.05, ...walls
    .map((wall) => Number(wall.thickness) / 2000)
    .filter((value) => Number.isFinite(value) && value > 0));
  const minX = Math.min(...points.map((value) => value[0])) / 1000 - halfThickness;
  const maxX = Math.max(...points.map((value) => value[0])) / 1000 + halfThickness;
  const minPlanY = Math.min(...points.map((value) => value[1])) / 1000 - halfThickness;
  const maxPlanY = Math.max(...points.map((value) => value[1])) / 1000 + halfThickness;
  const width = maxX - minX;
  const depth = maxPlanY - minPlanY;
  if (!(width > 0) || !(depth > 0)) throw new TypeError('Whole-unit camera requires a two-dimensional wall envelope.');
  const heights = walls.map((wall) => Number(wall.height) / 1000).filter((value) => value > 0);
  const wallHeight = heights.length ? Math.max(...heights) : 2.8;
  const levelY = Number.isFinite(Number(geometry?.level_elevation_mm))
    ? Number(geometry.level_elevation_mm) / 1000 : 0;
  const minY = levelY;
  const maxY = levelY + wallHeight;
  const round = (value) => Number(value.toFixed(4));
  const centerX = (minX + maxX) / 2;
  const centerPlanY = (minPlanY + maxPlanY) / 2;
  const center = [centerX, (minY + maxY) / 2, -centerPlanY];

  // A stable elevated diagonal view exposes both plan axes. Distance is solved against every
  // bounding-box corner in the final camera basis, including wall height and output aspect.
  const cameraOffset = normalise3([1, 0.82, 1]);
  const forward = cameraOffset.map((value) => -value);
  const right = normalise3(cross3(forward, [0, 1, 0]));
  const cameraUp = normalise3(cross3(right, forward));
  const verticalTan = Math.tan((fovDegrees * Math.PI) / 360);
  const horizontalTan = verticalTan * aspectRatio;
  const corners = [];
  for (const x of [minX, maxX]) {
    for (const y of [minY, maxY]) {
      for (const z of [-maxPlanY, -minPlanY]) corners.push([x, y, z]);
    }
  }
  let distance = 0;
  for (const corner of corners) {
    const offset = corner.map((value, index) => value - center[index]);
    const forwardOffset = dot3(offset, forward);
    distance = Math.max(
      distance,
      (Math.abs(dot3(offset, right)) * frameMargin) / horizontalTan - forwardOffset,
      (Math.abs(dot3(offset, cameraUp)) * frameMargin) / verticalTan - forwardOffset,
      0.25 - forwardOffset,
    );
  }
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new TypeError('Whole-unit camera could not solve a finite framing distance.');
  }
  // Preserve the solved safety margin after serialisation/renderer coordinate conversion.
  distance *= 1.01;
  const position = center.map((value, index) => value + cameraOffset[index] * distance);
  const radius = Math.hypot(width / 2, (maxY - minY) / 2, depth / 2);
  const far = Math.min(5000, Math.max(100, Math.ceil((distance + radius) * 3)));
  return {
    position: position.map(round),
    target: center.map(round),
    up: [0, 1, 0],
    fovDegrees,
    near: 0.05,
    far,
  };
}
