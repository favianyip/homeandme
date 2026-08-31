export const DESIGN_REFERENCE_SCHEMA = 'spatialforge-design-reference/1';
export const DESIGN_REFERENCE_CATALOG_SCHEMA = 'spatialforge-design-reference-catalog/1';

const HASH = /^[a-f0-9]{64}$/;
const MATERIAL_ROLES = Object.freeze([
  'wall', 'floor', 'wood', 'stone', 'fabric', 'linen', 'rug', 'ceramic', 'opening_frame',
]);

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateDesignReference(reference) {
  if (!record(reference) || reference.schema !== DESIGN_REFERENCE_SCHEMA
    || typeof reference.referenceId !== 'string' || !reference.referenceId
    || typeof reference.label !== 'string' || !reference.label
    || typeof reference.styleKey !== 'string' || !reference.styleKey
    || !HASH.test(reference.referenceSha256 || '')
    || reference.preview !== null) {
    throw new TypeError('Design reference identity or immutable hash is invalid.');
  }
  const provenance = reference.provenance;
  if (!record(provenance)
    || provenance.thirdPartyMediaConsumed !== false
    || provenance.commercialUseAllowed !== true
    || provenance.derivativeUseAllowed !== true
    || provenance.renderPublicationAllowed !== true
    || !Array.isArray(provenance.externalSourceUris)
    || provenance.externalSourceUris.length !== 0) {
    throw new TypeError('Design reference rights evidence is incomplete.');
  }
  if (reference.dimensions?.units !== 'mm' || !record(reference.materials)
    || MATERIAL_ROLES.some((role) => !record(reference.materials[role]))) {
    throw new TypeError('Design reference material dimensions are incomplete.');
  }
  for (const role of MATERIAL_ROLES) {
    const material = reference.materials[role];
    if (material.sourceType !== 'procedural' || material.externalTextureArtifact !== null
      || !Number.isInteger(material.patternScaleMm) || material.patternScaleMm <= 0
      || typeof material.reliefMm !== 'number' || material.reliefMm < 0
      || !Array.isArray(material.baseColorSrgb) || material.baseColorSrgb.length !== 3
      || material.baseColorSrgb.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
      throw new TypeError(`Design reference material ${role} is not dimensioned procedural evidence.`);
    }
  }
  return reference;
}

export function validateDesignReferenceCatalog(catalog) {
  if (!record(catalog) || catalog.schema !== DESIGN_REFERENCE_CATALOG_SCHEMA
    || typeof catalog.catalogVersion !== 'string' || !catalog.catalogVersion
    || !HASH.test(catalog.catalogSha256 || '')
    || !Array.isArray(catalog.references) || catalog.references.length === 0) {
    throw new TypeError('The service design-reference catalog is invalid.');
  }
  catalog.references.forEach(validateDesignReference);
  const ids = catalog.references.map((reference) => reference.referenceId);
  if (new Set(ids).size !== ids.length) throw new TypeError('Design reference IDs are not unique.');
  return catalog;
}

export function designReferenceSelection(catalog, referenceId) {
  const validated = validateDesignReferenceCatalog(catalog);
  const matches = validated.references.filter((reference) => reference.referenceId === referenceId);
  if (matches.length !== 1) throw new TypeError('Select one current service design reference.');
  const reference = matches[0];
  return Object.freeze({
    designReferenceId: reference.referenceId,
    designReferenceSha256: reference.referenceSha256,
    confirmDesignReferenceRights: true,
    preferredStyles: [reference.styleKey],
    referenceImages: [],
  });
}

export function validateRecoveredDesignBrief(response, project) {
  if (!record(response) || response.projectId !== project?.projectId
    || response.designBriefVersion !== project?.designBriefVersion
    || !Number.isInteger(response.designBriefVersion)
    || !HASH.test(response.designBriefSha256 || '')
    || !record(response.designBrief) || !record(response.sourceReferences)) {
    throw new TypeError('Recovered design brief is not bound to the current project version.');
  }
  const reference = validateDesignReference(response.designReference);
  if (response.designBrief.designReferenceId !== reference.referenceId
    || response.designBrief.designReferenceSha256 !== reference.referenceSha256
    || JSON.stringify(response.designBrief.designReference) !== JSON.stringify(reference)
    || !Array.isArray(response.designBrief.referenceImages)
    || response.designBrief.referenceImages.length !== 0
    || response.sourceReferences.designReferenceId !== reference.referenceId
    || response.sourceReferences.designReferenceSha256 !== reference.referenceSha256) {
    throw new TypeError('Recovered design reference does not match its immutable brief binding.');
  }
  return Object.freeze({
    version: response.designBriefVersion,
    sha256: response.designBriefSha256,
    reference,
    brief: response.designBrief,
  });
}
