import {
  canonicalShellJson,
  PRIVATE_BARE_SHELL_REVIEW_SCHEMA,
  PrivateBareShellReviewClient,
} from './journey-shell-review.js';
import {
  REGISTRATION_SCHEMA,
  normalizePixelMetricRegistration,
  verifyPixelMetricRegistrationIntegrity,
} from './journey-source-registration.js';

/**
 * Private, server-authored bare-shell customer workflow.
 *
 * This module is intentionally not imported by ProjectJourney.html and is not in the public
 * deployment allow-list. Its default-off switch is independent of every public capability flag.
 * It never authors geometry, fabricates review media, or advances a missing service stage locally.
 */
export const PRIVATE_SHELL_CUSTOMER_WORKFLOW_ENABLED = false;
export const PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA = 'homeandme-private-shell-customer-workflow/1';
export const PRIVATE_SHELL_RELEASE_SCHEMA = 'homeandme-private-shell-capabilities/1';
export const SHELL_STRUCTURAL_EVIDENCE_SCHEMA = 'homeandme-shell-structural-evidence/1';
export const FUNCTIONAL_FURNITURE_BRIEF_SCHEMA = 'spatialforge-functional-furniture-brief/1';

const HASH = /^[a-f0-9]{64}$/;
const RELEASE_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const CONTROL = /[\u0000-\u001f\u007f]/u;
const MAX_DISPLAY_TEXT = 5000;
const LIGHTING_PARAMETER_KEYS = Object.freeze([
  'profile',
  'exposureEv',
  'roomAreaLightEnergyWatts',
  'keyAreaLightEnergyWatts',
  'sunEnergy',
  'worldStrength',
]);
const LIGHTING_PARAMETERS = Object.freeze({
  preview: Object.freeze({
    profile: 'preview', exposureEv: -1, roomAreaLightEnergyWatts: 420,
    keyAreaLightEnergyWatts: 1080, sunEnergy: 1.35, worldStrength: 0.26,
  }),
  production: Object.freeze({
    profile: 'production', exposureEv: -1, roomAreaLightEnergyWatts: 90,
    keyAreaLightEnergyWatts: 250, sunEnergy: 0.7, worldStrength: 0.08,
  }),
});

const PRIVATE_CAPABILITY_PATH = '/api/v1/private-shell-capabilities';
const CAPABILITY_ORDER = Object.freeze([
  'SOURCE_REGISTERED_2D_APPROVAL',
  'VERTICAL_DIMENSIONS_APPROVAL',
  'BARE_SHELL_GENERATION',
  'BARE_SHELL_REVIEW',
  'FUNCTIONAL_FURNITURE_BRIEF',
  'DESIGN_SELECTION',
  'FURNISHED_MODEL',
  'AI_RENDERING',
  'QUOTATION',
  'PAYMENTS',
]);
const REQUIRED_ACTIVE_CAPABILITIES = new Set(CAPABILITY_ORDER.slice(0, 5));
const DOWNSTREAM_POINTERS = Object.freeze([
  'designSelectionVersion',
  'designBriefVersion',
  'layoutVersion',
  'approvedLayoutVersion',
  'modelVersion',
  'approvedModelVersion',
  'renderVersion',
  'approvedDesignVersion',
]);
const DOWNSTREAM_LOCKS = Object.freeze({
  designSelection: true,
  materials: true,
  furnishedModel: true,
  rendering: true,
  quotation: true,
  payment: true,
});
const FIXED_CONTRACTS = Object.freeze({
  projectApi: 'homeandme-project-api/2',
  workflow: 'bare_shell_first/1',
  geometry: 'spatialforge-canonical-geometry/1.0',
  sourceRegistration: REGISTRATION_SCHEMA,
  shellModel: 'spatialforge-shell-model/2',
  shellSceneManifest: 'spatialforge-shell-scene-manifest/2',
  shellCompiler: 'spatialforge-bare-shell-compiler/2',
  shellCoordinate: 'canonical-z-up-mm-to-blender-z-up-m-to-gltf-y-up/1',
  shellMaterial: 'spatialforge-neutral-shell-review-material/1',
  shellLighting: 'spatialforge-neutral-shell-review-lighting/2',
  referenceViews: 'canonical-room-and-hosted-opening-reference-coverage/2',
  shellReview: PRIVATE_BARE_SHELL_REVIEW_SCHEMA,
  furnitureBrief: FUNCTIONAL_FURNITURE_BRIEF_SCHEMA,
  privacy: 'same-origin-private-no-store/1',
  visualQuality: 'spatialforge-neutral-shell-png-quality/1',
  camera: 'room-rendered-solid-clearance-opening-coverage/3',
  openingVisibility: 'hosted-opening-centre-ray-frustum/1',
});
const FUNCTIONAL_INPUT_KEYS = Object.freeze([
  'householdMembers',
  'children',
  'elderlyOccupants',
  'pets',
  'accessibilityNeeds',
  'workFromHome',
  'cookingFrequency',
  'storageRequirements',
  'roomNeeds',
  'existingInventory',
  'specialFunctionalNeeds',
]);

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function exactKeys(value, expected) {
  return record(value)
    && Object.keys(value).sort().join('\u0000') === [...expected].sort().join('\u0000');
}

function fail(message) {
  throw new TypeError(`Private shell workflow unavailable: ${message}`);
}

function safeId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${label} is invalid.`);
  return value;
}

function digest(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${label} is not a SHA-256 digest.`);
  return value;
}

function version(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} is not a positive version.`);
  return value;
}

function displayText(value, label, { allowEmpty = false, maximum = MAX_DISPLAY_TEXT } = {}) {
  if (typeof value !== 'string' || value !== value.trim() || value.length > maximum
    || (!allowEmpty && value.length === 0) || CONTROL.test(value)) {
    fail(`${label} is not safe text.`);
  }
  return value;
}

function integer(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label} is outside the supported range.`);
  }
  return value;
}

function cloneFrozen(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFrozen));
  if (!record(value)) return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneFrozen(child)]),
  ));
}

function sameMembers(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && [...left].sort().join('\u0000') === [...right].sort().join('\u0000');
}

function validLightingParameters(value) {
  const expected = LIGHTING_PARAMETERS[value?.profile];
  return Boolean(expected) && exactKeys(value, LIGHTING_PARAMETER_KEYS)
    && LIGHTING_PARAMETER_KEYS.every((key) => value[key] === expected[key]);
}

function uniqueIds(items, label) {
  if (!Array.isArray(items)) fail(`${label} ledger is missing.`);
  const ids = items.map((item) => safeId(item?.id, `${label} ID`));
  if (new Set(ids).size !== ids.length) fail(`${label} IDs are duplicated.`);
  return ids;
}

function point(value, label) {
  const x = value?.x;
  const y = value?.y;
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) fail(`${label} is not integer millimetres.`);
  return Object.freeze({ x, y });
}

function boundary(value, label) {
  if (!Array.isArray(value) || value.length < 3) fail(`${label} is incomplete.`);
  const points = value.map((item, index) => point(item, `${label} point ${index + 1}`));
  const twiceArea = points.reduce((sum, current, index) => {
    const next = points[(index + 1) % points.length];
    return sum + current.x * next.y - next.x * current.y;
  }, 0);
  if (!Number.isFinite(twiceArea) || twiceArea === 0) fail(`${label} has zero area.`);
  return Object.freeze(points);
}

function canonicalPointKey(value) {
  return `${value.x},${value.y}`;
}

function canonicalBoundaryKey(value) {
  return value.map(canonicalPointKey).join(';');
}

function normalizeOpening(source, wallIds, label = 'opening') {
  const id = safeId(source?.id, `${label} ID`);
  const wallId = safeId(source.wall_id ?? source.hostWallId, `${label} ${id} host wall`);
  if (!wallIds.has(wallId)) fail(`${label} ${id} is unhosted.`);
  if (!['door', 'window', 'opening'].includes(source.kind)) fail(`${label} ${id} has an unsupported kind.`);
  const swing = source.swing;
  const reviewedUsage = source.reviewed_usage ?? source.reviewedUsage;
  const allowedSwings = {
    door: new Set(['left', 'right', 'double', 'sliding']),
    window: new Set(['none']),
    opening: new Set(['none']),
  };
  const allowedUsage = {
    door: new Set(['primary_entrance', 'secondary_exterior_door', 'interior_door']),
    window: new Set(['exterior_window', 'interior_borrowed_light']),
    opening: new Set(['interior_passage']),
  };
  if (!allowedSwings[source.kind].has(swing) || !allowedUsage[source.kind].has(reviewedUsage)) {
    fail(`${label} ${id} has an incompatible operation or reviewed role.`);
  }
  return Object.freeze({
    id,
    wallId,
    kind: source.kind,
    swing,
    reviewedUsage,
    offsetMm: integer(source.offset ?? source.offsetMm, `${label} ${id} offset`, 0, 10_000_000),
    widthMm: integer(source.width ?? source.widthMm, `${label} ${id} width`, 1, 10_000_000),
    heightMm: integer(source.height ?? source.heightMm, `${label} ${id} height`, 1, 10_000),
    sillMm: integer(source.sill ?? source.sillMm, `${label} ${id} sill`, 0, 10_000),
  });
}

function releaseContracts(value) {
  const keys = Object.keys(FIXED_CONTRACTS);
  if (!exactKeys(value, keys)) fail('release contracts are missing or contain unreviewed fields.');
  for (const [name, expected] of Object.entries(FIXED_CONTRACTS)) {
    if (value[name] !== expected) fail(`release contract ${name} is incompatible.`);
  }
  return cloneFrozen(value);
}

/** Validate the exact private release handshake before any project endpoint is called. */
export function validatePrivateShellRelease(manifest, {
  expectedReleaseId,
  baseUrl,
} = {}) {
  const keys = [
    'schema', 'releaseId', 'runtimeEnvironment', 'serviceReady', 'scope',
    'contracts', 'capabilities', 'dependencyOrder', 'safeguards',
  ];
  if (!exactKeys(manifest, keys) || manifest.schema !== PRIVATE_SHELL_RELEASE_SCHEMA) {
    fail('private release manifest is missing or incompatible.');
  }
  if (!RELEASE_ID.test(expectedReleaseId || '') || manifest.releaseId !== expectedReleaseId) {
    fail('private release identity does not match the browser pin.');
  }
  if (!['production', 'staging', 'development', 'test'].includes(manifest.runtimeEnvironment)
    || manifest.serviceReady !== true || manifest.scope !== 'private-service-only') {
    fail('private service release is not ready for this scope.');
  }
  let url;
  try { url = new URL(baseUrl); } catch (_) { fail('project service URL is invalid.'); }
  const loopback = ['127.0.0.1', 'localhost'].includes(url.hostname);
  if ((!loopback && url.protocol !== 'https:') || (loopback && !['http:', 'https:'].includes(url.protocol))
    || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    fail('private service must use HTTPS or an exact loopback origin root.');
  }
  const contracts = releaseContracts(manifest.contracts);
  if (!exactKeys(manifest.capabilities, CAPABILITY_ORDER)
    || !Array.isArray(manifest.dependencyOrder)
    || manifest.dependencyOrder.join('\u0000') !== CAPABILITY_ORDER.join('\u0000')) {
    fail('private capability order is incomplete or noncanonical.');
  }
  for (const capability of CAPABILITY_ORDER) {
    const expected = REQUIRED_ACTIVE_CAPABILITIES.has(capability);
    if (manifest.capabilities[capability] !== expected) {
      fail(`${capability} has an unsafe release value.`);
    }
  }
  if (!exactKeys(manifest.safeguards, [
    'demoFallbackEnabled',
    'localGeometryAuthorshipEnabled',
    'publicJourneyWiringEnabled',
    'designRenderCommerceEnabled',
  ]) || Object.values(manifest.safeguards).some((value) => value !== false)) {
    fail('private release safeguards do not keep local/public/downstream fallbacks locked.');
  }
  return Object.freeze({
    schema: manifest.schema,
    releaseId: manifest.releaseId,
    runtimeEnvironment: manifest.runtimeEnvironment,
    scope: manifest.scope,
    contracts,
    capabilities: cloneFrozen(manifest.capabilities),
    safeguards: cloneFrozen(manifest.safeguards),
  });
}

function validateDownstreamLock(project) {
  if (DOWNSTREAM_POINTERS.some((key) => project?.[key] !== null)
    || !['none', null, undefined].includes(project?.paymentStatus)
    || project?.quote !== null) {
    fail('design, model, render, quotation or payment data appeared before its released authority.');
  }
}

/** Revalidate the exact source-registered, 2D-approved and vertically approved geometry. */
export async function validateApprovedGeometryReview(review, project, expectedProjectId) {
  if (!record(review) || !record(project) || review.projectId !== expectedProjectId
    || project.projectId !== expectedProjectId || project.workflowContract !== 'bare_shell_first/1') {
    fail('approved geometry belongs to another project or workflow contract.');
  }
  const geometryVersion = version(review.geometryVersion, 'geometry');
  const geometrySha256 = digest(review.geometrySha256, 'geometry');
  if (project.geometryVersion !== geometryVersion
    || project.approvedGeometryVersion !== geometryVersion
    || review.approvalStatus !== 'approved') {
    fail('geometry is not the exact current approved revision.');
  }
  if (!record(review.validation) || review.validation.valid !== true
    || !Array.isArray(review.validation.issues) || review.validation.issues.length !== 0) {
    fail('current geometry no longer passes deterministic validation.');
  }
  const sourceReferences = review.sourceReferences;
  if (!record(sourceReferences)) fail('2D, vertical and topology lineage is missing.');
  const geometry2dApprovalVersion = version(sourceReferences.geometry2dApprovalVersion, '2D approval');
  const geometry2dApprovalSha256 = digest(sourceReferences.geometry2dApprovalSha256, '2D approval');
  const verticalDimensionsApprovalVersion = version(
    sourceReferences.verticalDimensionsApprovalVersion, 'vertical approval',
  );
  const verticalDimensionsApprovalSha256 = digest(
    sourceReferences.verticalDimensionsApprovalSha256, 'vertical approval',
  );
  const wholeUnitTopologySha256 = digest(sourceReferences.wholeUnitTopologySha256, 'whole-unit topology');
  const evidenceSource = review.correctionEvidenceSource;
  const registration = evidenceSource?.pixelMetricRegistration;
  const verifiedRegistration = await verifyPixelMetricRegistrationIntegrity(registration);
  const normalizedRegistration = normalizePixelMetricRegistration(verifiedRegistration, {
    sourceArtifactSha256: evidenceSource?.sha256,
    imageWidth: evidenceSource?.intrinsicPixels?.width,
    imageHeight: evidenceSource?.intrinsicPixels?.height,
    geometrySha256,
  });
  const geometry = review.geometry;
  if (!record(geometry) || geometry.units !== 'mm'
    || (geometry.project_id !== undefined && geometry.project_id !== expectedProjectId)
    || (geometry.revision !== undefined && geometry.revision !== geometryVersion)) {
    fail('canonical geometry identity or millimetre units are invalid.');
  }
  const wallIds = uniqueIds(geometry.walls, 'wall');
  const wallIdSet = new Set(wallIds);
  const walls = geometry.walls.map((wall) => Object.freeze({
    id: wall.id,
    kind: displayText(wall.kind, `wall ${wall.id} kind`, { maximum: 64 }),
    startMm: point(wall.start, `wall ${wall.id} start`),
    endMm: point(wall.end, `wall ${wall.id} end`),
    thicknessMm: integer(wall.thickness, `wall ${wall.id} thickness`, 50, 1000),
    heightMm: integer(wall.height, `wall ${wall.id} height`, 2000, 6000),
  }));
  const openingIds = uniqueIds(geometry.openings, 'opening');
  const openings = geometry.openings.map((opening) => normalizeOpening(opening, wallIdSet));
  const roomIds = uniqueIds(geometry.rooms, 'room');
  const rooms = geometry.rooms.map((room) => Object.freeze({
    id: room.id,
    name: displayText(room.name ?? room.id, `room ${room.id} name`, { maximum: 200 }),
    function: displayText(room.function ?? 'unspecified', `room ${room.id} function`, { maximum: 128 }),
    boundaryMm: boundary(room.boundary, `room ${room.id} boundary`),
  }));
  if (!walls.length || !rooms.length || !openings.some((item) => item.kind === 'door')
    || !openings.some((item) => item.kind === 'window')) {
    fail('approved whole-unit geometry lacks walls, rooms, a door or a window.');
  }
  const primaryEntrances = openings.filter((item) => item.reviewedUsage === 'primary_entrance');
  if (primaryEntrances.length !== 1) fail('approved geometry lacks exactly one primary entrance.');
  return Object.freeze({
    projectId: expectedProjectId,
    geometryVersion,
    geometrySha256,
    geometry2dApprovalVersion,
    geometry2dApprovalSha256,
    verticalDimensionsApprovalVersion,
    verticalDimensionsApprovalSha256,
    wholeUnitTopologySha256,
    registrationSha256: normalizedRegistration.registrationSha256,
    walls: Object.freeze(walls),
    openings: Object.freeze(openings),
    rooms: Object.freeze(rooms),
    wallIds: Object.freeze(wallIds),
    openingIds: Object.freeze(openingIds),
    roomIds: Object.freeze(roomIds),
  });
}

function parseManifest(bytes) {
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (_) {
    fail('verified semantic manifest is not valid UTF-8 JSON.');
  }
  return manifest;
}

function exactGeometryBinding(source, shellState) {
  const bindings = [
    ['geometryVersion', source.geometryVersion],
    ['geometrySha256', source.geometrySha256],
    ['geometry2dApprovalVersion', source.geometry2dApprovalVersion],
    ['geometry2dApprovalSha256', source.geometry2dApprovalSha256],
    ['verticalDimensionsApprovalVersion', source.verticalDimensionsApprovalVersion],
    ['verticalDimensionsApprovalSha256', source.verticalDimensionsApprovalSha256],
    ['wholeUnitTopologySha256', source.wholeUnitTopologySha256],
  ];
  if (bindings.some(([key, expected]) => shellState?.[key] !== expected)) {
    fail('bare shell is stale against its source-registered 2D or vertical approval.');
  }
}

/** Cross-check the byte-verified shell manifest against the current canonical source geometry. */
export function validateShellStructuralEvidence(manifest, source, shellState) {
  if (!record(manifest) || manifest.schema !== 'spatialforge-shell-scene-manifest/2'
    || manifest.artifactClass !== 'shell_model'
    || manifest.compilerVersion !== shellState.compilerVersion
    || manifest.reviewLightingContract !== shellState.reviewLightingContract
    || !validLightingParameters(manifest.reviewLightingParameters)
    || !validLightingParameters(shellState.reviewLightingParameters)
    || canonicalShellJson(manifest.reviewLightingParameters)
      !== canonicalShellJson(shellState.reviewLightingParameters)
    || manifest.renderProfile !== shellState.renderProfile
    || manifest.reviewExposureEv !== shellState.reviewExposureEv
    || manifest.cameraContract !== shellState.cameraContract
    || manifest.referenceViewContract !== shellState.referenceViewContract
    || manifest.reviewImageQualityContract !== shellState.reviewImageQualityContract
    || manifest.projectId !== source.projectId
    || manifest.geometryRevision !== source.geometryVersion
    || manifest.geometrySha256 !== source.geometrySha256
    || manifest.wholeUnitTopologySha256 !== source.wholeUnitTopologySha256
    || !Array.isArray(manifest.placements) || manifest.placements.length !== 0) {
    fail('semantic manifest is stale, furnished or belongs to another source geometry.');
  }
  exactGeometryBinding(source, shellState);
  const manifestWallIds = uniqueIds(manifest.walls, 'manifest wall');
  const manifestOpeningIds = uniqueIds(manifest.openings, 'manifest opening');
  const manifestRoomIds = uniqueIds(manifest.rooms, 'manifest room');
  if (!sameMembers(manifestWallIds, source.wallIds)
    || !sameMembers(manifestOpeningIds, source.openingIds)
    || !sameMembers(manifestRoomIds, source.roomIds)) {
    fail('shell wall, opening or room identity differs from approved geometry.');
  }
  const sourceWallById = new Map(source.walls.map((item) => [item.id, item]));
  const sourceOpeningById = new Map(source.openings.map((item) => [item.id, item]));
  const sourceRoomById = new Map(source.rooms.map((item) => [item.id, item]));
  const hostedByWall = new Map(source.walls.map((item) => [item.id, []]));
  const walls = manifest.walls.map((wall) => {
    const expected = sourceWallById.get(wall.id);
    if (!expected || wall.kind !== expected.kind
      || canonicalPointKey(wall.startMm) !== canonicalPointKey(expected.startMm)
      || canonicalPointKey(wall.endMm) !== canonicalPointKey(expected.endMm)
      || wall.thicknessMm !== expected.thicknessMm || wall.heightMm !== expected.heightMm
      || !Array.isArray(wall.openingIds) || new Set(wall.openingIds).size !== wall.openingIds.length) {
      fail(`shell wall ${wall.id} differs from approved geometry.`);
    }
    return Object.freeze({
      id: wall.id,
      kind: wall.kind,
      heightMm: wall.heightMm,
      thicknessMm: wall.thicknessMm,
      openingIds: Object.freeze([...wall.openingIds]),
    });
  });
  const openings = manifest.openings.map((opening) => {
    const normalized = normalizeOpening(opening, new Set(manifestWallIds), 'shell opening');
    const expected = sourceOpeningById.get(normalized.id);
    if (!expected || ['wallId', 'kind', 'swing', 'reviewedUsage', 'offsetMm', 'widthMm', 'heightMm', 'sillMm']
      .some((key) => normalized[key] !== expected[key])) {
      fail(`shell opening ${normalized.id} differs from approved geometry.`);
    }
    hostedByWall.get(normalized.wallId).push(normalized.id);
    return normalized;
  });
  for (const wall of manifest.walls) {
    if (!sameMembers(wall.openingIds, hostedByWall.get(wall.id))) {
      fail(`shell wall ${wall.id} opening-host ledger is incomplete.`);
    }
  }
  const rooms = manifest.rooms.map((room) => {
    const expected = sourceRoomById.get(room.id);
    const roomBoundary = boundary(room.boundaryMm, `shell room ${room.id} boundary`);
    if (!expected || room.name !== expected.name || room.function !== expected.function
      || canonicalBoundaryKey(roomBoundary) !== canonicalBoundaryKey(expected.boundaryMm)) {
      fail(`shell room ${room.id} differs from approved geometry.`);
    }
    return Object.freeze({
      id: room.id,
      name: room.name,
      function: room.function,
      reviewView: shellState.reviewViews.find((view) => view.roomId === room.id)?.view || null,
    });
  });
  const topology = manifest.wholeUnitTopology;
  if (!record(topology) || topology.schema !== 'hnm-room-outside-portal-graph/1'
    || topology.readyForWholeUnit3d !== true || !Array.isArray(topology.issues)
    || topology.issues.length !== 0 || !sameMembers(topology.requiredRoomIds, source.roomIds)
    || !sameMembers(topology.reachableRoomIds, source.roomIds)
    || !Array.isArray(topology.unreachableRoomIds) || topology.unreachableRoomIds.length !== 0
    || !Array.isArray(topology.openingSideBindings)
    || topology.openingSideBindings.length !== openings.length) {
    fail('whole-unit room/portal topology is incomplete.');
  }
  const bindingByOpening = new Map();
  for (const binding of topology.openingSideBindings) {
    const opening = sourceOpeningById.get(binding?.openingId);
    if (!opening || bindingByOpening.has(binding.openingId)
      || binding.bindingStatus !== 'resolved' || binding.hostWallId !== opening.wallId
      || binding.kind !== opening.kind) {
      fail(`opening ${binding?.openingId || '(unknown)'} is unhosted in whole-unit topology.`);
    }
    bindingByOpening.set(binding.openingId, binding);
  }
  const primary = openings.filter((opening) => opening.reviewedUsage === 'primary_entrance');
  if (primary.length !== 1 || topology.primaryEntranceId !== primary[0].id) {
    fail('whole-unit topology does not preserve exactly one approved entrance.');
  }
  if (!Array.isArray(manifest.referenceViews)
    || manifest.referenceViews.length !== shellState.reviewViews.length
    || shellState.reviewViews.some((review, index) => {
      const sceneView = manifest.referenceViews[index];
      return sceneView?.view !== review.view || sceneView?.roomId !== review.roomId
        || sceneView?.artifactFilename !== review.artifactFilename;
    })) {
    fail('shell review views are incomplete or stale.');
  }
  const count = (kind) => openings.filter((opening) => opening.kind === kind).length;
  return Object.freeze({
    schema: SHELL_STRUCTURAL_EVIDENCE_SCHEMA,
    projectId: source.projectId,
    geometryVersion: source.geometryVersion,
    geometrySha256: source.geometrySha256,
    shellModelVersion: shellState.shellModelVersion,
    shellModelSha256: shellState.shellModelSha256,
    counts: Object.freeze({
      walls: walls.length,
      doors: count('door'),
      windows: count('window'),
      passages: count('opening'),
      rooms: rooms.length,
      hostedOpenings: bindingByOpening.size,
      reviewViews: shellState.reviewViews.length,
    }),
    walls: Object.freeze(walls),
    openings: Object.freeze(openings),
    rooms: Object.freeze(rooms),
    topology: Object.freeze({
      primaryEntranceId: topology.primaryEntranceId,
      reachableRoomIds: Object.freeze([...topology.reachableRoomIds]),
      readyForWholeUnit3d: true,
    }),
    blockers: Object.freeze([]),
  });
}

/** Validate the quality evidence already inside the immutable shell payload/hash. */
export function validateShellVisualQuality(shellState, release) {
  if (!record(shellState) || shellState.shellSchema !== release.contracts.shellModel
    || shellState.compilerVersion !== release.contracts.shellCompiler
    || shellState.reviewLightingContract !== release.contracts.shellLighting
    || !validLightingParameters(shellState.reviewLightingParameters)
    || shellState.renderProfile !== shellState.reviewLightingParameters.profile
    || shellState.reviewExposureEv !== -1
    || shellState.cameraContract !== release.contracts.camera
    || shellState.referenceViewContract !== release.contracts.referenceViews
    || shellState.reviewImageQualityContract !== release.contracts.visualQuality
    || !Array.isArray(shellState.reviewViews) || shellState.reviewViews.length < 2) {
    fail('shell camera, lighting or image-quality contract is not the pinned release.');
  }
  const views = shellState.reviewViews.map((view) => {
    const quality = view.imageQuality;
    if (!record(quality) || quality.contract !== release.contracts.visualQuality
      || quality.passed !== true || !Array.isArray(quality.failureCodes)
      || quality.failureCodes.length !== 0
      || !Number.isSafeInteger(quality.widthPixels) || quality.widthPixels < 1
      || !Number.isSafeInteger(quality.heightPixels) || quality.heightPixels < 1
      || ![quality.meanLuma, quality.stddevLuma, quality.whitePixelFraction,
        quality.blackPixelFraction].every(Number.isFinite)) {
      fail(`visual-quality evidence failed for ${view.view}.`);
    }
    return Object.freeze({
      view: view.view,
      artifactRole: view.artifactRole,
      artifactSha256: view.artifactSha256,
      imageQuality: cloneFrozen(quality),
    });
  });
  return Object.freeze({
    schema: 'homeandme-shell-inline-visual-evidence/1',
    projectId: shellState.projectId,
    shellModelVersion: shellState.shellModelVersion,
    shellModelSha256: shellState.shellModelSha256,
    cameraContract: shellState.cameraContract,
    imageQualityContract: shellState.reviewImageQualityContract,
    bindingSha256: shellState.shellModelSha256,
    status: 'passed',
    views: Object.freeze(views),
  });
}

function normalizeStringList(value, label, maximum) {
  if (!Array.isArray(value) || value.length > maximum) fail(`${label} is invalid.`);
  return Object.freeze(value.map((item, index) => displayText(
    item, `${label} item ${index + 1}`, { maximum: 200 },
  )));
}

/** Closed functional-only request; design/material/prompt/reference fields cannot pass. */
export function functionalFurnitureBriefRequest(input, shellState, roomIds) {
  if (!exactKeys(input, FUNCTIONAL_INPUT_KEYS)) {
    fail('functional furniture brief has missing or design-bearing fields.');
  }
  const knownRooms = new Set(roomIds);
  const roomNeeds = input.roomNeeds;
  const inventory = input.existingInventory;
  if (!Array.isArray(roomNeeds) || roomNeeds.length > 100
    || !Array.isArray(inventory) || inventory.length > 500) {
    fail('functional room or inventory ledger is invalid.');
  }
  const normalizedRoomNeeds = roomNeeds.map((item) => {
    if (!exactKeys(item, ['roomId', 'intendedUse', 'functionalNeeds'])) {
      fail('a room need contains design or unsupported fields.');
    }
    const roomId = safeId(item.roomId, 'room need identity');
    if (!knownRooms.has(roomId)) fail(`room need ${roomId} is stale.`);
    return Object.freeze({
      roomId,
      intendedUse: displayText(item.intendedUse, `room ${roomId} intended use`, { maximum: 200 }),
      functionalNeeds: normalizeStringList(item.functionalNeeds, `room ${roomId} needs`, 50),
    });
  });
  if (new Set(normalizedRoomNeeds.map((item) => item.roomId)).size !== normalizedRoomNeeds.length) {
    fail('functional room needs contain duplicate room IDs.');
  }
  const normalizedInventory = inventory.map((item) => {
    if (!exactKeys(item, [
      'inventoryId', 'category', 'roomId', 'widthMm', 'depthMm', 'heightMm', 'quantity',
    ])) fail('an inventory item contains design or unsupported fields.');
    const inventoryId = safeId(item.inventoryId, 'inventory identity');
    const roomId = item.roomId === null ? null : safeId(item.roomId, `inventory ${inventoryId} room`);
    if (roomId !== null && !knownRooms.has(roomId)) fail(`inventory ${inventoryId} has a stale room.`);
    return Object.freeze({
      inventoryId,
      category: displayText(item.category, `inventory ${inventoryId} category`, { maximum: 128 }),
      roomId,
      widthMm: integer(item.widthMm, `inventory ${inventoryId} width`, 1, 20_000),
      depthMm: integer(item.depthMm, `inventory ${inventoryId} depth`, 1, 20_000),
      heightMm: integer(item.heightMm, `inventory ${inventoryId} height`, 1, 10_000),
      quantity: integer(item.quantity, `inventory ${inventoryId} quantity`, 1, 100),
    });
  });
  if (new Set(normalizedInventory.map((item) => item.inventoryId)).size !== normalizedInventory.length) {
    fail('inventory contains duplicate IDs.');
  }
  const householdMembers = integer(input.householdMembers, 'household members', 1, 30);
  const children = integer(input.children, 'children', 0, 20);
  const elderlyOccupants = integer(input.elderlyOccupants, 'elderly occupants', 0, 20);
  if (typeof input.workFromHome !== 'boolean') {
    fail('work-from-home must be an explicit boolean.');
  }
  if (children + elderlyOccupants > householdMembers) {
    fail('children and elderly occupants exceed the household size.');
  }
  return Object.freeze({
    shellModelVersion: shellState.shellModelVersion,
    shellModelSha256: shellState.shellModelSha256,
    householdMembers,
    children,
    elderlyOccupants,
    pets: normalizeStringList(input.pets, 'pets', 30),
    accessibilityNeeds: normalizeStringList(input.accessibilityNeeds, 'accessibility needs', 50),
    workFromHome: input.workFromHome,
    cookingFrequency: displayText(input.cookingFrequency, 'cooking frequency', { maximum: 100 }),
    storageRequirements: displayText(input.storageRequirements, 'storage requirements', { maximum: 500 }),
    roomNeeds: Object.freeze(normalizedRoomNeeds),
    existingInventory: Object.freeze(normalizedInventory),
    specialFunctionalNeeds: displayText(
      input.specialFunctionalNeeds, 'special functional needs', { allowEmpty: true, maximum: 5000 },
    ),
  });
}

function responseError(payload, status) {
  const detail = payload?.detail;
  const message = payload?.message
    || (typeof detail === 'string' ? detail : detail?.message)
    || `Request failed (${status})`;
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  return error;
}

function jobResponse(payload, projectId) {
  const keys = [
    'projectId', 'jobId', 'status', 'stage', 'progressPercentage', 'message', 'retryable',
    'cancellationRequested', 'warnings', 'resultReferences', 'correlationId',
  ];
  if (!exactKeys(payload, keys) || payload.projectId !== projectId
    || !SAFE_ID.test(payload.jobId || '') || !SAFE_ID.test(payload.correlationId || '')
    || !['queued', 'running'].includes(payload.status)
    || !Number.isFinite(payload.progressPercentage) || payload.progressPercentage < 0
    || payload.progressPercentage > 100 || typeof payload.retryable !== 'boolean'
    || payload.cancellationRequested !== false || !Array.isArray(payload.warnings)
    || !record(payload.resultReferences)) {
    fail('shell-generation job response is incomplete or unsafe.');
  }
  return cloneFrozen(payload);
}

function briefResponse(payload, projectId, shellState, roomIds, project = payload) {
  const sourceReferences = payload?.sourceReferences;
  const brief = payload?.furnitureBrief;
  if (!record(payload) || payload.projectId !== projectId
    || payload.state !== 'FURNITURE_BRIEF_COMPLETE'
    || !Number.isSafeInteger(payload.furnitureBriefVersion) || payload.furnitureBriefVersion < 1
    || project?.furnitureBriefVersion !== payload.furnitureBriefVersion
    || !HASH.test(payload.furnitureBriefSha256 || '')
    || !exactKeys(sourceReferences, [
      'shellModelVersion', 'shellModelSha256', 'geometryVersion', 'geometrySha256', 'actor',
    ])
    || sourceReferences.shellModelVersion !== shellState.shellModelVersion
    || sourceReferences.shellModelSha256 !== shellState.shellModelSha256
    || sourceReferences.geometryVersion !== shellState.geometryVersion
    || sourceReferences.geometrySha256 !== shellState.geometrySha256
    || !exactKeys(brief, ['schema', ...FUNCTIONAL_INPUT_KEYS, 'actor'])
    || brief.schema !== FUNCTIONAL_FURNITURE_BRIEF_SCHEMA
    || !record(brief.actor) || !SAFE_ID.test(brief.actor.actorId || '')
    || canonicalShellJson(brief.actor) !== canonicalShellJson(sourceReferences.actor)) {
    fail('functional furniture brief response lost its approved-shell binding.');
  }
  const input = Object.fromEntries(FUNCTIONAL_INPUT_KEYS.map((key) => [key, brief[key]]));
  const normalized = functionalFurnitureBriefRequest(input, shellState, roomIds);
  const normalizedInput = Object.fromEntries(
    FUNCTIONAL_INPUT_KEYS.map((key) => [key, normalized[key]]),
  );
  if (canonicalShellJson(input) !== canonicalShellJson(normalizedInput)) {
    fail('functional furniture brief response contains noncanonical or design-bearing data.');
  }
  return cloneFrozen(payload);
}

function blocker(code, message) {
  return Object.freeze({ code, message: String(message) });
}

export class PrivateShellCustomerWorkflow {
  #release = null;

  #project = null;

  #source = null;

  #shell = null;

  #evidence = null;

  #visualQuality = null;

  #inspection = null;

  #furnitureBrief = null;

  #reviewClient = null;

  #phase = 'disconnected';

  #blockers = [];

  constructor({
    baseUrl,
    projectId,
    expectedReleaseId,
    fetchImpl = globalThis.fetch,
    enabled = PRIVATE_SHELL_CUSTOMER_WORKFLOW_ENABLED,
  } = {}) {
    if (typeof fetchImpl !== 'function') fail('browser fetch is unavailable.');
    safeId(projectId, 'project');
    if (!RELEASE_ID.test(expectedReleaseId || '')) fail('expected private release ID is invalid.');
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
    this.fetch = (...args) => fetchImpl.call(globalThis, ...args);
    this.enabled = enabled === true;
  }

  #requireEnabled() {
    if (!this.enabled) {
      throw new Error('Private shell customer workflow is disabled and absent from the public journey.');
    }
  }

  #requireRelease() {
    this.#requireEnabled();
    if (!this.#release) throw new Error('Private shell service release has not been verified.');
  }

  #clearReview() {
    this.#reviewClient?.dispose();
    this.#shell = null;
    this.#evidence = null;
    this.#visualQuality = null;
    this.#inspection = null;
    this.#furnitureBrief = null;
  }

  dispose() {
    this.#clearReview();
    this.#release = null;
    this.#project = null;
    this.#source = null;
    this.#reviewClient = null;
    this.#phase = 'disconnected';
    this.#blockers = [];
  }

  async #json(path, { method = 'GET', body } = {}) {
    const url = new URL(path, `${this.origin}/`);
    if (url.origin !== this.origin || url.pathname !== path || url.search || url.hash) {
      throw new Error('Private shell control route is not exact same-origin.');
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
    if (response.url !== url.href) {
      throw new Error('Private shell control response was redirected or changed origin.');
    }
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const cache = (response.headers.get('cache-control') || '').toLowerCase()
      .split(',').map((item) => item.trim());
    const nosniff = (response.headers.get('x-content-type-options') || '').toLowerCase();
    if (contentType !== 'application/json' || !cache.includes('private')
      || !cache.includes('no-store') || nosniff !== 'nosniff') {
      throw new Error('Private shell control response has unsafe MIME or cache headers.');
    }
    const payload = await response.json();
    if (!response.ok) throw responseError(payload, response.status);
    return payload;
  }

  async connect() {
    this.#requireEnabled();
    const manifest = await this.#json(PRIVATE_CAPABILITY_PATH);
    this.#release = validatePrivateShellRelease(manifest, {
      expectedReleaseId: this.expectedReleaseId,
      baseUrl: `${this.baseUrl}/`,
    });
    this.#reviewClient = new PrivateBareShellReviewClient({
      baseUrl: `${this.baseUrl}/`,
      projectId: this.projectId,
      fetchImpl: this.fetch,
      enabled: true,
    });
    return this.sync();
  }

  async #dashboardAndSource() {
    const project = await this.#json(`/api/v1/projects/${encodeURIComponent(this.projectId)}`);
    if (!record(project) || project.projectId !== this.projectId
      || project.workflowContract !== 'bare_shell_first/1') {
      fail('project dashboard is missing or not bare-shell-first.');
    }
    validateDownstreamLock(project);
    const review = await this.#json(`/api/v1/projects/${encodeURIComponent(this.projectId)}/geometry`);
    const source = await validateApprovedGeometryReview(review, project, this.projectId);
    return { project, source };
  }

  #sourceChanged(source) {
    return this.#source && (this.#source.geometryVersion !== source.geometryVersion
      || this.#source.geometrySha256 !== source.geometrySha256
      || this.#source.verticalDimensionsApprovalVersion !== source.verticalDimensionsApprovalVersion
      || this.#source.verticalDimensionsApprovalSha256 !== source.verticalDimensionsApprovalSha256);
  }

  #blocked(error, code = 'shell_review_blocked') {
    this.#phase = 'blocked';
    this.#blockers = [blocker(code, error?.message || error)];
    return this.snapshot();
  }

  async sync() {
    this.#requireRelease();
    this.#blockers = [];
    let current;
    try {
      current = await this.#dashboardAndSource();
    } catch (error) {
      this.#clearReview();
      this.#source = null;
      return this.#blocked(error, 'source_approval_invalid');
    }
    if (this.#sourceChanged(current.source)) this.#clearReview();
    this.#project = current.project;
    this.#source = current.source;
    if (current.project.state === 'GEOMETRY_APPROVED') {
      this.#clearReview();
      this.#phase = 'shell_generation_ready';
      return this.snapshot();
    }
    if (current.project.state === 'SHELL_GENERATING') {
      this.#clearReview();
      this.#phase = 'shell_generating';
      return this.snapshot();
    }
    if (!['SHELL_READY', 'SHELL_APPROVED', 'FURNITURE_BRIEF_COMPLETE'].includes(current.project.state)) {
      this.#clearReview();
      return this.#blocked(
        `Server state ${current.project.state || '(missing)'} cannot enter private shell review.`,
        'server_state_incompatible',
      );
    }
    try {
      const shell = await this.#reviewClient.recoverReviewState();
      exactGeometryBinding(current.source, shell);
      const manifests = shell.artifacts.filter((item) => item.mediaType === 'application/json');
      if (manifests.length !== 1) fail('shell must contain exactly one semantic manifest artifact.');
      const manifestArtifact = await this.#reviewClient.verifiedArtifact(manifests[0].role, shell);
      const evidence = validateShellStructuralEvidence(
        parseManifest(manifestArtifact.bytes), current.source, shell,
      );
      if (current.project.state === 'SHELL_READY' && shell.approvalStatus !== 'ready') {
        fail('dashboard and shell disagree on review status.');
      }
      if (['SHELL_APPROVED', 'FURNITURE_BRIEF_COMPLETE'].includes(current.project.state)
        && shell.approvalStatus !== 'approved') {
        fail('dashboard and shell disagree on approved status.');
      }
      const visualQuality = validateShellVisualQuality(shell, this.#release);
      const sameIdentity = this.#shell
        && this.#shell.shellModelVersion === shell.shellModelVersion
        && this.#shell.shellModelSha256 === shell.shellModelSha256;
      if (!sameIdentity) this.#inspection = null;
      this.#shell = shell;
      this.#evidence = evidence;
      this.#visualQuality = visualQuality;
      this.#phase = shell.approvalStatus === 'approved' ? 'shell_approved' : 'shell_review';
      if (current.project.state === 'FURNITURE_BRIEF_COMPLETE') {
        const brief = await this.#json(`/api/v1/projects/${encodeURIComponent(this.projectId)}/furniture-brief`);
        this.#furnitureBrief = briefResponse(
          brief,
          this.projectId,
          shell,
          evidence.rooms.map((item) => item.id),
          current.project,
        );
        this.#phase = 'functional_brief_complete';
      }
      return this.snapshot();
    } catch (error) {
      this.#clearReview();
      return this.#blocked(error);
    }
  }

  async generateShell() {
    this.#requireRelease();
    if (this.#phase !== 'shell_generation_ready' || !this.#source) {
      throw new Error('Bare-shell generation requires the current source-registered 2D and vertical approval.');
    }
    const payload = await this.#json(
      `/api/v1/projects/${encodeURIComponent(this.projectId)}/shell-models`,
      { method: 'POST' },
    );
    const job = jobResponse(payload, this.projectId);
    this.#phase = 'shell_generating';
    this.#project = Object.freeze({ ...this.#project, state: 'SHELL_GENERATING' });
    this.#blockers = [];
    return job;
  }

  inspectCurrent({
    confirmWalls,
    confirmDoors,
    confirmWindows,
    confirmRooms,
    confirmEveryView,
    viewedArtifactRoles,
  } = {}) {
    this.#requireRelease();
    if (this.#phase !== 'shell_review' || !this.#shell || !this.#evidence || !this.#visualQuality) {
      throw new Error('Bare-shell inspection requires complete structural and visual-quality evidence.');
    }
    if ([confirmWalls, confirmDoors, confirmWindows, confirmRooms, confirmEveryView]
      .some((value) => value !== true)) {
      fail('customer must confirm walls, doors, windows, rooms and every review view.');
    }
    const expectedRoles = this.#shell.reviewViews.map((item) => item.artifactRole);
    if (!sameMembers(viewedArtifactRoles, expectedRoles)
      || new Set(viewedArtifactRoles).size !== viewedArtifactRoles.length) {
      fail('customer review-view ledger is incomplete or duplicated.');
    }
    this.#inspection = Object.freeze({
      schema: 'homeandme-shell-customer-inspection/1',
      projectId: this.projectId,
      geometrySha256: this.#shell.geometrySha256,
      shellModelVersion: this.#shell.shellModelVersion,
      shellModelSha256: this.#shell.shellModelSha256,
      visualEvidenceBindingSha256: this.#visualQuality.bindingSha256,
      viewedArtifactRoles: Object.freeze([...viewedArtifactRoles]),
      confirmed: true,
    });
    return this.#inspection;
  }

  async artifact(role) {
    this.#requireRelease();
    if (!this.#shell) throw new Error('No byte-verified shell is available.');
    return this.#reviewClient.verifiedArtifact(role, this.#shell);
  }

  async approveShell(reviewerActorId) {
    this.#requireRelease();
    safeId(reviewerActorId, 'reviewer');
    if (this.#phase !== 'shell_review' || !this.#inspection || !this.#shell) {
      throw new Error('Bare-shell approval requires the complete customer inspection.');
    }
    const currentQuality = validateShellVisualQuality(this.#shell, this.#release);
    if (currentQuality.bindingSha256 !== this.#inspection.visualEvidenceBindingSha256) {
      this.#inspection = null;
      throw new Error('Visual-quality evidence changed before approval.');
    }
    const approval = await this.#reviewClient.approveCurrent({
      shellModelVersion: this.#shell.shellModelVersion,
      shellModelSha256: this.#shell.shellModelSha256,
      reviewerActorId,
      confirmGeometryOnly: true,
    });
    await this.sync();
    if (this.#phase !== 'shell_approved') {
      throw new Error('Server did not recover the exact approved bare shell.');
    }
    return approval;
  }

  /** UI handoff only: the correction editor must create a new server revision. */
  returnToCorrection() {
    this.#requireRelease();
    if (!this.#source) throw new Error('No approved source revision is available for correction.');
    const handoff = Object.freeze({
      schema: 'homeandme-shell-return-to-correction/1',
      projectId: this.projectId,
      sourceGeometryVersion: this.#source.geometryVersion,
      sourceGeometrySha256: this.#source.geometrySha256,
      route: 'editor.html?mode=service&returnTo=shell-review',
      requiresNewServerRevision: true,
      invalidates: Object.freeze([
        'shell_model', 'furniture_brief', 'layout', 'design_selection',
        'furnished_model', 'render', 'quote', 'payment',
      ]),
    });
    this.#clearReview();
    this.#phase = 'return_to_correction';
    this.#blockers = [blocker(
      'new_geometry_revision_required',
      'Continue in the service correction editor. A new server geometry revision clears shell and downstream approvals.',
    )];
    return handoff;
  }

  async saveFunctionalBrief(input) {
    this.#requireRelease();
    await this.sync();
    if (!['shell_approved', 'functional_brief_complete'].includes(this.#phase)
      || !this.#shell || !this.#evidence) {
      throw new Error('Functional furniture brief remains locked until the exact bare shell is approved.');
    }
    const request = functionalFurnitureBriefRequest(input, this.#shell, this.#evidence.rooms.map((item) => item.id));
    const payload = await this.#json(
      `/api/v1/projects/${encodeURIComponent(this.projectId)}/furniture-brief`,
      { method: 'POST', body: request },
    );
    this.#furnitureBrief = briefResponse(
      payload,
      this.projectId,
      this.#shell,
      this.#evidence.rooms.map((item) => item.id),
      payload,
    );
    this.#phase = 'functional_brief_complete';
    this.#project = Object.freeze({ ...this.#project, state: 'FURNITURE_BRIEF_COMPLETE' });
    return this.#furnitureBrief;
  }

  snapshot() {
    const shellReady = this.#phase === 'shell_review';
    const shellApproved = ['shell_approved', 'functional_brief_complete'].includes(this.#phase);
    return Object.freeze({
      schema: PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
      enabled: this.enabled,
      phase: this.#phase,
      projectId: this.projectId,
      release: this.#release,
      project: this.#project ? cloneFrozen(this.#project) : null,
      source: this.#source ? cloneFrozen({
        geometryVersion: this.#source.geometryVersion,
        geometrySha256: this.#source.geometrySha256,
        geometry2dApprovalVersion: this.#source.geometry2dApprovalVersion,
        geometry2dApprovalSha256: this.#source.geometry2dApprovalSha256,
        verticalDimensionsApprovalVersion: this.#source.verticalDimensionsApprovalVersion,
        verticalDimensionsApprovalSha256: this.#source.verticalDimensionsApprovalSha256,
        registrationSha256: this.#source.registrationSha256,
      }) : null,
      shell: this.#shell ? cloneFrozen({
        shellModelVersion: this.#shell.shellModelVersion,
        shellModelSha256: this.#shell.shellModelSha256,
        artifactManifestSha256: this.#shell.artifactManifestSha256,
        approvalStatus: this.#shell.approvalStatus,
        glbArtifact: this.#shell.glbArtifact,
        artifactTransportContract: this.#shell.artifactTransportContract,
        verificationComplete: this.#shell.verificationComplete,
        reviewViews: this.#shell.reviewViews,
      }) : null,
      evidence: this.#evidence,
      visualQuality: this.#visualQuality,
      inspection: this.#inspection,
      furnitureBrief: this.#furnitureBrief,
      blockers: Object.freeze([...this.#blockers]),
      actions: Object.freeze({
        generateShell: this.#phase === 'shell_generation_ready',
        recoverShell: this.#phase === 'shell_generating' || this.#phase === 'blocked',
        inspectShell: shellReady && Boolean(this.#visualQuality),
        approveShell: shellReady && Boolean(this.#inspection),
        returnToCorrection: Boolean(this.#source),
        functionalFurnitureBrief: shellApproved,
      }),
      downstreamLocks: DOWNSTREAM_LOCKS,
      truth: Object.freeze({
        geometryAuthority: 'server-only',
        demoFallback: false,
        accuracyClaim: false,
        designMaterialRenderCommerceReleased: false,
      }),
    });
  }
}
