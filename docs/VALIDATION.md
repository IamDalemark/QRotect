# Home quick calls — 28 October 2026

Implemented on `feature/home-quick-call` for local review, including the previously reviewed compact-filter feature. No merge, push, hosted content change or deployment was performed for this work.

- Home replaces the six category-navigation tiles with explicit call actions showing assigned agencies. One activation opens the existing exact-recipient confirmation; deliberate swipe or the accessible tap alternative opens Phone. Directory search and filters retain their layout. Missing assignments offer category browsing and never substitute a different recipient.
- `/admin/quick-calls` selects each exact active category contact and voice line; normal save/preview/publish applies. Private preview now includes Home and explicitly avoids public publication refresh, visitor Cache API reads/writes and worker registration. Known authored legacy demo IDs use the approved six `09123456789` lines; real publications never infer targets from order or priority.
- Optional assignments preserve reading older v1 snapshots. `202610280001_quick_calls.sql` extends shape validation and publication reference checks without editing existing content. Applied to local Supabase only. Hosted migration and updated app/worker deployment remain pending; deploy compatible readers before publishing assignments. Older installed clients may need the existing explicit website update.
- `pnpm check` passed: formatting, ESLint, TypeScript, production Next/Webpack build and Serwist. **39 unit tests passed**. `pnpm test:db` passed existing authorization/privacy/conflict/rollback/restore checks plus quick-call atomic publication, old snapshots and eight invalid-target cases; test transactions rolled back.
- Final public/calling/performance/filter/quick-call browser phase: **81 passed, twelve intentional profile skips** across desktop Chromium, Android Chromium and iPhone WebKit. The final isolated local administrator phase: **one passed, two duplicate-profile skips**. After the public phase passed, an exact label locator failed in the new admin check; changing it to the semantic combobox locator made the targeted admin phase pass against the unchanged local build. No real telephone call or external email was sent.
- Coverage includes six one-action confirmations, no activation-triggered snapshot queries, exact voice-line selection despite alternative records/order, focus return, offline Hiligaynon handoff, cleared-assignment browsing, configured-target persistence, private-preview isolation, publish and withdrawal after clearing. Automated accessibility checks passed. Narrow/enlarged-text checks found section-heading overflow; allowing the heading/link row to wrap resolved it.
- Inspected nine final captures: Home at 320/390/1440px in both languages, 320px Hiligaynon with 200% text, and administrator assignment controls at desktop/mobile widths. Fresh independent Impeccable finish review: **ship**, no material fixes at the extension's scope. Manual detector returned `[]`; documenter confirmed the existing visual system needs no changes. The reviewer identified compressed enlarged-text Home search as inherited and outside this change, not a new material finding.

Physical phone handoff, manual screen-reader checks, reviewed Hiligaynon and live hosted release verification remain separate checks. Primary-source rationale and confirmed owner choices are in QUICK_CALL_UX_RESEARCH.md.

---

# Compact directory filters — 28 October 2026

Implemented on `feature/compact-directory-filters`, for local review. The directory sidebar is replaced by a search input and one labeled Filters button. Its inline disclosure contains category/service-area selectors and Clear filters; changes apply locally and immediately. The trigger counts active groups without counting search. Panel clearing retains search; empty-result reset clears all restrictions atomically. Direct links, Back, language switching, cached publications and phone confirmation remain intact.

- `pnpm check` passed (format, lint, TypeScript, production Next/Webpack build and Serwist generation); 26 unit tests passed.
- Public/calling/performance/filter browser suites: **71 passed, ten intentional duplicate-profile skips** across desktop Chromium, Android Chromium and iPhone WebKit. Includes opening/closing, group counts, combined restrictions, clear semantics and Back restoration, bilingual panel state, keyboard focus/tab order, hidden-control exclusion, concise result status, offline filtering with zero requests, empty reset and existing calling/cache/privacy coverage. No calls placed.
- Open/closed captures at 320, 390 and 1280px in English and Hiligaynon were inspected. A 320px/200%-text check found existing masthead overflow, fixed by allowing the narrow header to wrap; the final reflow check passed. Automated accessibility checks passed for the open panel and existing public screens.
- Independent Impeccable finish review: **ship**, no material fixes, at the scope of this precise existing-world extension. All 13 bilingual/open/closed/enlarged-text captures were inspected. Manual detector returned no findings.
- Primary-source findings and the selected immediate/disclosure tradeoffs are in FILTER_UX_RESEARCH.md. No API/schema/dependency or hosted publication changes were made. The full local database/admin integration suite was not repeated for this interface-only update; physical devices, manual screen readers and reviewed Hiligaynon remain separate release checks.

---

# Public directory performance update — 28 October 2026

Implemented on `feature/public-directory-cache`, for local review. No hosted publication changes or deployment were made for this update.

- Public pages pre-render successfully with a 60-second regeneration policy; admin/auth routes remain dynamic/private. A shared validated publication cache removes repeated database reads. Successful publish/restore actions expire its tag, invalidate public layouts and warm/check the data cache.
- The snapshot endpoint uses a full-document ETag and returns 304 for unchanged data, without an independent CDN response cache. The browser starts one validation request, checks periodically while visible, and deduplicates worker readiness/resume triggers.
- Returning public navigation uses the precached shell and validated saved directory immediately. A new timestamped publication cannot be replaced by an older cache node. Offline navigation preserves the original saved-at timestamp; versioned maps are reused and withdrawn maps removed. Calling details stay frozen until the card closes.
- `pnpm check` passed: formatting, lint, TypeScript, production Next/Webpack build and Serwist generation. The route report lists `/`, `/directory`, `/about`, `/guidance` and `/campus-map` as pre-rendered with one-minute revalidation.
- 26 unit checks passed, including conditional responses, publication ordering, map reuse, authorized publication invalidation, failed transactions and committed-publication/failed-refresh reporting.
- Public/calling/performance browser suites: **63 passed, six intentional duplicate-profile skips** across desktop Chromium, Android Chromium and iPhone WebKit. Includes rendered contacts/call confirmation while the initial refresh is held, 304 responses, saved-shell response identity, refresh failure retention, original offline saved-at time, existing calling/offline/privacy, responsive layout and automated accessibility checks. Telephone activations were intercepted; no calls were placed.
- The isolated real production-cache experiment (`scripts/check-public-cache.mts`) uses a local fake PostgREST origin with 200 ms latency. Warm requests made zero additional database reads and completed around 3–5 ms; unchanged responses returned 304. After the actual 60-second TTL, an origin outage retained the last valid directory, uncached health returned 503, and recovery adopted a publication with withdrawn contacts. A cold-cache outage returns 503 and does not poison the cache with an error document.
- Local normal production HTTP comparison before/after caching: typical homepage/directory/snapshot responses changed from roughly 160–180 ms to 2–17 ms. One earlier first request took about one second. These are small local samples with hosted Supabase, not deployed-site or mobile-network benchmarks; no Vercel CDN timing/SLA is claimed.
- Sample review now builds using its own selected data source and was exercised end to end. The local-admin preview/browser wrapper also builds each source before serving, sequentially, to avoid hosted/sample HTML leaking into a different review source. **Full local admin/database integration was not rerun because Docker Desktop is paused.** Publication cache hooks have focused mocked-action coverage; rerun the clean local browser/database suites after Docker is available.

Time-based regeneration is request-driven and layers can add delay; the 60-second interval is not a maximum staleness guarantee. Cold/evicted caches still need Supabase, offline/suspended clients cannot receive corrections, and new deployments require a readable configured source. Existing installations receive the new service worker through the existing explicit update control. Physical-device and hosted deployment verification remain pending.

---

# Local validation — 27 October 2026

## Campus wording and notice cleanup

The owner approved removing the sample-directory, prototype/simulation and translation-review notices, and using Campus/Kampus for visible campus references. The masthead now leads directly to navigation; About explains directory usage, phone handoff, saved information and privacy. Page metadata, manifest description and administrator sign-in copy use campus wording. Existing contact numbers, verification/source data and stored service-area identifiers remain unchanged.

`pnpm check`, 16 unit tests and 51 public browser checks pass, with six intentional profile skips. The existing queued-refresh test now waits until its injected request actually starts, avoiding a race with the initial offline save; application refresh behavior is unchanged. Additional bilingual About, service-area label, metadata and manifest checks pass. Desktop/mobile captures were inspected, the detector returned no findings, and the fresh independent finish reviewer returned **ship**, with no material fixes. No hosted data mutation, frontend push or deployment was performed.

## Real-calling update — current verification

The owner approved replacing all call simulations and practice screens with a confirmation card and phone handoff, while retaining `09123456789` for the six demo contacts. This supersedes the older simulation behavior recorded below. No hosted data or database schema changed.

- `pnpm check` passes: formatting, lint, strict TypeScript, production Next.js/Webpack build and Serwist generation.
- **16 unit tests** pass, including voice-only telephone URLs, short codes, unsafe values, all-zero legacy placeholders, owner-supplied demo numbers and compatibility with old saved fixture copy.
- **51 public browser checks pass**, with **six intentional profile skips**, across desktop Chromium, emulated Android Chromium and emulated iPhone WebKit. This run includes actual emulated touch input on Android, pointer release/cancel, no handoff on opening or partial swipes, single activation/retry, keyboard alternative, selected-number/extension separation, queued directory refresh, offline behavior and both languages. Every activated telephone link is intercepted; no phone application or call is launched.
- Responsive checks cover 320px, 390px and desktop confirmation cards. Enlarged root text at 200% preserves the swipe label inside its growing track and keeps controls accessible within the scrollable sheet.
- Automated axe checks, including WCAG 2.2 AA on the dialog, report no violations. This is not a full accessibility certification.
- Final desktop/mobile, bilingual, enlarged-text and handoff-state captures were opened and inspected. The manual detector reports no findings on changed interface targets. A fresh independent Impeccable finish reviewer returned **ship**, with no material fixes; the documenter confirmed the existing design files remain faithful and require no system changes.

The earlier local administrator/database checks below are historical and were not repeated for this UI update. The test-contact editor was removed while the v1 wire field remains inert for compatibility. Physical Android/iPhone phone-app handoff, manual screen-reader checks, reviewed Hiligaynon and research-release content checks remain pending. This update stays on the feature branch for local review; it has not been pushed or deployed.

## Earlier baseline (before the real-calling update)

- Production Next.js/Webpack build and post-build Serwist generation succeed.
- Prettier, ESLint with zero warnings, and strict TypeScript checks pass.
- **12 unit tests** pass for schemas, source URLs, phone values, bilingual search/fallback and saved data integrity.
- Local database transaction checks pass: anonymous/non-admin denial, self-promotion denial, private drafts, schema validation, optimistic conflicts, failed-publication rollback, and version-preserving restoration.
- **29 browser checks pass**, with four intentionally skipped duplicate admin/viewport checks on mobile profiles. Projects are desktop Chromium, emulated Android Chromium and emulated iPhone WebKit.
- Admin sign-in, private draft save, unreviewed-publication denial, invalid map upload rejection, approved test publication, withdrawal into a new publication, and sign-out pass against local Supabase. Temporary records/accounts are cleaned up.
- Category-to-simulation takes two actions; agency pages contain no dialer links. Clipboard failure provides manual recovery. Filters, Back, language selection and direct links work.
- Saved public routes reopen offline; language and simulations continue. Invalid refreshed data retains the valid saved version. Storage failure preserves online controls. Admin/auth content is absent from public caches.
- No horizontal overflow at the tested 320px, 390px and 1120px widths. Automated axe WCAG 2 A/AA and 2.1 AA checks report no violations on home, directory and sign-in.
- Independent design-review fixes are resolved; the manual Impeccable detector reports no findings. See DESIGN_REVIEW.md for scope and the inline documentation-check substitution.

Tests use local services and clearly synthetic records, not real agency calls. No frontend deployment was performed. The subsequent hosted database setup is recorded below. Existing environment files are preserved; review scripts explicitly select local/sample settings.

The database and 29-browser-check passes were completed while the local stack was running. The final database repeat was interrupted because Docker Desktop was paused and its resume controls timed out; no database implementation changed after the earlier passing run.

## Still required before the research release

- Official school/local contacts and verification evidence, with a named maintenance owner.
- Reviewed Hiligaynon wording, approved guidance and supplied map/text equivalent.
- Actual Android/iPhone QR scanning, offline revisits and phone handoff using a consenting number.
- Manual screen-reader, keyboard, text resizing/200% zoom and daylight usability checks.
- Map replacement/download-failure checks using the approved supplied image, and a controlled application-update/eviction exercise on real devices.
- Performance measurements under agreed mobile network/CPU conditions. LCP/CLS/INP and transfer targets remain targets, not measured claims.
- Consented participant pilot and content sign-off.
- Approved stable HTTPS destination, hosted authorization/recovery checks, printed QR verification, independent backups and operating ownership.

This is a locally verified research implementation, not an operational emergency dispatch system or a full WCAG certification.

## Hosted connection repair

On 27 October 2026, read-only requests to the configured hosted project returned `PGRST205` for the missing `public.publications` table and `PGRST202` for the missing `public.is_admin` function. The URL and publishable key were accepted; only local migrations had previously been applied.

After the owner signed into the local CLI, the configured project was linked. Migration history confirmed that all three local migrations were unapplied. A dry run listed only those three migrations, which were then applied using `supabase db push --linked`.

Verified afterwards:

- Hosted publication table and administrator authorization function are available.
- Anonymous requests to drafts, audit history and administrator membership return permission denied (`42501`), and `is_admin` returns false.
- A local production server using the hosted project returns HTTP 200 for `/api/health`, `/api/public/snapshot` and `/`; health reports connected and the homepage renders the directory interface.
- The snapshot is schema version 1, is not a fixture, and has zero contacts because nothing is published yet. No sample contacts were published.
- `pnpm check` and the 12 unit tests pass with the added setup diagnostics.

No administrator invitation, account promotion, frontend deployment or emergency call was performed. Keep credentials out of source and chat. `pnpm supabase:check` provides a repeatable read-only configuration check.

## Public demo population

The owner explicitly requested a public demonstration using `09123456789` and omission of the separate placeholder banner. The first-time installer found an empty draft and no current publication, saved six editable draft contacts, and installed a six-contact fixture snapshot. Public readback confirmed the supplied number, `fixture=true`, no approvals and no consenting test contact. Existing records were not overwritten.

After the change, `pnpm check` and 12 unit tests passed. The public Playwright suite passed 28 checks, with two duplicate viewport-matrix skips, against a local production server reading the actual hosted demonstration data. Desktop, mobile, directory, simulation and Hiligaynon captures were inspected. The manual detector returned no findings on the changed shell; a fresh independent finish reviewer returned **ship**, and the documenter confirmed no design-system changes were needed.

Hosted data is already populated. Removing the banner on a hosted frontend requires deployment of the corresponding source revision; no deployment was performed as part of these local checks.
