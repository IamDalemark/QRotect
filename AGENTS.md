<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## QROTECT project rules

- Read `PRODUCT.md` and `DESIGN.md` before product or interface changes.
- Use pnpm 11.18.0, strict TypeScript, and the installed Next.js documentation.
- Keep Webpack builds for the planned Serwist integration.
- Work on descriptive feature branches from `develop` after the setup branch is integrated. Keep `main` for stable releases.
- Make small coherent commits with exactly these types: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`.
- Preserve the configured Git author identity. Initial setup commits are authored and committed by Daniel Mark Wiegand. Do not add automated co-author trailers.
- Run relevant checks and `pnpm check` before integration. Add meaningful tests with features; do not claim empty test suites as passes.
- Keep credentials and generated output untracked. Supabase uses clients and SQL migrations without an ORM.
- The research prototype simulates agency calls. Use only an explicitly consenting test contact for dialer verification.
- Public access collects no student records or GPS. Publish only approved contacts, translations, guidance, and maps.
