# Architecture

## Runtime boundary

The public site remains static GitHub Pages. It contains no backend code, credentials, customer plans, or payment authority.

The staging product is split into:

1. **Static Home & Me web** — `Journey.html`, `journey-api.js`, `three-d-stage.js`, `MyProject.dc.html`.
2. **FastAPI service** — project/session API, private artifacts, approvals, quotation, checkout, webhook, dashboard data.
3. **SQLite registry (staging MVP)** — projects, jobs, versions, artifacts, events, quotes, checkouts, payments, receipts.
4. **Polling worker** — claims durable analysis/model/render jobs separately from web requests.
5. **Private filesystem artifacts (staging MVP)** — content-hashed originals and version-bound derived outputs.
6. **Blender worker capability** — canonical geometry/layout to `.blend`, GLB, and four renders.

Production must replace SQLite/private filesystem with a production database, private object storage, backups, worker leases and supervised processes. The static site must call the API over HTTPS with an exact allowlisted origin.

## Authority chain

```text
private source upload
  → analysis job
  → geometry proposal
  → explicit geometry approval
  → versioned design brief
  → measured layout options
  → explicit layout approval
  → GLB/Blender scene
  → render set
  → explicit design approval
  → preliminary quote
  → explicit quote approval
  → server checkout
  → verified webhook
  → receipt and PAID project
```

Browser meshes, static style images, redirects and client totals are never authoritative.

## Current deployment truth

- `homeandme.sg`: sanitized static demo, API features disabled in committed `config.js`.
- Local staging: full controlled E2E proven.
- Production API/payment: not deployed or enabled.
