# QROTECT

A QR-accessible emergency contact directory covering campus, Iloilo City, and national services. Call controls show the selected contact, then open the phone app after a deliberate swipe or accessible confirmation button. Public use has no sign-in, student records, location tracking, or call histories.

## Current delivery

Implemented locally: English/Hiligaynon browsing, category/area/search filters, six Home category groups with separate call/browse actions and explicit administrator-selected destinations, a practical Guide, three-item top/phone-bottom navigation, copy controls, confirmation and swipe-to-call, invited administrator authentication, private drafts, bilingual previews, atomic publication, history/restore, private map uploads, and online background publication refresh.

Sample mode contains clearly marked demonstration records. Real contacts, translation review, approved guidance/map, physical phone checks, and the participant pilot remain content/release gates. The hosted Supabase project includes all seven migrations, through the item-publishing extension, applied with owner approval. No Vercel deployment was performed by this implementation.

Initial setup and the earlier feature branches are integrated into `develop`. `main` receives the same locally verified implementation at the user’s request; approved content and hosted release gates remain separate. Work is in **/Users/daniel/Documents/QRotect**, with the Next.js source in `src/app`.

The hosted project now includes six owner-requested demo contacts, one per category, using `0912 345 6789`. They are also available in the working draft for editing. The owner approved retaining this number for phone handoffs. No guidance or map was invented. The code omits the supplemental placeholder banner; hosted frontend changes take effect when the corresponding code is deployed.

Public pages use server-cached publications with online background validation; see [Architecture](docs/ARCHITECTURE.md) for cache freshness and failure behavior.

The call flow uses contact confirmation and an intentional phone handoff. Public wording uses “Campus” and omits prototype, sample-directory and translation-review notices. See [Calling behavior](docs/CALLING.md) for the interaction, compatibility and verification details.

## Local review

Use Node 22.23.2, pnpm 11.18.0, and Docker Desktop for the administrator database.

```sh
pnpm install --frozen-lockfile
pnpm review:sample
```

Open [sample directory](http://localhost:3100). This command builds and serves the sample preview using an isolated data source. Stop other production/review servers first: review modes rebuild the shared `.next` output. Run sample and local-admin review one at a time. Internet is required for page access. No new offline worker or saved directory is created.

For local administrator review, start Docker Desktop, then in another terminal:

```sh
pnpm exec supabase start --exclude studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime
pnpm exec supabase migration up --local
pnpm setup:local
pnpm review:admin
```

Open [local administration](http://localhost:3102/admin). The one-time setup creates a **local-only** administrator and saves its generated credentials to `.local/administrator.txt`. It sends no email and preserves existing environment files. On later runs, reuse that file and skip setup. The connected public site at [port 3102](http://localhost:3102) stays empty until reviewed content is explicitly published. Stop this server before rebuilding for sample mode on port 3100.

For ordinary development, use `pnpm dev`. It reads the configured environment files; review scripts instead explicitly select sample mode or the local database.

## Stack and commands

Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, self-hosted Public Sans, accessible Radix dialogs, Supabase Postgres/Auth/Storage, and Zod. There is **no ORM**: typed Supabase clients call RLS-protected tables and SQL functions.

Builds retain Webpack. Normal server-side publication caching remains for performance. A small static `/sw.js` retirement worker only cleans previous QROTECT installations and unregisters; new pages do not register it. The old `/offline` URL redirects to the online directory.

| Command                         | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                      | Development server                                                        |
| `pnpm build` / `pnpm start`     | Production build / server                                                 |
| `pnpm review:sample`            | Isolated sample directory on port 3100                                    |
| `pnpm setup:local`              | Create the local review administrator once                                |
| `pnpm review:admin`             | Local database review on port 3102                                        |
| `pnpm check`                    | Prettier, ESLint, TypeScript, production build                            |
| `pnpm test`                     | Schema, search, phone, publication refresh, and legacy cleanup unit tests |
| `pnpm test:db`                  | Transactional local database authorization/publication checks             |
| `pnpm test:browser`             | Build and test each source separately; requires clean local test content  |
| `pnpm test:e2e`                 | Build and run the full isolated browser checks                            |
| `pnpm qr -- <stable-https-url>` | Generate local SVG/PNG QR artwork after URL approval                      |

Browser checks create and remove an isolated temporary local account, publications, and draft changes. They refuse to run against hosted databases or an existing publication dataset. Install Chromium/WebKit first with `pnpm exec playwright install chromium webkit`.

## Project guide

- [Quick-call UX research](docs/QUICK_CALL_UX_RESEARCH.md): direct Home actions, destination selection and accessibility tradeoffs.
- [Filter UX research](docs/FILTER_UX_RESEARCH.md): primary-source evidence and the compact inline filter interaction.
- [Architecture](docs/ARCHITECTURE.md): routes, publication model, security and online access boundaries.
- [Operations](docs/OPERATIONS.md): administrator workflow, recovery, backup and future release setup.
- [Validation](docs/VALIDATION.md): verified scope and pending release gates.
- [Product brief](PRODUCT.md), [design direction](DESIGN.md), [contribution rules](CONTRIBUTING.md).

Credentials, build output, screenshots and local QR artwork are untracked. Impeccable is installed; its manual audit and independent design review supplement browser/accessibility testing. Native hook execution requires approval in Codex's hook controls.

## Relational database redesign

The private directory is stored in related contact, number, category, service-area, shortcut, guidance and map tables. Public delivery retains complete versioned snapshots. The relational redesign is applied locally and hosted. The additive item-publishing extension is also applied hosted; the corresponding frontend release remains pending. See [database design and rollout](docs/RELATIONAL_DATABASE.md). Run `pnpm test:migration` for isolated conversion/rollback checks and `pnpm test:db` for privacy, foreign keys, publication and restore checks.

## Performance tooling

See [performance measurements and commands](docs/PERFORMANCE.md) for the mobile production baseline and opt-in Webpack bundle reports. Run `pnpm analyze` for local bundle reports and `pnpm perf:mobile <label>` against a local production server. Generated reports stay in ignored local folders.

## Administrator item publishing

Administrators publish one contact, Home assignment, guidance topic or map directly. Forms provide concrete examples and inline errors; maps accept drag-and-drop or a file picker. No draft-save or publish-all step is required. Complete versions remain available in History. See [operating instructions](docs/OPERATIONS.md). The additive `202610290003_publish_directory_item.sql` is applied hosted; the frontend can now be released against it. Earlier hosted migrations were completed during the 29 October administrator repair.
