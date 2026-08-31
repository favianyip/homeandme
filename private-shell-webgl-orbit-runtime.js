import {
  PRIVATE_SHELL_ORBIT_INPUT_CONTRACT,
  PRIVATE_SHELL_ORBIT_RENDER_POLICY,
  PRIVATE_SHELL_ORBIT_RUNTIME_CONTRACT,
} from './private-shell-orbit-viewer.js';
import {
  multiplyMatrix4,
  parsePrivateShellGlb,
} from './private-shell-glb.js';

const FOV_Y = Math.PI / 4;
const MIN_PITCH = 0.14;
const MAX_PITCH = 1.43;
const CLEAR_COLOR = [0.86, 0.865, 0.84, 1];

function fail(message) {
  throw new Error(`Private shell WebGL runtime failed: ${message}`);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function subtract(left, right) {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function addScaled(source, direction, scale) {
  return [
    source[0] + direction[0] * scale,
    source[1] + direction[1] * scale,
    source[2] + direction[2] * scale,
  ];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length < 1e-9) fail('camera basis is singular');
  return vector.map((value) => value / length);
}

function perspectiveMatrix(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * range, -1,
    0, 0, 2 * near * far * range, 0,
  ]);
}

function lookAtMatrix(eye, target) {
  const forward = normalize(subtract(eye, target));
  let right = cross([0, 1, 0], forward);
  if (Math.hypot(...right) < 1e-7) right = cross([0, 0, 1], forward);
  right = normalize(right);
  const up = cross(forward, right);
  return new Float32Array([
    right[0], up[0], forward[0], 0,
    right[1], up[1], forward[1], 0,
    right[2], up[2], forward[2], 0,
    -right[0] * eye[0] - right[1] * eye[1] - right[2] * eye[2],
    -up[0] * eye[0] - up[1] * eye[1] - up[2] * eye[2],
    -forward[0] * eye[0] - forward[1] * eye[1] - forward[2] * eye[2],
    1,
  ]);
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) fail('shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'unknown shader error';
    gl.deleteShader(shader);
    fail(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_normal;
    uniform mat4 u_model;
    uniform mat4 u_view_projection;
    uniform mat3 u_normal_matrix;
    out vec3 v_normal;
    void main() {
      v_normal = normalize(u_normal_matrix * a_normal);
      gl_Position = u_view_projection * u_model * vec4(a_position, 1.0);
    }
  `);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    in vec3 v_normal;
    uniform vec4 u_base_color;
    out vec4 output_color;
    void main() {
      vec3 normal = normalize(v_normal);
      if (!gl_FrontFacing) normal = -normal;
      vec3 key = normalize(vec3(0.48, 0.84, 0.34));
      vec3 fill = normalize(vec3(-0.72, 0.35, -0.58));
      float keyLight = max(dot(normal, key), 0.0);
      float fillLight = max(dot(normal, fill), 0.0);
      float light = 0.38 + keyLight * 0.54 + fillLight * 0.18;
      vec3 colour = u_base_color.rgb * light;
      output_color = vec4(colour, u_base_color.a);
    }
  `);
  const program = gl.createProgram();
  if (!program) fail('program allocation failed');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'unknown link error';
    gl.deleteProgram(program);
    fail(message);
  }
  const uniforms = {
    model: gl.getUniformLocation(program, 'u_model'),
    viewProjection: gl.getUniformLocation(program, 'u_view_projection'),
    normalMatrix: gl.getUniformLocation(program, 'u_normal_matrix'),
    baseColor: gl.getUniformLocation(program, 'u_base_color'),
  };
  if (Object.values(uniforms).some((location) => location === null)) {
    gl.deleteProgram(program);
    fail('shader uniform contract is incomplete');
  }
  return { program, uniforms };
}

function createGpuPrimitive(gl, source) {
  const vao = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  if (!vao || !positionBuffer || !normalBuffer) fail('geometry allocation failed');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, source.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, source.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  let indexBuffer = null;
  if (source.indices) {
    indexBuffer = gl.createBuffer();
    if (!indexBuffer) fail('index allocation failed');
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, source.indices, gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return {
    vao,
    positionBuffer,
    normalBuffer,
    indexBuffer,
    indexed: Boolean(source.indices),
    count: source.indices?.length ?? source.positions.length / 3,
    model: source.worldMatrix,
    normalMatrix: source.normalMatrix,
    material: source.material,
    center: source.center,
  };
}

function deleteGpuPrimitive(gl, primitive) {
  if (primitive.indexBuffer) gl.deleteBuffer(primitive.indexBuffer);
  gl.deleteBuffer(primitive.normalBuffer);
  gl.deleteBuffer(primitive.positionBuffer);
  gl.deleteVertexArray(primitive.vao);
}

function validateMountInput(input) {
  if (!input || !(input.artifactBytes instanceof ArrayBuffer)
    || typeof input.objectUrl !== 'string' || !input.objectUrl.startsWith('blob:')
    || !input.receipt || input.receipt.schema !== 'homeandme-private-shell-orbit-presentation/1'
    || input.artifactBytes.byteLength !== input.receipt.artifactByteSize
    || input.readOnly !== true || !input.signal || typeof input.signal.addEventListener !== 'function'
    || typeof Element === 'undefined' || !(input.viewport instanceof Element)) {
    fail('mount input is not a receipt-bound read-only browser artifact');
  }
}

async function mountPrivateShellWebGl(input) {
  validateMountInput(input);
  if (input.signal.aborted) fail('mount was already aborted');
  const cpuScene = parsePrivateShellGlb(input.artifactBytes);
  const viewport = input.viewport;
  const canvas = document.createElement('canvas');
  canvas.className = 'psw-orbit-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const failure = document.createElement('div');
  failure.className = 'psw-orbit-runtime-failure';
  failure.setAttribute('role', 'alert');
  failure.hidden = true;
  viewport.replaceChildren(canvas, failure);
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    viewport.replaceChildren();
    fail('WebGL2 is unavailable');
  }

  let disposed = false;
  let contextLost = false;
  let fatal = false;
  let frame = 0;
  let resizeObserver = null;
  let programState = null;
  const gpuPrimitives = [];
  const listeners = [];
  const pointers = new Map();
  let pointerMode = 'orbit';
  let lastSingle = null;
  let lastGesture = null;
  const target = [...cpuScene.bounds.center];
  let yaw = Math.PI * 0.72;
  let pitch = 0.67;
  let radius = 1;
  const span = Math.max(...cpuScene.bounds.size);
  const sphereRadius = Math.hypot(...cpuScene.bounds.size) / 2;

  const listen = (element, type, handler, options) => {
    element.addEventListener(type, handler, options);
    listeners.push(() => element.removeEventListener(type, handler, options));
  };

  const cameraEye = () => {
    const horizontal = Math.cos(pitch) * radius;
    return [
      target[0] + Math.sin(yaw) * horizontal,
      target[1] + Math.sin(pitch) * radius,
      target[2] + Math.cos(yaw) * horizontal,
    ];
  };

  const scheduleRender = () => {
    if (disposed || contextLost || fatal || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (disposed || contextLost || fatal) return;
      const width = Math.max(1, canvas.width);
      const height = Math.max(1, canvas.height);
      const aspect = width / height;
      const eye = cameraEye();
      const near = Math.max(0.005, radius / 500);
      const far = Math.max(near + 1, radius + sphereRadius * 8);
      const projection = perspectiveMatrix(FOV_Y, aspect, near, far);
      const view = lookAtMatrix(eye, target);
      const viewProjection = multiplyMatrix4(projection, view);
      gl.viewport(0, 0, width, height);
      gl.clearColor(...CLEAR_COLOR);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.useProgram(programState.program);
      gl.uniformMatrix4fv(programState.uniforms.viewProjection, false, viewProjection);
      const opaque = gpuPrimitives.filter((item) => item.material.alphaMode === 'OPAQUE');
      const transparent = gpuPrimitives
        .filter((item) => item.material.alphaMode === 'BLEND')
        .sort((left, right) => {
          const leftDistance = Math.hypot(...subtract(left.center, eye));
          const rightDistance = Math.hypot(...subtract(right.center, eye));
          return rightDistance - leftDistance;
        });
      const draw = (primitive) => {
        if (primitive.material.doubleSided) gl.disable(gl.CULL_FACE);
        else {
          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.BACK);
        }
        gl.uniformMatrix4fv(programState.uniforms.model, false, primitive.model);
        gl.uniformMatrix3fv(programState.uniforms.normalMatrix, false, primitive.normalMatrix);
        gl.uniform4fv(programState.uniforms.baseColor, primitive.material.color);
        gl.bindVertexArray(primitive.vao);
        if (primitive.indexed) gl.drawElements(gl.TRIANGLES, primitive.count, gl.UNSIGNED_INT, 0);
        else gl.drawArrays(gl.TRIANGLES, 0, primitive.count);
      };
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      opaque.forEach(draw);
      if (transparent.length) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        transparent.forEach(draw);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(null);
      if (gl.getError() !== gl.NO_ERROR) {
        fatal = true;
        canvas.hidden = true;
        failure.hidden = false;
        failure.textContent = 'The local renderer encountered a WebGL error and stopped.';
        viewport.dispatchEvent(new CustomEvent('homeandme:private-shell-orbit-fatal', {
          bubbles: true,
          detail: { message: failure.textContent },
        }));
      }
    });
  };

  const fitRadius = () => {
    const aspect = Math.max(0.25, (canvas.clientWidth || 1) / (canvas.clientHeight || 1));
    const horizontalFov = 2 * Math.atan(Math.tan(FOV_Y / 2) * aspect);
    const limitingFov = Math.min(FOV_Y, horizontalFov);
    return Math.max(span * 0.8, (sphereRadius / Math.sin(limitingFov / 2)) * 1.18);
  };

  const resetView = () => {
    target.splice(0, 3, ...cpuScene.bounds.center);
    yaw = Math.PI * 0.72;
    pitch = 0.67;
    radius = fitRadius();
    scheduleRender();
  };

  const resize = () => {
    if (disposed || contextLost) return;
    const width = Math.max(1, viewport.clientWidth || 640);
    const height = Math.max(1, viewport.clientHeight || 420);
    const ratio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    const nextWidth = Math.round(width * ratio);
    const nextHeight = Math.round(height * ratio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    scheduleRender();
  };

  const pan = (deltaX, deltaY) => {
    const eye = cameraEye();
    const forward = normalize(subtract(target, eye));
    const right = normalize(cross(forward, [0, 1, 0]));
    const cameraUp = normalize(cross(right, forward));
    const scale = (2 * radius * Math.tan(FOV_Y / 2)) / Math.max(240, canvas.clientHeight || 420);
    let next = addScaled(target, right, -deltaX * scale);
    next = addScaled(next, cameraUp, deltaY * scale);
    const displacement = subtract(next, cpuScene.bounds.center);
    const distance = Math.hypot(...displacement);
    if (distance > span * 2.5) next = addScaled(cpuScene.bounds.center, normalize(displacement), span * 2.5);
    target.splice(0, 3, ...next);
    scheduleRender();
  };

  const orbit = (deltaX, deltaY) => {
    yaw -= deltaX * 0.008;
    pitch = clamp(pitch + deltaY * 0.008, MIN_PITCH, MAX_PITCH);
    scheduleRender();
  };

  const zoom = (factor) => {
    radius = clamp(radius * factor, Math.max(span * 0.18, 0.15), Math.max(span * 16, 20));
    scheduleRender();
  };

  const gestureState = () => {
    const points = [...pointers.values()];
    if (points.length < 2) return null;
    return {
      centerX: (points[0].x + points[1].x) / 2,
      centerY: (points[0].y + points[1].y) / 2,
      distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
    };
  };

  const onPointerDown = (event) => {
    if (![0, 1, 2].includes(event.button) && event.pointerType !== 'touch') return;
    event.preventDefault();
    try { viewport.focus({ preventScroll: true }); } catch (_) { viewport.focus(); }
    try { canvas.setPointerCapture?.(event.pointerId); } catch (_) { /* genuine drags still proceed */ }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerMode = event.shiftKey || event.button === 1 || event.button === 2 ? 'pan' : 'orbit';
    lastSingle = { x: event.clientX, y: event.clientY };
    lastGesture = gestureState();
  };
  const onPointerMove = (event) => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const current = gestureState();
      if (lastGesture && current) {
        if (lastGesture.distance > 1 && current.distance > 1) zoom(lastGesture.distance / current.distance);
        pan(current.centerX - lastGesture.centerX, current.centerY - lastGesture.centerY);
      }
      lastGesture = current;
      return;
    }
    if (!lastSingle) lastSingle = { x: event.clientX, y: event.clientY };
    const dx = event.clientX - lastSingle.x;
    const dy = event.clientY - lastSingle.y;
    if (pointerMode === 'pan') pan(dx, dy); else orbit(dx, dy);
    lastSingle = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event) => {
    pointers.delete(event.pointerId);
    lastGesture = gestureState();
    const remaining = [...pointers.values()][0];
    lastSingle = remaining ? { ...remaining } : null;
  };
  const onWheel = (event) => {
    event.preventDefault();
    zoom(Math.exp(clamp(event.deltaY, -120, 120) * 0.0018));
  };
  const onKeyDown = (event) => {
    const orbitStep = 15;
    const panStep = 18;
    let handled = true;
    if (event.key === 'ArrowLeft') (event.shiftKey ? pan(-panStep, 0) : orbit(orbitStep, 0));
    else if (event.key === 'ArrowRight') (event.shiftKey ? pan(panStep, 0) : orbit(-orbitStep, 0));
    else if (event.key === 'ArrowUp') (event.shiftKey ? pan(0, -panStep) : orbit(0, -orbitStep));
    else if (event.key === 'ArrowDown') (event.shiftKey ? pan(0, panStep) : orbit(0, orbitStep));
    else if (['+', '='].includes(event.key)) zoom(0.88);
    else if (['-', '_'].includes(event.key)) zoom(1.14);
    else if (event.key === '0') resetView();
    else handled = false;
    if (handled) event.preventDefault();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver?.disconnect();
    resizeObserver = null;
    listeners.splice(0).forEach((remove) => remove());
    pointers.clear();
    if (!contextLost) {
      gpuPrimitives.splice(0).forEach((primitive) => deleteGpuPrimitive(gl, primitive));
      if (programState?.program) gl.deleteProgram(programState.program);
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    }
    programState = null;
    canvas.remove();
    failure.remove();
  };

  try {
    programState = createProgram(gl);
    cpuScene.primitives.forEach((primitive) => gpuPrimitives.push(createGpuPrimitive(gl, primitive)));
    gl.enable(gl.DEPTH_TEST);
    if (gl.getError() !== gl.NO_ERROR) fail('GPU upload reported an error');
    listen(canvas, 'pointerdown', onPointerDown);
    listen(canvas, 'pointermove', onPointerMove);
    listen(canvas, 'pointerup', onPointerUp);
    listen(canvas, 'pointercancel', onPointerUp);
    listen(canvas, 'wheel', onWheel, { passive: false });
    listen(canvas, 'contextmenu', (event) => event.preventDefault());
    listen(viewport, 'keydown', onKeyDown);
    listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      if (disposed) return;
      contextLost = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      canvas.hidden = true;
      failure.hidden = false;
      failure.textContent = 'WebGL context was lost. This model was invalidated; reload the verified shell.';
      viewport.dispatchEvent(new CustomEvent('homeandme:private-shell-orbit-fatal', {
        bubbles: true,
        detail: { message: failure.textContent },
      }));
    });
    listen(canvas, 'webglcontextrestored', (event) => {
      event.preventDefault();
      // Restoration is deliberately unsupported. A fresh receipt-bound session is required.
    });
    input.signal.addEventListener('abort', dispose, { once: true });
    listeners.push(() => input.signal.removeEventListener('abort', dispose));
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(viewport);
    } else {
      listen(globalThis, 'resize', resize);
    }
    resize();
    resetView();
    if (contextLost) fail('WebGL context was lost during startup');
    return Object.freeze({ dispose, resetView });
  } catch (error) {
    dispose();
    throw error;
  }
}

/** Exact provider consumed only by the separately enabled private workflow surface. */
export const PRIVATE_SHELL_WEBGL_ORBIT_PROVIDER = Object.freeze({
  runtimeContract: PRIVATE_SHELL_ORBIT_RUNTIME_CONTRACT,
  inputContract: PRIVATE_SHELL_ORBIT_INPUT_CONTRACT,
  renderPolicy: PRIVATE_SHELL_ORBIT_RENDER_POLICY,
  networkAccessEnabled: false,
  authoringEnabled: false,
  mount: mountPrivateShellWebGl,
});
