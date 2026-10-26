# QROTECT

A QR-accessible emergency contact research prototype for Central Philippine University Senior High School, covering school contacts, Iloilo City services, and selected national emergency contacts.

## Current status

The development foundation is installed. The homepage is an explicitly labeled placeholder; contacts, administrator access, translations, guidance, maps, and offline behavior will be built in subsequent feature branches. No live Supabase project or Vercel deployment is connected.

Initial setup is on `feature/project-setup`. The `main` and `develop` branches currently contain the repository bootstrap. Integrate the reviewed setup into `develop` before branching subsequent features from it.

## Requirements

- Node.js 22.23.2 (recorded in `.nvmrc`).
- pnpm 11.18.0 (pinned in `package.json`).
- Git with your own author name and email configured.

## Run locally

```sh
git switch feature/project-setup
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The starter works without database credentials.

Before using database features, copy `.env.example` to `.env.local` and populate the Supabase project URL and publishable key. Keep `.env.local` untracked. Privileged secret/service-role keys must remain server-side and must never have a `NEXT_PUBLIC_` prefix.

## Stack

- Next.js 16 App Router, React 19, and strict TypeScript.
- Tailwind CSS 4 through PostCSS.
- Supabase JavaScript client and SSR helpers; Zod for validation; no ORM.
- ESLint, Prettier, Husky, lint-staged, and Commitlint.
- Vitest and Playwright test runners.
- Serwist build dependencies for the later offline feature.

Development and production builds use Webpack for compatibility with the planned Serwist integration. A service worker has not been registered; installing its dependencies alone does not make the website work offline.

## Commands

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Start local development                           |
| `pnpm build`        | Build the production application                  |
| `pnpm start`        | Serve the production build                        |
| `pnpm lint`         | Check code with zero warnings allowed             |
| `pnpm typecheck`    | Generate route types and check TypeScript         |
| `pnpm format`       | Format supported project files                    |
| `pnpm format:check` | Verify formatting without changing files          |
| `pnpm check`        | Run formatting, lint, types, and production build |
| `pnpm test`         | Run unit tests                                    |
| `pnpm test:watch`   | Watch unit tests                                  |
| `pnpm test:e2e`     | Run browser tests                                 |

No feature tests exist yet. Test commands intentionally do not treat an empty suite as success. See [tests/README.md](tests/README.md).

## Repository structure

- `src/app`: public and future administrator routes.
- `src/lib/supabase`: validated configuration and separate browser/server clients.
- `supabase/migrations`: future versioned schema and Row Level Security migrations.
- `tests/e2e`: future browser tests.
- `PRODUCT.md`: agreed product requirements.
- `DESIGN.md`: visual direction and design constraints.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. The initial commits use Daniel Mark Wiegand's configured Git identity.

## Supabase and Vercel connection

Supabase helpers validate settings when called. They are integration primitives, not completed authentication or authorization. Implement session refresh, verified server identity, administrator permissions, and Row Level Security before adding protected admin features. Generate database types from the actual schema once provisioned.

After setup integration, connect the Git repository to Vercel with `main` as the production branch and use preview deployments for feature review. Configure preview and production environment variables separately and keep testing content separate from approved research content. No custom `vercel.json` is required for this standard Next.js application.

## Research safety

The agreed prototype simulates agency calls. Only an explicitly consenting test contact may demonstrate a real phone dialer. Do not test real emergency numbers. Public use requires no student account, personal records, or GPS. Emergency guidance and evacuation information require school-approved content and reviewed English/Hiligaynon wording.
