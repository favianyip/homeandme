import { DESIGN_REFERENCE_SCHEMA } from './journey-design-references.js';
import { LAYOUT_REVIEW_PREVIEW_SCHEMA } from './journey-layout-review.js';
import {
  DETERMINISTIC_RENDERER,
  RENDER_REQUEST_SCHEMA,
} from './journey-render-contract.js';
import {
  FUNCTIONAL_FURNITURE_BRIEF_SCHEMA,
  PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
} from './journey-shell-customer-workflow.js';
import { PRIVATE_BARE_SHELL_REVIEW_SCHEMA } from './journey-shell-review.js';
import { REGISTRATION_SCHEMA } from './journey-source-registration.js';

/**
 * Metadata-only private integration review.
 *
 * The public journey never imports this module. The surface has no network client and receives
 * no source pixels, signed URLs or artifact bytes. A future authenticated private host must
 * supply a service-validated receipt bundle and opt in explicitly.
 */
export const PRIVATE_COMPLETE_JOURNEY_SURFACE_ENABLED = false;
export const PRIVATE_COMPLETE_JOURNEY_EVIDENCE_SCHEMA =
  'homeandme-private-complete-journey-evidence/1';

export const PRIVATE_COMPLETE_JOURNEY_STAGE_ORDER = Object.freeze([
  'source-registration',
  'corrected-2d',
  'unfurnished-shell',
  'functional-furniture',
  'design-selection',
  'deterministic-render',
]);

const HASH = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const LAYOUT_TYPES = new Set(['practical', 'storage_optimised', 'circulation_reserve']);

const CONTRACTS = Object.freeze({
  workflow: 'bare_shell_first/1',
  sourceRegistration: REGISTRATION_SCHEMA,
  privateShellWorkflow: PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
  shellReview: PRIVATE_BARE_SHELL_REVIEW_SCHEMA,
  furnitureBrief: FUNCTIONAL_FURNITURE_BRIEF_SCHEMA,
  layoutPreview: LAYOUT_REVIEW_PREVIEW_SCHEMA,
  designSelection: 'spatialforge-design-selection/1',
  designReference: DESIGN_REFERENCE_SCHEMA,
  furnishedModel: 'spatialforge-furnished-model/2',
  renderRequest: RENDER_REQUEST_SCHEMA,
  renderer: DETERMINISTIC_RENDERER,
  finalApproval: 'spatialforge-selection-design-approval/1',
});

const TOP_LEVEL_KEYS = Object.freeze([
  'schema', 'workflowContract', 'projectId', 'contracts', 'provenance',
  'source', 'geometry', 'shell', 'functional', 'design', 'render',
]);

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function fail(message) {
  throw new TypeError(`Private complete journey unavailable: ${message}`);
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

function positiveInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    fail(`${label} is outside the supported range.`);
  }
  return value;
}

function nonNegativeInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    fail(`${label} is outside the supported range.`);
  }
  return value;
}

function same(left, right, label) {
  if (left !== right) fail(`${label} lost its immutable lineage.`);
}

function shortHash(value) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function receipt(label, sha256, version = null) {
  return Object.freeze({ label, sha256, version, display: shortHash(sha256) });
}

function validateContracts(value) {
  exactKeys(value, Object.keys(CONTRACTS), 'contract ledger');
  for (const [name, expected] of Object.entries(CONTRACTS)) {
    if (value[name] !== expected) fail(`${name} contract is incompatible.`);
  }
}

function validateProvenance(value) {
  exactKeys(value, [
    'sourceClass', 'detectorOutput', 'realHdbHoldoutPassed',
    'customerVisualAcceptanceRecorded', 'asBuiltEvidence',
    'productionBackendConnected', 'publicServiceReleased', 'percentageAccuracyClaimed',
  ], 'provenance boundary');
  if (value.sourceClass !== 'owned_controlled_integration_fixture'
    || value.detectorOutput !== false
    || value.realHdbHoldoutPassed !== false
    || value.customerVisualAcceptanceRecorded !== false
    || value.asBuiltEvidence !== false
    || value.productionBackendConnected !== false
    || value.publicServiceReleased !== false
    || value.percentageAccuracyClaimed !== false) {
    fail('this evidence version accepts only unreleased controlled-fixture proof without accuracy claims.');
  }
}

function validateSource(value) {
  exactKeys(value, [
    'uploadArtifactRole', 'uploadSha256', 'uploadByteSize', 'imageWidthPx', 'imageHeightPx',
    'registrationSchema', 'registrationSha256', 'registrationGeometrySha256',
  ], 'source receipt');
  if (value.uploadArtifactRole !== 'original_upload'
    || value.registrationSchema !== REGISTRATION_SCHEMA) {
    fail('source registration contract is incompatible.');
  }
  digest(value.uploadSha256, 'source upload');
  digest(value.registrationSha256, 'source registration');
  digest(value.registrationGeometrySha256, 'registered geometry');
  positiveInteger(value.uploadByteSize, 'source byte size', 100_000_000);
  positiveInteger(value.imageWidthPx, 'source image width', 50_000);
  positiveInteger(value.imageHeightPx, 'source image height', 50_000);
}

function validateGeometry(value, source) {
  exactKeys(value, [
    'approvalStatus', 'geometryVersion', 'geometrySha256',
    'geometry2dApprovalVersion', 'geometry2dApprovalSha256',
    'verticalDimensionsApprovalVersion', 'verticalDimensionsApprovalSha256',
    'wholeUnitTopologySha256', 'wallCount', 'doorCount', 'windowCount', 'roomCount',
    'topologyIssueCount',
  ], 'corrected 2D receipt');
  if (value.approvalStatus !== 'approved') fail('corrected 2D geometry is not approved.');
  positiveInteger(value.geometryVersion, 'geometry version');
  positiveInteger(value.geometry2dApprovalVersion, '2D approval version');
  positiveInteger(value.verticalDimensionsApprovalVersion, 'vertical approval version');
  digest(value.geometrySha256, 'geometry');
  digest(value.geometry2dApprovalSha256, '2D approval');
  digest(value.verticalDimensionsApprovalSha256, 'vertical approval');
  digest(value.wholeUnitTopologySha256, 'whole-unit topology');
  positiveInteger(value.wallCount, 'wall count', 10_000);
  positiveInteger(value.doorCount, 'door count', 1_000);
  positiveInteger(value.windowCount, 'window count', 1_000);
  positiveInteger(value.roomCount, 'room count', 1_000);
  nonNegativeInteger(value.topologyIssueCount, 'topology issue count', 10_000);
  if (value.topologyIssueCount !== 0) fail('corrected 2D topology still has blockers.');
  same(source.registrationGeometrySha256, value.geometrySha256, 'source registration');
}

function validateShell(value, geometry) {
  exactKeys(value, [
    'approvalStatus', 'shellModelVersion', 'shellModelSha256', 'artifactManifestSha256',
    'shellApprovalVersion', 'shellApprovalSha256', 'geometrySha256',
    'artifactVerificationComplete', 'roomCoverageComplete', 'reviewViewCount', 'placementCount',
  ], 'unfurnished shell receipt');
  if (value.approvalStatus !== 'approved'
    || value.artifactVerificationComplete !== true
    || value.roomCoverageComplete !== true
    || value.placementCount !== 0) {
    fail('unfurnished shell is not an approved, byte-verified, geometry-only review.');
  }
  positiveInteger(value.shellModelVersion, 'shell version');
  positiveInteger(value.shellApprovalVersion, 'shell approval version');
  positiveInteger(value.reviewViewCount, 'shell review-view count', 10_000);
  digest(value.shellModelSha256, 'shell model');
  digest(value.artifactManifestSha256, 'shell artifact manifest');
  digest(value.shellApprovalSha256, 'shell approval');
  digest(value.geometrySha256, 'shell geometry');
  same(value.geometrySha256, geometry.geometrySha256, 'unfurnished shell geometry');
  if (value.reviewViewCount < geometry.roomCount + 1) {
    fail('unfurnished shell review does not cover the whole unit and every room.');
  }
}

function validateFunctional(value, shell, geometry) {
  exactKeys(value, [
    'briefVersion', 'briefSha256', 'shellModelSha256', 'optionSetSha256',
    'layoutVersion', 'layoutSha256', 'selectedOptionSha256', 'layoutId', 'layoutType',
    'placementCount', 'roomCount', 'roomsCovered', 'hardViolationCount', 'feasible', 'approved',
  ], 'functional furniture receipt');
  positiveInteger(value.briefVersion, 'functional brief version');
  positiveInteger(value.layoutVersion, 'functional layout version');
  digest(value.briefSha256, 'functional brief');
  digest(value.shellModelSha256, 'functional shell');
  digest(value.optionSetSha256, 'functional option set');
  digest(value.layoutSha256, 'functional layout');
  digest(value.selectedOptionSha256, 'selected functional option');
  safeId(value.layoutId, 'functional layout');
  if (!LAYOUT_TYPES.has(value.layoutType)) fail('functional layout type is design-bearing or unsupported.');
  positiveInteger(value.placementCount, 'functional placement count', 10_000);
  positiveInteger(value.roomCount, 'functional room count', 1_000);
  positiveInteger(value.roomsCovered, 'covered room count', 1_000);
  nonNegativeInteger(value.hardViolationCount, 'hard-violation count', 10_000);
  if (value.feasible !== true || value.approved !== true || value.hardViolationCount !== 0) {
    fail('functional furniture example is not feasible and explicitly approved.');
  }
  same(value.shellModelSha256, shell.shellModelSha256, 'functional shell');
  same(value.roomCount, geometry.roomCount, 'functional room ledger');
  same(value.roomsCovered, geometry.roomCount, 'functional room coverage');
}

function validateDesign(value, functional) {
  exactKeys(value, [
    'selectionStatus', 'designSelectionVersion', 'designSelectionSha256', 'layoutSha256',
    'designReferenceId', 'designReferenceSha256', 'rightsReceiptSha256',
    'externalReferenceImageCount',
  ], 'design-selection receipt');
  if (value.selectionStatus !== 'complete' || value.externalReferenceImageCount !== 0) {
    fail('design selection is incomplete or consumed external reference imagery.');
  }
  positiveInteger(value.designSelectionVersion, 'design-selection version');
  digest(value.designSelectionSha256, 'design selection');
  digest(value.layoutSha256, 'selected design layout');
  safeId(value.designReferenceId, 'design reference');
  digest(value.designReferenceSha256, 'design reference');
  digest(value.rightsReceiptSha256, 'design rights receipt');
  same(value.layoutSha256, functional.layoutSha256, 'design-selection layout');
}

function validateRender(value, design) {
  exactKeys(value, [
    'modelVersion', 'modelSha256', 'modelAuthoritySha256', 'modelApprovalVersion',
    'modelApprovalSha256', 'designSelectionSha256', 'renderVersion', 'renderSetSha256',
    'renderRequestSha256', 'renderer', 'requestedOutputSha256', 'finalApprovalVersion',
    'finalApprovalSha256', 'externalConditioningCount', 'deterministic',
  ], 'deterministic-render receipt');
  positiveInteger(value.modelVersion, 'furnished model version');
  positiveInteger(value.modelApprovalVersion, 'furnished model approval version');
  positiveInteger(value.renderVersion, 'render version');
  positiveInteger(value.finalApprovalVersion, 'final approval version');
  for (const [field, label] of [
    ['modelSha256', 'furnished model'],
    ['modelAuthoritySha256', 'furnished model authority'],
    ['modelApprovalSha256', 'furnished model approval'],
    ['designSelectionSha256', 'render design selection'],
    ['renderSetSha256', 'render set'],
    ['renderRequestSha256', 'render request'],
    ['requestedOutputSha256', 'requested render output'],
    ['finalApprovalSha256', 'final design approval'],
  ]) digest(value[field], label);
  if (value.renderer !== DETERMINISTIC_RENDERER
    || value.externalConditioningCount !== 0 || value.deterministic !== true) {
    fail('render is not the deterministic, selection-bound approved-scene output.');
  }
  same(value.designSelectionSha256, design.designSelectionSha256, 'render design selection');
}

function blockers() {
  return Object.freeze([
    Object.freeze({
      code: 'PRODUCTION_BACKEND_NOT_CONNECTED',
      message: 'No production customer API, worker release or authenticated private host is connected to this local surface.',
    }),
    Object.freeze({
      code: 'REAL_HDB_HOLDOUT_NOT_PASSED',
      message: 'The controlled owned fixture is not a rights-cleared, blind, adjudicated real-HDB holdout.',
    }),
    Object.freeze({
      code: 'DETECTOR_NOT_PROVEN',
      message: 'Current raw detection is not 3D-ready. This sequence begins after correction and does not prove wall, door or window detection.',
    }),
    Object.freeze({
      code: 'CUSTOMER_VISUAL_ACCEPTANCE_NOT_RECORDED',
      message: 'Mechanical shell and render receipts do not establish customer visual acceptance or renovation readiness.',
    }),
    Object.freeze({
      code: 'AS_BUILT_EVIDENCE_NOT_AVAILABLE',
      message: 'Corrected geometry and a site survey are required before any as-built claim; neither supplies a real-life percentage here.',
    }),
    Object.freeze({
      code: 'PUBLIC_SERVICE_NOT_RELEASED',
      message: 'This metadata-only proof is private, default-off and excluded from GitHub Pages; every public capability flag remains off.',
    }),
  ]);
}

function stage(id, number, title, state, summary, facts, receipts, boundary) {
  return Object.freeze({
    id, number, title, state, summary,
    facts: Object.freeze(facts),
    receipts: Object.freeze(receipts),
    boundary,
  });
}

/** Validate a closed, metadata-only receipt bundle and derive the presentation model. */
export function privateCompleteJourneyViewModel(evidence) {
  exactKeys(evidence, TOP_LEVEL_KEYS, 'journey evidence');
  if (evidence.schema !== PRIVATE_COMPLETE_JOURNEY_EVIDENCE_SCHEMA
    || evidence.workflowContract !== CONTRACTS.workflow) {
    fail('journey evidence schema or workflow contract is incompatible.');
  }
  safeId(evidence.projectId, 'project');
  validateContracts(evidence.contracts);
  validateProvenance(evidence.provenance);
  validateSource(evidence.source);
  validateGeometry(evidence.geometry, evidence.source);
  validateShell(evidence.shell, evidence.geometry);
  validateFunctional(evidence.functional, evidence.shell, evidence.geometry);
  validateDesign(evidence.design, evidence.functional);
  validateRender(evidence.render, evidence.design);

  const stages = Object.freeze([
    stage(
      'source-registration', '01', 'Register the exact source', 'controlled_pass',
      'The owned upload bytes and pixel-to-millimetre registration bind one source to one geometry revision.',
      [`${evidence.source.imageWidthPx} × ${evidence.source.imageHeightPx} px`, `${evidence.source.uploadByteSize.toLocaleString('en-SG')} bytes`],
      [receipt('source upload', evidence.source.uploadSha256), receipt('pixel / metric registration', evidence.source.registrationSha256)],
      'Upload permission does not grant training, redistribution or publication permission.',
    ),
    stage(
      'corrected-2d', '02', 'Approve corrected 2D', 'controlled_pass',
      'Walls, doors, windows, rooms, metric scale, verticals and portal topology are frozen before any 3D build.',
      [`${evidence.geometry.wallCount} walls`, `${evidence.geometry.doorCount} doors · ${evidence.geometry.windowCount} windows`, `${evidence.geometry.roomCount} rooms · 0 topology issues`],
      [
        receipt('geometry', evidence.geometry.geometrySha256, evidence.geometry.geometryVersion),
        receipt('2D approval', evidence.geometry.geometry2dApprovalSha256, evidence.geometry.geometry2dApprovalVersion),
        receipt('vertical approval', evidence.geometry.verticalDimensionsApprovalSha256, evidence.geometry.verticalDimensionsApprovalVersion),
        receipt('whole-unit topology', evidence.geometry.wholeUnitTopologySha256),
      ],
      'Raw detection is not 3D-ready. Corrected geometry is authoritative here; detector output is neither silently accepted nor scored by this proof.',
    ),
    stage(
      'unfurnished-shell', '03', 'Review the unfurnished shell', 'controlled_pass',
      'A geometry-only shell, semantic manifest and complete room-view ledger are byte-verified before explicit approval.',
      [`${evidence.shell.reviewViewCount} review views`, 'all rooms covered', '0 furniture placements'],
      [
        receipt('shell model', evidence.shell.shellModelSha256, evidence.shell.shellModelVersion),
        receipt('artifact manifest', evidence.shell.artifactManifestSha256),
        receipt('shell approval', evidence.shell.shellApprovalSha256, evidence.shell.shellApprovalVersion),
      ],
      'Mechanical approval is not a photoreal presentation, site measurement or customer visual-acceptance result.',
    ),
    stage(
      'functional-furniture', '04', 'Test a functional furniture example', 'controlled_pass',
      'The functional brief is solved against the approved shell before any material or aesthetic direction is selected.',
      [`${evidence.functional.placementCount} measured placements`, `${evidence.functional.roomsCovered}/${evidence.functional.roomCount} rooms covered`, `${evidence.functional.layoutType.replaceAll('_', ' ')} · 0 hard violations`],
      [
        receipt('functional brief', evidence.functional.briefSha256, evidence.functional.briefVersion),
        receipt('option set', evidence.functional.optionSetSha256),
        receipt('approved layout', evidence.functional.layoutSha256, evidence.functional.layoutVersion),
      ],
      'Measured envelopes are not manufacturer products, procurement specifications or proof that every household brief is feasible.',
    ),
    stage(
      'design-selection', '05', 'Select a rights-cleared direction', 'controlled_pass',
      'One service-owned procedural reference is selected only after the functional layout is approved.',
      [evidence.design.designReferenceId, 'procedural reference', '0 external reference images'],
      [
        receipt('design selection', evidence.design.designSelectionSha256, evidence.design.designSelectionVersion),
        receipt('design reference', evidence.design.designReferenceSha256),
        receipt('rights evidence', evidence.design.rightsReceiptSha256),
      ],
      'This controlled reference is not a product purchase, customer mood board or licence for future third-party assets.',
    ),
    stage(
      'deterministic-render', '06', 'Render the selected scene', 'controlled_pass',
      'The furnished model, requested camera, approved-scene renderer, output bytes and final approval stay bound to the same selection.',
      [`model v${evidence.render.modelVersion}`, `render v${evidence.render.renderVersion}`, '0 external conditioning inputs'],
      [
        receipt('model authority', evidence.render.modelAuthoritySha256),
        receipt('model approval', evidence.render.modelApprovalSha256, evidence.render.modelApprovalVersion),
        receipt('render request', evidence.render.renderRequestSha256),
        receipt('requested output', evidence.render.requestedOutputSha256),
        receipt('final approval', evidence.render.finalApprovalSha256, evidence.render.finalApprovalVersion),
      ],
      'Deterministic output proves reproducibility of this controlled scene, not real-HDB detection or as-built fidelity.',
    ),
  ]);

  if (stages.map((item) => item.id).join('\u0000') !== PRIVATE_COMPLETE_JOURNEY_STAGE_ORDER.join('\u0000')) {
    fail('stage order is noncanonical.');
  }
  return Object.freeze({
    schema: PRIVATE_COMPLETE_JOURNEY_EVIDENCE_SCHEMA,
    projectId: evidence.projectId,
    controlledSequenceComplete: true,
    customerReleaseEligible: false,
    title: 'One source. Six immutable gates.',
    summary: 'A controlled owned fixture has traversed the intended receipt order. The customer service and real-plan acceptance gate remain closed.',
    stages,
    blockers: blockers(),
  });
}

function node(tag, className = '', text = '') {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text) item.textContent = text;
  return item;
}

function renderReceipt(item) {
  const row = node('li', 'pcj-receipt');
  row.append(
    node('span', 'pcj-receipt-label', item.label),
    node('code', 'pcj-receipt-hash', `${item.version ? `v${item.version} · ` : ''}${item.display}`),
  );
  return row;
}

function renderStage(item) {
  const card = node('li', 'pcj-stage');
  card.dataset.stage = item.id;
  card.dataset.status = item.state;
  const index = node('div', 'pcj-stage-index', item.number);
  const body = node('article', 'pcj-stage-body');
  const head = node('header', 'pcj-stage-head');
  const heading = node('div');
  heading.append(node('p', 'pcj-stage-state', 'Controlled receipt chain verified'), node('h2', '', item.title));
  head.append(heading, node('span', 'pcj-stage-mark', 'verified'));
  const facts = node('ul', 'pcj-facts');
  item.facts.forEach((fact) => facts.append(node('li', '', fact)));
  const receipts = node('ul', 'pcj-receipts');
  item.receipts.forEach((entry) => receipts.append(renderReceipt(entry)));
  body.append(
    head,
    node('p', 'pcj-stage-summary', item.summary),
    facts,
    receipts,
    node('p', 'pcj-stage-boundary', item.boundary),
  );
  card.append(index, body);
  return card;
}

/** Render only after an authenticated private host explicitly opts in. */
export function renderPrivateCompleteJourney(root, evidence, {
  enabled = PRIVATE_COMPLETE_JOURNEY_SURFACE_ENABLED,
} = {}) {
  if (enabled !== true) throw new Error('Private complete journey surface is disabled.');
  if (!(root instanceof Element)) throw new TypeError('Private complete journey root must be an Element.');
  const view = privateCompleteJourneyViewModel(evidence);
  const surface = node('section', 'private-complete-journey');
  surface.setAttribute('aria-labelledby', 'privateCompleteJourneyTitle');
  surface.dataset.customerReleaseEligible = String(view.customerReleaseEligible);

  const hero = node('header', 'pcj-hero');
  const introduction = node('div');
  introduction.append(
    node('p', 'pcj-kicker', 'Private integration proof · default off'),
    node('h1', '', view.title),
    node('p', 'pcj-lede', view.summary),
  );
  introduction.querySelector('h1').id = 'privateCompleteJourneyTitle';
  const passport = node('aside', 'pcj-passport');
  passport.append(
    node('span', 'pcj-passport-label', 'Evidence passport'),
    node('strong', '', `Project ${view.projectId}`),
    node('code', '', PRIVATE_COMPLETE_JOURNEY_EVIDENCE_SCHEMA),
    node('span', 'pcj-unreleased', 'Customer service not released'),
  );
  hero.append(introduction, passport);

  const rail = node('ol', 'pcj-stage-list');
  view.stages.forEach((item) => rail.append(renderStage(item)));

  const blockerSection = node('aside', 'pcj-blockers');
  const blockerHead = node('header', 'pcj-blocker-head');
  blockerHead.append(
    node('p', 'pcj-kicker', 'Release gate remains closed'),
    node('h2', '', 'What this proof still cannot claim'),
    node('span', 'pcj-blocker-count', `${view.blockers.length} blockers`),
  );
  const blockerList = node('ul', 'pcj-blocker-list');
  view.blockers.forEach((item) => {
    const row = node('li', 'pcj-blocker');
    row.append(node('code', '', item.code), node('p', '', item.message));
    blockerList.append(row);
  });
  blockerSection.append(blockerHead, blockerList);

  const footer = node('footer', 'pcj-footer');
  footer.append(
    node('strong', '', 'Metadata only'),
    node('span', '', 'No source pixels, signed artifact URLs, model bytes or private files are rendered by this surface.'),
    node('span', '', 'All public flags off · controlled workflow evidence ≠ detector benchmark ≠ as-built evidence'),
  );

  surface.append(hero, rail, blockerSection, footer);
  root.replaceChildren(surface);
  return view;
}
