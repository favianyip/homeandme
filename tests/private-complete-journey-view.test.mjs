import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PRIVATE_COMPLETE_JOURNEY_EVIDENCE_SCHEMA,
  PRIVATE_COMPLETE_JOURNEY_STAGE_ORDER,
  PRIVATE_COMPLETE_JOURNEY_SURFACE_ENABLED,
  privateCompleteJourneyViewModel,
} from '../private-complete-journey-view.js';
import { DESIGN_REFERENCE_SCHEMA } from '../journey-design-references.js';
import { LAYOUT_REVIEW_PREVIEW_SCHEMA } from '../journey-layout-review.js';
import { DETERMINISTIC_RENDERER, RENDER_REQUEST_SCHEMA } from '../journey-render-contract.js';
import {
  FUNCTIONAL_FURNITURE_BRIEF_SCHEMA,
  PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
} from '../journey-shell-customer-workflow.js';
import { PRIVATE_BARE_SHELL_REVIEW_SCHEMA } from '../journey-shell-review.js';
import { REGISTRATION_SCHEMA } from '../journey-source-registration.js';

const hash = (character) => character.repeat(64);

function fixture() {
  return {
    schema: PRIVATE_COMPLETE_JOURNEY_EVIDENCE_SCHEMA,
    workflowContract: 'bare_shell_first/1',
    projectId: 'private-controlled-journey-01',
    contracts: {
      workflow: 'bare_shell_first/1',
      sourceRegistration: REGISTRATION_SCHEMA,
      privateShellWorkflow: PRIVATE_SHELL_CUSTOMER_WORKFLOW_SCHEMA,
      shellReview: PRIVATE_BARE_SHELL_REVIEW_SCHEMA,
      furnitureBrief: FUNCTIONAL_FURNITURE_BRIEF_SCHEMA,
      layoutPreview: LAYOUT_REVIEW_PREVIEW_SCHEMA,
      designSelection: 'spatialforge-design-selection/1',
      designReference: DESIGN_REFERENCE_SCHEMA,
      furnishedModel: 'spatialforge-furnished-model/2',
      renderRequest: RENDER_REQUEST_SCHEMA,
      renderer: DETERMINISTIC_RENDERER,
      finalApproval: 'spatialforge-selection-design-approval/1',
    },
    provenance: {
      sourceClass: 'owned_controlled_integration_fixture',
      detectorOutput: false,
      realHdbHoldoutPassed: false,
      customerVisualAcceptanceRecorded: false,
      asBuiltEvidence: false,
      productionBackendConnected: false,
      publicServiceReleased: false,
      percentageAccuracyClaimed: false,
    },
    source: {
      uploadArtifactRole: 'original_upload',
      uploadSha256: hash('a'),
      uploadByteSize: 4831,
      imageWidthPx: 900,
      imageHeightPx: 600,
      registrationSchema: REGISTRATION_SCHEMA,
      registrationSha256: hash('b'),
      registrationGeometrySha256: hash('c'),
    },
    geometry: {
      approvalStatus: 'approved',
      geometryVersion: 3,
      geometrySha256: hash('c'),
      geometry2dApprovalVersion: 2,
      geometry2dApprovalSha256: hash('d'),
      verticalDimensionsApprovalVersion: 1,
      verticalDimensionsApprovalSha256: hash('e'),
      wholeUnitTopologySha256: hash('f'),
      wallCount: 6,
      doorCount: 3,
      windowCount: 3,
      roomCount: 3,
      topologyIssueCount: 0,
    },
    shell: {
      approvalStatus: 'approved',
      shellModelVersion: 1,
      shellModelSha256: hash('1'),
      artifactManifestSha256: hash('2'),
      shellApprovalVersion: 1,
      shellApprovalSha256: hash('3'),
      geometrySha256: hash('c'),
      artifactVerificationComplete: true,
      roomCoverageComplete: true,
      reviewViewCount: 4,
      placementCount: 0,
    },
    functional: {
      briefVersion: 1,
      briefSha256: hash('4'),
      shellModelSha256: hash('1'),
      optionSetSha256: hash('5'),
      layoutVersion: 1,
      layoutSha256: hash('6'),
      selectedOptionSha256: hash('7'),
      layoutId: 'layout-storage-01',
      layoutType: 'storage_optimised',
      placementCount: 5,
      roomCount: 3,
      roomsCovered: 3,
      hardViolationCount: 0,
      feasible: true,
      approved: true,
    },
    design: {
      selectionStatus: 'complete',
      designSelectionVersion: 1,
      designSelectionSha256: hash('8'),
      layoutSha256: hash('6'),
      designReferenceId: 'hnm-scandinavian-calm-v1',
      designReferenceSha256: hash('9'),
      rightsReceiptSha256: hash('0'),
      externalReferenceImageCount: 0,
    },
    render: {
      modelVersion: 1,
      modelSha256: hash('a'),
      modelAuthoritySha256: hash('b'),
      modelApprovalVersion: 1,
      modelApprovalSha256: hash('c'),
      designSelectionSha256: hash('8'),
      renderVersion: 1,
      renderSetSha256: hash('d'),
      renderRequestSha256: hash('e'),
      renderer: DETERMINISTIC_RENDERER,
      requestedOutputSha256: hash('f'),
      finalApprovalVersion: 1,
      finalApprovalSha256: hash('1'),
      externalConditioningCount: 0,
      deterministic: true,
    },
  };
}

test('private view validates and presents the complete bare-shell-first receipt order', () => {
  const view = privateCompleteJourneyViewModel(fixture());
  assert.equal(PRIVATE_COMPLETE_JOURNEY_SURFACE_ENABLED, false);
  assert.equal(view.controlledSequenceComplete, true);
  assert.equal(view.customerReleaseEligible, false);
  assert.deepEqual(view.stages.map((stage) => stage.id), PRIVATE_COMPLETE_JOURNEY_STAGE_ORDER);
  assert.ok(view.stages.every((stage) => stage.state === 'controlled_pass'));
  assert.equal(view.stages[2].facts.includes('0 furniture placements'), true);
  assert.match(view.stages[3].summary, /before any material or aesthetic direction/i);
  assert.equal(view.stages[4].facts.includes('0 external reference images'), true);
  assert.equal(view.stages[5].facts.includes('0 external conditioning inputs'), true);
  assert.match(view.stages[1].boundary, /raw detection is not 3D-ready/i);
  assert.match(JSON.stringify(view.blockers), /corrected geometry and a site survey are required/i);
  assert.match(JSON.stringify(view.blockers), /every public capability flag remains off/i);
  assert.deepEqual(view.blockers.map((item) => item.code), [
    'PRODUCTION_BACKEND_NOT_CONNECTED',
    'REAL_HDB_HOLDOUT_NOT_PASSED',
    'DETECTOR_NOT_PROVEN',
    'CUSTOMER_VISUAL_ACCEPTANCE_NOT_RECORDED',
    'AS_BUILT_EVIDENCE_NOT_AVAILABLE',
    'PUBLIC_SERVICE_NOT_RELEASED',
  ]);
});

test('private view fails closed on stale lineage, furnished shell or unreviewed fields', () => {
  const staleRegistration = fixture();
  staleRegistration.source.registrationGeometrySha256 = hash('9');
  assert.throws(() => privateCompleteJourneyViewModel(staleRegistration), /source registration lost/i);

  const furnishedShell = fixture();
  furnishedShell.shell.placementCount = 1;
  assert.throws(() => privateCompleteJourneyViewModel(furnishedShell), /geometry-only review/i);

  const incompleteRooms = fixture();
  incompleteRooms.functional.roomsCovered = 2;
  assert.throws(() => privateCompleteJourneyViewModel(incompleteRooms), /functional room coverage lost/i);

  const staleSelection = fixture();
  staleSelection.render.designSelectionSha256 = hash('7');
  assert.throws(() => privateCompleteJourneyViewModel(staleSelection), /render design selection lost/i);

  const leakedUrl = fixture();
  leakedUrl.source.sourceImageUrl = 'https://private.invalid/source.png';
  assert.throws(() => privateCompleteJourneyViewModel(leakedUrl), /unreviewed data/i);

  const falseClaim = fixture();
  falseClaim.provenance.detectorOutput = true;
  assert.throws(() => privateCompleteJourneyViewModel(falseClaim), /without accuracy claims/i);
});

test('private integration remains absent from the public page, flags and deployment allowlist', async () => {
  const [runtime, stylesheet, browserFixture, publicPage, config, allowlist] = await Promise.all([
    readFile(new URL('../private-complete-journey-view.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/private-complete-journey.css', import.meta.url), 'utf8'),
    readFile(new URL('private-complete-journey.browser.html', import.meta.url), 'utf8'),
    readFile(new URL('../ProjectJourney.html', import.meta.url), 'utf8'),
    readFile(new URL('../config.js', import.meta.url), 'utf8'),
    readFile(new URL('../deploy/public-pages.txt', import.meta.url), 'utf8'),
  ]);
  const entries = new Set(allowlist.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  assert.equal(entries.has('private-complete-journey-view.js'), false);
  assert.equal(entries.has('assets/css/private-complete-journey.css'), false);
  assert.equal(entries.has('tests/private-complete-journey.browser.html'), false);
  assert.doesNotMatch(publicPage, /private-complete-journey/i);
  assert.match(runtime, /PRIVATE_COMPLETE_JOURNEY_SURFACE_ENABLED = false/);
  assert.doesNotMatch(runtime, /fetch\(|createObjectURL|\.src\s*=|innerHTML|https?:\/\//i);
  assert.doesNotMatch(runtime, /95\s*[–-]\s*99|accuracy achieved|as-built accuracy/i);
  assert.match(browserFixture, /noindex,nofollow,noarchive/i);
  assert.match(stylesheet, /\.private-complete-journey/);
  for (const flag of [
    'AI_ANALYSIS_ENABLED', 'GEOMETRY_REVIEW_ENABLED', 'LIVE_3D_ENABLED',
    'AI_RENDERING_ENABLED', 'QUOTATION_ENABLED', 'PAYMENTS_ENABLED',
    'DEMO_FALLBACK_ENABLED',
  ]) assert.match(config, new RegExp(`${flag}:\\s*false`), flag);
});

export { fixture as privateCompleteJourneyFixture };
