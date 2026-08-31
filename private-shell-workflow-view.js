import { PrivateShellCustomerWorkflow } from './journey-shell-customer-workflow.js';
import {
  PRIVATE_SHELL_ORBIT_VIEWER_ENABLED,
  ReceiptBoundShellOrbitSession,
} from './private-shell-orbit-viewer.js';
import { PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER } from './private-shell-webgl-orbit-runtime.js';

/**
 * Private bare-shell customer review surface.
 *
 * Deliberately absent from ProjectJourney.html and the public deployment list. This renderer only
 * displays an already validated workflow snapshot; it never creates geometry or substitutes demo
 * evidence. The host must supply object URLs made from workflow.artifact(role) byte verification.
 */
export const PRIVATE_SHELL_WORKFLOW_SURFACE_ENABLED = false;

const PHASES = Object.freeze([
  ['source', 'Source + verticals'],
  ['shell', 'Bare shell'],
  ['inspect', 'Your inspection'],
  ['brief', 'Furniture function'],
]);

const PHASE_INDEX = Object.freeze({
  disconnected: -1,
  shell_generation_ready: 0,
  shell_generating: 1,
  blocked: 1,
  shell_review: 1,
  return_to_correction: 1,
  shell_approved: 2,
  functional_brief_complete: 3,
});

const EVIDENCE_LABELS = Object.freeze([
  ['walls', 'Walls'],
  ['doors', 'Doors'],
  ['windows', 'Windows'],
  ['rooms', 'Rooms'],
]);

const LOCK_LABELS = Object.freeze({
  designSelection: 'Design direction',
  materials: 'Materials',
  furnishedModel: 'Furnished model',
  rendering: 'AI renders',
  quotation: 'Quotation',
  payment: 'Payment',
});

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function button(label, action, enabled, handler, className = '') {
  const element = node('button', `psw-button ${className}`.trim(), label);
  element.type = 'button';
  element.dataset.action = action;
  element.disabled = !enabled;
  if (enabled && typeof handler === 'function') element.addEventListener('click', handler);
  return element;
}

function shortHash(value) {
  return typeof value === 'string' && value.length >= 12
    ? `${value.slice(0, 7)}…${value.slice(-5)}`
    : 'not available';
}

function phaseCopy(phase) {
  return ({
    disconnected: ['Private service required', 'No project evidence has been loaded.'],
    shell_generation_ready: ['Ready to build the bare shell', 'The approved 2D geometry and vertical measurements are pinned.'],
    shell_generating: ['Building the bare shell', 'The service is compiling geometry-only evidence.'],
    shell_review: ['Inspect the geometry-only shell', 'Use the byte-verified engineering views to check every wall, door, window and room before approval.'],
    blocked: ['Evidence needs attention', 'Approval is locked until the listed issue is corrected by the service.'],
    return_to_correction: ['New source revision required', 'Continue in correction; every shell and downstream approval stays invalidated.'],
    shell_approved: ['Bare shell approved', 'The functional furniture brief is now available. Design choices remain locked.'],
    functional_brief_complete: ['Functional brief recorded', 'Design, material, render, quote and payment stages remain locked.'],
  })[phase] || ['Service state unavailable', 'This private workflow cannot advance from the current service state.'];
}

/** A small serializable view model used by tests and the DOM renderer. */
export function privateShellStageRows(state) {
  const current = PHASE_INDEX[state?.phase] ?? -1;
  return Object.freeze(PHASES.map(([id, label], index) => Object.freeze({
    id,
    label,
    status: index < current ? 'complete' : index === current ? 'current' : 'locked',
  })));
}

function renderStageRail(state) {
  const nav = node('nav', 'psw-stage-rail');
  nav.setAttribute('aria-label', 'Private shell workflow stages');
  const list = node('ol', 'psw-stage-list');
  privateShellStageRows(state).forEach((stage, index) => {
    const item = node('li', 'psw-stage');
    item.dataset.status = stage.status;
    item.append(node('span', 'psw-stage-index', String(index + 1).padStart(2, '0')));
    const copy = node('span', 'psw-stage-name', stage.label);
    copy.append(node('small', '', stage.status));
    item.append(copy);
    list.append(item);
  });
  nav.append(list);
  return nav;
}

function renderEvidence(state) {
  const section = node('section', 'psw-card psw-evidence');
  section.setAttribute('aria-labelledby', 'pswEvidenceTitle');
  const heading = node('div', 'psw-card-heading');
  heading.append(node('div', 'psw-kicker', 'Structural evidence'));
  const title = node('h2', '', 'What the shell contains');
  title.id = 'pswEvidenceTitle';
  heading.append(title);
  heading.append(node('p', '', 'Counts come from the approved source and the semantic shell manifest. They are not inferred in this browser.'));
  section.append(heading);

  const grid = node('dl', 'psw-evidence-grid');
  EVIDENCE_LABELS.forEach(([key, label]) => {
    const cell = node('div', 'psw-evidence-cell');
    const count = state?.evidence?.counts?.[key];
    cell.append(node('dt', '', label));
    cell.append(node('dd', '', Number.isSafeInteger(count) ? count : '—'));
    cell.append(node('span', 'psw-pass', Number.isSafeInteger(count) ? 'matched' : 'unavailable'));
    grid.append(cell);
  });
  section.append(grid);

  if (state?.source) {
    const binding = node('div', 'psw-binding');
    binding.append(node('span', '', `Geometry v${state.source.geometryVersion}`));
    binding.append(node('code', '', shortHash(state.source.geometrySha256)));
    binding.append(node('span', '', `Vertical approval v${state.source.verticalDimensionsApprovalVersion}`));
    section.append(binding);
  }
  return section;
}

function renderOrbitViewer(state, handlers) {
  const section = node('section', 'psw-card psw-orbit');
  section.dataset.orbitStatus = state?.shell ? 'not_loaded' : 'unavailable';
  section.setAttribute('aria-labelledby', 'pswOrbitTitle');
  const heading = node('div', 'psw-card-heading psw-card-heading-split');
  const copy = node('div');
  copy.append(node('div', 'psw-kicker', 'Receipt-bound model'));
  const title = node('h2', '', 'Read the whole shell in 3D');
  title.id = 'pswOrbitTitle';
  copy.append(title);
  copy.append(node(
    'p',
    '',
    'A read-only orbit view may inspect geometry only. It cannot move walls, add furniture, select a design or represent a renovation render.',
  ));
  const status = node('span', 'psw-status psw-orbit-status', state?.shell ? 'Runtime check required' : 'No shell receipt');
  status.setAttribute('aria-live', 'polite');
  status.dataset.orbitStatusLabel = '';
  heading.append(copy, status);
  section.append(heading);

  const frame = node('div', 'psw-orbit-frame');
  const viewport = node('div', 'psw-orbit-viewport');
  viewport.dataset.shellOrbitViewport = '';
  viewport.tabIndex = -1;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-disabled', 'true');
  viewport.setAttribute('aria-label', 'Private geometry-only 3D shell viewer unavailable');
  const runtimeMount = node('div', 'psw-orbit-runtime');
  runtimeMount.dataset.shellOrbitRuntime = '';
  runtimeMount.setAttribute('aria-hidden', 'true');
  runtimeMount.tabIndex = -1;
  const unavailable = node('div', 'psw-orbit-unavailable');
  unavailable.dataset.shellOrbitMessage = '';
  unavailable.append(node('span', 'psw-orbit-crosshair', '＋'));
  unavailable.append(node('strong', '', state?.shell ? 'Local renderer not connected' : 'No verified GLB receipt'));
  unavailable.append(node(
    'p',
    '',
    'No interactive model is being shown. Verified room PNGs remain separate engineering evidence.',
  ));
  viewport.append(runtimeMount, unavailable);

  const meta = node('div', 'psw-orbit-meta');
  const identity = node('div');
  identity.append(node('span', 'psw-kicker', 'Immutable artifact'));
  identity.append(node('strong', '', state?.shell?.glbArtifact
    ? `${state.shell.glbArtifact.role} · ${shortHash(state.shell.glbArtifact.sha256)}`
    : 'GLB descriptor unavailable'));
  const controls = node('div', 'psw-orbit-controls');
  controls.append(node('span', '', 'Drag / one finger orbit'));
  controls.append(node('span', '', 'Wheel / pinch zoom'));
  controls.append(node('span', '', 'Arrow keys orbit · Shift + arrows pan · + / − zoom'));
  const reset = button('Reset view', 'reset-orbit', true, handlers?.onResetOrbit);
  reset.disabled = true;
  reset.dataset.shellOrbitReset = '';
  controls.append(reset);
  meta.append(identity, controls);
  frame.append(viewport, meta);
  section.append(frame);

  const truth = node('div', 'psw-orbit-truth');
  ['geometry only', 'read only', 'no network', 'no furniture', 'not a render'].forEach((label) => {
    truth.append(node('span', '', label));
  });
  section.append(truth);
  return section;
}

/** Apply one lifecycle-gate result without implying that a missing runtime rendered a model. */
export function updatePrivateShellOrbitPresentation(root, presentation) {
  const section = root?.querySelector?.('.psw-orbit');
  if (!section) return;
  const status = presentation?.status || 'unavailable';
  section.dataset.orbitStatus = status;
  const badge = section.querySelector('[data-orbit-status-label]');
  const viewport = section.querySelector('[data-shell-orbit-viewport]');
  const message = section.querySelector('[data-shell-orbit-message]');
  const reset = section.querySelector('[data-shell-orbit-reset]');
  const runtime = section.querySelector('[data-shell-orbit-runtime]');
  const copy = {
    ready: ['Interactive GLB ready', 'The exact current geometry-only GLB is loaded from a private in-memory object URL.'],
    runtime_missing: ['Bundled runtime missing', presentation?.message || 'No local renderer is installed; no model URL was created.'],
    disabled: ['Orbit review disabled', 'This separately gated private viewer was not enabled by its authenticated host.'],
    stale: ['Revision invalidated', 'The previous model was destroyed because the shell revision changed.'],
    rejected: ['Artifact rejected', presentation?.message || 'The GLB did not pass its current private receipt.'],
    unavailable: ['No shell receipt', 'No interactive model is being shown.'],
  }[status] || ['Viewer unavailable', 'No interactive model is being shown.'];
  if (badge) {
    badge.textContent = copy[0];
    badge.classList.toggle('is-pass', status === 'ready');
  }
  if (message) {
    message.replaceChildren(
      node('span', 'psw-orbit-crosshair', status === 'ready' ? '↻' : '＋'),
      node('strong', '', copy[0]),
      node('p', '', copy[1]),
    );
    message.hidden = status === 'ready';
  }
  if (viewport) {
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-disabled', String(status !== 'ready'));
    viewport.setAttribute('aria-label', status === 'ready'
      ? 'Receipt-bound read-only geometry shell presentation.'
      : copy[0]);
  }
  if (runtime) {
    runtime.setAttribute('aria-hidden', String(status !== 'ready'));
    runtime.setAttribute('role', status === 'ready' ? 'application' : 'presentation');
    runtime.setAttribute('aria-label', status === 'ready'
      ? 'Read-only geometry shell. Use pointer, touch or keyboard to orbit, pan and zoom.'
      : '');
    runtime.tabIndex = status === 'ready' ? 0 : -1;
  }
  if (reset) reset.disabled = status !== 'ready';
}

function renderReviewViews(state, viewImages, handlers) {
  const section = node('section', 'psw-card psw-views');
  section.setAttribute('aria-labelledby', 'pswViewsTitle');
  const heading = node('div', 'psw-card-heading psw-card-heading-split');
  const copy = node('div');
  copy.append(node('div', 'psw-kicker', 'Verified engineering views'));
  const title = node('h2', '', 'Room and opening coverage');
  title.id = 'pswViewsTitle';
  copy.append(title);
  const quality = state?.visualQuality?.status === 'passed';
  heading.append(copy, node('span', quality ? 'psw-status is-pass' : 'psw-status', quality ? 'PNG gate passed' : 'PNG gate unavailable'));
  section.append(heading);

  const views = state?.shell?.reviewViews || [];
  const gallery = node('div', 'psw-view-grid');
  views.forEach((view, index) => {
    const figure = node('figure', 'psw-view');
    const media = node('div', 'psw-view-media');
    const source = viewImages?.get?.(view.artifactRole) || viewImages?.[view.artifactRole];
    if (source) {
      const image = node('img');
      image.src = source;
      image.alt = `${view.roomName || 'Whole unit'} byte-verified shell view`;
      image.loading = index > 1 ? 'lazy' : 'eager';
      media.append(image);
    } else {
      media.dataset.evidenceMissing = 'true';
      media.append(node('span', 'psw-view-number', String(index + 1).padStart(2, '0')));
      media.append(node('strong', '', 'Verified image not loaded'));
      media.append(node('small', '', view.artifactRole));
    }
    const caption = node('figcaption');
    caption.append(node('span', '', view.roomName || 'Whole unit overview'));
    caption.append(node('code', '', shortHash(view.artifactSha256)));
    figure.append(media, caption);
    gallery.append(figure);
  });
  if (!views.length) gallery.append(node('p', 'psw-empty', 'No byte-verified review views are available.'));
  section.append(gallery);

  if (state?.actions?.inspectShell && views.length) {
    const form = node('form', 'psw-inspection');
    const intro = node('div', 'psw-inspection-intro');
    intro.append(node('h3', '', 'Inspection checklist'));
    intro.append(node('p', '', 'If anything is missing or misplaced, return it for a new geometry revision.'));
    form.append(intro);
    const checks = node('div', 'psw-check-grid');
    [
      ['confirmWalls', 'Wall paths and heights'],
      ['confirmDoors', 'Every door and host wall'],
      ['confirmWindows', 'Every window and host wall'],
      ['confirmRooms', 'Room boundaries and labels'],
      ['confirmEveryView', 'Every review view above'],
    ].forEach(([name, label]) => {
      const wrapper = node('label', 'psw-check');
      const input = node('input');
      input.type = 'checkbox';
      input.name = name;
      wrapper.append(input, node('span', '', label));
      checks.append(wrapper);
    });
    form.append(checks);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      handlers?.onInspect?.({
        confirmWalls: data.has('confirmWalls'),
        confirmDoors: data.has('confirmDoors'),
        confirmWindows: data.has('confirmWindows'),
        confirmRooms: data.has('confirmRooms'),
        confirmEveryView: data.has('confirmEveryView'),
        viewedArtifactRoles: views.map((view) => view.artifactRole),
      });
    });
    const actions = node('div', 'psw-action-row');
    const submit = button('Confirm inspection', 'inspect', true, null, 'is-primary');
    submit.type = 'submit';
    actions.append(submit);
    form.append(actions);
    section.append(form);
  }
  return section;
}

function renderBlockers(state) {
  if (!state?.blockers?.length) return null;
  const region = node('section', 'psw-blockers');
  region.setAttribute('role', 'alert');
  region.append(node('div', 'psw-kicker', 'Approval blocked'));
  state.blockers.forEach((item) => {
    const row = node('div', 'psw-blocker-row');
    row.append(node('strong', '', item.code || 'evidence issue'));
    row.append(node('p', '', item.message || 'The private service did not return complete evidence.'));
    region.append(row);
  });
  return region;
}

function renderLocks(state) {
  const aside = node('aside', 'psw-locks');
  aside.append(node('div', 'psw-kicker', 'Deliberately locked'));
  aside.append(node('h2', '', 'Geometry comes first.'));
  aside.append(node('p', '', 'Furniture function opens only after bare-shell approval. Aesthetic and commercial stages are not released here.'));
  const list = node('ul');
  Object.entries(LOCK_LABELS).forEach(([key, label]) => {
    const locked = state?.downstreamLocks?.[key] !== false;
    const item = node('li');
    item.dataset.locked = String(locked);
    item.append(node('span', '', label), node('small', '', locked ? 'locked' : 'available'));
    list.append(item);
  });
  aside.append(list);
  return aside;
}

/**
 * Render a validated workflow snapshot. Handlers are optional and are the only mutation boundary.
 */
export function renderPrivateShellWorkflow(root, state, { handlers = {}, viewImages = new Map() } = {}) {
  if (!(root instanceof Element)) throw new TypeError('Private shell workflow root must be an Element.');
  const phase = state?.phase || 'disconnected';
  const [title, copy] = phaseCopy(phase);
  root.className = 'private-shell-workflow';
  root.dataset.phase = phase;
  root.replaceChildren();

  const header = node('header', 'psw-header');
  const identity = node('div', 'psw-identity');
  identity.append(node('span', 'psw-mark', 'H&M'));
  const identityCopy = node('div');
  identityCopy.append(node('div', 'psw-kicker', 'Private project evidence'));
  identityCopy.append(node('strong', '', state?.projectId || 'No project'));
  identity.append(identityCopy);
  const release = node('div', 'psw-release');
  release.append(node('span', '', state?.release ? 'release verified' : 'release unavailable'));
  release.append(node('code', '', shortHash(state?.release?.releaseId)));
  header.append(identity, release);

  const hero = node('section', 'psw-hero');
  const lead = node('div');
  lead.append(node('div', 'psw-kicker', 'Bare-shell checkpoint'));
  lead.append(node('h1', '', title));
  lead.append(node('p', '', copy));
  hero.append(lead, renderStageRail(state));

  const command = node('section', 'psw-command');
  const actionCopy = node('div');
  actionCopy.append(node('div', 'psw-kicker', 'Next service action'));
  const shellIdentity = state?.shell
    ? `Shell v${state.shell.shellModelVersion} · ${shortHash(state.shell.shellModelSha256)}`
    : 'No current shell is exposed';
  actionCopy.append(node('strong', '', shellIdentity));
  command.append(actionCopy);
  const commandButtons = node('div', 'psw-action-row');
  if (state?.actions?.generateShell) commandButtons.append(button('Generate bare shell', 'generate', true, handlers.onGenerate, 'is-primary'));
  if (state?.actions?.recoverShell) commandButtons.append(button('Recover service evidence', 'recover', true, handlers.onRecover));
  if (state?.actions?.approveShell) commandButtons.append(button('Approve bare shell', 'approve', true, handlers.onApprove, 'is-primary'));
  if (state?.actions?.functionalFurnitureBrief) commandButtons.append(button('Open functional brief', 'brief', true, handlers.onFunctionalBrief, 'is-primary'));
  if (state?.actions?.returnToCorrection) commandButtons.append(button('Return for correction', 'correct', true, handlers.onCorrection, 'is-quiet'));
  if (!commandButtons.children.length) commandButtons.append(button('Waiting for service', 'waiting', false));
  command.append(commandButtons);

  const blockerRegion = renderBlockers(state);
  const main = node('main', 'psw-layout');
  const evidenceColumn = node('div', 'psw-main-column');
  evidenceColumn.append(
    renderEvidence(state),
    renderOrbitViewer(state, handlers),
    renderReviewViews(state, viewImages, handlers),
  );
  main.append(evidenceColumn, renderLocks(state));

  const foot = node('footer', 'psw-foot');
  foot.append(node('span', '', 'Engineering shell view ≠ customer render ≠ geometry authority'));
  foot.append(node('span', '', 'Design · material · render · quote · payment locked'));
  root.append(header, hero, command);
  if (blockerRegion) root.append(blockerRegion);
  root.append(main, foot);
  return root;
}

/**
 * Disabled local composition boundary for a future authenticated private host.
 *
 * There is intentionally no automatic mount, URL discovery, public configuration read, navigation,
 * or local evidence fallback. The private host must pass the release pin and opt in explicitly.
 */
export class PrivateShellWorkflowSurfaceController {
  #workflow;

  #objectUrls = new Map();

  #renderEpoch = 0;

  #busy = false;

  #orbitSession;

  constructor({
    root,
    baseUrl,
    projectId,
    expectedReleaseId,
    reviewerActorId,
    fetchImpl = globalThis.fetch,
    enabled = PRIVATE_SHELL_WORKFLOW_SURFACE_ENABLED,
    orbitViewerEnabled = PRIVATE_SHELL_ORBIT_VIEWER_ENABLED,
    orbitRuntimeProvider = PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER,
    onCorrectionHandoff,
    onFunctionalBrief,
  } = {}) {
    if (enabled !== true) throw new Error('Private shell workflow surface wiring is disabled.');
    if (!(root instanceof Element)) throw new TypeError('Private shell workflow surface needs a root Element.');
    this.root = root;
    this.reviewerActorId = reviewerActorId;
    this.onCorrectionHandoff = onCorrectionHandoff;
    this.onFunctionalBrief = onFunctionalBrief;
    this.#orbitSession = new ReceiptBoundShellOrbitSession({
      enabled: orbitViewerEnabled,
      runtimeProvider: orbitRuntimeProvider,
    });
    this.#workflow = new PrivateShellCustomerWorkflow({
      baseUrl,
      projectId,
      expectedReleaseId,
      fetchImpl,
      enabled: true,
    });
  }

  #releaseObjectUrls() {
    this.#objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.#objectUrls.clear();
  }

  async #verifiedViewImages(state, epoch) {
    const created = new Map();
    for (const view of state?.shell?.reviewViews || []) {
      const artifact = await this.#workflow.artifact(view.artifactRole);
      if (artifact.mediaType !== 'image/png') {
        throw new TypeError(`Verified shell view ${view.view} is not PNG evidence.`);
      }
      const url = URL.createObjectURL(new Blob([artifact.bytes], { type: artifact.mediaType }));
      created.set(view.artifactRole, url);
    }
    if (epoch !== this.#renderEpoch) {
      created.forEach((url) => URL.revokeObjectURL(url));
      return null;
    }
    this.#releaseObjectUrls();
    this.#objectUrls = created;
    return created;
  }

  #handlers() {
    const run = (operation) => () => { void this.#run(operation); };
    return {
      onGenerate: run(async () => { await this.#workflow.generateShell(); return this.#workflow.snapshot(); }),
      onRecover: run(() => this.#workflow.sync()),
      onInspect: (inspection) => {
        void this.#run(async () => {
          this.#workflow.inspectCurrent(inspection);
          return this.#workflow.snapshot();
        });
      },
      onApprove: run(async () => {
        await this.#workflow.approveShell(this.reviewerActorId);
        return this.#workflow.snapshot();
      }),
      onCorrection: run(async () => {
        const handoff = this.#workflow.returnToCorrection();
        this.onCorrectionHandoff?.(handoff);
        return this.#workflow.snapshot();
      }),
      onFunctionalBrief: () => this.onFunctionalBrief?.(this.#workflow.snapshot()),
      onResetOrbit: () => this.#orbitSession.resetView(),
    };
  }

  async #draw(state) {
    const epoch = ++this.#renderEpoch;
    let viewImages = new Map();
    if (state?.shell?.reviewViews?.length) {
      viewImages = await this.#verifiedViewImages(state, epoch);
      if (!viewImages) return state;
    } else {
      this.#releaseObjectUrls();
    }
    renderPrivateShellWorkflow(this.root, state, { handlers: this.#handlers(), viewImages });
    if (!state?.shell) {
      updatePrivateShellOrbitPresentation(this.root, { status: 'unavailable' });
      return state;
    }
    if (!this.#orbitSession.enabled) {
      updatePrivateShellOrbitPresentation(this.root, { status: 'disabled' });
      return state;
    }
    let runtimeViewport = null;
    let onRuntimeFatal = null;
    try {
      const artifact = await this.#workflow.artifact(state.shell.glbArtifact?.role);
      if (epoch !== this.#renderEpoch) return state;
      runtimeViewport = this.root.querySelector('[data-shell-orbit-runtime]');
      onRuntimeFatal = (event) => {
        if (epoch !== this.#renderEpoch) return;
        this.#orbitSession.close();
        updatePrivateShellOrbitPresentation(this.root, {
          status: 'rejected',
          message: event.detail?.message || 'The local WebGL runtime was invalidated.',
        });
      };
      runtimeViewport?.addEventListener(
        'homeandme:private-shell-orbit-fatal', onRuntimeFatal, { once: true },
      );
      const presentation = await this.#orbitSession.open({
        shell: state.shell,
        artifact,
        viewport: runtimeViewport,
      });
      if (presentation.status !== 'ready') {
        runtimeViewport?.removeEventListener('homeandme:private-shell-orbit-fatal', onRuntimeFatal);
      }
      if (epoch === this.#renderEpoch) {
        updatePrivateShellOrbitPresentation(this.root, presentation);
      }
    } catch (error) {
      if (runtimeViewport && onRuntimeFatal) {
        runtimeViewport.removeEventListener('homeandme:private-shell-orbit-fatal', onRuntimeFatal);
      }
      this.#orbitSession.close();
      if (epoch === this.#renderEpoch) {
        updatePrivateShellOrbitPresentation(this.root, {
          status: 'rejected',
          message: error?.message || String(error),
        });
      }
    }
    return state;
  }

  async #run(operation) {
    if (this.#busy) throw new Error('A private shell workflow operation is already in progress.');
    this.#busy = true;
    this.#renderEpoch += 1;
    this.#orbitSession.close();
    this.#releaseObjectUrls();
    this.root.setAttribute('aria-busy', 'true');
    try {
      return await this.#draw(await operation());
    } finally {
      this.#busy = false;
      this.root.removeAttribute('aria-busy');
    }
  }

  connect() {
    return this.#run(() => this.#workflow.connect());
  }

  sync() {
    return this.#run(() => this.#workflow.sync());
  }

  saveFunctionalBrief(input) {
    return this.#run(async () => {
      await this.#workflow.saveFunctionalBrief(input);
      return this.#workflow.snapshot();
    });
  }

  dispose() {
    this.#renderEpoch += 1;
    this.#orbitSession.dispose();
    this.#releaseObjectUrls();
    this.#workflow.dispose();
    this.root.replaceChildren();
  }
}
