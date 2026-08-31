import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parsePrivateShellGlb } from '../private-shell-glb.js';
import { validatePrivateOrbitRuntimeProvider } from '../private-shell-orbit-viewer.js';
import { PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER } from '../private-shell-webgl-orbit-runtime.js';

function padded(source, fill) {
  const length = Math.ceil(source.byteLength / 4) * 4;
  const output = new Uint8Array(length);
  output.fill(fill);
  output.set(source);
  return output;
}

function buildGlb(document, binary) {
  const json = padded(new TextEncoder().encode(JSON.stringify(document)), 0x20);
  const bin = padded(binary, 0x00);
  const bytes = new ArrayBuffer(12 + 8 + json.byteLength + 8 + bin.byteLength);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, json.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20, json.byteLength).set(json);
  const binHeader = 20 + json.byteLength;
  view.setUint32(binHeader, bin.byteLength, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  new Uint8Array(bytes, binHeader + 8, bin.byteLength).set(bin);
  return bytes;
}

function triangleFixture({ indexed = true } = {}) {
  const positions = new Float32Array([
    0, 0, 0,
    2, 0, 0,
    0, 1, 0,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  const indexBytes = indexed ? new Uint16Array([0, 1, 2]) : null;
  const binary = new Uint8Array(positions.byteLength + normals.byteLength + (indexBytes?.byteLength || 0));
  binary.set(new Uint8Array(positions.buffer), 0);
  binary.set(new Uint8Array(normals.buffer), positions.byteLength);
  if (indexBytes) binary.set(new Uint8Array(indexBytes.buffer), positions.byteLength + normals.byteLength);
  const bufferViews = [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength, target: 34962 },
  ];
  const accessors = [
    { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [2, 1, 0] },
    { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
  ];
  if (indexed) {
    bufferViews.push({
      buffer: 0,
      byteOffset: positions.byteLength + normals.byteLength,
      byteLength: indexBytes.byteLength,
      target: 34963,
    });
    accessors.push({ bufferView: 2, componentType: 5123, count: 3, type: 'SCALAR' });
  }
  const primitive = {
    attributes: { POSITION: 0, NORMAL: 1 },
    material: 0,
    ...(indexed ? { indices: 2 } : {}),
  };
  const document = {
    asset: { version: '2.0', generator: 'Home & Me parser fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, translation: [4, 2, -3] }],
    meshes: [{ primitives: [primitive] }],
    materials: [{
      doubleSided: true,
      pbrMetallicRoughness: { baseColorFactor: [0.8, 0.7, 0.6, 1] },
    }],
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews,
    accessors,
  };
  return { document, binary, bytes: buildGlb(document, binary) };
}

test('bounded GLB decoder applies scene/node transforms to indexed triangles', () => {
  const scene = parsePrivateShellGlb(triangleFixture().bytes);
  assert.deepEqual(scene.counts, { nodes: 1, primitives: 1, vertices: 3, indices: 3 });
  assert.deepEqual(scene.bounds.min, [4, 2, -3]);
  assert.deepEqual(scene.bounds.max, [6, 3, -3]);
  assert.deepEqual(scene.primitives[0].material.color, [0.8, 0.7, 0.6, 1]);
  assert.equal(scene.primitives[0].indices instanceof Uint32Array, true);
});

test('bounded GLB decoder accepts owned non-indexed triangle geometry', () => {
  const scene = parsePrivateShellGlb(triangleFixture({ indexed: false }).bytes);
  assert.equal(scene.primitives[0].indices, null);
  assert.deepEqual(scene.counts, { nodes: 1, primitives: 1, vertices: 3, indices: 3 });
});

test('decoder fails closed on URI, extension, compression and accessor drift', async (t) => {
  const cases = [
    ['buffer URI', (fixture) => { fixture.document.buffers[0].uri = 'mesh.bin'; }, /unsupported fields|URI/],
    ['URI hidden in extras', (fixture) => { fixture.document.scenes[0].extras = { uri: 'https://example.invalid/shell.bin' }; }, /resource URIs/],
    ['unsupported extension', (fixture) => {
      fixture.document.extensionsUsed = ['KHR_draco_mesh_compression'];
      fixture.document.extensionsRequired = ['KHR_draco_mesh_compression'];
    }, /extension is unsupported/],
    ['undeclared material extension', (fixture) => {
      fixture.document.materials[0].extensions = {
        KHR_materials_transmission: { transmissionFactor: 0.5 },
      };
    }, /not declared/],
    ['compressed primitive', (fixture) => {
      fixture.document.meshes[0].primitives[0].extensions = { KHR_draco_mesh_compression: {} };
    }, /uncompressed triangle/],
    ['missing normal', (fixture) => { delete fixture.document.meshes[0].primitives[0].attributes.NORMAL; }, /attributes are unsupported/],
    ['accessor overrun', (fixture) => { fixture.document.accessors[0].count = 300; }, /exceeds its bufferView/],
    ['node cycle', (fixture) => { fixture.document.nodes[0].children = [0]; }, /cycle/],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, () => {
      const fixture = triangleFixture();
      mutate(fixture);
      assert.throws(() => parsePrivateShellGlb(buildGlb(fixture.document, fixture.binary)), expected);
    });
  }

  await t.test('out-of-range index', () => {
    const fixture = triangleFixture();
    const changed = fixture.binary.slice();
    new DataView(changed.buffer).setUint16(changed.byteLength - 2, 9, true);
    assert.throws(() => parsePrivateShellGlb(buildGlb(fixture.document, changed)), /indices are invalid/);
  });
});

test('decoder opens the actual generated HDB4 geometry-only shell GLB', async (t) => {
  const realGlb = new URL(
    '../../ai-interior-platform/artifacts/synthetic_hdb4_bare_shell_regression/approved-scene.glb',
    import.meta.url,
  );
  let bytes;
  try {
    const source = await readFile(realGlb);
    bytes = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  } catch (error) {
    if (error.code === 'ENOENT') {
      t.skip('The cross-repository generated-shell artifact is unavailable in this checkout.');
      return;
    }
    throw error;
  }
  const scene = parsePrivateShellGlb(bytes);
  assert.deepEqual(scene.counts, {
    nodes: 208,
    primitives: 154,
    vertices: 3720,
    indices: 5592,
  });
  assert.ok(Math.abs(scene.bounds.min[0] - -0.1) < 1e-5);
  assert.ok(Math.abs(scene.bounds.max[0] - 10.6) < 1e-5);
  assert.ok(Math.abs(scene.bounds.max[1] - 2.8) < 1e-5);
  assert.ok(Math.abs(scene.bounds.min[2] - -8.9) < 1e-5);
  assert.deepEqual(scene.extensions.required, ['KHR_lights_punctual']);
});

test('bundled provider satisfies the exact read-only contract and contains no network loader', async () => {
  assert.equal(validatePrivateOrbitRuntimeProvider(PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER), PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER);
  const [source, controllerSource] = await Promise.all([
    readFile(new URL('../private-shell-webgl-orbit-runtime.js', import.meta.url), 'utf8'),
    readFile(new URL('../private-shell-workflow-view.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|new\s+Image\s*\(/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.match(source, /getContext\('webgl2'/);
  assert.match(source, /webglcontextlost/);
  assert.match(source, /pointerdown/);
  assert.match(source, /keydown/);
  assert.match(controllerSource, /orbitRuntimeProvider = PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER/);
  assert.match(controllerSource, /homeandme:private-shell-orbit-fatal/);
  assert.match(controllerSource, /this\.#orbitSession\.close\(\)/);
  const [deploy, page, publicScript] = await Promise.all([
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../project-journey.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(deploy, /private-shell-(?:glb|webgl)/);
  assert.doesNotMatch(page, /private-shell-(?:glb|webgl)/);
  assert.doesNotMatch(publicScript, /private-shell-(?:glb|webgl)/);
});
