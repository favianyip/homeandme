# Home & Me public website

Sanitized static deployment source for [homeandme.sg](https://homeandme.sg). Backend source, customer files and credentials are intentionally excluded.

## Runtime modes

- The committed `config.js` has no API URL and keeps analysis, geometry review, 3D, rendering, quotation, payment and demo fallback disabled.
- `ProjectJourney.html` therefore renders a static, truthful service-status page. It cannot upload, analyse, correct, model, quote or accept payment in the public configuration.
- A controlled environment may provide a private HTTPS API URL and enable tested flags only after the corresponding backend contract and dependency gates pass.
- Capability flags are dependency-ordered: analysis → geometry review → live 3D → rendering → quotation → payment. Enabling an earlier stage never exposes later stages implicitly.
- Retired browser-only intake, detector, Studio, account and checkout routes redirect to Project Atelier and cannot create local success or approval state.

When the service is off, Project Atelier renders a display-only release dossier rather than a dead demo. It separates controlled contract checks from customer availability at every receipt gate. The raw ten-plan correction-burden panel is labelled as a failed strict-3D finding and not an independent accuracy benchmark; the functional positive is separately labelled as an original 110 m² synthetic engineering fixture. The dossier cannot create a project, upload a plan or unlock any capability, and flags alone cannot label a stage released without an exact production service handshake.

## Current proof boundary

The repository contains deterministic geometry, topology, model-artifact, render-request and service-workflow contract tests. At model review, the browser can display only the authenticated service's manifest-bound GLB and ordered reference PNGs: one whole-unit overview plus exactly one PNG for every canonical room in the dynamic coverage ledger. SHA-256, byte size, MIME type, ordered role/view/room/name/function bindings and binary structure must verify, and the GLB-selected scene must embed the exact geometry, layout and scene-manifest hashes, before approval unlocks. Canonical room names alone label the cards; review guidance is generated locally and unbound server label/cue overrides are rejected. Existing four-angle model records remain readable only when both dynamic fields are absent, but require regeneration before approval because they carry no complete-room ledger; a partial dynamic response fails closed. The viewer is review-only and does not generate substitute measured geometry. These tests prove fail-closed state transitions and immutable bindings in code; they are not evidence that a public customer service or a complete renovation workflow is deployed.

`ReviewedReferences.html` is a separate static evidence gallery for one reviewed synthetic whole-unit fixture rendered with Scandinavian Calm, Warm Contemporary and Modern Luxe procedural palettes. It pins the exact proof-manifest SHA-256, verifies every published JSON, PNG and GLB byte before revealing the gallery, and has no external assets or stale/demo fallback. The source manifest's `local-review-only` and not-deployed fields record its generation-time state; the Pages gallery is a separate static evidence presentation. It demonstrates a controlled renderer/topology workflow reference only. It is not detector accuracy, HDB-likeness, an as-built survey, product selection or evidence that public 3D is enabled; all service flags remain off.

No end-to-end held-out real HDB floor plan has yet passed the full public path from authorised source through exact wall/door/window correction, scale and vertical review, approved layout, decoded model, deterministic render and final human acceptance. The site must not claim complete detection, measured 3D, photoreal output, live pricing, checkout, payment or contractor fulfilment until that evidence exists and the relevant service flags are explicitly enabled.

Backend proof, customer data, credentials and private research must remain outside the public Pages source.

## Frontend checks

```bash
node --check journey-api.js
node --check journey-service-workflow.js
node --check journey-model-artifacts.js
node --check project-journey-model.js
node --check project-journey.js
node --check three-d-stage.js
node --test tests/*.test.mjs
```

The private legacy ASP.NET archive is maintained separately and must never be published through GitHub Pages.
