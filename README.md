# QROTECT

A QR-accessible emergency contact **research prototype** for CPU Senior High School, covering school, Iloilo City, and national services. Agency call controls are simulations. Public use has no sign-in, student records, location tracking, or call histories.

## Current delivery

Implemented locally: English/Hiligaynon browsing, category/area/search filters, copy controls, call simulations, invited administrator authentication, private drafts, bilingual previews, atomic publication, history/restore, private map uploads, and offline public access after a successful first visit.

Sample mode contains clearly marked demonstration records. Real contacts, translation review, approved guidance/map, test-contact consent, physical phone checks, and the participant pilot remain content/release gates. Nothing has been deployed to Vercel or a hosted Supabase project by this implementation.

Initial setup and the completed feature branches are integrated into `develop`. `main` receives the same locally verified implementation at the user’s request; approved content and hosted release gates remain separate. Work is in **/Users/daniel/Documents/QRotect**, with the Next.js source in `src/app`.

## Local review

Use Node 22.23.2, pnpm 11.18.0, and Docker Desktop for the administrator database.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm review:sample
```

Open [sample directory](http://localhost:3100). This command explicitly isolates the sample preview from any existing Supabase environment file. Offline functionality requires the production build; development mode intentionally does not register a service worker.

For local administrator review, start Docker Desktop, then in another terminal:

```sh
pnpm exec supabase start --exclude studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime
pnpm exec supabase migration up --local
pnpm setup:local
pnpm review:admin
```

Open [local administration](http://localhost:3102/admin). The one-time setup creates a **local-only** administrator and saves its generated credentials to `.local/administrator.txt`. It sends no email and preserves existing environment files. On later runs, reuse that file and skip setup. The connected public site at [port 3102](http://localhost:3102) stays empty until reviewed content is explicitly published. Sample mode on port 3100 is a separate review surface.

For ordinary development, use `pnpm dev`. It reads the configured environment files; review scripts instead explicitly select sample mode or the local database.

## Stack and commands

Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, self-hosted Public Sans, accessible Radix dialogs, Supabase Postgres/Auth/Storage, Zod, and Serwist. There is **no ORM**: typed Supabase clients call RLS-protected tables and SQL functions.

Builds retain Webpack. Serwist's documented configurator mode runs after Next.js so offline setup cannot break page startup when storage is unavailable. Only public fallback HTML and static assets are precached.

| Command                         | Purpose                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                      | Development server                                                               |
| `pnpm build` / `pnpm start`     | Production build / server                                                        |
| `pnpm review:sample`            | Isolated sample directory on port 3100                                           |
| `pnpm setup:local`              | Create the local review administrator once                                       |
| `pnpm review:admin`             | Local database review on port 3102                                               |
| `pnpm check`                    | Prettier, ESLint, TypeScript, production build                                   |
| `pnpm test`                     | Schema, search, phone, and offline-data unit tests                               |
| `pnpm test:db`                  | Transactional local database authorization/publication checks                    |
| `pnpm test:browser`             | Production browser checks; requires a current build and clean local test content |
| `pnpm test:e2e`                 | Build, then run the full browser checks                                          |
| `pnpm qr -- <stable-https-url>` | Generate local SVG/PNG QR artwork after URL approval                             |

Browser checks create and remove an isolated temporary local account, publications, and draft changes. They refuse to run against hosted databases or an existing publication dataset. Install Chromium/WebKit first with `pnpm exec playwright install chromium webkit`.

## Project guide

- [Architecture](docs/ARCHITECTURE.md): routes, publication model, security and offline boundaries.
- [Operations](docs/OPERATIONS.md): administrator workflow, recovery, backup and future release setup.
- [Validation](docs/VALIDATION.md): verified scope and pending release gates.
- [Product brief](PRODUCT.md), [design direction](DESIGN.md), [contribution rules](CONTRIBUTING.md).

Credentials, generated workers, build output, screenshots and local QR artwork are untracked. Impeccable is installed; its manual audit and independent design review supplement browser/accessibility testing. Native hook execution requires approval in Codex's hook controls.
