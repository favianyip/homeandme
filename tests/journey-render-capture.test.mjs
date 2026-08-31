import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDepthRgba } from '../journey-render-capture.js';

test('depth normalization flips WebGL rows and preserves background', () => {
  // Bottom WebGL row: background then near; top row: mid then far.
  const rgba = new Uint8Array([
    0, 0, 0, 0, 10, 10, 10, 255,
    100, 100, 100, 255, 220, 220, 220, 255,
  ]);
  const out = normalizeDepthRgba(rgba, 2, 2);
  assert.ok(out[0] > 0);                 // former top-row mid moved to output top
  assert.ok(out[4] >= out[0]);          // far ranks at least as bright as mid
  assert.equal(out[8], 0);              // former bottom-row background moved down
  assert.equal(out[11], 255);
  assert.ok(out[12] > 0);               // near geometry remains represented
});

test('depth normalization rejects inconsistent buffers', () => {
  assert.throws(() => normalizeDepthRgba(new Uint8Array(3), 1, 1), /do not match/);
});
