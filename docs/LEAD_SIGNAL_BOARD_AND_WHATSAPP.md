# Home & Me lead signal board and WhatsApp routing

Date: 2026-08-17
Status: design-ready; no production webhook, credential, message or spend enabled

## Decision

Do not activate the dormant browser-side webhook pattern. The public site is static GitHub Pages, so a webhook URL embedded in the page would be public, spoofable and unable to prove delivery. It also sends more customer data than an internal alert needs.

Use this boundary instead:

```text
homeandme.sg enquiry
  -> api.homeandme.sg/v1/leads (server-side)
  -> Turnstile + validation + rate limit + idempotency
  -> private lead store and append-only events
  -> signal board
  -> notification adapter (WhatsApp, Telegram or email)
```

The notification is a signal, not the customer record. Keep the full address, phone, email, uploaded plan and notes in the protected board. The group alert should contain only the lead reference, broad property type, selected rooms/trades, urgency, source campaign and a private board link.

## Recommended deployment shape

Because the public site is on GitHub Pages:

- `api.homeandme.sg`: Cloudflare Worker or another managed HTTPS backend.
- Store: D1/Postgres with encrypted backups and restricted operator access.
- Abuse control: Cloudflare Turnstile, verified server-side; per-IP and per-reference rate limits.
- Private board: authenticated route protected by Cloudflare Access or equivalent MFA.
- Secrets: server environment/secret store only; never HTML, JavaScript, query strings or git.
- Files: private object storage with short-lived signed URLs; never send a floor-plan attachment to a group.

A self-hosted Tailscale Funnel endpoint is acceptable for a time-limited staging test, not the preferred production lead system.

## Submission contract

Minimum fields:

- `schema_version`
- server-generated `lead_id` and client-generated idempotency key
- `created_at`, `source_page`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
- name, mobile, email
- street/block, unit, postal code, property type
- plan metadata: original filename, media type, byte size and SHA-256; upload stored separately
- selected styles, areas, trades, timing, coordinator request and notes
- explicit contact consent text/version/time
- privacy notice version
- Turnstile token (validated and discarded; never stored as lead data)

Server-derived fields:

- normalized mobile/email/postal code
- spam/risk result
- duplicate cluster and prior-lead count
- lead temperature and reason
- ownership, SLA deadline and state
- notification attempts and provider message IDs

Do not collect budget unless the owner has decided how it will be used and the privacy notice says so. Do not collect NRIC, payment details or unnecessary household data.

## Lead lifecycle

`NEW -> TRIAGED -> CONTACTING -> QUALIFIED -> SITE_VISIT -> QUOTING -> WON | LOST | NURTURE`

Every state change records actor, time, previous state, reason and optional next action. Never overwrite the event history.

Suggested service levels:

- Hot: keys collected or work within 1–3 months, plan supplied, room/trade scope selected -> acknowledge within 15 minutes during operating hours.
- Warm: 3–6 months or incomplete plan -> acknowledge same business day.
- Explore: just exploring -> automated acknowledgement only after explicit messaging consent, then human review.

## Signal board columns

- New now
- Needs reply
- Qualification in progress
- Site visit booked
- Quote being prepared
- Quote sent
- Won / lost / nurture

Each card shows only what an operator needs: lead ID, broad property type, requested areas/trades, timing, source campaign, age, owner and next action. Full PII opens in the private detail view and is audit logged.

Dashboard measurements:

- visitor -> Step 1 start
- Step 1 -> Step 2
- plan upload rate
- Step 2 style selection completion
- Step 5 reached
- valid lead submitted
- first-response time
- qualified-lead rate
- site-visit rate
- quote rate
- win rate and verified contract value
- loss reason
- conversion by poster/UTM campaign

Measure product events without recording form-field contents in analytics.

## WhatsApp group path

Meta's Groups API can send to a group, but as of the cited 2026 documentation it requires:

1. a WhatsApp Business Platform Cloud API number, not a WhatsApp Business app number;
2. Meta Business Verification;
3. the number registered on the platform for at least 30 days;
4. approved display name and two-step verification;
5. Official Business Account (OBA) status;
6. an app subscribed to the WABA and group lifecycle/participant/settings/status webhooks;
7. `whatsapp_business_messaging` and, for management webhooks, `whatsapp_business_management`;
8. an API-created invite-only group (maximum 8 participants; one Cloud API business per group);
9. an approved group-invite template and a stored group ID after participants join;
10. acknowledgement of per-recipient message pricing and duplicate webhook delivery handling.

The existing ordinary WhatsApp group cannot be assumed reusable. Groups are unavailable to WhatsApp Business app phone numbers. Until OBA eligibility is verified, use the private board plus an approved individual notification destination or Telegram group.

## Exact owner information required before wiring

Business/account:

- Is the current public WhatsApp number a Business app number or Cloud API number?
- Meta Business Verification status.
- WhatsApp Manager screenshot/status for the business number (no token sharing).
- WABA ID and phone-number ID, entered through protected credential intake.
- OBA status: `NOT_STARTED`, `IN_REVIEW`, `APPROVED` or `REJECTED`.
- Names/numbers of at most seven internal participants invited to the API-created group.
- One owner-approved alert template and quiet-hours policy.

Operations:

- Lead owners and backup owner.
- Business hours and response SLA.
- Qualification rules and mandatory loss reasons.
- Retention period and DPO/business contact.
- Who may see addresses, phone numbers and floor plans.
- Preferred immediate fallback notification destination while WhatsApp Groups is unavailable.

Infrastructure:

- Chosen backend host and database.
- `api.homeandme.sg` DNS control.
- Turnstile site configuration.
- Secret manager and backup/restore owner.
- Production monitoring and incident destination.

## Security and QA gates

- Fail closed if Turnstile, schema validation or storage fails.
- Verify Turnstile on the server; tokens are single-use and expire after five minutes.
- Strict CORS for `https://homeandme.sg`; validate `Origin` and content type.
- Maximum request/file sizes; MIME sniffing and malware scan for uploaded plans.
- Idempotency key and duplicate detection before notification.
- Escape all notification text; never allow customer input to control URLs or mentions.
- Verify Meta webhook signatures; expect retries and deduplicate event IDs.
- Log lead IDs and outcomes, not secrets or raw PII.
- Test with synthetic leads only before owner-approved production activation.
- Public publishing, WhatsApp activation, templates and message charges need separate owner approval.

## Sources

- Meta Groups API overview and limits: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups
- Meta Groups API prerequisites: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/get-started
- Meta group messaging: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/groups-messaging
- Meta OBA eligibility: https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts
- Meta webhook retries/permissions: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- Cloudflare Turnstile server verification: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Singapore PDPA obligations: https://www.pdpc.gov.sg/data-protection-obligations
