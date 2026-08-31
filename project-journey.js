import {
  applyServiceCapabilities,
  journeyConfig,
  SERVICE_CAPABILITY_ORDER,
} from './journey-api.js';
import {
  createJourneyServiceWorkflow,
  WorkflowGuardError,
  WorkflowPhase,
} from './journey-service-workflow.js';
import {
  approvedRenderRequest,
  auditCanonicalGeometry,
  canonicalGeometryChanges,
  geometryCorrectionSourceBinding,
  presentWorkflow,
  projectToCanonicalGeometry,
  serviceAvailability,
  validateCorrectionWitnesses,
} from './project-journey-model.js';
import {
  inspectGlbContainer,
  modelArtifactContract,
  modelReviewApprovalState,
} from './journey-model-artifacts.js';
import { buildLayoutReviewPreview } from './journey-layout-review.js';
import {
  designReferenceSelection,
  validateDesignReferenceCatalog,
} from './journey-design-references.js';
import { verifyPixelMetricRegistrationIntegrity } from './journey-source-registration.js';
import { journeyReleaseDossier } from './journey-release-dossier.js';

const $ = (selector, root = document) => root.querySelector(selector);
const SVG_NS = 'http://www.w3.org/2000/svg';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.id) node.id = options.id;
  if (options.name) node.name = options.name;
  if (options.value !== undefined) node.value = options.value;
  if (options.href) node.href = options.href;
  if (options.htmlFor) node.htmlFor = options.htmlFor;
  if (options.disabled !== undefined) node.disabled = Boolean(options.disabled);
  if (options.checked !== undefined) node.checked = Boolean(options.checked);
  for (const [name, value] of Object.entries(options.attrs || {})) {
    if (value !== undefined && value !== null) node.setAttribute(name, String(value));
  }
  for (const [name, value] of Object.entries(options.dataset || {})) node.dataset[name] = String(value);
  const values = Array.isArray(children) ? children : [children];
  for (const child of values) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function button(label, action, options = {}) {
  return element('button', {
    className: `button${options.secondary ? ' secondary' : ''}${options.danger ? ' danger' : ''}`,
    text: label,
    type: options.type || 'button',
    disabled: options.disabled,
    dataset: { action },
  });
}

function field(label, control, { className = '', help = '' } = {}) {
  const id = control.id || `field-${Math.random().toString(36).slice(2)}`;
  control.id = id;
  return element('label', { className: `field ${className}`.trim(), htmlFor: id }, [
    element('span', { className: 'field-label', text: label }),
    control,
    help ? element('small', { className: 'field-help', text: help }) : null,
  ]);
}

const shortHash = (value) => typeof value === 'string' && value.length > 14
  ? `${value.slice(0, 8)}…${value.slice(-5)}` : value || '—';
const correctionChangeKey = (item) => `${item.entityType}\u0000${item.entityId}\u0000${item.operation}`;

async function sha256Bytes(bytes) {
  if (!(bytes instanceof ArrayBuffer) || !globalThis.crypto?.subtle) {
    throw new Error('Browser SHA-256 verification is unavailable.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function assertPngSignature(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const view = new Uint8Array(bytes);
  if (view.length < signature.length || signature.some((value, index) => view[index] !== value)) {
    throw new Error('The private render artifact is not a PNG file.');
  }
}

async function decodePrivateImage(bytes, contentType) {
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', () => reject(new Error('The original upload cannot be decoded as a raster image in this browser.')), { once: true });
      image.src = url;
    });
    if (typeof image.decode === 'function') await image.decode();
    if (!Number.isInteger(image.naturalWidth) || image.naturalWidth <= 0
      || !Number.isInteger(image.naturalHeight) || image.naturalHeight <= 0) {
      throw new Error('The original upload has no intrinsic pixel dimensions.');
    }
    return { url, width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

const phaseRequiresCapability = Object.freeze({
  [WorkflowPhase.AWAITING_UPLOAD]: 'AI_ANALYSIS_ENABLED',
  [WorkflowPhase.ANALYSIS_PROCESSING]: 'AI_ANALYSIS_ENABLED',
  [WorkflowPhase.CALIBRATION_REVIEW]: 'GEOMETRY_REVIEW_ENABLED',
  [WorkflowPhase.TWO_D_REVIEW]: 'GEOMETRY_REVIEW_ENABLED',
  [WorkflowPhase.GEOMETRY_REVIEW]: 'GEOMETRY_REVIEW_ENABLED',
  [WorkflowPhase.DIMENSIONS_REVIEW]: 'GEOMETRY_REVIEW_ENABLED',
  [WorkflowPhase.GEOMETRY_APPROVED]: 'LIVE_3D_ENABLED',
  [WorkflowPhase.LAYOUT_PREPARATION]: 'LIVE_3D_ENABLED',
  [WorkflowPhase.LAYOUT_REVIEW]: 'LIVE_3D_ENABLED',
  [WorkflowPhase.LAYOUT_APPROVED]: 'LIVE_3D_ENABLED',
  [WorkflowPhase.MODEL_PROCESSING]: 'LIVE_3D_ENABLED',
  [WorkflowPhase.MODEL_REVIEW]: 'LIVE_3D_ENABLED',
  [WorkflowPhase.MODEL_APPROVED]: 'AI_RENDERING_ENABLED',
  [WorkflowPhase.RENDER_PROCESSING]: 'AI_RENDERING_ENABLED',
  [WorkflowPhase.RENDER_REVIEW]: 'AI_RENDERING_ENABLED',
  [WorkflowPhase.DESIGN_APPROVED]: 'AI_RENDERING_ENABLED',
});

export class ProjectJourneyApp {
  constructor() {
    this.config = journeyConfig();
    this.availability = serviceAvailability(this.config);
    this.workflow = null;
    this.state = null;
    this.phaseData = {};
    this.error = null;
    this.busy = false;
    this.objectUrls = [];
    this.editorContext = null;
    this.editorReady = false;
    this.pendingCorrection = null;
    this.editingVerticalProposal = false;
    this.previewEpoch = 0;
    this.previewReceipts = { model: null, render: null };
    this.workbench = $('#workbench');
    this.editorDialog = $('#editorDialog');
    this.editorFrame = $('#editorFrame');
    this.onWindowMessage = (event) => this.onEditorMessage(event);
    this.onPageHide = () => this.destroy();
    addEventListener('message', this.onWindowMessage);
    addEventListener('pagehide', this.onPageHide, { once: true });
    $('#editorClose').addEventListener('click', () => this.editorDialog.close());
    this.editorDialog.addEventListener('close', () => {
      if (this.editorContext?.source?.imageUrl) URL.revokeObjectURL(this.editorContext.source.imageUrl);
      this.editorReady = false;
      this.editorContext = null;
      this.editorFrame.removeAttribute('src');
    });
  }

  async boot() {
    if (!this.availability.live) {
      this.render();
      return;
    }
    this.workflow = createJourneyServiceWorkflow({ baseUrl: this.config.apiBaseUrl });
    try {
      this.config = applyServiceCapabilities(
        this.config,
        await this.workflow.api.capabilities(),
      );
      this.availability = serviceAvailability(this.config);
    } catch (error) {
      const disabledFlags = { ...this.config.flags };
      for (const capability of SERVICE_CAPABILITY_ORDER) disabledFlags[capability] = false;
      this.config = journeyConfig(undefined, {
        apiBaseUrl: this.config.apiBaseUrl,
        expectedServiceReleaseId: this.config.expectedServiceReleaseId,
        flags: disabledFlags,
      });
      this.availability = serviceAvailability(this.config);
      this.workflow = null;
      this.error = new Error(`Live service verification failed: ${error.message}`);
      this.render();
      return;
    }
    if (!this.availability.live) {
      this.workflow = null;
      this.render();
      return;
    }
    if (this.workflow.api.session?.projectId) {
      await this.execute(async () => this.setState(await this.workflow.resume()), { initial: true });
    } else {
      this.render();
    }
  }

  capabilityEnabled() {
    const capability = phaseRequiresCapability[this.state?.phase || WorkflowPhase.AWAITING_UPLOAD];
    return !capability || this.config.flags?.[capability] === true;
  }

  async execute(operation, { initial = false } = {}) {
    this.busy = true;
    this.error = null;
    if (!initial) this.render();
    try {
      await operation();
    } catch (error) {
      this.error = error;
      if (error instanceof WorkflowGuardError && error.details?.phase) this.state = error.details;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  async setState(state) {
    this.state = state;
    this.phaseData = {};
    await this.hydratePhase();
  }

  async hydratePhase() {
    if (!this.state || !this.capabilityEnabled()) return;
    const phase = this.state.phase;
    if ([WorkflowPhase.CALIBRATION_REVIEW, WorkflowPhase.GEOMETRY_REVIEW, WorkflowPhase.DIMENSIONS_REVIEW, WorkflowPhase.GEOMETRY_APPROVED].includes(phase)) {
      const review = await this.workflow.api.geometry();
      this.phaseData.geometry = review;
      try {
        this.phaseData.geometryAudit = auditCanonicalGeometry(review.geometry, {
          projectId: this.state.projectId,
          geometrySha256: review.geometrySha256,
          approved2d: phase !== WorkflowPhase.GEOMETRY_REVIEW,
          approvedVertical: phase === WorkflowPhase.GEOMETRY_APPROVED,
        });
      } catch (error) {
        this.phaseData.geometryAuditError = error.message;
      }
    }
    if (phase === WorkflowPhase.GEOMETRY_APPROVED) {
      this.phaseData.designReferenceCatalog = validateDesignReferenceCatalog(
        await this.workflow.api.designReferences(),
      );
    }
    if (phase === WorkflowPhase.LAYOUT_PREPARATION) {
      this.phaseData.designBrief = await this.workflow.reviewDesignBrief();
    }
    if (phase === WorkflowPhase.LAYOUT_REVIEW) {
      const [layouts, geometry] = await Promise.all([
        this.workflow.reviewLayouts(),
        this.workflow.api.geometry(),
      ]);
      this.phaseData.layouts = layouts;
      this.phaseData.geometry = geometry;
    }
    if ([WorkflowPhase.MODEL_REVIEW, WorkflowPhase.MODEL_APPROVED].includes(phase)) {
      this.phaseData.model = phase === WorkflowPhase.MODEL_REVIEW
        ? await this.workflow.reviewModel() : await this.workflow.api.model();
    }
    if (phase === WorkflowPhase.RENDER_REVIEW) {
      this.phaseData.renders = await this.workflow.reviewRenders();
    }
  }

  render() {
    const view = presentWorkflow(this.config, this.state);
    this.renderHeader(view);
    this.renderRail(view);
    this.renderStage(view);
    this.renderEvidence(view);
    this.renderWorkspace(view);
  }

  renderHeader(view) {
    const badge = $('#runtimeBadge');
    badge.dataset.live = String(view.availability.live);
    badge.textContent = view.availability.live ? 'Service connected' : 'Concept site / service off';
    $('#projectRef').textContent = view.projectId ? `Project ${view.projectId}` : 'No project opened';
  }

  renderRail(view) {
    const rail = $('#workflowRail');
    rail.replaceChildren(...view.ledger.map((act) => {
      const stateLabel = {
        active: 'Current', complete: 'Complete', waiting: 'Waiting', locked: 'Not released',
      }[act.state];
      return element('li', { className: 'act', dataset: { state: act.state } }, [
        element('span', { className: 'act-number', text: act.number }),
        element('span', { className: 'act-copy' }, [
          element('strong', { text: act.label }),
          element('small', { text: act.short }),
          element('span', { className: 'act-state', text: stateLabel }),
        ]),
      ]);
    }));
    const ratio = view.progressTotal ? view.progressIndex / view.progressTotal : 0;
    $('#railProgress').style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  renderStage(view) {
    $('#stageEyebrow').textContent = view.presentation.eyebrow;
    $('#stageTitle').textContent = view.presentation.title;
    $('#stageCopy').textContent = view.presentation.copy;
    const active = view.ledger.find((act) => act.state === 'active');
    $('#workHead').dataset.index = active?.number || '01';
    const blockedByCapability = view.availability.live && !this.capabilityEnabled();
    const reason = blockedByCapability
      ? 'This stage is disabled by the public release configuration. Earlier access does not unlock downstream work.'
      : view.blockedReason || view.persistenceWarning;
    $('#blocker').dataset.visible = String(Boolean(reason));
    $('#blockerText').textContent = reason || '';
  }

  evidenceItem(label, value, tone = '') {
    return element('div', { className: 'evidence-item' }, [
      element('span', { className: 'evidence-label', text: label }),
      element('span', { className: 'evidence-value', text: value, dataset: tone ? { tone } : {} }),
    ]);
  }

  renderEvidence(view) {
    const project = view.project || this.state?.project || {};
    const geometry = this.phaseData.geometry;
    const items = [
      this.evidenceItem('Runtime', view.availability.live ? 'Authenticated project service' : 'Static concept only', view.availability.live ? 'good' : 'block'),
      this.evidenceItem('Service release', this.config.serviceVerification?.releaseId ? shortHash(this.config.serviceVerification.releaseId) : 'Not verified', this.config.serviceVerification?.releaseId ? 'good' : 'block'),
      this.evidenceItem('Server state', view.serverState || 'No live project', view.serverState ? 'good' : 'warn'),
      this.evidenceItem('Geometry revision', project.geometryVersion ? `v${project.geometryVersion} · ${shortHash(geometry?.geometrySha256)}` : 'Not created', project.geometryVersion ? 'good' : 'warn'),
      this.evidenceItem('Approved geometry', project.approvedGeometryVersion ? `v${project.approvedGeometryVersion}` : 'Not approved', project.approvedGeometryVersion ? 'good' : 'warn'),
      this.evidenceItem('Furniture layout', project.approvedLayoutVersion ? `v${project.approvedLayoutVersion} approved` : 'Not approved', project.approvedLayoutVersion ? 'good' : 'warn'),
      this.evidenceItem('3D model', project.approvedModelVersion ? `v${project.approvedModelVersion} approved` : 'Not approved', project.approvedModelVersion ? 'good' : 'warn'),
      this.evidenceItem('Render set', project.renderVersion ? `v${project.renderVersion}` : 'Not generated', project.renderVersion ? 'good' : 'warn'),
      this.evidenceItem('Quotation service', this.config.flags?.QUOTATION_ENABLED ? 'Released after design approval' : 'Not released on this site', this.config.flags?.QUOTATION_ENABLED ? 'good' : 'warn'),
      this.evidenceItem('As-built evidence', 'Required before real-life fidelity claims', 'block'),
    ];
    $('#evidenceList').replaceChildren(...items);
  }

  clearObjectUrls() {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls = [];
  }

  destroy() {
    this.clearObjectUrls();
    this.clearPendingCorrection();
    if (this.onWindowMessage) removeEventListener('message', this.onWindowMessage);
    if (this.onPageHide) removeEventListener('pagehide', this.onPageHide);
  }

  renderWorkspace(view) {
    this.previewEpoch += 1;
    this.clearObjectUrls();
    this.workbench.dataset.busy = String(this.busy);
    if (!view.availability.live) {
      this.renderOffline(view);
      this.renderError();
      return;
    }
    if (!this.capabilityEnabled()) {
      this.renderCapabilityLocked();
      return;
    }
    const phase = this.state?.phase || WorkflowPhase.AWAITING_UPLOAD;
    if (phase === WorkflowPhase.AWAITING_UPLOAD) this.renderUpload();
    else if ([WorkflowPhase.ANALYSIS_PROCESSING, WorkflowPhase.MODEL_PROCESSING, WorkflowPhase.RENDER_PROCESSING].includes(phase)) this.renderProcessing(phase);
    else if (phase === WorkflowPhase.CALIBRATION_REVIEW) this.renderCalibrationReview();
    else if (phase === WorkflowPhase.GEOMETRY_REVIEW) this.renderGeometryReview();
    else if (phase === WorkflowPhase.DIMENSIONS_REVIEW) this.renderDimensionsReview();
    else if (phase === WorkflowPhase.GEOMETRY_APPROVED) this.renderDesignBrief();
    else if (phase === WorkflowPhase.LAYOUT_PREPARATION) this.renderLayoutPreparation();
    else if (phase === WorkflowPhase.LAYOUT_REVIEW) this.renderLayoutReview();
    else if (phase === WorkflowPhase.LAYOUT_APPROVED) this.renderModelPreparation();
    else if (phase === WorkflowPhase.MODEL_REVIEW) this.renderModelReview();
    else if (phase === WorkflowPhase.MODEL_APPROVED) this.renderSceneReady();
    else if (phase === WorkflowPhase.RENDER_REVIEW) this.renderRenderReview();
    else if (phase === WorkflowPhase.DESIGN_APPROVED) this.renderDesignApproved();
    else this.renderStopped(view);
    this.renderError();
  }

  renderOffline(view) {
    const dossier = journeyReleaseDossier(this.config);
    const proof = element('section', {
      className: 'release-dossier',
      attrs: { 'aria-labelledby': 'releaseDossierTitle' },
    }, [
      element('header', { className: 'release-dossier-head' }, [
        element('div', {}, [
          element('span', { className: 'micro-label', text: 'Build / evidence / release' }),
          element('h4', { id: 'releaseDossierTitle', text: dossier.title }),
        ]),
        element('span', { className: 'release-dossier-count', text: '06 receipt gates' }),
      ]),
      element('p', { className: 'release-dossier-summary', text: dossier.summary }),
      element('ol', { className: 'release-dossier-list' }, dossier.stages.map((stage) => element('li', {
        className: 'release-dossier-step',
        dataset: { proof: stage.proofState, release: stage.publicState },
      }, [
        element('span', { className: 'release-step-number', text: stage.number }),
        element('div', { className: 'release-step-body' }, [
          element('div', { className: 'release-step-stamps' }, [
            element('span', { className: 'release-proof-status', text: stage.proofLabel }),
            element('span', { className: 'release-public-status', text: stage.publicLabel }),
          ]),
          element('h5', { text: stage.label }),
          element('p', { text: stage.summary }),
          element('div', { className: 'release-receipt' }, [
            element('span', { text: 'Receipt chain' }),
            element('code', { text: stage.receipt }),
          ]),
          element('p', { className: 'release-step-boundary', text: stage.boundary }),
        ]),
      ]))),
      element('p', { className: 'release-dossier-boundary', text: dossier.boundary, attrs: { role: 'note' } }),
      element('div', { className: 'release-dossier-actions' }, [
        element('a', { className: 'button', text: 'Inspect the verified synthetic reference', href: 'ReviewedReferences.html' }),
        element('a', { className: 'button secondary', text: 'Talk to a human designer', href: 'ContactUs.dc.html' }),
      ]),
    ]);
    const panel = element('div', { className: 'offline-panel release-status-panel' }, [
      element('div', { className: 'status-knot' }, element('span', { text: '!' })),
      element('h3', { className: 'panel-title', text: view.availability.title }),
      element('p', { className: 'panel-copy', text: view.availability.message }),
      proof,
    ]);
    this.workbench.replaceChildren(panel);
  }

  renderCapabilityLocked() {
    this.workbench.replaceChildren(element('div', { className: 'offline-panel' }, [
      element('div', { className: 'status-knot' }, element('span', { text: '×' })),
      element('h3', { className: 'panel-title', text: 'This service stage has not been released' }),
      element('p', { className: 'panel-copy', text: 'The project remains saved on the server. This browser will not imitate the missing capability or advance the approval chain locally.' }),
      element('div', { className: 'actions' }, element('a', { className: 'button secondary', text: 'Contact project support', href: 'ContactUs.dc.html' })),
    ]));
  }

  renderUpload() {
    const form = element('form', { className: 'section-panel', attrs: { novalidate: '' } });
    form.append(
      element('h3', { className: 'panel-title', text: this.state?.projectId ? 'Upload the plan for this saved project' : 'Create a private project' }),
      element('p', { className: 'panel-copy', text: 'Use a JPG or PNG plan you own or are authorised to submit. PDF is intentionally blocked here until the native-vector review has a customer approval route. Uploading does not grant permission for training use.' }),
    );
    const fileName = element('span', { text: 'JPG or PNG · PDF review is not released in this journey' });
    const fileInput = element('input', { type: 'file', name: 'floorPlan', attrs: { accept: 'image/png,image/jpeg,.jpg,.jpeg,.png', required: '' } });
    fileInput.addEventListener('change', () => { fileName.textContent = fileInput.files?.[0]?.name || 'No plan selected'; });
    const drop = element('label', { className: 'file-drop' }, [
      fileInput,
      element('span', {}, [element('strong', { text: 'Place the floor plan here' }), fileName]),
    ]);
    for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, () => { drop.dataset.over = 'true'; });
    for (const type of ['dragleave', 'drop']) drop.addEventListener(type, () => { drop.dataset.over = 'false'; });

    const property = element('select', { name: 'propertyType' }, [
      element('option', { value: 'hdb', text: 'HDB flat' }),
      element('option', { value: 'ec', text: 'Executive condominium' }),
      element('option', { value: 'condo', text: 'Private condominium' }),
      element('option', { value: 'landed', text: 'Landed home' }),
    ]);
    const postal = element('input', { name: 'postalCode', attrs: { inputmode: 'numeric', maxlength: '6', pattern: '\\d{6}', placeholder: '560123' } });
    const levels = element('input', { name: 'levels', value: '1', attrs: { type: 'number', min: '1', max: '10', step: '1' } });
    const ownership = element('input', { type: 'checkbox', name: 'ownership', attrs: { required: '' } });
    const grid = element('div', { className: 'form-grid' }, [
      drop,
      field('Property type', property, { className: 'third' }),
      field('Postal code (optional)', postal, { className: 'third', help: 'Six digits only; address verification remains separate.' }),
      field('Levels', levels, { className: 'third' }),
    ]);
    form.append(grid, element('label', { className: 'consent' }, [
      ownership,
      element('span', { text: 'I own this plan or have authority to submit it for this project. I understand it remains a private project input and is not automatically added to a training corpus.' }),
    ]), element('div', { className: 'actions' }, button(this.state?.projectId ? 'Upload & analyse plan' : 'Create project & analyse plan', 'start', { type: 'submit', disabled: this.busy })));
    form.addEventListener('submit', (event) => this.startProject(event, form));
    this.workbench.replaceChildren(form);
  }

  async startProject(event, form) {
    event.preventDefault();
    const data = new FormData(form);
    const file = data.get('floorPlan');
    if (!(file instanceof File) || !file.name) {
      this.error = new Error('Choose a named floor-plan file first.'); this.render(); return;
    }
    if (!/\.(?:jpe?g|png)$/i.test(file.name) || !['image/jpeg', 'image/png'].includes(file.type)) {
      this.error = new Error('This customer journey currently accepts JPG and PNG only. PDF native-vector review cannot yet be approved here.'); this.render(); return;
    }
    if (data.get('ownership') !== 'on') {
      this.error = new Error('Confirm that you are authorised to submit this plan.'); this.render(); return;
    }
    const postal = String(data.get('postalCode') || '').trim();
    if (postal && !/^\d{6}$/.test(postal)) {
      this.error = new Error('Postal code must contain six digits.'); this.render(); return;
    }
    await this.execute(async () => {
      const onProgress = (job) => {
        const target = $('#jobProgressText');
        if (target) target.textContent = `${job.stage || 'analysis'} · ${job.progressPercentage || 0}%`;
      };
      let next;
      if (this.workflow.api.session?.projectId) {
        next = await this.workflow.uploadFloorPlan(file);
        this.state = next;
        this.render();
        next = await this.workflow.waitForActiveJob({ onProgress });
      } else {
        try {
          next = await this.workflow.start({
            file,
            propertyType: String(data.get('propertyType')),
            postalCode: postal || null,
            levels: Number(data.get('levels')),
            onProgress,
          });
        } catch (error) {
          // Project creation and job enqueue may already be durable when polling times out. Recover
          // that exact server job so the page offers Continue instead of looking like a new draft.
          if (this.workflow.api.session?.projectId) await this.setState(await this.workflow.resume());
          throw error;
        }
      }
      await this.setState(next);
    });
  }

  renderProcessing(phase) {
    const labels = {
      [WorkflowPhase.ANALYSIS_PROCESSING]: ['Reading the plan evidence', 'analysis'],
      [WorkflowPhase.MODEL_PROCESSING]: ['Compiling approved 3D geometry', 'model'],
      [WorkflowPhase.RENDER_PROCESSING]: ['Rendering the approved camera', 'render'],
    }[phase];
    const panel = element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: labels[0] }),
      element('p', { className: 'panel-copy', text: 'Jobs are durable and resumable. Closing this page does not approve or replace any evidence.' }),
      element('div', { className: 'processing-line', attrs: { 'aria-hidden': 'true' } }, element('span')),
      element('p', { className: 'micro-label', id: 'jobProgressText', text: `${labels[1]} · saved on service` }),
      element('div', { className: 'actions' }, button('Continue this job', 'poll-job', { disabled: this.busy || !this.state?.activeJob })),
    ]);
    panel.querySelector('[data-action="poll-job"]').addEventListener('click', () => this.pollActiveJob());
    this.workbench.replaceChildren(panel);
  }

  async pollActiveJob() {
    await this.execute(async () => {
      const next = await this.workflow.waitForActiveJob({
        onProgress: (job) => {
          const target = $('#jobProgressText');
          if (target) target.textContent = `${job.stage || job.status} · ${job.progressPercentage || 0}%`;
        },
      });
      await this.setState(next);
    });
  }

  renderCalibrationReview() {
    const review = this.phaseData.geometry;
    if (!review?.geometry) { this.renderStopped({ blockedReason: 'The uncalibrated geometry revision is unavailable.' }); return; }
    const form = element('form', { className: 'section-panel' });
    const wall = element('select', { name: 'wallId' }, (review.geometry.walls || []).map((item) => element('option', { value: item.id, text: item.id })));
    const measured = element('input', { name: 'measuredLength', attrs: { type: 'number', min: '100', max: '100000', step: '1', placeholder: 'Measured millimetres', required: '' } });
    const evidence = element('textarea', { name: 'evidence', attrs: { minlength: '3', maxlength: '1000', placeholder: 'Where this known length came from', required: '' } });
    form.append(
      element('h3', { className: 'panel-title', text: 'Anchor the proposal to one known real dimension' }),
      element('p', { className: 'panel-copy', text: 'Choose a clearly identifiable wall and enter its independently measured length. The service rescales this exact revision and records the evidence; it still returns to full geometry review.' }),
      element('div', { className: 'form-grid' }, [
        field('Reference wall', wall, { className: 'full' }),
        field('Known wall length (mm)', measured, { className: 'full' }),
        field('Measurement evidence', evidence, { className: 'full' }),
      ]),
      element('div', { className: 'actions' }, button('Calibrate and return to review', 'calibrate', { type: 'submit', disabled: this.busy })),
    );
    form.addEventListener('submit', (event) => this.calibrateGeometry(event, form));
    this.workbench.replaceChildren(form);
  }

  async calibrateGeometry(event, form) {
    event.preventDefault();
    const data = new FormData(form);
    const review = this.phaseData.geometry;
    await this.execute(async () => {
      await this.setState(await this.workflow.calibrateGeometry({
        referenceWallId: String(data.get('wallId')),
        measuredLengthMm: Number(data.get('measuredLength')),
        evidenceNote: String(data.get('evidence') || ''),
      }));
    });
  }

  metric(value, label) {
    return element('div', { className: 'metric' }, [element('strong', { text: String(value) }), element('span', { text: label })]);
  }

  renderGeometryReview() {
    const review = this.phaseData.geometry;
    if (!review?.geometry) {
      this.renderStopped({ blockedReason: 'The service did not return the current geometry revision.' }); return;
    }
    if (this.pendingCorrection) {
      this.renderCorrectionEvidence();
      return;
    }
    const geometry = review.geometry;
    const validation = review.validation || {};
    const issues = Array.isArray(validation.issues) ? validation.issues : [];
    let sourceRegistrationError = null;
    try {
      geometryCorrectionSourceBinding(review);
    } catch (error) {
      sourceRegistrationError = error.message;
    }
    const sourceRegistered = sourceRegistrationError === null;
    const serverReady = validation.valid === true && issues.length === 0
      && geometry.scale_status === 'customer_confirmed' && sourceRegistered;
    const confirmation = element('input', { type: 'checkbox', id: 'confirmGeometry' });
    const approve = button('Approve exact 2D revision', 'approve-geometry', { disabled: !serverReady || this.busy });
    approve.addEventListener('click', () => this.approveGeometry(confirmation));
    const correct = button('Open source-aligned correction desk', 'open-editor', {
      secondary: true,
      disabled: this.busy || !sourceRegistered,
    });
    correct.addEventListener('click', () => this.openEditor());
    const panel = element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: 'Read the proposal like a survey drawing' }),
      element('p', { className: 'panel-copy', text: 'Red or listed items must be corrected. The browser preflight is advisory; the service validation and immutable revision remain authoritative.' }),
      element('div', { className: 'metric-grid' }, [
        this.metric((geometry.walls || []).length, 'wall segments'),
        this.metric((geometry.openings || []).filter((item) => item.kind === 'door').length, 'doors'),
        this.metric((geometry.openings || []).filter((item) => item.kind === 'window').length, 'windows'),
        this.metric((geometry.rooms || []).length, 'closed rooms'),
      ]),
      this.createPlanSheet(geometry),
      element('ul', { className: 'issue-list' }, (issues.length || sourceRegistrationError)
        ? [
          ...issues.slice(0, 20).map((issue) => element('li', { className: 'issue-item', dataset: { kind: 'block' } }, [
          element('span', { text: '×' }),
          element('span', {}, [element('b', { text: issue.code || 'Geometry blocker' }), element('span', { text: issue.message || issue.note || 'Review required.' })]),
          ])),
          sourceRegistrationError ? element('li', { className: 'issue-item', dataset: { kind: 'block' } }, [
            element('span', { text: '×' }),
            element('span', {}, [
              element('b', { text: 'Source registration unavailable' }),
              element('span', { text: `${sourceRegistrationError} 2D approval and correction stay locked.` }),
            ]),
          ]) : null,
        ]
        : element('li', { className: 'issue-item', dataset: { kind: serverReady ? 'pass' : 'block' } }, [
          element('span', { text: serverReady ? '✓' : '!' }),
          element('span', {}, [
            element('b', { text: serverReady ? 'Service geometry gate clear' : 'Scale still unconfirmed' }),
            element('span', { text: serverReady ? 'No current wall, room or opening issue is reported.' : 'Complete metric calibration before approval.' }),
          ]),
        ])),
      element('div', { className: 'actions' }, [correct, approve]),
      element('label', { className: 'consent' }, [
        confirmation,
        element('span', { text: 'I reviewed this exact revision and confirm its metric scale, walls, closed rooms, doors, windows and opening hosts. Vertical/site measurements follow separately.' }),
      ]),
    ]);
    this.workbench.replaceChildren(panel);
  }

  createPlanSheet(geometry) {
    const wrapper = element('div', { className: 'plan-sheet' });
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Current proposed wall, door, window and room geometry');
    const walls = geometry.walls || [];
    const points = walls.flatMap((wall) => [wall.start || wall.a, wall.end || wall.b]).map((p) => Array.isArray(p) ? p : [p?.x, p?.y]);
    const finite = points.filter((p) => p.every(Number.isFinite));
    const minX = Math.min(...finite.map((p) => p[0])); const maxX = Math.max(...finite.map((p) => p[0]));
    const minY = Math.min(...finite.map((p) => p[1])); const maxY = Math.max(...finite.map((p) => p[1]));
    const pad = Math.max(500, Math.max(maxX - minX, maxY - minY) * 0.08);
    svg.setAttribute('viewBox', finite.length ? `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}` : '0 0 1000 1000');
    const wallById = new Map();
    for (const wall of walls) {
      const start = Array.isArray(wall.start || wall.a) ? (wall.start || wall.a) : [(wall.start || wall.a)?.x, (wall.start || wall.a)?.y];
      const end = Array.isArray(wall.end || wall.b) ? (wall.end || wall.b) : [(wall.end || wall.b)?.x, (wall.end || wall.b)?.y];
      wallById.set(wall.id, { start, end });
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', start[0]); line.setAttribute('y1', start[1]);
      line.setAttribute('x2', end[0]); line.setAttribute('y2', end[1]);
      line.setAttribute('stroke', '#172124'); line.setAttribute('stroke-width', Math.max(80, Number(wall.thickness) || 120));
      line.setAttribute('stroke-linecap', 'square');
      svg.append(line);
    }
    for (const opening of geometry.openings || []) {
      const wall = wallById.get(opening.wall_id || opening.wall);
      if (!wall) continue;
      const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
      const t0 = Number.isFinite(opening.offset) ? opening.offset / length : Number(opening.t0);
      const t1 = Number.isFinite(opening.width) ? (opening.offset + opening.width) / length : Number(opening.t1);
      if (![t0, t1].every(Number.isFinite)) continue;
      const p = (t) => [wall.start[0] + (wall.end[0] - wall.start[0]) * t, wall.start[1] + (wall.end[1] - wall.start[1]) * t];
      const a = p(t0); const b = p(t1);
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', a[0]); line.setAttribute('y1', a[1]);
      line.setAttribute('x2', b[0]); line.setAttribute('y2', b[1]);
      line.setAttribute('stroke', opening.kind === 'window' ? '#4f7780' : '#c65d3b');
      line.setAttribute('stroke-width', '180'); line.setAttribute('stroke-linecap', 'round');
      svg.append(line);
    }
    for (const room of geometry.rooms || []) {
      const boundary = room.boundary || [];
      if (!boundary.length) continue;
      const converted = boundary.map((p) => Array.isArray(p) ? p : [p.x, p.y]);
      const x = converted.reduce((sum, p) => sum + p[0], 0) / converted.length;
      const y = converted.reduce((sum, p) => sum + p[1], 0) / converted.length;
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', x); text.setAttribute('y', y); text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '250'); text.setAttribute('fill', '#4e5b59');
      text.textContent = room.name || room.id;
      svg.append(text);
    }
    wrapper.append(svg, element('span', { className: 'plan-sheet-note', text: 'Proposal overlay · teal windows · orange doors' }));
    return wrapper;
  }

  async approveGeometry(checkbox) {
    if (!checkbox.checked) { this.error = new Error('Explicitly confirm the exact 2D revision first.'); this.render(); return; }
    const review = this.phaseData.geometry;
    try {
      const source = geometryCorrectionSourceBinding(review);
      // Web Crypto is intentionally awaited at the approval boundary; a well-shaped
      // but stale affine payload must never reach the mutating service call.
      await verifyPixelMetricRegistrationIntegrity(source.pixelMetricRegistration);
    } catch (error) {
      this.error = new Error(`2D approval remains locked: ${error.message}`);
      this.render();
      return;
    }
    await this.execute(async () => this.setState(await this.workflow.approveGeometry2d({
      geometryVersion: review.geometryVersion,
      geometrySha256: review.geometrySha256,
      reviewerActorId: `customer:${this.state.projectId}`,
      confirmMetricScale: true,
      confirmWallsRoomsOpenings: true,
    })));
  }

  async verifiedCorrectionSource(review) {
    const source = geometryCorrectionSourceBinding(review);
    // Keep hashing asynchronous and explicit before any private image URL enters the editor.
    await verifyPixelMetricRegistrationIntegrity(source.pixelMetricRegistration);
    const browserEvidenceLimit = 25 * 1024 * 1024;
    if (source.byteSize > browserEvidenceLimit) {
      throw new Error('The original upload exceeds the browser correction-evidence limit. Correction stays locked.');
    }
    const artifact = await this.workflow.api.artifactPayload(
      source.sourceArtifactRole,
      [source.mediaType],
      browserEvidenceLimit,
    );
    if (artifact.bytes.byteLength !== source.byteSize) {
      throw new Error('The downloaded original upload does not match the server-bound byte size. Correction stays locked.');
    }
    const downloadedSha256 = await sha256Bytes(artifact.bytes);
    if (downloadedSha256 !== source.sourceArtifactSha256) {
      throw new Error('The downloaded original upload does not match the server-bound SHA-256. Correction stays locked.');
    }
    const decoded = await decodePrivateImage(artifact.bytes, artifact.contentType);
    if (decoded.width !== source.intrinsicPixels.width
      || decoded.height !== source.intrinsicPixels.height) {
      URL.revokeObjectURL(decoded.url);
      throw new Error('The decoded original upload dimensions do not match the server binding. Correction stays locked.');
    }
    return {
      binding: source,
      bytes: artifact.bytes,
      contentType: artifact.contentType,
      imageUrl: decoded.url,
      imageWidth: decoded.width,
      imageHeight: decoded.height,
    };
  }

  async openEditor() {
    const audit = this.phaseData.geometryAudit;
    if (!audit?.project) { this.error = new Error(this.phaseData.geometryAuditError || 'The current revision could not be opened safely.'); this.render(); return; }
    await this.execute(async () => {
      const source = await this.verifiedCorrectionSource(this.phaseData.geometry);
      this.editorContext = { review: this.phaseData.geometry, project: audit.project, source };
      this.editorReady = false;
      this.editorFrame.src = 'editor.html?mode=service';
      this.editorDialog.showModal();
    });
  }

  onEditorMessage(event) {
    if (event.origin !== location.origin || event.source !== this.editorFrame.contentWindow) return;
    if (event.data?.type === 'hnm:editor-ready' && this.editorContext) {
      this.editorReady = true;
      this.editorFrame.contentWindow.postMessage({
        type: 'hnm:editor-load-project',
        project: this.editorContext.project,
        sourceUnderlay: {
          imageUrl: this.editorContext.source.imageUrl,
          sourceArtifactSha256: this.editorContext.source.binding.sourceArtifactSha256,
          intrinsicPixels: this.editorContext.source.binding.intrinsicPixels,
          geometrySha256: this.editorContext.review.geometrySha256,
          registration: this.editorContext.source.binding.pixelMetricRegistration,
        },
      }, location.origin);
    }
    if (event.data?.type === 'hnm:editor-load-error' && this.editorContext) {
      this.error = new Error(`The correction editor stayed locked: ${event.data.message || 'source registration could not be loaded.'}`);
      this.editorDialog.close();
      this.render();
    }
    if (event.data?.type === 'hnm:editor-submit-project' && this.editorContext) {
      this.submitEditorProject(event.data.project);
    }
  }

  async submitEditorProject(project) {
    const context = this.editorContext;
    this.editorDialog.close();
    await this.execute(async () => {
      const corrected = projectToCanonicalGeometry(project, context.review.geometry);
      const changes = canonicalGeometryChanges(context.review.geometry, corrected);
      if (!changes.length) throw new Error('The correction desk submitted no canonical wall, opening or room change.');
      const source = geometryCorrectionSourceBinding(context.review);
      await verifyPixelMetricRegistrationIntegrity(source.pixelMetricRegistration);
      const downloadedSha256 = await sha256Bytes(context.source.bytes);
      if (downloadedSha256 !== source.sourceArtifactSha256) {
        throw new Error('The in-memory original upload no longer matches its immutable SHA-256. Correction stays locked.');
      }
      const evidenceImageUrl = URL.createObjectURL(new Blob(
        [context.source.bytes],
        { type: context.source.contentType },
      ));
      this.clearPendingCorrection();
      this.pendingCorrection = {
        sourceGeometryVersion: context.review.geometryVersion,
        sourceGeometrySha256: context.review.geometrySha256,
        source,
        corrected,
        changes,
        imageUrl: evidenceImageUrl,
        imageWidth: context.source.imageWidth,
        imageHeight: context.source.imageHeight,
        boxes: new Map(),
        notes: new Map(changes.map((change) => [correctionChangeKey(change), ''])),
        mode: 'bounded_edit',
        reason: 'Customer corrected wall, room or opening geometry against the verified original upload.',
        evidenceNote: '',
        acknowledgeApprovalReset: false,
      };
    });
  }

  clearPendingCorrection() {
    const url = this.pendingCorrection?.imageUrl;
    if (url) URL.revokeObjectURL(url);
    this.pendingCorrection = null;
  }

  correctionEvidencePayload() {
    const pending = this.pendingCorrection;
    if (!pending) return null;
    return {
      sourceArtifactRole: pending.source.sourceArtifactRole,
      sourceArtifactSha256: pending.source.sourceArtifactSha256,
      evidenceNote: pending.evidenceNote.trim(),
      witnesses: pending.changes.map((change) => ({
        ...change,
        pixelBounds: pending.boxes.get(correctionChangeKey(change)) || null,
        note: (pending.notes.get(correctionChangeKey(change)) || '').trim(),
      })),
    };
  }

  renderCorrectionEvidence() {
    const pending = this.pendingCorrection;
    if (!pending) return;
    let activeKey = correctionChangeKey(pending.changes[0]);
    const sourceImage = element('img', {
      attrs: {
        src: pending.imageUrl,
        alt: 'Exact verified original floor-plan upload for correction evidence',
        draggable: 'false',
      },
    });
    const overlay = document.createElementNS(SVG_NS, 'svg');
    overlay.setAttribute('viewBox', `0 0 ${pending.imageWidth} ${pending.imageHeight}`);
    overlay.setAttribute('role', 'img');
    overlay.setAttribute('aria-label', 'Draw one source-image evidence box for the selected canonical change');
    overlay.setAttribute('tabindex', '0');
    const sourceStage = element('div', { className: 'correction-source-stage' }, [sourceImage, overlay]);
    const statuses = new Map();
    const markButtons = new Map();
    const noteInputs = new Map();
    const mode = element('select', { name: 'correctionMode' }, [
      element('option', { value: 'bounded_edit', text: 'Bounded edit — preserve source envelope and calibration' }),
      element('option', { value: 'major_retrace', text: 'Major retrace — reset approvals and metric calibration' }),
    ]);
    mode.value = pending.mode;
    const reason = element('textarea', {
      name: 'correctionReason',
      value: pending.reason,
      attrs: { minlength: '3', maxlength: '1000', required: '', rows: '3' },
    });
    const evidenceNote = element('textarea', {
      name: 'correctionEvidenceNote',
      value: pending.evidenceNote,
      attrs: {
        minlength: '3', maxlength: '2000', required: '', rows: '3',
        placeholder: 'Describe how the marked regions support these exact changes.',
      },
    });
    const acknowledge = element('input', { type: 'checkbox', checked: pending.acknowledgeApprovalReset });
    const acknowledgeLabel = element('label', { className: 'consent correction-reset' }, [
      acknowledge,
      element('span', { text: 'I understand major retrace resets every geometry and downstream approval, marks scale unvalidated, and requires recalibration.' }),
    ]);
    const submit = button('Submit evidence-bound correction', 'submit-correction', { type: 'submit', disabled: true });
    const cancel = button('Discard these edits', 'cancel-correction', { secondary: true });
    const blocker = element('p', { className: 'error-note correction-blocker', text: 'Every canonical change needs its own confirmed source-image box and note.' });

    const redraw = () => {
      overlay.replaceChildren(...pending.changes.flatMap((change, index) => {
        const changeId = correctionChangeKey(change);
        const bounds = pending.boxes.get(changeId);
        if (!bounds) return [];
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', bounds.xMin); rect.setAttribute('y', bounds.yMin);
        rect.setAttribute('width', bounds.xMax - bounds.xMin); rect.setAttribute('height', bounds.yMax - bounds.yMin);
        rect.setAttribute('class', `correction-box${changeId === activeKey ? ' active' : ''}`);
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', bounds.xMin + 5); label.setAttribute('y', Math.max(14, bounds.yMin + 16));
        label.setAttribute('class', 'correction-box-label'); label.textContent = String(index + 1);
        return [rect, label];
      }));
      for (const change of pending.changes) {
        const changeId = correctionChangeKey(change);
        const bounds = pending.boxes.get(changeId);
        const status = statuses.get(changeId);
        if (status) status.textContent = bounds
          ? `${bounds.xMin},${bounds.yMin} → ${bounds.xMax},${bounds.yMax} px`
          : 'No source-image box yet';
        const mark = markButtons.get(changeId);
        if (mark) mark.dataset.active = String(changeId === activeKey);
      }
    };

    const witnessRows = pending.changes.map((change, index) => {
      const changeId = correctionChangeKey(change);
      const mark = button(`Mark change ${index + 1}`, `mark-${index + 1}`, { secondary: true });
      const status = element('span', { className: 'correction-box-status', text: 'No source-image box yet' });
      const note = element('input', {
        value: pending.notes.get(changeId) || '',
        attrs: { type: 'text', minlength: '3', maxlength: '1000', placeholder: 'What in this marked region proves the change?' },
      });
      markButtons.set(changeId, mark); statuses.set(changeId, status); noteInputs.set(changeId, note);
      mark.addEventListener('click', () => { activeKey = changeId; redraw(); sourceStage.scrollIntoView({ block: 'nearest' }); });
      note.addEventListener('input', () => { pending.notes.set(changeId, note.value); sync(); });
      return element('article', { className: 'correction-change' }, [
        element('header', {}, [
          element('strong', { text: `${index + 1}. ${change.operation} ${change.entityType}` }),
          element('code', { text: change.entityId }),
        ]),
        element('div', { className: 'correction-change-actions' }, [mark, status]),
        field('Witness note', note, { help: 'Describe visible evidence inside this exact box; do not infer from the generated geometry.' }),
      ]);
    });

    let dragStart = null;
    const intrinsicPoint = (event) => {
      const bounds = overlay.getBoundingClientRect();
      const x = Math.round(((event.clientX - bounds.left) / bounds.width) * pending.imageWidth);
      const y = Math.round(((event.clientY - bounds.top) / bounds.height) * pending.imageHeight);
      return [Math.max(0, Math.min(pending.imageWidth, x)), Math.max(0, Math.min(pending.imageHeight, y))];
    };
    overlay.addEventListener('pointerdown', (event) => {
      if (pending.mode !== 'bounded_edit' || !activeKey) return;
      event.preventDefault();
      overlay.setPointerCapture(event.pointerId);
      dragStart = intrinsicPoint(event);
      pending.boxes.delete(activeKey);
      redraw(); sync();
    });
    overlay.addEventListener('pointermove', (event) => {
      if (!dragStart || pending.mode !== 'bounded_edit') return;
      const point = intrinsicPoint(event);
      pending.boxes.set(activeKey, {
        xMin: Math.min(dragStart[0], point[0]), yMin: Math.min(dragStart[1], point[1]),
        xMax: Math.max(dragStart[0], point[0]), yMax: Math.max(dragStart[1], point[1]),
      });
      redraw();
    });
    const finishDrag = (event) => {
      if (!dragStart) return;
      const bounds = pending.boxes.get(activeKey);
      if (!bounds || bounds.xMax <= bounds.xMin || bounds.yMax <= bounds.yMin) pending.boxes.delete(activeKey);
      dragStart = null;
      if (overlay.hasPointerCapture(event.pointerId)) overlay.releasePointerCapture(event.pointerId);
      redraw(); sync();
    };
    overlay.addEventListener('pointerup', finishDrag);
    overlay.addEventListener('pointercancel', finishDrag);

    const witnessSection = element('div', { className: 'correction-witness-grid' }, witnessRows);
    const sync = () => {
      pending.mode = mode.value;
      pending.reason = reason.value;
      pending.evidenceNote = evidenceNote.value;
      pending.acknowledgeApprovalReset = acknowledge.checked;
      const bounded = pending.mode === 'bounded_edit';
      witnessSection.hidden = !bounded;
      sourceStage.dataset.disabled = String(!bounded);
      evidenceNote.closest('.field').hidden = !bounded;
      acknowledgeLabel.hidden = bounded;
      submit.textContent = bounded ? 'Submit evidence-bound correction' : 'Start major retrace and reset approvals';
      if (bounded) {
        const validation = validateCorrectionWitnesses({
          changes: pending.changes,
          evidence: this.correctionEvidencePayload(),
          imageWidth: pending.imageWidth,
          imageHeight: pending.imageHeight,
        });
        blocker.textContent = validation.ok ? 'Exact witness coverage is complete.' : validation.errors[0];
        blocker.dataset.ready = String(validation.ok);
        submit.disabled = this.busy || reason.value.trim().length < 3 || !validation.ok;
      } else {
        const ready = acknowledge.checked && reason.value.trim().length >= 3;
        blocker.textContent = ready
          ? 'Major retrace is explicitly acknowledged; metric scale will be reset.'
          : 'Major retrace requires explicit approval-reset acknowledgement.';
        blocker.dataset.ready = String(ready);
        submit.disabled = this.busy || !ready;
      }
    };

    mode.addEventListener('change', sync);
    reason.addEventListener('input', sync);
    evidenceNote.addEventListener('input', sync);
    acknowledge.addEventListener('change', sync);
    cancel.addEventListener('click', () => { this.clearPendingCorrection(); this.render(); });
    submit.addEventListener('click', (event) => { event.preventDefault(); this.submitCorrectionEvidence(); });

    const panel = element('div', { className: 'section-panel correction-evidence-panel' }, [
      element('h3', { className: 'panel-title', text: 'Bind every edit to the exact original drawing' }),
      element('p', { className: 'panel-copy', text: 'The source artifact was downloaded through the authenticated project route, SHA-256 verified, and decoded at its intrinsic pixel size. Select each canonical diff below and drag a real evidence box on the original upload. Submission remains locked until coverage is exact.' }),
      element('div', { className: 'review-summary' }, [
        this.evidenceItem('Original upload SHA-256', pending.source.sourceArtifactSha256, 'good'),
        this.evidenceItem('Intrinsic raster size', `${pending.imageWidth} × ${pending.imageHeight} px`, 'good'),
        this.evidenceItem('Canonical diff operations', String(pending.changes.length), 'good'),
      ]),
      field('Correction path', mode, { help: 'Use major retrace only when the unit envelope or too much source geometry must change.' }),
      field('Reason for this revision', reason),
      sourceStage,
      element('p', { className: 'plan-sheet-note', text: 'Select a change, then drag its evidence rectangle directly on this hash-verified original image.' }),
      witnessSection,
      field('Overall evidence note', evidenceNote),
      acknowledgeLabel,
      blocker,
      element('div', { className: 'actions' }, [submit, cancel]),
    ]);
    this.workbench.replaceChildren(panel);
    redraw(); sync();
  }

  async submitCorrectionEvidence() {
    const pending = this.pendingCorrection;
    if (!pending) return;
    const mode = pending.mode;
    let evidence = null;
    let geometry = pending.corrected;
    if (mode === 'bounded_edit') {
      evidence = this.correctionEvidencePayload();
      const validation = validateCorrectionWitnesses({
        changes: pending.changes, evidence,
        imageWidth: pending.imageWidth, imageHeight: pending.imageHeight,
      });
      if (!validation.ok) { this.error = new Error(validation.errors.join(' ')); this.render(); return; }
    } else {
      if (!pending.acknowledgeApprovalReset) { this.error = new Error('Major retrace requires explicit approval-reset acknowledgement.'); this.render(); return; }
      geometry = { ...structuredClone(pending.corrected), scale_status: 'unvalidated' };
    }
    const reason = pending.reason.trim();
    if (reason.length < 3 || reason.length > 1000) { this.error = new Error('Correction reason must contain 3–1000 characters.'); this.render(); return; }
    await this.execute(async () => {
      await this.workflow.api.correctGeometry(
        pending.sourceGeometryVersion,
        pending.sourceGeometrySha256,
        reason,
        geometry,
        {
          correctionMode: mode,
          acknowledgeApprovalReset: mode === 'major_retrace',
          evidence,
        },
      );
      this.clearPendingCorrection();
      await this.setState(await this.workflow.resume());
    });
  }

  renderDimensionsReview() {
    const review = this.phaseData.geometry;
    const saved = this.workflow.saved.verticalProposal;
    if (!review?.geometry) { this.renderStopped({ blockedReason: 'Current geometry is unavailable.' }); return; }
    if (saved && !this.editingVerticalProposal) {
      if (this.state?.blocked) { this.renderStopped({ blockedReason: this.state.blockedReason }); return; }
      if (!saved.review) { this.renderStopped({ blockedReason: 'The exact measured proposal fields are unavailable, so approval remains locked.' }); return; }
      const proposal = saved.review;
      const topology = saved.validation?.whole_unit_topology;
      const topologyReady = topology?.ready_for_whole_unit_3d === true;
      const topologyIssues = Array.isArray(topology?.issues) ? topology.issues : [];
      const sameIds = (left, right) => {
        if (left.length !== right.length) return false;
        const expected = [...left].sort(); const actual = [...right].sort();
        return expected.every((value, index) => value === actual[index]);
      };
      const currentWallIds = (review.geometry.walls || []).map((item) => item.id);
      const currentOpeningIds = (review.geometry.openings || []).map((item) => item.id);
      const proposedWallIds = proposal.wallDimensions.map((item) => item.wallId);
      const proposedOpeningIds = proposal.openingDimensions.map((item) => item.openingId);
      if (proposal.sourceGeometryVersion !== review.geometryVersion
        || proposal.sourceGeometrySha256 !== review.geometrySha256
        || !sameIds(currentWallIds, proposedWallIds)
        || !sameIds(currentOpeningIds, proposedOpeningIds)) {
        this.renderStopped({ blockedReason: 'The measured proposal no longer covers the exact current wall, door and window revision.' }); return;
      }
      const openingById = new Map((review.geometry.openings || []).map((item) => [item.id, item]));
      const wallRows = proposal.wallDimensions.map((item) => element('div', { className: 'review-row' }, [
        element('strong', { text: item.wallId }),
        element('span', { text: `${item.heightMm} mm high` }),
      ]));
      const openingRows = proposal.openingDimensions.map((item) => {
        const opening = openingById.get(item.openingId);
        return element('div', { className: 'review-row' }, [
          element('strong', { text: `${opening?.kind || 'opening'} · ${item.openingId}` }),
          element('span', { text: `${item.heightMm} mm high · ${item.sillMm} mm sill · ${item.sillMm + item.heightMm} mm head · ${item.swing} swing · ${item.reviewedUsage.replaceAll('_', ' ')}` }),
        ]);
      });
      const confirm = element('input', { type: 'checkbox' });
      const approve = button('Approve measured verticals', 'approve-dimensions', { disabled: true });
      const revise = button('Revise measurements or portal roles', 'revise-dimensions', { secondary: true });
      const correctGeometry = button('Correct walls, rooms or opening positions', 'correct-from-dimensions', { secondary: true });
      const sync = () => { approve.disabled = this.busy || !confirm.checked || !topologyReady; };
      confirm.addEventListener('change', sync);
      approve.addEventListener('click', () => this.approveDimensions(confirm));
      revise.addEventListener('click', () => { this.editingVerticalProposal = true; this.render(); });
      correctGeometry.addEventListener('click', () => this.openEditor());
      this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
        element('h3', { className: 'panel-title', text: 'The measured vertical proposal is ready' }),
        element('p', { className: 'panel-copy', text: `Proposal v${saved.version} is bound to geometry v${proposal.sourceGeometryVersion}. Review every recorded value below before approval.` }),
        element('div', { className: 'review-ledger' }, [
          element('div', { className: 'review-summary' }, [
            this.evidenceItem('Proposal SHA-256', saved.sha256, 'good'),
            this.evidenceItem('Source geometry SHA-256', proposal.sourceGeometrySha256, 'good'),
            this.evidenceItem('2D approval SHA-256', proposal.geometry2dApprovalSha256, 'good'),
            this.evidenceItem('Ceiling', `${proposal.ceilingHeightMm} mm`, 'good'),
            this.evidenceItem('Primary entrance', topology?.primary_entrance_id || 'Missing or not unique', topology?.primary_entrance_id ? 'good' : 'block'),
            this.evidenceItem('Rooms reachable', topology ? `${(topology.reachable_room_ids || []).length}/${(topology.required_room_ids || []).length}` : 'No topology evidence', topologyReady ? 'good' : 'block'),
          ]),
          element('section', { className: 'review-group' }, [
            element('h4', { text: `Walls · ${wallRows.length}` }),
            ...wallRows,
          ]),
          element('section', { className: 'review-group' }, [
            element('h4', { text: `Doors & windows · ${openingRows.length}` }),
            ...(openingRows.length ? openingRows : [element('p', { className: 'empty-review', text: 'This geometry revision contains no openings.' })]),
          ]),
          element('section', { className: 'review-group evidence-note' }, [
            element('h4', { text: 'Measurement evidence' }),
            element('p', { text: proposal.evidenceNote }),
            element('small', { text: proposal.requiresSiteVerification ? 'Professional site verification remains required.' : 'Site-verification flag missing.' }),
          ]),
          element('section', { className: 'review-group evidence-note' }, [
            element('h4', { text: topologyReady ? 'Whole-unit portal graph passed' : 'Whole-unit portal graph is blocked' }),
            element('p', { text: topologyReady
              ? 'Exactly one reviewed primary entrance reaches every canonical room through interior doors or passages.'
              : 'Approval stays locked. Revise each door/window role or return to geometry correction; secondary exterior doors cannot join disconnected room islands through outside.' }),
            ...(topologyIssues.length
              ? topologyIssues.map((issue) => element('div', { className: 'review-row' }, [
                element('strong', { text: issue.code || 'PORTAL_TOPOLOGY_BLOCKER' }),
                element('span', { text: issue.message || 'Portal review required.' }),
              ]))
              : []),
          ]),
        ]),
        element('label', { className: 'consent' }, [confirm, element('span', { text: 'I reviewed every wall, door and window height, sill, swing and portal role, including the unique entrance and complete room reachability.' })]),
        element('div', { className: 'actions' }, [revise, correctGeometry, approve]),
      ]));
      return;
    }
    const geometry = review.geometry;
    const savedReview = this.editingVerticalProposal ? saved?.review : null;
    const savedOpenings = new Map(
      (savedReview?.openingDimensions || []).map((item) => [item.openingId, item]),
    );
    const topologyBindings = new Map(
      (review.validation?.whole_unit_topology?.opening_side_bindings || [])
        .map((item) => [item.opening_id, item]),
    );
    const form = element('form', { className: 'section-panel' });
    const ceiling = element('input', {
      name: 'ceilingHeight', value: savedReview?.ceilingHeightMm || '',
      attrs: { type: 'number', min: '2000', max: '6000', step: '1', placeholder: 'Measured mm', required: '' },
    });
    const evidence = element('textarea', {
      name: 'evidence', value: savedReview?.evidenceNote || '',
      attrs: { minlength: '10', maxlength: '2000', placeholder: 'How and where were these dimensions measured?', required: '' },
    });
    const dimensionList = element('div', { className: 'dimension-list' });
    for (const opening of geometry.openings || []) {
      const savedOpening = savedOpenings.get(opening.id);
      const binding = topologyBindings.get(opening.id);
      const height = element('input', { name: `height:${opening.id}`, value: savedOpening?.heightMm ?? opening.height ?? '', attrs: { type: 'number', min: '100', max: '6000', step: '1', required: '' } });
      const sill = element('input', { name: `sill:${opening.id}`, value: savedOpening?.sillMm ?? opening.sill ?? '', attrs: { type: 'number', min: '0', max: '5000', step: '1', required: '' } });
      const swingValues = opening.kind === 'door'
        ? ['left', 'right', 'double', 'sliding']
        : ['none'];
      const proposedSwing = savedOpening?.swing || opening.swing;
      const knownSwing = swingValues.includes(proposedSwing) ? proposedSwing : '';
      const swing = element('select', { name: `swing:${opening.id}`, attrs: { required: '' } }, [
        element('option', { value: '', text: 'Choose measured swing', attrs: { disabled: '', ...(knownSwing ? {} : { selected: '' }) } }),
        ...swingValues.map((value) => element('option', { value, text: value, attrs: knownSwing === value ? { selected: '' } : {} })),
      ]);
      const usageOptions = opening.kind === 'door'
        ? (binding?.boundary_classification === 'exterior'
          ? [
            ['primary_entrance', 'Primary home entrance'],
            ['secondary_exterior_door', 'Secondary exterior door'],
          ]
          : binding?.boundary_classification === 'interior'
            ? [['interior_door', 'Interior door']]
            : [
              ['primary_entrance', 'Primary home entrance'],
              ['secondary_exterior_door', 'Secondary exterior door'],
              ['interior_door', 'Interior door'],
            ])
        : opening.kind === 'window'
          ? (binding?.boundary_classification === 'interior'
            ? [['interior_borrowed_light', 'Interior borrowed-light window']]
            : binding?.boundary_classification === 'exterior'
              ? [['exterior_window', 'Exterior window']]
              : [
                ['exterior_window', 'Exterior window'],
                ['interior_borrowed_light', 'Interior borrowed-light window'],
              ])
          : [['interior_passage', 'Interior clear passage']];
      const proposedUsage = savedOpening?.reviewedUsage
        || opening.reviewed_usage || opening.reviewedUsage || '';
      const knownUsage = usageOptions.some(([value]) => value === proposedUsage)
        ? proposedUsage : '';
      const usage = element('select', { name: `usage:${opening.id}`, attrs: { required: '' } }, [
        element('option', { value: '', text: 'Choose observed portal role', attrs: { disabled: '', ...(knownUsage ? {} : { selected: '' }) } }),
        ...usageOptions.map(([value, label]) => element('option', {
          value, text: label, attrs: knownUsage === value ? { selected: '' } : {},
        })),
      ]);
      const classification = binding?.boundary_classification || 'unresolved';
      dimensionList.append(element('div', { className: 'dimension-card' }, [
        element('strong', { text: `${opening.kind || 'opening'} · ${opening.id}` }),
        element('small', { text: `Derived wall-side evidence: ${classification.replaceAll('_', ' ')}` }),
        field('Height mm', height), field('Sill mm', sill), field('Swing', swing),
        field('Observed portal role', usage, { help: 'This is a reviewed fact. The service independently recomputes the two regions on either side of the hosted opening.' }),
      ]));
    }
    const confirmation = element('input', { type: 'checkbox', name: 'confirm', attrs: { required: '' } });
    form.append(
      element('h3', { className: 'panel-title', text: savedReview ? 'Revise measured verticals and portal roles' : 'Record the missing third dimension' }),
      element('p', { className: 'panel-copy', text: 'Plan drawings do not prove ceiling, sill, head height or entrance semantics. Enter observed integer millimetres and explicitly review every door, window and clear passage. The service derives connectivity from the geometry; it does not trust the selected label alone.' }),
      element('div', { className: 'form-grid' }, [
        field('Confirmed ceiling height', ceiling, { className: 'full' }),
        field('Measurement evidence', evidence, { className: 'full' }),
      ]),
      dimensionList,
      element('label', { className: 'consent' }, [confirmation, element('span', { text: 'These values and portal roles were checked against drawing/site evidence. I confirm metric scale and vertical dimensions and accept that professional site verification remains required.' })]),
      element('div', { className: 'actions' }, [
        ...(savedReview ? [button('Keep current proposal', 'cancel-revise-dimensions', { secondary: true })] : []),
        button(savedReview ? 'Replace measured proposal' : 'Create measured proposal', 'propose-dimensions', { type: 'submit', disabled: this.busy }),
      ]),
    );
    form.querySelector('[data-action="cancel-revise-dimensions"]')?.addEventListener('click', () => {
      this.editingVerticalProposal = false;
      this.render();
    });
    form.addEventListener('submit', (event) => this.proposeDimensions(event, form));
    this.workbench.replaceChildren(form);
  }

  async proposeDimensions(event, form) {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get('confirm') !== 'on') { this.error = new Error('Confirm the site evidence and vertical dimensions first.'); this.render(); return; }
    const ceilingHeightMm = Number(data.get('ceilingHeight'));
    const geometry = this.phaseData.geometry.geometry;
    const openingDimensions = (geometry.openings || []).map((opening) => ({
      openingId: opening.id,
      heightMm: Number(data.get(`height:${opening.id}`)),
      sillMm: Number(data.get(`sill:${opening.id}`)),
      swing: String(data.get(`swing:${opening.id}`)),
      reviewedUsage: String(data.get(`usage:${opening.id}`)),
    }));
    await this.execute(async () => {
      await this.workflow.proposeVerticalDimensions({
        reviewerActorId: `customer:${this.state.projectId}`,
        evidenceNote: String(data.get('evidence') || ''),
        ceilingHeightMm,
        wallDimensions: (geometry.walls || []).map((wall) => ({ wallId: wall.id, heightMm: ceilingHeightMm })),
        openingDimensions,
        confirmMetricScale: true,
        confirmVerticalDimensions: true,
        requiresSiteVerification: true,
      });
      this.editingVerticalProposal = false;
      await this.setState(await this.workflow.resume());
    });
  }

  async approveDimensions(checkbox) {
    if (!checkbox.checked) { this.error = new Error('Explicitly confirm the measured proposal first.'); this.render(); return; }
    const saved = this.workflow.saved.verticalProposal;
    await this.execute(async () => this.setState(await this.workflow.approveVerticalDimensions({
      proposalVersion: saved.version,
      proposalSha256: saved.sha256,
      reviewerActorId: `customer:${this.state.projectId}`,
      confirmVerticalDimensions: true,
    })));
  }

  renderDesignBrief() {
    const rooms = this.phaseData.geometry?.geometry?.rooms || [];
    const catalog = this.phaseData.designReferenceCatalog;
    if (!catalog?.references?.length) {
      this.renderStopped({ blockedReason: 'The rights-cleared design-reference catalog is unavailable. No static style fallback is allowed.' });
      return;
    }
    const form = element('form', { className: 'section-panel' });
    const members = element('input', { name: 'members', value: '2', attrs: { type: 'number', min: '1', max: '30', required: '' } });
    const budget = element('input', { name: 'budget', attrs: { type: 'number', min: '0', step: '1000', placeholder: 'Optional SGD' } });
    const reference = element('select', { name: 'designReference', attrs: { required: '' } },
      catalog.references.map((item) => element('option', {
        value: item.referenceId,
        text: `${item.label} · ${shortHash(item.referenceSha256)}`,
      })));
    const instructions = element('textarea', { name: 'instructions', attrs: { maxlength: '5000', placeholder: 'Storage, accessibility, existing furniture and daily routines.' } });
    const roomOptions = rooms.map((room) => {
      const input = element('input', { type: 'checkbox', name: 'room', value: room.id, checked: true });
      return element('label', { className: 'consent' }, [input, element('span', { text: `${room.name || room.id} · ${room.function || 'room'}` })]);
    });
    form.append(
      element('h3', { className: 'panel-title', text: 'Design for the household, not a stock image' }),
      element('p', { className: 'panel-copy', text: 'Choose a service-owned procedural material reference. Every palette has commercial/render rights evidence, millimetre-scale pattern dimensions and an immutable hash; external stock imagery is not used.' }),
      element('div', { className: 'form-grid' }, [
        field('Household members', members, { className: 'third' }),
        field('Rights-cleared design reference', reference, { className: 'third' }),
        field('Budget guide', budget, { className: 'third' }),
        field('Lifestyle and priorities', instructions, { className: 'full' }),
      ]),
      element('div', { className: 'dimension-list' }, roomOptions),
      element('div', { className: 'actions' }, button('Save versioned design brief', 'submit-brief', { type: 'submit', disabled: this.busy || rooms.length === 0 })),
    );
    form.addEventListener('submit', (event) => this.submitBrief(event, form));
    this.workbench.replaceChildren(form);
  }

  async submitBrief(event, form) {
    event.preventDefault();
    const data = new FormData(form);
    const roomIds = data.getAll('room').map(String);
    if (!roomIds.length) { this.error = new Error('Select at least one verified room.'); this.render(); return; }
    const selection = designReferenceSelection(
      this.phaseData.designReferenceCatalog,
      String(data.get('designReference')),
    );
    const budget = Number(data.get('budget'));
    await this.execute(async () => this.setState(await this.workflow.submitDesignBrief({
      householdMembers: Number(data.get('members')),
      roomsToRenovate: roomIds,
      ...selection,
      budgetSgd: Number.isFinite(budget) && budget > 0 ? budget : null,
      specialInstructions: String(data.get('instructions') || ''),
    })));
  }

  renderLayoutPreparation() {
    const designReference = this.phaseData.designBrief?.reference;
    if (!designReference) {
      this.renderStopped({ blockedReason: 'The selected design reference could not be recovered from the authenticated service.' });
      return;
    }
    const generate = button('Generate constraint-checked layouts', 'generate-layouts', { disabled: this.busy });
    generate.addEventListener('click', () => this.generateLayouts());
    this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: 'Furniture is a spatial test before it is a style choice' }),
      element('p', { className: 'panel-copy', text: `Recovered ${designReference.label} · ${shortHash(designReference.referenceSha256)}. The service tests placements against room boundaries, wall thickness, door swings and circulation. Unsafe options cannot be approved.` }),
      element('div', { className: 'actions' }, generate),
    ]));
  }

  async generateLayouts() {
    await this.execute(async () => {
      await this.workflow.generateLayouts();
      await this.setState(await this.workflow.resume());
    });
  }

  createLayoutDiagram(preview) {
    const { bounds } = preview;
    const pad = Math.max(400, Math.max(bounds.width, bounds.depth) * 0.055);
    const mapY = (value) => bounds.minY + bounds.maxY - value;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.width + pad * 2} ${bounds.depth + pad * 2}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Exact measured floor-plan projection of ${preview.placements.length} furniture placements for layout ${preview.layoutId}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const svgElement = (tag, attributes = {}, text = null) => {
      const node = document.createElementNS(SVG_NS, tag);
      for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
      if (text !== null) node.textContent = text;
      return node;
    };

    const roomLayer = svgElement('g', { class: 'layout-room-layer' });
    const span = Math.max(bounds.width, bounds.depth);
    const roomFontSize = Math.max(180, Math.min(320, span / 38));
    for (const room of preview.rooms) {
      const points = room.boundary.map((point) => `${point.x},${mapY(point.y)}`).join(' ');
      const polygon = svgElement('polygon', {
        points,
        class: 'layout-room-footprint',
        'data-room-function': room.function,
      });
      polygon.append(svgElement('title', {}, `${room.name} · ${room.function}`));
      roomLayer.append(polygon);
      const centreX = room.boundary.reduce((sum, point) => sum + point.x, 0) / room.boundary.length;
      const centreY = room.boundary.reduce((sum, point) => sum + point.y, 0) / room.boundary.length;
      roomLayer.append(svgElement('text', {
        x: centreX,
        y: mapY(centreY),
        class: 'layout-room-label',
        'font-size': roomFontSize,
        'text-anchor': 'middle',
      }, room.name));
    }
    svg.append(roomLayer);

    const wallLayer = svgElement('g', { class: 'layout-wall-layer' });
    for (const wall of preview.walls) {
      const line = svgElement('line', {
        x1: wall.start.x,
        y1: mapY(wall.start.y),
        x2: wall.end.x,
        y2: mapY(wall.end.y),
        class: 'layout-wall-line',
        'stroke-width': wall.thickness,
      });
      line.append(svgElement('title', {}, `${wall.id} · ${wall.kind} · ${wall.thickness} mm`));
      wallLayer.append(line);
    }
    svg.append(wallLayer);

    const openingLayer = svgElement('g', { class: 'layout-opening-layer' });
    for (const opening of preview.openings) {
      openingLayer.append(svgElement('line', {
        x1: opening.start.x,
        y1: mapY(opening.start.y),
        x2: opening.end.x,
        y2: mapY(opening.end.y),
        class: 'layout-opening-cut',
        'stroke-width': opening.thickness + 80,
      }));
      const marker = svgElement('line', {
        x1: opening.start.x,
        y1: mapY(opening.start.y),
        x2: opening.end.x,
        y2: mapY(opening.end.y),
        class: `layout-opening-marker ${opening.kind}`,
        'stroke-width': Math.min(120, Math.max(70, opening.thickness * 0.55)),
      });
      marker.append(svgElement('title', {}, `${opening.kind} ${opening.id} · operation ${opening.swing} · role ${opening.reviewedUsage} · hosted by ${opening.wallId}`));
      openingLayer.append(marker);
    }
    svg.append(openingLayer);

    const furnitureLayer = svgElement('g', { class: 'layout-furniture-layer' });
    for (const placement of preview.placements) {
      const assetLabel = placement.assetId.split('-')
        .filter((part) => part && !/^\d+$/.test(part))
        .slice(0, 3)
        .join(' ');
      const assetFontSize = Math.max(72, Math.min(
        span / 58,
        placement.depth * 0.26,
        placement.width / Math.max(3.5, assetLabel.length * 0.56),
      ));
      const group = svgElement('g', {
        class: 'layout-furniture-item',
        'data-room-id': placement.roomId,
      });
      const rect = svgElement('rect', {
        x: placement.x,
        y: mapY(placement.y + placement.depth),
        width: placement.width,
        height: placement.depth,
        rx: Math.min(90, placement.width * 0.05, placement.depth * 0.08),
      });
      rect.append(svgElement('title', {}, `${placement.assetId} · ${placement.width} × ${placement.depth} × ${placement.height} mm · ${placement.roomId}`));
      group.append(rect, svgElement('text', {
        x: placement.x + placement.width / 2,
        y: mapY(placement.y + placement.depth / 2),
        class: 'layout-furniture-label',
        'font-size': assetFontSize,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }, assetLabel));
      furnitureLayer.append(group);
    }
    svg.append(furnitureLayer);

    const legend = element('div', { className: 'layout-preview-legend' }, [
      element('span', { className: 'legend-key furniture', text: 'Measured furniture footprint' }),
      element('span', { className: 'legend-key door', text: 'Door / passage' }),
      element('span', { className: 'legend-key window', text: 'Window' }),
    ]);
    const readableOpeningValue = (value) => String(value).replaceAll('_', ' ');
    const openingReview = element('div', { className: 'layout-opening-review' }, [
      element('strong', { text: `Reviewed openings (${preview.openings.length})` }),
      element('div', { className: 'layout-opening-review-list' }, preview.openings.map((opening) => (
        element('span', { className: `layout-opening-review-row ${opening.kind}` }, [
          element('b', { text: `${opening.kind} ${opening.id}` }),
          element('small', {
            text: `Operation ${readableOpeningValue(opening.swing)} · role ${readableOpeningValue(opening.reviewedUsage)} · host ${opening.wallId}`,
          }),
        ])
      ))),
      element('small', {
        className: 'layout-opening-review-note',
        text: 'Operation labels are shown exactly. Hinge jamb and opens-into direction are not source-resolved, so this review does not invent swing arcs.',
      }),
    ]);
    return element('figure', { className: 'layout-review-preview' }, [
      element('div', { className: 'layout-preview-canvas' }, svg),
      element('figcaption', {}, [
        element('strong', { text: `Exact option ${preview.layoutId}` }),
        element('span', { text: `${preview.placements.length} measured footprints · geometry v${preview.source.geometryVersion} · ${shortHash(preview.source.geometrySha256)} · layout ${shortHash(preview.layoutSha256)}` }),
        element('small', { text: 'Review projection generated in this browser from service-returned millimetres. No customer image or external furniture media is loaded.' }),
      ]),
      legend,
      openingReview,
    ]);
  }

  renderLayoutReview() {
    const layouts = this.phaseData.layouts;
    if (!layouts) { this.renderStopped({ blockedReason: 'The exact layout option set is unavailable.' }); return; }
    if (this.state?.blocked) { this.renderStopped({ blockedReason: this.state.blockedReason }); return; }
    const options = layouts.options || [];
    const list = element('div', { className: 'option-list' });
    const detailsById = new Map();
    const previewById = new Map();
    const previewErrors = new Map();
    for (const option of options) {
      if (!layouts.safeLayoutIds.includes(option.layoutId)) continue;
      try {
        previewById.set(option.layoutId, buildLayoutReviewPreview({
          projectId: this.state.projectId,
          geometryReview: this.phaseData.geometry,
          layoutSet: layouts,
          layoutId: option.layoutId,
        }));
      } catch (error) {
        previewErrors.set(option.layoutId, error.message);
      }
    }
    for (const option of options) {
      const serviceSafe = layouts.safeLayoutIds.includes(option.layoutId);
      const preview = previewById.get(option.layoutId);
      const reviewable = serviceSafe && Boolean(preview);
      const input = element('input', { type: 'radio', name: 'layout', value: option.layoutId, disabled: !reviewable, checked: reviewable && !list.querySelector('input:checked') });
      const placements = Array.isArray(option.placements) ? option.placements : [];
      const detail = element('div', { className: 'option-evidence', dataset: { visible: input.checked } }, [
        element('div', { className: 'hash-strip' }, [
          element('span', { text: 'Layout SHA-256' }),
          element('code', { text: option.layoutSha256 || 'Missing — option cannot be approved' }),
        ]),
        preview ? this.createLayoutDiagram(preview) : element('div', { className: 'layout-preview-blocked', attrs: { role: 'status' } }, [
          element('strong', { text: 'Measured furnishing view locked' }),
          element('span', { text: previewErrors.get(option.layoutId) || 'This option did not pass the service layout gates.' }),
        ]),
        element('div', { className: 'placement-list' }, placements.map((placement) => element('article', { className: 'placement-row' }, [
          element('strong', { text: `${placement.assetId || 'unknown asset'} · ${placement.placementId || 'missing placement ID'}` }),
          element('span', { text: `Room ${placement.roomId || '—'} · position ${placement.x ?? '—'}, ${placement.y ?? '—'}, ${placement.z ?? '—'} mm · rotation ${placement.rotationDegrees ?? '—'}°` }),
          element('span', { text: `Measured W×D×H ${placement.width ?? '—'} × ${placement.depth ?? '—'} × ${placement.height ?? '—'} mm · clearance ${placement.clearance ?? '—'} mm` }),
        ]))),
        element('p', { className: 'validation-line', text: reviewable
          ? 'Reviewable · exact geometry binding · measured footprints · door-swing passed · circulation passed · no hard violations'
          : `Locked · ${previewErrors.get(option.layoutId) || (option.validation?.hardConstraintViolations || []).map((item) => item.message || item.code || item).join('; ') || 'review evidence incomplete'}` }),
      ]);
      detailsById.set(option.layoutId, detail);
      const card = element('div', { className: 'option-card', dataset: { safe: reviewable } }, [
        element('label', { className: 'option-choice' }, [
          input,
          element('span', {}, [
            element('strong', { text: option.type ? `${option.type.replaceAll('_', ' ')} furnishing` : option.layoutId }),
            element('small', { text: `${placements.length} measured placements · ${reviewable ? 'geometry-bound visual ready' : 'review visual unavailable'}` }),
          ]),
          element('span', { className: 'micro-label', text: reviewable ? 'Reviewable' : 'Locked' }),
        ]),
        detail,
      ]);
      list.append(card);
    }
    const confirm = element('input', { type: 'checkbox', disabled: previewById.size === 0 });
    const approve = button('Approve selected furnishing example', 'approve-layout', { disabled: true });
    const sync = () => {
      const selected = $('input[name="layout"]:checked', list);
      for (const [layoutId, detail] of detailsById) detail.dataset.visible = String(layoutId === selected?.value);
      approve.disabled = this.busy || !confirm.checked || !selected || !previewById.has(selected.value);
    };
    confirm.addEventListener('change', sync);
    list.addEventListener('change', sync);
    approve.addEventListener('click', () => this.approveLayout(list, confirm));
    this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: 'Select the example that fits the way you live' }),
      element('p', { className: 'panel-copy', text: 'These are AI-assisted/procedural furnishing examples. They remain editable design proposals and are not purchase specifications.' }),
      element('div', { className: 'hash-strip option-set-hash' }, [
        element('span', { text: `Option set v${layouts.optionSetVersion} · ${layouts.assetLibraryVersion || 'asset library unknown'}` }),
        element('code', { text: layouts.optionSetSha256 || 'Missing option-set SHA-256' }),
      ]),
      list,
      element('label', { className: 'consent' }, [confirm, element('span', { text: 'I inspected the exact geometry-bound furnishing diagram, measured item extents, room use, door swings and circulation evidence for the selected option.' })]),
      element('div', { className: 'actions' }, approve),
    ]));
  }

  async approveLayout(list, confirmation) {
    const selected = $('input[name="layout"]:checked', list);
    if (!selected || !confirmation.checked) { this.error = new Error('Select a feasible option and explicitly confirm its layout review.'); this.render(); return; }
    try {
      buildLayoutReviewPreview({
        projectId: this.state.projectId,
        geometryReview: this.phaseData.geometry,
        layoutSet: this.phaseData.layouts,
        layoutId: selected.value,
      });
    } catch (error) {
      this.error = new Error(`The furnishing evidence changed or is incomplete. Approval remains locked. ${error.message}`);
      this.render();
      return;
    }
    await this.execute(async () => this.setState(await this.workflow.approveLayout({
      layoutId: selected.value,
      reviewerActorId: `customer:${this.state.projectId}`,
      confirmLayout: true,
    })));
  }

  renderModelPreparation() {
    const generate = button('Build approved whole-unit 3D', 'generate-model', { disabled: this.busy });
    generate.addEventListener('click', () => this.generateModel());
    this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: 'Bind the corrected shell and furniture into one scene' }),
      element('p', { className: 'panel-copy', text: 'The model job uses only approved geometry, layout and design-brief versions. A local browser sketch cannot substitute for it.' }),
      element('div', { className: 'actions' }, generate),
    ]));
  }

  async generateModel() {
    await this.execute(async () => this.setState(await this.workflow.generateModel()));
  }

  renderModelReview() {
    const model = this.phaseData.model;
    if (!model) { this.renderStopped({ blockedReason: 'The current model contract is unavailable.' }); return; }
    let contract;
    try {
      contract = modelArtifactContract(model);
    } catch (error) {
      this.renderStopped({ blockedReason: error.message });
      return;
    }
    const dynamicCoverage = contract.mode === 'dynamic';
    const roomViewCount = dynamicCoverage ? contract.coverage.roomViewCount : null;
    const referenceCount = contract.previews.length;
    this.previewReceipts.model = null;
    const epoch = this.previewEpoch;
    const stageHost = element('div', { className: 'model-stage', id: 'modelStageHost', dataset: { status: 'loading' } }, [
      element('span', { className: 'model-stage-note', text: 'Approved-source GLB · loading private artifact' }),
    ]);
    const referenceCards = new Map();
    const referenceGrid = element('div', { className: 'model-reference-grid' });
    contract.previews.forEach((descriptor, index) => {
      const card = element('article', {
        className: 'model-reference-card',
        dataset: {
          status: 'loading',
          view: descriptor.viewId,
          kind: dynamicCoverage
            ? (descriptor.roomId === null ? 'overview' : 'room')
            : (descriptor.viewId === 'overview' ? 'overview' : 'legacy'),
          roomFunction: dynamicCoverage ? (descriptor.roomFunction || 'none') : 'legacy',
        },
      }, [
        element('header', {}, [
          element('span', { className: 'micro-label', text: `Reference ${String(index + 1).padStart(2, '0')}` }),
          element('strong', { text: descriptor.label }),
          element('span', {
            className: 'model-reference-room',
            text: dynamicCoverage
              ? (descriptor.roomId === null
                ? 'Whole unit · no room or function binding'
                : `Room ID · ${descriptor.roomId} · Function · ${descriptor.roomFunction}`)
              : 'Legacy view · no canonical room binding',
          }),
        ]),
        element('div', { className: 'model-reference-media' }, [
          element('div', { className: 'processing-line' }, element('span')),
        ]),
        element('div', { className: 'model-reference-copy' }, [
          element('p', { text: descriptor.cue }),
          element('span', { className: 'model-reference-status', text: 'Downloading signed private PNG…', attrs: { role: 'status' } }),
          element('code', { className: 'model-reference-hash', text: shortHash(descriptor.sha256) }),
        ]),
      ]);
      referenceCards.set(descriptor.role, card);
      referenceGrid.append(card);
    });
    const evidenceSummary = element('div', {
      className: 'model-artifact-summary',
      dataset: { ready: false },
      attrs: { 'aria-live': 'polite' },
    }, [
      element('span', { className: 'model-artifact-count', text: `0/${contract.reviewArtifacts.length}` }),
      element('div', {}, [
        element('strong', { className: 'model-artifact-title', text: 'Verifying authoritative review artifacts' }),
        element('small', { text: dynamicCoverage
          ? `Approval remains locked until the GLB and all ${referenceCount} ordered server PNGs match this model manifest.`
          : 'Legacy artifacts remain inspectable, but approval requires a regenerated complete-room coverage ledger.' }),
      ]),
    ]);
    const coverageLedger = element('div', {
      className: 'model-coverage-ledger',
      dataset: { complete: dynamicCoverage },
    }, [
      element('span', { className: 'coverage-ledger-mark', text: dynamicCoverage ? '✓' : '!' }),
      element('div', {}, [
        element('strong', { text: dynamicCoverage
          ? `${roomViewCount}/${roomViewCount} canonical rooms represented`
          : 'Legacy fixed-angle model · room-complete coverage not declared' }),
        element('small', { text: dynamicCoverage
          ? `One ordered PNG per canonical room · uncovered room IDs: [] · ${contract.coverage.orderingContract}`
          : 'The older response has no canonical-room ledger, so its uncovered room count is unknown.' }),
      ]),
    ]);
    const referenceBoard = element('section', { className: 'model-reference-board', attrs: { 'aria-labelledby': 'modelReferenceTitle' } }, [
      element('header', { className: 'model-reference-head' }, [
        element('div', {}, [
          element('span', { className: 'micro-label', text: dynamicCoverage ? 'Canonical coverage set' : 'Legacy reference angles' }),
          element('h4', { id: 'modelReferenceTitle', text: dynamicCoverage
            ? `Cross-check the whole unit and ${roomViewCount} rooms`
            : 'Cross-check four fixed angles' }),
        ]),
        element('span', { className: 'reference-origin', text: dynamicCoverage ? 'Review-view ledger complete' : 'Review aids · not proof' }),
      ]),
      referenceGrid,
      coverageLedger,
    ]);
    const confirm = element('input', { type: 'checkbox', disabled: true });
    const approve = button('Approve this exact model', 'approve-model', { disabled: true });
    const sync = () => {
      const receipt = this.previewReceipts.model;
      const readiness = modelReviewApprovalState({
        contract,
        receipt,
        confirmed: confirm.checked,
        busy: this.busy,
      });
      $('.model-artifact-count', evidenceSummary).textContent = `${readiness.verifiedCount}/${readiness.requiredCount}`;
      $('.model-artifact-title', evidenceSummary).textContent = readiness.ready
        ? (dynamicCoverage ? 'All visual reference artifacts verified' : 'Legacy artifacts verified · regeneration required')
        : 'Verifying authoritative review artifacts';
      evidenceSummary.dataset.ready = String(readiness.ready && dynamicCoverage);
      confirm.disabled = !readiness.canConfirm;
      approve.disabled = !readiness.canApprove;
    };
    const registerArtifact = (artifact) => {
      if (!artifact || epoch !== this.previewEpoch || !stageHost.isConnected) return;
      const current = this.previewReceipts.model || {
        modelVersion: model.modelVersion,
        modelSha256: model.modelSha256,
        artifacts: [],
      };
      const artifacts = [...current.artifacts.filter((item) => item.role !== artifact.role), artifact];
      this.previewReceipts.model = { ...current, artifacts };
      sync();
    };
    confirm.addEventListener('change', sync);
    approve.addEventListener('click', () => this.approveModel(confirm));
    this.workbench.replaceChildren(element('div', { className: 'section-panel model-review-panel' }, [
      element('h3', { className: 'panel-title', text: 'Inspect the whole unit before any image is rendered' }),
      element('p', { className: 'panel-copy', text: dynamicCoverage
        ? `Model v${model.modelVersion} · ${shortHash(model.modelSha256)} · material ${model.materialVersion}. The interactive viewer and ${referenceCount} ordered references come only from this version-bound service output; its ledger covers ${roomViewCount}/${roomViewCount} canonical rooms.`
        : `Model v${model.modelVersion} · ${shortHash(model.modelSha256)} · material ${model.materialVersion}. The interactive viewer and four legacy review aids come only from this version-bound service output.` }),
      element('div', { className: 'model-proof-layout' }, [stageHost, referenceBoard]),
      evidenceSummary,
      element('p', { className: 'model-proof-boundary', text: dynamicCoverage
        ? `The service declares one reference for every canonical room in this model (${roomViewCount} covered, 0 uncovered). That is review coverage—not proof of detector accuracy, hidden construction, dimensions or the as-built flat; site verification remains required.`
        : 'These four legacy views can help find a missing wall, door or window, but they do not declare coverage for every canonical room or prove the as-built flat; site verification remains required.' }),
      element('label', { className: 'consent' }, [confirm, element('span', { text: dynamicCoverage
        ? `I inspected the interactive model, whole-unit overview and all ${roomViewCount} canonical-room references, including shell, opening voids and furnishing layout, and confirm the exact model version and hash shown.`
        : 'I inspected the interactive model and all four legacy reference angles, including the shell, opening voids and furnishing layout, and confirm the exact model version and hash shown.' })]),
      element('div', { className: 'actions' }, approve),
    ]));
    this.previewReceipts.model = {
      modelVersion: model.modelVersion,
      modelSha256: model.modelSha256,
      artifacts: [],
    };
    sync();
    this.loadGlb(stageHost, contract.glb, epoch).then(registerArtifact);
    for (const descriptor of contract.previews) {
      this.loadModelPreview(referenceCards.get(descriptor.role), descriptor, epoch).then(registerArtifact);
    }
  }

  async loadGlb(host, descriptor, epoch) {
    try {
      const stage = element('three-d-stage', { attrs: {
        name: `homeandme-${this.state.projectId}`,
        background: '#e8e5dc',
        autorotate: '',
        'review-only': '',
      } });
      host.append(stage);
      const [{ THREE }, { GLTFLoader }] = await Promise.all([stage.ready, import('three/addons/loaders/GLTFLoader.js')]);
      const artifact = await this.workflow.api.artifactPayload(descriptor.role, descriptor.mediaType, descriptor.byteSize);
      const { bytes, contentType } = artifact;
      if (bytes.byteLength !== descriptor.byteSize) throw new Error('GLB byte size does not match the model manifest.');
      const artifactSha256 = await sha256Bytes(bytes);
      if (artifactSha256 !== descriptor.sha256) throw new Error('GLB SHA-256 does not match the model manifest.');
      inspectGlbContainer(bytes, descriptor.sceneBindings);
      const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(bytes, '', resolve, reject));
      if (!gltf?.scene) throw new Error('The GLB contains no scene.');
      if (!(gltf.scene instanceof THREE.Object3D)) throw new Error('The GLB scene is incompatible with the viewer.');
      let meshCount = 0;
      gltf.scene.traverse((object) => {
        if (object?.isMesh && object.geometry?.attributes?.position?.count > 0) meshCount += 1;
      });
      gltf.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const finiteBounds = [...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite);
      if (!meshCount || bounds.isEmpty() || !finiteBounds) throw new Error('The GLB has no finite, reviewable mesh geometry.');
      if (epoch !== this.previewEpoch || !host.isConnected) return null;
      stage.setObject(gltf.scene);
      host.dataset.status = 'verified';
      const note = $('.model-stage-note', host);
      if (note) note.textContent = `GLB verified · ${meshCount} meshes · ${shortHash(artifactSha256)}`;
      return {
        role: descriptor.role,
        sha256: artifactSha256,
        byteSize: bytes.byteLength,
        contentType,
      };
    } catch (error) {
      host.dataset.status = 'error';
      const note = $('.model-stage-note', host);
      if (note) note.textContent = `Private model preview unavailable · ${error.message}`;
      return null;
    }
  }

  async loadModelPreview(card, descriptor, epoch) {
    if (!card) return null;
    const media = $('.model-reference-media', card);
    const status = $('.model-reference-status', card);
    try {
      const artifact = await this.workflow.api.artifactPayload(descriptor.role, descriptor.mediaType, descriptor.byteSize);
      const { bytes, contentType } = artifact;
      if (bytes.byteLength !== descriptor.byteSize) throw new Error('Byte size does not match the model manifest.');
      assertPngSignature(bytes);
      const artifactSha256 = await sha256Bytes(bytes);
      if (artifactSha256 !== descriptor.sha256) throw new Error('SHA-256 does not match the model manifest.');
      const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
      const image = element('img', { attrs: {
        alt: `${descriptor.label}, service-rendered reference${descriptor.roomName ? ` for ${descriptor.roomName}` : ''}`,
        decoding: 'async',
      } });
      try {
        await new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', () => reject(new Error('PNG could not be decoded.')), { once: true });
          image.src = url;
        });
        if (typeof image.decode === 'function') await image.decode();
        if (!(image.naturalWidth > 0) || !(image.naturalHeight > 0)) throw new Error('PNG decoded without dimensions.');
        if (epoch !== this.previewEpoch || !card.isConnected) {
          URL.revokeObjectURL(url);
          return null;
        }
        this.objectUrls.push(url);
        media.replaceChildren(image);
        card.dataset.status = 'verified';
        status.textContent = `Verified · ${image.naturalWidth}×${image.naturalHeight}`;
        $('.model-reference-hash', card).textContent = shortHash(artifactSha256);
        return {
          role: descriptor.role,
          sha256: artifactSha256,
          byteSize: bytes.byteLength,
          contentType,
        };
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
    } catch (error) {
      card.dataset.status = 'error';
      media.replaceChildren(element('span', { className: 'reference-error-mark', text: '!' }));
      status.textContent = `Unavailable · ${error.message}`;
      return null;
    }
  }

  async approveModel(confirmation) {
    const model = this.phaseData.model;
    const receipt = this.previewReceipts.model;
    let contract;
    try {
      contract = modelArtifactContract(model);
    } catch (error) {
      this.error = error;
      this.render();
      return;
    }
    const readiness = modelReviewApprovalState({ contract, receipt, confirmed: confirmation.checked, busy: this.busy });
    if (!readiness.canApprove) {
      this.error = new Error(contract.mode === 'dynamic'
        ? `Verify and inspect the exact private GLB and all ${contract.previews.length} manifest-bound reference views before approval.`
        : 'This legacy model can be inspected, but it must be regenerated with complete canonical-room coverage before approval.');
      this.render();
      return;
    }
    await this.execute(async () => this.setState(await this.workflow.approveModel({
      modelVersion: model.modelVersion,
      modelSha256: model.modelSha256,
      reviewerActorId: `customer:${this.state.projectId}`,
      confirmLayoutAndModel: true,
      artifactReceipt: receipt,
    })));
  }

  renderSceneReady() {
    const model = this.phaseData.model;
    const render = button('Render the approved scene', 'generate-render', { disabled: this.busy || !model });
    render.addEventListener('click', () => this.generateRender());
    this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: 'The renderer may light the scene; it may not redraw the home' }),
      element('p', { className: 'panel-copy', text: 'One perspective camera is bound to the current model, geometry and material revision. Prompts and external conditioning remain empty.' }),
      element('ul', { className: 'issue-list' }, [
        element('li', { className: 'issue-item', dataset: { kind: 'pass' } }, [element('span', { text: '✓' }), element('span', {}, [element('b', { text: 'Geometry preserved' }), element('span', { text: 'Approved Blender scene is opened directly.' })])]),
        element('li', { className: 'issue-item', dataset: { kind: 'pass' } }, [element('span', { text: '✓' }), element('span', {}, [element('b', { text: 'No generative prompt' }), element('span', { text: 'Positive and negative prompt fields are contractually empty.' })])]),
      ]),
      element('div', { className: 'actions' }, render),
    ]));
  }

  async generateRender() {
    await this.execute(async () => {
      const [model, geometry] = await Promise.all([this.workflow.api.model(), this.workflow.api.geometry()]);
      const renderRequest = approvedRenderRequest({ workflowState: this.state, model, geometry });
      await this.setState(await this.workflow.generateRenders({ renderRequest }));
    });
  }

  renderRenderReview() {
    const renders = this.phaseData.renders;
    if (!renders) { this.renderStopped({ blockedReason: 'The current render set is unavailable.' }); return; }
    this.previewReceipts.render = null;
    const epoch = this.previewEpoch;
    const view = renders.views?.[0];
    const figure = element('figure', { className: 'render-proof' }, [
      element('div', { className: 'processing-line' }, element('span')),
      element('figcaption', { text: 'Loading the private, version-bound PNG…' }),
    ]);
    const confirm = element('input', { type: 'checkbox', disabled: true });
    const approve = button('Approve this design visual', 'approve-design', { disabled: true });
    const sync = () => {
      const receipt = this.previewReceipts.render;
      const ready = receipt?.renderSetId === renders.renderSetId
        && receipt?.artifactRole === view?.artifactRole
        && /^[a-f0-9]{64}$/.test(receipt?.artifactSha256 || '');
      confirm.disabled = !ready || this.busy;
      approve.disabled = !ready || !confirm.checked || this.busy;
    };
    confirm.addEventListener('change', sync);
    approve.addEventListener('click', () => this.approveDesign(confirm));
    this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
      element('h3', { className: 'panel-title', text: 'Compare the image to the model—not to a fantasy prompt' }),
      element('p', { className: 'panel-copy', text: `Render set ${renders.renderSetId}. One requested-camera image, no AI post-processing and no external conditioning.` }),
      figure,
      element('label', { className: 'consent' }, [confirm, element('span', { text: 'I reviewed this render set against the approved model and accept it as a design visualisation, not an as-built or final-finish guarantee.' })]),
      element('div', { className: 'actions' }, approve),
    ]));
    this.loadRender(figure, view?.artifactRole, renders.renderSetId, epoch).then((receipt) => {
      if (!receipt || epoch !== this.previewEpoch || !figure.isConnected) return;
      this.previewReceipts.render = receipt;
      sync();
    });
  }

  async loadRender(figure, role, renderSetId, epoch) {
    try {
      const bytes = await this.workflow.api.artifactBytes(role, 'image/png', 16 * 1024 * 1024);
      assertPngSignature(bytes);
      const artifactSha256 = await sha256Bytes(bytes);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      this.objectUrls.push(url);
      const image = element('img', { attrs: { alt: 'Deterministic render from the approved Home and Me scene', decoding: 'async' } });
      await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error('The private PNG could not be decoded.')), { once: true });
        image.src = url;
      });
      if (typeof image.decode === 'function') await image.decode();
      if (!(image.naturalWidth > 0) || !(image.naturalHeight > 0)) throw new Error('The private PNG decoded without dimensions.');
      if (epoch !== this.previewEpoch || !figure.isConnected) return null;
      figure.replaceChildren(image, element('figcaption', { text: `Requested-camera PNG · ${image.naturalWidth}×${image.naturalHeight} · SHA-256 ${artifactSha256}` }));
      return { renderSetId, artifactRole: role, artifactSha256 };
    } catch (error) {
      figure.replaceChildren(element('figcaption', { text: `Private render preview unavailable: ${error.message}` }));
      return null;
    }
  }

  async approveDesign(confirmation) {
    const view = this.phaseData.renders?.views?.[0];
    const receipt = this.previewReceipts.render;
    if (!confirmation.checked
      || receipt?.renderSetId !== this.phaseData.renders?.renderSetId
      || receipt?.artifactRole !== view?.artifactRole
      || !/^[a-f0-9]{64}$/.test(receipt?.artifactSha256 || '')) {
      this.error = new Error('Load and inspect the exact private render preview before approval.'); this.render(); return;
    }
    await this.execute(async () => this.setState(await this.workflow.approveDesign({
      renderSetId: this.phaseData.renders.renderSetId,
      confirmDesign: true,
    })));
  }

  renderDesignApproved() {
    this.workbench.replaceChildren(element('div', { className: 'section-panel' }, [
      element('div', { className: 'status-knot' }, element('span', { text: '✓' })),
      element('h3', { className: 'panel-title', text: 'The design visual is approved; the renovation is not' }),
      element('p', { className: 'panel-copy', text: 'A professional can now review the versioned brief, measured geometry, furnishing proposal and deterministic render. Final quotation, works and real-life accuracy remain subject to site verification, scope and material approval.' }),
      element('div', { className: 'actions' }, element('a', { className: 'button secondary', text: 'Continue with a human designer', href: 'ContactUs.dc.html' })),
    ]));
  }

  renderStopped(view) {
    this.workbench.replaceChildren(element('div', { className: 'offline-panel' }, [
      element('div', { className: 'status-knot' }, element('span', { text: '!' })),
      element('h3', { className: 'panel-title', text: 'This project needs a dedicated review' }),
      element('p', { className: 'panel-copy', text: view.blockedReason || this.state?.blockedReason || 'No safe customer action is available for the current state.' }),
      element('div', { className: 'actions' }, element('a', { className: 'button secondary', text: 'Contact project support', href: 'ContactUs.dc.html' })),
    ]));
  }

  renderError() {
    if (!this.error) return;
    const message = this.error?.payload?.detail?.message || this.error.message || 'The action could not be completed.';
    this.workbench.append(element('p', { className: 'error-note', text: message, attrs: { role: 'alert' } }));
  }
}

if (typeof document !== 'undefined' && document.querySelector('#workbench')) {
  const app = new ProjectJourneyApp();
  app.boot();
}
