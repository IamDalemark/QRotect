# Supabase

Local schema, RLS and storage policies are implemented in versioned `migrations/`. The website uses typed Supabase clients and SQL functions without an ORM. The existing configured hosted project was linked and migrations 202610270001–202610270003 were applied on 27 October 2026. Public reads and anonymous access restrictions were verified.

Follow the root README to start local services. Run `pnpm exec supabase migration up --local` for pending migrations. Generate types from the applied local schema with `pnpm exec supabase gen types typescript --local > src/lib/supabase/database.types.ts`, then format the file.

Tables: `administrators`, `directory_drafts`, `publications`, `audit_events`. The `campus-maps` bucket is private. Anonymous access exposes only the current publication and its referenced map. Draft writes and membership changes are denied directly; validated administrator functions implement saving, publication and restoration.

The setup script creates a local review account using the local management API. A hosted release instead requires an invited user and a trusted project operator adding that user's UUID to `public.administrators`. Disable public Auth registration in that project. No administrator can promote themselves through profile metadata.

See [architecture](../docs/ARCHITECTURE.md), [operations](../docs/OPERATIONS.md) and [tests](../tests/README.md).

## Hosted setup and connection diagnosis

An application URL and publishable key connect to an existing project; they do not install its database schema. `pnpm supabase:check` performs read-only checks for the current publication table, administrator authorization function, and published document format without printing credentials or contact records.

For a new hosted QROTECT project, sign in locally with `pnpm exec supabase login`, link the intended project with `pnpm exec supabase link --project-ref <project-reference>`, review `pnpm exec supabase db push --linked --dry-run`, then apply the pending migrations with `pnpm exec supabase db push --linked`. Enter any requested database password in your terminal, never in chat. Check the result with `pnpm supabase:check`.

The SQL Editor alternative is generated with `pnpm supabase:prepare` into the untracked `.local/supabase-bootstrap.sql`. It runs the same migrations in one transaction and refuses to overwrite existing QROTECT objects. If this manual route is used, reconcile migration history with the CLI before a later `db push`; do not blindly run initial migrations twice.

After installation the public directory is intentionally empty until an authorized administrator publishes approved records. Administrator accounts also require an Auth invitation and an active `public.administrators` membership; a public key cannot grant this access. Auth recovery needs the actual website origin in `NEXT_PUBLIC_SITE_URL` and matching allowed redirects in Supabase.
