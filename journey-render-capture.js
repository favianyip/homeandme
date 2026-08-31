// Capture reproducible render conditioning from the shared <three-d-stage>.
// The color image communicates materials; the depth image constrains generated pixels to geometry.

export function normalizeDepthRgba(pixels, width, height) {
  if (!(pixels instanceof Uint8Array) || pixels.length !== width * height * 4) {
    throw new TypeError('RGBA depth pixels do not match the requested dimensions');
  }
  const values = [];
  for (let i = 0; i < pixels.length; i += 4) {
    // Render-target clear pixels have alpha 0. BasicDepthPacking writes depth in RGB.
    if (pixels[i + 3]) values.push(pixels[i]);
  }
  values.sort((a, b) => a - b);
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const src = (y * width + x) * 4;
    const dst = ((height - y - 1) * width + x) * 4;
    let shade = 0;
    if (pixels[src + 3] && values.length > 1) {
      let lo = 0, hi = values.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (values[mid] <= pixels[src]) lo = mid + 1; else hi = mid - 1;
      }
      shade = Math.round(Math.pow(lo / values.length, 0.55) * 255);
    }
    out[dst] = shade; out[dst + 1] = shade; out[dst + 2] = shade; out[dst + 3] = 255;
  }
  return out;
}

const canvasBlob = (canvas, type = 'image/png', quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas capture failed.')), type, quality);
});

export async function captureRenderInputs(stage) {
  const THREE = stage?._THREE;
  const renderer = stage?._renderer;
  const scene = stage?._scene;
  const camera = stage?._camera;
  if (!THREE || !renderer || !scene || !camera) throw new Error('The 3D stage is not ready.');

  renderer.render(scene, camera);
  const color = await canvasBlob(renderer.domElement);
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
  });
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
  const previousTarget = renderer.getRenderTarget();
  const previousOverride = scene.overrideMaterial;
  const previousAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(width * height * 4);
  try {
    renderer.setClearAlpha(0);
    scene.overrideMaterial = depthMaterial;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    scene.overrideMaterial = previousOverride;
    renderer.setRenderTarget(previousTarget);
    renderer.setClearAlpha(previousAlpha);
    depthMaterial.dispose();
    target.dispose();
    renderer.render(scene, camera);
  }

  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = width; depthCanvas.height = height;
  const context = depthCanvas.getContext('2d');
  const image = context.createImageData(width, height);
  image.data.set(normalizeDepthRgba(pixels, width, height));
  context.putImageData(image, 0, 0);
  const depth = await canvasBlob(depthCanvas);
  const controlsTarget = stage._controls?.target;

  return {
    color,
    depth,
    viewerState: {
      camera: {
        position: camera.position.toArray(),
        target: controlsTarget ? controlsTarget.toArray() : [0, 0, 0],
        up: camera.up.toArray(),
        fovDegrees: camera.fov,
        near: camera.near,
        far: camera.far,
      },
      viewport: { width, height, pixelRatio: renderer.getPixelRatio() },
    },
  };
}
