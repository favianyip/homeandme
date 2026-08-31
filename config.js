window.HNM_CONFIG = Object.freeze({
  // OWNER: set this to the deployed assisted-delivery pipeline API URL (must be HTTPS),
  // e.g. 'https://api.homeandme.sg'. Leave EMPTY until the API is live — any non-empty,
  // non-URL placeholder here throws at page load. When empty, the site stays display-only.
  apiBaseUrl: '',
  // OWNER: set this to the exact 40- or 64-character hex release id the deployed service
  // reports, to pin the public site to a specific reviewed release. Leave EMPTY until then —
  // any non-empty value that is not 40/64 hex chars throws at page load.
  expectedServiceReleaseId: '',
  // Honest service model: after a floor-plan upload, our team prepares and reviews the
  // labelled 3D model and photorealistic render, then delivers it. It is a person-reviewed,
  // asynchronous service — not instant or fully-automatic AI rendering.
  assistedDelivery: true,
  flags: Object.freeze({
    AI_ANALYSIS_ENABLED: false,
    GEOMETRY_REVIEW_ENABLED: false,
    LIVE_3D_ENABLED: false,
    AI_RENDERING_ENABLED: false,
    QUOTATION_ENABLED: false,
    PAYMENTS_ENABLED: false,
    DEMO_FALLBACK_ENABLED: false,
  }),
});
