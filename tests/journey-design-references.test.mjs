import assert from 'node:assert/strict';
import test from 'node:test';

import {
  designReferenceSelection,
  validateDesignReferenceCatalog,
  validateRecoveredDesignBrief,
} from '../journey-design-references.js';

const SHA = 'a'.repeat(64);
const material = Object.freeze({
  sourceType: 'procedural', externalTextureArtifact: null,
  patternScaleMm: 180, reliefMm: 1,
  baseColorSrgb: [220, 210, 190], roughness: 0.5,
});
const reference = Object.freeze({
  schema: 'spatialforge-design-reference/1',
  referenceId: 'hnm-scandinavian-calm-v1', referenceSha256: SHA,
  referenceVersion: 1, label: 'Scandinavian Calm', styleKey: 'scandinavian', preview: null,
  provenance: {
    thirdPartyMediaConsumed: false, externalSourceUris: [],
    commercialUseAllowed: true, derivativeUseAllowed: true, renderPublicationAllowed: true,
  },
  dimensions: { units: 'mm' },
  materials: Object.fromEntries(
    ['wall', 'floor', 'wood', 'stone', 'fabric', 'linen', 'rug', 'ceramic', 'opening_frame']
      .map((role) => [role, material]),
  ),
});
const catalog = Object.freeze({
  schema: 'spatialforge-design-reference-catalog/1',
  catalogVersion: 'procedural-materials-1', catalogSha256: 'b'.repeat(64),
  references: [reference],
});

test('customer selection comes only from the rights-safe service catalog', () => {
  assert.equal(validateDesignReferenceCatalog(catalog), catalog);
  assert.deepEqual(designReferenceSelection(catalog, reference.referenceId), {
    designReferenceId: reference.referenceId,
    designReferenceSha256: SHA,
    confirmDesignReferenceRights: true,
    preferredStyles: ['scandinavian'],
    referenceImages: [],
  });
  const external = structuredClone(catalog);
  external.references[0].provenance.externalSourceUris = ['https://unlicensed.example/look.jpg'];
  assert.throws(() => validateDesignReferenceCatalog(external), /rights evidence/);
});

test('authenticated recovery rejects a stale or detached design reference', () => {
  const response = {
    projectId: 'HNM-1', designBriefVersion: 3, designBriefSha256: 'c'.repeat(64),
    sourceReferences: { designReferenceId: reference.referenceId, designReferenceSha256: SHA },
    designReference: reference,
    designBrief: {
      designReferenceId: reference.referenceId, designReferenceSha256: SHA,
      designReference: reference, referenceImages: [],
    },
  };
  const receipt = validateRecoveredDesignBrief(response, { projectId: 'HNM-1', designBriefVersion: 3 });
  assert.equal(receipt.reference.label, 'Scandinavian Calm');
  assert.throws(
    () => validateRecoveredDesignBrief(
      { ...response, designBriefVersion: 2 },
      { projectId: 'HNM-1', designBriefVersion: 3 },
    ),
    /current project version/,
  );
});
