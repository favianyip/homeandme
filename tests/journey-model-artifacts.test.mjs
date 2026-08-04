import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inspectGlbContainer,
  MODEL_PREVIEW_VIEWS,
  modelArtifactContract,
  modelReviewApprovalState,
  validateModelArtifactContract,
} from '../journey-model-artifacts.js';

const SHA = Object.freeze({
  model: 'a'.repeat(64),
  glb: 'b'.repeat(64),
  scene: 'c'.repeat(64),
  manifest: 'd'.repeat(64),
  overview: 'e'.repeat(64),
  living: 'f'.repeat(64),
  bedroom: '1'.repeat(64),
  kitchen: '2'.repeat(64),
});

function modelFixture() {
  const previewArtifactRoles = ['preview-overview', 'preview-living', 'preview-bedroom', 'preview-kitchen'];
  return {
    modelVersion: 4,
    modelSha256: SHA.model,
    geometrySha256: '3'.repeat(64),
    layoutSha256: '4'.repeat(64),
    glbArtifactRole: 'approved-model-glb',
    sceneArtifactRole: 'approved-scene-blend',
    sceneManifestArtifactRole: 'approved-scene-manifest',
    sceneManifestSha256: SHA.manifest,
    previewArtifactRoles,
    artifactManifest: [
      { role: 'approved-model-glb', sha256: SHA.glb, byteSize: 24000 },
      { role: 'approved-scene-blend', sha256: SHA.scene, byteSize: 64000 },
      { role: 'approved-scene-manifest', sha256: SHA.manifest, byteSize: 1200 },
      { role: previewArtifactRoles[0], sha256: SHA.overview, byteSize: 4000 },
      { role: previewArtifactRoles[1], sha256: SHA.living, byteSize: 4100 },
      { role: previewArtifactRoles[2], sha256: SHA.bedroom, byteSize: 4200 },
      { role: previewArtifactRoles[3], sha256: SHA.kitchen, byteSize: 4300 },
    ],
  };
}

function receiptFor(contract) {
  return {
    modelVersion: contract.modelVersion,
    modelSha256: contract.modelSha256,
    artifacts: contract.reviewArtifacts.map((artifact) => ({
      role: artifact.role,
      sha256: artifact.sha256,
      byteSize: artifact.byteSize,
      contentType: artifact.mediaType,
    })),
  };
}

function glbFixture(document = { asset: { version: '2.0' } }) {
  const encoded = new TextEncoder().encode(JSON.stringify(document));
  const jsonChunkByteSize = Math.ceil(encoded.byteLength / 4) * 4;
  const bytes = new ArrayBuffer(20 + jsonChunkByteSize);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, jsonChunkByteSize, true);
  view.setUint32(16, 0x4e4f534a, true);
  const chunk = new Uint8Array(bytes, 20);
  chunk.fill(32);
  chunk.set(encoded);
  return bytes;
}

test('model artifact contract binds the GLB and four ordered fixed reference views', () => {
  const contract = modelArtifactContract(modelFixture());
  assert.equal(contract.reviewArtifacts.length, 5);
  assert.equal(contract.glb.mediaType, 'model/gltf-binary');
  assert.deepEqual(contract.previews.map((item) => item.viewId), MODEL_PREVIEW_VIEWS.map((item) => item.id));
  assert.deepEqual(contract.previews.map((item) => item.role), [
    'preview-overview', 'preview-living', 'preview-bedroom', 'preview-kitchen',
  ]);
  assert.equal(contract.sceneManifest.sha256, SHA.manifest);
});

test('model artifact contract rejects missing, duplicate, unbound and oversized artifacts', async (t) => {
  await t.test('missing preview', () => {
    const model = modelFixture();
    model.artifactManifest.pop();
    assert.equal(validateModelArtifactContract(model).ok, false);
  });
  await t.test('duplicate role', () => {
    const model = modelFixture();
    model.previewArtifactRoles[3] = model.previewArtifactRoles[2];
    assert.match(validateModelArtifactContract(model).errors.join(' '), /unique/);
  });
  await t.test('scene manifest mismatch', () => {
    const model = modelFixture();
    model.sceneManifestSha256 = '9'.repeat(64);
    assert.match(validateModelArtifactContract(model).errors.join(' '), /scene manifest hash/);
  });
  await t.test('missing source hash binding', () => {
    const model = modelFixture();
    delete model.geometrySha256;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /geometrySha256/);
  });
  await t.test('oversized GLB', () => {
    const model = modelFixture();
    model.artifactManifest[0].byteSize = 50 * 1024 * 1024 + 1;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /GLB artifact exceeds/);
  });
  await t.test('unsafe role identifier', () => {
    const model = modelFixture();
    model.glbArtifactRole = 'model/../secret';
    model.artifactManifest[0].role = 'model/../secret';
    assert.match(validateModelArtifactContract(model).errors.join(' '), /safe, non-empty identifiers/);
  });
  await t.test('wrong preview role count', () => {
    const model = modelFixture();
    model.previewArtifactRoles.pop();
    model.artifactManifest.pop();
    assert.match(validateModelArtifactContract(model).errors.join(' '), /previewArtifactRoles must contain 4 roles/);
  });
});

test('model approval stays locked until every exact visual artifact receipt is present', () => {
  const contract = modelArtifactContract(modelFixture());
  const full = receiptFor(contract);
  const partial = { ...full, artifacts: full.artifacts.slice(0, -1) };
  assert.deepEqual(modelReviewApprovalState({ contract, receipt: partial, confirmed: true }), {
    ready: false, verifiedCount: 4, requiredCount: 5, canConfirm: false, canApprove: false,
  });
  assert.deepEqual(modelReviewApprovalState({ contract, receipt: full }), {
    ready: true, verifiedCount: 5, requiredCount: 5, canConfirm: true, canApprove: false,
  });
  assert.equal(modelReviewApprovalState({ contract, receipt: full, confirmed: true }).canApprove, true);
  assert.equal(modelReviewApprovalState({ contract, receipt: full, confirmed: true, busy: true }).canApprove, false);

  const wrongHash = structuredClone(full);
  wrongHash.artifacts[2].sha256 = '0'.repeat(64);
  assert.equal(modelReviewApprovalState({ contract, receipt: wrongHash, confirmed: true }).canApprove, false);
  const wrongType = structuredClone(full);
  wrongType.artifacts[1].contentType = 'image/jpeg';
  assert.equal(modelReviewApprovalState({ contract, receipt: wrongType, confirmed: true }).canApprove, false);
  const duplicate = structuredClone(full);
  duplicate.artifacts[4] = structuredClone(duplicate.artifacts[3]);
  assert.equal(modelReviewApprovalState({ contract, receipt: duplicate, confirmed: true }).canApprove, false);
  const extra = structuredClone(full);
  extra.artifacts.push({ ...extra.artifacts[0], role: 'undeclared-extra' });
  assert.equal(modelReviewApprovalState({ contract, receipt: extra, confirmed: true }).canApprove, false);
  const staleModel = { ...full, modelVersion: 5 };
  assert.equal(modelReviewApprovalState({ contract, receipt: staleModel, confirmed: true }).canApprove, false);
});

test('GLB inspection requires a complete version-2 binary envelope', () => {
  const bytes = glbFixture();
  assert.deepEqual(inspectGlbContainer(bytes), {
    version: 2,
    byteSize: bytes.byteLength,
    jsonChunkByteSize: bytes.byteLength - 20,
    embeddedResourceCount: 0,
  });

  const staleLength = bytes.slice(0);
  new DataView(staleLength).setUint32(8, 28, true);
  assert.throws(() => inspectGlbContainer(staleLength), /declared byte size/);
  const wrongVersion = bytes.slice(0);
  new DataView(wrongVersion).setUint32(4, 1, true);
  assert.throws(() => inspectGlbContainer(wrongVersion), /version 2/);
  const externalResource = glbFixture({ asset: { version: '2.0' }, images: [{ uri: 'https://example.invalid/private.png' }] });
  assert.throws(() => inspectGlbContainer(externalResource), /external resource URI/);
  assert.throws(() => inspectGlbContainer(new ArrayBuffer(12)), /too small/);
});

test('GLB inspection binds the selected scene to exact geometry, layout and scene-manifest hashes', () => {
  const bindings = {
    geometrySha256: '3'.repeat(64),
    layoutSha256: '4'.repeat(64),
    sceneManifestSha256: SHA.manifest,
  };
  const bytes = glbFixture({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{
      extras: {
        spatialforge_geometry_sha256: bindings.geometrySha256,
        spatialforge_layout_sha256: bindings.layoutSha256,
        spatialforge_scene_manifest_sha256: bindings.sceneManifestSha256,
      },
    }],
  });
  assert.equal(inspectGlbContainer(bytes, bindings).version, 2);
  assert.throws(
    () => inspectGlbContainer(bytes, { ...bindings, layoutSha256: '5'.repeat(64) }),
    /layoutSha256 does not match/,
  );
  assert.throws(
    () => inspectGlbContainer(glbFixture({ asset: { version: '2.0' } }), bindings),
    /no immutable SpatialForge bindings/,
  );
});
