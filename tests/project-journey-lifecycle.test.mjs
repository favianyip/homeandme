import assert from 'node:assert/strict';
import test from 'node:test';

import { ProjectJourneyApp } from '../project-journey.js';
import { WorkflowPhase } from '../journey-service-workflow.js';

test('correction source URL survives its first evidence render and is revoked only on explicit release', () => {
  const originalRevoke = URL.revokeObjectURL;
  const revoked = [];
  URL.revokeObjectURL = (url) => revoked.push(url);

  try {
    const previewUrl = 'blob:ephemeral-model-preview';
    const correctionUrl = 'blob:verified-original-upload';
    const app = Object.create(ProjectJourneyApp.prototype);
    Object.assign(app, {
      busy: false,
      objectUrls: [previewUrl],
      pendingCorrection: { imageUrl: correctionUrl },
      previewEpoch: 0,
      state: { phase: WorkflowPhase.GEOMETRY_REVIEW },
      phaseData: { geometry: { geometry: {} } },
      workbench: { dataset: {} },
      capabilityEnabled: () => true,
    });

    let evidenceRendered = false;
    app.renderCorrectionEvidence = () => {
      evidenceRendered = true;
      assert.equal(app.pendingCorrection.imageUrl, correctionUrl);
      assert.equal(revoked.includes(correctionUrl), false, 'the verified source must remain live while evidence UI renders');
    };

    app.renderWorkspace({ availability: { live: true } });
    assert.equal(evidenceRendered, true);
    assert.deepEqual(revoked, [previewUrl], 'only the ephemeral preview URL is cleared by a workspace render');

    app.clearPendingCorrection();
    assert.equal(app.pendingCorrection, null);
    assert.deepEqual(revoked, [previewUrl, correctionUrl], 'discard/submit cleanup releases the correction source exactly once');
  } finally {
    URL.revokeObjectURL = originalRevoke;
  }
});

test('destroy releases both preview and pending correction URLs', () => {
  const originalRevoke = URL.revokeObjectURL;
  const revoked = [];
  URL.revokeObjectURL = (url) => revoked.push(url);

  try {
    const app = Object.create(ProjectJourneyApp.prototype);
    Object.assign(app, {
      objectUrls: ['blob:preview'],
      pendingCorrection: { imageUrl: 'blob:correction' },
      onWindowMessage: null,
      onPageHide: null,
    });
    app.destroy();
    assert.deepEqual(revoked, ['blob:preview', 'blob:correction']);
    assert.equal(app.pendingCorrection, null);
  } finally {
    URL.revokeObjectURL = originalRevoke;
  }
});
