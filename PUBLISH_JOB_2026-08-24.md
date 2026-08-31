# JOB CARD — Publish 5 SEO guides + phone number fix (2026-08-24)

**Owner approval:** Favian approved publication on 2026-08-24 via Telegram
("sure go ahead then"), in response to: "publish all 5 guides + your phone
number fix in one go". Deploy to live homeandme.sg is authorised ONCE all
checks below pass. If any gate fails, STOP and report — do not weaken a gate.
This file is a job card. Do NOT commit it. Delete it when the job is done.

---

## PART 1 — Phone number fix (edits ALREADY MADE in working tree)

Old number 9423 5227 replaced with **+65 8837 6196** (number on the Google
Business Profile). Already edited, uncommitted:

1. `ContactUs.dc.html` — tel: link + visible text
2. `Home AI.dc.html` — tel: link, visible text, WhatsApp wa.me link,
   JSON-LD `"telephone"` field (the part Google reads)
3. `tests/public-capability-copy.test.mjs` — assertion updated to new number

Verified: zero occurrences of `9423` remain anywhere in the repo
(`grep -r "9423"` clean; two hits are unrelated SVG path data / hash strings).

⚠️ **TRAP:** the working tree is currently on branch
`agent/reviewed-reference-gallery`, NOT main. Commit these fixes on **main**
(stash or carry the changes across a checkout), never bury them in that
feature branch.

## PART 2 — Publish the 5 SEO guides

Source drafts (owner-review quality, passed fleet QA 2026-08-13):
`~/Downloads/Telegram Desktop/`
- `SEO-001-how-to-read-hdb-floor-plan.md`
- `SEO-002-floor-plan-concept-visualisation.md`
- `SEO-003-hdb-bto-layout-planning.md`
- `SEO-004-hdb-resale-layout-planning.md`
- `SEO-005-concept-visualisation-limitations.md`

They are drafts with internal headers ("owner-review page draft") — strip
those, keep body content. Do not rewrite substance without reason; if content
is edited, re-run the SG HDB fact-check gate before shipping.

Steps:
1. Convert each to a styled page matching the existing site look
   (`*.dc.html` convention).
2. URLs under `/guides/<slug>` (e.g. `/guides/how-to-read-hdb-floor-plan`).
3. Add ALL five to `deploy/public-pages.txt` — **pages not listed there are
   NOT deployed** (hard rule of the pipeline).
4. Add all five to `sitemap.xml`.
5. Link them visibly: homepage/footer "Guides" section (Google must be able
   to reach them by crawling).
6. Run the full test suite (`node --test`) — must pass incl. the updated
   phone-number assertion. CI `verify-public-site` must go green; it browser-
   smokes every published page and fails on ANY 404, so missing assets will
   be caught.
7. Commit on **main** (one commit: guides; separate commit: phone fix),
   push, watch CI.

## PART 3 — After deploy

1. Confirm live: fetch each new URL + ContactUs + Home AI, check HTTP 200 and
   the new number on the live pages.
2. In Search Console (browser session): request indexing for the 5 new URLs;
   sitemap will re-read automatically.
3. Report to Favian with ONE review link / set of links, plain language:
   what went live, proof the number changed on the live site, indexing
   requested. He approves with eyes, not paths.

## Definition of done

- [ ] Old number gone from LIVE site (not just local)
- [ ] New number on live ContactUs, Home AI (incl. JSON-LD + WhatsApp)
- [ ] 5 guide pages live, linked, in sitemap + public-pages.txt
- [ ] CI green, tests passing
- [ ] Indexing requested in Search Console
- [ ] One-link report sent to Favian
