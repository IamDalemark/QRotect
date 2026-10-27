# Local validation — 27 October 2026

## Verified

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
- Explicit consent for any public test dialer number.
- Actual Android/iPhone QR scanning, offline revisits and dialer demonstration using the consenting number only.
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
