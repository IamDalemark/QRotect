# Reset and populate website content

Run commands from the QROTECT project root with pnpm 11.18.0. These tools require the current migrations and a privileged PostgreSQL connection. Only population requires an existing active administrator. They never reset Auth users, administrator memberships, schema, categories, service areas or uploaded images.

For hosted reset, configure either `QROTECT_HOSTED_DATABASE_URL` or the separate hosted connection fields below. For local reset, only `QROTECT_LOCAL_DATABASE_URL` is required. Reset dry run reports existing content counts without changing data.

Set these server-only variables in your untracked `.env.local` or shell; do not put passwords in commands or commit them:

```dotenv
QROTECT_LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Population only:
QROTECT_ADMIN_USER_ID=<existing-active-administrator-uuid>
# Hosted operations only; copy your project's database or session-pooler connection:
QROTECT_HOSTED_DATABASE_URL=<privileged-postgresql-connection-url>
NEXT_PUBLIC_SUPABASE_URL=https://<project-reference>.supabase.co
```

Alternatively, split the hosted connection into these fields:

```dotenv
QROTECT_HOSTED_DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
QROTECT_HOSTED_DB_PORT=5432
QROTECT_HOSTED_DB_NAME=postgres
QROTECT_HOSTED_DB_USER=postgres.YOUR_PROJECT_REFERENCE
QROTECT_HOSTED_DB_PASSWORD="YOUR_DATABASE_PASSWORD"
```

Use the actual host and user shown in Supabase → Connect → Session pooler. Enter the raw password; the script URL-encodes it automatically. Next.js expands `$` in environment files, so escape any literal dollar sign in a password as `\$`. Port defaults to `5432` and database name defaults to `postgres`. If `QROTECT_HOSTED_DATABASE_URL` is nonempty it takes precedence; remove that line to use separate fields. Local connections support the same fields with the `QROTECT_LOCAL_DB_` prefix. Both reset and population support either format.

The local URL is the standard Supabase CLI default; use your actual local port/password if different. For population, obtain the local administrator UUID from Supabase Studio. No accounts are created by these commands. Hosted population connections must use `db.<project-reference>.supabase.co` or the Supabase pooler with username `postgres.<project-reference>`. Preserve TLS verification in your connection configuration. Never use a public API key as a database password.

## Simple commands

Configure these defaults once in `.env.local`:

```dotenv
QROTECT_DB_TARGET=hosted
QROTECT_POPULATE_FILE=./directory.json
QROTECT_ADMIN_USER_ID=<existing-active-administrator-uuid>
```

Then run `pnpm db:populate` to replace and publish the configured JSON, or `pnpm db:reset` to clear content. The administrator UUID is used only for population. The JSON file must contain reviewed, publishable content; the sample intentionally remains unapproved. If no population path is configured, it defaults to `./directory.json`. `--target` and `--file` override environment values when supplied. The project reference is derived from `NEXT_PUBLIC_SUPABASE_URL` and checked against the database connection automatically; `--confirm-project` remains an optional additional explicit check.

## Commands

```sh
pnpm db:reset -- --target local --dry-run
pnpm db:reset -- --target local
pnpm db:populate -- --target local --file ./directory.json --dry-run
pnpm db:populate -- --target local --file ./directory.json

pnpm db:populate -- --dry-run
pnpm db:populate
pnpm db:reset
```

Reset connects directly using the configured URL or separate connection fields. It needs no project confirmation, administrator UUID, application URL or backup. It clears all contacts, phone lines, assignments, guidance, map metadata, publications and audit history in one transaction. It saves an empty draft with an increased revision, invalidating stale administrator edits. Uploaded map images remain private unless referenced by a current publication.

Populate **replaces the entire working directory and publishes it**, preserving previous publications/history. Records absent from JSON disappear from the current directory. Use a maintenance window so administrators do not lose private working edits. Saving and publishing share one transaction; a failure rolls both back. Database constraints and publication rules remain authoritative. Population dry run checks configuration, administrator membership, JSON publication requirements and map asset existence without writing files or content; it does not execute save/publish and cannot guarantee a later write will succeed.

Before every population write, a protected JSON backup is created in `.local/backups/`. It includes the original draft metadata/document, publication rows and audit rows, and the target identity. Backup failure prevents mutation. This is a content recovery artifact, not a full database dump; uploaded image bytes and authentication are excluded. For full disaster recovery use your normal Supabase/PostgreSQL backup. To restore a directory, extract the backup's `document` into a separate JSON file and import it after reviewing publication eligibility; exact history restoration requires a trusted database operator to restore `publications` and `auditEvents` rows in a transaction. Keep backups private.

After success the database is updated immediately. The website caches publications with a 60-second revalidation interval; its first request after expiry may trigger background refresh. Refresh again after revalidation or restart the website to clear its cache. Do not rerun a successful import just to refresh the page.

## JSON samples

Start with [directory.sample.json](../examples/directory.sample.json). It deliberately uses the approved demonstration number `09123456789`, `fixture: true` and `approved: false`; the importer rejects it for public publication. Replace the demonstration details, review both languages, set approvals only after review, and set `fixture: false`. Never fabricate approval, review or verification details. Contacts allow an empty source and verification date under the current schema.

Categories: `police`, `fire`, `medical`, `hospital`, `disaster`, `school`. Areas: `cpu` (internal campus identifier), `iloilo`, `national`. The internal `cpu` enum is retained for schema compatibility; visible sample text uses “campus”. Each contact, number and guide needs its own UUID. Quick calls reference the exact contact and number UUIDs; use `[]` for none. Keep `testContact: null`. Publication version and timestamp are generated by the database.

For a map, replace `"map": null` with the object from [campus-map.sample.json](../examples/campus-map.sample.json). Its visible name is **Campus map**, with no university name. The official source URL is retained for attribution. Upload the PNG/JPEG/WebP through Administration → Map first and copy its actual `assetPath` into JSON. Set the actual review date and reviewer, review the translations, and approve only after review. JSON does not upload images or accept remote image URLs in `assetPath`.

## Verification

Run `pnpm test` for unit and transaction-boundary checks. Run `pnpm test:db:content` against local Supabase (or a loopback `TEST_DATABASE_URL`) for real SQL save, publish, failure rollback, reset and account-preservation checks. All integration test changes are rolled back.
