export const PROOF_MANIFEST_SHA256 = 'dab16313b30fb1e9def29906cc8f8d925755ff41c522712bfc34e757493898a5';
export const PROOF_MANIFEST_BYTE_SIZE = 29614;
export const PROOF_ROOT = 'assets/reviewed-whole-unit/';

const PROOF_SCHEMA = 'spatialforge-local-design-reference-proof/1';
const GEOMETRY_SHA256 = '0ab9a41bed3cf186d175571ff20557f4828124e68eba7747bdae737acc96d786';
const PLACEMENT_SHA256 = 'e76055b57b7f7fe9d6aa54c8e5d3638a3eab3740b1261d7cb64bcc07d8fff5f1';
const EXPECTED_STYLES = [
  {
    referenceId: 'hnm-scandinavian-calm-v1',
    referenceSha256: '1add7193ae7e9e2ec4c55456b5c3576d278a92a2b28f67b4e5fb3c89eae1e41c',
    styleKey: 'scandinavian',
    label: 'Scandinavian Calm',
  },
  {
    referenceId: 'hnm-warm-contemporary-v1',
    referenceSha256: '3f36172d1d33fade769bbb66fc61b3809793f95c1482a53f7a8fb8614f01f2b1',
    styleKey: 'warm_contemporary',
    label: 'Warm Contemporary',
  },
  {
    referenceId: 'hnm-modern-luxe-v1',
    referenceSha256: '8fb615e6d57d4cf0359d41737ac7effeb03729a6bfaafe440848c65384e8c396',
    styleKey: 'modern_luxe',
    label: 'Modern Luxe',
  },
];
const EXPECTED_VIEWS = [
  ['overview', null, null, null],
  ['living', 'room-living-dining', 'living', 'Living and Dining'],
  ['bedroom', 'room-bedroom-2', 'bedroom', 'Bedroom 2'],
  ['kitchen', 'room-kitchen', 'kitchen', 'Kitchen'],
  ['room-room-common-bath', 'room-common-bath', 'bathroom', 'Common Bathroom'],
  ['room-room-master-bedroom', 'room-master-bedroom', 'bedroom', 'Master Bedroom'],
  ['room-room-master-ensuite', 'room-master-ensuite', 'ensuite_bathroom', 'Master Ensuite'],
  ['room-room-public-circulation', 'room-public-circulation', 'circulation', 'Public Circulation Spine'],
  ['room-room-service-yard', 'room-service-yard', 'service_yard', 'Service Yard'],
  ['room-room-store', 'room-store', 'store', 'Store'],
];
const EXPECTED_ROOM_IDS = EXPECTED_VIEWS.slice(1).map((view) => view[1]).sort();
const EXPECTED_MATERIAL_ROLES = ['ceramic', 'fabric', 'floor', 'linen', 'opening_frame', 'rug', 'stone', 'wall', 'wood'];
const FILE_MEDIA_TYPES = {
  designReference: 'application/json',
  glb: 'model/gltf-binary',
  requestedRender: 'image/png',
  sceneManifest: 'application/json',
};

function invariant(value, message) {
  if (!value) throw new Error(message);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('Expected an ArrayBuffer or byte view.');
}

export function isSafeProofPath(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 240) return false;
  if (value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[:?#%\u0000-\u001f]/.test(value)) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment));
}

function validateSha(value, label) {
  invariant(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), `${label} is not a lowercase SHA-256 value.`);
}

function validateDescriptor(descriptor, label, expectedMediaType = null) {
  invariant(descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor), `${label} is missing.`);
  invariant(isSafeProofPath(descriptor.path), `${label} has an unsafe local path.`);
  validateSha(descriptor.sha256, `${label} SHA-256`);
  invariant(Number.isSafeInteger(descriptor.byteSize) && descriptor.byteSize > 0 && descriptor.byteSize <= 16 * 1024 * 1024, `${label} has an invalid byte size.`);
  if (expectedMediaType) invariant(descriptor.mediaType === expectedMediaType, `${label} has an unexpected media type.`);
  return descriptor;
}

function validateRights(rights, label) {
  invariant(rights?.commercialUseAllowed === true, `${label} is not cleared for commercial use.`);
  invariant(rights?.derivativeUseAllowed === true, `${label} is not cleared for derivative use.`);
  invariant(rights?.renderPublicationAllowed === true, `${label} is not cleared for render publication.`);
  invariant(rights?.thirdPartyMediaConsumed === false, `${label} consumed third-party media.`);
  invariant(rights?.rawAssetRedistributionRequired === false, `${label} requires raw-asset redistribution.`);
  invariant(rights?.rightsBasis === 'original-procedural-definition', `${label} has an unexpected rights basis.`);
  invariant(rights?.origin === 'spatialforge-code-authored-procedural-materials', `${label} has an unexpected origin.`);
  invariant(rights?.evidenceContract === 'no-external-binary-assets/1', `${label} has an unexpected evidence contract.`);
  invariant(Array.isArray(rights?.externalSourceUris) && rights.externalSourceUris.length === 0, `${label} contains external source URIs.`);
}

function validateCoverage(coverage, styleLabel) {
  invariant(coverage?.contract === 'canonical-room-complete-reference-coverage/1', `${styleLabel} has an unexpected room-coverage contract.`);
  invariant(coverage?.complete === true, `${styleLabel} does not cover every canonical room.`);
  invariant(coverage?.roomViewCount === 9 && coverage?.totalViewCount === 10, `${styleLabel} has an incomplete view count.`);
  invariant(sameJson([...coverage.authoritativeRoomIds].sort(), EXPECTED_ROOM_IDS), `${styleLabel} has an unexpected authoritative room set.`);
  invariant(sameJson([...coverage.coveredRoomIds].sort(), EXPECTED_ROOM_IDS), `${styleLabel} has an unexpected covered room set.`);
  invariant(Array.isArray(coverage.uncoveredRoomIds) && coverage.uncoveredRoomIds.length === 0, `${styleLabel} declares uncovered room IDs.`);
  invariant(Array.isArray(coverage.uncoveredRooms) && coverage.uncoveredRooms.length === 0, `${styleLabel} declares uncovered rooms.`);
}

function validateStyle(style, expected) {
  invariant(style?.referenceId === expected.referenceId, `Expected reference ${expected.referenceId}.`);
  invariant(style?.referenceSha256 === expected.referenceSha256, `${expected.label} has an unexpected reference hash.`);
  invariant(style?.referenceVersion === 1, `${expected.label} has an unexpected reference version.`);
  invariant(style?.styleKey === expected.styleKey && style?.label === expected.label, `${expected.label} identity does not match.`);
  validateSha(style.referenceSha256, `${expected.label} reference SHA-256`);
  validateRights(style.rights, `${expected.label} rights evidence`);

  invariant(style.audit?.aiPostProcessing === null, `${expected.label} declares AI post-processing.`);
  invariant(style.audit?.blendKeptPrivate === true, `${expected.label} does not keep its authoring file private.`);
  invariant(style.audit?.sceneManifestBindingsVerified === true, `${expected.label} scene bindings were not verified.`);
  invariant(Array.isArray(style.audit?.externalConditioningConsumed) && style.audit.externalConditioningConsumed.length === 0, `${expected.label} consumed external conditioning.`);
  invariant(Array.isArray(style.audit?.gltfExternalResourceUris) && style.audit.gltfExternalResourceUris.length === 0, `${expected.label} GLB declares external resources.`);

  invariant(style.bindings?.geometrySha256 === GEOMETRY_SHA256 && style.bindings?.geometryVersion === 1, `${expected.label} is not bound to the pinned geometry.`);
  invariant(style.bindings?.placementFingerprintSha256 === PLACEMENT_SHA256, `${expected.label} placement fingerprint differs.`);
  validateSha(style.bindings?.layoutSha256, `${expected.label} layout SHA-256`);
  validateSha(style.bindings?.modelSha256, `${expected.label} model SHA-256`);
  validateSha(style.bindings?.renderSha256, `${expected.label} render SHA-256`);
  validateSha(style.bindings?.renderRequestSha256, `${expected.label} render request SHA-256`);
  validateSha(style.bindings?.sceneManifestSha256, `${expected.label} scene manifest SHA-256`);
  validateSha(style.bindings?.glbSha256, `${expected.label} GLB SHA-256`);

  const fileKeys = Object.keys(style.files || {}).sort();
  invariant(sameJson(fileKeys, Object.keys(FILE_MEDIA_TYPES).sort()), `${expected.label} does not have the exact four-file bundle.`);
  for (const [key, mediaType] of Object.entries(FILE_MEDIA_TYPES)) validateDescriptor(style.files[key], `${expected.label} ${key}`, mediaType);
  invariant(style.files.glb.sha256 === style.bindings.glbSha256, `${expected.label} GLB binding differs from its file hash.`);
  invariant(style.files.sceneManifest.sha256 === style.bindings.sceneManifestSha256, `${expected.label} scene-manifest binding differs from its file hash.`);

  validateCoverage(style.coverage, expected.label);
  invariant(Array.isArray(style.views) && style.views.length === EXPECTED_VIEWS.length, `${expected.label} does not have ten reference views.`);
  style.views.forEach((view, index) => {
    validateDescriptor(view, `${expected.label} view ${index + 1}`, 'image/png');
    const identity = [view.viewId, view.roomId, view.roomFunction, view.roomName];
    invariant(sameJson(identity, EXPECTED_VIEWS[index]), `${expected.label} view ${index + 1} has an unexpected canonical identity.`);
  });

  invariant(Array.isArray(style.materials) && style.materials.length === EXPECTED_MATERIAL_ROLES.length, `${expected.label} has an incomplete procedural palette.`);
  const roles = style.materials.map((material) => material.role).sort();
  invariant(sameJson(roles, EXPECTED_MATERIAL_ROLES), `${expected.label} has an unexpected procedural material role.`);
  for (const material of style.materials) {
    invariant(typeof material.name === 'string' && material.name.length > 0, `${expected.label} has an unnamed material.`);
    invariant(Array.isArray(material.baseColorSrgb) && material.baseColorSrgb.length === 3 && material.baseColorSrgb.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255), `${expected.label} has an invalid material colour.`);
    invariant(Number.isFinite(material.patternScaleMm) && material.patternScaleMm > 0, `${expected.label} has an invalid pattern scale.`);
    invariant(Number.isFinite(material.reliefMm) && material.reliefMm >= 0, `${expected.label} has an invalid relief.`);
    invariant(Number.isFinite(material.roughness) && material.roughness >= 0 && material.roughness <= 1, `${expected.label} has an invalid roughness.`);
  }

  invariant(style.renderer?.engine === 'BLENDER_EEVEE' && style.renderer?.profile === 'preview', `${expected.label} has an unexpected renderer profile.`);
  invariant(style.renderer?.samples === 96 && sameJson(style.renderer?.resolution, [1024, 640]), `${expected.label} has unexpected render settings.`);
}

export function validateProofManifest(proof) {
  invariant(proof?.schema === PROOF_SCHEMA, 'The proof manifest schema is unavailable or unexpected.');
  invariant(proof?.scope === 'local-review-only', 'The proof is not explicitly review-only.');
  invariant(proof?.publication?.deployed === false, 'The proof incorrectly claims it was deployed.');
  invariant(proof?.publication?.pushed === false, 'The proof incorrectly claims it was pushed.');
  invariant(proof?.publication?.publicFlagsChanged === false, 'The proof changed public service flags.');
  invariant(proof?.publication?.servedDirectoryContainsPrivateDatabase === false, 'The proof says a private database entered the served directory.');

  invariant(proof?.catalog?.schema === 'spatialforge-design-reference-catalog/1', 'The reference catalog schema is unexpected.');
  invariant(proof?.catalog?.referenceCount === 3, 'The reference catalog does not contain exactly three references.');
  invariant(proof?.catalog?.thirdPartyMediaConsumed === false, 'The reference catalog consumed third-party media.');
  invariant(Array.isArray(proof?.catalog?.externalSourceUris) && proof.catalog.externalSourceUris.length === 0, 'The reference catalog contains external source URIs.');

  invariant(proof?.externalAssetAudit?.passed === true, 'The external-asset audit did not pass.');
  invariant(proof?.externalAssetAudit?.thirdPartyMediaConsumed === false, 'The external-asset audit found third-party media.');
  for (const field of ['externalSourceUris', 'gltfExternalResourceUris', 'htmlExternalAssetUrls']) {
    invariant(Array.isArray(proof.externalAssetAudit[field]) && proof.externalAssetAudit[field].length === 0, `The external-asset audit found ${field}.`);
  }
  invariant(proof?.externalAssetAudit?.referencePreviews === 0, 'The proof contains externally conditioned reference previews.');

  invariant(proof?.networkAudit?.passed === true && proof?.networkAudit?.status === 'verified', 'The proof network audit did not pass.');
  invariant(proof?.networkAudit?.internetAddressedCalls === 0, 'The proof network trace includes internet-addressed calls.');
  validateDescriptor(proof.networkAudit, 'Network-audit record');

  invariant(proof?.fixture?.contract === 'reviewed-public-spine-complete-unit/1', 'The fixture contract is unexpected.');
  invariant(proof?.fixture?.geometryConstruction === 'host-segment-subtraction/1', 'The fixture did not use host-segment subtraction.');
  invariant(proof?.fixture?.topologyReadyForWholeUnit3d === true, 'The reviewed fixture topology is not ready for whole-unit rendering.');
  invariant(proof?.fixture?.geometrySha256 === GEOMETRY_SHA256 && proof?.fixture?.geometryVersion === 1, 'The fixture geometry binding is unexpected.');
  invariant(proof?.fixture?.walls === 12 && proof?.fixture?.openings === 16 && proof?.fixture?.doors === 9 && proof?.fixture?.windows === 7 && proof?.fixture?.rooms === 9 && proof?.fixture?.placements === 11, 'The reviewed fixture counts are unexpected.');
  validateDescriptor(proof.fixture.geometryArtifact, 'Canonical-geometry artifact', 'application/json');

  invariant(proof?.controlledComparison?.sameGeometrySha256 === true, 'The three references do not share geometry.');
  invariant(proof?.controlledComparison?.samePlacementFingerprintSha256 === true, 'The three references do not share placements.');
  invariant(proof?.controlledComparison?.sameReferenceViewCameraSet === true, 'The three references do not share a room-camera set.');
  invariant(proof?.controlledComparison?.sameRequestedCamera === true, 'The three references do not share the requested camera.');
  invariant(proof?.controlledComparison?.placementFingerprintSha256 === PLACEMENT_SHA256, 'The controlled-comparison placement fingerprint is unexpected.');

  invariant(proof?.visualInspection?.status === 'completed', 'The visual inspection is not complete.');
  invariant(proof?.visualInspection?.blockingGeometryConsumptionDefectObserved === false, 'A blocking geometry-consumption defect was observed.');
  invariant(proof?.visualInspection?.inspectedViewCount === 33, 'The visual inspection count is unexpected.');
  invariant(Array.isArray(proof?.limitations) && proof.limitations.length >= 9, 'The proof limitations are missing or incomplete.');
  invariant(proof.limitations.some((item) => /not an as-built promise/i.test(item)), 'The as-built limitation is missing.');
  invariant(proof.limitations.some((item) => /not a detector-accuracy result/i.test(item)), 'The detector-accuracy limitation is missing.');
  invariant(proof.limitations.some((item) => /site measurement/i.test(item)), 'The site-measurement limitation is missing.');

  invariant(Array.isArray(proof?.styles) && proof.styles.length === EXPECTED_STYLES.length, 'The proof does not contain all three expected references.');
  proof.styles.forEach((style, index) => validateStyle(style, EXPECTED_STYLES[index]));
  const firstCamera = proof.styles[0].renderer.requestedCamera;
  const firstViews = proof.styles[0].views.map(({ viewId, roomId }) => [viewId, roomId]);
  for (const style of proof.styles.slice(1)) {
    invariant(sameJson(style.renderer.requestedCamera, firstCamera), `${style.label} requested camera is not controlled.`);
    invariant(sameJson(style.views.map(({ viewId, roomId }) => [viewId, roomId]), firstViews), `${style.label} room-camera identities differ.`);
  }

  invariant(Array.isArray(proof.reviewClient) && proof.reviewClient.length === 3, 'The source proof client ledger is incomplete.');
  proof.reviewClient.forEach((descriptor, index) => validateDescriptor(descriptor, `Source proof client ${index + 1}`));
  return proof;
}

export async function sha256Hex(value) {
  const bytes = asBytes(value);
  invariant(globalThis.crypto?.subtle, 'Web Crypto SHA-256 is unavailable; evidence verification cannot continue.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(asBytes(bytes)));
  } catch {
    throw new Error(`${label} is not valid UTF-8 JSON.`);
  }
}

export async function validateManifestBytes(value) {
  const bytes = asBytes(value);
  invariant(bytes.byteLength === PROOF_MANIFEST_BYTE_SIZE, 'Pinned proof-manifest byte size mismatch.');
  invariant(await sha256Hex(bytes) === PROOF_MANIFEST_SHA256, 'Pinned proof-manifest SHA-256 mismatch.');
  return validateProofManifest(parseJson(bytes, 'Proof manifest'));
}

export function collectPublishedDescriptors(proof) {
  validateProofManifest(proof);
  const descriptors = [
    proof.fixture.geometryArtifact,
    {
      artifactRole: 'local_network_trace_audit',
      mediaType: 'application/json',
      path: proof.networkAudit.path,
      sha256: proof.networkAudit.sha256,
      byteSize: proof.networkAudit.byteSize,
    },
  ];
  for (const style of proof.styles) descriptors.push(...Object.values(style.files), ...style.views);
  const paths = new Set();
  for (const descriptor of descriptors) {
    validateDescriptor(descriptor, `Published artifact ${descriptor.path || '(missing path)'}`, descriptor.mediaType);
    invariant(!paths.has(descriptor.path), `Published artifact path is duplicated: ${descriptor.path}`);
    paths.add(descriptor.path);
  }
  invariant(descriptors.length === 44, 'The publication does not contain the exact 44 manifest-bound evidence artifacts.');
  return descriptors;
}

export async function verifyDescriptorBytes(descriptor, value) {
  validateDescriptor(descriptor, `Artifact ${descriptor?.path || '(missing path)'}`, descriptor?.mediaType || null);
  const bytes = asBytes(value);
  invariant(bytes.byteLength === descriptor.byteSize, `Byte-size mismatch: ${descriptor.path}`);
  invariant(await sha256Hex(bytes) === descriptor.sha256, `SHA-256 mismatch: ${descriptor.path}`);
  if (descriptor.mediaType === 'image/png') validatePngBytes(bytes, descriptor.path);
  if (descriptor.mediaType === 'model/gltf-binary') validateGlbBytes(bytes, descriptor.path);
  if (descriptor.mediaType === 'application/json') parseJson(bytes, descriptor.path);
  return bytes;
}

export function validatePngBytes(value, label = 'PNG artifact') {
  const bytes = asBytes(value);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  invariant(bytes.byteLength >= 33 && signature.every((byte, index) => bytes[index] === byte), `${label} is not a PNG file.`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  invariant(view.getUint32(8, false) === 13 && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR', `${label} has no valid PNG header.`);
  invariant(view.getUint32(16, false) === 1024 && view.getUint32(20, false) === 640, `${label} does not have the pinned 1024×640 dimensions.`);
  return true;
}

export function validateGlbBytes(value, label = 'GLB artifact') {
  const bytes = asBytes(value);
  invariant(bytes.byteLength >= 20, `${label} is too short to be a GLB file.`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  invariant(view.getUint32(0, true) === 0x46546c67, `${label} has an invalid GLB magic value.`);
  invariant(view.getUint32(4, true) === 2, `${label} is not GLB version 2.`);
  invariant(view.getUint32(8, true) === bytes.byteLength, `${label} GLB header length differs from the file length.`);
  let offset = 12;
  let json = null;
  while (offset < bytes.byteLength) {
    invariant(offset + 8 <= bytes.byteLength, `${label} has a truncated GLB chunk header.`);
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    invariant(offset + chunkLength <= bytes.byteLength, `${label} has a truncated GLB chunk.`);
    if (chunkType === 0x4e4f534a) {
      invariant(json === null, `${label} contains multiple GLB JSON chunks.`);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(offset, offset + chunkLength)).replace(/[\u0000\u0020]+$/g, '');
      json = JSON.parse(text);
    }
    offset += chunkLength;
  }
  invariant(offset === bytes.byteLength && json?.asset?.version === '2.0', `${label} has no valid glTF 2.0 JSON chunk.`);
  invariant((json.buffers || []).every((buffer) => buffer.uri === undefined), `${label} references an external GLB buffer.`);
  invariant((json.images || []).every((image) => image.uri === undefined), `${label} references an external GLB image.`);
  return json;
}

// Geometry and design-reference extras are semantic content hashes. Exact-file
// hashes remain separately pinned by each proof-manifest file descriptor.
export function validateGlbBindings(glb, style, proof, sceneManifest) {
  const sceneIndex = Number.isSafeInteger(glb?.scene) ? glb.scene : 0;
  const extras = glb?.scenes?.[sceneIndex]?.extras;
  invariant(extras && typeof extras === 'object' && !Array.isArray(extras), `${style.label} GLB has no scene binding ledger.`);
  invariant(extras.spatialforge_project_id === sceneManifest?.projectId, `${style.label} GLB project binding differs from its scene manifest.`);
  invariant(extras.spatialforge_geometry_revision === sceneManifest?.geometryRevision, `${style.label} GLB geometry revision differs from its scene manifest.`);
  invariant(extras.spatialforge_geometry_sha256 === proof.fixture.geometrySha256 && extras.spatialforge_geometry_sha256 === sceneManifest?.geometrySha256, `${style.label} GLB semantic geometry binding differs from the reviewed fixture.`);
  invariant(extras.spatialforge_style === style.styleKey && extras.spatialforge_style === sceneManifest?.style, `${style.label} GLB style binding differs from the proof.`);
  invariant(extras.spatialforge_design_reference_id === style.referenceId && extras.spatialforge_design_reference_sha256 === style.referenceSha256, `${style.label} GLB semantic design-reference binding differs from the proof.`);
  invariant(extras.spatialforge_layout_id === sceneManifest?.layout?.layoutId && extras.spatialforge_layout_sha256 === style.bindings.layoutSha256 && extras.spatialforge_layout_sha256 === sceneManifest?.layout?.layoutSha256, `${style.label} GLB layout binding differs from the scene manifest.`);
  invariant(extras.spatialforge_asset_library_version === sceneManifest?.layout?.assetLibraryVersion, `${style.label} GLB asset-library binding differs from the scene manifest.`);
  invariant(extras.spatialforge_scene_manifest_sha256 === style.bindings.sceneManifestSha256 && extras.spatialforge_scene_manifest_schema === sceneManifest?.schema, `${style.label} GLB scene-manifest binding differs from the published artifact.`);
  invariant(extras.spatialforge_whole_unit_topology_sha256 === sceneManifest?.wholeUnitTopologySha256, `${style.label} GLB topology binding differs from the scene manifest.`);
  invariant(extras.spatialforge_render_profile === sceneManifest?.renderProfile && extras.spatialforge_render_profile === style.renderer?.profile && extras.spatialforge_render_samples === style.renderer?.samples, `${style.label} GLB render-profile binding differs from the proof.`);
  return glb;
}

export function validateDesignReference(reference, style) {
  invariant(reference?.schema === 'spatialforge-design-reference/1', `${style.label} design-reference schema is unexpected.`);
  invariant(reference?.referenceId === style.referenceId && reference?.referenceSha256 === style.referenceSha256 && reference?.referenceVersion === style.referenceVersion, `${style.label} design-reference identity differs from the proof.`);
  invariant(reference?.styleKey === style.styleKey && reference?.label === style.label, `${style.label} design-reference label differs from the proof.`);
  invariant(reference?.preview === null, `${style.label} design reference contains an external preview.`);
  validateRights(reference.provenance, `${style.label} design-reference provenance`);
  invariant(sameJson(Object.keys(reference.materials || {}).sort(), EXPECTED_MATERIAL_ROLES), `${style.label} design reference has an unexpected material-role set.`);
  const manifestMaterials = new Map(style.materials.map((material) => [material.role, material]));
  for (const role of EXPECTED_MATERIAL_ROLES) {
    const material = reference.materials[role];
    invariant(material?.sourceType === 'procedural' && material?.externalTextureArtifact === null, `${style.label} ${role} is not a self-contained procedural material.`);
    const expected = manifestMaterials.get(role);
    invariant(material.name === expected.name && sameJson(material.baseColorSrgb, expected.baseColorSrgb) && material.patternScaleMm === expected.patternScaleMm && material.reliefMm === expected.reliefMm && material.roughness === expected.roughness, `${style.label} ${role} differs from the proof manifest.`);
  }
  return reference;
}

export function validateSceneManifest(scene, style, proof) {
  invariant(scene?.schema === 'spatialforge-scene-manifest/1', `${style.label} scene-manifest schema is unexpected.`);
  invariant(scene?.geometrySha256 === proof.fixture.geometrySha256 && scene?.geometryRevision === 2, `${style.label} scene geometry differs from the reviewed fixture.`);
  invariant(scene?.geometryConstruction === 'host-segment-subtraction/1', `${style.label} did not construct measured opening voids by host-segment subtraction.`);
  invariant(scene?.style === style.styleKey && scene?.layout?.layoutSha256 === style.bindings.layoutSha256, `${style.label} layout/style binding differs from the proof.`);
  invariant(Array.isArray(scene.walls) && scene.walls.length === 12, `${style.label} scene does not contain twelve reviewed walls.`);
  invariant(Array.isArray(scene.openings) && scene.openings.length === 16, `${style.label} scene does not contain sixteen reviewed openings.`);
  invariant(Array.isArray(scene.rooms) && scene.rooms.length === 9, `${style.label} scene does not contain nine reviewed rooms.`);
  invariant(Array.isArray(scene.placements) && scene.placements.length === 11, `${style.label} scene does not contain eleven measured placements.`);
  invariant(scene.openings.filter((opening) => opening.kind === 'door').length === 9 && scene.openings.filter((opening) => opening.kind === 'window').length === 7, `${style.label} scene opening counts differ from the proof.`);
  const wallIds = new Set(scene.walls.map((wall) => wall.id));
  invariant(scene.openings.every((opening) => wallIds.has(opening.hostWallId) && opening.voidConstruction === 'host-segment-subtraction/1'), `${style.label} has an opening without a reviewed host-wall void.`);
  invariant(scene?.wholeUnitTopology?.readyForWholeUnit3d === true, `${style.label} whole-unit topology is not ready.`);
  invariant(Array.isArray(scene?.wholeUnitTopology?.issues) && scene.wholeUnitTopology.issues.length === 0, `${style.label} whole-unit topology has unresolved issues.`);
  invariant(Array.isArray(scene?.wholeUnitTopology?.unreachableRoomIds) && scene.wholeUnitTopology.unreachableRoomIds.length === 0, `${style.label} whole-unit topology has unreachable rooms.`);
  invariant(scene?.wholeUnitTopology?.openingSideBindings?.every((binding) => binding.bindingStatus === 'resolved'), `${style.label} has unresolved opening-side bindings.`);
  validateCoverage(scene.referenceViewCoverage, `${style.label} scene manifest`);
  invariant(Array.isArray(scene.referenceViews) && scene.referenceViews.length === 10, `${style.label} scene manifest has incomplete reference views.`);
  validateDesignReference(scene.designReference, style);
  return scene;
}

export function validateCanonicalGeometry(geometry, proof) {
  invariant(geometry?.schema_version === '1.0' && geometry?.units === 'mm', 'Canonical geometry schema or units are unexpected.');
  invariant(geometry?.revision === 2 && geometry?.topology_mode === 'partitioned_plan', 'Canonical geometry revision or topology mode is unexpected.');
  invariant(geometry?.scale_status === 'customer_confirmed', 'Canonical geometry scale status is unexpected for this reviewed fixture.');
  invariant(Array.isArray(geometry.walls) && geometry.walls.length === proof.fixture.walls, 'Canonical geometry wall count differs from the proof.');
  invariant(Array.isArray(geometry.openings) && geometry.openings.length === proof.fixture.openings, 'Canonical geometry opening count differs from the proof.');
  invariant(Array.isArray(geometry.rooms) && geometry.rooms.length === proof.fixture.rooms, 'Canonical geometry room count differs from the proof.');
  invariant(geometry.openings.filter((opening) => opening.kind === 'door').length === proof.fixture.doors, 'Canonical geometry door count differs from the proof.');
  invariant(geometry.openings.filter((opening) => opening.kind === 'window').length === proof.fixture.windows, 'Canonical geometry window count differs from the proof.');
  const wallIds = new Set(geometry.walls.map((wall) => wall.id));
  invariant(geometry.openings.every((opening) => wallIds.has(opening.wall_id)), 'Canonical geometry has an opening without a host wall.');
  return geometry;
}

export function validateNetworkAudit(audit) {
  invariant(audit?.schema === 'spatialforge-local-network-trace-audit/1', 'Network-audit schema is unexpected.');
  invariant(audit?.passed === true && audit?.internetAddressedCalls === 0 && audit?.inetCallsIncludingLoopbackOrUnspecified === 0, 'Network audit includes addressed calls or did not pass.');
  invariant(Array.isArray(audit?.externalEvents) && audit.externalEvents.length === 0, 'Network audit contains external events.');
  return audit;
}

function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  for (const child of Array.isArray(children) ? children : [children]) if (child) node.append(child);
  return node;
}

function shortHash(value, length = 15) {
  return `${value.slice(0, length)}…${value.slice(-6)}`;
}

function readableBytes(value) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function roomLabel(view) {
  return view.roomId === null ? 'Whole-unit overview' : view.roomName;
}

function proofStat(label, value) {
  return el('div', { className: 'proof-stat' }, [
    el('p', { className: 'micro-label', text: label }),
    el('strong', { text: value }),
  ]);
}

function sectionHeading(index, title, note) {
  return el('div', { className: 'section-heading reveal' }, [
    el('p', { className: 'section-index', text: index }),
    el('h2', { text: title }),
    el('p', { className: 'section-note', text: note }),
  ]);
}

function verifiedUrl(assets, path) {
  const asset = assets.get(path);
  invariant(asset?.url, `Verified browser URL is unavailable for ${path}.`);
  return asset.url;
}

function styleImageCard(style, descriptor, badge, assets) {
  const image = el('img', {
    src: verifiedUrl(assets, descriptor.path),
    alt: `${style.label} — ${badge}`,
    width: '1024',
    height: '640',
    loading: 'eager',
    decoding: 'async',
  });
  const imageLink = el('a', {
    className: 'image-link',
    href: verifiedUrl(assets, descriptor.path),
    target: '_blank',
    rel: 'noopener',
    'aria-label': `Open the verified ${badge} image for ${style.label}`,
  }, [el('div', { className: 'image-frame' }, [image, el('span', { className: 'image-badge', text: badge })])]);
  const badgeNode = imageLink.querySelector('.image-badge');
  const card = el('article', { className: 'style-card reveal' }, [
    el('header', { className: 'style-head' }, [
      el('p', { className: 'style-code', text: style.styleKey.replaceAll('_', ' ') }),
      el('h3', { className: 'style-title', text: style.label }),
      el('span', { className: 'hash', title: style.referenceSha256, text: `reference ${shortHash(style.referenceSha256)}` }),
    ]),
    imageLink,
    el('footer', { className: 'style-foot' }, [
      el('p', { text: `${style.renderer.engine} · ${style.renderer.samples} samples` }),
      el('div', { className: 'file-links' }, [
        el('a', { href: verifiedUrl(assets, style.files.glb.path), text: 'GLB', download: `${style.referenceId}.glb` }),
        el('a', { href: verifiedUrl(assets, style.files.sceneManifest.path), text: 'Scene', target: '_blank', rel: 'noopener' }),
        el('a', { href: verifiedUrl(assets, style.files.designReference.path), text: 'Palette', target: '_blank', rel: 'noopener' }),
      ]),
    ]),
  ]);
  return { card, image, imageLink, badgeNode };
}

function renderMaterialLedger(styles) {
  return el('div', { className: 'material-ledger' }, styles.map((style) => el('section', { className: 'material-column reveal' }, [
    el('h3', { text: style.label }),
    ...style.materials.map((material) => {
      const [red, green, blue] = material.baseColorSrgb;
      return el('div', { className: 'material-row' }, [
        el('span', { className: 'swatch', style: `background: rgb(${red} ${green} ${blue})`, 'aria-label': `${material.name} colour swatch` }),
        el('div', {}, [
          el('p', { className: 'material-name', text: material.name }),
          el('span', { className: 'material-role', text: material.role.replaceAll('_', ' ') }),
        ]),
        el('div', { className: 'material-measure' }, [
          el('div', { text: `${material.patternScaleMm} mm repeat` }),
          el('div', { text: `${material.reliefMm} mm relief` }),
          el('div', { text: `roughness ${material.roughness}` }),
        ]),
      ]);
    }),
  ])));
}

function renderEvidence(styles) {
  return el('ul', { className: 'chain-list' }, styles.map((style) => {
    const rows = [
      ['Reference', style.referenceSha256],
      [`Geometry v${style.bindings.geometryVersion}`, style.bindings.geometrySha256],
      [`Brief v${style.bindings.designBriefVersion}`, style.bindings.designBriefSha256],
      [`Layout v${style.bindings.layoutVersion}`, style.bindings.layoutSha256],
      [`Model v${style.bindings.modelVersion}`, style.bindings.modelSha256],
      [`Render v${style.bindings.renderVersion}`, style.bindings.renderSha256],
      ['Request', style.bindings.renderRequestSha256],
    ];
    return el('li', {}, [
      el('h3', { text: style.label }),
      ...rows.map(([label, value]) => el('div', { className: 'binding-row' }, [
        el('span', { text: label }),
        el('span', { title: value, text: value }),
      ])),
    ]);
  }));
}

function buildGallery(proof, assets, manifestUrl, verifiedByteSize) {
  const shell = el('div', { className: 'shell' });
  shell.append(
    el('header', { className: 'masthead reveal' }, [
      el('div', {}, [
        el('p', { className: 'eyebrow', text: 'Reviewed synthetic fixture · renderer/topology workflow reference' }),
        el('h1', {}, [document.createTextNode('One topology. '), el('em', { text: 'Three material readings.' })]),
        el('p', { className: 'lede', text: 'The same nine-space reviewed synthetic geometry, eleven measured placements and ten camera identities are held constant while only the rights-safe procedural palette changes.' }),
      ]),
      el('aside', { className: 'scope-aside' }, [
        el('div', { className: 'scope-stamp', text: 'Concept reference · not as-built' }),
        el('p', { text: 'This static evidence shows how the renderer consumes one already-reviewed topology. It does not test floor-plan detection, prove HDB likeness, establish site dimensions or enable the public 3D service.' }),
      ]),
    ]),
    el('section', { className: 'scope-grid reveal', 'aria-label': 'Evidence boundary' }, [
      el('article', { className: 'scope-card', 'data-kind': 'proves' }, [
        el('p', { className: 'scope-tag', text: 'What this evidence supports' }),
        el('h2', { text: 'A controlled renderer comparison.' }),
        el('p', { text: 'For this one reviewed synthetic fixture, the exact same hosted wall openings, connected room topology, placements and cameras reach three self-contained Blender scenes and a complete room-view ledger.' }),
      ]),
      el('article', { className: 'scope-card', 'data-kind': 'does-not' }, [
        el('p', { className: 'scope-tag', text: 'What it cannot support' }),
        el('h2', { text: 'No detection or buildability claim.' }),
        el('p', { text: 'These images are not detector accuracy, HDB-likeness, an as-built survey, product selection, construction documentation or proof that an uploaded customer plan will be complete.' }),
      ]),
    ]),
    el('section', { className: 'proof-strip reveal', 'aria-label': 'Reviewed fixture summary' }, [
      proofStat('Reviewed spaces', String(proof.fixture.rooms)),
      proofStat('Reviewed walls', String(proof.fixture.walls)),
      proofStat('Reviewed doors', String(proof.fixture.doors)),
      proofStat('Reviewed windows', String(proof.fixture.windows)),
      proofStat('Measured placements', String(proof.fixture.placements)),
      proofStat('Style references', String(proof.catalog.referenceCount)),
    ]),
    el('section', { className: 'verification-banner reveal', role: 'status' }, [
      el('div', { className: 'verification-copy' }, [
        el('span', { className: 'verification-dot', 'aria-hidden': 'true' }),
        el('div', {}, [
          el('p', { className: 'verification-title', text: 'Pinned proof and every published evidence file verified' }),
          el('p', { className: 'verification-detail', text: `Manifest ${shortHash(PROOF_MANIFEST_SHA256)} · 44 evidence files · ${readableBytes(verifiedByteSize)}` }),
          el('p', { className: 'verification-context', text: 'The source manifest’s local-review-only and not-deployed fields record its generation-time state; this page is a separate static evidence presentation.' }),
        ]),
      ]),
      el('a', { className: 'manifest-link', href: manifestUrl, text: 'Open exact proof manifest', target: '_blank', rel: 'noopener' }),
    ]),
  );

  shell.append(sectionHeading('01', 'Same requested camera', 'Each image is the request-bound camera from the exact approved Blender scene. The images use procedural materials only; no external conditioning or AI post-processing is declared.'));
  const requestedGrid = el('div', { className: 'style-grid' });
  proof.styles.forEach((style) => requestedGrid.append(styleImageCard(style, style.files.requestedRender, 'Approved-scene requested camera', assets).card));
  shell.append(requestedGrid);

  shell.append(sectionHeading('02', 'Same room-camera identities', 'Choose a reviewed room or the whole-unit overview. All three columns switch to the same manifest-bound camera identity; complete camera coverage is not the same as detector completeness.'));
  const roomNav = el('nav', { className: 'room-nav', 'aria-label': 'Reviewed room view selection' });
  const selectedTitle = el('h3', { text: roomLabel(proof.styles[0].views[0]) });
  const selectedMeta = el('p', { text: 'Overview · reviewed synthetic whole-unit fixture' });
  const roomGrid = el('div', { className: 'style-grid' });
  const roomCards = proof.styles.map((style) => {
    const built = styleImageCard(style, style.views[0], roomLabel(style.views[0]), assets);
    roomGrid.append(built.card);
    return built;
  });
  const buttons = proof.styles[0].views.map((view, index) => {
    const button = el('button', {
      className: 'view-button',
      type: 'button',
      text: roomLabel(view),
      'aria-pressed': index === 0 ? 'true' : 'false',
      onclick: () => {
        buttons.forEach((candidate, candidateIndex) => candidate.setAttribute('aria-pressed', candidateIndex === index ? 'true' : 'false'));
        selectedTitle.textContent = roomLabel(view);
        selectedMeta.textContent = view.roomId === null ? 'Overview · reviewed synthetic whole-unit fixture' : `${view.roomId} · ${view.roomFunction.replaceAll('_', ' ')}`;
        proof.styles.forEach((style, styleIndex) => {
          const target = style.views[index];
          const card = roomCards[styleIndex];
          const url = verifiedUrl(assets, target.path);
          card.image.src = url;
          card.image.alt = `${style.label} — ${roomLabel(target)}`;
          card.imageLink.href = url;
          card.badgeNode.textContent = roomLabel(target);
        });
      },
    });
    roomNav.append(button);
    return button;
  });
  shell.append(roomNav, el('div', { className: 'selected-view' }, [selectedTitle, selectedMeta]), roomGrid);

  shell.append(sectionHeading('03', 'Dimensioned procedural palettes', 'Nine material roles per reference. Colour, repeat, relief and roughness are explicit approximations; there are no downloaded textures, manufacturer models or selected product SKUs.'));
  shell.append(renderMaterialLedger(proof.styles));

  const evidenceButton = el('button', { className: 'evidence-toggle', type: 'button', text: 'Open immutable binding ledger', 'aria-expanded': 'false' });
  const evidenceBody = el('div', { className: 'evidence-body', hidden: '' }, [renderEvidence(proof.styles)]);
  evidenceButton.addEventListener('click', () => {
    const expanded = evidenceButton.getAttribute('aria-expanded') === 'true';
    evidenceButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    evidenceBody.hidden = expanded;
  });
  shell.append(el('section', { className: 'evidence-panel reveal' }, [evidenceButton, evidenceBody]));

  shell.append(el('section', { className: 'limits reveal' }, [
    el('div', {}, [
      el('h2', { text: 'Read the limits before judging the images.' }),
      el('p', { className: 'limits-intro', text: 'These limitations are copied from the pinned reviewed proof. They are part of the evidence, not fine print.' }),
    ]),
    el('ol', {}, proof.limitations.map((limit) => el('li', { text: limit }))),
  ]));

  shell.append(el('footer', { className: 'footer' }, [
    el('span', { text: `Geometry ${shortHash(proof.fixture.geometrySha256, 20)} · ${proof.fixture.contract}` }),
    el('span', { text: `${proof.networkAudit.internetAddressedCalls} internet-addressed build calls · public service flags remain off` }),
    el('a', { href: 'ProjectJourney.html', text: 'Project Atelier service status ↗' }),
  ]));
  return shell;
}

async function fetchLocalBytes(url) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
  invariant(response.ok, `Local artifact recovery failed (${response.status}): ${url.pathname}`);
  invariant(new URL(response.url).origin === location.origin, `Local artifact crossed origin: ${url.pathname}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function recoverPublication(update) {
  const root = new URL(PROOF_ROOT, document.baseURI);
  invariant(root.origin === location.origin, 'The proof root is not same-origin.');
  const manifestBytes = await fetchLocalBytes(new URL('proof-manifest.json', root));
  update('Verifying the pinned proof-manifest hash…');
  const proof = await validateManifestBytes(manifestBytes);
  const descriptors = collectPublishedDescriptors(proof);
  const assets = new Map();
  let cursor = 0;
  let completed = 0;
  let verifiedByteSize = manifestBytes.byteLength;

  const workers = Array.from({ length: 4 }, async () => {
    while (cursor < descriptors.length) {
      const descriptor = descriptors[cursor];
      cursor += 1;
      update(`SHA-256 ${completed}/${descriptors.length} · ${descriptor.path}`);
      const url = new URL(descriptor.path, root);
      invariant(url.origin === location.origin && url.href.startsWith(root.href), `Artifact path escaped the proof root: ${descriptor.path}`);
      const bytes = await fetchLocalBytes(url);
      await verifyDescriptorBytes(descriptor, bytes);
      const glb = descriptor.mediaType === 'model/gltf-binary' ? validateGlbBytes(bytes, descriptor.path) : null;
      const blob = new Blob([bytes], { type: descriptor.mediaType });
      const retainedBytes = descriptor.mediaType === 'application/json' ? bytes : null;
      assets.set(descriptor.path, { bytes: retainedBytes, glb, url: URL.createObjectURL(blob) });
      verifiedByteSize += bytes.byteLength;
      completed += 1;
    }
  });
  await Promise.all(workers);
  invariant(completed === descriptors.length, 'Not every manifest-bound evidence file was verified.');

  const geometry = parseJson(assets.get(proof.fixture.geometryArtifact.path).bytes, 'Canonical geometry');
  validateCanonicalGeometry(geometry, proof);
  const network = parseJson(assets.get(proof.networkAudit.path).bytes, 'Network audit');
  validateNetworkAudit(network);
  for (const style of proof.styles) {
    const reference = parseJson(assets.get(style.files.designReference.path).bytes, `${style.label} design reference`);
    const scene = parseJson(assets.get(style.files.sceneManifest.path).bytes, `${style.label} scene manifest`);
    validateDesignReference(reference, style);
    validateSceneManifest(scene, style, proof);
    validateGlbBindings(assets.get(style.files.glb.path).glb, style, proof, scene);
  }

  const manifestUrl = URL.createObjectURL(new Blob([manifestBytes], { type: 'application/json' }));
  return { proof, assets, manifestUrl, verifiedByteSize };
}

async function start() {
  const boot = document.querySelector('#boot');
  const detail = document.querySelector('#bootDetail');
  const gallery = document.querySelector('#gallery');
  try {
    const publication = await recoverPublication((message) => { detail.textContent = message; });
    gallery.append(buildGallery(publication.proof, publication.assets, publication.manifestUrl, publication.verifiedByteSize));
    gallery.hidden = false;
    boot.remove();
  } catch (error) {
    boot.className = 'fatal';
    boot.setAttribute('role', 'alert');
    boot.replaceChildren(document.createTextNode(`Review stopped: ${error.message} There is no static, stale-image or demo fallback.`));
    console.error(error);
  }
}

if (typeof document !== 'undefined') start();
