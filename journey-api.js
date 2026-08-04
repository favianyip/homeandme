import { validateRenderRequest } from './journey-render-contract.js';

const STORAGE_KEY = 'hnm_secure_guest_project_v1';

export function journeyConfig(_locationObject = globalThis.location, configured = globalThis.HNM_CONFIG) {
  const apiBaseUrl = (configured?.apiBaseUrl || '').replace(/\/$/, '');
  const serviceConfigured = Boolean(apiBaseUrl);
  if (serviceConfigured) {
    const url = new URL(apiBaseUrl);
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.protocol !== 'https:' && !local) throw new Error('The project API must use HTTPS.');
  }
  const requested = configured?.flags || {};
  // Roll capabilities out in dependency order. Merely configuring analysis must never
  // expose model, rendering, quotation or payment actions that the service has not enabled.
  const analysis = serviceConfigured && requested.AI_ANALYSIS_ENABLED === true;
  const geometryReview = analysis && requested.GEOMETRY_REVIEW_ENABLED === true;
  const live3d = geometryReview && requested.LIVE_3D_ENABLED === true;
  const rendering = live3d && requested.AI_RENDERING_ENABLED === true;
  const quotation = rendering && requested.QUOTATION_ENABLED === true;
  const payments = quotation && requested.PAYMENTS_ENABLED === true;
  return {
    apiBaseUrl,
    flags: {
      ...requested,
      AI_ANALYSIS_ENABLED: analysis,
      GEOMETRY_REVIEW_ENABLED: geometryReview,
      LIVE_3D_ENABLED: live3d,
      AI_RENDERING_ENABLED: rendering,
      QUOTATION_ENABLED: quotation,
      PAYMENTS_ENABLED: payments,
    },
  };
}

export class HomeAndMeProjectApi {
  constructor({ baseUrl, fetchImpl = globalThis.fetch, storage = globalThis.localStorage } = {}) {
    if (!baseUrl) throw new Error('A project API base URL is required.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = (...args) => fetchImpl.call(globalThis, ...args);
    this.storage = storage;
    this.session = this._readSession();
  }

  _readSession() {
    try {
      const saved = JSON.parse(this.storage?.getItem(STORAGE_KEY) || 'null');
      return typeof saved?.projectId === 'string' && saved.projectId ? { projectId: saved.projectId } : null;
    } catch (_) { return null; }
  }

  _saveSession(session) {
    this.session = typeof session?.projectId === 'string' && session.projectId
      ? { projectId: session.projectId } : null;
    if (this.session) this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.session));
  }

  async _request(path, { method = 'GET', body, headers = {} } = {}) {
    const outgoing = { ...headers };
    for (const name of Object.keys(outgoing)) {
      if (name.toLowerCase() === 'authorization') delete outgoing[name];
    }
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      outgoing['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const response = await this.fetch(`${this.baseUrl}${path}`, { method, headers: outgoing, body, credentials: 'include' });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('json') ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = payload?.detail;
      const message = payload?.message || (typeof detail === 'string' ? detail : detail?.message) || `Request failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async createProject(propertyType = 'hdb', postalCode = null, levels = 1) {
    const payload = await this._request('/api/v1/projects', {
      method: 'POST', body: { propertyType, postalCode, levels },
    });
    this._saveSession({ projectId: payload.projectId });
    return payload;
  }

  requireSession() {
    if (!this.session?.projectId) throw new Error('No saved project session.');
    return this.session;
  }

  project() { return this._request(`/api/v1/projects/${this.requireSession().projectId}`); }
  updateProperty(propertyType, postalCode, levels = 1) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/property`, {
      method: 'PUT', body: { propertyType, postalCode, levels },
    });
  }
  events() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/events`); }

  async uploadFloorPlan(file) {
    const form = new FormData(); form.append('file', file, file.name);
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/floor-plan`, {
      method: 'POST', body: form,
    });
  }

  job(jobId) { return this._request(`/api/v1/projects/${this.requireSession().projectId}/jobs/${jobId}`); }
  cancelJob(jobId) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }
  geometry() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/geometry`); }
  correctGeometry(sourceGeometryVersion, sourceGeometrySha256, reason, geometry, {
    correctionMode = 'bounded_edit', acknowledgeApprovalReset = false, evidence = null,
  } = {}) {
    if (!['bounded_edit', 'major_retrace'].includes(correctionMode)) {
      throw new TypeError('Geometry correction mode must be bounded_edit or major_retrace.');
    }
    if (correctionMode === 'bounded_edit' && !evidence) {
      throw new TypeError('Bounded geometry correction requires complete source-image evidence.');
    }
    if (correctionMode === 'major_retrace'
      && (acknowledgeApprovalReset !== true || geometry?.scale_status !== 'unvalidated')) {
      throw new TypeError('Major retrace requires approval-reset acknowledgement and unvalidated scale.');
    }
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/geometry/correct`, {
      method: 'POST',
      body: {
        sourceGeometryVersion, sourceGeometrySha256, reason, geometry,
        correctionMode, acknowledgeApprovalReset, evidence,
      },
    });
  }
  calibrateGeometry(sourceGeometryVersion, sourceGeometrySha256, referenceWallId, measuredLengthMm, evidenceNote) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/geometry/calibrate`, {
      method: 'POST', body: { sourceGeometryVersion, sourceGeometrySha256, referenceWallId, measuredLengthMm, evidenceNote },
    });
  }
  approveGeometry(geometryVersion, geometrySha256, reviewerActorId) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/geometry/approve`, {
      method: 'POST',
      body: {
        geometryVersion,
        geometrySha256,
        reviewerActorId,
        confirmMetricScale: true,
        confirmWallsRoomsOpenings: true,
      },
    });
  }
  proposeDimensions(proposal) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/dimensions/propose`, {
      method: 'POST', body: proposal,
    });
  }
  dimensionProposal() {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/dimensions/proposal`);
  }
  approveDimensions(proposalVersion, proposalSha256, reviewerActorId) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/dimensions/approve`, {
      method: 'POST', body: { proposalVersion, proposalSha256, reviewerActorId },
    });
  }
  putDesignBrief(brief) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/design-brief`, { method: 'PUT', body: brief });
  }
  generateLayouts() {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/layouts/generate`, { method: 'POST' });
  }
  layoutOptions() {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/layouts/options`);
  }
  approveLayout(layoutId, reviewerActorId) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/layouts/${encodeURIComponent(layoutId)}/approve`, {
      method: 'POST', body: { reviewerActorId },
    });
  }
  generateModel() {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/model/generate`, { method: 'POST' });
  }
  model() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/model`); }
  approveModel(modelVersion, modelSha256, reviewerActorId) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/model/approve`, {
      method: 'POST',
      body: {
        modelVersion,
        modelSha256,
        reviewerActorId,
        confirmLayoutAndModel: true,
      },
    });
  }
  uploadViewerCapture(color, depth, viewerState = {}) {
    // Future-only evidence upload; the deterministic approved-scene renderer does not use it.
    if (!(color instanceof Blob) || !(depth instanceof Blob)) {
      throw new TypeError('Viewer color and depth captures must be Blob objects.');
    }
    const form = new FormData();
    form.append('color', color, 'color.png');
    form.append('depth', depth, 'depth.png');
    form.append('viewer_state', JSON.stringify(viewerState));
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/captures`, {
      method: 'POST', body: form,
    });
  }
  generateRenders(renderRequest) {
    const validation = validateRenderRequest(renderRequest);
    if (!validation.ok) {
      throw new TypeError(`Invalid deterministic render request: ${validation.errors.join('; ')}`);
    }
    const projectId = this.requireSession().projectId;
    if (renderRequest.projectId !== projectId) {
      throw new TypeError('Render request belongs to another project.');
    }
    return this._request(`/api/v1/projects/${projectId}/renders`, {
      method: 'POST', body: renderRequest,
    });
  }
  renders() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/renders`); }
  renderHistory() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/renders/history`); }
  approveDesign(renderSetId) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/design/approve`, { method: 'POST', body: { renderSetId } });
  }
  requestRevision(sourceDesignVersion, instructions, scopes, affectedRoomIds = []) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/revisions`, {
      method: 'POST', body: { sourceDesignVersion, instructions, scopes, affectedRoomIds },
    });
  }
  revisions() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/revisions`); }
  quote() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/quote`); }
  approveQuote(quoteVersion) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/quote/approve`, { method: 'POST', body: { quoteVersion } });
  }
  checkout(idempotencyKey) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/checkout-session`, {
      method: 'POST', headers: { 'Idempotency-Key': idempotencyKey },
    });
  }
  paymentStatus() { return this._request(`/api/v1/projects/${this.requireSession().projectId}/payment-status`); }
  signedArtifact(role) {
    return this._request(`/api/v1/projects/${this.requireSession().projectId}/artifacts/${encodeURIComponent(role)}/signed-url`, { method: 'POST' });
  }

  async artifactPayload(role, expectedContentTypes, maxBytes = 50 * 1024 * 1024) {
    const signed = await this.signedArtifact(role);
    const url = new URL(signed.url, this.baseUrl + '/');
    if (url.origin !== new URL(this.baseUrl).origin || url.username || url.password) {
      throw new Error('Artifact URL was rejected.');
    }
    const response = await this.fetch(url.href, { credentials: 'include' });
    if (!response.ok) throw new Error(`Artifact request failed (${response.status}).`);
    const contentType = (response.headers.get('content-type') || '').split(';')[0];
    const accepted = Array.isArray(expectedContentTypes) ? expectedContentTypes : [expectedContentTypes];
    if (!accepted.includes(contentType)) throw new Error(`Unexpected artifact type: ${contentType || 'missing'}.`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('Artifact exceeds the configured browser limit.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maxBytes) throw new Error('Artifact exceeds the configured browser limit.');
    return { bytes, contentType };
  }

  async artifactBytes(role, expectedContentType, maxBytes = 50 * 1024 * 1024) {
    const payload = await this.artifactPayload(role, expectedContentType, maxBytes);
    return payload.bytes;
  }

  async artifactObjectUrl(role, expectedContentType, maxBytes = 15 * 1024 * 1024) {
    const bytes = await this.artifactBytes(role, expectedContentType, maxBytes);
    return URL.createObjectURL(new Blob([bytes], { type: expectedContentType }));
  }
}

export async function pollJob(api, jobId, onProgress = () => {}, { intervalMs = 750, timeoutMs = 180000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await api.job(jobId); onProgress(job);
    if (job.status === 'completed') return job;
    if (job.status === 'failed' || job.status === 'cancelled') throw new Error(job.message || `Job ${job.status}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Processing is taking longer than expected. Your project is saved; return later.');
}
