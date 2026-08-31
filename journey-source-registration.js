const REGISTRATION_SCHEMA = 'hnm-source-pixel-metric-registration/1';
const SHA256 = /^[a-f0-9]{64}$/;
const COEFFICIENTS = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f']);

function finiteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function point(value, label) {
  const x = Array.isArray(value) ? value[0] : value?.x;
  const y = Array.isArray(value) ? value[1] : value?.y;
  return Object.freeze({
    x: finiteNumber(x, `${label}.x`),
    y: finiteNumber(y, `${label}.y`),
  });
}

function canonicalNumber(value) {
  const number = finiteNumber(value, 'registration coefficient');
  if (Math.abs(number) > 1e12) {
    throw new TypeError('Registration coefficients exceed the canonical numeric range.');
  }
  const text = number.toFixed(12).replace(/(?:\.0+|(?:(\.[0-9]*?)0+))$/, '$1');
  const canonical = text === '-0' || text === '' ? '0' : text;
  const roundTrip = Number(canonical);
  const tolerance = Math.max(1e-12, Math.abs(number) * 1e-12);
  if (!Number.isFinite(roundTrip) || Math.abs(roundTrip - number) > tolerance) {
    throw new TypeError('Registration coefficients exceed canonical numeric precision.');
  }
  return canonical;
}

function canonicalJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return canonicalNumber(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  throw new TypeError('The registration integrity payload contains an unsupported value.');
}

function integrityCore(registration) {
  return {
    geometrySha256: registration.geometrySha256,
    pixelToMetric: Object.fromEntries(COEFFICIENTS.map((name) => [
      name,
      finiteNumber(registration.pixelToMetric?.[name], `pixelToMetric.${name}`),
    ])),
    schema: registration.schema,
    sourceArtifactRole: registration.sourceArtifactRole,
    sourceArtifactSha256: registration.sourceArtifactSha256,
    sourceImageSizePx: {
      height: registration.sourceImageSizePx?.height,
      width: registration.sourceImageSizePx?.width,
    },
  };
}

/** Compute the cross-runtime canonical SHA-256 without trusting registrationSha256. */
export async function registrationIntegritySha256(registration) {
  if (!globalThis.crypto?.subtle) {
    throw new TypeError('Browser SHA-256 verification is unavailable for source registration.');
  }
  const bytes = new TextEncoder().encode(canonicalJson(integrityCore(registration)));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0')).join('');
}

/** Await this at every editor-launch and approval boundary. */
export async function verifyPixelMetricRegistrationIntegrity(registration) {
  const expected = await registrationIntegritySha256(registration);
  if (expected !== registration?.registrationSha256) {
    throw new TypeError('The source registration integrity SHA-256 does not match its affine payload.');
  }
  return registration;
}

/**
 * Validate one exact source-image registration before it reaches the editor.
 *
 * SVG's affine convention is used throughout:
 *   metricX = a * pixelX + c * pixelY + e
 *   metricY = b * pixelX + d * pixelY + f
 */
export function normalizePixelMetricRegistration(registration, {
  sourceArtifactSha256,
  imageWidth,
  imageHeight,
  geometrySha256,
} = {}) {
  if (!registration || registration.schema !== REGISTRATION_SCHEMA) {
    throw new TypeError('The source pixel-to-metric registration is missing or unsupported.');
  }
  if (registration.sourceArtifactRole !== 'original_upload'
    || !SHA256.test(registration.sourceArtifactSha256 || '')
    || registration.sourceArtifactSha256 !== sourceArtifactSha256) {
    throw new TypeError('The source registration does not match the immutable original-upload SHA-256.');
  }
  if (!SHA256.test(registration.geometrySha256 || '')
    || registration.geometrySha256 !== geometrySha256) {
    throw new TypeError('The source registration does not match the current geometry SHA-256.');
  }
  if (!SHA256.test(registration.registrationSha256 || '')) {
    throw new TypeError('The source registration has no valid integrity SHA-256.');
  }
  const size = registration.sourceImageSizePx;
  if (!Number.isInteger(size?.width) || size.width <= 0
    || !Number.isInteger(size?.height) || size.height <= 0
    || size.width !== imageWidth || size.height !== imageHeight) {
    throw new TypeError('The source registration does not match the immutable image dimensions.');
  }
  const matrix = Object.fromEntries(COEFFICIENTS.map((name) => [
    name,
    finiteNumber(registration.pixelToMetric?.[name], `pixelToMetric.${name}`),
  ]));
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  const coefficientScale = Math.max(
    1,
    Math.abs(matrix.a), Math.abs(matrix.b), Math.abs(matrix.c), Math.abs(matrix.d),
  );
  if (!Number.isFinite(determinant)
    || Math.abs(determinant) <= Number.EPSILON * coefficientScale * coefficientScale * 32) {
    throw new TypeError('The source pixel-to-metric registration is singular.');
  }
  return Object.freeze({
    schema: REGISTRATION_SCHEMA,
    sourceArtifactRole: 'original_upload',
    sourceArtifactSha256: registration.sourceArtifactSha256,
    sourceImageSizePx: Object.freeze({ width: size.width, height: size.height }),
    geometrySha256: registration.geometrySha256,
    pixelToMetric: Object.freeze(matrix),
    registrationSha256: registration.registrationSha256,
    determinant,
  });
}

export function pixelToMetric(registration, pixelPoint) {
  const pixel = point(pixelPoint, 'pixelPoint');
  const matrix = registration?.pixelToMetric;
  if (!matrix || !COEFFICIENTS.every((name) => Number.isFinite(matrix[name]))) {
    throw new TypeError('A validated source registration is required.');
  }
  return Object.freeze({
    x: matrix.a * pixel.x + matrix.c * pixel.y + matrix.e,
    y: matrix.b * pixel.x + matrix.d * pixel.y + matrix.f,
  });
}

export function metricToPixel(registration, metricPoint) {
  const metric = point(metricPoint, 'metricPoint');
  const matrix = registration?.pixelToMetric;
  if (!matrix || !COEFFICIENTS.every((name) => Number.isFinite(matrix[name]))) {
    throw new TypeError('A validated source registration is required.');
  }
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (!Number.isFinite(determinant) || determinant === 0) {
    throw new TypeError('The source pixel-to-metric registration is singular.');
  }
  const translatedX = metric.x - matrix.e;
  const translatedY = metric.y - matrix.f;
  return Object.freeze({
    x: (matrix.d * translatedX - matrix.c * translatedY) / determinant,
    y: (-matrix.b * translatedX + matrix.a * translatedY) / determinant,
  });
}

export function registrationSvgMatrix(registration) {
  const matrix = registration?.pixelToMetric;
  if (!matrix || !COEFFICIENTS.every((name) => Number.isFinite(matrix[name]))) {
    throw new TypeError('A validated source registration is required.');
  }
  return `matrix(${COEFFICIENTS.map((name) => matrix[name]).join(' ')})`;
}

export { REGISTRATION_SCHEMA };
