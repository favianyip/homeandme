# Home & Me public website

Sanitized static deployment source for [homeandme.sg](https://homeandme.sg). Backend source, customer files and credentials are intentionally excluded.

## Runtime modes

- The committed `config.js` keeps service-backed AI/payment features disabled on the public site until production gates pass.
- `DEMO_FALLBACK_ENABLED` preserves the clearly labelled visual journey.
- Environment-specific staging may provide a private API URL and enable tested flags.

## Implemented staging journey

A controlled local staging test has passed:

```text
floor-plan upload → analysis → geometry approval → measured layout → GLB
→ four render views → design approval → quote approval → sandbox checkout
→ verified webhook → receipt → paid dashboard → browser reload
```

See `docs/HERMES_CURRENT_STATUS.md` and `docs/END_TO_END_TEST_REPORT.md` for exact scope and evidence. This is not yet a production-ready arbitrary-floor-plan or photoreal-render release.

## Frontend checks

```bash
node --check journey-api.js
node --check three-d-stage.js
node --test tests/journey-api.test.mjs
```

The private legacy ASP.NET archive is maintained separately and must never be published through GitHub Pages.
