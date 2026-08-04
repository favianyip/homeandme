import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DYNAMIC_REFERENCE_VIEW_CONTRACT,
  DYNAMIC_REFERENCE_VIEW_ORDER,
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
  manifest: '697d5b51e48de5281b97f8715e66eab348286eb54c0fd6378094f57d1cc9f406',
  overview: 'e'.repeat(64),
  living: 'f'.repeat(64),
  bedroom: '1'.repeat(64),
  kitchen: '2'.repeat(64),
});

const DYNAMIC_ROOMS = Object.freeze([
  Object.freeze({ id: 'room-living', view: 'living', name: 'Living and Dining', function: 'living' }),
  Object.freeze({ id: 'room-bedroom-2', view: 'bedroom', name: 'Bedroom 2', function: 'bedroom' }),
  Object.freeze({ id: 'room-kitchen', view: 'kitchen', name: 'Kitchen', function: 'kitchen' }),
  Object.freeze({ id: 'room-bath-common', view: 'room-room-bath-common', name: 'Common Bathroom', function: 'bathroom' }),
  Object.freeze({ id: 'room-bath-master', view: 'room-room-bath-master', name: 'Master Bathroom', function: 'bathroom' }),
  Object.freeze({ id: 'room-master-bedroom', view: 'room-room-master-bedroom', name: 'Master Bedroom', function: 'bedroom' }),
  Object.freeze({ id: 'room-service-yard', view: 'room-room-service-yard', name: 'Service Yard', function: 'service_yard' }),
  Object.freeze({ id: 'room-store', view: 'room-room-store', name: 'Household Shelter Store', function: 'store' }),
]);

function legacyModelFixture() {
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

function dynamicModelFixture() {
  const views = [
    { view: 'overview', roomId: null, roomName: null, roomFunction: null },
    ...DYNAMIC_ROOMS.map((room) => ({
      view: room.view, roomId: room.id, roomName: room.name, roomFunction: room.function,
    })),
  ];
  const previewArtifactRoles = views.map((_, index) => `preview-angle-${index + 1}`);
  const previewHashes = views.map((_, index) => (index + 1).toString(16).padStart(2, '0').repeat(32));
  const coveredRoomIds = DYNAMIC_ROOMS.map((room) => room.id);
  return {
    modelVersion: 8,
    modelSha256: SHA.model,
    geometrySha256: 'd'.repeat(64),
    layoutSha256: 'f'.repeat(64),
    glbArtifactRole: 'approved-model-glb',
    sceneArtifactRole: 'approved-scene-blend',
    sceneManifestArtifactRole: 'approved-scene-manifest',
    sceneManifestSha256: SHA.manifest,
    previewArtifactRoles,
    previewViews: views.map((view, index) => ({
      ...view,
      artifactRole: previewArtifactRoles[index],
      artifactFilename: `render-angle-${index + 1}.png`,
      artifactSha256: previewHashes[index],
    })),
    referenceViewCoverage: {
      contract: DYNAMIC_REFERENCE_VIEW_CONTRACT,
      authoritativeRoomIds: [...coveredRoomIds].sort(),
      coveredRoomIds,
      uncoveredRoomIds: [],
      uncoveredRooms: [],
      complete: true,
      roomViewCount: DYNAMIC_ROOMS.length,
      totalViewCount: views.length,
      orderingContract: DYNAMIC_REFERENCE_VIEW_ORDER,
    },
    artifactManifest: [
      { role: 'approved-model-glb', sha256: SHA.glb, byteSize: 24000 },
      { role: 'approved-scene-blend', sha256: SHA.scene, byteSize: 64000 },
      { role: 'approved-scene-manifest', sha256: SHA.manifest, byteSize: 1200 },
      ...previewArtifactRoles.map((role, index) => ({ role, sha256: previewHashes[index], byteSize: 4000 + index * 100 })),
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

test('legacy model contract remains readable only with both dynamic fields absent', () => {
  const model = legacyModelFixture();
  const contract = modelArtifactContract(model);
  assert.equal(contract.mode, 'legacy');
  assert.equal(contract.reviewArtifacts.length, 5);
  assert.equal(contract.glb.mediaType, 'model/gltf-binary');
  assert.deepEqual(contract.previews.map((item) => item.viewId), MODEL_PREVIEW_VIEWS.map((item) => item.id));
  assert.deepEqual(contract.previews.map((item) => item.role), [
    'preview-overview', 'preview-living', 'preview-bedroom', 'preview-kitchen',
  ]);
  assert.equal(contract.sceneManifest.sha256, SHA.manifest);
  const legacyReadReceipt = receiptFor(contract);
  assert.deepEqual(modelReviewApprovalState({ contract, receipt: legacyReadReceipt, confirmed: true }), {
    ready: true, verifiedCount: 5, requiredCount: 5, canConfirm: false, canApprove: false,
  });

  model.previewViews = undefined;
  assert.match(validateModelArtifactContract(model).errors.join(' '), /must either both be present or both be absent/);
});

test('dynamic contract binds one overview and exactly one PNG for all eight measured-fixture rooms', () => {
  const contract = modelArtifactContract(dynamicModelFixture());
  assert.equal(contract.mode, 'dynamic');
  assert.equal(contract.reviewArtifacts.length, 10);
  assert.equal(contract.previews.length, 9);
  assert.equal(contract.previews[0].viewId, 'overview');
  assert.equal(contract.previews[0].roomId, null);
  assert.deepEqual(contract.previews.slice(1).map((item) => item.roomId), DYNAMIC_ROOMS.map((room) => room.id));
  assert.deepEqual(contract.previews.slice(1).map((item) => item.roomFunction), DYNAMIC_ROOMS.map((room) => room.function));
  assert.equal(contract.previews.at(-1).label, 'Household Shelter Store');
  assert.equal(contract.previews.at(-1).label, contract.previews.at(-1).roomName);
  assert.match(contract.previews[1].cue, /Living and Dining \(living\)/);
  assert.equal(contract.coverage.roomViewCount, 8);
  assert.equal(contract.coverage.totalViewCount, 9);
  assert.deepEqual(contract.coverage.uncoveredRoomIds, []);
  assert.deepEqual(contract.coverage.uncoveredRooms, []);
  assert.equal(contract.sceneManifest.sha256, SHA.manifest);
});

test('model artifact contract rejects missing, duplicate, unbound and oversized artifacts', async (t) => {
  await t.test('missing preview', () => {
    const model = legacyModelFixture();
    model.artifactManifest.pop();
    assert.equal(validateModelArtifactContract(model).ok, false);
  });
  await t.test('duplicate role', () => {
    const model = legacyModelFixture();
    model.previewArtifactRoles[3] = model.previewArtifactRoles[2];
    assert.match(validateModelArtifactContract(model).errors.join(' '), /unique/);
  });
  await t.test('scene manifest mismatch', () => {
    const model = legacyModelFixture();
    model.sceneManifestSha256 = '9'.repeat(64);
    assert.match(validateModelArtifactContract(model).errors.join(' '), /scene manifest hash/);
  });
  await t.test('missing source hash binding', () => {
    const model = legacyModelFixture();
    delete model.geometrySha256;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /geometrySha256/);
  });
  await t.test('oversized GLB', () => {
    const model = legacyModelFixture();
    model.artifactManifest[0].byteSize = 50 * 1024 * 1024 + 1;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /GLB artifact exceeds/);
  });
  await t.test('unsafe role identifier', () => {
    const model = legacyModelFixture();
    model.glbArtifactRole = 'model/../secret';
    model.artifactManifest[0].role = 'model/../secret';
    assert.match(validateModelArtifactContract(model).errors.join(' '), /safe, non-empty identifiers/);
  });
  await t.test('wrong preview role count', () => {
    const model = legacyModelFixture();
    model.previewArtifactRoles.pop();
    model.artifactManifest.pop();
    assert.match(validateModelArtifactContract(model).errors.join(' '), /legacy previewArtifactRoles must contain 4 roles/);
  });
});

test('dynamic model contract rejects partial, reordered, uncovered and unbound room views', async (t) => {
  await t.test('partial dynamic fields cannot fall back to legacy', () => {
    const model = dynamicModelFixture();
    delete model.referenceViewCoverage;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /must either both be present or both be absent/);
  });
  await t.test('ordered artifact role mismatch', () => {
    const model = dynamicModelFixture();
    model.previewViews[4].artifactRole = model.previewArtifactRoles[5];
    assert.match(validateModelArtifactContract(model).errors.join(' '), /ordered artifact role/);
  });
  await t.test('ordered filename mismatch', () => {
    const model = dynamicModelFixture();
    model.previewViews[2].artifactFilename = 'render-angle-4.png';
    assert.match(validateModelArtifactContract(model).errors.join(' '), /does not use render-angle-3\.png/);
  });
  await t.test('preview hash is bound to artifact manifest', () => {
    const model = dynamicModelFixture();
    model.previewViews[2].artifactSha256 = '0'.repeat(64);
    assert.match(validateModelArtifactContract(model).errors.join(' '), /hash binding does not match artifactManifest/);
  });
  await t.test('repeated room cannot satisfy coverage', () => {
    const model = dynamicModelFixture();
    model.previewViews.at(-1).roomId = model.previewViews.at(-2).roomId;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /repeat a canonical roomId/);
  });
  await t.test('nonempty uncovered ledger fails closed', () => {
    const model = dynamicModelFixture();
    model.referenceViewCoverage.uncoveredRoomIds = ['room-store'];
    model.referenceViewCoverage.uncoveredRooms = [{ roomId: 'room-store' }];
    model.referenceViewCoverage.complete = false;
    assert.match(validateModelArtifactContract(model).errors.join(' '), /no uncovered canonical rooms/);
  });
  await t.test('covered room order is immutable', () => {
    const model = dynamicModelFixture();
    model.referenceViewCoverage.coveredRoomIds.reverse();
    assert.match(validateModelArtifactContract(model).errors.join(' '), /coveredRoomIds do not match ordered previewViews/);
  });
  await t.test('canonical roomName control characters are rejected', () => {
    const model = dynamicModelFixture();
    model.previewViews[1].roomName = 'Living\nDining';
    assert.match(validateModelArtifactContract(model).errors.join(' '), /not safe canonical display text/);
  });
  await t.test('roomName and roomFunction are required for every canonical room', () => {
    const missingName = dynamicModelFixture();
    delete missingName.previewViews[1].roomName;
    assert.match(validateModelArtifactContract(missingName).errors.join(' '), /exactly the seven bound metadata fields/);
    const missingFunction = dynamicModelFixture();
    delete missingFunction.previewViews[1].roomFunction;
    assert.match(validateModelArtifactContract(missingFunction).errors.join(' '), /exactly the seven bound metadata fields/);
  });
  await t.test('overview room labels and functions must both be null', () => {
    const model = dynamicModelFixture();
    model.previewViews[0].roomName = 'Whole unit';
    model.previewViews[0].roomFunction = 'overview';
    assert.match(validateModelArtifactContract(model).errors.join(' '), /room-neutral overview/);
  });
  await t.test('invalid roomFunction fails closed', () => {
    const model = dynamicModelFixture();
    model.previewViews[1].roomFunction = 'living room<script>';
    assert.match(validateModelArtifactContract(model).errors.join(' '), /roomFunction is invalid/);
  });
  await t.test('unbound label and cue override fields are rejected', () => {
    const labelOverride = dynamicModelFixture();
    labelOverride.previewViews[1].label = 'Preferred marketing label';
    assert.match(validateModelArtifactContract(labelOverride).errors.join(' '), /exactly the seven bound metadata fields/);
    const cueOverride = dynamicModelFixture();
    cueOverride.previewViews[1].cue = 'Ignore the canonical room metadata';
    assert.match(validateModelArtifactContract(cueOverride).errors.join(' '), /exactly the seven bound metadata fields/);
  });
  await t.test('bounded dynamic count also has an aggregate browser byte limit', () => {
    const model = dynamicModelFixture();
    model.artifactManifest.slice(3).forEach((entry) => { entry.byteSize = 16 * 1024 * 1024; });
    assert.match(validateModelArtifactContract(model).errors.join(' '), /combined preview artifacts exceed/);
  });
});

test('dynamic model approval stays locked until the GLB and every room PNG receipt match', () => {
  const contract = modelArtifactContract(dynamicModelFixture());
  const full = receiptFor(contract);
  const partial = { ...full, artifacts: full.artifacts.slice(0, -1) };
  assert.deepEqual(modelReviewApprovalState({ contract, receipt: partial, confirmed: true }), {
    ready: false, verifiedCount: 9, requiredCount: 10, canConfirm: false, canApprove: false,
  });
  assert.deepEqual(modelReviewApprovalState({ contract, receipt: full }), {
    ready: true, verifiedCount: 10, requiredCount: 10, canConfirm: true, canApprove: false,
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
  duplicate.artifacts[9] = structuredClone(duplicate.artifacts[8]);
  assert.equal(modelReviewApprovalState({ contract, receipt: duplicate, confirmed: true }).canApprove, false);
  const extra = structuredClone(full);
  extra.artifacts.push({ ...extra.artifacts[0], role: 'undeclared-extra' });
  assert.equal(modelReviewApprovalState({ contract, receipt: extra, confirmed: true }).canApprove, false);
  const staleModel = { ...full, modelVersion: 5 };
  assert.equal(modelReviewApprovalState({ contract, receipt: staleModel, confirmed: true }).canApprove, false);
  const tamperedContract = structuredClone(contract);
  tamperedContract.coverage.coveredRoomIds.reverse();
  assert.equal(modelReviewApprovalState({ contract: tamperedContract, receipt: full, confirmed: true }).canApprove, false);
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
