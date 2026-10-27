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

Tests use local services and clearly synthetic records, not real agency calls. No hosted deployment or hosted database migration was performed. Existing environment files are preserved; review scripts explicitly select local/sample settings.

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
