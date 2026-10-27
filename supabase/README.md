# Supabase

Local schema, RLS and storage policies are implemented in versioned `migrations/`. The website uses typed Supabase clients and SQL functions without an ORM. No hosted database has been provisioned or migrated by this implementation.

Follow the root README to start local services. Run `pnpm exec supabase migration up --local` for pending migrations. Generate types from the applied local schema with `pnpm exec supabase gen types typescript --local > src/lib/supabase/database.types.ts`, then format the file.

Tables: `administrators`, `directory_drafts`, `publications`, `audit_events`. The `campus-maps` bucket is private. Anonymous access exposes only the current publication and its referenced map. Draft writes and membership changes are denied directly; validated administrator functions implement saving, publication and restoration.

The setup script creates a local review account using the local management API. A hosted release instead requires an invited user and a trusted project operator adding that user's UUID to `public.administrators`. Disable public Auth registration in that project. No administrator can promote themselves through profile metadata.

See [architecture](../docs/ARCHITECTURE.md), [operations](../docs/OPERATIONS.md) and [tests](../tests/README.md).
