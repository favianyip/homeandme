import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  PROOF_MANIFEST_BYTE_SIZE,
  PROOF_MANIFEST_SHA256,
  collectPublishedDescriptors,
  isSafeProofPath,
  validateCanonicalGeometry,
  validateDesignReference,
  validateGlbBindings,
  validateGlbBytes,
  validateManifestBytes,
  validateNetworkAudit,
  validateProofManifest,
  validateSceneManifest,
  verifyDescriptorBytes,
  sha256Hex,
} from '../reviewed-reference-gallery.js';

const proofRoot = new URL('../assets/reviewed-whole-unit/', import.meta.url);
const proofRootPath = fileURLToPath(proofRoot);
const readText = (name) => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

async function walk(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute, root));
    else if (entry.isFile()) files.push(relative(root, absolute).split('\\').join('/'));
    else assert.fail(`Unexpected proof-tree entry: ${absolute}`);
  }
  return files;
}

test('reviewed whole-unit publication is exactly manifest-bound and semantically self-contained', async () => {
  const manifestBytes = await readFile(new URL('proof-manifest.json', proofRoot));
  assert.equal(manifestBytes.byteLength, PROOF_MANIFEST_BYTE_SIZE);
  assert.equal(createHash('sha256').update(manifestBytes).digest('hex'), PROOF_MANIFEST_SHA256);

  const proof = await validateManifestBytes(manifestBytes);
  const descriptors = collectPublishedDescriptors(proof);
  assert.equal(descriptors.length, 44);
  assert.equal(descriptors.filter((item) => item.mediaType === 'image/png').length, 33);
  assert.equal(descriptors.filter((item) => item.mediaType === 'model/gltf-binary').length, 3);
  assert.equal(descriptors.filter((item) => item.mediaType === 'application/json').length, 8);
  assert.equal(descriptors.reduce((sum, item) => sum + item.byteSize, 0), 24_085_950);

  const contents = new Map();
  for (const descriptor of descriptors) {
    const bytes = await readFile(new URL(descriptor.path, proofRoot));
    await verifyDescriptorBytes(descriptor, bytes);
    contents.set(descriptor.path, bytes);
  }

  validateCanonicalGeometry(JSON.parse(contents.get(proof.fixture.geometryArtifact.path).toString('utf8')), proof);
  validateNetworkAudit(JSON.parse(contents.get(proof.networkAudit.path).toString('utf8')));
  for (const style of proof.styles) {
    const scene = JSON.parse(contents.get(style.files.sceneManifest.path).toString('utf8'));
    validateDesignReference(JSON.parse(contents.get(style.files.designReference.path).toString('utf8')), style);
    validateSceneManifest(scene, style, proof);
    validateGlbBindings(validateGlbBytes(contents.get(style.files.glb.path), style.label), style, proof, scene);
  }

  const actualTree = (await walk(proofRootPath)).sort();
  const expectedTree = ['proof-manifest.json', ...descriptors.map((item) => item.path)].sort();
  assert.deepEqual(actualTree, expectedTree, 'the published proof tree must contain no private or unbound extras');
  assert.equal(manifestBytes.byteLength + descriptors.reduce((sum, item) => sum + item.byteSize, 0), 24_115_564);
});

test('reviewed reference validation fails closed on manifest, flag, path and artifact mutation', async () => {
  const manifestBytes = await readFile(new URL('proof-manifest.json', proofRoot));
  const proof = await validateManifestBytes(manifestBytes);
  const descriptors = collectPublishedDescriptors(proof);

  const changedManifest = Buffer.from(manifestBytes);
  changedManifest[changedManifest.length - 2] ^= 1;
  await assert.rejects(() => validateManifestBytes(changedManifest), /SHA-256 mismatch/i);

  const changedPublication = structuredClone(proof);
  changedPublication.publication.deployed = true;
  assert.throws(() => validateProofManifest(changedPublication), /incorrectly claims it was deployed/i);

  const changedRights = structuredClone(proof);
  changedRights.styles[0].rights.thirdPartyMediaConsumed = true;
  assert.throws(() => validateProofManifest(changedRights), /consumed third-party media/i);

  const imageDescriptor = descriptors.find((item) => item.mediaType === 'image/png');
  const changedImage = Buffer.from(await readFile(new URL(imageDescriptor.path, proofRoot)));
  changedImage[changedImage.length - 1] ^= 1;
  await assert.rejects(() => verifyDescriptorBytes(imageDescriptor, changedImage), /SHA-256 mismatch/i);

  for (const unsafe of ['/absolute.png', '../escape.png', 'assets/../escape.png', 'https:outside.example/file.png', 'folder\\file.png', 'asset.png?stale=1', 'asset%2ejson']) {
    assert.equal(isSafeProofPath(unsafe), false, unsafe);
  }
  assert.equal(isSafeProofPath('assets/hnm-modern-luxe-v1/views/01-overview.png'), true);

  const style = proof.styles[0];
  const scene = JSON.parse(await readFile(new URL(style.files.sceneManifest.path, proofRoot), 'utf8'));
  const parsedGlb = validateGlbBytes(await readFile(new URL(style.files.glb.path, proofRoot)), style.label);
  const mutations = [
    ['spatialforge_design_reference_sha256', 'semantic design-reference binding differs'],
    ['spatialforge_geometry_sha256', 'semantic geometry binding differs'],
    ['spatialforge_layout_sha256', 'layout binding differs'],
    ['spatialforge_scene_manifest_sha256', 'scene-manifest binding differs'],
  ];
  for (const [field, message] of mutations) {
    const changedGlb = structuredClone(parsedGlb);
    changedGlb.scenes[changedGlb.scene].extras[field] = '0'.repeat(64);
    assert.throws(() => validateGlbBindings(changedGlb, style, proof, scene), new RegExp(message, 'i'));
  }
});

test('reviewed reference verifier fails closed when Web Crypto SHA-256 is unavailable', async () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  assert.equal(cryptoDescriptor?.configurable, true);
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try {
    await assert.rejects(() => sha256Hex(new Uint8Array([1, 2, 3])), /Web Crypto SHA-256 is unavailable/i);
  } finally {
    Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
  }
});

test('reviewed reference page states its evidence boundary and has no external runtime asset path', async () => {
  const [page, runtime, css, projectJourney, config, allowlist, readme] = await Promise.all([
    readText('ReviewedReferences.html'),
    readText('reviewed-reference-gallery.js'),
    readText('assets/css/reviewed-references.css'),
    readText('ProjectJourney.html'),
    readText('config.js'),
    readText('deploy/public-pages.txt'),
    readText('README.md'),
  ]);

  assert.match(page, /hash-verified comparison of three rights-safe procedural design references/i);
  assert.match(page, /not detector accuracy, HDB-likeness or as-built evidence/i);
  assert.match(page, /There is no static or demo fallback/i);
  assert.match(page, /<main id="gallery" hidden>/i);
  assert.match(page, /type="module" src="reviewed-reference-gallery\.js"/i);
  assert.doesNotMatch(`${page}\n${runtime}\n${css}`, /https?:\/\/|(?:src|href)\s*=\s*["']\/\//i);

  assert.match(runtime, new RegExp(PROOF_MANIFEST_SHA256));
  assert.match(runtime, /const publication = await recoverPublication/);
  assert.doesNotMatch(runtime, /sha256Fallback/);
  assert.match(runtime, /descriptor\.mediaType === 'application\/json' \? bytes : null/);
  assert.match(runtime, /gallery\.append\(buildGallery/);
  assert.match(runtime, /There is no static, stale-image or demo fallback/i);
  assert.match(runtime, /not detector accuracy, HDB-likeness, an as-built survey/i);
  assert.match(runtime, /does not test floor-plan detection, prove HDB likeness/i);
  assert.match(runtime, /complete camera coverage is not the same as detector completeness/i);
  assert.match(runtime, /nine-space reviewed synthetic geometry/i);
  assert.match(runtime, /Reviewed spaces/);
  assert.doesNotMatch(runtime, /nine-room synthetic geometry/i);
  assert.match(runtime, /local-review-only and not-deployed fields record its generation-time state/i);
  assert.doesNotMatch(runtime, /automatic(?:ally)? detected|detector accuracy (?:is|of) \d|HDB-ready|production-ready/i);

  assert.match(projectJourney, /ReviewedReferences\.html/);
  assert.match(projectJourney, /not detector accuracy, HDB-likeness or an enabled public 3D service/i);
  assert.match(readme, /controlled renderer\/topology workflow reference only/i);
  assert.match(readme, /Pages gallery is a separate static evidence presentation/i);
  assert.match(readme, /all service flags remain off/i);
  for (const flag of ['AI_ANALYSIS_ENABLED', 'GEOMETRY_REVIEW_ENABLED', 'LIVE_3D_ENABLED', 'AI_RENDERING_ENABLED', 'QUOTATION_ENABLED', 'PAYMENTS_ENABLED', 'DEMO_FALLBACK_ENABLED']) {
    assert.match(config, new RegExp(`${flag}:\\s*false`), flag);
  }

  const entries = new Set(allowlist.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')));
  for (const path of ['ReviewedReferences.html', 'reviewed-reference-gallery.js', 'assets/css/reviewed-references.css']) assert.equal(entries.has(path), true, path);
  const proofFiles = await walk(proofRootPath);
  for (const path of proofFiles) assert.equal(entries.has(`assets/reviewed-whole-unit/${path}`), true, path);
  for (const forbidden of ['assets/reviewed-whole-unit/index.html', 'assets/reviewed-whole-unit/review.js', 'assets/reviewed-whole-unit/review.css', 'assets/reviewed-whole-unit/private.sqlite', 'assets/reviewed-whole-unit/scene.blend']) {
    assert.equal(entries.has(forbidden), false, basename(forbidden));
  }
});
