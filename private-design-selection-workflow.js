import {
  canonicalShellJson,
  sha256Hex,
} from './journey-shell-review.js';
import {
  PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA,
  PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
  validateApprovedFunctionalLayoutRecovery,
  validateFunctionalLayoutOptionSet,
} from './private-functional-layout-workflow.js';

/**
 * Private, metadata-only continuation from one approved functional layout to one
 * rights-cleared procedural design reference. It is intentionally absent from the
 * public page and deployment allowlist and cannot invoke model, render or commerce APIs.
 */
export const PRIVATE_DESIGN_SELECTION_WORKFLOW_ENABLED = false;
export const PRIVATE_DESIGN_SELECTION_WORKFLOW_SCHEMA =
  'homeandme-private-design-selection-workflow/1';
export const PRIVATE_DESIGN_SELECTION_RELEASE_SCHEMA =
  'homeandme-private-design-selection-capabilities/1';
export const PRIVATE_DESIGN_SELECTION_RECEIPT_SCHEMA =
  'homeandme-private-design-selection-receipt/1';

const HASH = /^[a-f0-9]{64}$/;
const RELEASE_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const CONTROL = /[\u0000-\u001f\u007f]/u;
const PRIVATE_MEDIA_KEY = /^(?:url|uri|path|filePath|filename|mediaUrl|imageUrl|blobUrl|base64|bytes|sourceImageUrl|signedUrl|artifactUrl)$/iu;
const PRIVATE_MEDIA_VALUE = /(?:https?:\/\/|blob:|data:|file:|\/home\/|[A-Za-z]:\\Users\\)/iu;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

const CAPABILITY_ORDER = Object.freeze([
  'APPROVED_FUNCTIONAL_LAYOUT_RECOVERY',
  'DESIGN_SELECTION',
  'FURNISHED_MODEL',
  'AI_RENDERING',
  'QUOTATION',
  'PAYMENTS',
]);
const REQUIRED_CAPABILITIES = new Set(CAPABILITY_ORDER.slice(0, 2));
const CONTRACTS = Object.freeze({
  projectApi: 'homeandme-project-api/2',
  workflow: 'bare_shell_first/1',
  approvedLayoutRecovery: 'spatialforge-current-approved-functional-layout/1',
  functionalLayoutEvidence: 'functional-layout-source-evidence/1',
  designReferenceCatalog: 'spatialforge-design-reference-catalog/1',
  designReference: 'spatialforge-design-reference/1',
  designSelection: 'spatialforge-design-selection/1',
  designSelectionSources: 'bare-shell-design-selection-sources/1',
  privacy: 'same-origin-private-no-store/1',
});
const HANDOFF_KEYS = Object.freeze([
  'schema', 'projectId', 'releaseId', 'sourceReferences', 'roomIds', 'roomNames',
  'optionSetVersion', 'optionSetSha256', 'assetLibraryVersion', 'assetLibrarySha256',
  'layoutId', 'selectedLayoutSha256', 'selectedOptionSha256', 'layoutVersion',
  'layoutSha256', 'layoutApprovalActor', 'layoutApprovalActorSha256',
  'recoveryReceiptSha256', 'customerReleaseEligible',
]);
const LAYOUT_SOURCE_KEYS = Object.freeze([
  'workflowContract', 'sourceArtifactSha256', 'sourceRegistrationSha256',
  'geometryVersion', 'geometrySha256', 'wholeUnitTopologySha256',
  'shellModelVersion', 'shellModelSha256', 'shellModelApprovalVersion',
  'shellModelApprovalSha256', 'furnitureBriefVersion', 'furnitureBriefSha256',
]);
const DESIGN_SELECTION_SOURCE_KEYS = Object.freeze([
  'contract', ...LAYOUT_SOURCE_KEYS, 'shellArtifactManifestSha256',
  'layoutOptionSetVersion', 'layoutOptionSetSha256', 'assetLibraryVersion',
  'assetLibrarySha256', 'selectedOptionSha256', 'layoutVersion', 'layoutSha256',
  'layoutApprovalActor', 'designReferenceId', 'designReferenceSha256', 'actor',
]);
const ACTOR_KEYS = Object.freeze([
  'schemaVersion', 'actorId', 'provider', 'subjectSha256', 'roles',
  'credentialTransport', 'identityVerified', 'professionalIdentityVerified',
  'claimedActorId', 'claimAcceptedAsProfessionalIdentity',
]);
const DASHBOARD_KEYS = Object.freeze([
  'projectId', 'propertyType', 'postalCode', 'levels', 'state', 'proposalVersion',
  'calibrationVersion', 'measuredProposalVersion', 'geometryVersion',
  'approvedGeometryVersion', 'workflowContract', 'shellModelVersion',
  'approvedShellModelVersion', 'furnitureBriefVersion', 'designSelectionVersion',
  'designBriefVersion', 'layoutVersion', 'approvedLayoutVersion', 'modelVersion',
  'approvedModelVersion', 'renderVersion', 'approvedDesignVersion', 'paymentStatus',
  'createdAt', 'updatedAt', 'quote', 'receipt',
]);
const POST_SELECTION_KEYS = Object.freeze([
  ...DASHBOARD_KEYS,
  'designSelectionSha256', 'sourceReferences', 'designSelection', 'designReference',
]);
const GET_SELECTION_KEYS = Object.freeze([
  'projectId', 'state', 'designSelectionVersion', 'designSelectionSha256',
  'sourceReferences', 'designSelection', 'designReference',
]);
const SELECTION_PAYLOAD_KEYS = Object.freeze([
  'schema', 'workflowContract', 'layoutVersion', 'layoutSha256',
  'designReferenceId', 'designReferenceSha256', 'designReference',
  'confirmDesignReferenceRights', 'externalReferenceImagesConsumed', 'actor',
]);
const CATALOG_KEYS = Object.freeze([
  'schema', 'catalogVersion', 'references', 'catalogSha256',
]);
const REFERENCE_KEYS = Object.freeze([
  'schema', 'referenceId', 'referenceVersion', 'label', 'styleKey', 'styleAliases',
  'preview', 'provenance', 'dimensions', 'materials', 'referenceSha256',
]);
const PROVENANCE_KEYS = Object.freeze([
  'origin', 'thirdPartyMediaConsumed', 'externalSourceUris', 'rightsBasis',
  'commercialUseAllowed', 'derivativeUseAllowed', 'renderPublicationAllowed',
  'rawAssetRedistributionRequired', 'evidenceContract',
]);
const MATERIAL_ROLES = Object.freeze([
  'wall', 'floor', 'wood', 'stone', 'fabric', 'linen', 'rug', 'ceramic',
  'opening_frame',
]);
const MATERIAL_KEYS = Object.freeze([
  'name', 'sourceType', 'baseColorSrgb', 'roughness', 'patternScaleMm',
  'reliefMm', 'externalTextureArtifact',
]);

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function fail(message) {
  throw new TypeError(`Private design selection unavailable: ${message}`);
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

function version(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} is not a positive version.`);
  return value;
}

function safeId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${label} is invalid.`);
  return value;
}

function safeText(value, label, maximum = 600) {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum
    || CONTROL.test(value) || PRIVATE_MEDIA_VALUE.test(value)) {
    fail(`${label} is unsafe text.`);
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

function metadataOnly(value, label = 'private design metadata') {
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

function privateServiceOrigin(baseUrl) {
  let origin;
  try { origin = new URL(baseUrl); } catch (_) { fail('project service URL is invalid.'); }
  const loopback = ['127.0.0.1', 'localhost'].includes(origin.hostname);
  if ((!loopback && origin.protocol !== 'https:')
    || (loopback && !['http:', 'https:'].includes(origin.protocol))
    || origin.pathname !== '/' || origin.search || origin.hash
    || origin.username || origin.password) {
    fail('private service must use HTTPS or an exact loopback origin root.');
  }
  return origin;
}

async function canonicalDigest(value) {
  return sha256Hex(new TextEncoder().encode(canonicalShellJson(value)));
}

function pythonJsonString(value) {
  return JSON.stringify(value).replace(/[\u0080-\uffff]/g, (character) => (
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  ));
}

function pythonCanonicalDesignJson(value, parentKey = '') {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'string') return pythonJsonString(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical design metadata contains a non-finite number.');
    if (parentKey === 'roughness' || parentKey === 'reliefMm') {
      const rendered = String(value);
      if (/e/i.test(rendered)) fail('canonical design material precision is unsupported.');
      return Number.isInteger(value) ? `${rendered}.0` : rendered;
    }
    if (!Number.isSafeInteger(value)) {
      fail('canonical design metadata contains a non-integer outside a material field.');
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => pythonCanonicalDesignJson(item)).join(',')}]`;
  }
  if (record(value)) {
    return `{${Object.keys(value).sort().map((key) => (
      `${pythonJsonString(key)}:${pythonCanonicalDesignJson(value[key], key)}`
    )).join(',')}}`;
  }
  fail('canonical design metadata contains an unsupported value.');
}

/** Match the backend's sorted Python JSON, including schema-declared material floats. */
export async function canonicalPrivateDesignSha256(value) {
  return sha256Hex(new TextEncoder().encode(pythonCanonicalDesignJson(value)));
}

function canonicalEqual(left, right) {
  return canonicalShellJson(left) === canonicalShellJson(right);
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

async function validateActor(actor, projectId, {
  expectedHash = null,
  claimedActor = 'string',
  label = 'approval actor',
} = {}) {
  exactKeys(actor, ACTOR_KEYS, label);
  safeId(actor.actorId, label);
  digest(actor.subjectSha256, `${label} subject`);
  if (actor.schemaVersion !== '1.0' || actor.provider !== 'project_guest_token'
    || actor.actorId !== `project_guest:${projectId}:${actor.subjectSha256.slice(0, 24)}`
    || !Array.isArray(actor.roles) || actor.roles.length !== 1
    || actor.roles[0] !== 'project_guest'
    || !['authorization_bearer', 'http_only_cookie'].includes(actor.credentialTransport)
    || actor.identityVerified !== true || actor.professionalIdentityVerified !== false
    || actor.claimAcceptedAsProfessionalIdentity !== false
    || (claimedActor === 'string' && (typeof actor.claimedActorId !== 'string'
      || !SAFE_ID.test(actor.claimedActorId)))
    || (claimedActor === 'null' && actor.claimedActorId !== null)) {
    fail(`${label} is not the authenticated project customer.`);
  }
  const actorSha256 = await canonicalDigest(actor);
  if (expectedHash !== null) same(actorSha256, expectedHash, `${label} hash`);
  return Object.freeze({ actor: cloneFrozen(actor), actorSha256 });
}

function validateStablePrincipal(actor, layoutActor) {
  for (const field of [
    'schemaVersion', 'actorId', 'provider', 'subjectSha256', 'roles',
    'identityVerified', 'professionalIdentityVerified',
  ]) {
    if (!canonicalEqual(actor[field], layoutActor[field])) {
      fail(`design selection actor ${field} differs from the approved-layout customer.`);
    }
  }
}

/** Validate the separate release pin without accepting the shell release as authority. */
export function validatePrivateDesignSelectionRelease(manifest, {
  expectedReleaseId,
  baseUrl,
} = {}) {
  metadataOnly(manifest, 'private design-selection release');
  exactKeys(manifest, [
    'schema', 'releaseId', 'runtimeEnvironment', 'serviceReady', 'scope',
    'contracts', 'capabilities', 'dependencyOrder', 'safeguards',
  ], 'private design-selection release');
  if (manifest.schema !== PRIVATE_DESIGN_SELECTION_RELEASE_SCHEMA
    || !RELEASE_ID.test(expectedReleaseId || '')
    || manifest.releaseId !== expectedReleaseId
    || !['development', 'test', 'staging'].includes(manifest.runtimeEnvironment)
    || manifest.serviceReady !== true
    || manifest.scope !== 'private-service-only') {
    fail('private design-selection release identity or scope is incompatible.');
  }
  privateServiceOrigin(baseUrl);
  exactKeys(manifest.contracts, Object.keys(CONTRACTS), 'private design-selection contracts');
  for (const [name, expected] of Object.entries(CONTRACTS)) {
    same(manifest.contracts[name], expected, `private design-selection contract ${name}`);
  }
  exactKeys(manifest.capabilities, CAPABILITY_ORDER, 'private design-selection capabilities');
  if (!Array.isArray(manifest.dependencyOrder)
    || manifest.dependencyOrder.join('\u0000') !== CAPABILITY_ORDER.join('\u0000')) {
    fail('private design-selection capability order is noncanonical.');
  }
  for (const capability of CAPABILITY_ORDER) {
    same(
      manifest.capabilities[capability],
      REQUIRED_CAPABILITIES.has(capability),
      `private capability ${capability}`,
    );
  }
  exactKeys(manifest.safeguards, [
    'demoFallbackEnabled', 'publicJourneyWiringEnabled', 'furnishedModelEnabled',
    'renderingEnabled', 'commerceEnabled',
  ], 'private design-selection safeguards');
  if (Object.values(manifest.safeguards).some((value) => value !== false)) {
    fail('private design-selection safeguards unlocked a downstream or public stage.');
  }
  return cloneFrozen(manifest);
}

/** Validate the metadata-only receipt projected by PrivateFunctionalLayoutWorkflow. */
export async function validatePrivateDesignSelectionHandoff(snapshot, {
  projectId,
  expectedReleaseId,
} = {}) {
  if (!record(snapshot) || snapshot.schema !== PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA
    || snapshot.enabled !== true || snapshot.phase !== 'layout_approved'
    || snapshot.projectId !== projectId || snapshot.releaseId !== expectedReleaseId
    || snapshot.actions?.designSelection !== false
    || snapshot.actions?.furnishedModel !== false
    || snapshot.actions?.deterministicRender !== false
    || snapshot.downstreamLocks?.designSelection !== true
    || snapshot.downstreamLocks?.furnishedModel !== true
    || snapshot.downstreamLocks?.deterministicRender !== true
    || snapshot.downstreamLocks?.quotation !== true
    || snapshot.downstreamLocks?.payment !== true
    || snapshot.truth?.sourcePixelsRendered !== false
    || snapshot.truth?.privateArtifactBytesRendered !== false
    || snapshot.truth?.customerReleaseEligible !== false) {
    fail('functional-layout snapshot is absent, stale, public, or already unlocked.');
  }
  const handoff = snapshot.designSelectionHandoff;
  metadataOnly(handoff, 'approved-layout design-selection handoff');
  exactKeys(handoff, HANDOFF_KEYS, 'approved-layout design-selection handoff');
  if (handoff.schema !== PRIVATE_DESIGN_SELECTION_HANDOFF_SCHEMA
    || handoff.projectId !== projectId || handoff.releaseId !== expectedReleaseId
    || handoff.customerReleaseEligible !== false) {
    fail('approved-layout handoff identity is incompatible.');
  }
  exactKeys(handoff.sourceReferences, LAYOUT_SOURCE_KEYS, 'approved-layout source receipt');
  if (handoff.sourceReferences.workflowContract !== 'bare_shell_first/1') {
    fail('approved-layout handoff uses the wrong workflow contract.');
  }
  for (const key of LAYOUT_SOURCE_KEYS.filter((name) => name.endsWith('Sha256'))) {
    digest(handoff.sourceReferences[key], `approved-layout ${key}`);
  }
  for (const key of LAYOUT_SOURCE_KEYS.filter((name) => name.endsWith('Version'))) {
    version(handoff.sourceReferences[key], `approved-layout ${key}`);
  }
  if (!Array.isArray(handoff.roomIds) || handoff.roomIds.length < 1
    || new Set(handoff.roomIds).size !== handoff.roomIds.length
    || !record(handoff.roomNames)
    || Object.keys(handoff.roomNames).sort().join('\u0000')
      !== [...handoff.roomIds].sort().join('\u0000')) {
    fail('approved-layout canonical-room authority is incomplete.');
  }
  handoff.roomIds.forEach((roomId) => {
    safeId(roomId, 'approved-layout room');
    safeText(handoff.roomNames[roomId], `approved-layout room ${roomId}`, 200);
  });
  version(handoff.optionSetVersion, 'approved-layout option set');
  digest(handoff.optionSetSha256, 'approved-layout option set');
  safeText(handoff.assetLibraryVersion, 'approved-layout asset library', 160);
  digest(handoff.assetLibrarySha256, 'approved-layout asset library');
  safeId(handoff.layoutId, 'approved layout');
  digest(handoff.selectedLayoutSha256, 'approved selected layout');
  digest(handoff.selectedOptionSha256, 'approved selected option');
  version(handoff.layoutVersion, 'approved layout');
  digest(handoff.layoutSha256, 'approved layout');
  digest(handoff.layoutApprovalActorSha256, 'approved-layout actor');
  if (handoff.recoveryReceiptSha256 !== null) {
    digest(handoff.recoveryReceiptSha256, 'approved-layout recovery receipt');
  }
  const actor = await validateActor(handoff.layoutApprovalActor, projectId, {
    expectedHash: handoff.layoutApprovalActorSha256,
    claimedActor: 'string',
    label: 'approved-layout actor',
  });
  const approval = snapshot.approval;
  const review = snapshot.review;
  if (!record(approval) || !record(review)) fail('approved-layout review receipt is missing.');
  for (const [left, right, label] of [
    [handoff.optionSetVersion, review.optionSetVersion, 'handoff option-set version'],
    [handoff.optionSetSha256, review.optionSetSha256, 'handoff option-set hash'],
    [handoff.assetLibraryVersion, review.assetLibraryVersion, 'handoff asset library version'],
    [handoff.assetLibrarySha256, review.assetLibrarySha256, 'handoff asset library hash'],
    [handoff.layoutId, approval.layoutId, 'handoff layout ID'],
    [handoff.selectedLayoutSha256, approval.selectedLayoutSha256, 'handoff selected layout'],
    [handoff.selectedOptionSha256, approval.selectedOptionSha256, 'handoff selected option'],
    [handoff.layoutVersion, approval.layoutVersion, 'handoff layout version'],
    [handoff.layoutSha256, approval.layoutSha256, 'handoff layout hash'],
    [handoff.layoutApprovalActorSha256, approval.approvalActorSha256, 'handoff actor'],
  ]) same(left, right, label);
  if (!canonicalEqual(approval.approvalActor, handoff.layoutApprovalActor)) {
    fail('approved-layout actor differs from the continuation handoff.');
  }
  const { workflowContract: ignored, ...sourceAuthority } = handoff.sourceReferences;
  void ignored;
  return Object.freeze({
    handoff: cloneFrozen(handoff),
    authority: Object.freeze({
      projectId,
      releaseId: expectedReleaseId,
      ...cloneFrozen(sourceAuthority),
      roomIds: cloneFrozen(handoff.roomIds),
      roomNames: cloneFrozen(handoff.roomNames),
    }),
    layoutActor: actor.actor,
  });
}

async function validateDesignReference(reference) {
  metadataOnly(reference, 'design reference');
  exactKeys(reference, REFERENCE_KEYS, 'design reference');
  if (reference.schema !== 'spatialforge-design-reference/1'
    || version(reference.referenceVersion, 'design reference') !== 1
    || reference.preview !== null) {
    fail('design reference schema, version or preview boundary is incompatible.');
  }
  safeId(reference.referenceId, 'design reference');
  safeText(reference.label, 'design reference label', 160);
  safeId(reference.styleKey, 'design reference style');
  if (!Array.isArray(reference.styleAliases) || reference.styleAliases.length < 1
    || reference.styleAliases.some((alias) => typeof alias !== 'string'
      || !SAFE_ID.test(alias)) || new Set(reference.styleAliases).size !== reference.styleAliases.length) {
    fail('design reference aliases are invalid.');
  }
  exactKeys(reference.provenance, PROVENANCE_KEYS, 'design reference provenance');
  const provenance = reference.provenance;
  if (provenance.thirdPartyMediaConsumed !== false
    || provenance.commercialUseAllowed !== true
    || provenance.derivativeUseAllowed !== true
    || provenance.renderPublicationAllowed !== true
    || provenance.rawAssetRedistributionRequired !== false
    || !Array.isArray(provenance.externalSourceUris)
    || provenance.externalSourceUris.length !== 0) {
    fail('design reference rights or external-media evidence is unsafe.');
  }
  safeText(provenance.origin, 'design reference origin', 200);
  safeText(provenance.rightsBasis, 'design reference rights basis', 200);
  safeText(provenance.evidenceContract, 'design reference evidence contract', 200);
  exactKeys(reference.dimensions, ['units', 'meaning'], 'design reference dimensions');
  if (reference.dimensions.units !== 'mm') fail('design reference dimensions are not metric.');
  safeText(reference.dimensions.meaning, 'design reference dimension meaning', 300);
  exactKeys(reference.materials, MATERIAL_ROLES, 'design reference materials');
  for (const role of MATERIAL_ROLES) {
    const material = exactKeys(reference.materials[role], MATERIAL_KEYS, `design material ${role}`);
    safeText(material.name, `design material ${role} name`, 200);
    if (material.sourceType !== 'procedural' || material.externalTextureArtifact !== null
      || !Array.isArray(material.baseColorSrgb) || material.baseColorSrgb.length !== 3
      || material.baseColorSrgb.some((channel) => !Number.isInteger(channel)
        || channel < 0 || channel > 255)
      || typeof material.roughness !== 'number' || !Number.isFinite(material.roughness)
      || material.roughness < 0 || material.roughness > 1
      || !Number.isSafeInteger(material.patternScaleMm) || material.patternScaleMm < 1
      || typeof material.reliefMm !== 'number' || !Number.isFinite(material.reliefMm)
      || material.reliefMm < 0) {
      fail(`design material ${role} is not a bounded procedural definition.`);
    }
  }
  const { referenceSha256, ...body } = reference;
  digest(referenceSha256, 'design reference');
  same(
    await canonicalPrivateDesignSha256(body),
    referenceSha256,
    'design reference content hash',
  );
  return cloneFrozen(reference);
}

/** Validate every catalog byte-derived identity and reject external reference media. */
export async function validatePrivateDesignReferenceCatalog(catalog) {
  metadataOnly(catalog, 'design-reference catalog');
  exactKeys(catalog, CATALOG_KEYS, 'design-reference catalog');
  if (catalog.schema !== 'spatialforge-design-reference-catalog/1') {
    fail('design-reference catalog schema is incompatible.');
  }
  safeText(catalog.catalogVersion, 'design-reference catalog version', 160);
  digest(catalog.catalogSha256, 'design-reference catalog');
  if (!Array.isArray(catalog.references) || catalog.references.length < 1) {
    fail('design-reference catalog contains no selectable reference.');
  }
  const references = await Promise.all(catalog.references.map(validateDesignReference));
  const ids = references.map((reference) => reference.referenceId);
  if (new Set(ids).size !== ids.length) fail('design-reference IDs are duplicated.');
  const { catalogSha256, ...body } = catalog;
  same(
    await canonicalPrivateDesignSha256(body),
    catalogSha256,
    'design-reference catalog content hash',
  );
  return Object.freeze({
    schema: catalog.schema,
    catalogVersion: catalog.catalogVersion,
    catalogSha256,
    references: Object.freeze(references),
  });
}

function validateDashboard(project, handoff, expectedState, expectedSelectionVersion = null, {
  exact = true,
} = {}) {
  metadataOnly(project, 'project dashboard');
  if (exact) exactKeys(project, DASHBOARD_KEYS, 'project dashboard');
  if (!record(project) || project.projectId !== handoff.projectId
    || project.workflowContract !== 'bare_shell_first/1'
    || project.state !== expectedState
    || project.geometryVersion !== handoff.sourceReferences.geometryVersion
    || project.approvedGeometryVersion !== handoff.sourceReferences.geometryVersion
    || project.shellModelVersion !== handoff.sourceReferences.shellModelVersion
    || project.approvedShellModelVersion !== handoff.sourceReferences.shellModelVersion
    || project.furnitureBriefVersion !== handoff.sourceReferences.furnitureBriefVersion
    || project.layoutVersion !== handoff.layoutVersion
    || project.approvedLayoutVersion !== handoff.layoutVersion
    || project.designBriefVersion !== null
    || project.modelVersion !== null || project.approvedModelVersion !== null
    || project.renderVersion !== null || project.approvedDesignVersion !== null
    || project.paymentStatus !== 'none' || project.quote !== null || project.receipt !== null) {
    fail('project dashboard is stale or contains an unreleased downstream pointer.');
  }
  if (expectedState === 'LAYOUT_APPROVED' && project.designSelectionVersion !== null) {
    fail('design selection appeared before the released transition.');
  }
  if (expectedState === 'DESIGN_SELECTION_COMPLETE'
    && project.designSelectionVersion !== expectedSelectionVersion) {
    fail('project dashboard does not point to the exact design selection.');
  }
  return project;
}

function validateLiveOptionBinding(optionPayload, review, handoff) {
  if (review.optionSetVersion !== handoff.optionSetVersion
    || review.optionSetSha256 !== handoff.optionSetSha256
    || review.assetLibraryVersion !== handoff.assetLibraryVersion
    || review.assetLibrarySha256 !== handoff.assetLibrarySha256) {
    fail('live functional option set differs from the approved-layout handoff.');
  }
  const selected = optionPayload.options.find((option) => option.layoutId === handoff.layoutId);
  if (!selected || selected.layoutSha256 !== handoff.selectedLayoutSha256) {
    fail('approved selected option is absent from the current option set.');
  }
  return selected;
}

async function validateLiveLayoutRecovery(payload, optionPayload, review, project, context) {
  const recovered = await validateApprovedFunctionalLayoutRecovery(
    payload,
    context.authority,
    optionPayload,
    review,
    project,
  );
  const handoff = context.handoff;
  for (const [actual, expected, label] of [
    [recovered.optionSetVersion, handoff.optionSetVersion, 'recovered option-set version'],
    [recovered.optionSetSha256, handoff.optionSetSha256, 'recovered option-set hash'],
    [recovered.layoutId, handoff.layoutId, 'recovered layout ID'],
    [recovered.selectedLayoutSha256, handoff.selectedLayoutSha256, 'recovered selected layout'],
    [recovered.selectedOptionSha256, handoff.selectedOptionSha256, 'recovered selected option'],
    [recovered.layoutVersion, handoff.layoutVersion, 'recovered layout version'],
    [recovered.layoutSha256, handoff.layoutSha256, 'recovered layout hash'],
    [recovered.approvalActorSha256, handoff.layoutApprovalActorSha256, 'recovered layout actor'],
  ]) same(actual, expected, label);
  if (!canonicalEqual(recovered.approvalActor, handoff.layoutApprovalActor)) {
    fail('recovered layout actor differs from the reviewed handoff.');
  }
  if (handoff.recoveryReceiptSha256 !== null) {
    same(
      recovered.recoveryReceiptSha256,
      handoff.recoveryReceiptSha256,
      'approved-layout recovery receipt',
    );
  }
  return recovered;
}

async function validateSelectionResponse(payload, {
  responseKind,
  handoff,
  catalog,
  expectedReference = null,
  recoveredAfterReload,
}) {
  metadataOnly(payload, 'design-selection response');
  exactKeys(
    payload,
    responseKind === 'post' ? POST_SELECTION_KEYS : GET_SELECTION_KEYS,
    'design-selection response',
  );
  if (payload.projectId !== handoff.projectId || payload.state !== 'DESIGN_SELECTION_COMPLETE') {
    fail('design-selection response belongs to another project or state.');
  }
  const selectionVersion = version(payload.designSelectionVersion, 'design selection');
  const selectionSha256 = digest(payload.designSelectionSha256, 'design selection');
  if (responseKind === 'post') {
    validateDashboard(payload, handoff, 'DESIGN_SELECTION_COMPLETE', selectionVersion, {
      exact: false,
    });
  }
  exactKeys(payload.sourceReferences, DESIGN_SELECTION_SOURCE_KEYS, 'design-selection sources');
  const sources = payload.sourceReferences;
  if (sources.contract !== 'bare-shell-design-selection-sources/1') {
    fail('design-selection source contract is incompatible.');
  }
  for (const [name, expected] of Object.entries(handoff.sourceReferences)) {
    same(sources[name], expected, `design-selection source ${name}`);
  }
  for (const [actual, expected, label] of [
    [sources.layoutOptionSetVersion, handoff.optionSetVersion, 'selection option-set version'],
    [sources.layoutOptionSetSha256, handoff.optionSetSha256, 'selection option-set hash'],
    [sources.assetLibraryVersion, handoff.assetLibraryVersion, 'selection asset-library version'],
    [sources.assetLibrarySha256, handoff.assetLibrarySha256, 'selection asset-library hash'],
    [sources.selectedOptionSha256, handoff.selectedOptionSha256, 'selection selected option'],
    [sources.layoutVersion, handoff.layoutVersion, 'selection layout version'],
    [sources.layoutSha256, handoff.layoutSha256, 'selection layout hash'],
  ]) same(actual, expected, label);
  digest(sources.shellArtifactManifestSha256, 'selection shell artifact manifest');
  if (!canonicalEqual(sources.layoutApprovalActor, handoff.layoutApprovalActor)) {
    fail('design selection changed the approved-layout actor receipt.');
  }
  const referenceMatches = catalog.references.filter(
    (reference) => reference.referenceId === sources.designReferenceId,
  );
  if (referenceMatches.length !== 1
    || referenceMatches[0].referenceSha256 !== sources.designReferenceSha256) {
    fail('design selection does not use one current catalog reference.');
  }
  const reference = referenceMatches[0];
  if (expectedReference !== null && !canonicalEqual(reference, expectedReference)) {
    fail('design-selection response differs from the customer reference choice.');
  }
  exactKeys(payload.designSelection, SELECTION_PAYLOAD_KEYS, 'design-selection payload');
  const selection = payload.designSelection;
  const actorResult = await validateActor(selection.actor, handoff.projectId, {
    claimedActor: 'null',
    label: 'design-selection actor',
  });
  validateStablePrincipal(actorResult.actor, handoff.layoutApprovalActor);
  if (!canonicalEqual(sources.actor, actorResult.actor)) {
    fail('design-selection source and payload actors differ.');
  }
  if (selection.schema !== 'spatialforge-design-selection/1'
    || selection.workflowContract !== 'bare_shell_first/1'
    || selection.layoutVersion !== handoff.layoutVersion
    || selection.layoutSha256 !== handoff.layoutSha256
    || selection.designReferenceId !== reference.referenceId
    || selection.designReferenceSha256 !== reference.referenceSha256
    || selection.confirmDesignReferenceRights !== true
    || !Array.isArray(selection.externalReferenceImagesConsumed)
    || selection.externalReferenceImagesConsumed.length !== 0
    || !canonicalEqual(selection.designReference, reference)
    || !canonicalEqual(payload.designReference, reference)) {
    fail('design-selection payload is stale, rights-unsafe or contains external media.');
  }
  same(
    await canonicalPrivateDesignSha256(selection),
    selectionSha256,
    'design-selection content hash',
  );
  return Object.freeze({
    schema: PRIVATE_DESIGN_SELECTION_RECEIPT_SCHEMA,
    projectId: handoff.projectId,
    designSelectionVersion: selectionVersion,
    designSelectionSha256: selectionSha256,
    designSelectionSourceRefsSha256: await canonicalDigest(sources),
    sourceReferences: cloneFrozen(sources),
    layoutVersion: handoff.layoutVersion,
    layoutSha256: handoff.layoutSha256,
    designReferenceId: reference.referenceId,
    designReferenceSha256: reference.referenceSha256,
    designReferenceLabel: reference.label,
    styleKey: reference.styleKey,
    selectionActor: actorResult.actor,
    selectionActorSha256: actorResult.actorSha256,
    externalReferenceImagesConsumed: 0,
    recoveredAfterReload,
    customerReleaseEligible: false,
  });
}

export class PrivateDesignSelectionWorkflow {
  #release = null;

  #layout = null;

  #catalog = null;

  #selection = null;

  #phase = 'disconnected';

  #blockers = [];

  constructor({
    baseUrl,
    projectId,
    expectedReleaseId,
    layoutSnapshot,
    fetchImpl = globalThis.fetch,
    enabled = PRIVATE_DESIGN_SELECTION_WORKFLOW_ENABLED,
  } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.projectId = safeId(projectId, 'project');
    this.expectedReleaseId = expectedReleaseId;
    this.layoutSnapshot = layoutSnapshot;
    this.fetch = fetchImpl;
    this.enabled = enabled === true;
    if (typeof this.fetch !== 'function') fail('fetch implementation is unavailable.');
  }

  #requireEnabled() {
    if (!this.enabled) throw new Error('Private design-selection workflow is disabled.');
  }

  async #json(path, { method = 'GET', body, expectedStatus = 200 } = {}) {
    const base = privateServiceOrigin(`${this.baseUrl}/`);
    const url = new URL(path, base);
    if (url.origin !== base.origin || url.username || url.password) {
      fail('private request escaped the pinned service origin.');
    }
    const headers = Object.create(null);
    let encodedBody;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      encodedBody = canonicalShellJson(body);
    }
    const response = await this.fetch(url.href, {
      method,
      headers,
      body: encodedBody,
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response || typeof response.text !== 'function') {
      fail('private service returned no HTTP response.');
    }
    if (response.redirected) fail('private service redirected an authenticated request.');
    if (response.url) {
      const finalUrl = new URL(response.url);
      if (finalUrl.origin !== base.origin || finalUrl.pathname !== url.pathname
        || finalUrl.username || finalUrl.password) {
        fail('private response crossed the pinned service boundary.');
      }
    }
    const contentType = (response.headers?.get?.('content-type') || '').split(';')[0];
    if (contentType !== 'application/json') fail('private service response is not JSON.');
    const declared = Number(response.headers?.get?.('content-length') || 0);
    if (declared > MAX_JSON_BYTES) fail('private service response exceeds the metadata limit.');
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
      fail('private service response exceeds the metadata limit.');
    }
    let payload;
    try { payload = JSON.parse(text); } catch (_) { fail('private service returned invalid JSON.'); }
    if (!response.ok || response.status !== expectedStatus) {
      throw privateResponseError(payload, response.status);
    }
    if (url.pathname.includes('/projects/')
      || url.pathname === '/api/v1/private-design-selection-capabilities') {
      const cacheControl = response.headers?.get?.('cache-control') || '';
      if (!/\bno-store\b/i.test(cacheControl)) {
        fail('private authenticated response is cacheable.');
      }
    }
    return payload;
  }

  async #layoutPreflight(project = null) {
    const root = `/api/v1/projects/${encodeURIComponent(this.projectId)}`;
    const [dashboard, optionPayload, recoveryPayload, catalogPayload] = await Promise.all([
      project || this.#json(root),
      this.#json(`${root}/layouts/options`),
      this.#json(`${root}/layouts/approved`),
      this.#json('/api/v1/design-references'),
    ]);
    validateDashboard(dashboard, this.#layout.handoff, 'LAYOUT_APPROVED');
    const review = await validateFunctionalLayoutOptionSet(
      optionPayload,
      this.#layout.authority,
    );
    validateLiveOptionBinding(optionPayload, review, this.#layout.handoff);
    const recovery = await validateLiveLayoutRecovery(
      recoveryPayload,
      optionPayload,
      review,
      dashboard,
      this.#layout,
    );
    const catalog = await validatePrivateDesignReferenceCatalog(catalogPayload);
    return Object.freeze({ dashboard, optionPayload, review, recovery, catalog });
  }

  async connect() {
    this.#requireEnabled();
    this.#blockers = [];
    this.#layout = await validatePrivateDesignSelectionHandoff(this.layoutSnapshot, {
      projectId: this.projectId,
      expectedReleaseId: this.expectedReleaseId,
    });
    try {
      const manifest = await this.#json('/api/v1/private-design-selection-capabilities');
      this.#release = validatePrivateDesignSelectionRelease(manifest, {
        expectedReleaseId: this.expectedReleaseId,
        baseUrl: `${this.baseUrl}/`,
      });
      const root = `/api/v1/projects/${encodeURIComponent(this.projectId)}`;
      const project = await this.#json(root);
      if (project.state === 'LAYOUT_APPROVED') {
        const preflight = await this.#layoutPreflight(project);
        this.#catalog = preflight.catalog;
        this.#selection = null;
        this.#phase = 'ready_to_select';
        return this.snapshot();
      }
      if (project.state === 'DESIGN_SELECTION_COMPLETE') {
        const [optionPayload, catalogPayload, selectionPayload] = await Promise.all([
          this.#json(`${root}/layouts/options`),
          this.#json('/api/v1/design-references'),
          this.#json(`${root}/design-selection`),
        ]);
        const catalog = await validatePrivateDesignReferenceCatalog(catalogPayload);
        const review = await validateFunctionalLayoutOptionSet(
          optionPayload,
          this.#layout.authority,
        );
        validateLiveOptionBinding(optionPayload, review, this.#layout.handoff);
        const receipt = await validateSelectionResponse(selectionPayload, {
          responseKind: 'get',
          handoff: this.#layout.handoff,
          catalog,
          recoveredAfterReload: true,
        });
        validateDashboard(
          project,
          this.#layout.handoff,
          'DESIGN_SELECTION_COMPLETE',
          receipt.designSelectionVersion,
        );
        this.#catalog = catalog;
        this.#selection = receipt;
        this.#phase = 'selection_complete';
        return this.snapshot();
      }
      fail('project is not at an approved-layout or recoverable selection state.');
    } catch (error) {
      this.#phase = 'blocked';
      this.#blockers = [Object.freeze({
        code: 'PRIVATE_DESIGN_SELECTION_HANDOFF_INVALID',
        message: String(error?.message || error),
      })];
      throw error;
    }
  }

  async selectReference(input = {}) {
    this.#requireEnabled();
    exactKeys(input, [
      'designReferenceId', 'designReferenceSha256', 'confirmDesignReferenceRights',
    ], 'design-selection command');
    if (!this.#release || !this.#layout || this.#phase !== 'ready_to_select') {
      throw new Error('Private design selection requires an exact connected approved layout.');
    }
    if (input.confirmDesignReferenceRights !== true) {
      fail('design-reference rights must be explicitly confirmed.');
    }
    safeId(input.designReferenceId, 'design reference');
    digest(input.designReferenceSha256, 'design reference');
    const selected = this.#catalog?.references.filter(
      (reference) => reference.referenceId === input.designReferenceId,
    );
    if (selected?.length !== 1
      || selected[0].referenceSha256 !== input.designReferenceSha256) {
      fail('selected design reference is absent or stale.');
    }

    // Re-read every mutable upstream receipt immediately before the write.
    const preflight = await this.#layoutPreflight();
    if (preflight.catalog.catalogSha256 !== this.#catalog.catalogSha256) {
      fail('design-reference catalog changed after customer review.');
    }
    const currentReference = preflight.catalog.references.find(
      (reference) => reference.referenceId === input.designReferenceId,
    );
    if (!currentReference || !canonicalEqual(currentReference, selected[0])) {
      fail('selected design reference changed after customer review.');
    }
    const root = `/api/v1/projects/${encodeURIComponent(this.projectId)}`;
    const request = {
      layoutVersion: this.#layout.handoff.layoutVersion,
      layoutSha256: this.#layout.handoff.layoutSha256,
      designReferenceId: currentReference.referenceId,
      designReferenceSha256: currentReference.referenceSha256,
      confirmDesignReferenceRights: true,
    };
    const posted = await this.#json(`${root}/design-selection`, {
      method: 'POST',
      body: request,
      expectedStatus: 201,
    });
    const postReceipt = await validateSelectionResponse(posted, {
      responseKind: 'post',
      handoff: this.#layout.handoff,
      catalog: preflight.catalog,
      expectedReference: currentReference,
      recoveredAfterReload: false,
    });
    const [recoveredPayload, project] = await Promise.all([
      this.#json(`${root}/design-selection`),
      this.#json(root),
    ]);
    const recovered = await validateSelectionResponse(recoveredPayload, {
      responseKind: 'get',
      handoff: this.#layout.handoff,
      catalog: preflight.catalog,
      expectedReference: currentReference,
      recoveredAfterReload: false,
    });
    for (const field of [
      'designSelectionVersion', 'designSelectionSha256',
      'designSelectionSourceRefsSha256', 'designReferenceId',
      'designReferenceSha256', 'selectionActorSha256',
    ]) same(recovered[field], postReceipt[field], `POST/GET ${field}`);
    if (!canonicalEqual(recovered.sourceReferences, postReceipt.sourceReferences)) {
      fail('POST and authenticated GET returned different selection source receipts.');
    }
    validateDashboard(
      project,
      this.#layout.handoff,
      'DESIGN_SELECTION_COMPLETE',
      recovered.designSelectionVersion,
    );
    this.#catalog = preflight.catalog;
    this.#selection = recovered;
    this.#phase = 'selection_complete';
    return this.snapshot();
  }

  snapshot() {
    const references = this.#catalog?.references.map((reference) => Object.freeze({
      designReferenceId: reference.referenceId,
      designReferenceSha256: reference.referenceSha256,
      label: reference.label,
      styleKey: reference.styleKey,
      previewAvailable: false,
      thirdPartyMediaConsumed: false,
    })) || [];
    return Object.freeze({
      schema: PRIVATE_DESIGN_SELECTION_WORKFLOW_SCHEMA,
      enabled: this.enabled,
      phase: this.#phase,
      projectId: this.projectId,
      releaseId: this.#release?.releaseId || null,
      approvedLayout: this.#layout ? Object.freeze({
        optionSetVersion: this.#layout.handoff.optionSetVersion,
        optionSetSha256: this.#layout.handoff.optionSetSha256,
        layoutId: this.#layout.handoff.layoutId,
        selectedOptionSha256: this.#layout.handoff.selectedOptionSha256,
        layoutVersion: this.#layout.handoff.layoutVersion,
        layoutSha256: this.#layout.handoff.layoutSha256,
        layoutApprovalActorSha256: this.#layout.handoff.layoutApprovalActorSha256,
      }) : null,
      catalog: this.#catalog ? Object.freeze({
        catalogVersion: this.#catalog.catalogVersion,
        catalogSha256: this.#catalog.catalogSha256,
        references: Object.freeze(references),
      }) : null,
      selection: this.#selection,
      blockers: Object.freeze([...this.#blockers]),
      actions: Object.freeze({
        selectDesignReference: this.#phase === 'ready_to_select',
        furnishedModel: false,
        deterministicRender: false,
        quotation: false,
        payment: false,
      }),
      downstreamLocks: Object.freeze({
        furnishedModel: true,
        deterministicRender: true,
        quotation: true,
        payment: true,
      }),
      truth: Object.freeze({
        metadataOnly: true,
        sourcePixelsRendered: false,
        privateArtifactBytesRendered: false,
        externalReferenceMediaConsumed: false,
        furnishedModelGenerated: false,
        deterministicRenderGenerated: false,
        customerReleaseEligible: false,
      }),
    });
  }
}
