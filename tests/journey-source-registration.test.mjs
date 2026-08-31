import assert from 'node:assert/strict';
import test from 'node:test';

import {
  metricToPixel,
  normalizePixelMetricRegistration,
  pixelToMetric,
  registrationIntegritySha256,
  registrationSvgMatrix,
  verifyPixelMetricRegistrationIntegrity,
} from '../journey-source-registration.js';

const sourceSha256 = 'a'.repeat(64);
const geometrySha256 = 'b'.repeat(64);
const registrationCore = {
  schema: 'hnm-source-pixel-metric-registration/1',
  sourceArtifactRole: 'original_upload',
  sourceArtifactSha256: sourceSha256,
  sourceImageSizePx: { width: 2400, height: 1600 },
  geometrySha256,
  pixelToMetric: { a: 9.8, b: 0.4, c: -0.4, d: 9.8, e: -1176, f: -1028 },
};
const registration = {
  ...registrationCore,
  registrationSha256: await registrationIntegritySha256(registrationCore),
};
const CROSS_RUNTIME_DIGEST = '9a667f0ca60a02269caef0a505781bfdf2ca00ee2fbd84c16dba35031cd424dc';

function validated(overrides = {}) {
  return normalizePixelMetricRegistration({ ...registration, ...overrides }, {
    sourceArtifactSha256: sourceSha256,
    imageWidth: 2400,
    imageHeight: 1600,
    geometrySha256,
  });
}

test('pixel and metric coordinates round-trip through the exact affine registration', () => {
  const bound = validated();
  for (const pixel of [{ x: 0, y: 0 }, { x: 120, y: 100 }, { x: 2399, y: 1599 }]) {
    const metric = pixelToMetric(bound, pixel);
    const returned = metricToPixel(bound, metric);
    assert.ok(Math.abs(returned.x - pixel.x) < 1e-9);
    assert.ok(Math.abs(returned.y - pixel.y) < 1e-9);
  }
  assert.equal(registrationSvgMatrix(bound), 'matrix(9.8 0.4 -0.4 9.8 -1176 -1028)');
});

test('registration fails closed on missing, singular, stale-hash or wrong-size evidence', () => {
  assert.throws(() => normalizePixelMetricRegistration(null, {
    sourceArtifactSha256: sourceSha256, imageWidth: 2400, imageHeight: 1600, geometrySha256,
  }), /missing or unsupported/);
  assert.throws(() => validated({ sourceArtifactSha256: 'd'.repeat(64) }), /original-upload SHA-256/);
  assert.throws(() => validated({ geometrySha256: 'd'.repeat(64) }), /current geometry SHA-256/);
  assert.throws(() => validated({ sourceImageSizePx: { width: 1200, height: 1600 } }), /image dimensions/);
  assert.throws(() => validated({ pixelToMetric: { a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 } }), /singular/);
  assert.throws(() => validated({ pixelToMetric: { ...registration.pixelToMetric, a: Number.NaN } }), /finite number/);
});

test('integrity verification rejects stale affine coefficients under an unchanged digest', async () => {
  const stale = {
    ...registration,
    pixelToMetric: { ...registration.pixelToMetric, e: registration.pixelToMetric.e + 100 },
  };
  const normalized = normalizePixelMetricRegistration(stale, {
    sourceArtifactSha256: sourceSha256,
    imageWidth: 2400,
    imageHeight: 1600,
    geometrySha256,
  });
  await assert.rejects(
    verifyPixelMetricRegistrationIntegrity(normalized),
    /integrity SHA-256 does not match.*affine payload/i,
  );
});

test('canonical registration digest is invariant to object key insertion order', async () => {
  const reordered = {
    sourceImageSizePx: { height: 1600, width: 2400 },
    pixelToMetric: { f: -1028, e: -1176, d: 9.8, c: -0.4, b: 0.4, a: 9.8 },
    geometrySha256,
    sourceArtifactSha256: sourceSha256,
    sourceArtifactRole: 'original_upload',
    schema: 'hnm-source-pixel-metric-registration/1',
  };
  assert.equal(
    await registrationIntegritySha256(reordered),
    await registrationIntegritySha256(registrationCore),
  );
  assert.equal(await registrationIntegritySha256(registrationCore), CROSS_RUNTIME_DIGEST);
});
