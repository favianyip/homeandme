import {
  canonicalShellJson,
  sha256Hex,
} from './journey-shell-review.js';
import {
  PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
  validateApprovedGeometryReview,
  validatePrivateShellRelease,
} from './journey-shell-customer-workflow.js';

/**
 * Private continuation from an approved bare shell + functional brief to a measured layout.
 *
 * This module is intentionally absent from ProjectJourney.html and the public deployment list.
 * It consumes no source pixels or artifact bytes. It only crosses the existing private API after
 * the caller supplies the exact in-memory shell-approval receipt returned by approveShell().
 */
export const PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED = false;
export const PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA =
  'homeandme-private-functional-layout-workflow/1';
export const PRIVATE_FUNCTIONAL_LAYOUT_REVIEW_SCHEMA =
  'homeandme-private-functional-layout-review/1';
export const CURRENT_APPROVED_FUNCTIONAL_LAYOUT_SCHEMA =
  'spatialforge-current-approved-functional-layout/1';
export const PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA =
  'homeandme-private-design-selection-handoff/1';

const HASH = /^[a-f0-9]{64}$/;
const RELEASE_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const CONTROL = /[\u0000-\u001f\u007f]/u;
const FUNCTIONAL_TYPES = Object.freeze([
  'practical',
  'storage_optimised',
  'circulation_reserve',
]);
const DOWNSTREAM_CAPABILITIES = Object.freeze([
  'DESIGN_SELECTION',
  'FURNISHED_MODEL',
  'AI_RENDERING',
  'QUOTATION',
  'PAYMENTS',
]);
const OPTION_SET_KEYS = Object.freeze([
  'projectId', 'optionSetVersion', 'optionSetSha256', 'sourceReferences',
  'assetLibraryVersion', 'assetLibrarySha256', 'sourceEvidence', 'ranking', 'options',
]);
const SOURCE_REFERENCE_KEYS = Object.freeze([
  'workflowContract', 'sourceArtifactSha256', 'sourceRegistrationSha256',
  'geometryVersion', 'geometrySha256', 'wholeUnitTopologySha256',
  'shellModelVersion', 'shellModelSha256', 'shellModelApprovalVersion',
  'shellModelApprovalSha256', 'furnitureBriefVersion', 'furnitureBriefSha256',
]);
const SOURCE_EVIDENCE_KEYS = Object.freeze([
  'contract', 'geometrySha256', 'assetLibraryVersion', 'assetLibrarySha256',
  'roomProgrammeContract', 'operationalEnvelopeContract',
  'pairwiseClearanceContract', 'physicalRoomContract', 'circulationContract',
  'useZoneContract', 'windowAccessContract', 'furnitureBriefSha256',
  'functionalInputPolicyContract',
]);
const RANKING_KEYS = Object.freeze([
  'schemaVersion', 'engineVersion', 'status', 'recommendedLayoutId',
  'orderedLayoutIds', 'distinctSpatialOptionCount', 'notScoredBriefFields',
  'scoreMeaning', 'assetScope', 'learnedModelUsed',
]);
const OPTION_KEYS = Object.freeze([
  'type', 'assetLibraryVersion', 'assetLibrarySha256', 'sourceEvidence',
  'roomProgramme', 'placements', 'warnings', 'solver', 'validation', 'scorecard',
  'rank', 'recommended', 'layoutSha256', 'layoutId',
]);
const PLACEMENT_KEYS = Object.freeze([
  'placementId', 'assetId', 'roomId', 'x', 'y', 'z', 'rotationDegrees',
  'width', 'depth', 'height', 'clearance', 'operationalClearanceMm', 'useSides',
  'useZonePolicy', 'useSideGroups', 'representation',
]);
const APPROVED_RECOVERY_KEYS = Object.freeze([
  'schema', 'projectId', 'workflowContract', 'state', 'sourceReferences',
  'optionSetVersion', 'optionSetSha256', 'selectedOption', 'approvedLayout',
  'approvalActor', 'approvalActorSha256', 'privateContinuationLocks',
  'customerReleaseEligible', 'recoveryReceiptSha256',
]);
const APPROVAL_ACTOR_KEYS = Object.freeze([
  'schemaVersion', 'actorId', 'provider', 'subjectSha256', 'roles',
  'credentialTransport', 'identityVerified', 'professionalIdentityVerified',
  'claimedActorId', 'claimAcceptedAsProfessionalIdentity',
]);
const PRIVATE_CONTINUATION_LOCK_KEYS = Object.freeze([
  'designSelection', 'furnishedModel', 'deterministicRender', 'quotation', 'payment',
]);
const PRIVATE_MEDIA_KEY = /^(?:url|uri|path|filePath|filename|mediaUrl|imageUrl|blobUrl|base64|bytes|sourceImageUrl|signedUrl|artifactUrl)$/iu;
const PRIVATE_MEDIA_VALUE = /(?:https?:\/\/|blob:|data:|file:|\/home\/|[A-Za-z]:\\Users\\)/iu;

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function fail(message) {
  throw new TypeError(`Private functional layout unavailable: ${message}`);
}

function exactKeys(value, expected, label) {
  if (!record(value)
    || Object.keys(value).sort().join('\u0000') !== [...expected].sort().join('\u0000')) {
    fail(`${label} is missing fields or contains unreviewed data.`);
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${label} is not a SHA-256 digest.`);
  return value;
}

function safeId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${label} is invalid.`);
  return value;
}

function version(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} is not a positive version.`);
  return value;
}

function integer(value, label, minimum = Number.MIN_SAFE_INTEGER, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label} is outside the supported range.`);
  }
  return value;
}

function same(actual, expected, label) {
  if (actual !== expected) fail(`${label} lost its exact upstream binding.`);
}

function cloneFrozen(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFrozen));
  if (!record(value)) return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneFrozen(child)]),
  ));
}

async function canonicalDigest(value) {
  return sha256Hex(new TextEncoder().encode(canonicalShellJson(value)));
}

function sameMembers(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && [...left].sort().join('\u0000') === [...right].sort().join('\u0000');
}

function uniqueIds(items, key, label) {
  if (!Array.isArray(items)) fail(`${label} ledger is missing.`);
  const ids = items.map((item) => safeId(item?.[key], `${label} ID`));
  if (new Set(ids).size !== ids.length) fail(`${label} IDs are duplicated.`);
  return ids;
}

function safeDisplayText(value, label, maximum = 600) {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum
    || CONTROL.test(value) || PRIVATE_MEDIA_VALUE.test(value)) {
    fail(`${label} is unsafe display text.`);
  }
  return value;
}

function metadataOnly(value, label = 'layout option set') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => metadataOnly(child, `${label}[${index}]`));
    return;
  }
  if (!record(value)) {
    if (typeof value === 'string' && PRIVATE_MEDIA_VALUE.test(value)) {
      fail(`${label} contains a private media locator.`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_MEDIA_KEY.test(key)) fail(`${label} contains a private media field.`);
    metadataOnly(child, `${label}.${key}`);
  }
}

function privateResponseError(payload, status) {
  const detail = payload?.detail;
  const message = payload?.message
    || (typeof detail === 'string' ? detail : detail?.message)
    || `Request failed (${status})`;
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  return error;
}

function validateReleaseForContinuation(release) {
  if (!record(release) || release.scope !== 'private-service-only'
    || release.capabilities?.FUNCTIONAL_FURNITURE_BRIEF !== true) {
    fail('private functional-furniture capability is not released.');
  }
  for (const capability of DOWNSTREAM_CAPABILITIES) {
    if (release.capabilities?.[capability] !== false) {
      fail(`${capability} must remain locked in the current private release.`);
    }
  }
}

function validateShellHandoff(snapshot, shellApproval, release, approvedSource, geometryReview) {
  if (!record(snapshot) || snapshot.schema !== PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA
    || snapshot.enabled !== true || snapshot.phase !== 'functional_brief_complete'
    || snapshot.projectId !== approvedSource.projectId) {
    fail('approved-shell workflow handoff is missing or in the wrong phase.');
  }
  validateReleaseForContinuation(release);
  if (!record(snapshot.release) || snapshot.release.releaseId !== release.releaseId) {
    fail('shell workflow and continuation use different private releases.');
  }
  const project = snapshot.project;
  const source = snapshot.source;
  const shell = snapshot.shell;
  const evidence = snapshot.evidence;
  const brief = snapshot.furnitureBrief;
  if (!record(project) || project.projectId !== snapshot.projectId
    || project.workflowContract !== 'bare_shell_first/1'
    || project.state !== 'FURNITURE_BRIEF_COMPLETE') {
    fail('project dashboard is not ready for functional layout generation.');
  }
  if (!record(source) || !record(shell) || !record(evidence) || !record(brief)) {
    fail('source, shell or furniture-brief receipts are incomplete.');
  }
  same(source.geometryVersion, approvedSource.geometryVersion, 'source geometry version');
  same(source.geometrySha256, approvedSource.geometrySha256, 'source geometry');
  same(source.geometry2dApprovalVersion, approvedSource.geometry2dApprovalVersion, '2D approval version');
  same(source.geometry2dApprovalSha256, approvedSource.geometry2dApprovalSha256, '2D approval');
  same(
    source.verticalDimensionsApprovalVersion,
    approvedSource.verticalDimensionsApprovalVersion,
    'vertical approval version',
  );
  same(
    source.verticalDimensionsApprovalSha256,
    approvedSource.verticalDimensionsApprovalSha256,
    'vertical approval',
  );
  same(source.registrationSha256, approvedSource.registrationSha256, 'source registration');
  if (shell.approvalStatus !== 'approved' || shell.verificationComplete !== true
    || shell.shellModelVersion !== project.approvedShellModelVersion
    || shell.shellModelVersion !== project.shellModelVersion) {
    fail('bare shell is not the exact byte-verified approved version.');
  }
  same(shell.shellModelSha256, evidence.shellModelSha256, 'structural shell evidence');
  same(shell.geometrySha256, source.geometrySha256, 'shell geometry');
  if (evidence.topology?.readyForWholeUnit3d !== true || evidence.blockers?.length !== 0
    || !Array.isArray(evidence.rooms) || evidence.rooms.length < 1) {
    fail('whole-unit shell topology or room evidence is incomplete.');
  }
  if (!record(shellApproval) || shellApproval.projectId !== snapshot.projectId
    || shellApproval.state !== 'SHELL_APPROVED'
    || shellApproval.approvedShellModelVersion !== shell.shellModelVersion
    || shellApproval.shellModelSha256 !== shell.shellModelSha256) {
    fail('in-memory shell approval receipt is missing or stale.');
  }
  const shellModelApprovalVersion = version(
    shellApproval.shellModelApprovalVersion,
    'shell approval',
  );
  const shellModelApprovalSha256 = digest(
    shellApproval.shellModelApprovalSha256,
    'shell approval',
  );
  if (brief.projectId !== snapshot.projectId || brief.state !== 'FURNITURE_BRIEF_COMPLETE'
    || project.furnitureBriefVersion !== brief.furnitureBriefVersion) {
    fail('functional furniture brief is not current.');
  }
  const furnitureBriefVersion = version(brief.furnitureBriefVersion, 'furniture brief');
  const furnitureBriefSha256 = digest(brief.furnitureBriefSha256, 'furniture brief');
  same(brief.sourceReferences?.shellModelVersion, shell.shellModelVersion, 'brief shell version');
  same(brief.sourceReferences?.shellModelSha256, shell.shellModelSha256, 'brief shell');
  same(brief.sourceReferences?.geometryVersion, source.geometryVersion, 'brief geometry version');
  same(brief.sourceReferences?.geometrySha256, source.geometrySha256, 'brief geometry');
  const sourceArtifactSha256 = digest(
    geometryReview?.correctionEvidenceSource?.sha256,
    'original upload',
  );
  const roomIds = uniqueIds(evidence.rooms, 'id', 'canonical room');
  return Object.freeze({
    projectId: snapshot.projectId,
    releaseId: release.releaseId,
    sourceArtifactSha256,
    sourceRegistrationSha256: approvedSource.registrationSha256,
    geometryVersion: approvedSource.geometryVersion,
    geometrySha256: approvedSource.geometrySha256,
    wholeUnitTopologySha256: approvedSource.wholeUnitTopologySha256,
    shellModelVersion: shell.shellModelVersion,
    shellModelSha256: shell.shellModelSha256,
    shellModelApprovalVersion,
    shellModelApprovalSha256,
    furnitureBriefVersion,
    furnitureBriefSha256,
    roomIds: Object.freeze(roomIds),
    roomNames: Object.freeze(Object.fromEntries(
      evidence.rooms.map((room) => [room.id, safeDisplayText(room.name, `room ${room.id} name`, 200)]),
    )),
  });
}

function validateDashboard(project, authority, supportedStates) {
  if (!record(project) || project.projectId !== authority.projectId
    || project.workflowContract !== 'bare_shell_first/1'
    || !supportedStates.includes(project.state)) {
    fail('live project dashboard is stale or in an unsupported state.');
  }
  same(project.geometryVersion, authority.geometryVersion, 'dashboard geometry version');
  same(project.approvedGeometryVersion, authority.geometryVersion, 'dashboard approved geometry');
  same(project.shellModelVersion, authority.shellModelVersion, 'dashboard shell version');
  same(project.approvedShellModelVersion, authority.shellModelVersion, 'dashboard approved shell');
  same(project.furnitureBriefVersion, authority.furnitureBriefVersion, 'dashboard furniture brief');
  return project;
}

function validateRecoveredBrief(brief, authority) {
  if (!record(brief) || brief.projectId !== authority.projectId
    || brief.furnitureBriefVersion !== authority.furnitureBriefVersion
    || brief.furnitureBriefSha256 !== authority.furnitureBriefSha256) {
    fail('recovered functional brief is stale.');
  }
  same(brief.sourceReferences?.shellModelVersion, authority.shellModelVersion, 'recovered brief shell version');
  same(brief.sourceReferences?.shellModelSha256, authority.shellModelSha256, 'recovered brief shell');
  same(brief.sourceReferences?.geometryVersion, authority.geometryVersion, 'recovered brief geometry version');
  same(brief.sourceReferences?.geometrySha256, authority.geometrySha256, 'recovered brief geometry');
}

async function validateApprovalActor(actor, expectedSha256, projectId, claimedActorId = null) {
  exactKeys(actor, APPROVAL_ACTOR_KEYS, 'functional layout approval actor');
  safeId(actor.actorId, 'functional layout approval actor');
  safeId(actor.claimedActorId, 'claimed functional layout reviewer');
  digest(actor.subjectSha256, 'functional layout reviewer subject');
  if (actor.schemaVersion !== '1.0' || actor.provider !== 'project_guest_token'
    || actor.actorId !== `project_guest:${projectId}:${actor.subjectSha256.slice(0, 24)}`
    || !Array.isArray(actor.roles) || actor.roles.length !== 1
    || actor.roles[0] !== 'project_guest'
    || !['authorization_bearer', 'http_only_cookie'].includes(actor.credentialTransport)
    || actor.identityVerified !== true || actor.professionalIdentityVerified !== false
    || actor.claimAcceptedAsProfessionalIdentity !== false) {
    fail('functional layout approval actor is not the authenticated project reviewer.');
  }
  if (claimedActorId !== null) {
    same(actor.claimedActorId, claimedActorId, 'claimed functional layout reviewer');
  }
  const actorSha256 = await canonicalDigest(actor);
  if (expectedSha256 !== null) same(actorSha256, expectedSha256, 'approval actor hash');
  return actorSha256;
}

async function validatePlacement(placement, roomIds, label) {
  exactKeys(placement, PLACEMENT_KEYS, label);
  safeId(placement.placementId, `${label} ID`);
  safeId(placement.assetId, `${label} asset`);
  safeId(placement.roomId, `${label} room`);
  if (!roomIds.includes(placement.roomId)) fail(`${label} references an unknown canonical room.`);
  ['x', 'y'].forEach((key) => integer(placement[key], `${label} ${key}`, -1_000_000, 1_000_000));
  ['width', 'depth', 'height'].forEach((key) => integer(placement[key], `${label} ${key}`, 1, 20_000));
  integer(placement.clearance, `${label} clearance`, 0, 20_000);
  if (placement.z !== 0 || placement.rotationDegrees !== 0) {
    fail(`${label} is not a verified axis-aligned floor placement.`);
  }
  if (!exactKeys(placement.operationalClearanceMm, ['left', 'right', 'back', 'front'], `${label} operation`)) return;
  Object.entries(placement.operationalClearanceMm).forEach(([side, value]) => {
    integer(value, `${label} ${side} clearance`, 0, 20_000);
  });
  if (!Array.isArray(placement.useSides) || !Array.isArray(placement.useSideGroups)
    || typeof placement.useZonePolicy !== 'string') {
    fail(`${label} operation evidence is incomplete.`);
  }
  safeDisplayText(placement.representation, `${label} representation`, 160);
}

async function validateOption(option, payload, authority, index) {
  const label = `layout option ${index + 1}`;
  exactKeys(option, OPTION_KEYS, label);
  if (option.type !== FUNCTIONAL_TYPES[index]) fail(`${label} type or ordering is noncanonical.`);
  digest(option.layoutSha256, `${label} hash`);
  safeId(option.layoutId, `${label} ID`);
  if (option.layoutId !== `layout-${option.type}-${option.layoutSha256.slice(0, 10)}`) {
    fail(`${label} ID is not derived from its exact hash.`);
  }
  same(option.assetLibraryVersion, payload.assetLibraryVersion, `${label} asset library version`);
  same(option.assetLibrarySha256, payload.assetLibrarySha256, `${label} asset library`);
  if (canonicalShellJson(option.sourceEvidence) !== canonicalShellJson(payload.sourceEvidence)) {
    fail(`${label} source evidence differs from its option set.`);
  }
  integer(option.rank, `${label} rank`, 1, FUNCTIONAL_TYPES.length);
  if (typeof option.recommended !== 'boolean') fail(`${label} recommendation state is invalid.`);
  if (!Array.isArray(option.roomProgramme) || !Array.isArray(option.solver?.rooms)) {
    fail(`${label} whole-unit room programme is incomplete.`);
  }
  const programmeRoomIds = uniqueIds(option.roomProgramme, 'roomId', `${label} programme room`);
  const solverRoomIds = uniqueIds(option.solver.rooms, 'roomId', `${label} solver room`);
  if (!sameMembers(programmeRoomIds, authority.roomIds)
    || !sameMembers(solverRoomIds, authority.roomIds)) {
    fail(`${label} does not cover every canonical room.`);
  }
  const placementIds = uniqueIds(option.placements, 'placementId', `${label} placement`);
  await Promise.all(option.placements.map((placement, placementIndex) => (
    validatePlacement(placement, authority.roomIds, `${label} placement ${placementIndex + 1}`)
  )));
  if (!Array.isArray(option.warnings) || option.warnings.some((value) => (
    typeof value !== 'string' || CONTROL.test(value) || PRIVATE_MEDIA_VALUE.test(value)
  ))) fail(`${label} warnings are unsafe.`);
  if (!record(option.scorecard) || typeof option.scorecard.eligibleForRecommendation !== 'boolean'
    || option.scorecard.decisionSupportOnly !== true
    || option.scorecard.learnedModelUsed !== false) {
    fail(`${label} scorecard is missing its deterministic decision-support boundary.`);
  }
  integer(option.scorecard.scoreBasisPoints, `${label} score`, 0, 10_000);
  if (!record(option.validation) || typeof option.validation.feasible !== 'boolean'
    || !Array.isArray(option.validation.hardConstraintViolations)) {
    fail(`${label} hard-gate validation is incomplete.`);
  }
  const eligible = option.scorecard.eligibleForRecommendation === true;
  if (eligible && (option.validation.feasible !== true
    || option.validation.hardConstraintViolations.length !== 0
    || option.validation.doorSwingCheck !== 'passed'
    || option.validation.circulationCheck !== 'passed'
    || option.validation.programmeCheck !== 'passed'
    || option.solver.status !== 'OPTIMAL')) {
    fail(`${label} is recommendation-eligible without passing every functional hard gate.`);
  }
  if (option.solver.randomSeed !== 0 || option.solver.workers !== 1) {
    fail(`${label} solver is not deterministic.`);
  }
  const placementsByRoom = authority.roomIds.map((roomId) => {
    const placements = option.placements.filter((placement) => placement.roomId === roomId);
    return Object.freeze({
      roomId,
      roomName: authority.roomNames[roomId],
      placementCount: placements.length,
      assetIds: Object.freeze(placements.map((placement) => placement.assetId)),
    });
  });
  return Object.freeze({
    layoutId: option.layoutId,
    layoutSha256: option.layoutSha256,
    type: option.type,
    rank: option.rank,
    recommended: option.recommended,
    eligible,
    scoreBasisPoints: option.scorecard.scoreBasisPoints,
    placementCount: placementIds.length,
    roomCount: programmeRoomIds.length,
    hardViolationCount: option.validation.hardConstraintViolations.length,
    doorSwingCheck: option.validation.doorSwingCheck,
    circulationCheck: option.validation.circulationCheck,
    solverStatus: option.solver.status,
    placementsByRoom: Object.freeze(placementsByRoom),
  });
}

/** Validate and project one server-authored, source-bound functional option set. */
export async function validateFunctionalLayoutOptionSet(payload, authority) {
  metadataOnly(payload);
  exactKeys(payload, OPTION_SET_KEYS, 'functional layout option set');
  same(payload.projectId, authority.projectId, 'layout project');
  version(payload.optionSetVersion, 'layout option set');
  digest(payload.optionSetSha256, 'layout option set');
  digest(payload.assetLibrarySha256, 'measured asset library');
  safeDisplayText(payload.assetLibraryVersion, 'measured asset library version', 160);
  exactKeys(payload.sourceReferences, SOURCE_REFERENCE_KEYS, 'layout source references');
  const expectedSources = {
    workflowContract: 'bare_shell_first/1',
    sourceArtifactSha256: authority.sourceArtifactSha256,
    sourceRegistrationSha256: authority.sourceRegistrationSha256,
    geometryVersion: authority.geometryVersion,
    geometrySha256: authority.geometrySha256,
    wholeUnitTopologySha256: authority.wholeUnitTopologySha256,
    shellModelVersion: authority.shellModelVersion,
    shellModelSha256: authority.shellModelSha256,
    shellModelApprovalVersion: authority.shellModelApprovalVersion,
    shellModelApprovalSha256: authority.shellModelApprovalSha256,
    furnitureBriefVersion: authority.furnitureBriefVersion,
    furnitureBriefSha256: authority.furnitureBriefSha256,
  };
  for (const [field, expected] of Object.entries(expectedSources)) {
    same(payload.sourceReferences[field], expected, `layout ${field}`);
  }
  exactKeys(payload.sourceEvidence, SOURCE_EVIDENCE_KEYS, 'layout source evidence');
  if (payload.sourceEvidence.contract !== 'functional-layout-source-evidence/1'
    || payload.sourceEvidence.functionalInputPolicyContract
      !== 'supported-functional-layout-inputs/1') {
    fail('functional layout source/input contract is incompatible.');
  }
  same(payload.sourceEvidence.assetLibraryVersion, payload.assetLibraryVersion, 'source asset library version');
  same(payload.sourceEvidence.assetLibrarySha256, payload.assetLibrarySha256, 'source asset library');
  same(payload.sourceEvidence.furnitureBriefSha256, authority.furnitureBriefSha256, 'source furniture brief');
  digest(payload.sourceEvidence.geometrySha256, 'canonical layout-source geometry');
  exactKeys(payload.ranking, RANKING_KEYS, 'functional layout ranking');
  if (!['available', 'blocked'].includes(payload.ranking.status)
    || payload.ranking.learnedModelUsed !== false
    || !Array.isArray(payload.ranking.orderedLayoutIds)
    || !Array.isArray(payload.ranking.notScoredBriefFields)) {
    fail('functional layout ranking is incomplete or implies a learned model.');
  }
  safeDisplayText(payload.ranking.scoreMeaning, 'layout score meaning');
  safeDisplayText(payload.ranking.assetScope, 'layout asset scope');
  if (!Array.isArray(payload.options) || payload.options.length !== FUNCTIONAL_TYPES.length) {
    fail('functional layout must return the three canonical option types.');
  }
  uniqueIds(payload.options, 'layoutId', 'layout option');
  const options = await Promise.all(payload.options.map((option, index) => (
    validateOption(option, payload, authority, index)
  )));
  const ordered = [...options].sort((left, right) => left.rank - right.rank);
  if (ordered.map((option) => option.rank).join(',') !== '1,2,3'
    || !sameMembers(payload.ranking.orderedLayoutIds, ordered.map((option) => option.layoutId))) {
    fail('functional layout rank ordering is inconsistent.');
  }
  const recommended = options.filter((option) => option.recommended);
  if (payload.ranking.status === 'available') {
    if (recommended.length !== 1 || !recommended[0].eligible
      || payload.ranking.recommendedLayoutId !== recommended[0].layoutId
      || payload.ranking.notScoredBriefFields.length !== 0) {
      fail('available functional ranking has no unique fully-scored recommendation.');
    }
  } else if (recommended.length !== 0 || payload.ranking.recommendedLayoutId !== null) {
    fail('blocked functional ranking contains a recommendation.');
  }
  return Object.freeze({
    schema: PRIVATE_FUNCTIONAL_LAYOUT_REVIEW_SCHEMA,
    projectId: authority.projectId,
    optionSetVersion: payload.optionSetVersion,
    optionSetSha256: payload.optionSetSha256,
    assetLibraryVersion: payload.assetLibraryVersion,
    assetLibrarySha256: payload.assetLibrarySha256,
    status: payload.ranking.status,
    recommendedLayoutId: payload.ranking.recommendedLayoutId,
    learnedModelUsed: false,
    decisionSupportOnly: true,
    customerReleaseEligible: false,
    source: Object.freeze({
      sourceRegistrationSha256: authority.sourceRegistrationSha256,
      geometryVersion: authority.geometryVersion,
      geometrySha256: authority.geometrySha256,
      shellModelVersion: authority.shellModelVersion,
      shellModelSha256: authority.shellModelSha256,
      furnitureBriefVersion: authority.furnitureBriefVersion,
      furnitureBriefSha256: authority.furnitureBriefSha256,
    }),
    options: Object.freeze(options),
    blockers: Object.freeze([
      Object.freeze({
        code: 'DESIGN_SELECTION_CAPABILITY_OFF',
        message: 'Rights-cleared design selection remains locked by the current private release handshake.',
      }),
      Object.freeze({
        code: 'FURNISHED_MODEL_CAPABILITY_OFF',
        message: 'The selected layout cannot enter furnished-model generation from this browser release.',
      }),
      Object.freeze({
        code: 'AI_RENDERING_CAPABILITY_OFF',
        message: 'Deterministic rendering remains locked until design and furnished-model review are released upstream.',
      }),
      Object.freeze({
        code: 'REAL_HDB_ACCURACY_UNPROVEN',
        message: 'Measured furniture fit does not prove raw floor-plan detection, as-built dimensions or the target real-life fidelity.',
      }),
    ]),
  });
}

/** Validate the metadata-only, server-revalidated current-layout recovery receipt. */
export async function validateApprovedFunctionalLayoutRecovery(
  payload,
  authority,
  optionSetPayload,
  optionSetReview,
  project,
) {
  metadataOnly(payload, 'approved functional layout recovery');
  exactKeys(payload, APPROVED_RECOVERY_KEYS, 'approved functional layout recovery');
  if (payload.schema !== CURRENT_APPROVED_FUNCTIONAL_LAYOUT_SCHEMA
    || payload.projectId !== authority.projectId
    || payload.workflowContract !== 'bare_shell_first/1'
    || payload.state !== 'LAYOUT_APPROVED'
    || payload.customerReleaseEligible !== false) {
    fail('approved functional layout recovery header is incompatible.');
  }
  const recoveryReceiptSha256 = digest(
    payload.recoveryReceiptSha256,
    'approved functional layout recovery receipt',
  );
  const { recoveryReceiptSha256: ignored, ...receiptBody } = payload;
  void ignored;
  same(
    await canonicalDigest(receiptBody),
    recoveryReceiptSha256,
    'approved functional layout recovery receipt',
  );
  exactKeys(payload.sourceReferences, SOURCE_REFERENCE_KEYS, 'approved layout source references');
  const expectedSources = {
    workflowContract: 'bare_shell_first/1',
    sourceArtifactSha256: authority.sourceArtifactSha256,
    sourceRegistrationSha256: authority.sourceRegistrationSha256,
    geometryVersion: authority.geometryVersion,
    geometrySha256: authority.geometrySha256,
    wholeUnitTopologySha256: authority.wholeUnitTopologySha256,
    shellModelVersion: authority.shellModelVersion,
    shellModelSha256: authority.shellModelSha256,
    shellModelApprovalVersion: authority.shellModelApprovalVersion,
    shellModelApprovalSha256: authority.shellModelApprovalSha256,
    furnitureBriefVersion: authority.furnitureBriefVersion,
    furnitureBriefSha256: authority.furnitureBriefSha256,
  };
  for (const [field, expected] of Object.entries(expectedSources)) {
    same(payload.sourceReferences[field], expected, `approved layout ${field}`);
  }
  same(
    version(payload.optionSetVersion, 'approved layout option set'),
    optionSetReview.optionSetVersion,
    'approved layout option-set version',
  );
  same(
    digest(payload.optionSetSha256, 'approved layout option set'),
    optionSetReview.optionSetSha256,
    'approved layout option-set hash',
  );
  exactKeys(
    payload.selectedOption,
    ['layoutId', 'layoutSha256', 'selectedOptionSha256'],
    'approved selected option',
  );
  const layoutId = safeId(payload.selectedOption.layoutId, 'approved selected layout');
  const selectedLayoutSha256 = digest(
    payload.selectedOption.layoutSha256,
    'approved selected layout payload',
  );
  const selectedOptionSha256 = digest(
    payload.selectedOption.selectedOptionSha256,
    'approved selected option',
  );
  const selectedRaw = optionSetPayload.options.find((option) => option.layoutId === layoutId);
  const selectedReview = optionSetReview.options.find((option) => option.layoutId === layoutId);
  if (!selectedRaw || !selectedReview?.eligible) {
    fail('approved functional layout is absent or no longer passes every hard gate.');
  }
  same(selectedRaw.layoutSha256, selectedLayoutSha256, 'approved selected layout payload');
  same(
    await canonicalDigest(selectedRaw),
    selectedOptionSha256,
    'approved selected option',
  );
  exactKeys(
    payload.approvedLayout,
    ['version', 'sha256', 'status', 'approvedAt'],
    'approved layout record',
  );
  const layoutVersion = version(payload.approvedLayout.version, 'approved functional layout');
  const layoutSha256 = digest(payload.approvedLayout.sha256, 'approved functional layout');
  if (payload.approvedLayout.status !== 'approved'
    || typeof payload.approvedLayout.approvedAt !== 'string'
    || !Number.isFinite(Date.parse(payload.approvedLayout.approvedAt))) {
    fail('approved functional layout timestamp or status is invalid.');
  }
  if (!record(project) || project.state !== 'LAYOUT_APPROVED'
    || project.layoutVersion !== layoutVersion
    || project.approvedLayoutVersion !== layoutVersion) {
    fail('project dashboard does not point to the recovered approved layout.');
  }
  for (const pointer of [
    'designSelectionVersion', 'designBriefVersion', 'modelVersion',
    'approvedModelVersion', 'renderVersion', 'approvedDesignVersion',
  ]) {
    if (project[pointer] !== null) fail(`${pointer} appeared before its private release authority.`);
  }
  const approvalActorSha256 = digest(
    payload.approvalActorSha256,
    'approved functional layout actor',
  );
  await validateApprovalActor(
    payload.approvalActor,
    approvalActorSha256,
    authority.projectId,
  );
  exactKeys(
    payload.privateContinuationLocks,
    PRIVATE_CONTINUATION_LOCK_KEYS,
    'approved layout private continuation locks',
  );
  if (PRIVATE_CONTINUATION_LOCK_KEYS.some(
    (key) => payload.privateContinuationLocks[key] !== true,
  )) {
    fail('an approved-layout recovery response unlocked a downstream stage.');
  }
  return Object.freeze({
    schema: 'homeandme-private-functional-layout-approval/2',
    projectId: authority.projectId,
    optionSetVersion: optionSetReview.optionSetVersion,
    optionSetSha256: optionSetReview.optionSetSha256,
    layoutId,
    selectedLayoutSha256,
    selectedOptionSha256,
    layoutVersion,
    layoutSha256,
    reviewerActorId: payload.approvalActor.actorId,
    claimedReviewerActorId: payload.approvalActor.claimedActorId,
    approvalActor: cloneFrozen(payload.approvalActor),
    approvalActorSha256,
    recoveryReceiptSha256,
    recoveredAfterReload: true,
    designSelectionReleased: false,
    furnishedModelReleased: false,
    deterministicRenderReleased: false,
  });
}

async function approvalReceipt(
  payload,
  optionSet,
  selected,
  selectedRaw,
  claimedReviewerActorId,
  authority,
) {
  if (!record(payload) || payload.projectId !== authority.projectId
    || payload.workflowContract !== 'bare_shell_first/1'
    || payload.state !== 'LAYOUT_APPROVED'
    || payload.layoutVersion !== payload.approvedLayoutVersion) {
    fail('functional layout approval did not produce one exact approved version.');
  }
  const layoutVersion = version(payload.layoutVersion, 'approved functional layout');
  const layoutSha256 = digest(payload.layoutSha256, 'approved functional layout');
  const actor = payload.actor;
  const approvalActorSha256 = await validateApprovalActor(
    actor,
    null,
    authority.projectId,
    claimedReviewerActorId,
  );
  const selectedOptionSha256 = await canonicalDigest(selectedRaw);
  for (const pointer of [
    'designSelectionVersion', 'designBriefVersion', 'modelVersion',
    'approvedModelVersion', 'renderVersion', 'approvedDesignVersion',
  ]) {
    if (payload[pointer] !== null) fail(`${pointer} appeared before its released authority.`);
  }
  return Object.freeze({
    schema: 'homeandme-private-functional-layout-approval/2',
    projectId: authority.projectId,
    optionSetVersion: optionSet.optionSetVersion,
    optionSetSha256: optionSet.optionSetSha256,
    layoutId: selected.layoutId,
    selectedLayoutSha256: selected.layoutSha256,
    selectedOptionSha256,
    layoutVersion,
    layoutSha256,
    reviewerActorId: actor.actorId,
    claimedReviewerActorId,
    approvalActor: cloneFrozen(actor),
    approvalActorSha256,
    recoveryReceiptSha256: null,
    recoveredAfterReload: false,
    designSelectionReleased: false,
    furnishedModelReleased: false,
    deterministicRenderReleased: false,
  });
}

function designSelectionHandoff(authority, review, approval) {
  if (!authority || !review || !approval) return null;
  return Object.freeze({
    schema: PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA,
    projectId: authority.projectId,
    releaseId: authority.releaseId,
    sourceReferences: Object.freeze({
      workflowContract: 'bare_shell_first/1',
      sourceArtifactSha256: authority.sourceArtifactSha256,
      sourceRegistrationSha256: authority.sourceRegistrationSha256,
      geometryVersion: authority.geometryVersion,
      geometrySha256: authority.geometrySha256,
      wholeUnitTopologySha256: authority.wholeUnitTopologySha256,
      shellModelVersion: authority.shellModelVersion,
      shellModelSha256: authority.shellModelSha256,
      shellModelApprovalVersion: authority.shellModelApprovalVersion,
      shellModelApprovalSha256: authority.shellModelApprovalSha256,
      furnitureBriefVersion: authority.furnitureBriefVersion,
      furnitureBriefSha256: authority.furnitureBriefSha256,
    }),
    roomIds: cloneFrozen(authority.roomIds),
    roomNames: cloneFrozen(authority.roomNames),
    optionSetVersion: review.optionSetVersion,
    optionSetSha256: review.optionSetSha256,
    assetLibraryVersion: review.assetLibraryVersion,
    assetLibrarySha256: review.assetLibrarySha256,
    layoutId: approval.layoutId,
    selectedLayoutSha256: approval.selectedLayoutSha256,
    selectedOptionSha256: approval.selectedOptionSha256,
    layoutVersion: approval.layoutVersion,
    layoutSha256: approval.layoutSha256,
    layoutApprovalActor: cloneFrozen(approval.approvalActor),
    layoutApprovalActorSha256: approval.approvalActorSha256,
    recoveryReceiptSha256: approval.recoveryReceiptSha256,
    customerReleaseEligible: false,
  });
}

/**
 * Authenticated continuation client. The exact private shell release and in-memory approval
 * receipt are rechecked before layout generation or approval; no bearer token is accepted.
 */
export class PrivateFunctionalLayoutWorkflow {
  #release = null;

  #authority = null;

  #rawOptionSet = null;

  #review = null;

  #approval = null;

  #phase = 'disconnected';

  #blockers = [];

  constructor({
    baseUrl,
    projectId,
    expectedReleaseId,
    shellSnapshot,
    shellApprovalReceipt,
    fetchImpl = globalThis.fetch,
    enabled = PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED,
  } = {}) {
    safeId(projectId, 'project');
    if (!RELEASE_ID.test(expectedReleaseId || '')) fail('expected private release ID is invalid.');
    if (typeof fetchImpl !== 'function') fail('browser fetch is unavailable.');
    let parsed;
    try { parsed = new URL(baseUrl); } catch (_) { fail('project service URL is invalid.'); }
    const loopback = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
    if ((!loopback && parsed.protocol !== 'https:')
      || (loopback && !['http:', 'https:'].includes(parsed.protocol))
      || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
      fail('private service must use HTTPS or an exact loopback origin root.');
    }
    this.baseUrl = parsed.href.replace(/\/$/, '');
    this.origin = parsed.origin;
    this.projectId = projectId;
    this.expectedReleaseId = expectedReleaseId;
    this.shellSnapshot = shellSnapshot;
    this.shellApprovalReceipt = shellApprovalReceipt;
    this.fetch = (...args) => fetchImpl.call(globalThis, ...args);
    this.enabled = enabled === true;
  }

  #requireEnabled() {
    if (!this.enabled) throw new Error('Private functional layout workflow is disabled and absent from the public journey.');
  }

  async #json(path, { method = 'GET', body } = {}) {
    const url = new URL(path, `${this.origin}/`);
    if (url.origin !== this.origin || url.pathname !== path || url.search || url.hash) {
      throw new Error('Private functional-layout route is not exact same-origin.');
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await this.fetch(url.href, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
    });
    if (response.url !== url.href) throw new Error('Private functional-layout response was redirected.');
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const cache = (response.headers.get('cache-control') || '').toLowerCase()
      .split(',').map((item) => item.trim());
    const nosniff = (response.headers.get('x-content-type-options') || '').toLowerCase();
    if (contentType !== 'application/json' || !cache.includes('private')
      || !cache.includes('no-store') || nosniff !== 'nosniff') {
      throw new Error('Private functional-layout response has unsafe MIME or cache headers.');
    }
    const payload = await response.json();
    if (!response.ok) throw privateResponseError(payload, response.status);
    return payload;
  }

  async #liveAuthority(states) {
    const projectPath = `/api/v1/projects/${encodeURIComponent(this.projectId)}`;
    const [project, geometryReview, brief] = await Promise.all([
      this.#json(projectPath),
      this.#json(`${projectPath}/geometry`),
      this.#json(`${projectPath}/furniture-brief`),
    ]);
    const approvedSource = await validateApprovedGeometryReview(
      geometryReview,
      project,
      this.projectId,
    );
    if (!this.#authority) {
      this.#authority = validateShellHandoff(
        this.shellSnapshot,
        this.shellApprovalReceipt,
        this.#release,
        approvedSource,
        geometryReview,
      );
    }
    validateDashboard(project, this.#authority, states);
    validateRecoveredBrief(brief, this.#authority);
    return project;
  }

  #blocked(error, code) {
    this.#phase = 'blocked';
    this.#blockers = [Object.freeze({ code, message: String(error?.message || error) })];
    return this.snapshot();
  }

  async connect() {
    this.#requireEnabled();
    this.#blockers = [];
    const manifest = await this.#json('/api/v1/private-shell-capabilities');
    this.#release = validatePrivateShellRelease(manifest, {
      expectedReleaseId: this.expectedReleaseId,
      baseUrl: `${this.baseUrl}/`,
    });
    validateReleaseForContinuation(this.#release);
    try {
      const project = await this.#liveAuthority([
        'FURNITURE_BRIEF_COMPLETE', 'LAYOUT_READY', 'LAYOUT_APPROVED',
      ]);
      if (project.state === 'FURNITURE_BRIEF_COMPLETE') {
        this.#phase = 'ready_to_generate';
        return this.snapshot();
      }
      if (project.state === 'LAYOUT_READY') return this.recoverOptions();
      return this.recoverApprovedLayout();
    } catch (error) {
      return this.#blocked(error, 'FUNCTIONAL_LAYOUT_HANDOFF_INVALID');
    }
  }

  async generateOptions() {
    this.#requireEnabled();
    if (!this.#release || this.#phase !== 'ready_to_generate') {
      throw new Error('Functional furniture options require the exact connected shell/brief handoff.');
    }
    await this.#liveAuthority(['FURNITURE_BRIEF_COMPLETE']);
    const path = `/api/v1/projects/${encodeURIComponent(this.projectId)}/layouts/generate`;
    const payload = await this.#json(path, { method: 'POST' });
    const review = await validateFunctionalLayoutOptionSet(payload, this.#authority);
    this.#rawOptionSet = cloneFrozen(payload);
    this.#review = review;
    this.#approval = null;
    this.#phase = review.status === 'available' ? 'layout_review' : 'layout_blocked';
    return this.snapshot();
  }

  async recoverOptions() {
    this.#requireEnabled();
    if (!this.#release || !this.#authority) throw new Error('Functional layout handoff is not connected.');
    await this.#liveAuthority(['LAYOUT_READY']);
    const path = `/api/v1/projects/${encodeURIComponent(this.projectId)}/layouts/options`;
    const payload = await this.#json(path);
    const review = await validateFunctionalLayoutOptionSet(payload, this.#authority);
    this.#rawOptionSet = cloneFrozen(payload);
    this.#review = review;
    this.#approval = null;
    this.#phase = review.status === 'available' ? 'layout_review' : 'layout_blocked';
    return this.snapshot();
  }

  async recoverApprovedLayout() {
    this.#requireEnabled();
    if (!this.#release || !this.#authority) throw new Error('Functional layout handoff is not connected.');
    const project = await this.#liveAuthority(['LAYOUT_APPROVED']);
    const projectPath = `/api/v1/projects/${encodeURIComponent(this.projectId)}`;
    const [optionSetPayload, approvedPayload] = await Promise.all([
      this.#json(`${projectPath}/layouts/options`),
      this.#json(`${projectPath}/layouts/approved`),
    ]);
    const review = await validateFunctionalLayoutOptionSet(optionSetPayload, this.#authority);
    const approval = await validateApprovedFunctionalLayoutRecovery(
      approvedPayload,
      this.#authority,
      optionSetPayload,
      review,
      project,
    );
    this.#rawOptionSet = cloneFrozen(optionSetPayload);
    this.#review = review;
    this.#approval = approval;
    this.#phase = 'layout_approved';
    return this.snapshot();
  }

  async approveLayout({ layoutId, reviewerActorId, confirmFunctionalFit } = {}) {
    this.#requireEnabled();
    safeId(layoutId, 'layout');
    safeId(reviewerActorId, 'reviewer');
    if (confirmFunctionalFit !== true) throw new Error('Functional layout approval requires explicit confirmation.');
    if (this.#phase !== 'layout_review' || !this.#rawOptionSet || !this.#review) {
      throw new Error('No fully reviewed functional layout option is awaiting approval.');
    }
    const selected = this.#review.options.find((option) => option.layoutId === layoutId);
    if (!selected?.eligible) throw new Error('Only a layout that passed every functional hard gate can be approved.');
    await this.#liveAuthority(['LAYOUT_READY']);
    const optionsPath = `/api/v1/projects/${encodeURIComponent(this.projectId)}/layouts/options`;
    const recoveredPayload = await this.#json(optionsPath);
    const recovered = await validateFunctionalLayoutOptionSet(recoveredPayload, this.#authority);
    const recoveredSelected = recovered.options.find((option) => option.layoutId === layoutId);
    if (recovered.optionSetVersion !== this.#review.optionSetVersion
      || recovered.optionSetSha256 !== this.#review.optionSetSha256
      || !recoveredSelected?.eligible
      || canonicalShellJson(recoveredPayload) !== canonicalShellJson(this.#rawOptionSet)) {
      throw new Error('Functional layout option set changed after customer review.');
    }
    const approval = await this.#json(
      `/api/v1/projects/${encodeURIComponent(this.projectId)}/layouts/${encodeURIComponent(layoutId)}/approve`,
      { method: 'POST', body: { reviewerActorId } },
    );
    const selectedRaw = recoveredPayload.options.find((option) => option.layoutId === layoutId);
    if (!selectedRaw) throw new Error('Approved functional layout disappeared from its exact option set.');
    this.#approval = await approvalReceipt(
      approval,
      recovered,
      recoveredSelected,
      selectedRaw,
      reviewerActorId,
      this.#authority,
    );
    this.#phase = 'layout_approved';
    return this.snapshot();
  }

  snapshot() {
    const canApprove = this.#phase === 'layout_review';
    return Object.freeze({
      schema: PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
      enabled: this.enabled,
      phase: this.#phase,
      projectId: this.projectId,
      releaseId: this.#release?.releaseId || null,
      authority: this.#authority ? cloneFrozen({
        sourceRegistrationSha256: this.#authority.sourceRegistrationSha256,
        geometryVersion: this.#authority.geometryVersion,
        geometrySha256: this.#authority.geometrySha256,
        shellModelVersion: this.#authority.shellModelVersion,
        shellModelSha256: this.#authority.shellModelSha256,
        furnitureBriefVersion: this.#authority.furnitureBriefVersion,
        furnitureBriefSha256: this.#authority.furnitureBriefSha256,
      }) : null,
      review: this.#review,
      approval: this.#approval,
      designSelectionHandoff: this.#phase === 'layout_approved'
        ? designSelectionHandoff(this.#authority, this.#review, this.#approval)
        : null,
      blockers: Object.freeze([...this.#blockers]),
      actions: Object.freeze({
        generateOptions: this.#phase === 'ready_to_generate',
        recoverOptions: ['layout_blocked', 'blocked'].includes(this.#phase),
        approveLayout: canApprove,
        designSelection: false,
        furnishedModel: false,
        deterministicRender: false,
      }),
      downstreamLocks: Object.freeze({
        designSelection: true,
        furnishedModel: true,
        deterministicRender: true,
        quotation: true,
        payment: true,
      }),
      truth: Object.freeze({
        serverAuthoredLayoutOnly: true,
        sourcePixelsRendered: false,
        privateArtifactBytesRendered: false,
        learnedRankingUsed: false,
        detectorAccuracyClaim: false,
        asBuiltAccuracyClaim: false,
        customerReleaseEligible: false,
      }),
    });
  }
}
