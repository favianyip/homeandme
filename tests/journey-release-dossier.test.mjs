import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  JOURNEY_RELEASE_DOSSIER_SCHEMA,
  journeyReleaseDossier,
} from '../journey-release-dossier.js';

const allFlags = Object.freeze({
  AI_ANALYSIS_ENABLED: true,
  GEOMETRY_REVIEW_ENABLED: true,
  LIVE_3D_ENABLED: true,
  AI_RENDERING_ENABLED: true,
});

test('release dossier separates controlled proof from public service availability', () => {
  const dossier = journeyReleaseDossier({ flags: allFlags });
  assert.equal(dossier.schema, JOURNEY_RELEASE_DOSSIER_SCHEMA);
  assert.equal(dossier.publicServiceReady, false);
  assert.equal(dossier.stages.length, 6);
  assert.equal(new Set(dossier.stages.map((stage) => stage.id)).size, 6);
  assert.ok(dossier.stages.every((stage) => stage.publicState === 'not_released'));
  assert.ok(dossier.stages.every((stage) => stage.proofLabel && stage.receipt && stage.boundary));
  assert.match(dossier.boundary, /does not create a project, upload a plan or unlock a service/i);
  assert.equal(dossier.stages[1].proofState, 'detector_failure');
  assert.match(dossier.stages[1].summary, /every raw output failed the strict 3D gate/i);
  assert.match(dossier.stages[1].boundary, /not an independent accuracy benchmark/i);
  assert.equal(dossier.stages[3].proofState, 'engineering_fixture');
  assert.match(dossier.stages[3].summary, /original authored 110 m² synthetic fixture/i);
  assert.match(dossier.stages[3].boundary, /not a detected plan, typical HDB/i);
  assert.match(dossier.stages[5].boundary, /95–99% as-built fidelity are not established/i);
});

test('flags alone cannot claim release and downstream capabilities remain dependency ordered', () => {
  const releaseId = 'a'.repeat(40);
  const base = {
    apiBaseUrl: 'https://projects.homeandme.sg',
    expectedServiceReleaseId: releaseId,
    serviceVerification: {
      releaseId,
      runtimeEnvironment: 'production',
      serviceReady: true,
    },
  };
  const broken = journeyReleaseDossier({
    ...base,
    flags: { ...allFlags, GEOMETRY_REVIEW_ENABLED: false },
  });
  assert.equal(broken.stages[0].publicState, 'released');
  assert.ok(broken.stages.slice(1).every((stage) => stage.publicState === 'not_released'));

  const wrongPin = journeyReleaseDossier({
    ...base,
    expectedServiceReleaseId: 'b'.repeat(40),
    flags: allFlags,
  });
  assert.ok(wrongPin.stages.every((stage) => stage.publicState === 'not_released'));

  const released = journeyReleaseDossier({ ...base, flags: allFlags });
  assert.equal(released.publicServiceReady, true);
  assert.ok(released.stages.every((stage) => stage.publicState === 'released'));
});

test('public dossier integration is actionless, accessible and privacy allowlisted', async () => {
  const [page, runtime, stylesheet, manifest] = await Promise.all([
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../project-journey.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/project-journey.css', import.meta.url), 'utf8'),
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
  ]);
  assert.match(runtime, /journeyReleaseDossier/);
  assert.match(runtime, /aria-labelledby.*releaseDossierTitle/);
  assert.match(runtime, /ReviewedReferences\.html/);
  assert.match(stylesheet, /\.release-dossier-step\[data-release="not_released"\]/);
  assert.match(manifest, /^journey-release-dossier\.js$/m);
  assert.match(page, /Public capabilities remain off unless explicitly enabled/i);
  assert.doesNotMatch(`${page}\n${runtime}`, /start demo|sample project|mock receipt|upload anyway|accuracy achieved/i);
});
