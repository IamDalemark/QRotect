# Tests

Use Node 22.23.2 and pnpm 11.18.0. `pnpm check` verifies formatting, lint, TypeScript and the production build. No empty suite is counted as a pass.

- `pnpm test`: unit checks for strict schemas, safe phone values, bilingual search, explicit fallback, voice telephone handoffs and legacy fixture compatibility, saved snapshot integrity, map failure and age warnings.
- `pnpm test:db`: local Postgres transaction checks for anonymous/non-admin access, self-promotion denial, draft privacy, schema validation, revision conflicts, failed-publication rollback and historical restoration. All changes roll back.
- `pnpm test:e2e`: production build followed by the isolated browser runner. Requires local Supabase, no existing publications/contact dataset, and installed Chromium/WebKit (`pnpm exec playwright install chromium webkit`).
- `pnpm test:browser`: the same runner using an already current production build.

The browser runner serves samples on port 3100 and the local database application on 3102, creates a temporary local administrator, tests draft saving/publication/withdrawal, and cleans up its account and data. It refuses hosted databases. Do not run while another process uses those review ports. The standalone Playwright configuration can run public checks against a production sample server; use the wrapper for admin coverage.

Browser projects are desktop Chromium, emulated Android Chromium and emulated iPhone WebKit. These are not physical-device certifications. Duplicate admin and viewport-matrix checks are intentionally skipped on the two phone profiles. Screenshots and traces are untracked.

Tests never place calls to real emergency agencies or send external email. Invalid network payloads are deliberately injected in browser tests, including a WebKit-compatible fetch fault because its service-worker-controlled requests bypass page routing.

The calling suite intercepts `tel:` activation and checks release thresholds, cancellation, accessible alternatives, multiple line selection/extensions, queued refresh, offline calling, both languages, legacy zero placeholders and Android touch input. The public/calling suites currently pass 51 checks with six intentional profile skips. Physical Phone-app handoff still needs device testing.
