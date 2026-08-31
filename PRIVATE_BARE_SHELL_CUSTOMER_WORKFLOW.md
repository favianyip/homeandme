# Private bare-shell customer workflow

Status: implemented as an isolated, default-off browser slice. It is not imported by
`ProjectJourney.html`, is absent from `deploy/public-pages.txt`, and does not read a public feature
flag. The only composition boundary, `PrivateShellWorkflowSurfaceController`, throws unless its
private host opts in explicitly and supplies an exact service origin and release hash.

## Released sequence

1. Recover the exact current, approved, source-registered 2D geometry and vertical approval.
2. Generate or recover a server-authored, geometry-only bare shell.
3. Verify every artifact role, MIME, byte size and SHA-256 before exposing any image bytes.
   The GLB copy is independently re-hashed again at the orbit presentation boundary.
4. Cross-check walls, hosted doors/windows, rooms, topology and dynamic room/opening view coverage
   against the approved geometry.
5. Require every inline PNG quality record to pass the immutable shell payload contract.
6. Require the customer to confirm walls, doors, windows, rooms and every verified view.
7. Approve the exact shell version/hash, or hand off to correction for a new server revision.
8. After shell approval, allow only a closed functional furniture brief.

Design selection, materials, furnished modelling, AI rendering, quotation and payment remain
locked throughout this release.

## Exact release handshake

`GET /api/v1/private-shell-capabilities` must return
`homeandme-private-shell-capabilities/1`, match the browser's 40- or 64-character release pin, be
`private, no-store`, use `nosniff`, and advertise only the first five capabilities as true.

Current accepted contract identities are:

- project API: `homeandme-project-api/2`
- workflow: `bare_shell_first/1`
- canonical geometry: `spatialforge-canonical-geometry/1.0`
- source registration: `hnm-source-pixel-metric-registration/1`
- shell payload: `spatialforge-shell-model/2`
- semantic manifest: `spatialforge-shell-scene-manifest/2`
- compiler: `spatialforge-bare-shell-compiler/2`
- coordinate mapping: `canonical-z-up-mm-to-blender-z-up-m-to-gltf-y-up/1`
- neutral material: `spatialforge-neutral-shell-review-material/1`
- neutral lighting: `spatialforge-neutral-shell-review-lighting/2`
- room/opening coverage: `canonical-room-and-hosted-opening-reference-coverage/2`
- camera: `room-rendered-solid-clearance-opening-coverage/3`
- opening visibility: `hosted-opening-centre-ray-frustum/1`
- image quality: `spatialforge-neutral-shell-png-quality/1`
- browser review: `homeandme-private-bare-shell-review/1`
- orbit presentation: `homeandme-private-shell-orbit-presentation/1`
- bundled orbit runtime: `homeandme-bundled-read-only-glb-orbit-runtime/1`
- functional brief: `spatialforge-functional-furniture-brief/1`
- privacy: `same-origin-private-no-store/1`

Unknown or legacy identifiers fail closed. Lighting `/2` also binds exact values to the payload's
profile: preview uses exposure −1 EV, room/key energies 420/1080 W, sun 1.35 and world 0.26;
production uses −1 EV, 90/250 W, sun 0.7 and world 0.08. Payload and semantic manifest must agree.

The camera ledger also requires at least 250 mm of room-boundary clearance, 250 mm from rendered
wall solids, 250 mm across the recorded near-plane sample gate, and 750 mm target distance. The
view count is dynamic. The reviewer validates the canonical-room count, supplementary-opening
count, exact role order and complete hosted-opening union rather than assuming a fixed count. The
current HDB-style regression shape is 15 views: one overview, ten primary room views and four
supplementary opening-coverage views.

The opening-visibility contract proves only that an opening centre ray is in-frustum and does not
cross a rendered wall prism. It does not prove that the full jamb, sill and head envelope is framed.
The current HDB4 imagery therefore remains engineering-only and manually rejected for customer
presentation. A passed PNG gate is not a customer-render or composition-quality claim.

## Service routes consumed

- `GET /api/v1/private-shell-capabilities`
- `GET /api/v1/projects/{projectId}`
- `GET /api/v1/projects/{projectId}/geometry`
- `POST /api/v1/projects/{projectId}/shell-models`
- `GET /api/v1/projects/{projectId}/shell-models/current`
- `GET /api/v1/projects/{projectId}/shell-models/{version}/artifacts/{role}`
- `POST /api/v1/projects/{projectId}/shell-models/{version}/approve`
- `POST /api/v1/projects/{projectId}/furniture-brief`
- `GET /api/v1/projects/{projectId}/furniture-brief`

All control and artifact requests use credentials, `no-store`, redirect rejection and exact
same-origin URLs. No visual-quality endpoint is needed: quality evidence is inside the immutable
shell payload and is revalidated again by shell approval.

## Invalidation and correction

Any geometry version/hash, 2D approval, vertical approval or topology change clears browser image
bytes, inspection and shell state. `returnToCorrection()` performs no service mutation and returns
only an editor handoff that requires a new server geometry revision. It explicitly invalidates the
shell, functional brief, layout, design, furnished model, render, quote and payment chain.

## Remaining integration work

- The backend now applies `Cache-Control: private, no-store` to authenticated project JSON and
  artifact responses, while global middleware supplies `nosniff`. This privacy precondition is
  closed and remains fail-closed in browser tests.
- A private authenticated host must supply the service origin, release pin and reviewer actor, then
  instantiate the disabled surface controller. There is intentionally no public mount or deploy
  entry.
- Customer-facing release remains blocked on a separately versioned composition/full-opening-
  envelope decision. This slice must stay private/default-off while the current imagery is marked
  engineering-only.
- The surface now contains a receipt-bound, non-authoring orbit presentation gate and an explicit
  architectural review panel. It validates current version/hash, manifest hash, role, exact
  `model/gltf-binary` MIME, byte size, SHA-256, self-contained GLB envelope and the already-proven
  same-origin/private/no-store transport before any model URL can exist. Revision changes,
  correction and disposal synchronously abort the runtime, revoke the URL and discard the session.
- The project-owned local WebGL2 runtime now satisfies
  `homeandme-bundled-read-only-glb-orbit-runtime/1`. It consumes the verified ArrayBuffer directly,
  makes no network request, renders the actual generated shell, supports pointer/touch/keyboard
  orbit controls and fails terminally on context loss. Unknown URI/extension/compression/accessor
  features are rejected. `PRIVATE_SHELL_ORBIT_RUNTIME.md` records the exact profile and limitations.
- Both the private surface and its orbit feature still default off. No public page, configuration,
  deployment manifest or live service flag imports or enables the runtime.
- The correction host still needs to consume the returned service-editor handoff. The workflow will
  not navigate or author geometry locally.
- A reloaded `SHELL_GENERATING` project can be resynced, but exact job progress/cancellation after
  reload would require the dashboard to expose the active shell job ID or a current-job lookup.
- Functional layout generation, design selection, furnished modelling, rendering and commerce are
  future dependency-ordered releases and must remain unavailable in this slice.

The browser fixture is `tests/private-shell-workflow.browser.html`; it is `noindex` and contains no
demo geometry or substitute evidence.
