# Tests

Vitest is configured for unit tests next to source files (`*.test.ts` or `*.test.tsx`) and under `tests/unit`. Playwright is configured for browser tests under `tests/e2e`, with desktop Chromium, Android Chromium, and iPhone WebKit profiles.

No feature tests exist yet. Add meaningful cases with the feature they verify. Test commands intentionally fail when no tests exist; an empty suite is not a passing feature check.

- `pnpm test`: run unit tests once.
- `pnpm test:watch`: watch unit tests.
- `pnpm test:e2e`: run browser tests with a local development server on port 3100.
- `pnpm exec playwright install chromium webkit`: install browser binaries before the first browser-test run.

The shared `pnpm check` command verifies formatting, lint, types, and the production build. Add relevant feature tests to required checks when those tests are introduced.

Never place research test calls to real emergency services. Use simulations or an explicitly consenting test contact.
