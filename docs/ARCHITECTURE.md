# Architecture

## Request paths

Public pages are pre-rendered from a validated publication with 60-second incremental regeneration, then enhanced for filtering, language selection, call confirmation and offline recovery. A shared Next.js Data Cache stores only validated public publications, keyed by Supabase URL and tagged for invalidation. It uses `unstable_cache` to retain the existing non-Cache-Components/Webpack setup; a Cache Components migration is separate work. No public authentication is required. Configured database errors never substitute demonstration fixtures. A failed page regeneration throws so Next.js retains the last successful page; a configured production build needs a readable publication source.

| Route                                                                  | Responsibility                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                                                    | National confirmation, six category call/browse groups, search            |
| `/directory?category=&area=&q=`                                        | Filterable contact rows with browser Back support                         |
| `/guidance`, `/campus-map`                                             | Practical Guide with approved safety content; supplied map when published |
| `/about`                                                               | Research/privacy explanation                                              |
| `/admin/login`, `/admin/password`                                      | Sign-in/recovery and protected password change                            |
| `/admin`, `/admin/{contacts,quick-calls,guidance,map,publish,history}` | Verified administrator maintenance                                        |
| `/admin/preview`                                                       | Private saved-draft preview using either language                         |
| `/api/public/snapshot`                                                 | Validated current publication only                                        |
| `/api/public/maps/[id]`                                                | Image only when referenced by current publication                         |
| `/api/admin/map`                                                       | Verified administrator's private map preview                              |
| `/api/health`                                                          | Minimal health response, no records or credentials                        |
| `/offline`                                                             | Public fallback shell; chooses requested public screen on the client      |

## Database and publication model

Categories and service areas are fixed bilingual application definitions. Contacts, individual numbers, guidance, map metadata and an inert legacy test-contact field form a strictly validated JSON document. This intentionally uses **one private working document** and immutable publication documents, rather than exposing editable records publicly. The pilot is capped at 300 contacts and 30 guidance topics. Revision checks serialize administrator saves; larger multi-editor datasets would need a separate relational editing model.

`directory_drafts` stores the working payload and revision. `publications` stores immutable versions, with a unique index allowing one current version. `administrators` stores authorized Auth user identifiers and active status. `audit_events` stores save/publication events and revision references; visitor activity is not collected.

`save_directory` validates the document and checks its expected revision. `publish_directory` locks the draft, checks approval/source/translation requirements, removes inactive contacts, creates a fresh version and atomically replaces the current publication. `restore_directory` restores a historical snapshot through a new save/publication transaction. Original verification dates remain unchanged. Failed operations roll back together.

Every relevant table has RLS. Anonymous visitors see only the current publication. Non-admin authenticated accounts cannot edit drafts or promote themselves. Protected pages/actions verify Auth identity and database membership; the session-refresh proxy alone is not treated as authorization. No privileged key is required by the website.

Database types are generated from the applied schema. `scripts/write-schema.ts <new_timestamp_name.sql>` creates a new validation migration from Zod; it refuses to overwrite existing migrations. HTTP source restrictions are represented explicitly because JSON-schema conversion does not encode Zod's protocol option.

## Home quick calls

Home shows one category group per service with separate Call and View contacts controls. It has no priority contact list; the legacy stored `priority` flag is preserved without a maintenance checkbox. The optional v1 `quickCalls` array has at most six `{category, contactId, numberId}` assignments. Both application publication checks and SQL reject duplicates, missing or inactive contacts, category mismatches, ambiguous number IDs, text-only lines and all-zero dial values. Drafts can hold references needing repair. A shared client resolver checks the exact IDs, never array order, and renders category browsing when no usable assignment exists. Phone handoff reuses the existing frozen-target confirmation with a custom native button trigger. No query runs on activation.

Older v1 snapshots without this field remain readable. Known legacy fixture IDs receive the explicit authored demo assignments at normalization boundaries; non-fixture publications never infer assignments. Explicit `quickCalls: []` remains cleared. The six demo lines retain `09123456789`. New strict-schema fields require deploying the updated reader/worker before publishing assignments; older installed clients may retain their last readable snapshot until the explicit website update is accepted.

`/admin/quick-calls` edits the assignments in the normal saved draft. `/admin/preview` includes Home and uses a preview provider that never reads/writes public saved data, registers a worker, or refreshes the public publication. Publish/restore use the existing cache invalidation and warming hooks.

## Images and calling boundaries

Map storage is private. Uploads accept PNG/JPEG/WebP signatures up to 5 MB. Public reads require a reference in the current published snapshot. Structured text is rendered through React; arbitrary guidance HTML is not accepted.

Voice actions open an accessible confirmation showing the selected agency, branch, line label, displayed number and extension. A completed swipe release or the visible keyboard/tap alternative activates a validated `tel:` link synchronously within that user event. Text-only entries have no call control. All-zero legacy placeholders are rejected. The owner-requested `09123456789` remains callable. Display formatting, dial values and extensions remain distinct; only the raw dial value enters the URL. No connection/completion status is inferred. See CALLING.md.

The retired `/practice` route redirects online bookmarks to `/directory` and is removed from the worker allowlist. The v1 `testContact` field and `mode` literal remain unchanged to preserve existing database schema, publications and offline caches. There is no test-contact screen/editor or use of that field. Exact retired descriptions in known fixture copy are normalized at public read/cache boundaries, without editing real content or changing any dial values.

## Public navigation and Guide

The three ordinary page links are `/`, `/directory`, and `/guidance`; About moves to the footer. At widths up to 760px, the bar is fixed at the bottom, uses device safe-area insets and reports its measured height through ResizeObserver to reserve content space. A visible call panel hides the mobile bar without losing its reservation. Desktop navigation stays above content. Current-page state uses an empty deterministic server snapshot followed by the browser's actual pathname: the HTML served by the saved `/offline` shell must not freeze the active item on Home or cause hydration attribute mismatches.

The existing `/guidance` route now renders the Guide hub. Static bilingual help describes existing calling and offline behavior; approved published guidance and the approved map link appear conditionally. Existing URLs and the worker's route allowlist remain unchanged. These are page-navigation links, not an ARIA tab widget.

## Offline boundaries

Serwist's post-build configurator precaches hashed static assets and the dedicated public fallback HTML. It does not precache admin HTML, auth pages, private images, API responses or mutations. For the explicit public-route allowlist, returning visitors with a valid saved directory immediately receive the precached shell, online or offline; the provider reads saved data and validates updates separately. Without valid saved data/shell, navigation uses the network with a three-second fallback timeout. Public links retain full document navigation so offline recovery is independent of server-component requests. Direct category/search URLs are interpreted in the browser after hydration, allowing one pre-rendered directory page for all queries.

The browser separately stores a complete Zod-validated snapshot and saved-at time in Cache API. A new invalid snapshot cannot replace the previous valid one. New complete versions replace the directory, removing withdrawn entries. Map caching is separate and reports its own download readiness. The UI reports offline readiness only once the data and fallback shell are saved and a service worker controls the page.

Startup performs one deduplicated conditional snapshot request; an SHA-256 ETag for the full normalized document allows a 304 response without repeating its body. Worker readiness no longer triggers another fetch. Reconnection, visible-tab resume after 60 seconds, and a 60-second visible-page interval refresh content without automatic page reloads. Older timestamped publications cannot roll a device back after it has seen a newer version. Versioned map bytes are reused from their separate cache. An open call confirmation retains its selected content until closed. Waiting service-worker updates require an explicit update action. Seven-day saved-data and 30-day contact-verification warnings are research maintenance defaults, not availability guarantees. Storage eviction and a first uncached offline visit cannot be guaranteed.

## Configuration

`.env.example` documents the project URL, publishable key and canonical site origin. Static HTML is tied to its build-time source. Local sample/admin preview scripts build using their selected source before starting; run one review environment at a time because they share `.next` and `public/sw.js`. The full browser runner builds and tests sample/public and local/admin phases sequentially. Server helpers accept server-only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` overrides so local review processes can override frozen public build settings. The sample review process sets server-only `QROTECT_REVIEW_MODE=sample`; no visitor control enables it. The optional browser client uses normal Next.js build-time public variables. Secret/service-role keys never belong in public variables. Local review tooling reads temporary local management keys into process memory and never prints them.

The implementation follows [Serwist configurator mode](https://serwist.pages.dev/docs/next/config) while retaining the agreed Webpack build.

## Cache freshness and publication

The public HTML and validated data cache each revalidate after 60 seconds on demand. `/api/public/snapshot` remains a dynamic, `no-store` response backed by the same server data cache; it has no independent CDN TTL, avoiding a second purge/invalidation system. Public HTML uses Next.js ISR and Vercel's framework cache. Admin/auth responses remain private and uncached. Health deliberately bypasses the public cache so an origin outage cannot appear healthy just because a publication is cached.

After a successful publish or restore transaction, the Server Action immediately expires the publication tag with `updateTag`, invalidates public layouts, and reads the publication to warm/check the data cache. Failed transactions do not invalidate anything. A committed transaction followed by a refresh failure is reported as a committed publication with an unconfirmed public refresh, rather than as a failed transaction. Regenerated HTML is produced on subsequent visits; already-open pages refresh through their background request and retain frozen calling details until the card closes.

A 60-second policy is not a freshness SLA: time-based stale-while-revalidate is request-driven, data/page layers and browser checks can add delay, and offline/suspended devices cannot receive changes. Warm caches retain the last successful data during origin failures; cold/evicted caches still need Supabase. Direct SQL changes bypass publication hooks and depend on time-based regeneration. Versioned CDN files would be the next architectural step if database-independent cold delivery becomes required. No Redis, realtime subscription, new database index or extra service is needed for this change.
