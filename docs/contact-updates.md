# Contact and calling updates

Applied to `/Users/daniel/Documents/QRotect` on `feat/contact-dates-and-copy`. The branch starts from `develop` and includes the existing `main` updates, preserving the administrator sidebar and Next.js security update. The hosted application and database are unchanged.

## Changes

- Overview, history, activity, verification and review dates use readable Philippine calendar dates. `2026-10-30T13:20:13.766446+00:00` displays as `Oct 30, 2026`. Stored timestamps and date input values remain machine readable.
- The Overview description explains its contents and available management tools.
- Contact verification URL and date are optional in the form, server actions and both database publishers. Supplied values still undergo validation. New contacts start with today’s Philippine date; clearing and editing preserve the chosen value.
- Contacts have no visibility toggle. The legacy `active` wire field remains compatible, imports normalize it to true, and public search and quick calls no longer filter it. Approval and reviewed bilingual wording remain required.
- Home shows the exact assigned number and a copy button beside it, including 911. Confirmation has the same copy control beside its frozen number. Copying reports success or manual recovery in the selected interface language and does not open Phone.
- Narrow Home layouts use one column so number and copy controls remain usable. Copy buttons retain 48px touch targets.

## Database rollout

Apply `202611180001_public_contacts_optional_verification.sql` before deploying the application changes. Earlier migration files are unchanged.

The migration normalizes legacy imports/restores, updates both publishers, and creates a new publication containing previously hidden contacts. It preserves immutable historical publications, existing public versions of other contacts, and unrelated private edits. It advances the draft revision to reject stale editor submissions. With no hidden contacts, it does not create an extra publication.

Existing hidden contacts must already satisfy approval, bilingual wording and any supplied review date requirements. If any fail, the migration rolls back with an instruction to review them before rollout; it never fabricates approval. Conflicting line identifiers or Home assignments also roll back. Once migration succeeds, all existing hidden contacts are public.

## Verification

- `pnpm test`: 63 unit tests passed.
- `pnpm check`: formatting, lint, strict TypeScript and Webpack production build passed using the installed dependency versions matching current main.
- Added browser coverage for exact clipboard contents, keyboard copying, failure recovery, Hiligaynon feedback, optional fields, preserved blank dates, and absence of the visibility checkbox. Updated existing call/navigation tests for the new controls.
- Added `scripts/check-contact-update.mts` to `pnpm test:migration`: disposable-database scenarios cover empty rollout, hidden-contact restoration, private-edit isolation, immutable history, and rollback for unreviewed hidden records. Updated item-publication checks for optional metadata and legacy visibility normalization.
- `pnpm test:migration` passed all seven migration scenarios in temporary local databases, including hidden-contact restoration and rollback for unreviewed hidden records.
- Selected Playwright suites for copying, calling, quick calls and navigation passed: 57 tests passed, with 9 intentional browser/viewport matrix skips. Checks covered desktop Chromium, Android Chromium and iPhone WebKit, including accessibility and narrow/enlarged-text layouts. The 320px Home and call-card screenshots were visually reviewed.
- The full database and authenticated administrator browser suites were not run. Use a disposable local Supabase project before running those suites; the browser runner requires a clean local project.

No hosted migration or deployment was performed.
