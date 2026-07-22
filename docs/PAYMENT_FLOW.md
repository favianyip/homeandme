# Payment Flow

## Authority chain

Checkout requires an approved design version and an approved preliminary quote. The server reads amount, currency, deposit rate, project ID, geometry/layout/design versions and render set from persisted records. The browser cannot supply or change them.

1. Server generates quote.
2. Customer explicitly approves quote.
3. Client supplies only a stable idempotency key.
4. Server creates sandbox checkout from persisted quote.
5. Checkout remains `pending` after redirect/session creation.
6. Provider webhook signs `timestamp + "." + raw_body` with HMAC-SHA256.
7. Server verifies signature and timestamp before JSON parsing.
8. Server validates event type, session, project, quote/design versions, amount and currency.
9. One transaction inserts payment and receipt, marks checkout paid, marks project PAID and appends audit event.
10. Dashboard reads server state.

## Idempotency

- Same checkout idempotency key returns the existing session.
- Same webhook event ID and identical payload returns idempotent success.
- Same event ID with altered payload returns `409`.
- Wrong amount/currency/signature cannot mark paid.

## Production lock

Production mode is disabled. Previously exposed credentials are compromised and are never reused. Enabling production requires rotated provider keys/webhook secret, owner-approved deposit percentage, sandbox-to-staging acceptance, refund/cancellation handling and provider-specific reconciliation.
