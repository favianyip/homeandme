const HASH = /^[a-f0-9]{64}$/;
const ROLE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const MODEL_PREVIEW_VIEWS = Object.freeze([
  Object.freeze({ id: 'overview', label: 'Whole-unit overview', cue: 'Trace the complete shell and every exterior opening.' }),
  Object.freeze({ id: 'living', label: 'Living reference', cue: 'Check circulation, hosted openings and furniture clearances.' }),
  Object.freeze({ id: 'bedroom', label: 'Bedroom reference', cue: 'Check partitions, door swings and usable wall lengths.' }),
  Object.freeze({ id: 'kitchen', label: 'Kitchen reference', cue: 'Check enclosure, windows and fixed-cabinet clearances.' }),
]);

export const MODEL_ARTIFACT_LIMITS = Object.freeze({
  glb: 50 * 1024 * 1024,
  preview: 16 * 1024 * 1024,
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

  const roles = [
    model.glbArtifactRole,
    model.sceneArtifactRole,
    model.sceneManifestArtifactRole,
    ...(Array.isArray(model.previewArtifactRoles) ? model.previewArtifactRoles : []),
  ];
  if (!Array.isArray(model.previewArtifactRoles) || model.previewArtifactRoles.length !== MODEL_PREVIEW_VIEWS.length) {
    errors.push(`previewArtifactRoles must contain ${MODEL_PREVIEW_VIEWS.length} roles`);
  }
  if (roles.length !== 3 + MODEL_PREVIEW_VIEWS.length
    || roles.some((role) => typeof role !== 'string' || !ROLE.test(role))) {
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

  const previews = MODEL_PREVIEW_VIEWS.map((view, index) => {
    const role = model.previewArtifactRoles?.[index];
    const descriptor = artifactDescriptor(
      manifestByRole.get(role), role, 'preview', 'image/png', { viewId: view.id, label: view.label, cue: view.cue },
    );
    if (descriptor?.byteSize > MODEL_ARTIFACT_LIMITS.preview) errors.push(`${view.id} preview exceeds the browser review limit`);
    return descriptor;
  });

  if (errors.length || !glb || !scene || !sceneManifest || previews.some((item) => !item)) {
    return Object.freeze({ ok: false, errors: Object.freeze([...new Set(errors)]), contract: null });
  }

  const reviewArtifacts = Object.freeze([glb, ...previews]);
  const contract = Object.freeze({
    modelVersion: model.modelVersion,
    modelSha256: model.modelSha256,
    glb,
    scene,
    sceneManifest,
    previews: Object.freeze(previews),
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

/** Fail-closed approval state for the GLB plus all four fixed reference renders. */
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
  const ready = expected.length === 1 + MODEL_PREVIEW_VIEWS.length
    && received.length === expected.length
    && byRole.size === expected.length
    && verifiedCount === expected.length
    && sameModel;
  return Object.freeze({
    ready,
    verifiedCount,
    requiredCount: expected.length,
    canConfirm: ready && busy !== true,
    canApprove: ready && confirmed === true && busy !== true,
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
