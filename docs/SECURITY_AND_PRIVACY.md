# Security and Privacy

Floor plans and addresses are sensitive.

## Implemented staging controls

- Sanitized public static repository; legacy source is private.
- No backend credentials in public website source.
- Original uploads stored below a private project root.
- Extension/MIME/signature and size checks.
- SHA-256 integrity for source and derived artifacts.
- Hashed high-entropy guest tokens.
- HttpOnly, SameSite guest cookie; Secure enabled by default.
- Exact configured CORS origins with credentials.
- Project-scoped authorization before artifact lookup.
- Expiring HMAC artifact URLs.
- Browser origin, content-type and size validation.
- Path-containment and retrieval hash checks.
- Raw webhook-body HMAC and timestamp verification.
- No payment based on browser redirects.
- TruffleHog scan of the exact public tree: zero findings.

## Required before public production enablement

- Rotate every credential previously present in public history.
- Add CSRF token and strict Origin/Fetch-Metadata enforcement for cookie-authenticated mutations.
- Add rate limits and abuse monitoring.
- Add malware scanning/content disarm.
- Add production private object storage, encryption, retention, deletion requests and secure deletion.
- Add PostgreSQL tenant/owner constraints and immutable-record protections.
- Add backups, restore drills, audit retention and incident runbooks.
- Add CSP and reduce external runtime dependencies.
- Conduct independent penetration/security review.

Do not send plans to external AI services without explicit provider configuration and customer consent.
