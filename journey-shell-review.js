/**
 * Private bare-shell review client.
 *
 * This module is deliberately absent from the public journey and deploy manifest. It is
 * disabled by default and accepts only the authenticated, same-origin bare-shell routes.
 * A renderer can obtain bytes only after every artifact in the current shell version has
 * passed its exact role, MIME, byte-size and SHA-256 binding.
 */

export const PRIVATE_BARE_SHELL_REVIEW_ENABLED = false;
export const PRIVATE_BARE_SHELL_REVIEW_SCHEMA = 'homeandme-private-bare-shell-review/1';

const HASH = /^[a-f0-9]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const DISPLAY_TEXT = /^[^\u0000-\u001f\u007f]{1,200}$/u;

const SHELL_SCHEMA = 'spatialforge-shell-model/2';
const SCENE_MANIFEST_SCHEMA = 'spatialforge-shell-scene-manifest/2';
const ARTIFACT_CLASS = 'shell_model';
const COMPILER_VERSION = 'spatialforge-bare-shell-compiler/2';
const COORDINATE_CONTRACT = 'canonical-z-up-mm-to-blender-z-up-m-to-gltf-y-up/1';
const MATERIAL_CONTRACT = 'spatialforge-neutral-shell-review-material/1';
const LIGHTING_CONTRACT = 'spatialforge-neutral-shell-review-lighting/2';
const REVIEW_EXPOSURE_EV = -1;
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
    profile: 'preview',
    exposureEv: -1,
    roomAreaLightEnergyWatts: 420,
    keyAreaLightEnergyWatts: 1080,
    sunEnergy: 1.35,
    worldStrength: 0.26,
  }),
  production: Object.freeze({
    profile: 'production',
    exposureEv: -1,
    roomAreaLightEnergyWatts: 90,
    keyAreaLightEnergyWatts: 250,
    sunEnergy: 0.7,
    worldStrength: 0.08,
  }),
});
const CAMERA_CONTRACT = 'room-rendered-solid-clearance-opening-coverage/3';
const OVERVIEW_CAMERA_CONTRACT = 'whole-unit-exterior-overview/2';
const COVERAGE_CONTRACT = 'canonical-room-and-hosted-opening-reference-coverage/2';
const IMAGE_QUALITY_CONTRACT = 'spatialforge-neutral-shell-png-quality/1';
const OPENING_VISIBILITY_CONTRACT = 'hosted-opening-centre-ray-frustum/1';
const COVERAGE_ORDER = 'legacy-primary-roles-then-canonical-room-id-then-hosted-opening-id/2';

const MAX_ARTIFACT_BYTES = Object.freeze({
  'model/gltf-binary': 50 * 1024 * 1024,
  'application/json': 4 * 1024 * 1024,
  'image/png': 16 * 1024 * 1024,
});
const MAX_REVIEW_VIEWS = 64;
const MAX_TOTAL_BYTES = 182 * 1024 * 1024;

const SHELL_PAYLOAD_KEYS = Object.freeze([
  'schema',
  'artifactClass',
  'geometryVersion',
  'geometrySha256',
  'geometry2dApprovalVersion',
  'geometry2dApprovalSha256',
  'verticalDimensionsApprovalVersion',
  'verticalDimensionsApprovalSha256',
  'wholeUnitTopologySha256',
  'coordinateContract',
  'compilerVersion',
  'neutralMaterialContract',
  'reviewLightingContract',
  'reviewLightingParameters',
  'reviewExposureEv',
  'cameraContract',
  'referenceViewContract',
  'reviewImageQualityContract',
  'glbArtifactRole',
  'sceneManifestArtifactRole',
  'sceneManifestSha256',
  'reviewArtifactRoles',
  'reviewViews',
  'referenceViewCoverage',
  'rendererVersion',
  'renderEngine',
  'renderProfile',
  'renderSamples',
  'renderResolution',
  'artifactManifest',
  'artifactManifestSha256',
]);
const SHELL_RESPONSE_KEYS = Object.freeze([
  'projectId',
  'shellModelVersion',
  'shellModelSha256',
  'approvalStatus',
  ...SHELL_PAYLOAD_KEYS,
  'artifacts',
]);
const COVERAGE_KEYS = Object.freeze([
  'contract',
  'cameraContract',
  'authoritativeRoomIds',
  'coveredRoomIds',
  'uncoveredRoomIds',
  'uncoveredRooms',
  'hostedOpeningIds',
  'coveredHostedOpeningIds',
  'uncoveredHostedOpeningIds',
  'openingCoverageComplete',
  'complete',
  'roomViewCount',
  'supplementaryViewCount',
  'totalViewCount',
  'minimumCameraWallSolidClearanceMm',
  'minimumNearPlaneWallSolidClearanceMm',
  'minimumCameraRoomBoundaryClearanceMm',
  'minimumCameraTargetDistanceMm',
  'nearClipMm',
  'sensorWidthMm',
  'sensorFit',
  'renderAspectRatio',
  'openingVisibilityContract',
  'orderingContract',
]);
const REVIEW_VIEW_KEYS = Object.freeze([
  'artifactFilename',
  'artifactRole',
  'artifactSha256',
  'imageQuality',
  'roomFunction',
  'roomId',
  'roomName',
  'view',
]);
const IMAGE_QUALITY_KEYS = Object.freeze([
  'contract',
  'widthPixels',
  'heightPixels',
  'meanLuma',
  'stddevLuma',
  'whitePixelFraction',
  'blackPixelFraction',
  'passed',
  'failureCodes',
]);

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return record(value)
    && Object.keys(value).sort().join('\u0000') === [...expected].sort().join('\u0000');
}

function safePositiveInteger(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function assertHash(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) {
    throw new TypeError(`${label} is not a canonical SHA-256 digest.`);
  }
}

function pythonJsonString(value) {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (character) => (
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  ));
}

/** Python json.dumps(sort_keys=True, separators=(",", ":")) parity for bound records. */
export function canonicalShellJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return pythonJsonString(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical shell JSON cannot contain a non-finite number.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalShellJson).join(',')}]`;
  if (!record(value)) throw new TypeError('Canonical shell JSON contains an unsupported value.');
  return `{${Object.keys(value).sort().map((key) => (
    `${pythonJsonString(key)}:${canonicalShellJson(value[key])}`
  )).join(',')}}`;
}

function asArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  throw new TypeError('Artifact bytes must be an ArrayBuffer.');
}

export async function sha256Hex(bytes) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto SHA-256 is unavailable.');
  const digest = await subtle.digest('SHA-256', asArrayBuffer(bytes));
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function shellArtifactPath(projectId, version, role) {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/shell-models/${version}/artifacts/${encodeURIComponent(role)}`;
}

function shellCurrentPath(projectId) {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/shell-models/current`;
}

function projectPath(projectId) {
  return `/api/v1/projects/${encodeURIComponent(projectId)}`;
}

function payloadOnly(shell) {
  return Object.fromEntries(SHELL_PAYLOAD_KEYS.map((key) => [key, shell[key]]));
}

function validLightingParameters(value, renderProfile) {
  const expected = LIGHTING_PARAMETERS[renderProfile];
  return Boolean(expected)
    && exactKeys(value, LIGHTING_PARAMETER_KEYS)
    && LIGHTING_PARAMETER_KEYS.every((key) => value[key] === expected[key]);
}

function validateCoverage(shell) {
  const coverage = shell.referenceViewCoverage;
  if (!exactKeys(coverage, COVERAGE_KEYS)) {
    throw new TypeError('Bare-shell canonical-room coverage has missing or extra fields.');
  }
  const views = shell.reviewViews;
  const roles = shell.reviewArtifactRoles;
  if (!Array.isArray(views) || !Array.isArray(roles)
    || views.length < 2 || views.length > MAX_REVIEW_VIEWS
    || views.length !== roles.length) {
    throw new TypeError('Bare-shell review views do not cover the overview, rooms and hosted openings.');
  }
  const seenViews = new Set();
  const primaryRoomIds = [];
  const allRoomIds = [];
  if (!safePositiveInteger(coverage.roomViewCount)
    || !Number.isSafeInteger(coverage.supplementaryViewCount)
    || coverage.supplementaryViewCount < 0
    || coverage.totalViewCount !== views.length
    || 1 + coverage.roomViewCount + coverage.supplementaryViewCount !== views.length) {
    throw new TypeError('Bare-shell primary/supplementary view counts are inconsistent.');
  }
  for (let index = 0; index < views.length; index += 1) {
    const view = views[index];
    const role = roles[index];
    if (!exactKeys(view, REVIEW_VIEW_KEYS)) {
      throw new TypeError(`Bare-shell review view ${index} has missing or extra fields.`);
    }
    if (!IDENTIFIER.test(role || '') || view.artifactRole !== role
      || view.artifactFilename !== `render-angle-${index + 1}.png`
      || !HASH.test(view.artifactSha256 || '')
      || !IDENTIFIER.test(view.view || '') || seenViews.has(view.view)) {
      throw new TypeError(`Bare-shell review view ${index} has an invalid artifact binding.`);
    }
    if (index === 0) {
      if (view.view !== 'overview' || view.roomId !== null
        || view.roomName !== null || view.roomFunction !== null) {
        throw new TypeError('Bare-shell review must begin with one room-neutral overview.');
      }
    } else {
      if (!IDENTIFIER.test(view.roomId || '')
        || typeof view.roomName !== 'string' || view.roomName !== view.roomName.trim()
        || !DISPLAY_TEXT.test(view.roomName)
        || !IDENTIFIER.test(view.roomFunction || '')) {
        throw new TypeError(`Bare-shell review view ${index} has an invalid canonical-room binding.`);
      }
      if (index <= coverage.roomViewCount) {
        if (primaryRoomIds.includes(view.roomId)) {
          throw new TypeError('Bare-shell primary room views contain a duplicate room.');
        }
        primaryRoomIds.push(view.roomId);
      }
      allRoomIds.push(view.roomId);
    }
    const quality = view.imageQuality;
    if (!exactKeys(quality, IMAGE_QUALITY_KEYS)
      || quality.contract !== IMAGE_QUALITY_CONTRACT
      || !safePositiveInteger(quality.widthPixels) || !safePositiveInteger(quality.heightPixels)
      || ![quality.meanLuma, quality.stddevLuma, quality.whitePixelFraction,
        quality.blackPixelFraction].every(Number.isFinite)
      || quality.whitePixelFraction < 0 || quality.whitePixelFraction > 1
      || quality.blackPixelFraction < 0 || quality.blackPixelFraction > 1
      || quality.passed !== true || !Array.isArray(quality.failureCodes)
      || quality.failureCodes.length !== 0) {
      throw new TypeError(`Bare-shell review view ${index} failed its image-quality contract.`);
    }
    seenViews.add(view.view);
  }
  const authoritative = coverage.authoritativeRoomIds;
  const covered = coverage.coveredRoomIds;
  const hosted = coverage.hostedOpeningIds;
  const coveredHosted = coverage.coveredHostedOpeningIds;
  if (coverage.contract !== COVERAGE_CONTRACT
    || coverage.cameraContract !== CAMERA_CONTRACT
    || coverage.orderingContract !== COVERAGE_ORDER
    || coverage.complete !== true
    || !Array.isArray(authoritative) || !Array.isArray(covered)
    || !Array.isArray(coverage.uncoveredRoomIds) || coverage.uncoveredRoomIds.length !== 0
    || !Array.isArray(coverage.uncoveredRooms) || coverage.uncoveredRooms.length !== 0
    || !Array.isArray(hosted) || !Array.isArray(coveredHosted)
    || !Array.isArray(coverage.uncoveredHostedOpeningIds)
    || coverage.uncoveredHostedOpeningIds.length !== 0
    || coverage.openingCoverageComplete !== true
    || new Set(hosted).size !== hosted.length || new Set(coveredHosted).size !== coveredHosted.length
    || hosted.some((value) => !IDENTIFIER.test(value))
    || coveredHosted.some((value) => !IDENTIFIER.test(value))
    || [...hosted].sort().join('\u0000') !== hosted.join('\u0000')
    || hosted.join('\u0000') !== coveredHosted.join('\u0000')
    || covered.join('\u0000') !== primaryRoomIds.join('\u0000')
    || authoritative.join('\u0000') !== [...primaryRoomIds].sort().join('\u0000')
    || allRoomIds.some((roomId) => !authoritative.includes(roomId))
    || coverage.minimumCameraWallSolidClearanceMm !== 250
    || coverage.minimumNearPlaneWallSolidClearanceMm !== 250
    || coverage.minimumCameraRoomBoundaryClearanceMm !== 250
    || coverage.minimumCameraTargetDistanceMm !== 750
    || coverage.nearClipMm !== 50 || coverage.sensorWidthMm !== 36
    || coverage.sensorFit !== 'HORIZONTAL' || coverage.renderAspectRatio !== '8:5'
    || coverage.openingVisibilityContract !== OPENING_VISIBILITY_CONTRACT) {
    throw new TypeError('Bare-shell room/hosted-opening coverage is incomplete or inconsistent.');
  }
}

function validateArtifactDescriptors(shell, expectedProjectId) {
  const manifest = shell.artifactManifest;
  const descriptors = shell.artifacts;
  const reviewRoles = shell.reviewArtifactRoles;
  if (!Array.isArray(manifest) || !Array.isArray(descriptors)
    || !Array.isArray(reviewRoles)) {
    throw new TypeError('Bare-shell artifact records are unavailable.');
  }
  const requiredMedia = new Map([
    [shell.glbArtifactRole, 'model/gltf-binary'],
    [shell.sceneManifestArtifactRole, 'application/json'],
    ...reviewRoles.map((role) => [role, 'image/png']),
  ]);
  if (requiredMedia.size !== reviewRoles.length + 2
    || manifest.length !== requiredMedia.size
    || descriptors.length !== requiredMedia.size) {
    throw new TypeError('Bare-shell artifacts contain duplicate, extra or missing roles.');
  }
  const roles = manifest.map((entry) => entry?.role);
  if (roles.some((role) => !IDENTIFIER.test(role || ''))
    || new Set(roles).size !== roles.length
    || roles.join('\u0000') !== [...roles].sort().join('\u0000')
    || [...requiredMedia.keys()].some((role) => !roles.includes(role))) {
    throw new TypeError('Bare-shell artifact manifest roles are invalid or noncanonical.');
  }
  let totalBytes = 0;
  const byRole = new Map();
  for (let index = 0; index < manifest.length; index += 1) {
    const entry = manifest[index];
    const descriptor = descriptors[index];
    if (!exactKeys(entry, ['role', 'sha256', 'byteSize'])
      || !exactKeys(descriptor, ['role', 'sha256', 'byteSize', 'mediaType', 'url'])) {
      throw new TypeError('Bare-shell artifact records contain missing or forbidden fields.');
    }
    assertHash(entry.sha256, `Bare-shell artifact ${entry.role} hash`);
    if (!safePositiveInteger(entry.byteSize)
      || descriptor.role !== entry.role
      || descriptor.sha256 !== entry.sha256
      || descriptor.byteSize !== entry.byteSize
      || descriptor.mediaType !== requiredMedia.get(entry.role)) {
      throw new TypeError(`Bare-shell artifact ${entry.role} disagrees with its manifest.`);
    }
    const expectedPath = shellArtifactPath(expectedProjectId, shell.shellModelVersion, entry.role);
    if (descriptor.url !== expectedPath) {
      throw new TypeError(`Bare-shell artifact ${entry.role} does not use its exact private route.`);
    }
    const limit = MAX_ARTIFACT_BYTES[descriptor.mediaType];
    if (!safePositiveInteger(limit) || entry.byteSize > limit) {
      throw new TypeError(`Bare-shell artifact ${entry.role} exceeds its browser review limit.`);
    }
    totalBytes += entry.byteSize;
    byRole.set(entry.role, Object.freeze({
      role: entry.role,
      sha256: entry.sha256,
      byteSize: entry.byteSize,
      mediaType: descriptor.mediaType,
      path: expectedPath,
    }));
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new TypeError('Bare-shell review artifacts exceed the combined in-memory limit.');
  }
  if (byRole.get(shell.sceneManifestArtifactRole)?.sha256 !== shell.sceneManifestSha256) {
    throw new TypeError('Bare-shell semantic manifest hash disagrees with its artifact descriptor.');
  }
  for (const view of shell.reviewViews) {
    const descriptor = byRole.get(view.artifactRole);
    if (!descriptor || descriptor.mediaType !== 'image/png'
      || descriptor.sha256 !== view.artifactSha256) {
      throw new TypeError('Bare-shell review-view hashes disagree with the artifact manifest.');
    }
  }
  return Object.freeze({
    descriptors: Object.freeze([...byRole.values()]),
    totalBytes,
  });
}

/** Validate one server-returned current bare-shell envelope before any byte download. */
export async function validateBareShellResponse(shell, {
  expectedProjectId,
} = {}) {
  if (!PROJECT_ID.test(expectedProjectId || '') || !exactKeys(shell, SHELL_RESPONSE_KEYS)) {
    throw new TypeError('The current bare-shell response has missing or forbidden fields.');
  }
  if (shell.projectId !== expectedProjectId
    || !safePositiveInteger(shell.shellModelVersion)
    || !['ready', 'approved'].includes(shell.approvalStatus)) {
    throw new TypeError('The current bare-shell identity or approval status is invalid.');
  }
  assertHash(shell.shellModelSha256, 'Bare-shell model hash');
  const integerBindings = [
    'geometryVersion', 'geometry2dApprovalVersion', 'verticalDimensionsApprovalVersion',
  ];
  const hashBindings = [
    'geometrySha256', 'geometry2dApprovalSha256', 'verticalDimensionsApprovalSha256',
    'wholeUnitTopologySha256', 'sceneManifestSha256', 'artifactManifestSha256',
  ];
  if (integerBindings.some((key) => !safePositiveInteger(shell[key]))) {
    throw new TypeError('Bare-shell source versions are invalid.');
  }
  hashBindings.forEach((key) => assertHash(shell[key], `Bare-shell ${key}`));
  if (shell.schema !== SHELL_SCHEMA
    || shell.artifactClass !== ARTIFACT_CLASS
    || shell.coordinateContract !== COORDINATE_CONTRACT
    || shell.compilerVersion !== COMPILER_VERSION
    || shell.neutralMaterialContract !== MATERIAL_CONTRACT
    || shell.reviewLightingContract !== LIGHTING_CONTRACT
    || !validLightingParameters(shell.reviewLightingParameters, shell.renderProfile)
    || shell.reviewExposureEv !== REVIEW_EXPOSURE_EV
    || shell.cameraContract !== CAMERA_CONTRACT
    || shell.referenceViewContract !== COVERAGE_CONTRACT
    || shell.reviewImageQualityContract !== IMAGE_QUALITY_CONTRACT
    || !IDENTIFIER.test(shell.glbArtifactRole || '')
    || !IDENTIFIER.test(shell.sceneManifestArtifactRole || '')
    || typeof shell.rendererVersion !== 'string' || !shell.rendererVersion
    || typeof shell.renderEngine !== 'string' || !shell.renderEngine
    || typeof shell.renderProfile !== 'string' || !shell.renderProfile
    || !safePositiveInteger(shell.renderSamples)
    || (!record(shell.renderResolution) && !Array.isArray(shell.renderResolution))) {
    throw new TypeError('The bare-shell compiler or neutral-review contract is unsupported.');
  }
  validateCoverage(shell);
  const artifactContract = validateArtifactDescriptors(shell, expectedProjectId);
  const manifestDigest = await sha256Hex(new TextEncoder().encode(canonicalShellJson(shell.artifactManifest)));
  if (manifestDigest !== shell.artifactManifestSha256) {
    throw new TypeError('Bare-shell artifact manifest SHA-256 is stale.');
  }
  const payloadDigest = await sha256Hex(new TextEncoder().encode(canonicalShellJson(payloadOnly(shell))));
  if (payloadDigest !== shell.shellModelSha256) {
    throw new TypeError('Bare-shell model SHA-256 does not match its immutable payload.');
  }
  return Object.freeze({
    projectId: shell.projectId,
    shellModelVersion: shell.shellModelVersion,
    shellModelSha256: shell.shellModelSha256,
    approvalStatus: shell.approvalStatus,
    geometryVersion: shell.geometryVersion,
    geometrySha256: shell.geometrySha256,
    geometry2dApprovalVersion: shell.geometry2dApprovalVersion,
    geometry2dApprovalSha256: shell.geometry2dApprovalSha256,
    verticalDimensionsApprovalVersion: shell.verticalDimensionsApprovalVersion,
    verticalDimensionsApprovalSha256: shell.verticalDimensionsApprovalSha256,
    wholeUnitTopologySha256: shell.wholeUnitTopologySha256,
    shellSchema: shell.schema,
    compilerVersion: shell.compilerVersion,
    reviewLightingContract: shell.reviewLightingContract,
    reviewLightingParameters: Object.freeze({ ...shell.reviewLightingParameters }),
    reviewExposureEv: shell.reviewExposureEv,
    renderProfile: shell.renderProfile,
    cameraContract: shell.cameraContract,
    referenceViewContract: shell.referenceViewContract,
    reviewImageQualityContract: shell.reviewImageQualityContract,
    artifactManifestSha256: shell.artifactManifestSha256,
    descriptors: artifactContract.descriptors,
    totalBytes: artifactContract.totalBytes,
    coverage: Object.freeze({
      roomCount: shell.referenceViewCoverage.roomViewCount,
      viewCount: shell.referenceViewCoverage.totalViewCount,
    }),
    reviewViews: Object.freeze(shell.reviewViews.map((view) => Object.freeze({
      view: view.view,
      roomId: view.roomId,
      roomName: view.roomName,
      roomFunction: view.roomFunction,
      artifactRole: view.artifactRole,
      artifactFilename: view.artifactFilename,
      artifactSha256: view.artifactSha256,
      imageQuality: Object.freeze({ ...view.imageQuality, failureCodes: Object.freeze([
        ...view.imageQuality.failureCodes,
      ]) }),
    }))),
  });
}

function validateDashboardBinding(project, contract) {
  if (!record(project) || project.projectId !== contract.projectId
    || project.workflowContract !== 'bare_shell_first/1'
    || project.shellModelVersion !== contract.shellModelVersion) {
    throw new TypeError('Project dashboard has a stale bare-shell pointer.');
  }
  if (contract.approvalStatus === 'ready') {
    if (project.state !== 'SHELL_READY' || project.approvedShellModelVersion !== null) {
      throw new TypeError('Project dashboard disagrees with the review-ready shell.');
    }
    return 'review_ready';
  }
  if (project.approvedShellModelVersion !== contract.shellModelVersion
    || !['SHELL_APPROVED', 'FURNITURE_BRIEF_COMPLETE', 'DESIGN_SELECTION_COMPLETE',
      'LAYOUT_GENERATING', 'LAYOUT_READY', 'LAYOUT_APPROVED', 'MODEL_GENERATING',
      'MODEL_READY', 'MODEL_APPROVED', 'RENDER_QUEUED', 'RENDERING', 'RENDER_READY',
      'REVISION_REQUESTED', 'QUOTE_READY', 'QUOTE_APPROVED', 'PAYMENT_PENDING', 'PAID']
      .includes(project.state)) {
    throw new TypeError('Project dashboard disagrees with the approved shell.');
  }
  return 'approved';
}

function validatePng(bytes) {
  const view = new Uint8Array(bytes);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (view.length < 24 || signature.some((value, index) => view[index] !== value)) {
    throw new TypeError('A bare-shell review image is not a PNG file.');
  }
}

/**
 * Bounded self-contained GLB envelope validation shared with the private orbit presentation gate.
 * This is deliberately not a renderer: it proves only a local glTF 2.x binary envelope with no
 * external resource URI. The scene/geometry authority remains the separately verified manifest.
 */
export function validateBareShellGlbEnvelope(bytes) {
  if (bytes.byteLength < 20) throw new TypeError('The bare-shell GLB is truncated.');
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== bytes.byteLength
    || view.getUint32(16, true) !== 0x4e4f534a) {
    throw new TypeError('The bare-shell GLB envelope is invalid.');
  }
  const jsonSize = view.getUint32(12, true);
  if (jsonSize <= 0 || 20 + jsonSize > bytes.byteLength) {
    throw new TypeError('The bare-shell GLB JSON chunk is invalid.');
  }
  let document;
  try {
    document = JSON.parse(new TextDecoder('utf-8', { fatal: true })
      .decode(new Uint8Array(bytes, 20, jsonSize)).replace(/\u0000+$/g, '').trimEnd());
  } catch (_) {
    throw new TypeError('The bare-shell GLB JSON chunk cannot be decoded.');
  }
  if (!record(document) || !record(document.asset) || !/^2(?:\.\d+)?$/.test(document.asset.version || '')) {
    throw new TypeError('The bare-shell GLB does not declare glTF 2.x.');
  }
  const externalUris = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!record(value)) return undefined;
    return Object.entries(value).forEach(([key, child]) => {
      if (key === 'uri' && typeof child === 'string' && !child.startsWith('data:')) externalUris.push(child);
      else visit(child);
    });
  };
  visit(document);
  if (externalUris.length) throw new TypeError('The bare-shell GLB contains an external resource URI.');
}

function validateSceneManifest(bytes, shell) {
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (_) {
    throw new TypeError('The bare-shell semantic manifest is not valid UTF-8 JSON.');
  }
  if (!record(manifest)
    || manifest.schema !== SCENE_MANIFEST_SCHEMA
    || manifest.artifactClass !== ARTIFACT_CLASS
    || manifest.projectId !== shell.projectId
    || manifest.geometrySha256 !== shell.geometrySha256
    || manifest.compilerVersion !== COMPILER_VERSION
    || manifest.coordinateContract !== COORDINATE_CONTRACT
    || manifest.neutralMaterialContract !== MATERIAL_CONTRACT
    || manifest.reviewLightingContract !== LIGHTING_CONTRACT
    || !validLightingParameters(manifest.reviewLightingParameters, manifest.renderProfile)
    || canonicalShellJson(manifest.reviewLightingParameters)
      !== canonicalShellJson(shell.reviewLightingParameters)
    || manifest.renderProfile !== shell.renderProfile
    || manifest.reviewExposureEv !== REVIEW_EXPOSURE_EV
    || manifest.cameraContract !== CAMERA_CONTRACT
    || manifest.referenceViewContract !== COVERAGE_CONTRACT
    || manifest.reviewImageQualityContract !== IMAGE_QUALITY_CONTRACT
    || !Array.isArray(manifest.placements) || manifest.placements.length !== 0
    || !Array.isArray(manifest.referenceViews)
    || manifest.referenceViews.length !== shell.reviewViews.length
    || canonicalShellJson(manifest.referenceViewCoverage)
      !== canonicalShellJson(shell.referenceViewCoverage)) {
    throw new TypeError('The bare-shell semantic manifest is stale, furnished or incompatible.');
  }
  const visibleHostedOpeningIds = new Set();
  const hostedOpeningIds = new Set(shell.referenceViewCoverage.hostedOpeningIds);
  for (let index = 0; index < shell.reviewViews.length; index += 1) {
    const source = manifest.referenceViews[index];
    const review = shell.reviewViews[index];
    if (!record(source)
      || source.view !== review.view
      || source.roomId !== review.roomId
      || source.roomName !== review.roomName
      || source.roomFunction !== review.roomFunction
      || source.artifactFilename !== review.artifactFilename) {
      throw new TypeError('Bare-shell review views disagree with the semantic manifest.');
    }
    if (index === 0) {
      if (source.kind !== 'whole_unit_overview'
        || source.selectionContract !== OVERVIEW_CAMERA_CONTRACT
        || source.openingVisibilityContract !== OPENING_VISIBILITY_CONTRACT
        || !Array.isArray(source.visibleHostedOpeningIds)
        || source.visibleHostedOpeningIds.length !== 0) {
        throw new TypeError('Bare-shell overview camera contract is inconsistent.');
      }
      continue;
    }
    const primary = index <= shell.referenceViewCoverage.roomViewCount;
    const adjacent = source.adjacentHostedOpeningIds;
    const visible = source.visibleHostedOpeningIds;
    if (source.kind !== (primary ? 'canonical_room' : 'hosted_opening_coverage')
      || source.selectionContract !== CAMERA_CONTRACT
      || source.openingVisibilityContract !== OPENING_VISIBILITY_CONTRACT
      || source.cameraOriginWallSolidClearanceMm < 250
      || source.nearPlaneWallSolidClearanceMm < 250
      || source.cameraBoundaryClearanceMm < 250
      || source.cameraTargetDistanceMm < 750
      || source.nearClipMm !== 50 || source.sensorWidthMm !== 36
      || source.sensorFit !== 'HORIZONTAL' || source.renderAspectRatio !== '8:5'
      || !Array.isArray(adjacent) || new Set(adjacent).size !== adjacent.length
      || adjacent.some((openingId) => !hostedOpeningIds.has(openingId))
      || !Array.isArray(visible) || new Set(visible).size !== visible.length
      || visible.some((openingId) => !hostedOpeningIds.has(openingId))
      || (primary && source.coverageFocusOpeningId !== null)
      || (!primary && (!hostedOpeningIds.has(source.coverageFocusOpeningId)
        || !visible.includes(source.coverageFocusOpeningId)))) {
      throw new TypeError(`Bare-shell camera evidence is invalid for ${source.view}.`);
    }
    visible.forEach((openingId) => visibleHostedOpeningIds.add(openingId));
  }
  if ([...hostedOpeningIds].some((openingId) => !visibleHostedOpeningIds.has(openingId))) {
    throw new TypeError('Bare-shell semantic views do not visibly cover every hosted opening.');
  }
}

function sameContract(left, right) {
  return left.projectId === right.projectId
    && left.shellModelVersion === right.shellModelVersion
    && left.shellModelSha256 === right.shellModelSha256
    && left.artifactManifestSha256 === right.artifactManifestSha256
    && left.approvalStatus === right.approvalStatus;
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

export class PrivateBareShellReviewClient {
  #artifactBytes = new Map();

  #receipt = null;

  constructor({
    baseUrl,
    projectId,
    fetchImpl = globalThis.fetch,
    enabled = PRIVATE_BARE_SHELL_REVIEW_ENABLED,
  } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('A browser fetch implementation is required.');
    if (!PROJECT_ID.test(projectId || '')) throw new TypeError('A safe project ID is required.');
    let url;
    try { url = new URL(baseUrl); } catch (_) { throw new TypeError('A valid project API base URL is required.'); }
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || (local && !['http:', 'https:'].includes(url.protocol))
      || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
      throw new TypeError('Private bare-shell review requires HTTPS or a loopback API.');
    }
    this.baseUrl = url.href.replace(/\/$/, '');
    this.origin = url.origin;
    this.projectId = projectId;
    this.fetch = (...args) => fetchImpl.call(globalThis, ...args);
    this.enabled = enabled === true;
  }

  #requireEnabled() {
    if (!this.enabled) {
      throw new Error('Private bare-shell review is disabled and is not wired to the public journey.');
    }
  }

  #clear() {
    this.#artifactBytes.clear();
    this.#receipt = null;
  }

  dispose() {
    this.#clear();
  }

  async #json(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const requestUrl = `${this.baseUrl}${path}`;
    const response = await this.fetch(requestUrl, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
    });
    if (response.url !== requestUrl) {
      throw new Error('The private project service control URL was redirected or changed origin.');
    }
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      throw new Error('The private project service returned a non-JSON control response.');
    }
    const payload = await response.json();
    if (!response.ok) throw responseError(payload, response.status);
    return payload;
  }

  async #currentContract() {
    const shell = await this.#json(shellCurrentPath(this.projectId));
    const contract = await validateBareShellResponse(shell, { expectedProjectId: this.projectId });
    return { shell, contract };
  }

  async #downloadArtifact(descriptor, shell) {
    const url = new URL(descriptor.path, `${this.origin}/`);
    if (url.origin !== this.origin || url.pathname !== descriptor.path
      || url.search || url.hash || url.username || url.password) {
      throw new Error('Bare-shell artifact URL was rejected.');
    }
    const response = await this.fetch(url.href, {
      method: 'GET',
      headers: { Accept: descriptor.mediaType },
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
    });
    if (response.url !== url.href) {
      throw new Error('Bare-shell artifact response was redirected or changed origin.');
    }
    if (!response.ok) throw new Error(`Bare-shell artifact request failed (${response.status}).`);
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
    const nosniff = (response.headers.get('x-content-type-options') || '').toLowerCase();
    if (contentType !== descriptor.mediaType
      || !cacheControl.split(',').map((value) => value.trim()).includes('private')
      || !cacheControl.split(',').map((value) => value.trim()).includes('no-store')
      || nosniff !== 'nosniff') {
      throw new TypeError(`Bare-shell artifact ${descriptor.role} has unsafe response headers.`);
    }
    const declaredLength = response.headers.get('content-length');
    if (declaredLength !== null && (!/^\d+$/.test(declaredLength)
      || Number(declaredLength) !== descriptor.byteSize)) {
      throw new TypeError(`Bare-shell artifact ${descriptor.role} has a stale declared size.`);
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== descriptor.byteSize) {
      throw new TypeError(`Bare-shell artifact ${descriptor.role} byte size is stale.`);
    }
    const digest = await sha256Hex(bytes);
    if (digest !== descriptor.sha256) {
      throw new TypeError(`Bare-shell artifact ${descriptor.role} SHA-256 is stale.`);
    }
    if (descriptor.mediaType === 'image/png') validatePng(bytes);
    else if (descriptor.mediaType === 'model/gltf-binary') validateBareShellGlbEnvelope(bytes);
    else if (descriptor.mediaType === 'application/json') validateSceneManifest(bytes, shell);
    return bytes;
  }

  /**
   * Recover one exact review state after reload. The receipt is published only after all bytes
   * verify and two dashboard/current-shell reads prove that no version changed during recovery.
   */
  async recoverReviewState() {
    this.#requireEnabled();
    this.#clear();
    try {
      const firstProject = await this.#json(projectPath(this.projectId));
      const first = await this.#currentContract();
      const firstStatus = validateDashboardBinding(firstProject, first.contract);
      const downloaded = new Map();
      for (const descriptor of first.contract.descriptors) {
        downloaded.set(descriptor.role, await this.#downloadArtifact(descriptor, first.shell));
      }
      const second = await this.#currentContract();
      const secondProject = await this.#json(projectPath(this.projectId));
      const secondStatus = validateDashboardBinding(secondProject, second.contract);
      if (!sameContract(first.contract, second.contract) || firstStatus !== secondStatus) {
        throw new Error('Bare-shell version changed during review recovery.');
      }
      this.#artifactBytes = downloaded;
      this.#receipt = Object.freeze({
        projectId: first.contract.projectId,
        shellModelVersion: first.contract.shellModelVersion,
        shellModelSha256: first.contract.shellModelSha256,
        artifactManifestSha256: first.contract.artifactManifestSha256,
        approvalStatus: first.contract.approvalStatus,
        descriptors: first.contract.descriptors,
      });
      const glbArtifact = first.contract.descriptors.find(
        (descriptor) => descriptor.mediaType === 'model/gltf-binary',
      );
      return Object.freeze({
        schema: PRIVATE_BARE_SHELL_REVIEW_SCHEMA,
        projectId: first.contract.projectId,
        recoveryStatus: firstStatus,
        approvalStatus: first.contract.approvalStatus,
        shellModelVersion: first.contract.shellModelVersion,
        shellModelSha256: first.contract.shellModelSha256,
        geometryVersion: first.contract.geometryVersion,
        geometrySha256: first.contract.geometrySha256,
        geometry2dApprovalVersion: first.contract.geometry2dApprovalVersion,
        geometry2dApprovalSha256: first.contract.geometry2dApprovalSha256,
        verticalDimensionsApprovalVersion: first.contract.verticalDimensionsApprovalVersion,
        verticalDimensionsApprovalSha256: first.contract.verticalDimensionsApprovalSha256,
        wholeUnitTopologySha256: first.contract.wholeUnitTopologySha256,
        shellSchema: first.contract.shellSchema,
        compilerVersion: first.contract.compilerVersion,
        reviewLightingContract: first.contract.reviewLightingContract,
        reviewLightingParameters: first.contract.reviewLightingParameters,
        reviewExposureEv: first.contract.reviewExposureEv,
        renderProfile: first.contract.renderProfile,
        cameraContract: first.contract.cameraContract,
        referenceViewContract: first.contract.referenceViewContract,
        reviewImageQualityContract: first.contract.reviewImageQualityContract,
        artifactManifestSha256: first.contract.artifactManifestSha256,
        artifactCount: first.contract.descriptors.length,
        verifiedArtifactCount: downloaded.size,
        totalVerifiedBytes: first.contract.totalBytes,
        roomCount: first.contract.coverage.roomCount,
        viewCount: first.contract.coverage.viewCount,
        reviewViews: first.contract.reviewViews,
        artifacts: Object.freeze(first.contract.descriptors.map((descriptor) => Object.freeze({
          role: descriptor.role,
          mediaType: descriptor.mediaType,
          byteSize: descriptor.byteSize,
          sha256: descriptor.sha256,
        }))),
        glbArtifact: Object.freeze({
          role: glbArtifact.role,
          mediaType: glbArtifact.mediaType,
          byteSize: glbArtifact.byteSize,
          sha256: glbArtifact.sha256,
        }),
        artifactTransportContract: 'same-origin-private-no-store/1',
        verificationComplete: downloaded.size === first.contract.descriptors.length,
      });
    } catch (error) {
      this.#clear();
      throw error;
    }
  }

  /** Return a fresh in-memory copy only if the complete current-version receipt still exists. */
  async verifiedArtifact(role, { shellModelVersion, shellModelSha256 } = {}) {
    this.#requireEnabled();
    const receipt = this.#receipt;
    if (!receipt || receipt.shellModelVersion !== shellModelVersion
      || receipt.shellModelSha256 !== shellModelSha256
      || !IDENTIFIER.test(role || '')) {
      throw new Error('No complete byte-verified receipt exists for this bare-shell version.');
    }
    const descriptor = receipt.descriptors.find((item) => item.role === role);
    const bytes = this.#artifactBytes.get(role);
    if (!descriptor || !bytes || this.#artifactBytes.size !== receipt.descriptors.length) {
      this.#clear();
      throw new Error('The complete bare-shell artifact receipt is unavailable.');
    }
    if (await sha256Hex(bytes) !== descriptor.sha256) {
      this.#clear();
      throw new Error('A bare-shell artifact changed after verification.');
    }
    return Object.freeze({
      role,
      mediaType: descriptor.mediaType,
      byteSize: descriptor.byteSize,
      sha256: descriptor.sha256,
      bytes: bytes.slice(0),
    });
  }

  /** Approve only the exact current version/hash whose complete artifact set verified locally. */
  async approveCurrent({
    shellModelVersion,
    shellModelSha256,
    reviewerActorId,
    confirmGeometryOnly,
  } = {}) {
    this.#requireEnabled();
    const receipt = this.#receipt;
    if (!receipt || this.#artifactBytes.size !== receipt.descriptors.length
      || receipt.approvalStatus !== 'ready') {
      throw new Error('Bare-shell approval requires a complete byte-verified review receipt.');
    }
    if (shellModelVersion !== receipt.shellModelVersion
      || shellModelSha256 !== receipt.shellModelSha256) {
      throw new Error('Bare-shell approval version/hash does not match the verified receipt.');
    }
    if (!IDENTIFIER.test(reviewerActorId || '') || confirmGeometryOnly !== true) {
      throw new TypeError('Bare-shell approval requires a valid reviewer and geometry-only confirmation.');
    }
    try {
      const project = await this.#json(projectPath(this.projectId));
      const current = await this.#currentContract();
      validateDashboardBinding(project, current.contract);
      if (!sameContract(receipt, current.contract)) {
        this.#clear();
        throw new Error('Bare-shell version changed before approval.');
      }
      const approval = await this.#json(
        `/api/v1/projects/${encodeURIComponent(this.projectId)}/shell-models/${shellModelVersion}/approve`,
        {
          method: 'POST',
          body: { shellModelSha256, reviewerActorId, confirmGeometryOnly: true },
        },
      );
      if (!record(approval) || approval.projectId !== this.projectId
        || approval.state !== 'SHELL_APPROVED'
        || approval.approvedShellModelVersion !== shellModelVersion
        || approval.shellModelSha256 !== shellModelSha256
        || !safePositiveInteger(approval.shellModelApprovalVersion)
        || !HASH.test(approval.shellModelApprovalSha256 || '')) {
        this.#clear();
        throw new Error('Bare-shell approval response lost its exact version/hash binding.');
      }
      this.#receipt = Object.freeze({ ...receipt, approvalStatus: 'approved' });
      return Object.freeze({
        projectId: approval.projectId,
        state: approval.state,
        shellModelVersion,
        shellModelSha256,
        shellModelApprovalVersion: approval.shellModelApprovalVersion,
        shellModelApprovalSha256: approval.shellModelApprovalSha256,
      });
    } catch (error) {
      if (this.#receipt?.shellModelVersion !== shellModelVersion
        || this.#receipt?.shellModelSha256 !== shellModelSha256) this.#clear();
      throw error;
    }
  }
}
