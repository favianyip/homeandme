export const JOURNEY_RELEASE_DOSSIER_SCHEMA = 'homeandme-release-dossier/1';

const RELEASE_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const CAPABILITY_ORDER = Object.freeze([
  'AI_ANALYSIS_ENABLED',
  'GEOMETRY_REVIEW_ENABLED',
  'LIVE_3D_ENABLED',
  'AI_RENDERING_ENABLED',
]);

const STAGE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'source-registration',
    number: '01',
    label: 'Register the source',
    capability: 'AI_ANALYSIS_ENABLED',
    proofState: 'private_contract',
    proofLabel: 'Private contract checked',
    summary: 'Owned raster bytes, intrinsic pixels and the pixel-to-millimetre registration stay bound to one source SHA-256.',
    receipt: 'source bytes + affine registration',
    boundary: 'No public upload service is connected, and uploading never grants training permission.',
  }),
  Object.freeze({
    id: 'geometry-correction',
    number: '02',
    label: 'Correct the geometry',
    capability: 'GEOMETRY_REVIEW_ENABLED',
    proofState: 'detector_failure',
    proofLabel: 'Raw detector gate: failed',
    summary: 'In the current internal 10-plan correction-burden panel, every raw output failed the strict 3D gate; the registered correction contract then requires connected walls, closed rooms and uniquely hosted openings.',
    receipt: 'geometry revision + 2D/vertical approvals',
    boundary: 'That panel is not an independent accuracy benchmark. Raw detection is pre-labelling evidence only; source-aligned correction remains mandatory.',
  }),
  Object.freeze({
    id: 'bare-shell',
    number: '03',
    label: 'Inspect the bare shell',
    capability: 'LIVE_3D_ENABLED',
    proofState: 'private_contract',
    proofLabel: 'Private contract checked',
    summary: 'A geometry-only GLB and room-by-room review set are accepted only after their bytes and semantic manifest revalidate.',
    receipt: 'shell manifest + verified artifact bytes',
    boundary: 'This proves controlled compilation, not as-built dimensions or a customer-ready visual.',
  }),
  Object.freeze({
    id: 'functional-layout',
    number: '04',
    label: 'Test a furniture layout',
    capability: 'LIVE_3D_ENABLED',
    proofState: 'engineering_fixture',
    proofLabel: 'Authored synthetic positive',
    summary: 'An original authored 110 m² synthetic fixture proves measured furniture, door-zone and circulation gates can accept one complete layout against exact geometry.',
    receipt: 'functional brief + layout option hash',
    boundary: 'This is a generous engineering stress fixture, not a detected plan, typical HDB, customer visual or renovation proposal.',
  }),
  Object.freeze({
    id: 'design-selection',
    number: '05',
    label: 'Select a design direction',
    capability: 'LIVE_3D_ENABLED',
    proofState: 'static_reference',
    proofLabel: 'Static evidence published',
    summary: 'Three code-authored procedural palettes are bound to the same reviewed whole-unit geometry and furnished-scene lineage.',
    receipt: 'rights receipt + design selection',
    boundary: 'The gallery is a hash-verified synthetic reference; it is not product selection or a live modelling service.',
    evidenceHref: 'ReviewedReferences.html',
  }),
  Object.freeze({
    id: 'render-acceptance',
    number: '06',
    label: 'Render and accept',
    capability: 'AI_RENDERING_ENABLED',
    proofState: 'private_contract',
    proofLabel: 'Private contract checked',
    summary: 'The deterministic render and final approval bind the selected design, furnished model, requested camera and exact output bytes.',
    receipt: 'render request + final approval',
    boundary: 'Customer visual acceptance and 95–99% as-built fidelity are not established; quote, payment and renovation handover remain separate.',
    evidenceHref: 'ReviewedReferences.html',
  }),
]);

function hasPinnedProductionRelease(config) {
  const verification = config?.serviceVerification;
  if (verification?.serviceReady !== true
    || verification.runtimeEnvironment !== 'production'
    || !RELEASE_ID.test(verification.releaseId || '')
    || config?.expectedServiceReleaseId !== verification.releaseId) {
    return false;
  }
  try {
    const endpoint = new URL(config.apiBaseUrl);
    return endpoint.protocol === 'https:' && Boolean(endpoint.hostname);
  } catch {
    return false;
  }
}

function releasedCapabilities(config) {
  let dependencyReady = hasPinnedProductionRelease(config);
  const result = new Map();
  for (const capability of CAPABILITY_ORDER) {
    const released = dependencyReady && config?.flags?.[capability] === true;
    result.set(capability, released);
    dependencyReady = released;
  }
  return result;
}

/**
 * Build a display-only release dossier. It never enables an action: a stage can be labelled
 * released only after an exact production release handshake and every upstream capability.
 */
export function journeyReleaseDossier(config = {}) {
  const capabilities = releasedCapabilities(config);
  const stages = STAGE_DEFINITIONS.map((definition) => Object.freeze({
    ...definition,
    publicState: capabilities.get(definition.capability) ? 'released' : 'not_released',
    publicLabel: capabilities.get(definition.capability) ? 'Customer service released' : 'Customer service not released',
  }));
  return Object.freeze({
    schema: JOURNEY_RELEASE_DOSSIER_SCHEMA,
    publicServiceReady: stages.every((stage) => stage.publicState === 'released'),
    title: 'What is built, what is evidence, what is still gated',
    summary: 'Controlled checks and customer availability are separate. Each future project must carry its own source, geometry, shell, layout, selection and render receipts.',
    boundary: 'No held-out real-HDB plan has passed this complete public chain. The dossier does not create a project, upload a plan or unlock a service.',
    stages: Object.freeze(stages),
  });
}
