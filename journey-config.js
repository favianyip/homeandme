// journey-config.js — external data access.
//
// ⚠ SECURITY — READ BEFORE SHIPPING
// data.gov.sg's own guidance is explicit: do not expose your API key in client-side code.
// This file is served to the browser, so the key below is PUBLIC to anyone who opens the page.
// It is placed here so the prototype can exercise the authenticated rate limit; it is not a
// pattern to ship. Before launch, move the register call behind a small server-side proxy that
// holds the key and forwards only the blk_no query, then set DATA_GOV_KEY to '' here.
//
// The key pasted into a chat transcript should be treated as compromised regardless — rotate it
// in the data.gov.sg dashboard and issue a fresh one for the proxy.
//
// WHAT THE KEY BUYS (measured, July 2026):
//   Higher rate limits, and nothing else. Every dataset we use is already public without it —
//   verified: HDB Property Information returns 200 with and without the key.
//   It does NOT unlock property type for private housing. The URA sets published on data.gov.sg
//   ("Private Residential Property Transactions", CCR/RCR/OCR) are QUARTERLY AGGREGATES —
//   columns are quarter / type_of_sale / counts, with no project, street or address. Per-address
//   property type lives in URA REALIS, behind a separate URA agreement, not on data.gov.sg.
//   So the ambiguous-development bucket in journey-housing.js stays ambiguous, and the
//   confirmation index remains the way it gets resolved.
//
// Rate limiting was a real defect, not a theoretical one: under burst load the register
// intermittently dropped requests and surfaced as "property class unconfirmed" — the reason
// journey-address.js carries a retry budget. The key reduces how often that path is taken.

export const DATA_GOV_KEY = ''; // removed for public deploy — inject via server/env

/** Headers for data.gov.sg. Empty object when no key is set, so the call still works unauthenticated. */
export const dataGovHeaders = () => (DATA_GOV_KEY ? { 'x-api-key': DATA_GOV_KEY } : {});
