import {
  sha256Hex,
  validateBareShellGlbEnvelope,
} from './journey-shell-review.js';

/**
 * Receipt-bound, read-only bare-shell orbit presentation contract.
 *
 * This file intentionally contains no renderer import and performs no network request. A future
 * authenticated private host may inject one bundled runtime with the exact contract below. Until
 * that runtime exists, validation succeeds but no Blob URL is created and the presentation stays
 * visibly unavailable. A reference PNG must never be substituted for interactive 3D.
 */
export const PRIVATE_SHELL_ORBIT_VIEWER_ENABLED = false;
export const PRIVATE_SHELL_ORBIT_PRESENTATION_SCHEMA = 'homeandme-private-shell-orbit-presentation/1';
export const PRIVATE_SHELL_ORBIT_RUNTIME_CONTRACT = 'homeandme-bundled-read-only-glb-orbit-runtime/1';
export const PRIVATE_SHELL_ORBIT_INPUT_CONTRACT = 'pointer-touch-keyboard-orbit/1';
export const PRIVATE_SHELL_ORBIT_RENDER_POLICY = 'self-contained-object-url-no-network/1';
export const PRIVATE_SHELL_ORBIT_TRANSPORT_CONTRACT = 'same-origin-private-no-store/1';

const HASH = /^[a-f0-9]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const GLB_MEDIA_TYPE = 'model/gltf-binary';

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return record(value)
    && Object.keys(value).sort().join('\u0000') === [...keys].sort().join('\u0000');
}

function descriptorMatches(left, right) {
  return left.role === right.role
    && left.mediaType === right.mediaType
    && left.byteSize === right.byteSize
    && left.sha256 === right.sha256;
}

function assertShellIdentity(shell) {
  if (!record(shell)
    || !Number.isSafeInteger(shell.shellModelVersion) || shell.shellModelVersion < 1
    || !HASH.test(shell.shellModelSha256 || '')
    || !HASH.test(shell.artifactManifestSha256 || '')
    || !['ready', 'approved'].includes(shell.approvalStatus)
    || shell.verificationComplete !== true
    || shell.artifactTransportContract !== PRIVATE_SHELL_ORBIT_TRANSPORT_CONTRACT) {
    throw new TypeError('The orbit viewer requires one current, private, completely verified shell receipt.');
  }
}

/** Re-hash and bind one GLB copy before any presentation URL may be created. */
export async function validateReceiptBoundOrbitArtifact({ shell, artifact } = {}) {
  assertShellIdentity(shell);
  const descriptor = shell.glbArtifact;
  if (!exactKeys(descriptor, ['role', 'mediaType', 'byteSize', 'sha256'])
    || !IDENTIFIER.test(descriptor.role || '')
    || descriptor.mediaType !== GLB_MEDIA_TYPE
    || !Number.isSafeInteger(descriptor.byteSize) || descriptor.byteSize < 20
    || !HASH.test(descriptor.sha256 || '')) {
    throw new TypeError('The shell receipt has no exact renderable GLB descriptor.');
  }
  if (!exactKeys(artifact, ['role', 'mediaType', 'byteSize', 'sha256', 'bytes'])
    || !descriptorMatches(descriptor, artifact)
    || !(artifact.bytes instanceof ArrayBuffer)
    || artifact.bytes.byteLength !== descriptor.byteSize) {
    throw new TypeError('The GLB bytes do not match the current shell artifact receipt.');
  }
  validateBareShellGlbEnvelope(artifact.bytes);
  if (await sha256Hex(artifact.bytes) !== descriptor.sha256) {
    throw new TypeError('The GLB copy changed after its private artifact receipt was issued.');
  }
  return Object.freeze({
    schema: PRIVATE_SHELL_ORBIT_PRESENTATION_SCHEMA,
    shellModelVersion: shell.shellModelVersion,
    shellModelSha256: shell.shellModelSha256,
    artifactManifestSha256: shell.artifactManifestSha256,
    artifactRole: descriptor.role,
    artifactMediaType: descriptor.mediaType,
    artifactByteSize: descriptor.byteSize,
    artifactSha256: descriptor.sha256,
    transportContract: PRIVATE_SHELL_ORBIT_TRANSPORT_CONTRACT,
    renderPolicy: PRIVATE_SHELL_ORBIT_RENDER_POLICY,
    geometryOnly: true,
    authoringEnabled: false,
    furnitureIncluded: false,
    designIncluded: false,
    renderingClaim: false,
  });
}

export function validatePrivateOrbitRuntimeProvider(provider) {
  if (!exactKeys(provider, [
    'runtimeContract',
    'inputContract',
    'renderPolicy',
    'networkAccessEnabled',
    'authoringEnabled',
    'mount',
  ])
    || provider.runtimeContract !== PRIVATE_SHELL_ORBIT_RUNTIME_CONTRACT
    || provider.inputContract !== PRIVATE_SHELL_ORBIT_INPUT_CONTRACT
    || provider.renderPolicy !== PRIVATE_SHELL_ORBIT_RENDER_POLICY
    || provider.networkAccessEnabled !== false
    || provider.authoringEnabled !== false
    || typeof provider.mount !== 'function') {
    throw new TypeError('The private shell orbit runtime is absent or violates the local read-only contract.');
  }
  return provider;
}

function freezeStatus(status, receipt = null, message = null) {
  return Object.freeze({
    schema: PRIVATE_SHELL_ORBIT_PRESENTATION_SCHEMA,
    status,
    receipt,
    message,
  });
}

/**
 * DOM-agnostic URL/runtime lifetime gate. The caller supplies a viewport owned by its private UI.
 * Closing or opening another revision aborts the current mount, disposes the runtime and revokes
 * the one object URL synchronously. A runtime-less open never creates an object URL.
 */
export class ReceiptBoundShellOrbitSession {
  #abortController = null;

  #epoch = 0;

  #objectUrl = null;

  #runtimeSession = null;

  #receipt = null;

  constructor({
    runtimeProvider = null,
    enabled = PRIVATE_SHELL_ORBIT_VIEWER_ENABLED,
    urlApi = globalThis.URL,
    blobFactory = (parts, options) => new Blob(parts, options),
  } = {}) {
    this.enabled = enabled === true;
    this.runtimeProvider = runtimeProvider;
    this.urlApi = urlApi;
    this.blobFactory = blobFactory;
  }

  #release() {
    this.#abortController?.abort();
    this.#abortController = null;
    if (this.#runtimeSession) {
      try { this.#runtimeSession.dispose(); } catch (_) { /* teardown must continue */ }
      this.#runtimeSession = null;
    }
    if (this.#objectUrl) {
      this.urlApi.revokeObjectURL(this.#objectUrl);
      this.#objectUrl = null;
    }
    this.#receipt = null;
  }

  close() {
    this.#epoch += 1;
    this.#release();
  }

  async open({ shell, artifact, viewport } = {}) {
    if (!this.enabled) {
      throw new Error('The private shell orbit presentation is disabled.');
    }
    const epoch = ++this.#epoch;
    this.#release();
    const receipt = await validateReceiptBoundOrbitArtifact({ shell, artifact });
    if (epoch !== this.#epoch) return freezeStatus('stale', null, 'The shell revision changed.');
    if (this.runtimeProvider === null) {
      return freezeStatus(
        'runtime_missing',
        receipt,
        'No bundled private GLB renderer is installed; no model URL was created.',
      );
    }
    const provider = validatePrivateOrbitRuntimeProvider(this.runtimeProvider);
    if (!viewport) throw new TypeError('A private orbit viewport is required.');
    if (typeof this.urlApi?.createObjectURL !== 'function'
      || typeof this.urlApi?.revokeObjectURL !== 'function'
      || typeof this.blobFactory !== 'function') {
      throw new Error('Private object-URL presentation is unavailable.');
    }
    const controller = new AbortController();
    const objectUrl = this.urlApi.createObjectURL(this.blobFactory(
      [artifact.bytes],
      { type: GLB_MEDIA_TYPE },
    ));
    this.#abortController = controller;
    this.#objectUrl = objectUrl;
    try {
      const runtimeSession = await provider.mount(Object.freeze({
        viewport,
        objectUrl,
        artifactBytes: artifact.bytes.slice(0),
        receipt,
        signal: controller.signal,
        readOnly: true,
      }));
      if (epoch !== this.#epoch) {
        runtimeSession?.dispose?.();
        return freezeStatus('stale', null, 'The shell revision changed.');
      }
      if (!exactKeys(runtimeSession, ['dispose', 'resetView'])
        || typeof runtimeSession.dispose !== 'function'
        || typeof runtimeSession.resetView !== 'function') {
        try { runtimeSession?.dispose?.(); } catch (_) { /* contract rejection still tears down */ }
        throw new TypeError('The bundled orbit runtime did not return a disposable read-only session.');
      }
      this.#runtimeSession = runtimeSession;
      this.#receipt = receipt;
      return freezeStatus('ready', receipt, null);
    } catch (error) {
      if (epoch === this.#epoch) this.#release();
      throw error;
    }
  }

  resetView() {
    if (!this.#runtimeSession || !this.#receipt) {
      throw new Error('No receipt-bound orbit session is ready.');
    }
    this.#runtimeSession.resetView();
  }

  dispose() {
    this.close();
  }
}
