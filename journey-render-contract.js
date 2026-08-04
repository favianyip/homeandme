// Version-bound deterministic rendering contract.
// The current renderer opens the approved Blender scene directly. It does not use prompts,
// viewer captures, depth/normal conditioning, or generative AI.

export const RENDER_REQUEST_SCHEMA = 'hnm-render-request/1';
export const DETERMINISTIC_RENDERER = 'blender-approved-scene/1';
export const CAMERA_COORDINATE_CONTRACT = 'three-glb-y-up-to-blender-z-up/1';
export const RENDER_JOB_STATES = Object.freeze([
  'queued', 'preparing', 'rendering', 'postprocessing', 'completed', 'failed', 'cancelled',
]);

const TRANSITIONS = Object.freeze({
  queued: ['preparing', 'cancelled', 'failed'],
  preparing: ['rendering', 'cancelled', 'failed'],
  rendering: ['postprocessing', 'cancelled', 'failed'],
  postprocessing: ['completed', 'failed'],
  completed: [], failed: [], cancelled: [],
});

const HASH = /^[a-f0-9]{64}$/;
const TOP_LEVEL_KEYS = Object.freeze([
  'schema', 'projectId', 'projectRevision', 'geometrySha256', 'modelVersion', 'modelSha256',
  'createdAt', 'mode', 'camera', 'output', 'scene', 'conditioning', 'prompt', 'renderer',
]);
const NESTED_KEYS = Object.freeze({
  camera: ['position', 'target', 'up', 'fovDegrees', 'near', 'far'],
  output: ['width', 'height', 'quality', 'format'],
  scene: ['viewerState', 'lightingPreset', 'environmentPreset', 'materialRevision'],
  conditioning: [
    'colorArtifactRole', 'depthArtifactRole', 'normalArtifactRole', 'preserveGeometry',
  ],
  prompt: ['positive', 'negative'],
});

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteVec3 = (value) => Array.isArray(value)
  && value.length === 3
  && value.every((item) => Number.isFinite(item) && item >= -1000 && item <= 1000);
const length3 = (value) => Math.hypot(value[0], value[1], value[2]);
const subtract3 = (left, right) => left.map((value, index) => value - right[index]);
const cross3 = (left, right) => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];

function exactObject(value, path, expectedKeys, errors) {
  if (!record(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const actual = Object.keys(value);
  for (const key of actual) {
    if (!expectedKeys.includes(key)) errors.push(`${path}.${key} is not supported`);
  }
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
  }
  return true;
}

export function createRenderRequest(input = {}) {
  if (!record(input)) throw new TypeError('Render request input must be an object.');
  const camera = { up: [0, 1, 0], fovDegrees: 65, near: 0.01, far: 1000, ...input.camera };
  const output = {
    width: 1024, height: 1024, quality: 'preview', format: 'image/png', ...input.output,
  };
  const scene = {
    viewerState: null,
    lightingPreset: 'approved-scene',
    environmentPreset: 'approved-scene',
    materialRevision: undefined,
    ...input.scene,
  };
  const conditioning = {
    colorArtifactRole: null,
    depthArtifactRole: null,
    normalArtifactRole: null,
    preserveGeometry: true,
    ...input.conditioning,
  };
  const prompt = { positive: '', negative: '', ...input.prompt };
  const request = {
    schema: RENDER_REQUEST_SCHEMA,
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
    mode: input.mode ?? 'perspective',
    camera,
    output,
    scene,
    conditioning,
    prompt,
    renderer: input.renderer ?? DETERMINISTIC_RENDERER,
  };
  const validation = validateRenderRequest(request);
  if (!validation.ok) {
    throw new TypeError(`Invalid deterministic render request: ${validation.errors.join('; ')}`);
  }
  return request;
}

export function validateRenderRequest(request) {
  const errors = [];
  if (!exactObject(request, 'request', TOP_LEVEL_KEYS, errors)) {
    return { ok: false, errors };
  }
  if (request.schema !== RENDER_REQUEST_SCHEMA) errors.push('unsupported render request schema');
  if (typeof request.projectId !== 'string' || request.projectId.length < 1
    || request.projectId.length > 128) errors.push('projectId must contain 1 to 128 characters');
  if (!Number.isInteger(request.projectRevision) || request.projectRevision < 1) {
    errors.push('projectRevision must be a positive integer');
  }
  if (!HASH.test(request.geometrySha256 || '')) {
    errors.push('geometrySha256 must be a lowercase SHA-256 hex digest');
  }
  if (!Number.isInteger(request.modelVersion) || request.modelVersion < 1) {
    errors.push('modelVersion must be a positive integer');
  }
  if (!HASH.test(request.modelSha256 || '')) {
    errors.push('modelSha256 must be a lowercase SHA-256 hex digest');
  }
  if (typeof request.createdAt !== 'string'
    || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(request.createdAt)
    || !Number.isFinite(Date.parse(request.createdAt))) {
    errors.push('createdAt must be a valid timestamp with a timezone offset');
  }
  if (request.mode !== 'perspective') errors.push('only perspective render mode is supported');

  if (exactObject(request.camera, 'camera', NESTED_KEYS.camera, errors)) {
    const { position, target, up, fovDegrees, near, far } = request.camera;
    if (!finiteVec3(position) || !finiteVec3(target) || !finiteVec3(up)) {
      errors.push('camera vectors must contain three finite coordinates from -1000 to 1000');
    } else {
      const forward = subtract3(target, position);
      const forwardLength = length3(forward);
      const upLength = length3(up);
      if (forwardLength < 0.001) errors.push('camera position and target must differ by 1 mm');
      if (upLength < 0.001) errors.push('camera up vector must be non-zero');
      if (forwardLength >= 0.001 && upLength >= 0.001
        && length3(cross3(forward, up)) / (forwardLength * upLength) < 0.001) {
        errors.push('camera up vector must not be parallel to the view direction');
      }
    }
    if (!Number.isFinite(fovDegrees) || fovDegrees < 10 || fovDegrees > 120) {
      errors.push('camera FOV must be between 10 and 120 degrees');
    }
    if (!Number.isFinite(near) || near < 0.001 || near > 100
      || !Number.isFinite(far) || far <= near || far > 5000) {
      errors.push('camera clipping range is invalid');
    }
  }

  if (exactObject(request.output, 'output', NESTED_KEYS.output, errors)) {
    for (const axis of ['width', 'height']) {
      const value = request.output[axis];
      if (!Number.isInteger(value) || value < 256 || value > 4096) {
        errors.push(`${axis} must be an integer from 256 to 4096`);
      }
    }
    if (Number.isInteger(request.output.width) && Number.isInteger(request.output.height)
      && request.output.width * request.output.height > 8_388_608) {
      errors.push('render output must not exceed 8,388,608 pixels');
    }
    if (!['preview', 'standard', 'high'].includes(request.output.quality)) {
      errors.push('unsupported output quality');
    }
    if (request.output.format !== 'image/png') errors.push('only image/png output is supported');
  }

  if (exactObject(request.scene, 'scene', NESTED_KEYS.scene, errors)) {
    if (request.scene.viewerState !== null) errors.push('scene.viewerState must be null');
    if (request.scene.lightingPreset !== 'approved-scene') {
      errors.push('lightingPreset must be approved-scene');
    }
    if (request.scene.environmentPreset !== 'approved-scene') {
      errors.push('environmentPreset must be approved-scene');
    }
    if (typeof request.scene.materialRevision !== 'string'
      || request.scene.materialRevision.length < 1
      || request.scene.materialRevision.length > 128) {
      errors.push('materialRevision must contain 1 to 128 characters');
    }
  }

  if (exactObject(request.conditioning, 'conditioning', NESTED_KEYS.conditioning, errors)) {
    for (const role of ['colorArtifactRole', 'depthArtifactRole', 'normalArtifactRole']) {
      if (request.conditioning[role] !== null) errors.push(`${role} must be null`);
    }
    if (request.conditioning.preserveGeometry !== true) {
      errors.push('preserveGeometry must be true');
    }
  }
  if (exactObject(request.prompt, 'prompt', NESTED_KEYS.prompt, errors)
    && (request.prompt.positive !== '' || request.prompt.negative !== '')) {
    errors.push('deterministic rendering requires empty prompts');
  }
  if (request.renderer !== DETERMINISTIC_RENDERER) {
    errors.push(`renderer must be ${DETERMINISTIC_RENDERER}`);
  }
  return { ok: errors.length === 0, errors };
}

export function canTransitionRenderJob(from, to) {
  return RENDER_JOB_STATES.includes(from) && RENDER_JOB_STATES.includes(to)
    && TRANSITIONS[from].includes(to);
}
