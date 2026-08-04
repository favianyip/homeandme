import { HomeAndMeProjectApi, pollJob } from './journey-api.js';
import { validateRenderRequest } from './journey-render-contract.js';

export const SERVICE_WORKFLOW_SCHEMA = 'hnm-service-workflow/2';
export const SERVICE_WORKFLOW_STORAGE_KEY = 'hnm_service_workflow_v2';

const LEGACY_WORKFLOW_STORAGE_KEYS = Object.freeze(['hnm_service_workflow_v1']);
const MAX_PERSISTED_WORKFLOW_BYTES = 4096;

export const WorkflowPhase = Object.freeze({
  AWAITING_UPLOAD: 'awaiting_upload',
  ANALYSIS_PROCESSING: 'analysis_processing',
  CALIBRATION_REVIEW: 'calibration_review',
  TWO_D_REVIEW: 'two_d_review',
  GEOMETRY_REVIEW: 'geometry_review',
  DIMENSIONS_REVIEW: 'dimensions_review',
  GEOMETRY_APPROVED: 'geometry_approved',
  LAYOUT_PREPARATION: 'layout_preparation',
  LAYOUT_REVIEW: 'layout_review',
  LAYOUT_APPROVED: 'layout_approved',
  MODEL_PROCESSING: 'model_processing',
  MODEL_REVIEW: 'model_review',
  MODEL_APPROVED: 'model_approved',
  RENDER_PROCESSING: 'render_processing',
  RENDER_REVIEW: 'render_review',
  DESIGN_APPROVED: 'design_approved',
  REVISION_REQUIRED: 'revision_required',
  TERMINAL_FAILURE: 'terminal_failure',
  BLOCKED: 'blocked',
});

const SERVER_PHASE = Object.freeze({
  DRAFT: WorkflowPhase.AWAITING_UPLOAD,
  FLOOR_PLAN_UPLOADED: WorkflowPhase.ANALYSIS_PROCESSING,
  ANALYSIS_QUEUED: WorkflowPhase.ANALYSIS_PROCESSING,
  ANALYSING: WorkflowPhase.ANALYSIS_PROCESSING,
  UNCALIBRATED_REVIEW: WorkflowPhase.CALIBRATION_REVIEW,
  TWO_D_REVIEW: WorkflowPhase.TWO_D_REVIEW,
  GEOMETRY_REVIEW: WorkflowPhase.GEOMETRY_REVIEW,
  NEEDS_VERIFICATION: WorkflowPhase.GEOMETRY_REVIEW,
  DIMENSIONS_REVIEW: WorkflowPhase.DIMENSIONS_REVIEW,
  GEOMETRY_APPROVED: WorkflowPhase.GEOMETRY_APPROVED,
  DESIGN_BRIEF_COMPLETE: WorkflowPhase.LAYOUT_PREPARATION,
  LAYOUT_GENERATING: WorkflowPhase.LAYOUT_PREPARATION,
  LAYOUT_READY: WorkflowPhase.LAYOUT_REVIEW,
  LAYOUT_APPROVED: WorkflowPhase.LAYOUT_APPROVED,
  MODEL_GENERATING: WorkflowPhase.MODEL_PROCESSING,
  MODEL_READY: WorkflowPhase.MODEL_REVIEW,
  MODEL_APPROVED: WorkflowPhase.MODEL_APPROVED,
  RENDER_QUEUED: WorkflowPhase.RENDER_PROCESSING,
  RENDERING: WorkflowPhase.RENDER_PROCESSING,
  RENDER_READY: WorkflowPhase.RENDER_REVIEW,
  REVISION_REQUESTED: WorkflowPhase.REVISION_REQUIRED,
  QUOTE_READY: WorkflowPhase.DESIGN_APPROVED,
  QUOTE_APPROVED: WorkflowPhase.DESIGN_APPROVED,
  PAYMENT_PENDING: WorkflowPhase.DESIGN_APPROVED,
  PAID: WorkflowPhase.DESIGN_APPROVED,
  FAILED: WorkflowPhase.TERMINAL_FAILURE,
  CANCELLED: WorkflowPhase.TERMINAL_FAILURE,
});

const ACTIVE_JOB_KIND = Object.freeze({
  [WorkflowPhase.ANALYSIS_PROCESSING]: 'floor_plan_analysis',
  [WorkflowPhase.MODEL_PROCESSING]: 'model_generation',
  [WorkflowPhase.RENDER_PROCESSING]: 'render_generation',
});

const PROPERTY_TYPES = new Set(['hdb', 'ec', 'condo', 'landed']);
const HASH = /^[a-f0-9]{64}$/;
const ACTOR = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const RECOVERY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PERSISTED_JOB_KINDS = new Set(Object.values(ACTIVE_JOB_KIND));
const SWINGS = new Set(['left', 'right', 'double', 'sliding', 'none']);

export class WorkflowGuardError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'WorkflowGuardError';
    this.code = code;
    this.details = details;
  }
}

function guard(condition, code, message, details) {
  if (!condition) throw new WorkflowGuardError(code, message, details);
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function version(value, label) {
  guard(Number.isInteger(value) && value >= 1, 'INVALID_VERSION', `${label} must be a positive integer.`);
  return value;
}

function digest(value, label) {
  guard(typeof value === 'string' && HASH.test(value), 'INVALID_HASH', `${label} must be a lowercase SHA-256 digest.`);
  return value;
}

function recoveryId(value) {
  return typeof value === 'string' && RECOVERY_ID.test(value);
}

function emptyPersistedWorkflow() {
  return { schema: SERVICE_WORKFLOW_SCHEMA, projectId: null, jobs: {} };
}

function persistableWorkflow(value) {
  const persisted = emptyPersistedWorkflow();
  if (!record(value)) return persisted;
  if (recoveryId(value.projectId)) persisted.projectId = value.projectId;
  if (record(value.jobs)) {
    for (const kind of PERSISTED_JOB_KINDS) {
      if (recoveryId(value.jobs[kind])) persisted.jobs[kind] = value.jobs[kind];
    }
  }
  const receipt = value.geometry2dApproval;
  if (record(receipt)
    && Number.isInteger(receipt.sourceGeometryVersion) && receipt.sourceGeometryVersion >= 1
    && typeof receipt.sourceGeometrySha256 === 'string' && HASH.test(receipt.sourceGeometrySha256)
    && Number.isInteger(receipt.version) && receipt.version >= 1
    && typeof receipt.sha256 === 'string' && HASH.test(receipt.sha256)) {
    persisted.geometry2dApproval = {
      sourceGeometryVersion: receipt.sourceGeometryVersion,
      sourceGeometrySha256: receipt.sourceGeometrySha256,
      version: receipt.version,
      sha256: receipt.sha256,
    };
  }
  return persisted;
}

function actorId(value) {
  guard(typeof value === 'string' && value.length <= 128 && ACTOR.test(value), 'INVALID_REVIEWER', 'A valid reviewer actor ID is required.');
  return value;
}

function projectFile(file) {
  guard(file && typeof file.name === 'string' && file.name.trim(), 'INVALID_FLOOR_PLAN', 'A named floor-plan file is required.');
  return file;
}

function exactIds(items, key) {
  if (!Array.isArray(items)) return null;
  const ids = items.map((item) => record(item) && item[key]);
  if (ids.some((id) => typeof id !== 'string' || !id)) return null;
  return new Set(ids).size === ids.length ? new Set(ids) : null;
}

function sameSet(left, right) {
  return left && right && left.size === right.size && [...left].every((item) => right.has(item));
}

function safeLayout(option) {
  const validation = option?.validation;
  return record(option)
    && typeof option.layoutId === 'string'
    && option.layoutId.length > 0
    && validation?.feasible === true
    && Array.isArray(validation.hardConstraintViolations)
    && validation.hardConstraintViolations.length === 0
    && validation.doorSwingCheck === 'passed'
    && validation.circulationCheck === 'passed';
}

function reviewablePlacement(placement) {
  return record(placement)
    && typeof placement.placementId === 'string' && placement.placementId.length > 0
    && typeof placement.assetId === 'string' && placement.assetId.length > 0
    && typeof placement.roomId === 'string' && placement.roomId.length > 0
    && ['x', 'y', 'z', 'rotationDegrees', 'width', 'depth', 'height', 'clearance']
      .every((key) => Number.isInteger(placement[key]))
    && placement.z === 0
    && placement.rotationDegrees === 0
    && placement.width > 0
    && placement.depth > 0
    && placement.height > 0
    && placement.clearance >= 0;
}

function reviewableLayout(option) {
  const placements = option?.placements;
  const placementIds = exactIds(placements, 'placementId');
  return safeLayout(option)
    && HASH.test(option.layoutSha256 || '')
    && typeof option.assetLibraryVersion === 'string'
    && option.assetLibraryVersion.length > 0
    && Array.isArray(placements)
    && placements.length > 0
    && placementIds
    && placements.every(reviewablePlacement);
}

function verticalProposalReceipt(response, currentProject) {
  guard(record(response), 'INVALID_PROPOSAL', 'The service returned no vertical-dimensions review.');
  if (response.projectId !== undefined) {
    guard(response.projectId === currentProject.projectId,
      'PROJECT_BINDING_MISMATCH', 'Vertical dimensions belong to another project.');
  }
  const review = response.verticalDimensionsProposal;
  guard(record(review), 'INVALID_PROPOSAL', 'The service omitted the vertical-dimensions review fields.');
  const proposalVersion = version(response.verticalDimensionsProposalVersion, 'verticalDimensionsProposalVersion');
  const proposalSha256 = digest(response.verticalDimensionsProposalSha256, 'verticalDimensionsProposalSha256');
  const sourceGeometryVersion = version(review.sourceGeometryVersion, 'sourceGeometryVersion');
  const sourceGeometrySha256 = digest(review.sourceGeometrySha256, 'sourceGeometrySha256');
  const geometry2dApprovalVersion = version(review.geometry2dApprovalVersion, 'geometry2dApprovalVersion');
  const geometry2dApprovalSha256 = digest(review.geometry2dApprovalSha256, 'geometry2dApprovalSha256');
  guard(sourceGeometryVersion === currentProject.geometryVersion,
    'STALE_PROPOSAL', 'Vertical dimensions are not bound to the current geometry version.');
  guard(typeof review.evidenceNote === 'string'
    && review.evidenceNote.trim().length >= 10
    && review.evidenceNote.length <= 2000,
  'INVALID_PROPOSAL', 'Vertical measurement evidence is incomplete.');
  guard(Number.isInteger(review.ceilingHeightMm)
    && review.ceilingHeightMm >= 2000
    && review.ceilingHeightMm <= 6000,
  'INVALID_PROPOSAL', 'The reviewed ceiling height is invalid.');
  const wallIds = exactIds(review.wallDimensions, 'wallId');
  guard(wallIds && wallIds.size > 0
    && review.wallDimensions.every((item) => Number.isInteger(item.heightMm)
      && item.heightMm === review.ceilingHeightMm),
  'INVALID_PROPOSAL', 'The reviewed wall heights are incomplete or inconsistent.');
  const openingIds = exactIds(review.openingDimensions, 'openingId')
    || (Array.isArray(review.openingDimensions) && review.openingDimensions.length === 0 ? new Set() : null);
  guard(openingIds && review.openingDimensions.every((item) => Number.isInteger(item.heightMm)
    && item.heightMm >= 100 && item.heightMm <= 6000
    && Number.isInteger(item.sillMm) && item.sillMm >= 0 && item.sillMm <= 5000
    && item.sillMm + item.heightMm <= review.ceilingHeightMm
    && SWINGS.has(item.swing)),
  'INVALID_PROPOSAL', 'The reviewed opening heights, sills or swings are invalid.');
  guard(review.confirmMetricScale === true
    && review.confirmVerticalDimensions === true
    && review.requiresSiteVerification === true,
  'INVALID_PROPOSAL', 'The vertical review is missing mandatory confirmations.');
  if (response.validation !== undefined) {
    guard(record(response.validation)
      && response.validation.valid === true
      && Array.isArray(response.validation.issues)
      && response.validation.issues.length === 0,
    'INVALID_PROPOSAL', 'The proposed measured geometry does not pass service validation.');
  }
  if (response.sourceReferences !== undefined) {
    const sources = response.sourceReferences;
    guard(record(sources)
      && sources.geometryVersion === sourceGeometryVersion
      && sources.geometrySha256 === sourceGeometrySha256
      && sources.geometry2dApprovalVersion === geometry2dApprovalVersion
      && sources.geometry2dApprovalSha256 === geometry2dApprovalSha256,
    'STALE_PROPOSAL', 'Vertical proposal source references do not match its review fields.');
  }
  return {
    version: proposalVersion,
    sha256: proposalSha256,
    review: JSON.parse(JSON.stringify(review)),
    validation: response.validation === undefined ? null : JSON.parse(JSON.stringify(response.validation)),
  };
}

function layoutSetReceipt(response, currentProject, projectId) {
  guard(record(response) && response.projectId === projectId,
    'PROJECT_BINDING_MISMATCH', 'Layout options belong to another project.');
  const optionSetVersion = version(response.optionSetVersion, 'optionSetVersion');
  const optionSetSha256 = digest(response.optionSetSha256, 'optionSetSha256');
  guard(Array.isArray(response.options) && response.options.length > 0,
    'NO_LAYOUTS', 'The service returned no layout options.');
  guard(exactIds(response.options, 'layoutId'), 'INVALID_LAYOUTS', 'Layout IDs must be present and unique.');
  guard(record(response.sourceReferences)
    && response.sourceReferences.geometryVersion === currentProject.approvedGeometryVersion
    && response.sourceReferences.designBriefVersion === currentProject.designBriefVersion,
  'STALE_LAYOUTS', 'Layout options are not bound to the current approved geometry and brief.');
  digest(response.sourceReferences.geometrySha256, 'layout source geometrySha256');
  digest(response.sourceReferences.designBriefSha256, 'layout source designBriefSha256');
  const safeLayoutIds = response.options.filter(reviewableLayout).map((option) => option.layoutId);
  guard(safeLayoutIds.length > 0, 'NO_SAFE_LAYOUTS', 'No fully reviewable layout passed every hard gate.');
  return {
    optionSetVersion,
    optionSetSha256,
    sourceReferences: JSON.parse(JSON.stringify(response.sourceReferences)),
    assetLibraryVersion: response.assetLibraryVersion,
    options: JSON.parse(JSON.stringify(response.options)),
    safeLayoutIds,
  };
}

function eventType(event) {
  return event?.eventType || event?.event_type;
}

function actionsFor(phase, saved) {
  switch (phase) {
    case WorkflowPhase.AWAITING_UPLOAD: return ['upload_floor_plan'];
    case WorkflowPhase.ANALYSIS_PROCESSING: return ['poll_analysis'];
    case WorkflowPhase.CALIBRATION_REVIEW: return ['review_geometry', 'calibrate_geometry'];
    case WorkflowPhase.TWO_D_REVIEW: return [];
    case WorkflowPhase.GEOMETRY_REVIEW: return ['review_geometry', 'approve_geometry_2d'];
    case WorkflowPhase.DIMENSIONS_REVIEW:
      if (saved.verticalProposal?.review) return ['review_geometry', 'review_vertical_dimensions', 'approve_vertical_dimensions'];
      return saved.geometry2dApproval ? ['review_geometry', 'propose_vertical_dimensions'] : ['review_geometry'];
    case WorkflowPhase.GEOMETRY_APPROVED: return ['submit_design_brief'];
    case WorkflowPhase.LAYOUT_PREPARATION: return ['generate_layouts'];
    case WorkflowPhase.LAYOUT_REVIEW:
      return saved.layouts ? ['review_layouts', 'approve_layout'] : ['review_layouts'];
    case WorkflowPhase.LAYOUT_APPROVED: return ['generate_model'];
    case WorkflowPhase.MODEL_PROCESSING: return ['poll_model'];
    case WorkflowPhase.MODEL_REVIEW: return ['review_model', 'approve_model'];
    case WorkflowPhase.MODEL_APPROVED: return ['generate_render'];
    case WorkflowPhase.RENDER_PROCESSING: return ['poll_render'];
    case WorkflowPhase.RENDER_REVIEW: return ['review_renders', 'approve_design'];
    default: return [];
  }
}

/**
 * Create a service-only controller. There is deliberately no demo/sample fallback: a missing or
 * unreachable API is an error and no workflow gate is advanced locally.
 */
export function createJourneyServiceWorkflow({ baseUrl, fetchImpl, storage = globalThis.localStorage, pollOptions } = {}) {
  guard(typeof baseUrl === 'string' && baseUrl, 'SERVICE_REQUIRED', 'A project service base URL is required.');
  const api = new HomeAndMeProjectApi({ baseUrl, fetchImpl, storage });
  return new JourneyServiceWorkflow({ api, storage, pollOptions });
}

export class JourneyServiceWorkflow {
  constructor({ api, storage = globalThis.localStorage, poll = pollJob, pollOptions = {} } = {}) {
    guard(api && typeof api.project === 'function' && typeof api._request === 'function', 'SERVICE_REQUIRED', 'A real HomeAndMeProjectApi-compatible service client is required.');
    guard(typeof poll === 'function', 'INVALID_POLLER', 'A job poller is required.');
    this.api = api;
    this.storage = storage;
    this.poll = poll;
    this.pollOptions = { ...pollOptions };
    this._busy = false;
    this._storageWarning = null;
    this.saved = this._load();
  }

  _load() {
    try {
      for (const key of LEGACY_WORKFLOW_STORAGE_KEYS) {
        if (this.storage?.getItem(key) !== null) {
          this.storage?.removeItem?.(key);
          this._storageWarning = 'Legacy workflow resume data was discarded because it may contain private review details.';
        }
      }
      const raw = this.storage?.getItem(SERVICE_WORKFLOW_STORAGE_KEY);
      if (raw === null || raw === undefined) return emptyPersistedWorkflow();
      if (raw.length > MAX_PERSISTED_WORKFLOW_BYTES) {
        this.storage?.removeItem?.(SERVICE_WORKFLOW_STORAGE_KEY);
        this._storageWarning = 'Oversized workflow resume data was discarded.';
        return emptyPersistedWorkflow();
      }
      const parsed = JSON.parse(raw);
      if (parsed?.schema !== SERVICE_WORKFLOW_SCHEMA) {
        this.storage?.removeItem?.(SERVICE_WORKFLOW_STORAGE_KEY);
        this._storageWarning = 'Outdated workflow resume data was discarded.';
        return emptyPersistedWorkflow();
      }
      const safe = persistableWorkflow(parsed);
      const sanitised = JSON.stringify(safe);
      if (sanitised !== raw) {
        this.storage?.setItem(SERVICE_WORKFLOW_STORAGE_KEY, sanitised);
        this._storageWarning = 'Workflow resume data was reduced to non-sensitive recovery identifiers.';
      }
      return safe;
    } catch (error) {
      this._storageWarning = `Workflow resume data could not be read: ${error.message}`;
      this.storage?.removeItem?.(SERVICE_WORKFLOW_STORAGE_KEY);
    }
    return emptyPersistedWorkflow();
  }

  _persist() {
    try {
      const serialised = JSON.stringify(persistableWorkflow(this.saved));
      guard(serialised.length <= MAX_PERSISTED_WORKFLOW_BYTES,
        'PERSISTENCE_LIMIT', 'Workflow recovery identifiers exceed the local persistence limit.');
      this.storage?.setItem(SERVICE_WORKFLOW_STORAGE_KEY, serialised);
    } catch (error) {
      this._storageWarning = `Workflow resume data could not be saved: ${error.message}`;
    }
  }

  _projectId() {
    const session = typeof this.api.requireSession === 'function'
      ? this.api.requireSession()
      : this.api.session;
    guard(session?.projectId, 'NO_PROJECT_SESSION', 'No saved service project session is available.');
    return session.projectId;
  }

  _bindProject(projectId) {
    guard(recoveryId(projectId), 'INVALID_PROJECT', 'The service returned an invalid project recovery ID.');
    if (this.saved.projectId !== projectId) {
      this.saved = { ...emptyPersistedWorkflow(), projectId };
      this._persist();
    }
  }

  _saveJob(kind, jobId) {
    guard(PERSISTED_JOB_KINDS.has(kind) && recoveryId(jobId),
      'INVALID_JOB', `The ${kind} service did not return a safe recovery job ID.`);
    this.saved.jobs = { ...(this.saved.jobs || {}), [kind]: jobId };
    this._persist();
  }

  async _exclusive(operation) {
    guard(!this._busy, 'WORKFLOW_BUSY', 'Another workflow action is already running.');
    this._busy = true;
    try { return await operation(); } finally { this._busy = false; }
  }

  async _request(path, body) {
    return this.api._request(`/api/v1/projects/${this._projectId()}${path}`, {
      method: 'POST',
      ...(body === undefined ? {} : { body }),
    });
  }

  async _recoverJob(kind) {
    if (this.saved.jobs?.[kind]) return this.saved.jobs[kind];
    const result = await this.api.events();
    const events = Array.isArray(result?.events) ? result.events : [];
    const queued = [...events].reverse().find((event) => eventType(event) === 'job.queued' && event?.payload?.kind === kind);
    if (!queued?.payload?.jobId) return null;
    this._saveJob(kind, queued.payload.jobId);
    return queued.payload.jobId;
  }

  _saveVerticalProposal(response, currentProject) {
    const receipt = verticalProposalReceipt(response, currentProject);
    this.saved.geometry2dApproval = {
      sourceGeometryVersion: receipt.review.sourceGeometryVersion,
      sourceGeometrySha256: receipt.review.sourceGeometrySha256,
      version: receipt.review.geometry2dApprovalVersion,
      sha256: receipt.review.geometry2dApprovalSha256,
    };
    this.saved.verticalProposal = receipt;
    this._persist();
    return receipt;
  }

  _saveLayoutSet(response, currentProject, projectId) {
    const receipt = layoutSetReceipt(response, currentProject, projectId);
    this.saved.layouts = receipt;
    this._persist();
    return receipt;
  }

  async _refresh() {
    const project = await this.api.project();
    const projectId = this._projectId();
    guard(project?.projectId === projectId, 'PROJECT_BINDING_MISMATCH', 'The project dashboard does not match the saved service session.');
    this._bindProject(projectId);
    const phase = SERVER_PHASE[project.state] || WorkflowPhase.BLOCKED;
    const jobKind = ACTIVE_JOB_KIND[phase] || null;
    const jobId = jobKind ? await this._recoverJob(jobKind) : null;
    let recoveryError = null;
    if (phase === WorkflowPhase.DIMENSIONS_REVIEW
      && (!this.saved.geometry2dApproval || Boolean(this.saved.verticalProposal))) {
      try {
        guard(typeof this.api.dimensionProposal === 'function', 'API_CONTRACT_MISSING',
          'The service client cannot recover the measured proposal.');
        this._saveVerticalProposal(await this.api.dimensionProposal(), project);
      } catch (error) {
        recoveryError = error;
      }
    }
    if (phase === WorkflowPhase.LAYOUT_REVIEW) {
      try {
        guard(typeof this.api.layoutOptions === 'function', 'API_CONTRACT_MISSING',
          'The service client cannot recover the current layout option set.');
        this._saveLayoutSet(await this.api.layoutOptions(), project, projectId);
      } catch (error) {
        recoveryError = error;
      }
    }
    let blockedReason = null;
    if (phase === WorkflowPhase.BLOCKED) blockedReason = `Unknown server state: ${project.state || 'missing'}`;
    else if (jobKind && !jobId) blockedReason = `The active ${jobKind} job ID could not be recovered.`;
    else if (phase === WorkflowPhase.DIMENSIONS_REVIEW && !this.saved.geometry2dApproval) blockedReason = `The hash-bound measured review could not be recovered${recoveryError?.message ? `: ${recoveryError.message}` : '.'}`;
    else if (phase === WorkflowPhase.DIMENSIONS_REVIEW && this.saved.verticalProposal && recoveryError) blockedReason = `The current measured proposal could not be revalidated: ${recoveryError.message}`;
    else if (phase === WorkflowPhase.DIMENSIONS_REVIEW && this.saved.verticalProposal && !this.saved.verticalProposal.review) blockedReason = 'The saved measured proposal lacks its customer-review evidence and cannot be approved.';
    else if (phase === WorkflowPhase.LAYOUT_REVIEW && !this.saved.layouts) blockedReason = `The current layout option set could not be recovered without regeneration${recoveryError?.message ? `: ${recoveryError.message}` : '.'}`;
    else if (phase === WorkflowPhase.LAYOUT_REVIEW && recoveryError) blockedReason = `The current layout option set could not be revalidated: ${recoveryError.message}`;
    else if (phase === WorkflowPhase.CALIBRATION_REVIEW) blockedReason = 'Metric calibration must be completed in the dedicated calibration review.';
    else if (phase === WorkflowPhase.TWO_D_REVIEW) blockedReason = 'The native/vector proposal must be accepted in the dedicated 2D review.';
    else if (phase === WorkflowPhase.TERMINAL_FAILURE) blockedReason = `The project is ${String(project.state).toLowerCase()}; no automatic fallback is allowed.`;
    return {
      schema: SERVICE_WORKFLOW_SCHEMA,
      projectId,
      serverState: project.state,
      phase,
      activeJob: jobId ? { kind: jobKind, jobId } : null,
      actions: blockedReason && phase !== WorkflowPhase.CALIBRATION_REVIEW
        ? [] : actionsFor(phase, this.saved),
      blocked: Boolean(blockedReason),
      blockedReason,
      persistenceWarning: this._storageWarning,
      renderCapture: this.saved.renderCapture ? { ...this.saved.renderCapture } : null,
      project,
    };
  }

  async resume() {
    return this._exclusive(() => this._refresh());
  }

  async createProject({ propertyType = 'hdb', postalCode = null, levels = 1 } = {}) {
    return this._exclusive(async () => {
      guard(!this.api.session?.projectId, 'EXISTING_PROJECT', 'A project session already exists; resume it instead of replacing it.');
      guard(PROPERTY_TYPES.has(propertyType), 'INVALID_PROPERTY', 'Unsupported property type.');
      guard(postalCode === null || /^\d{6}$/.test(postalCode), 'INVALID_POSTAL_CODE', 'Postal code must be null or six digits.');
      guard(Number.isInteger(levels) && levels >= 1 && levels <= 10, 'INVALID_LEVELS', 'Levels must be an integer from 1 to 10.');
      const created = await this.api.createProject(propertyType, postalCode, levels);
      guard(typeof created?.projectId === 'string' && created.projectId, 'INVALID_PROJECT', 'The service did not return a project ID.');
      this._bindProject(created.projectId);
      return this._refresh();
    });
  }

  async uploadFloorPlan(file) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.AWAITING_UPLOAD, 'WRONG_PHASE', 'Floor-plan upload is allowed only for a draft project.', current);
      const job = await this.api.uploadFloorPlan(projectFile(file));
      this._saveJob('floor_plan_analysis', job?.jobId);
      return this._refresh();
    });
  }

  async start({ file, propertyType = 'hdb', postalCode = null, levels = 1, onProgress = () => {}, pollOptions = {} } = {}) {
    return this._exclusive(async () => {
      guard(!this.api.session?.projectId, 'EXISTING_PROJECT', 'A project session already exists; resume it instead of replacing it.');
      guard(PROPERTY_TYPES.has(propertyType), 'INVALID_PROPERTY', 'Unsupported property type.');
      guard(postalCode === null || /^\d{6}$/.test(postalCode), 'INVALID_POSTAL_CODE', 'Postal code must be null or six digits.');
      guard(Number.isInteger(levels) && levels >= 1 && levels <= 10, 'INVALID_LEVELS', 'Levels must be an integer from 1 to 10.');
      projectFile(file);
      const created = await this.api.createProject(propertyType, postalCode, levels);
      guard(typeof created?.projectId === 'string' && created.projectId, 'INVALID_PROJECT', 'The service did not return a project ID.');
      this._bindProject(created.projectId);
      const job = await this.api.uploadFloorPlan(file);
      this._saveJob('floor_plan_analysis', job?.jobId);
      await this.poll(this.api, job.jobId, onProgress, { ...this.pollOptions, ...pollOptions });
      return this._refresh();
    });
  }

  async waitForActiveJob({ onProgress = () => {}, pollOptions = {} } = {}) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.activeJob?.jobId, 'NO_ACTIVE_JOB', 'There is no resumable active job for this project.', current);
      await this.poll(this.api, current.activeJob.jobId, onProgress, { ...this.pollOptions, ...pollOptions });
      return this._refresh();
    });
  }

  async reviewGeometry() {
    return this._exclusive(async () => this._reviewGeometry());
  }

  async _reviewGeometry() {
    const current = await this._refresh();
    guard(current.phase === WorkflowPhase.CALIBRATION_REVIEW
      || current.phase === WorkflowPhase.GEOMETRY_REVIEW
      || current.phase === WorkflowPhase.DIMENSIONS_REVIEW,
    'WRONG_PHASE', 'Geometry is not ready for customer review.', current);
    const review = await this.api.geometry();
    guard(review?.projectId === current.projectId, 'PROJECT_BINDING_MISMATCH', 'Geometry belongs to another project.');
    version(review.geometryVersion, 'geometryVersion');
    digest(review.geometrySha256, 'geometrySha256');
    guard(review.geometryVersion === current.project.geometryVersion, 'STALE_GEOMETRY', 'Geometry review is not the current server version.');
    guard(record(review.geometry) && review.geometry.units === 'mm', 'INVALID_GEOMETRY', 'Only canonical millimetre geometry can enter approval.');
    return review;
  }

  async calibrateGeometry({ referenceWallId, measuredLengthMm, evidenceNote } = {}) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.CALIBRATION_REVIEW, 'WRONG_PHASE', 'Metric calibration is not awaiting review.', current);
      guard(typeof referenceWallId === 'string' && referenceWallId, 'INVALID_REFERENCE_WALL', 'Choose a current reference wall.');
      guard(Number.isInteger(measuredLengthMm) && measuredLengthMm >= 100 && measuredLengthMm <= 100000,
        'INVALID_MEASUREMENT', 'Known wall length must be an integer from 100 to 100000 mm.');
      guard(typeof evidenceNote === 'string' && evidenceNote.trim().length >= 3 && evidenceNote.length <= 1000,
        'INVALID_EVIDENCE', 'Calibration evidence must contain 3 to 1000 characters.');
      const review = await this._reviewGeometry();
      guard((review.geometry.walls || []).some((wall) => wall.id === referenceWallId),
        'INVALID_REFERENCE_WALL', 'The reference wall is not part of the current geometry revision.');
      const calibrated = await this.api.calibrateGeometry(
        review.geometryVersion,
        review.geometrySha256,
        referenceWallId,
        measuredLengthMm,
        evidenceNote.trim(),
      );
      guard(calibrated?.projectId === current.projectId
        && calibrated.geometryVersion > review.geometryVersion
        && calibrated.geometry?.scale_status === 'customer_confirmed',
      'INVALID_TRANSITION', 'Calibration did not publish a new customer-confirmed geometry revision.');
      return this._refresh();
    });
  }

  async approveGeometry2d({ geometryVersion, geometrySha256, reviewerActorId, confirmMetricScale, confirmWallsRoomsOpenings } = {}) {
    return this._exclusive(async () => {
      guard(confirmMetricScale === true && confirmWallsRoomsOpenings === true, 'CONFIRMATION_REQUIRED', 'Metric scale, walls, rooms and openings must all be explicitly confirmed.');
      actorId(reviewerActorId);
      const review = await this._reviewGeometry();
      guard(review.geometry.scale_status === 'customer_confirmed', 'UNVERIFIED_SCALE', 'The canonical geometry scale must be customer-confirmed before 2D approval.');
      guard(record(review.validation)
        && review.validation.valid === true
        && Array.isArray(review.validation.issues)
        && review.validation.issues.length === 0,
      'GEOMETRY_BLOCKED', 'Server validation still reports wall, opening or room blockers.', review.validation);
      guard(review.geometryVersion === version(geometryVersion, 'geometryVersion') && review.geometrySha256 === digest(geometrySha256, 'geometrySha256'), 'STALE_GEOMETRY', 'Approval must target the geometry version and hash currently shown to the reviewer.');
      const approved = await this._request('/geometry/approve', {
        geometryVersion, geometrySha256, reviewerActorId,
        confirmMetricScale: true,
        confirmWallsRoomsOpenings: true,
      });
      guard(approved?.state === 'DIMENSIONS_REVIEW', 'INVALID_TRANSITION', '2D approval did not enter vertical-dimensions review.');
      const receipt = {
        sourceGeometryVersion: geometryVersion,
        sourceGeometrySha256: geometrySha256,
        version: version(approved.geometry2dApprovalVersion, 'geometry2dApprovalVersion'),
        sha256: digest(approved.geometry2dApprovalSha256, 'geometry2dApprovalSha256'),
      };
      this.saved.geometry2dApproval = receipt;
      delete this.saved.verticalProposal;
      this._persist();
      return this._refresh();
    });
  }

  async proposeVerticalDimensions({ reviewerActorId, evidenceNote, ceilingHeightMm, wallDimensions, openingDimensions = [], confirmMetricScale, confirmVerticalDimensions, requiresSiteVerification } = {}) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.DIMENSIONS_REVIEW, 'WRONG_PHASE', 'Vertical dimensions can be proposed only after 2D approval.', current);
      guard(this.saved.geometry2dApproval, 'MISSING_APPROVAL_RECEIPT', 'The hash-bound 2D approval receipt is required.');
      actorId(reviewerActorId);
      guard(typeof evidenceNote === 'string' && evidenceNote.trim().length >= 10 && evidenceNote.length <= 2000, 'INVALID_EVIDENCE', 'Vertical-dimension evidence must contain at least 10 characters.');
      guard(Number.isInteger(ceilingHeightMm) && ceilingHeightMm >= 2000 && ceilingHeightMm <= 6000, 'INVALID_DIMENSIONS', 'Ceiling height must be an integer from 2000 to 6000 mm.');
      guard(confirmMetricScale === true && confirmVerticalDimensions === true && requiresSiteVerification === true, 'CONFIRMATION_REQUIRED', 'Metric scale, vertical dimensions and site-verification status must be explicitly confirmed.');
      const review = await this._reviewGeometry();
      const receipt = this.saved.geometry2dApproval;
      guard(receipt.sourceGeometryVersion === review.geometryVersion && receipt.sourceGeometrySha256 === review.geometrySha256, 'STALE_GEOMETRY', 'The 2D approval receipt is not bound to the current geometry.');
      const geometryWallIds = exactIds(review.geometry.walls || [], 'id');
      const submittedWallIds = exactIds(wallDimensions, 'wallId');
      guard(sameSet(geometryWallIds, submittedWallIds), 'INCOMPLETE_DIMENSIONS', 'Wall dimensions must cover every current wall exactly once.');
      guard(wallDimensions.every((item) => Number.isInteger(item.heightMm) && item.heightMm === ceilingHeightMm), 'INVALID_DIMENSIONS', 'Every wall height must equal the confirmed ceiling height.');
      const geometryOpeningIds = exactIds(review.geometry.openings || [], 'id') || new Set();
      const submittedOpeningIds = exactIds(openingDimensions, 'openingId') || (openingDimensions.length === 0 ? new Set() : null);
      guard(sameSet(geometryOpeningIds, submittedOpeningIds), 'INCOMPLETE_DIMENSIONS', 'Opening dimensions must cover every current opening exactly once.');
      guard(openingDimensions.every((item) => Number.isInteger(item.heightMm) && item.heightMm >= 100 && item.heightMm <= 6000
        && Number.isInteger(item.sillMm) && item.sillMm >= 0 && item.sillMm <= 5000
        && item.sillMm + item.heightMm <= ceilingHeightMm && SWINGS.has(item.swing)), 'INVALID_DIMENSIONS', 'Opening dimensions or swing values are invalid.');
      const proposed = await this._request('/dimensions/propose', {
        sourceGeometryVersion: review.geometryVersion,
        sourceGeometrySha256: review.geometrySha256,
        geometry2dApprovalVersion: receipt.version,
        geometry2dApprovalSha256: receipt.sha256,
        reviewerActorId,
        evidenceNote: evidenceNote.trim(),
        ceilingHeightMm,
        wallDimensions,
        openingDimensions,
        confirmMetricScale: true,
        confirmVerticalDimensions: true,
        requiresSiteVerification: true,
      });
      guard(proposed?.state === 'DIMENSIONS_REVIEW', 'INVALID_TRANSITION', 'Vertical proposal unexpectedly advanced the project.');
      this._saveVerticalProposal(proposed, current.project);
      return { proposal: { ...this.saved.verticalProposal }, workflow: await this._refresh() };
    });
  }

  async approveVerticalDimensions({ proposalVersion, proposalSha256, reviewerActorId, confirmVerticalDimensions } = {}) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.DIMENSIONS_REVIEW, 'WRONG_PHASE', 'Vertical dimensions are not awaiting approval.', current);
      guard(confirmVerticalDimensions === true, 'CONFIRMATION_REQUIRED', 'The reviewed vertical-dimensions proposal must be explicitly confirmed.');
      actorId(reviewerActorId);
      const saved = this.saved.verticalProposal;
      guard(saved?.review && saved.version === version(proposalVersion, 'proposalVersion') && saved.sha256 === digest(proposalSha256, 'proposalSha256'), 'STALE_PROPOSAL', 'Approval must target the exact proposal and review evidence shown to the customer.');
      guard(typeof this.api.dimensionProposal === 'function', 'API_CONTRACT_MISSING', 'The service client cannot revalidate the measured proposal.');
      const recovered = verticalProposalReceipt(await this.api.dimensionProposal(), current.project);
      guard(recovered.version === saved.version && recovered.sha256 === saved.sha256
        && JSON.stringify(recovered.review) === JSON.stringify(saved.review),
      'STALE_PROPOSAL', 'The service proposal no longer matches the review evidence shown to the customer.');
      const approved = await this._request('/dimensions/approve', { proposalVersion, proposalSha256, reviewerActorId });
      guard(approved?.state === 'GEOMETRY_APPROVED' && approved.approvedGeometryVersion, 'INVALID_TRANSITION', 'Vertical approval did not publish approved geometry.');
      delete this.saved.verticalProposal;
      delete this.saved.geometry2dApproval;
      this._persist();
      return this._refresh();
    });
  }

  async submitDesignBrief(brief) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.GEOMETRY_APPROVED, 'WRONG_PHASE', 'A design brief requires approved geometry.', current);
      guard(record(brief), 'INVALID_DESIGN_BRIEF', 'A customer design brief is required.');
      const result = await this.api.putDesignBrief(brief);
      guard(result?.state === 'DESIGN_BRIEF_COMPLETE' && result.designBriefVersion, 'INVALID_TRANSITION', 'The design brief was not versioned by the service.');
      delete this.saved.layouts;
      delete this.saved.approvedLayout;
      delete this.saved.renderCapture;
      this._persist();
      return this._refresh();
    });
  }

  async generateLayouts() {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.LAYOUT_PREPARATION, 'WRONG_PHASE', 'Layouts require a completed design brief.', current);
      const result = await this.api.generateLayouts();
      const receipt = this._saveLayoutSet(result, {
        ...current.project,
        // The dashboard deliberately exposes no option-set pointer; the newly returned version is
        // the current pointer established by this mutation.
      }, current.projectId);
      return { layouts: result, safeLayoutIds: [...receipt.safeLayoutIds], workflow: await this._refresh() };
    });
  }

  async reviewLayouts() {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.LAYOUT_REVIEW, 'WRONG_PHASE', 'Layout options are not ready for review.', current);
      guard(this.saved.layouts, 'MISSING_LAYOUT_OPTIONS', 'The current layout option set cannot be recovered safely on this device.');
      return {
        optionSetVersion: this.saved.layouts.optionSetVersion,
        optionSetSha256: this.saved.layouts.optionSetSha256,
        sourceReferences: JSON.parse(JSON.stringify(this.saved.layouts.sourceReferences)),
        assetLibraryVersion: this.saved.layouts.assetLibraryVersion,
        options: this.saved.layouts.options,
        safeLayoutIds: [...this.saved.layouts.safeLayoutIds],
      };
    });
  }

  async approveLayout({ layoutId, reviewerActorId, confirmLayout } = {}) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.LAYOUT_REVIEW, 'WRONG_PHASE', 'No layout is awaiting approval.', current);
      guard(confirmLayout === true, 'CONFIRMATION_REQUIRED', 'The selected layout must be explicitly confirmed.');
      actorId(reviewerActorId);
      guard(this.saved.layouts?.safeLayoutIds?.includes(layoutId), 'UNSAFE_LAYOUT', 'Only a layout that passed all hard gates can be approved.');
      guard(typeof this.api.layoutOptions === 'function', 'API_CONTRACT_MISSING', 'The service client cannot revalidate the selected layout.');
      const recovered = layoutSetReceipt(await this.api.layoutOptions(), current.project, current.projectId);
      const saved = this.saved.layouts;
      guard(recovered.optionSetVersion === saved.optionSetVersion
        && recovered.optionSetSha256 === saved.optionSetSha256,
      'STALE_LAYOUTS', 'The service option set no longer matches the set shown to the customer.');
      const selected = recovered.options.find((option) => option.layoutId === layoutId);
      guard(reviewableLayout(selected), 'UNSAFE_LAYOUT', 'The selected layout no longer has complete review evidence.');
      const approved = await this._request(`/layouts/${encodeURIComponent(layoutId)}/approve`, { reviewerActorId });
      guard(approved?.state === 'LAYOUT_APPROVED' && approved.layoutVersion, 'INVALID_TRANSITION', 'Layout approval did not produce an approved layout version.');
      this.saved.approvedLayout = { layoutId, version: approved.layoutVersion, sha256: digest(approved.layoutSha256, 'layoutSha256') };
      this._persist();
      return this._refresh();
    });
  }

  async generateModel() {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.LAYOUT_APPROVED, 'WRONG_PHASE', 'Model generation requires an approved layout.', current);
      const job = await this.api.generateModel();
      delete this.saved.renderCapture;
      this._saveJob('model_generation', job?.jobId);
      return this._refresh();
    });
  }

  async reviewModel() {
    return this._exclusive(async () => this._reviewModel());
  }

  async _reviewModel() {
    const current = await this._refresh();
    guard(current.phase === WorkflowPhase.MODEL_REVIEW, 'WRONG_PHASE', 'The model is not ready for review.', current);
    const model = await this.api.model();
    guard(model?.modelVersion === current.project.modelVersion, 'STALE_MODEL', 'The model is not the current server version.');
    digest(model.modelSha256, 'modelSha256');
    guard(model.geometryVersion === current.project.approvedGeometryVersion
      && model.layoutVersion === current.project.approvedLayoutVersion
      && model.designBriefVersion === current.project.designBriefVersion, 'STALE_MODEL', 'The model is not bound to every current approved source.');
    const declaredRoles = [model.glbArtifactRole, model.sceneArtifactRole, ...(model.previewArtifactRoles || [])];
    guard(typeof model.materialVersion === 'string' && model.materialVersion.length > 0
      && typeof model.glbArtifactRole === 'string' && typeof model.sceneArtifactRole === 'string'
      && Array.isArray(model.previewArtifactRoles) && model.previewArtifactRoles.length === 4
      && declaredRoles.every((role) => typeof role === 'string' && role)
      && new Set(declaredRoles).size === declaredRoles.length, 'INVALID_MODEL_ARTIFACTS', 'The model artifact contract is incomplete.');
    return model;
  }

  async approveModel({ modelVersion, modelSha256, reviewerActorId, confirmLayoutAndModel } = {}) {
    return this._exclusive(async () => {
      guard(confirmLayoutAndModel === true, 'CONFIRMATION_REQUIRED', 'The reviewed layout and model must be explicitly confirmed.');
      actorId(reviewerActorId);
      const model = await this._reviewModel();
      guard(model.modelVersion === version(modelVersion, 'modelVersion') && model.modelSha256 === digest(modelSha256, 'modelSha256'), 'STALE_MODEL', 'Approval must target the exact model version and hash shown for review.');
      guard(typeof this.api.approveModel === 'function', 'API_CONTRACT_MISSING', 'The service client has no hash-bound model approval method.');
      const approved = await this.api.approveModel(modelVersion, modelSha256, reviewerActorId);
      guard(approved?.state === 'MODEL_APPROVED' && approved.approvedModelVersion === modelVersion, 'INVALID_TRANSITION', 'Model approval did not bind the current model.');
      delete this.saved.renderCapture;
      this._persist();
      return this._refresh();
    });
  }

  async captureRenderInputs({ color, depth, viewerState = {} } = {}) {
    // Future-only evidence API. The current deterministic Blender renderer does not consume it.
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.MODEL_APPROVED, 'WRONG_PHASE', 'Viewer capture requires an approved current model.', current);
      guard(typeof this.api.uploadViewerCapture === 'function', 'API_CONTRACT_MISSING', 'The service client has no viewer-capture method.');
      guard(record(viewerState), 'INVALID_VIEWER_STATE', 'Viewer state must be an object.');
      const model = await this.api.model();
      guard(model?.modelVersion === current.project.approvedModelVersion && model.modelSha256, 'STALE_MODEL', 'Viewer capture is not bound to the approved current model.');
      const capture = await this.api.uploadViewerCapture(color, depth, viewerState);
      const binding = capture?.sourceBinding;
      guard(capture?.projectId === current.projectId
        && binding?.projectId === current.projectId
        && binding.geometryVersion === current.project.approvedGeometryVersion
        && binding.geometrySha256 === model.geometrySha256
        && binding.layoutVersion === current.project.approvedLayoutVersion
        && binding.designBriefVersion === current.project.designBriefVersion
        && binding.modelVersion === current.project.approvedModelVersion
        && binding.modelSha256 === model.modelSha256, 'CAPTURE_BINDING_MISMATCH', 'Viewer capture is not bound to every approved project source.');
      guard(typeof capture.captureId === 'string' && capture.captureId
        && typeof capture.colorArtifactRole === 'string' && capture.colorArtifactRole
        && typeof capture.depthArtifactRole === 'string' && capture.depthArtifactRole
        && typeof capture.viewerStateArtifactRole === 'string' && capture.viewerStateArtifactRole,
      'INVALID_CAPTURE', 'The viewer-capture artifact contract is incomplete.');
      this.saved.renderCapture = {
        captureId: capture.captureId,
        colorArtifactRole: capture.colorArtifactRole,
        depthArtifactRole: capture.depthArtifactRole,
        viewerStateArtifactRole: capture.viewerStateArtifactRole,
        sourceBinding: binding,
      };
      this._persist();
      return { capture, workflow: await this._refresh() };
    });
  }

  async generateRenders({ renderRequest } = {}) {
    return this._exclusive(async () => {
      const current = await this._refresh();
      guard(current.phase === WorkflowPhase.MODEL_APPROVED, 'WRONG_PHASE', 'Rendering requires an approved current model.', current);
      guard(record(renderRequest), 'MISSING_RENDER_REQUEST', 'A deterministic render request is required.');
      const validation = validateRenderRequest(renderRequest);
      guard(validation.ok, 'INVALID_RENDER_REQUEST', 'Render request failed contract validation.', validation.errors);
      guard(renderRequest.projectId === current.projectId, 'PROJECT_BINDING_MISMATCH', 'Render request belongs to another project.');
      digest(renderRequest.geometrySha256, 'render geometrySha256');
      digest(renderRequest.modelSha256, 'render modelSha256');
      const [model, geometry] = await Promise.all([this.api.model(), this.api.geometry()]);
      guard(model?.modelVersion === current.project.approvedModelVersion
        && model.modelVersion === renderRequest.modelVersion
        && model.modelSha256 === renderRequest.modelSha256,
      'STALE_RENDER_REQUEST', 'Render request is not bound to the current approved model.');
      guard(geometry?.projectId === current.projectId
        && geometry.geometryVersion === current.project.approvedGeometryVersion
        && geometry.geometrySha256 === renderRequest.geometrySha256
        && model.geometryVersion === geometry.geometryVersion
        && model.geometrySha256 === geometry.geometrySha256
        && geometry.geometry?.revision === renderRequest.projectRevision,
      'STALE_RENDER_REQUEST', 'Render request is not bound to the approved geometry revision.');
      guard(renderRequest.scene.materialRevision === model.materialVersion,
        'STALE_RENDER_REQUEST', 'Render request material revision does not match the approved model.');
      const job = await this.api.generateRenders(renderRequest);
      this._saveJob('render_generation', job?.jobId);
      return this._refresh();
    });
  }

  async reviewRenders() {
    return this._exclusive(async () => this._reviewRenders());
  }

  async _reviewRenders() {
    const current = await this._refresh();
    guard(current.phase === WorkflowPhase.RENDER_REVIEW, 'WRONG_PHASE', 'Renders are not ready for review.', current);
    const renders = await this.api.renders();
    guard(renders?.projectId === current.projectId && renders.renderVersion === current.project.renderVersion, 'STALE_RENDERS', 'The render set is not the current server version.');
    guard(renders.schema === 'hnm-render-set/1'
      && renders.renderer?.id === 'blender-approved-scene/1'
      && renders.aiPostProcessing === null
      && Array.isArray(renders.externalConditioningConsumed)
      && renders.externalConditioningConsumed.length === 0
      && typeof renders.renderSetId === 'string' && renders.renderSetId.length >= 8
      && Array.isArray(renders.views) && renders.views.length === 1
      && renders.views[0]?.name === 'requested-camera'
      && typeof renders.views[0]?.artifactRole === 'string' && renders.views[0].artifactRole,
    'INVALID_RENDERS', 'The deterministic render artifact set is incomplete.');
    return renders;
  }

  async approveDesign({ renderSetId, confirmDesign } = {}) {
    return this._exclusive(async () => {
      guard(confirmDesign === true, 'CONFIRMATION_REQUIRED', 'The reviewed render set must be explicitly confirmed.');
      const renders = await this._reviewRenders();
      guard(renderSetId === renders.renderSetId, 'STALE_RENDERS', 'Design approval must target the current render set.');
      const approved = await this.api.approveDesign(renderSetId);
      guard(approved?.approvedDesignVersion && ['QUOTE_READY', 'QUOTE_APPROVED', 'PAYMENT_PENDING', 'PAID'].includes(approved.state), 'INVALID_TRANSITION', 'Design approval did not publish an approved design version.');
      return this._refresh();
    });
  }
}
