# Operating QROTECT

## Local administrator review

Follow the root README to start local Supabase and run `pnpm setup:local` once. Use the generated `.local/administrator.txt` at `http://localhost:3102/admin`, with `pnpm review:admin` running. These credentials exist only in the local Docker database. Existing `.env` files are preserved; the review process explicitly builds and starts with local settings. Stop other production/review servers first, and run one review source at a time because they share build output.

Stop a review server with Ctrl+C. Stop local Supabase with `pnpm exec supabase stop` when finished. Do not use a database reset to restart a review with saved work: it can erase the local dataset. The browser test wrapper deliberately refuses datasets containing contacts or publications, so use a separate clean local test project after starting real content work.

## Editing and publication

1. Open **Contacts** and add the agency, branch, category and service area. Enter both descriptions and search aliases. Agency names remain their official names.
2. Add each verified number separately, with its label in both languages, displayed formatting and a single dial value. Enter extensions separately. Choose **Text only** when voice calling is unsupported.
3. Record the official verification source and date. Supply service hours only if verified. Mark approval only after the responsible reviewer checks the record and both languages.
4. Save the draft. It remains private. If another administrator saved first, reload and reconcile instead of overwriting their work.
5. Add guidance only from approved supplied instructions. Add the supplied map with accessible descriptions, ordered text instructions, source, reviewer and review date. Do not infer an evacuation route.
6. Open **Preview & publish**, preview the saved draft in both languages, resolve validation messages, then choose **Publish updates**. Saving and publishing are separate actions.
7. Check the public directory at port 3102. Publishing expires the shared public cache and checks its replacement. Open pages check on reconnect and every minute while visible. If the publication commits but public refresh cannot be confirmed, the status explains this; inspect the public directory before repeating the publication. Devices remaining offline cannot receive withdrawals.

To withdraw a contact, clear **Active contact**, save and publish. To replace/remove the map, update its draft, save and publish. Historical image files remain private unless referenced by the current publication.

Voice numbers use a contact confirmation card, then a deliberate swipe or the accessible **Open Phone instead** link. The exact selected dial value is handed to the device; extensions stay visible for manual entry. The former test-contact editor is removed. Its legacy v1 field remains readable but is never displayed or used for calls.

## Recovery and history

If sign-in expires, sign in again before saving. Password recovery sends through Supabase Auth; local mail is captured by the local mail service, not delivered externally. A hosted release needs approved redirect URLs and mail configuration before recovery can be relied on.

Use **History → Restore as new publication** to restore an earlier version. This explicitly replaces the saved working draft and publishes a new version. It preserves the historical version and original verification dates. Recheck those dates before treating the restored content as current.

A failed publication leaves the prior publication available. If the database is unavailable, the public app can use previously saved information, with a refresh-failure notice. A warm server/page cache can serve the last successful publication even for new visitors; a cold or evicted cache still depends on the database. Health bypasses caching to report origin failure. Keep printed fallback information on QR materials for first-time offline visitors.

## Content backups

Before a substantial update, export the current public JSON to a dated local file from `/api/public/snapshot`, and retain approved source materials. A trusted operator can also create a local public-schema data dump:

```sh
pnpm exec supabase db dump --local --data-only --schema public -f .local/content-backup.sql
```

Store draft backups privately. Restore backups in a separate test database first; validate the document and publish through the normal workflow. A content dump does not back up Auth accounts or Storage image bytes—retain those separately. Publication history is convenient rollback, not an independent backup.

## Hosted release and remaining setup

The existing configured hosted Supabase project received all three QROTECT migrations on 27 October 2026 after local CLI sign-in. Website health/snapshot/homepage checks returned HTTP 200, and anonymous reads of private tables were denied. This installed the database schema; it did not create administrator accounts, publish contacts or deploy the frontend.

For future independent deployments and remaining release setup:

- Provision a separate research Supabase project, apply all migrations and generate matching database types.
- Disable public Auth registration, configure the canonical site origin/recovery redirects, and invite the authorized administrator. A trusted project operator adds that user's UUID to `public.administrators`; browser metadata cannot grant access.
- Configure Vercel production and preview variables separately. Set `main` as the approved production branch. Keep preview content separate from the approved dataset.
- Verify RLS, password recovery, safe calling, both languages, map delivery and offline recovery on the actual host.
- Monitor `/api/health` with an approved availability service without visitor tracking. No external monitor is configured for local review.
- Record the content owner, hosting/account owner, maintenance schedule and backup responsibility.

After choosing the stable approved HTTPS destination, run `pnpm qr -- https://approved-stable-domain/`. Artwork is generated into `.local/qr` as SVG/PNG with a four-module quiet zone. Print the readable destination and approved fallback information alongside it. No production QR has been generated because a destination has not been approved. Test screen and printed scans on actual Android Chrome and iPhone Safari before release.

## Vercel build settings

| Setting          | Value                                              |
| ---------------- | -------------------------------------------------- |
| Framework preset | Next.js                                            |
| Root directory   | Repository root (`.`)                              |
| Install command  | `pnpm install --frozen-lockfile`                   |
| Build command    | `pnpm build`                                       |
| Output directory | Next.js default (`.next`); leave override disabled |
| Node.js          | 22.x                                               |

Set `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the package manager pinned in `package.json` (`pnpm@11.18.0`). Keep development dependencies available during the build because Serwist is part of the production build step. These are configuration instructions only; no deployment was performed. See [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build).

## Public demo contacts

At the owner's request, six sample contacts were installed in the hosted public demo and working draft, all using `0912 345 6789` (`09123456789` as the stored number). Names remain sample names, verification is unset, and the owner has approved retaining that number for phone handoffs. The supplemental placeholder banner is omitted from the updated interface.

For a separate empty demonstration project, `pnpm seed:demo -- --public-demo` is the explicit first-time installer. It requires the matching local demo-administrator credentials and authenticated CLI project management access. It refuses existing drafts with contacts or an existing current publication, backs up the previous draft locally, saves with a revision check, and installs only a fixture snapshot with the inert legacy test-contact field set to null. It does not mark samples approved or weaken the normal publishing function. Privileged keys stay in process memory and are not printed or saved.

Edit the draft in administration and replace the samples with verified records before ordinary publication. The fixture snapshot is demonstration data; it does not establish hotline accuracy or school approval.
