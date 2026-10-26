# Supabase

Database schema and Row Level Security policies will be introduced as versioned SQL migrations in `migrations/`. No schema or remote project has been provisioned yet.

The application uses `@supabase/supabase-js` and `@supabase/ssr`, without an ORM. Public connection settings are documented in the root `.env.example`.

Before implementing administrator access, add the authentication session-refresh proxy, verify identities on the server, enforce administrator authorization, and apply database Row Level Security. Client creation by itself does not protect a route.

Generate database TypeScript types from the actual schema once the database exists. Do not maintain invented placeholder database types.
