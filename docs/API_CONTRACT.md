# API Contract

Base path: `/api/v1`. Browser project routes accept an HttpOnly guest cookie; test/non-browser clients may use `Authorization: Bearer <token>`.

## Projects and jobs

- `POST /projects` — create guest project.
- `GET /projects/{projectId}` — current dashboard state.
- `PUT /projects/{projectId}/property` — property type, postal code and levels.
- `GET /projects/{projectId}/events` — ordered audit events.
- `POST /projects/{projectId}/floor-plan` — private multipart upload; returns `202` job.
- `GET /projects/{projectId}/jobs/{jobId}` — status/progress/warnings/results.

Job response fields: `projectId`, `jobId`, `status`, `stage`, `progressPercentage`, `message`, `retryable`, `warnings`, `resultReferences`, `correlationId`.

## Geometry, design and artifacts

- `GET /projects/{projectId}/geometry`
- `POST /projects/{projectId}/geometry/approve`
- `PUT /projects/{projectId}/design-brief`
- `POST /projects/{projectId}/layouts/generate`
- `POST /projects/{projectId}/layouts/{layoutId}/approve`
- `POST /projects/{projectId}/model/generate`
- `GET /projects/{projectId}/model`
- `POST /projects/{projectId}/renders`
- `GET /projects/{projectId}/renders`
- `POST /projects/{projectId}/design/approve`
- `POST /projects/{projectId}/artifacts/{role}/signed-url`
- `GET /projects/{projectId}/artifacts/{role}?expires=…&signature=…`

## Quote and payment

- `GET /projects/{projectId}/quote`
- `POST /projects/{projectId}/quote/approve`
- `POST /projects/{projectId}/checkout-session` — requires `Idempotency-Key`.
- `GET /projects/{projectId}/payment-status`
- `POST /payments/webhook` — raw-body HMAC headers required.
- `GET /sandbox-checkout/{sessionId}` and `POST …/complete` — staging only.

## Errors

Current API uses FastAPI HTTP errors. A unified `{code,message,retryable,field,details,correlationId}` envelope remains required before production release.
