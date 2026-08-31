import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PRIVATE_SHELL_ORBIT_INPUT_CONTRACT,
  PRIVATE_SHELL_ORBIT_RENDER_POLICY,
  PRIVATE_SHELL_ORBIT_RUNTIME_CONTRACT,
  PRIVATE_SHELL_ORBIT_VIEWER_ENABLED,
  ReceiptBoundShellOrbitSession,
  validatePrivateOrbitRuntimeProvider,
  validateReceiptBoundOrbitArtifact,
} from '../private-shell-orbit-viewer.js';
import { sha256Hex } from '../journey-shell-review.js';

function makeGlb({ externalUri = null } = {}) {
  const document = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    ...(externalUri ? { buffers: [{ byteLength: 4, uri: externalUri }] } : {}),
  };
  const source = new TextEncoder().encode(JSON.stringify(document));
  const paddedSize = Math.ceil(source.byteLength / 4) * 4;
  const bytes = new ArrayBuffer(20 + paddedSize);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, paddedSize, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20, paddedSize).fill(0x20);
  new Uint8Array(bytes, 20, source.byteLength).set(source);
  return bytes;
}

async function fixture(overrides = {}) {
  const bytes = overrides.bytes || makeGlb();
  const sha256 = await sha256Hex(bytes);
  const descriptor = {
    role: 'shell_job_glb',
    mediaType: 'model/gltf-binary',
    byteSize: bytes.byteLength,
    sha256,
  };
  return {
    shell: {
      shellModelVersion: 3,
      shellModelSha256: '1'.repeat(64),
      artifactManifestSha256: '2'.repeat(64),
      approvalStatus: 'ready',
      verificationComplete: true,
      artifactTransportContract: 'same-origin-private-no-store/1',
      glbArtifact: descriptor,
      ...overrides.shell,
    },
    artifact: {
      ...descriptor,
      bytes,
      ...overrides.artifact,
    },
  };
}

function provider(mount) {
  return {
    runtimeContract: PRIVATE_SHELL_ORBIT_RUNTIME_CONTRACT,
    inputContract: PRIVATE_SHELL_ORBIT_INPUT_CONTRACT,
    renderPolicy: PRIVATE_SHELL_ORBIT_RENDER_POLICY,
    networkAccessEnabled: false,
    authoringEnabled: false,
    mount,
  };
}

function urlHarness() {
  const created = [];
  const revoked = [];
  return {
    created,
    revoked,
    api: {
      createObjectURL(blob) {
        const url = `blob:private-shell-${created.length + 1}`;
        created.push({ url, blob });
        return url;
      },
      revokeObjectURL(url) { revoked.push(url); },
    },
  };
}

test('private orbit viewer defaults off and is absent from public pages and deployment', async () => {
  assert.equal(PRIVATE_SHELL_ORBIT_VIEWER_ENABLED, false);
  const [deploy, page, publicScript] = await Promise.all([
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../project-journey.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(deploy, /private-shell-orbit-viewer/);
  assert.doesNotMatch(page, /private-shell-orbit-viewer/);
  assert.doesNotMatch(publicScript, /private-shell-orbit-viewer/);
});

test('receipt gate re-hashes an exact current self-contained geometry-only GLB', async () => {
  const current = await fixture();
  const receipt = await validateReceiptBoundOrbitArtifact(current);
  assert.equal(receipt.shellModelVersion, 3);
  assert.equal(receipt.artifactRole, 'shell_job_glb');
  assert.equal(receipt.transportContract, 'same-origin-private-no-store/1');
  assert.equal(receipt.renderPolicy, PRIVATE_SHELL_ORBIT_RENDER_POLICY);
  assert.equal(receipt.geometryOnly, true);
  assert.equal(receipt.authoringEnabled, false);
  assert.equal(receipt.furnitureIncluded, false);
  assert.equal(receipt.designIncluded, false);
  assert.equal(receipt.renderingClaim, false);
});

test('receipt gate rejects stale identity, descriptor, bytes and external GLB resources', async (t) => {
  const cases = [
    ['incomplete verification', async () => fixture({ shell: { verificationComplete: false } }), /completely verified/],
    ['unsafe transport', async () => fixture({ shell: { artifactTransportContract: 'public-cache/1' } }), /completely verified/],
    ['wrong MIME', async () => fixture({ artifact: { mediaType: 'application/octet-stream' } }), /do not match/],
    ['wrong byte size', async () => fixture({ artifact: { byteSize: 21 } }), /do not match/],
    ['wrong digest', async () => fixture({ artifact: { sha256: 'f'.repeat(64) } }), /do not match/],
    ['external URI', async () => fixture({ bytes: makeGlb({ externalUri: 'model.bin' }) }), /external resource URI/],
  ];
  for (const [name, build, expected] of cases) {
    await t.test(name, async () => {
      const candidate = await build();
      await assert.rejects(() => validateReceiptBoundOrbitArtifact(candidate), expected);
    });
  }

  const changed = await fixture();
  changed.artifact.bytes = changed.artifact.bytes.slice(0);
  const changedView = new Uint8Array(changed.artifact.bytes);
  const marker = new TextEncoder().encode('"scene":0');
  let markerOffset = -1;
  for (let index = 20; index <= changedView.length - marker.length; index += 1) {
    if (marker.every((value, offset) => changedView[index + offset] === value)) {
      markerOffset = index;
      break;
    }
  }
  assert.notEqual(markerOffset, -1);
  changedView[markerOffset + marker.length - 1] = 0x31;
  await assert.rejects(() => validateReceiptBoundOrbitArtifact(changed), /changed after/);
});

test('missing bundled runtime is explicit and creates no object URL', async () => {
  const current = await fixture();
  const urls = urlHarness();
  const session = new ReceiptBoundShellOrbitSession({
    enabled: true,
    runtimeProvider: null,
    urlApi: urls.api,
    blobFactory: () => ({ type: 'model/gltf-binary' }),
  });
  const result = await session.open({ ...current, viewport: {} });
  assert.equal(result.status, 'runtime_missing');
  assert.match(result.message, /no model URL/i);
  assert.equal(urls.created.length, 0);
  assert.equal(urls.revoked.length, 0);
  session.dispose();
});

test('exact bundled runtime gets one object URL and teardown revokes it once', async () => {
  const current = await fixture();
  const urls = urlHarness();
  let disposed = 0;
  let resets = 0;
  let received;
  const runtime = provider(async (input) => {
    received = input;
    return {
      dispose() { disposed += 1; },
      resetView() { resets += 1; },
    };
  });
  assert.equal(validatePrivateOrbitRuntimeProvider(runtime), runtime);
  const session = new ReceiptBoundShellOrbitSession({
    enabled: true,
    runtimeProvider: runtime,
    urlApi: urls.api,
    blobFactory: (parts, options) => ({ parts, ...options }),
  });
  const result = await session.open({ ...current, viewport: { id: 'viewport' } });
  assert.equal(result.status, 'ready');
  assert.equal(received.objectUrl, 'blob:private-shell-1');
  assert.notEqual(received.artifactBytes, current.artifact.bytes);
  assert.equal(await sha256Hex(received.artifactBytes), current.artifact.sha256);
  assert.equal(received.readOnly, true);
  assert.equal(received.receipt.artifactSha256, current.artifact.sha256);
  assert.equal(received.signal.aborted, false);
  assert.equal(urls.created.length, 1);
  session.resetView();
  assert.equal(resets, 1);
  session.close();
  assert.equal(received.signal.aborted, true);
  assert.equal(disposed, 1);
  assert.deepEqual(urls.revoked, ['blob:private-shell-1']);
  session.close();
  assert.equal(disposed, 1);
  assert.deepEqual(urls.revoked, ['blob:private-shell-1']);
});

test('revision change destroys a pending runtime and cannot publish its stale session', async () => {
  const current = await fixture();
  const urls = urlHarness();
  let releaseMount;
  let staleDisposed = 0;
  const runtime = provider(() => new Promise((resolve) => {
    releaseMount = () => resolve({
      dispose() { staleDisposed += 1; },
      resetView() {},
    });
  }));
  const session = new ReceiptBoundShellOrbitSession({
    enabled: true,
    runtimeProvider: runtime,
    urlApi: urls.api,
    blobFactory: () => ({}),
  });
  const pending = session.open({ ...current, viewport: {} });
  while (!releaseMount) await new Promise((resolve) => setImmediate(resolve));
  session.close();
  releaseMount();
  const result = await pending;
  assert.equal(result.status, 'stale');
  assert.equal(staleDisposed, 1);
  assert.deepEqual(urls.revoked, ['blob:private-shell-1']);
});

test('runtime provider contract rejects network, authoring and input drift', () => {
  const valid = provider(async () => ({ dispose() {}, resetView() {} }));
  for (const mutate of [
    (value) => { value.networkAccessEnabled = true; },
    (value) => { value.authoringEnabled = true; },
    (value) => { value.inputContract = 'pointer-only/1'; },
    (value) => { value.runtimeContract = 'remote-viewer/1'; },
    (value) => { value.extra = true; },
  ]) {
    const candidate = { ...valid };
    mutate(candidate);
    assert.throws(() => validatePrivateOrbitRuntimeProvider(candidate), /absent or violates/);
  }
});
