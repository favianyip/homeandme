const HASH = /^[a-f0-9]{64}$/;
const ROLE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DISPLAY_TEXT = /^[^\u0000-\u001f\u007f]{1,160}$/u;
const DYNAMIC_PREVIEW_KEYS = Object.freeze([
  'artifactFilename', 'artifactRole', 'artifactSha256', 'roomFunction',
  'roomId', 'roomName', 'view',
]);

export const DYNAMIC_REFERENCE_VIEW_CONTRACT = 'canonical-room-complete-reference-coverage/1';
export const DYNAMIC_REFERENCE_VIEW_ORDER = 'legacy-primary-roles-then-canonical-room-id/1';

export const MODEL_PREVIEW_VIEWS = Object.freeze([
  Object.freeze({ id: 'overview', label: 'Whole-unit overview', cue: 'Trace the complete shell and every exterior opening.' }),
  Object.freeze({ id: 'living', label: 'Living reference', cue: 'Check circulation, hosted openings and furniture clearances.' }),
  Object.freeze({ id: 'bedroom', label: 'Bedroom reference', cue: 'Check partitions, door swings and usable wall lengths.' }),
  Object.freeze({ id: 'kitchen', label: 'Kitchen reference', cue: 'Check enclosure, windows and fixed-cabinet clearances.' }),
]);

export const MODEL_ARTIFACT_LIMITS = Object.freeze({
  glb: 50 * 1024 * 1024,
  preview: 16 * 1024 * 1024,
  previewCount: 64,
  previewTotal: 128 * 1024 * 1024,
});

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function artifactDescriptor(entry, role, kind, mediaType, extra = {}) {
  if (!record(entry) || entry.role !== role) return null;
  return Object.freeze({
    role,
    kind,
    mediaType,
    sha256: entry.sha256,
    byteSize: entry.byteSize,
    ...extra,
  });
}

const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function safeDisplayText(value) {
  return typeof value === 'string' && value === value.trim() && DISPLAY_TEXT.test(value);
}

function dynamicPreviewMetadata(model, previewRoles, errors) {
  const hasViews = owns(model, 'previewViews');
  const hasCoverage = owns(model, 'referenceViewCoverage');
  const dynamic = hasViews || hasCoverage;
  if (!dynamic) return Object.freeze({ dynamic: false, views: null, coverage: null });
  if (!hasViews || !hasCoverage) {
    errors.push('previewViews and referenceViewCoverage must either both be present or both be absent');
  }

  const views = model.previewViews;
  const coverage = model.referenceViewCoverage;
  if (!Array.isArray(views)) errors.push('previewViews must be an ordered array');
  if (!record(coverage)) errors.push('referenceViewCoverage must be an object');
  if (!Array.isArray(previewRoles)) errors.push('previewArtifactRoles must be an ordered array');
  if (!Array.isArray(views) || !Array.isArray(previewRoles) || !record(coverage)) {
    return Object.freeze({ dynamic: true, views: null, coverage: null });
  }

  if (views.length < 2 || views.length > MODEL_ARTIFACT_LIMITS.previewCount) {
    errors.push(`dynamic previewViews must contain 2 to ${MODEL_ARTIFACT_LIMITS.previewCount} entries`);
  }
  if (previewRoles.length !== views.length) {
    errors.push('previewArtifactRoles and previewViews must have the same length');
  }

  const viewNames = new Set();
  const roomIds = [];
  const metadata = views.map((view, index) => {
    if (!record(view)) {
      errors.push(`previewViews[${index}] must be an object`);
      return null;
    }
    const role = previewRoles[index];
    const expectedFilename = `render-angle-${index + 1}.png`;
    if (Object.keys(view).sort().join('\u0000') !== DYNAMIC_PREVIEW_KEYS.join('\u0000')) {
      errors.push(`previewViews[${index}] must contain exactly the seven bound metadata fields`);
    }
    if (view.artifactRole !== role) errors.push(`previewViews[${index}] does not match its ordered artifact role`);
    if (view.artifactFilename !== expectedFilename) errors.push(`previewViews[${index}] does not use ${expectedFilename}`);
    if (!HASH.test(view.artifactSha256 || '')) errors.push(`previewViews[${index}] artifactSha256 is invalid`);
    if (typeof view.view !== 'string' || !ROLE.test(view.view) || viewNames.has(view.view)) {
      errors.push(`previewViews[${index}] has an invalid or repeated view identifier`);
    } else {
      viewNames.add(view.view);
    }
    if (index === 0) {
      if (view.view !== 'overview' || view.roomId !== null
        || view.roomName !== null || view.roomFunction !== null) {
        errors.push('the first dynamic preview must be the room-neutral overview');
      }
    } else if (typeof view.roomId !== 'string' || !ROLE.test(view.roomId)) {
      errors.push(`previewViews[${index}] has an invalid canonical roomId`);
    } else {
      roomIds.push(view.roomId);
      if (!safeDisplayText(view.roomName)) {
        errors.push(`previewViews[${index}] roomName is not safe canonical display text`);
      }
      if (typeof view.roomFunction !== 'string' || !ROLE.test(view.roomFunction)) {
        errors.push(`previewViews[${index}] roomFunction is invalid`);
      }
    }
    const label = index === 0 ? 'Whole-unit overview' : view.roomName;
    const cue = index === 0
      ? 'Cross-check the complete unit shell and exterior openings.'
      : `Cross-check walls, openings and measured clearances for ${view.roomName || 'this canonical room'} (${view.roomFunction || 'unknown function'}).`;
    return Object.freeze({
      viewId: view.view,
      roomId: view.roomId,
      roomName: view.roomName,
      roomFunction: view.roomFunction,
      label,
      cue,
      artifactFilename: view.artifactFilename,
      artifactSha256: view.artifactSha256,
    });
  });
  if (roomIds.length !== new Set(roomIds).size) errors.push('dynamic previews repeat a canonical roomId');

  const authoritative = coverage.authoritativeRoomIds;
  const covered = coverage.coveredRoomIds;
  const expectedCoverageKeys = [
    'authoritativeRoomIds', 'complete', 'contract', 'coveredRoomIds', 'orderingContract',
    'roomViewCount', 'totalViewCount', 'uncoveredRoomIds', 'uncoveredRooms',
  ].sort();
  if (Object.keys(coverage).sort().join('\u0000') !== expectedCoverageKeys.join('\u0000')) {
    errors.push('referenceViewCoverage does not contain the exact version-1 coverage ledger');
  }
  if (coverage.contract !== DYNAMIC_REFERENCE_VIEW_CONTRACT) errors.push('referenceViewCoverage contract is unsupported');
  if (coverage.orderingContract !== DYNAMIC_REFERENCE_VIEW_ORDER) errors.push('referenceViewCoverage ordering contract is unsupported');
  if (coverage.complete !== true) errors.push('referenceViewCoverage must be complete');
  if (!Array.isArray(authoritative) || authoritative.some((roomId) => typeof roomId !== 'string' || !ROLE.test(roomId))) {
    errors.push('referenceViewCoverage authoritativeRoomIds are invalid');
  }
  if (!Array.isArray(covered) || covered.some((roomId) => typeof roomId !== 'string' || !ROLE.test(roomId))) {
    errors.push('referenceViewCoverage coveredRoomIds are invalid');
  }
  if (!Array.isArray(coverage.uncoveredRoomIds) || coverage.uncoveredRoomIds.length !== 0
    || !Array.isArray(coverage.uncoveredRooms) || coverage.uncoveredRooms.length !== 0) {
    errors.push('referenceViewCoverage must declare no uncovered canonical rooms');
  }
  if (Array.isArray(authoritative)) {
    const sorted = [...roomIds].sort();
    if (authoritative.length !== new Set(authoritative).size
      || authoritative.join('\u0000') !== [...authoritative].sort().join('\u0000')
      || authoritative.join('\u0000') !== sorted.join('\u0000')) {
      errors.push('referenceViewCoverage authoritativeRoomIds do not match the dynamic room views');
    }
  }
  if (Array.isArray(covered) && covered.join('\u0000') !== roomIds.join('\u0000')) {
    errors.push('referenceViewCoverage coveredRoomIds do not match ordered previewViews');
  }
  if (coverage.roomViewCount !== roomIds.length || coverage.totalViewCount !== views.length) {
    errors.push('referenceViewCoverage counts do not match previewViews');
  }

  const frozenCoverage = Object.freeze({
    contract: coverage.contract,
    authoritativeRoomIds: Object.freeze(Array.isArray(authoritative) ? [...authoritative] : []),
    coveredRoomIds: Object.freeze(Array.isArray(covered) ? [...covered] : []),
    uncoveredRoomIds: Object.freeze(Array.isArray(coverage.uncoveredRoomIds) ? [...coverage.uncoveredRoomIds] : []),
    uncoveredRooms: Object.freeze(Array.isArray(coverage.uncoveredRooms) ? [...coverage.uncoveredRooms] : []),
    complete: coverage.complete,
    roomViewCount: coverage.roomViewCount,
    totalViewCount: coverage.totalViewCount,
    orderingContract: coverage.orderingContract,
  });
  return Object.freeze({ dynamic: true, views: Object.freeze(metadata), coverage: frozenCoverage });
}

/**
 * Validate the immutable model-to-artifact contract returned by the authenticated service.
 * The browser may inspect these artifacts, but it never authors or substitutes model geometry.
 */
export function validateModelArtifactContract(model) {
  const errors = [];
  if (!record(model)) return Object.freeze({ ok: false, errors: Object.freeze(['model response must be an object']), contract: null });

  if (!Number.isInteger(model.modelVersion) || model.modelVersion < 1) errors.push('modelVersion must be a positive integer');
  if (!HASH.test(model.modelSha256 || '')) errors.push('modelSha256 must be a lowercase SHA-256 digest');
  if (!HASH.test(model.geometrySha256 || '')) errors.push('geometrySha256 must be a lowercase SHA-256 digest');
  if (!HASH.test(model.layoutSha256 || '')) errors.push('layoutSha256 must be a lowercase SHA-256 digest');
  if (!HASH.test(model.sceneManifestSha256 || '')) errors.push('sceneManifestSha256 must be a lowercase SHA-256 digest');

  const previewRoles = Array.isArray(model.previewArtifactRoles) ? model.previewArtifactRoles : [];
  const previewMetadata = dynamicPreviewMetadata(model, model.previewArtifactRoles, errors);
  if (!previewMetadata.dynamic
    && (!Array.isArray(model.previewArtifactRoles) || model.previewArtifactRoles.length !== MODEL_PREVIEW_VIEWS.length)) {
    errors.push(`legacy previewArtifactRoles must contain ${MODEL_PREVIEW_VIEWS.length} roles`);
  }
  const roles = [
    model.glbArtifactRole,
    model.sceneArtifactRole,
    model.sceneManifestArtifactRole,
    ...previewRoles,
  ];
  if (roles.some((role) => typeof role !== 'string' || !ROLE.test(role))) {
    errors.push('model artifact roles must be safe, non-empty identifiers');
  }
  if (new Set(roles).size !== roles.length) errors.push('model artifact roles must be unique');

  const manifest = model.artifactManifest;
  if (!Array.isArray(manifest) || manifest.length !== roles.length) {
    errors.push(`artifactManifest must contain exactly ${roles.length} entries`);
  }
  const manifestByRole = new Map();
  if (Array.isArray(manifest)) {
    for (const entry of manifest) {
      if (!record(entry) || typeof entry.role !== 'string' || !ROLE.test(entry.role)) {
        errors.push('artifactManifest contains an invalid role');
        continue;
      }
      if (manifestByRole.has(entry.role)) errors.push(`artifactManifest repeats role ${entry.role}`);
      if (!HASH.test(entry.sha256 || '')) errors.push(`artifactManifest hash is invalid for ${entry.role}`);
      if (!Number.isSafeInteger(entry.byteSize) || entry.byteSize <= 0) errors.push(`artifactManifest byteSize is invalid for ${entry.role}`);
      manifestByRole.set(entry.role, entry);
    }
  }
  for (const role of roles) {
    if (typeof role === 'string' && !manifestByRole.has(role)) errors.push(`artifactManifest is missing ${role}`);
  }
  for (const role of manifestByRole.keys()) {
    if (!roles.includes(role)) errors.push(`artifactManifest contains undeclared role ${role}`);
  }

  const sceneBindings = Object.freeze({
    geometrySha256: model.geometrySha256,
    layoutSha256: model.layoutSha256,
    sceneManifestSha256: model.sceneManifestSha256,
  });
  const glbEntry = manifestByRole.get(model.glbArtifactRole);
  const glb = artifactDescriptor(
    glbEntry, model.glbArtifactRole, 'glb', 'model/gltf-binary', { sceneBindings },
  );
  if (glb?.byteSize > MODEL_ARTIFACT_LIMITS.glb) errors.push('GLB artifact exceeds the browser review limit');

  const scene = artifactDescriptor(
    manifestByRole.get(model.sceneArtifactRole), model.sceneArtifactRole, 'scene', 'application/x-blender',
  );
  const sceneManifest = artifactDescriptor(
    manifestByRole.get(model.sceneManifestArtifactRole), model.sceneManifestArtifactRole, 'scene-manifest', 'application/json',
  );
  if (sceneManifest && sceneManifest.sha256 !== model.sceneManifestSha256) {
    errors.push('scene manifest hash does not match its model binding');
  }

  const viewDescriptors = previewMetadata.dynamic ? previewMetadata.views : MODEL_PREVIEW_VIEWS;
  const previews = (viewDescriptors || []).map((view, index) => {
    const role = previewRoles[index];
    if (previewMetadata.dynamic && view?.artifactSha256 !== manifestByRole.get(role)?.sha256) {
      errors.push(`dynamic preview hash binding does not match artifactManifest for ${role || `index ${index}`}`);
    }
    const descriptor = artifactDescriptor(
      manifestByRole.get(role), role, 'preview', 'image/png', {
        viewId: previewMetadata.dynamic ? view?.viewId : view.id,
        roomId: previewMetadata.dynamic ? view?.roomId : null,
        roomName: previewMetadata.dynamic ? view?.roomName : null,
        roomFunction: previewMetadata.dynamic ? view?.roomFunction : null,
        label: view?.label,
        cue: view?.cue,
        artifactFilename: previewMetadata.dynamic ? view?.artifactFilename : null,
      },
    );
    if (descriptor?.byteSize > MODEL_ARTIFACT_LIMITS.preview) errors.push(`${descriptor.viewId || `index ${index}`} preview exceeds the browser review limit`);
    return descriptor;
  });
  const previewByteTotal = previews.reduce((total, descriptor) => total + (descriptor?.byteSize || 0), 0);
  if (previewByteTotal > MODEL_ARTIFACT_LIMITS.previewTotal) {
    errors.push('combined preview artifacts exceed the browser review limit');
  }

  if (errors.length || !glb || !scene || !sceneManifest || previews.some((item) => !item)) {
    return Object.freeze({ ok: false, errors: Object.freeze([...new Set(errors)]), contract: null });
  }

  const reviewArtifacts = Object.freeze([glb, ...previews]);
  const contract = Object.freeze({
    modelVersion: model.modelVersion,
    modelSha256: model.modelSha256,
    mode: previewMetadata.dynamic ? 'dynamic' : 'legacy',
    glb,
    scene,
    sceneManifest,
    previews: Object.freeze(previews),
    coverage: previewMetadata.dynamic ? previewMetadata.coverage : null,
    reviewArtifacts,
  });
  return Object.freeze({ ok: true, errors: Object.freeze([]), contract });
}

export function modelArtifactContract(model) {
  const result = validateModelArtifactContract(model);
  if (!result.ok) throw new TypeError(`Invalid model artifact contract: ${result.errors.join('; ')}.`);
  return result.contract;
}

export function artifactReceiptMatches(descriptor, receipt) {
  return Boolean(descriptor && receipt
    && descriptor.role === receipt.role
    && descriptor.mediaType === receipt.contentType
    && descriptor.sha256 === receipt.sha256
    && descriptor.byteSize === receipt.byteSize);
}

/** Fail-closed approval state for the GLB plus every manifest-bound reference render. */
export function modelReviewApprovalState({ contract, receipt, confirmed = false, busy = false } = {}) {
  const expected = Array.isArray(contract?.reviewArtifacts) ? contract.reviewArtifacts : [];
  const received = Array.isArray(receipt?.artifacts) ? receipt.artifacts : [];
  const byRole = new Map();
  for (const item of received) {
    if (item && typeof item.role === 'string' && !byRole.has(item.role)) byRole.set(item.role, item);
  }
  const verifiedCount = expected.filter((item) => artifactReceiptMatches(item, byRole.get(item.role))).length;
  const sameModel = receipt?.modelVersion === contract?.modelVersion
    && receipt?.modelSha256 === contract?.modelSha256;
  const dynamicRoomIds = Array.isArray(contract?.previews)
    ? contract.previews.slice(1).map((preview) => preview?.roomId) : [];
  const coveredRoomIds = Array.isArray(contract?.coverage?.coveredRoomIds)
    ? contract.coverage.coveredRoomIds : [];
  const authoritativeRoomIds = Array.isArray(contract?.coverage?.authoritativeRoomIds)
    ? contract.coverage.authoritativeRoomIds : [];
  const dynamicCoverageShape = contract?.mode === 'dynamic'
    && contract.previews?.[0]?.viewId === 'overview'
    && contract.previews?.[0]?.roomId === null
    && contract.previews?.[0]?.roomName === null
    && contract.previews?.[0]?.roomFunction === null
    && contract.previews.slice(1).every((preview) => safeDisplayText(preview?.roomName)
      && preview?.label === preview.roomName
      && typeof preview?.roomFunction === 'string'
      && ROLE.test(preview.roomFunction))
    && dynamicRoomIds.every((roomId) => typeof roomId === 'string' && ROLE.test(roomId))
    && dynamicRoomIds.length === new Set(dynamicRoomIds).size
    && coveredRoomIds.join('\u0000') === dynamicRoomIds.join('\u0000')
    && authoritativeRoomIds.join('\u0000') === [...dynamicRoomIds].sort().join('\u0000');
  const contractShape = Array.isArray(contract?.previews)
    && expected.length === 1 + contract.previews.length
    && ((contract.mode === 'legacy' && contract.previews.length === MODEL_PREVIEW_VIEWS.length && contract.coverage === null)
      || (dynamicCoverageShape
        && contract.previews.length >= 2
        && contract.previews.length <= MODEL_ARTIFACT_LIMITS.previewCount
        && contract.coverage?.complete === true
        && contract.coverage?.uncoveredRoomIds?.length === 0
        && contract.coverage?.uncoveredRooms?.length === 0
        && contract.coverage?.roomViewCount === contract.previews.length - 1
        && contract.coverage?.totalViewCount === contract.previews.length));
  const ready = contractShape
    && received.length === expected.length
    && byRole.size === expected.length
    && verifiedCount === expected.length
    && sameModel;
  const approvalEligible = ready && contract?.mode === 'dynamic';
  return Object.freeze({
    ready,
    verifiedCount,
    requiredCount: expected.length,
    canConfirm: approvalEligible && busy !== true,
    canApprove: approvalEligible && confirmed === true && busy !== true,
  });
}

/** Validate the binary GLB envelope before handing bytes to Three.js. */
export function inspectGlbContainer(bytes, expectedBindings = {}) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 20) throw new TypeError('GLB is too small to contain a valid header.');
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67) throw new TypeError('GLB magic header is invalid.');
  const version = view.getUint32(4, true);
  if (version !== 2) throw new TypeError('Only binary glTF version 2 is supported.');
  const declaredByteSize = view.getUint32(8, true);
  if (declaredByteSize !== bytes.byteLength) throw new TypeError('GLB declared byte size does not match the downloaded artifact.');
  const jsonChunkByteSize = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a || jsonChunkByteSize <= 0 || 20 + jsonChunkByteSize > bytes.byteLength) {
    throw new TypeError('GLB JSON chunk is invalid.');
  }
  let document;
  try {
    const source = new TextDecoder('utf-8', { fatal: true })
      .decode(new Uint8Array(bytes, 20, jsonChunkByteSize))
      .replace(/\u0000+$/g, '')
      .trimEnd();
    document = JSON.parse(source);
  } catch (_) {
    throw new TypeError('GLB JSON chunk cannot be decoded.');
  }
  if (!record(document) || !record(document.asset) || !/^2(?:\.\d+)?$/.test(document.asset.version || '')) {
    throw new TypeError('GLB JSON document does not declare glTF 2.x.');
  }
  const bindingKeys = Object.freeze({
    geometrySha256: 'spatialforge_geometry_sha256',
    layoutSha256: 'spatialforge_layout_sha256',
    sceneManifestSha256: 'spatialforge_scene_manifest_sha256',
  });
  const expectedEntries = Object.entries(bindingKeys)
    .filter(([field]) => expectedBindings[field] !== undefined);
  if (expectedEntries.length) {
    const sceneIndex = document.scene;
    const scene = Number.isInteger(sceneIndex) && Array.isArray(document.scenes)
      ? document.scenes[sceneIndex] : null;
    if (!record(scene) || !record(scene.extras)) {
      throw new TypeError('GLB selected scene has no immutable SpatialForge bindings.');
    }
    for (const [field, extraKey] of expectedEntries) {
      const expected = expectedBindings[field];
      if (!HASH.test(expected || '')) throw new TypeError(`Expected ${field} binding is invalid.`);
      if (scene.extras[extraKey] !== expected) {
        throw new TypeError(`GLB ${field} does not match the authenticated model contract.`);
      }
    }
  }
  const resourceUris = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!record(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'uri' && typeof child === 'string') resourceUris.push(child);
      else visit(child);
    }
  };
  visit(document);
  if (resourceUris.some((uri) => !uri.startsWith('data:'))) {
    throw new TypeError('GLB contains an external resource URI; review artifacts must be self-contained.');
  }
  return Object.freeze({
    version,
    byteSize: bytes.byteLength,
    jsonChunkByteSize,
    embeddedResourceCount: resourceUris.length,
  });
}
