// Product-safety policy for plan intake.
// Address agreement is useful provenance, but it is not evidence that every wall/opening was
// recovered. Browser traces and catalogue examples may produce concept previews; only the
// service workflow may publish verified geometry or training records.

const ACCEPTABLE_ADDRESS_VERDICTS = new Set(['accepted', 'review']);

export function intakeDecision({
  source = 'browser_trace', addressVerdict, serviceFlags = {}, geometryApproved = false,
} = {}) {
  const addressAllowsConcept = ACCEPTABLE_ADDRESS_VERDICTS.has(addressVerdict);
  const serviceReady = serviceFlags.AI_ANALYSIS_ENABLED === true
    && serviceFlags.GEOMETRY_REVIEW_ENABLED === true
    && serviceFlags.LIVE_3D_ENABLED === true;
  const serviceSource = source === 'verified_service';
  return Object.freeze({
    canBuildConceptPreview: addressAllowsConcept && source !== 'verified_service',
    canEnterVerified3d: addressAllowsConcept && serviceSource && serviceReady
      && geometryApproved === true,
    canPublishTrainingRecord: false,
    reason: !addressAllowsConcept
      ? 'The address cross-check has not passed.'
      : serviceSource && serviceReady && geometryApproved !== true
        ? 'The service geometry still requires its hash-bound human approval before publication.'
        : serviceSource && serviceReady
          ? 'The service geometry is explicitly approved for the verified 3D stage.'
        : 'This is an unverified concept trace; wall topology, openings and metric scale have not passed the service gates.',
  });
}
