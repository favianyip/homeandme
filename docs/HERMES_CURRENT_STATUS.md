# HERMES Current Status

Audit date: 2026-07-22. Public source: `favianyip/homeandme` `main` at `fe42186`. Backend component branch: `feature/hermes-floorplan-render-e2e`.

Status vocabulary: **COMPLETE**, **WORKING BUT INCOMPLETE**, **PROTOTYPE ONLY**, **NOT STARTED**, **BLOCKED**.

## Verdict

The controlled staging upload-to-sandbox-payment vertical slice is **COMPLETE and browser-proven**. It is not a production release: arbitrary-plan accuracy, graphical geometry editing, customer-grade photorealism, automatic revision application, production infrastructure, and rotated payment credentials remain incomplete or blocked.

## Security incident containment

| Component | Status | Source/service | Actual result | Limitations / next action |
|---|---|---|---|---|
| Public static source | COMPLETE | `favianyip/homeandme`, GitHub Pages, `homeandme.sg` | Allowlisted 188-file static tree; TruffleHog found 0 verified and 0 unverified secrets | Keep backend/config/customer files out of this repository |
| Legacy source archive | COMPLETE | private `favianyip/homeandme-private` | Legacy history preserved privately | Do not republish it through Pages |
| Sensitive live paths | COMPLETE | `homeandme.sg` | Representative config/payment/code-behind paths changed from `200` to `404` | Continue scheduled secret scanning |
| Exposed credentials | BLOCKED | Provider owner accounts | Publication path contained; credentials were not tested or reused | Owner must revoke and rotate every previously published credential |

## Customer journey

| Component | Status | Files/endpoints | Inputs → outputs | Tests / actual result | Known limitations / next action |
|---|---|---|---|---|---|
| Existing five-station design | COMPLETE | `Journey.html` | Existing visual journey → progressively enhanced real service flow | Browser E2E and screenshots | Preserve styling; no framework rewrite |
| Runtime feature flags | COMPLETE | `config.js`, `journey-api.js` | Explicit configured API URL/flags → API or clearly labelled demo mode | 9 Node tests passed | Production API URL remains intentionally empty |
| Guest project | COMPLETE (staging) | `POST /api/v1/projects` | Property seed → project ID + HttpOnly guest session | API tests + browser E2E | Account claiming is not implemented |
| Floor-plan upload | COMPLETE (controlled formats) | `POST /api/v1/projects/{id}/floor-plan` | PDF/JPG/JPEG/PNG multipart → private original + queued job | Real browser upload returned `202` | Malware daemon, multipage selection, and arbitrary-plan accuracy remain incomplete |
| Progress/resume | COMPLETE (single-host staging) | jobs/events/project endpoints including `DELETE /projects/{id}/jobs/{jobId}`; `project_store.py`, `project_worker.py`, `worker_cli.py`, `journey-api.js` | Durable progress, strict leases/heartbeats, stale recovery, bounded retries, attempt staging, atomic publication, cleanup and authenticated cancellation | Queued jobs cancel immediately; running jobs record an immutable cancellation request and stop publishing/retrying at the next safe worker boundary; crashed workers finalize requested cancellations after lease expiry; project state returns to the last resumable gate | Add visible Journey cancellation controls, faster subprocess interruption and a multi-host production queue |
| Geometry review/correction | WORKING BUT INCOMPLETE | Journey Station 03; `POST /projects/{id}/geometry/{correct,calibrate}`; `geometry.py`; `exporters.py`; existing review kernel | Source version/hash + customer wall measurement or edited rooms/walls/openings → immutable validated millimetre geometry plus versioned canonical JSON, corrected SVG, OBJ and validation report | Tests prove measured-wall calibration rescales planar coordinates, thicknesses and opening spans while preserving vertical heights; valid corrections create private artifacts and invalid networks fail closed | Scale can now be customer-confirmed with evidence; graphical drag/snap controls and room-boundary editing remain |
| Layout options | WORKING BUT INCOMPLETE | `layout_engine.py`, layout endpoints | Approved geometry + brief → practical/storage/premium options using `measured-procedural-2` assets | API and browser flow passed; GLB tests verify articulated sofa component identity and immutable placement IDs | Clearance analysis remains preliminary and assets are procedural rather than manufacturer-grade models |
| Live customer GLB | COMPLETE (controlled fixture) | `scene_renderer.py`, `blender_scene.py`, `project_worker.py`, `three-d-stage.js` | Approved geometry/layout/design brief → style-specific signed GLB → validated browser bytes | GLB loaded in browser; layout hash, brief hash, selected style, material palette and placement IDs verified | Models remain procedural and require a production-grade measured asset library |
| Render review/history | WORKING BUT INCOMPLETE | `blender_scene.py`, `scene_renderer.py`, render endpoints including `GET /projects/{id}/renders/history`; Journey Station 04 | Approved measured layout → articulated procedural sofa/bed/table/storage/kitchen components → default Cycles profile (64 adaptive samples, 960×600, eight bounces, PBR bump materials) → four private versioned views | A real uploaded-plan plus generated measured layout completed four Cycles renders with hash-bound layout/GLB/Blend files; latest evidence is under `docs/evidence/cycles-*.png`; a tested OpenCV denoising experiment was rejected because it caused unacceptable blur | Articulation is visibly better than box placeholders, but noise, sparse dressing, generic geometry and weak cameras remain; output is still not customer-grade photorealism |
| Quote | COMPLETE (preliminary staging quote) | `commerce.py`, quote endpoints, Station 05 | Approved version chain + rates → itemised SGD quote | Browser/API tests passed | Site verification and professional review remain mandatory |
| Sandbox checkout | COMPLETE | checkout and sandbox-provider endpoints | Approved quote + idempotency key → server checkout | Browser checkout passed | Production provider intentionally disabled |
| Secure webhook | COMPLETE (sandbox) | `POST /api/v1/payments/webhook` | Signed event → atomic payment/receipt/project transition | Invalid signature/amount rejected; altered event replay rejected; duplicate identical event idempotent | Add approved production-provider adapter after credential rotation |
| Paid dashboard | COMPLETE (staging guest project) | `MyProject.dc.html`, project/payment/artifact endpoints | HttpOnly guest session → paid project, render, versions, receipt | Paid state survived dashboard reload | Registered accounts and multi-project listing not implemented |
| Revision requests | WORKING BUT INCOMPLETE | Backend `journey_api.py`, `project_store.py`; `POST/GET /api/v1/projects/{id}/revisions`; Journey Station 04 | Natural-language request + explicit scope/rooms + approved design version → immutable hash-bound request, history and selective downstream invalidation | API and frontend tests pass; stale-design and post-checkout changes fail closed; Journey renders revision controls and history | Apply approved requests into a new brief/layout/model/render chain and add revision-regeneration browser E2E; natural-language interpretation requires an approved bounded model/provider or explicit structured customer edits |

## Floor-plan and geometry backend

| Capability | Status | Source / model / algorithm | Actual result | Limitations / next action |
|---|---|---|---|---|
| Ingestion | COMPLETE (bounded) | `ingestion.py`; signatures, extension/MIME, byte limits, SHA-256 | Original bytes recovered exactly through authenticated signed URL | Add ClamAV/content-disarm service and retention/deletion jobs |
| PDF preprocessing | COMPLETE (single page) | `preprocessing.py`; bounded Poppler | Covered by tests | Inspect vector PDF primitives/text before rasterisation; classify floor-plan page |
| Raster extraction | WORKING BUT INCOMPLETE | `raster_geometry.py`; OpenCV projections, OCR scale/labels, coloured opening evidence | Controlled fixture: 4 rooms, 6 wall axes, 2 doors, 2 windows | No production benchmark for arbitrary HDB/condo/landed plans |
| Scale | COMPLETE (controlled fixture) | printed scale marker/OCR → mm-per-pixel | Reference-validated in Stage Gate A | Add customer two-point calibration to integrated UI |
| Canonical geometry | COMPLETE (bounded kernel) | `domain.py`, `geometry.py`; integer mm, partition topology; atomic worker publisher | Deterministic validation passed; geometry version, artifact rows, provenance manifest, project state and current pointer publish atomically without altering the canonical geometry schema | Expand schema for columns/beams/stairs/voids/multiple levels and richer extraction provenance |
| SVG/OBJ | COMPLETE (bounded) | `exporters.py` | Hash-bound vector plan and shell generated | Add technical dimensions/annotations and approved-only policy everywhere |
| GLB/Blender | COMPLETE (controlled fixture) | Blender 4.0.2; approved geometry/layout hashes and measured placements | GLB and `.blend` generated; GLB magic/hash/placement verified | Pin a production worker image and improve assets/materials |
| Rendering | WORKING BUT INCOMPLETE | Blender Cycles production profile plus Eevee test profile, three brief-driven material palettes, four derived cameras | Four hash-bound Cycles PNGs from one approved scene; selected Scandinavian/Modern Luxe/Warm Contemporary style reaches the GLB and render version | Add manufacturer-grade assets, supported denoising and room-specific palettes; current results are not customer-grade photorealism |

## Persistence and security boundaries

| Capability | Status | Source | Actual result | Limitations / next action |
|---|---|---|---|---|
| Project database | WORKING BUT INCOMPLETE | `project_store.py`, SQLite WAL/foreign keys/transactions | Projects, versions, jobs, artifacts, quotes, checkouts, payments, receipts and events persisted; geometry/model/render publication uses lease-guarded all-or-nothing transactions with immutable artifact manifests | Migrate to PostgreSQL for production; add immutable DB triggers and backups |
| Private artifact delivery | COMPLETE (staging) | signed HMAC URL + authorization + retrieval hash; worker staging lifecycle | Unsigned/forged access rejected; browser validates origin/type/size; hourly cleanup removes only unreferenced inactive staging older than 24 hours and preserves active jobs, recent outputs, active-analysis pipeline staging and every artifact-backed directory | Add S3-compatible private object-store adapter and an approved customer-data retention/deletion policy |
| Browser guest auth | COMPLETE (single-host staging) | hashed token + HttpOnly/SameSite cookie; exact-origin CORS, fail-closed Origin enforcement and SQLite-atomic fixed-window rate buckets for unsafe API requests | Missing/foreign origins return `403`; exhausted buckets return `429` with `Retry-After`; allowed browser origin, Bearer requests and signed webhook pass | Replace SQLite buckets with shared PostgreSQL/Redis enforcement for multi-host production; add account claiming and trusted-proxy validation |
| Payment atomicity | COMPLETE (sandbox) | one `BEGIN IMMEDIATE` transaction | Receipt/project/payment/event transition is atomic | Add failure-injection rollback test and production database transaction verification |

## Tests and evidence

- Backend: `uv run ruff check . && uv run ruff format --check . && uv run pytest`
  - **116 passed in 35.39 seconds**
  - Ruff passed; 54 files formatted.
- Frontend: `node --test tests/journey-api.test.mjs`
  - **9 passed**.
- JavaScript/module syntax checks passed for `Journey.html`, `MyProject.dc.html`, `journey-api.js`, and `three-d-stage.js`.
- Visual regression: **passed** for homepage, Journey and paid dashboard at 375, 430, 768 and 1440 px; no horizontal overflow.
- Recorded Playwright staging E2E: **passed**.
  - Real project ID returned.
  - Actual multipart file upload reached backend.
  - Geometry overlay reviewed and approved.
  - Measured layout approved.
  - Signed customer GLB loaded.
  - Four renders reviewed before design approval.
  - Version-bound quote generated and approved.
  - Server checkout created.
  - Signed sandbox webhook confirmed payment.
  - Receipt displayed.
  - Paid dashboard survived reload.
- Evidence: `docs/evidence/staging-e2e/`.

## External blockers

1. Rotate all credentials previously present in public history.
2. Supply approved production payment provider credentials and webhook secret through a secret manager.
3. Confirm the official deposit percentage, currency policy, contact details, retention period, production hosting, and allowed external AI providers.
4. Production release remains blocked until arbitrary-plan validation, geometry correction, photoreal render acceptance, security hardening, deployment/rollback, and visual regression pass.
