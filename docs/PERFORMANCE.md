# Next.js performance checks

## Scope

The first optimization pass keeps Next.js 16.4.3 and Webpack, existing publication caching/invalidation, online refreshes, native public document navigation, and immediately loaded call confirmation. No database schema or hosted content changes are required.

- Public routes import separate Home, Directory, Guidance, Campus Map and About client modules. The private preview composes the three modules it needs. Shared interactive context remains in place for language changes and publication refreshes.
- Administrator editor and preview data loaders request only the saved draft. Overview adds one query for the current publication; History retains its 20 publications and 30 audit events. Authorization still runs before all data access. This reduces content queries from three to one for editing/preview and from three to two for Overview; it does not count authentication queries.
- The campus map has a stable scrollable viewport, capped at 40rem and 70% of the small viewport height. Its original image, zoom controls, download and text remain intact. This avoids guessing image dimensions or introducing image caches that could retain withdrawn maps.

## Repeatable measurements

Build and serve sample mode in one terminal:

```sh
QROTECT_REVIEW_MODE=sample NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= pnpm build
QROTECT_REVIEW_MODE=sample NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= pnpm start --hostname 127.0.0.1 --port 3130
```

Then run, with no competing browser suites or builds:

```sh
pnpm perf:mobile before
# Stop the server, apply a change, rebuild and restart using the same environment.
pnpm perf:mobile after
```

The script refuses nonlocal origins. Override the port with `QROTECT_PERF_ORIGIN`. Reports are ignored under `.local/performance/<label>.json`. Install Chromium using `pnpm exec playwright install chromium` if needed.

Each report includes three cold-browser-cache runs per public route on Chromium with the Pixel 7 profile, 4x CPU throttling, 150ms latency, 1.6Mbps download and 750Kbps upload. It records JavaScript/resource transfer sizes, TTFB, observed LCP and layout shifts, time until the language selector is hydrated, and Home call-confirmation opening time. Telephone links are intercepted; the script never activates a phone handoff.

These are synthetic local measurements with a warm local server and the six-contact sample dataset. The sample contains no approved map. Timing is sampled after load/hydration plus a 1.5-second observation interval; hydration readiness is a proxy, not a React profiler measurement. Confirmation timing includes automation overhead. These are not field Web Vitals, INP measurements, real-device results or hosted Supabase latency. Use the same machine/browser version with no competing workload and compare medians, not individual timings. Three runs establish a lightweight baseline rather than statistical significance.

## First comparison — 29 October 2026

Baseline: `d301d91`; optimized: `refactor/nextjs-performance`, working tree before the final commit. Both used the commands/profile above. Values below are medians of three runs. Transfer sizes are actual browser-reported bytes, including response overhead.

| Route                     | JavaScript before | JavaScript after | Reduction | LCP before / after | Hydrated selector before / after |
| ------------------------- | ----------------: | ---------------: | --------: | -----------------: | -------------------------------: |
| Home                      |         193,940 B |        190,347 B |      1.9% |       592 / 588 ms |                 1,728 / 1,690 ms |
| Directory                 |         193,940 B |        190,998 B |      1.5% |       592 / 588 ms |                 1,723 / 1,690 ms |
| Guide                     |         193,936 B |        174,699 B |      9.9% |       596 / 584 ms |                 1,709 / 1,579 ms |
| Campus map (empty sample) |         193,940 B |        175,063 B |      9.7% |       584 / 584 ms |                 1,696 / 1,590 ms |
| About                     |         193,940 B |        173,356 B |     10.6% |       588 / 592 ms |                 1,702 / 1,578 ms |

Observed sample layout shift was zero before and after. Home confirmation timing was 75ms before and 73ms after; treat that difference as noise. Text LCP was effectively unchanged. The demonstrated benefit is reduced JavaScript, especially on informational routes; these measurements do not support a broad page-load speed claim or an administrator latency claim.

## Bundle analysis

```sh
QROTECT_REVIEW_MODE=sample NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= pnpm analyze
```

The opt-in Webpack analyzer writes `.next/analyze/client.html`, `nodejs.html` and `edge.html` without opening browser tabs. It is disabled during ordinary builds. Reports are generated locally and ignored by Git; they are not publicly served or uploaded. The client report confirms separate screen modules; Zod/schema validation and the dialog remain shared where needed. Supabase does not appear in the analyzed browser bundle. Lucide is already optimized by Next.js; no extra experimental package-import configuration was added. An edge report can be empty when that compiler has no bundle.

## Regression checks

- `pnpm test`: selective admin loading, current-publication selection, failure handling and existing application logic.
- `pnpm check`: formatting, lint, strict types and ordinary production build.
- `pnpm test:browser`: public/browser and isolated local administrator flows. Includes a deliberately delayed test image to verify stable map geometry, zoom and download links. It requires clean local Supabase.

Public client navigation, streaming, additional caching and delayed call-dialog loading remain separate decisions requiring measured justification.
