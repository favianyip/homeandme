import {
  PRIVATE_FUNCTIONAL_LAYOUT_REVIEW_SCHEMA,
  PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED,
  PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA,
} from './private-functional-layout-workflow.js';

const HASH = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const PHASES = new Set([
  'ready_to_generate', 'layout_review', 'layout_blocked', 'layout_approved', 'blocked',
]);

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function fail(message) {
  throw new TypeError(`Private furniture review unavailable: ${message}`);
}

function hash(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${label} is invalid.`);
}

function safeId(value, label) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) fail(`${label} is invalid.`);
}

function stage(id, number, label, state, note) {
  return Object.freeze({ id, number, label, state, note });
}

function labelForType(value) {
  return ({
    practical: 'Practical balance',
    storage_optimised: 'Storage first',
    circulation_reserve: 'Circulation reserve',
  })[value] || value;
}

/** Project only the metadata required for the private customer review surface. */
export function privateFunctionalLayoutViewModel(snapshot) {
  if (!record(snapshot) || snapshot.schema !== PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_SCHEMA
    || snapshot.enabled !== true || !PHASES.has(snapshot.phase)) {
    fail('workflow snapshot is missing, disabled or incompatible.');
  }
  safeId(snapshot.projectId, 'project');
  const authority = snapshot.authority;
  if (!record(authority)) fail('source/shell/brief authority is missing.');
  hash(authority.sourceRegistrationSha256, 'source registration');
  hash(authority.geometrySha256, 'geometry');
  hash(authority.shellModelSha256, 'shell');
  hash(authority.furnitureBriefSha256, 'furniture brief');
  if (snapshot.truth?.sourcePixelsRendered !== false
    || snapshot.truth?.privateArtifactBytesRendered !== false
    || snapshot.truth?.learnedRankingUsed !== false
    || snapshot.truth?.detectorAccuracyClaim !== false
    || snapshot.truth?.asBuiltAccuracyClaim !== false
    || snapshot.truth?.customerReleaseEligible !== false
    || snapshot.actions?.designSelection !== false
    || snapshot.actions?.furnishedModel !== false
    || snapshot.actions?.deterministicRender !== false) {
    fail('privacy, accuracy or downstream release boundary was weakened.');
  }
  const review = snapshot.review;
  const options = [];
  if (review !== null) {
    if (!record(review) || review.schema !== PRIVATE_FUNCTIONAL_LAYOUT_REVIEW_SCHEMA
      || review.projectId !== snapshot.projectId || review.customerReleaseEligible !== false
      || review.learnedModelUsed !== false || review.decisionSupportOnly !== true
      || !Array.isArray(review.options) || review.options.length !== 3) {
      fail('functional layout review metadata is incomplete.');
    }
    hash(review.optionSetSha256, 'option set');
    for (const option of review.options) {
      safeId(option.layoutId, 'layout');
      hash(option.layoutSha256, `layout ${option.layoutId}`);
      if (!Number.isSafeInteger(option.rank) || option.rank < 1 || option.rank > 3
        || typeof option.recommended !== 'boolean' || typeof option.eligible !== 'boolean'
        || !Number.isSafeInteger(option.scoreBasisPoints)
        || option.scoreBasisPoints < 0 || option.scoreBasisPoints > 10_000
        || !Number.isSafeInteger(option.placementCount) || option.placementCount < 0
        || !Number.isSafeInteger(option.roomCount) || option.roomCount < 1
        || !Array.isArray(option.placementsByRoom)
        || option.placementsByRoom.length !== option.roomCount) {
        fail(`layout ${option.layoutId} summary is invalid.`);
      }
      const roomIds = new Set();
      let projectedPlacements = 0;
      for (const room of option.placementsByRoom) {
        safeId(room?.roomId, `layout ${option.layoutId} room`);
        if (roomIds.has(room.roomId) || typeof room.roomName !== 'string'
          || room.roomName.length < 1 || room.roomName.length > 200
          || !Number.isSafeInteger(room.placementCount) || room.placementCount < 0
          || !Array.isArray(room.assetIds) || room.assetIds.length !== room.placementCount) {
          fail(`layout ${option.layoutId} room placement ledger is inconsistent.`);
        }
        roomIds.add(room.roomId);
        room.assetIds.forEach((assetId) => safeId(assetId, `layout ${option.layoutId} asset`));
        projectedPlacements += room.placementCount;
      }
      if (projectedPlacements !== option.placementCount) {
        fail(`layout ${option.layoutId} projected placement total is inconsistent.`);
      }
      options.push(Object.freeze({
        ...option,
        label: labelForType(option.type),
        scorePercent: Math.round(option.scoreBasisPoints / 100),
      }));
    }
    const recommended = options.filter((option) => option.recommended);
    if (review.status === 'available' && (recommended.length !== 1
      || recommended[0].layoutId !== review.recommendedLayoutId)) {
      fail('functional layout recommendation is inconsistent.');
    }
  }
  const approval = snapshot.approval;
  if (snapshot.phase === 'layout_approved') {
    if (!record(approval)
      || approval.schema !== 'homeandme-private-functional-layout-approval/2'
      || approval.projectId !== snapshot.projectId
      || approval.optionSetVersion !== review?.optionSetVersion
      || approval.optionSetSha256 !== review?.optionSetSha256
      || !Number.isSafeInteger(approval.layoutVersion) || approval.layoutVersion < 1
      || typeof approval.recoveredAfterReload !== 'boolean'
      || approval.designSelectionReleased !== false
      || approval.furnishedModelReleased !== false
      || approval.deterministicRenderReleased !== false) {
      fail('approved functional layout receipt is missing, stale or unlocked.');
    }
    safeId(approval.layoutId, 'approved layout');
    safeId(approval.reviewerActorId, 'approved layout reviewer');
    safeId(approval.claimedReviewerActorId, 'claimed layout reviewer');
    hash(approval.selectedLayoutSha256, 'approved selected layout');
    hash(approval.selectedOptionSha256, 'approved selected option');
    hash(approval.layoutSha256, 'approved layout');
    hash(approval.approvalActorSha256, 'approved layout actor');
    if (approval.recoveredAfterReload === true) {
      hash(approval.recoveryReceiptSha256, 'approved layout recovery');
    } else if (approval.recoveryReceiptSha256 !== null) {
      fail('new approval unexpectedly contains a reload recovery receipt.');
    }
    const approvedOption = options.find((option) => option.layoutId === approval.layoutId);
    if (!approvedOption?.eligible
      || approvedOption.layoutSha256 !== approval.selectedLayoutSha256) {
      fail('approved option is absent or no longer eligible.');
    }
  } else if (approval !== null) {
    fail('an approval receipt appeared before the approved phase.');
  }
  const layoutState = snapshot.phase === 'layout_approved'
    ? 'approved'
    : (snapshot.phase === 'layout_review' ? 'review' : (snapshot.phase === 'layout_blocked' ? 'blocked' : 'waiting'));
  const steps = Object.freeze([
    stage('source', '01', 'Source + correction', 'verified', `Geometry v${authority.geometryVersion} is source-registered and approved.`),
    stage('shell', '02', 'Bare shell', 'verified', `Shell v${authority.shellModelVersion} is byte-verified and approved.`),
    stage('furniture', '03', 'Furniture fit', layoutState, (
      layoutState === 'review'
        ? 'Three measured whole-unit options are ready for customer review.'
        : (layoutState === 'approved'
          ? 'One exact functional option is approved.'
          : 'A measured option must pass every room, swing and circulation gate.')
    )),
    stage('design', '04', 'Design direction', 'locked', 'Rights-cleared design selection is not released by this private handshake.'),
    stage('model', '05', 'Furnished model', 'locked', 'No browser action can generate a furnished model from this release.'),
    stage('render', '06', 'Deterministic render', 'locked', 'Rendering remains downstream of design and furnished-model approval.'),
  ]);
  return Object.freeze({
    projectId: snapshot.projectId,
    phase: snapshot.phase,
    title: 'Furniture fit before finish.',
    summary: 'The browser now continues from an approved shell and functional brief into exact, server-authored whole-unit placement options.',
    steps,
    options: Object.freeze(options),
    recommendedLayoutId: review?.recommendedLayoutId || null,
    approval,
    blockers: Object.freeze([
      ...(review?.blockers || []),
      ...(snapshot.blockers || []),
    ]),
    canGenerate: snapshot.actions?.generateOptions === true,
    canApprove: snapshot.actions?.approveLayout === true,
    customerReleaseEligible: false,
  });
}

function node(tag, className = '', text = '') {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text) item.textContent = text;
  return item;
}

function shortHash(value) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function renderStep(item) {
  const row = node('li', 'pfl-step');
  row.dataset.stage = item.id;
  row.dataset.status = item.state;
  row.append(node('span', 'pfl-step-number', item.number));
  const copy = node('div', 'pfl-step-copy');
  copy.append(node('strong', '', item.label), node('span', '', item.note));
  row.append(copy, node('span', 'pfl-step-state', item.state));
  return row;
}

function renderRoomLedger(option) {
  const ledger = node('ul', 'pfl-room-ledger');
  option.placementsByRoom.forEach((room) => {
    const row = node('li');
    const identity = node('span');
    identity.append(node('strong', '', room.roomName), node('small', '', room.roomId));
    const count = node('span', 'pfl-room-count', `${room.placementCount} placement${room.placementCount === 1 ? '' : 's'}`);
    row.append(identity, count);
    ledger.append(row);
  });
  return ledger;
}

function renderOption(option, { canApprove, onApprove }) {
  const card = node('article', 'pfl-option');
  card.dataset.layoutId = option.layoutId;
  card.dataset.eligible = String(option.eligible);
  if (option.recommended) card.dataset.recommended = 'true';
  const header = node('header', 'pfl-option-head');
  const identity = node('div');
  identity.append(
    node('span', 'pfl-rank', `Option ${option.rank}`),
    node('h2', '', option.label),
  );
  header.append(identity, node('span', 'pfl-score', `${option.scorePercent}/100 fit`));
  const metrics = node('dl', 'pfl-metrics');
  [
    ['placements', option.placementCount],
    ['rooms checked', option.roomCount],
    ['hard issues', option.hardViolationCount],
    ['solver', option.solverStatus.toLowerCase()],
  ].forEach(([label, value]) => {
    const group = node('div');
    group.append(node('dt', '', label), node('dd', '', String(value)));
    metrics.append(group);
  });
  const receipt = node('code', 'pfl-option-receipt', shortHash(option.layoutSha256));
  receipt.setAttribute('aria-label', `Layout receipt ${option.layoutSha256}`);
  const action = node(
    'button',
    'pfl-approve',
    option.eligible ? (option.recommended ? 'Review recommended option' : 'Review this option') : 'Hard gates failed',
  );
  action.type = 'button';
  action.disabled = !canApprove || !option.eligible || typeof onApprove !== 'function';
  action.dataset.layoutId = option.layoutId;
  action.setAttribute('aria-label', `${action.textContent}: ${option.label}`);
  if (!action.disabled) action.addEventListener('click', () => onApprove(option.layoutId));
  card.append(header, metrics, renderRoomLedger(option), receipt, action);
  return card;
}

/** Render only when an authenticated private host explicitly opts in. */
export function renderPrivateFunctionalLayout(root, snapshot, {
  enabled = PRIVATE_FUNCTIONAL_LAYOUT_WORKFLOW_ENABLED,
  onGenerate,
  onApprove,
} = {}) {
  if (enabled !== true) throw new Error('Private functional layout surface is disabled.');
  if (!(root instanceof Element)) throw new TypeError('Private functional layout root must be an Element.');
  const view = privateFunctionalLayoutViewModel(snapshot);
  const surface = node('section', 'private-functional-layout');
  surface.dataset.customerReleaseEligible = 'false';
  surface.setAttribute('aria-labelledby', 'privateFunctionalLayoutTitle');

  const hero = node('header', 'pfl-hero');
  const intro = node('div');
  intro.append(
    node('p', 'pfl-kicker', 'Private continuation · default off'),
    node('h1', '', view.title),
    node('p', 'pfl-lede', view.summary),
  );
  intro.querySelector('h1').id = 'privateFunctionalLayoutTitle';
  const ticket = node('aside', 'pfl-ticket');
  ticket.append(
    node('span', 'pfl-ticket-label', 'Bound handoff'),
    node('strong', '', `Project ${view.projectId}`),
    node('span', '', 'Source → shell → brief'),
    node('b', '', 'Design + render locked'),
  );
  hero.append(intro, ticket);

  const rail = node('ol', 'pfl-rail');
  view.steps.forEach((item) => rail.append(renderStep(item)));

  const workspace = node('section', 'pfl-workspace');
  workspace.setAttribute('aria-labelledby', 'privateFunctionalOptionsTitle');
  const workspaceHead = node('header', 'pfl-workspace-head');
  const workspaceCopy = node('div');
  workspaceCopy.append(
    node('p', 'pfl-kicker', 'Measured decision support · no learned ranking'),
    node('h2', '', view.phase === 'ready_to_generate' ? 'Generate the furniture fit study' : 'Compare whole-unit options'),
  );
  workspaceCopy.querySelector('h2').id = 'privateFunctionalOptionsTitle';
  const generate = node(
    'button',
    'pfl-generate',
    view.canGenerate ? 'Generate three options' : (view.options.length ? 'Option set verified' : 'Generation locked'),
  );
  generate.type = 'button';
  generate.disabled = !view.canGenerate || typeof onGenerate !== 'function';
  if (!generate.disabled) generate.addEventListener('click', () => onGenerate());
  workspaceHead.append(workspaceCopy, generate);
  const optionGrid = node('div', 'pfl-option-grid');
  optionGrid.setAttribute('aria-live', 'polite');
  if (view.options.length) {
    view.options.forEach((option) => optionGrid.append(renderOption(option, {
      canApprove: view.canApprove,
      onApprove,
    })));
  } else {
    optionGrid.append(node(
      'p',
      'pfl-empty',
      'No customer-facing option exists until the private service returns a source-bound, fully validated option set.',
    ));
  }
  workspace.append(workspaceHead, optionGrid);

  const boundary = node('aside', 'pfl-boundary');
  const boundaryHead = node('header');
  boundaryHead.append(
    node('p', 'pfl-kicker', 'Release boundary'),
    node('h2', '', 'Furniture fit is not fidelity.'),
  );
  const blockerList = node('ul', 'pfl-blockers');
  view.blockers.forEach((blocker) => {
    const row = node('li');
    row.append(node('code', '', blocker.code), node('span', '', blocker.message));
    blockerList.append(row);
  });
  boundary.append(boundaryHead, blockerList);

  const footer = node('footer', 'pfl-footer');
  footer.append(
    node('strong', '', 'Metadata only'),
    node('span', '', 'No upload pixels, signed URLs, model bytes or render media are placed in this DOM.'),
    node('span', '', 'Public flags remain off.'),
  );
  surface.append(hero, rail, workspace, boundary, footer);
  root.replaceChildren(surface);
  return view;
}
