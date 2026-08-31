import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { intakeDecision } from '../journey-intake-policy.js';

test('browser detection can preview but cannot masquerade as verified geometry or training data', () => {
  const decision = intakeDecision({ source: 'browser_trace', addressVerdict: 'accepted' });
  assert.equal(decision.canBuildConceptPreview, true);
  assert.equal(decision.canEnterVerified3d, false);
  assert.equal(decision.canPublishTrainingRecord, false);
  assert.match(decision.reason, /unverified concept trace/);
});

test('an address mismatch blocks even a concept preview', () => {
  const decision = intakeDecision({ source: 'browser_trace', addressVerdict: 'rejected' });
  assert.equal(decision.canBuildConceptPreview, false);
  assert.equal(decision.canEnterVerified3d, false);
});

test('service flags cannot independently bypass the geometry-review dependency chain', () => {
  const incomplete = intakeDecision({
    source: 'verified_service', addressVerdict: 'accepted',
    serviceFlags: { AI_ANALYSIS_ENABLED: true, LIVE_3D_ENABLED: true },
  });
  const awaitingApproval = intakeDecision({
    source: 'verified_service', addressVerdict: 'accepted',
    serviceFlags: {
      AI_ANALYSIS_ENABLED: true, GEOMETRY_REVIEW_ENABLED: true, LIVE_3D_ENABLED: true,
    },
  });
  const ready = intakeDecision({
    source: 'verified_service', addressVerdict: 'accepted', geometryApproved: true,
    serviceFlags: {
      AI_ANALYSIS_ENABLED: true, GEOMETRY_REVIEW_ENABLED: true, LIVE_3D_ENABLED: true,
    },
  });
  assert.equal(incomplete.canEnterVerified3d, false);
  assert.equal(awaitingApproval.canEnterVerified3d, false);
  assert.equal(ready.canEnterVerified3d, true);
  assert.equal(ready.canPublishTrainingRecord, false);
});
