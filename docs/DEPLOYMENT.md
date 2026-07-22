# Deployment

## Current environments

- **Public:** sanitized GitHub Pages at `homeandme.sg`; API flags disabled.
- **Local/staging proof:** static HTTP server + FastAPI + polling worker + SQLite/private filesystem + Blender.
- **Production API:** not deployed.

## Local staging commands

From the backend repository root, configure variables listed in `.env.example`, then start:

```bash
uv run uvicorn spatialforge.api:app --host 127.0.0.1 --port 8765
```

Run a separate supervised worker process using `ProjectWorker.from_environment().run_once()` in a polling loop. Serve the sanitized frontend with an environment-specific `config.js` that points to the API and enables only tested flags.

## Release gates

1. Full backend tests, lint and format.
2. Frontend Node tests and syntax checks.
3. Secret scan exact public tree.
4. Recorded browser E2E through verified sandbox payment and dashboard reload.
5. Four-width visual regression.
6. Production database/object storage/queue deployment.
7. HTTPS, cookie/CORS/CSRF/rate-limit validation.
8. Backup/restore and rollback drill.
9. Rotated credentials and owner configuration.
10. Independent security and photoreal-render acceptance.

## Rollback

The live static site remains on API-disabled configuration. Any frontend integration deployment can be rolled back to sanitized commit `189653d`. Backend deployment must use immutable image/version identifiers and preserve database/artifact backups before migration.

No production deployment should point `config.js` to an API until all production gates pass.
