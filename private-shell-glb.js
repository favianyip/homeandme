/**
 * Bounded glTF 2.x binary decoder for the private geometry-only shell viewer.
 *
 * It intentionally supports the narrow Blender shell profile we own: one internal BIN chunk,
 * selected-scene node hierarchies, matrix/TRS transforms, triangle POSITION/NORMAL attributes,
 * optional TEXCOORD_0, unsigned indices and base-colour materials. It has no URI resolver.
 */

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const TRIANGLES = 4;
const SUPPORTED_EXTENSIONS = new Set([
  'KHR_lights_punctual',
  'KHR_materials_transmission',
  'KHR_materials_ior',
]);
const MAX_NODES = 5000;
const MAX_PRIMITIVES = 5000;
const MAX_VERTICES = 2_000_000;
const MAX_INDICES = 6_000_000;
const MAX_GLB_BYTES = 50 * 1024 * 1024;

function fail(message) {
  throw new TypeError(`Private shell GLB rejected: ${message}`);
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function integer(value, minimum = 0) {
  return Number.isSafeInteger(value) && value >= minimum;
}

function finiteArray(value, length, label) {
  if (!Array.isArray(value) || value.length !== length || value.some((item) => !Number.isFinite(item))) {
    fail(`${label} must contain ${length} finite numbers`);
  }
  return value;
}

function knownKeys(value, allowed, label) {
  if (!record(value) || Object.keys(value).some((key) => !allowed.includes(key))) {
    fail(`${label} contains unsupported fields`);
  }
}

function asArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  fail('input is not binary data');
}

function parseChunks(bytes) {
  const buffer = asArrayBuffer(bytes);
  if (buffer.byteLength < 20 || buffer.byteLength > MAX_GLB_BYTES) {
    fail('binary envelope is truncated or exceeds the private review limit');
  }
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== buffer.byteLength) {
    fail('binary envelope header is invalid');
  }
  let offset = 12;
  let jsonBytes = null;
  let bin = null;
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) fail('chunk header is truncated');
    const byteLength = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    if (byteLength === 0 || byteLength % 4 !== 0 || offset + byteLength > buffer.byteLength) {
      fail('chunk length or padding is invalid');
    }
    if (type === JSON_CHUNK) {
      if (jsonBytes || bin) fail('JSON chunk is duplicated or out of order');
      jsonBytes = new Uint8Array(buffer, offset, byteLength);
    } else if (type === BIN_CHUNK) {
      if (!jsonBytes || bin) fail('BIN chunk is duplicated or out of order');
      bin = { buffer, byteOffset: offset, byteLength };
    } else {
      fail('unknown GLB chunk type is unsupported');
    }
    offset += byteLength;
  }
  if (!jsonBytes || !bin || offset !== buffer.byteLength) fail('JSON or BIN chunk is missing');
  let document;
  try {
    document = JSON.parse(new TextDecoder('utf-8', { fatal: true })
      .decode(jsonBytes).replace(/\u0000+$/g, '').trimEnd());
  } catch (_) {
    fail('JSON chunk is not valid UTF-8 JSON');
  }
  return { buffer, document, bin };
}

function validateExtensions(document) {
  const used = document.extensionsUsed ?? [];
  const required = document.extensionsRequired ?? [];
  if (!Array.isArray(used) || !Array.isArray(required)
    || new Set(used).size !== used.length || new Set(required).size !== required.length
    || [...used, ...required].some((name) => typeof name !== 'string' || !SUPPORTED_EXTENSIONS.has(name))
    || required.some((name) => !used.includes(name))) {
    fail('an extension is unsupported, duplicated or inconsistently required');
  }
  if (document.extensions !== undefined) {
    knownKeys(document.extensions, ['KHR_lights_punctual'], 'root extensions');
  }
  const lightExtension = document.extensions?.KHR_lights_punctual;
  if (used.includes('KHR_lights_punctual')) {
    knownKeys(lightExtension, ['lights'], 'KHR_lights_punctual');
    if (!Array.isArray(lightExtension.lights) || lightExtension.lights.length < 1
      || lightExtension.lights.length > 8) fail('punctual light ledger is invalid');
    lightExtension.lights.forEach((light, index) => {
      knownKeys(light, ['name', 'color', 'intensity', 'type', 'range', 'spot', 'extras'], `light ${index}`);
      if (!['directional', 'point', 'spot'].includes(light.type)
        || (light.color !== undefined && (finiteArray(light.color, 3, `light ${index} colour`)
          .some((item) => item < 0)))
        || (light.intensity !== undefined && (!Number.isFinite(light.intensity) || light.intensity < 0))
        || (light.range !== undefined && (!Number.isFinite(light.range) || light.range <= 0))) {
        fail(`punctual light ${index} is invalid`);
      }
      if (light.type === 'spot') {
        knownKeys(light.spot ?? {}, ['innerConeAngle', 'outerConeAngle'], `spot light ${index}`);
        const inner = light.spot?.innerConeAngle ?? 0;
        const outer = light.spot?.outerConeAngle ?? Math.PI / 4;
        if (!Number.isFinite(inner) || !Number.isFinite(outer)
          || inner < 0 || outer <= inner || outer > Math.PI / 2) fail(`spot light ${index} cone is invalid`);
      }
    });
  } else if (lightExtension !== undefined) {
    fail('punctual lights are declared without extensionsUsed');
  }
  return Object.freeze({ used: Object.freeze([...used]), required: Object.freeze([...required]) });
}

function validateDocumentEnvelope(document, bin) {
  if (!record(document) || !record(document.asset)
    || !/^2(?:\.\d+)?$/.test(document.asset.version || '')) fail('asset is not glTF 2.x');
  knownKeys(document.asset, ['version', 'minVersion', 'generator', 'copyright', 'extras'], 'asset');
  if (document.asset.minVersion !== undefined
    && !/^2(?:\.\d+)?$/.test(document.asset.minVersion)) fail('asset minimum version is unsupported');
  const scanUris = (value) => {
    if (Array.isArray(value)) return value.forEach(scanUris);
    if (!record(value)) return;
    Object.entries(value).forEach(([key, child]) => {
      if (key === 'uri' && typeof child === 'string') fail('resource URIs are unsupported');
      scanUris(child);
    });
  };
  scanUris(document);
  for (const key of ['animations', 'skins', 'cameras', 'images', 'textures', 'samplers']) {
    if (document[key] !== undefined && (!Array.isArray(document[key]) || document[key].length !== 0)) {
      fail(`${key} are outside the geometry-only viewer profile`);
    }
  }
  if (!Array.isArray(document.buffers) || document.buffers.length !== 1) fail('exactly one internal buffer is required');
  const sourceBuffer = document.buffers[0];
  knownKeys(sourceBuffer, ['byteLength', 'name', 'extras'], 'buffer 0');
  if (!integer(sourceBuffer.byteLength, 1) || sourceBuffer.uri !== undefined
    || sourceBuffer.byteLength > bin.byteLength || bin.byteLength - sourceBuffer.byteLength > 3) {
    fail('internal buffer length or URI is invalid');
  }
  if (!Array.isArray(document.bufferViews) || !document.bufferViews.length
    || !Array.isArray(document.accessors) || !document.accessors.length
    || !Array.isArray(document.meshes) || !document.meshes.length
    || !Array.isArray(document.nodes) || !document.nodes.length
    || !Array.isArray(document.scenes) || !document.scenes.length) {
    fail('scene geometry arrays are missing');
  }
  if (document.nodes.length > MAX_NODES) fail('node limit exceeded');
  if (!integer(document.scene) || !document.scenes[document.scene]) fail('selected scene is invalid');
}

function accessorReader(document, bin) {
  const source = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const cache = new Map();
  const componentsByType = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const componentBytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  const readComponent = {
    5121: (offset) => source.getUint8(offset),
    5123: (offset) => source.getUint16(offset, true),
    5125: (offset) => source.getUint32(offset, true),
    5126: (offset) => source.getFloat32(offset, true),
  };

  document.bufferViews.forEach((view, index) => {
    knownKeys(view, ['buffer', 'byteOffset', 'byteLength', 'byteStride', 'target', 'name', 'extras'], `bufferView ${index}`);
    const byteOffset = view.byteOffset ?? 0;
    if (view.buffer !== 0 || !integer(byteOffset) || !integer(view.byteLength, 1)
      || byteOffset + view.byteLength > document.buffers[0].byteLength
      || (view.target !== undefined && ![34962, 34963].includes(view.target))
      || (view.byteStride !== undefined && (!integer(view.byteStride, 4)
        || view.byteStride > 252 || view.byteStride % 4 !== 0))) {
      fail(`bufferView ${index} is malformed`);
    }
  });

  document.accessors.forEach((accessor, index) => {
    knownKeys(accessor, [
      'bufferView', 'byteOffset', 'componentType', 'normalized', 'count', 'type',
      'min', 'max', 'name', 'extras', 'sparse',
    ], `accessor ${index}`);
    if (accessor.sparse !== undefined || accessor.normalized === true
      || !integer(accessor.bufferView) || !document.bufferViews[accessor.bufferView]
      || !integer(accessor.byteOffset ?? 0) || !integer(accessor.count, 1)
      || !componentsByType[accessor.type] || !componentBytes[accessor.componentType]) {
      fail(`accessor ${index} uses unsupported storage`);
    }
    for (const key of ['min', 'max']) {
      if (accessor[key] !== undefined) finiteArray(
        accessor[key], componentsByType[accessor.type], `accessor ${index} ${key}`,
      );
    }
    const view = document.bufferViews[accessor.bufferView];
    const components = componentsByType[accessor.type];
    const elementBytes = components * componentBytes[accessor.componentType];
    const stride = view.byteStride ?? elementBytes;
    const accessorOffset = accessor.byteOffset ?? 0;
    if (stride < elementBytes || stride % componentBytes[accessor.componentType] !== 0
      || accessorOffset % componentBytes[accessor.componentType] !== 0
      || accessorOffset + ((accessor.count - 1) * stride) + elementBytes > view.byteLength) {
      fail(`accessor ${index} exceeds its bufferView`);
    }
  });

  return function readAccessor(index, { type, componentTypes, count = null, label } = {}) {
    if (!integer(index) || !document.accessors[index]) fail(`${label} accessor is missing`);
    const accessor = document.accessors[index];
    if (accessor.type !== type || !componentTypes.includes(accessor.componentType)
      || (count !== null && accessor.count !== count)) fail(`${label} accessor shape is unsupported`);
    const key = `${index}:${type}:${componentTypes.join(',')}`;
    if (cache.has(key)) return cache.get(key);
    const view = document.bufferViews[accessor.bufferView];
    const componentCount = componentsByType[accessor.type];
    const bytesPerComponent = componentBytes[accessor.componentType];
    const elementBytes = componentCount * bytesPerComponent;
    const stride = view.byteStride ?? elementBytes;
    const start = view.byteOffset + (accessor.byteOffset ?? 0);
    const Output = accessor.componentType === 5126 ? Float32Array : Uint32Array;
    const output = new Output(accessor.count * componentCount);
    let cursor = 0;
    for (let item = 0; item < accessor.count; item += 1) {
      const elementOffset = start + item * stride;
      for (let component = 0; component < componentCount; component += 1) {
        const value = readComponent[accessor.componentType](elementOffset + component * bytesPerComponent);
        if (!Number.isFinite(value)) fail(`${label} accessor contains a non-finite value`);
        output[cursor] = value;
        cursor += 1;
      }
    }
    cache.set(key, output);
    return output;
  };
}

export function identityMatrix4() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function multiplyMatrix4(left, right) {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let index = 0; index < 4; index += 1) {
        value += left[index * 4 + row] * right[column * 4 + index];
      }
      result[column * 4 + row] = value;
    }
  }
  return result;
}

function matrixFromNode(node, index) {
  if (node.matrix !== undefined && [node.translation, node.rotation, node.scale]
    .some((value) => value !== undefined)) fail(`node ${index} mixes matrix and TRS`);
  if (node.matrix !== undefined) return new Float32Array(finiteArray(node.matrix, 16, `node ${index} matrix`));
  const translation = node.translation === undefined
    ? [0, 0, 0] : finiteArray(node.translation, 3, `node ${index} translation`);
  const rotation = node.rotation === undefined
    ? [0, 0, 0, 1] : finiteArray(node.rotation, 4, `node ${index} rotation`);
  const scale = node.scale === undefined
    ? [1, 1, 1] : finiteArray(node.scale, 3, `node ${index} scale`);
  if (scale.some((value) => Math.abs(value) < 1e-8)) fail(`node ${index} scale is singular`);
  const length = Math.hypot(...rotation);
  if (length < 1e-8) fail(`node ${index} quaternion is singular`);
  const [x, y, z, w] = rotation.map((value) => value / length);
  const [sx, sy, sz] = scale;
  const x2 = x + x; const y2 = y + y; const z2 = z + z;
  const xx = x * x2; const xy = x * y2; const xz = x * z2;
  const yy = y * y2; const yz = y * z2; const zz = z * z2;
  const wx = w * x2; const wy = w * y2; const wz = w * z2;
  return new Float32Array([
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    translation[0], translation[1], translation[2], 1,
  ]);
}

export function transformPoint3(matrix, x, y, z) {
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-8) fail('node transform produced an invalid homogeneous point');
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
  ];
}

export function normalMatrix3(matrix) {
  const a00 = matrix[0]; const a01 = matrix[4]; const a02 = matrix[8];
  const a10 = matrix[1]; const a11 = matrix[5]; const a12 = matrix[9];
  const a20 = matrix[2]; const a21 = matrix[6]; const a22 = matrix[10];
  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  const determinant = a00 * b01 + a01 * b11 + a02 * b21;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-10) fail('node transform has no normal matrix');
  const inverse = 1 / determinant;
  return new Float32Array([
    b01 * inverse,
    (-a22 * a01 + a02 * a21) * inverse,
    (a12 * a01 - a02 * a11) * inverse,
    b11 * inverse,
    (a22 * a00 - a02 * a20) * inverse,
    (-a12 * a00 + a02 * a10) * inverse,
    b21 * inverse,
    (-a21 * a00 + a01 * a20) * inverse,
    (a11 * a00 - a01 * a10) * inverse,
  ]);
}

function parseMaterials(document, extensionContract) {
  const materials = document.materials ?? [];
  if (!Array.isArray(materials) || materials.length > 256) fail('material ledger is invalid');
  return materials.map((material, index) => {
    knownKeys(material, [
      'name', 'extras', 'pbrMetallicRoughness', 'alphaMode', 'alphaCutoff',
      'doubleSided', 'extensions',
    ], `material ${index}`);
    const pbr = material.pbrMetallicRoughness ?? {};
    knownKeys(pbr, ['baseColorFactor', 'metallicFactor', 'roughnessFactor'], `material ${index} PBR`);
    const color = pbr.baseColorFactor === undefined
      ? [0.8, 0.8, 0.8, 1] : finiteArray(pbr.baseColorFactor, 4, `material ${index} base colour`);
    if (color.some((value) => value < 0 || value > 1)
      || (pbr.metallicFactor !== undefined && (!Number.isFinite(pbr.metallicFactor)
        || pbr.metallicFactor < 0 || pbr.metallicFactor > 1))
      || (pbr.roughnessFactor !== undefined && (!Number.isFinite(pbr.roughnessFactor)
        || pbr.roughnessFactor < 0 || pbr.roughnessFactor > 1))) {
      fail(`material ${index} factors are invalid`);
    }
    const alphaMode = material.alphaMode ?? 'OPAQUE';
    if (!['OPAQUE', 'BLEND'].includes(alphaMode) || material.alphaCutoff !== undefined) {
      fail(`material ${index} alpha mode is unsupported`);
    }
    let transmission = 0;
    let ior = 1.5;
    if (material.extensions !== undefined) {
      knownKeys(material.extensions, [
        'KHR_materials_transmission', 'KHR_materials_ior',
      ], `material ${index} extensions`);
      if (material.extensions.KHR_materials_transmission) {
        if (!extensionContract.used.includes('KHR_materials_transmission')) {
          fail(`material ${index} transmission is not declared in extensionsUsed`);
        }
        knownKeys(material.extensions.KHR_materials_transmission, ['transmissionFactor'], `material ${index} transmission`);
        transmission = material.extensions.KHR_materials_transmission.transmissionFactor ?? 0;
        if (!Number.isFinite(transmission) || transmission < 0 || transmission > 1) {
          fail(`material ${index} transmission is invalid`);
        }
      }
      if (material.extensions.KHR_materials_ior) {
        if (!extensionContract.used.includes('KHR_materials_ior')) {
          fail(`material ${index} IOR is not declared in extensionsUsed`);
        }
        knownKeys(material.extensions.KHR_materials_ior, ['ior'], `material ${index} IOR`);
        ior = material.extensions.KHR_materials_ior.ior ?? 1.5;
        if (!Number.isFinite(ior) || ior < 1 || ior > 3) fail(`material ${index} IOR is invalid`);
      }
    }
    const alpha = alphaMode === 'BLEND'
      ? Math.max(0.12, color[3] * (1 - transmission * 0.45)) : 1;
    return Object.freeze({
      color: Object.freeze([color[0], color[1], color[2], alpha]),
      doubleSided: material.doubleSided === true,
      alphaMode,
      transmission,
      ior,
    });
  });
}

/** Decode an already receipt-verified GLB into a bounded CPU scene. Performs no I/O. */
export function parsePrivateShellGlb(bytes) {
  const { document, bin } = parseChunks(bytes);
  const extensions = validateExtensions(document);
  validateDocumentEnvelope(document, bin);
  const readAccessor = accessorReader(document, bin);
  const materials = parseMaterials(document, extensions);
  const fallbackMaterial = Object.freeze({
    color: Object.freeze([0.8, 0.8, 0.8, 1]),
    doubleSided: false,
    alphaMode: 'OPAQUE',
    transmission: 0,
    ior: 1.5,
  });
  let totalVertices = 0;
  let totalIndices = 0;
  const primitives = [];
  const boundsMin = [Infinity, Infinity, Infinity];
  const boundsMax = [-Infinity, -Infinity, -Infinity];
  const selectedScene = document.scenes[document.scene];
  knownKeys(selectedScene, ['name', 'nodes', 'extras', 'extensions'], 'selected scene');
  if (selectedScene.extensions !== undefined || !Array.isArray(selectedScene.nodes)
    || !selectedScene.nodes.length || new Set(selectedScene.nodes).size !== selectedScene.nodes.length) {
    fail('selected scene roots are invalid');
  }
  const visiting = new Set();
  const visited = new Set();

  const walk = (nodeIndex, parentMatrix) => {
    if (!integer(nodeIndex) || !document.nodes[nodeIndex]) fail('scene references a missing node');
    if (visiting.has(nodeIndex)) fail('node hierarchy contains a cycle');
    if (visited.has(nodeIndex)) fail('node hierarchy contains duplicate ownership');
    visiting.add(nodeIndex);
    visited.add(nodeIndex);
    const node = document.nodes[nodeIndex];
    knownKeys(node, [
      'name', 'extras', 'mesh', 'children', 'matrix', 'translation', 'rotation', 'scale', 'extensions',
    ], `node ${nodeIndex}`);
    if (node.extensions !== undefined) {
      knownKeys(node.extensions, ['KHR_lights_punctual'], `node ${nodeIndex} extensions`);
      const light = node.extensions.KHR_lights_punctual;
      knownKeys(light, ['light'], `node ${nodeIndex} punctual light`);
      if (!integer(light.light)
        || !document.extensions?.KHR_lights_punctual?.lights?.[light.light]) {
        fail(`node ${nodeIndex} references a missing light`);
      }
    }
    const worldMatrix = multiplyMatrix4(parentMatrix, matrixFromNode(node, nodeIndex));
    normalMatrix3(worldMatrix);
    if (node.mesh !== undefined) {
      if (!integer(node.mesh) || !document.meshes[node.mesh]) fail(`node ${nodeIndex} mesh is missing`);
      const mesh = document.meshes[node.mesh];
      knownKeys(mesh, ['name', 'primitives', 'weights', 'extras'], `mesh ${node.mesh}`);
      if (mesh.weights !== undefined || !Array.isArray(mesh.primitives) || !mesh.primitives.length) {
        fail(`mesh ${node.mesh} is unsupported`);
      }
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        knownKeys(primitive, [
          'attributes', 'indices', 'material', 'mode', 'extras', 'extensions', 'targets',
        ], `mesh ${node.mesh} primitive ${primitiveIndex}`);
        if (primitive.extensions !== undefined || primitive.targets !== undefined
          || (primitive.mode ?? TRIANGLES) !== TRIANGLES || !record(primitive.attributes)) {
          fail(`mesh ${node.mesh} primitive ${primitiveIndex} is not an uncompressed triangle primitive`);
        }
        const attributeKeys = Object.keys(primitive.attributes);
        if (!attributeKeys.includes('POSITION') || !attributeKeys.includes('NORMAL')
          || attributeKeys.some((name) => !['POSITION', 'NORMAL', 'TEXCOORD_0'].includes(name))) {
          fail(`mesh ${node.mesh} primitive ${primitiveIndex} attributes are unsupported`);
        }
        const positionAccessor = document.accessors[primitive.attributes.POSITION];
        if (!positionAccessor) fail('POSITION accessor is missing');
        const positions = readAccessor(primitive.attributes.POSITION, {
          type: 'VEC3', componentTypes: [5126], label: 'POSITION',
        });
        const vertexCount = positionAccessor.count;
        const normals = readAccessor(primitive.attributes.NORMAL, {
          type: 'VEC3', componentTypes: [5126], count: vertexCount, label: 'NORMAL',
        });
        if (primitive.attributes.TEXCOORD_0 !== undefined) {
          readAccessor(primitive.attributes.TEXCOORD_0, {
            type: 'VEC2', componentTypes: [5126], count: vertexCount, label: 'TEXCOORD_0',
          });
        }
        let indices = null;
        if (primitive.indices !== undefined) {
          const indexAccessor = document.accessors[primitive.indices];
          indices = readAccessor(primitive.indices, {
            type: 'SCALAR', componentTypes: [5121, 5123, 5125], label: 'indices',
          });
          if (indexAccessor.count % 3 !== 0 || indices.some((value) => value >= vertexCount)) {
            fail(`mesh ${node.mesh} primitive ${primitiveIndex} indices are invalid`);
          }
        } else if (vertexCount % 3 !== 0) {
          fail(`mesh ${node.mesh} primitive ${primitiveIndex} non-indexed vertices are invalid`);
        }
        totalVertices += vertexCount;
        totalIndices += indices?.length ?? vertexCount;
        if (totalVertices > MAX_VERTICES || totalIndices > MAX_INDICES
          || primitives.length >= MAX_PRIMITIVES) fail('geometry limits are exceeded');
        const localMin = [Infinity, Infinity, Infinity];
        const localMax = [-Infinity, -Infinity, -Infinity];
        for (let index = 0; index < positions.length; index += 3) {
          const world = transformPoint3(worldMatrix, positions[index], positions[index + 1], positions[index + 2]);
          for (let axis = 0; axis < 3; axis += 1) {
            localMin[axis] = Math.min(localMin[axis], world[axis]);
            localMax[axis] = Math.max(localMax[axis], world[axis]);
            boundsMin[axis] = Math.min(boundsMin[axis], world[axis]);
            boundsMax[axis] = Math.max(boundsMax[axis], world[axis]);
          }
        }
        const material = primitive.material === undefined
          ? fallbackMaterial : materials[primitive.material];
        if (!material) fail(`mesh ${node.mesh} primitive ${primitiveIndex} material is missing`);
        primitives.push(Object.freeze({
          positions,
          normals,
          indices,
          worldMatrix,
          normalMatrix: normalMatrix3(worldMatrix),
          material,
          center: Object.freeze(localMin.map((value, axis) => (value + localMax[axis]) / 2)),
        }));
      });
    }
    const children = node.children ?? [];
    if (!Array.isArray(children) || new Set(children).size !== children.length) {
      fail(`node ${nodeIndex} children are invalid`);
    }
    children.forEach((child) => walk(child, worldMatrix));
    visiting.delete(nodeIndex);
  };

  selectedScene.nodes.forEach((nodeIndex) => walk(nodeIndex, identityMatrix4()));
  if (!primitives.length || boundsMin.some((value) => !Number.isFinite(value))
    || boundsMax.some((value) => !Number.isFinite(value))) fail('selected scene has no renderable geometry');
  const size = boundsMin.map((value, axis) => boundsMax[axis] - value);
  if (Math.max(...size) < 1e-6) fail('selected scene bounds are degenerate');
  return Object.freeze({
    schema: 'homeandme-private-shell-cpu-scene/1',
    primitives: Object.freeze(primitives),
    bounds: Object.freeze({
      min: Object.freeze([...boundsMin]),
      max: Object.freeze([...boundsMax]),
      center: Object.freeze(boundsMin.map((value, axis) => (value + boundsMax[axis]) / 2)),
      size: Object.freeze(size),
    }),
    counts: Object.freeze({
      nodes: visited.size,
      primitives: primitives.length,
      vertices: totalVertices,
      indices: totalIndices,
    }),
    extensions,
  });
}
