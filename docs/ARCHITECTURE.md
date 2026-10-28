# Architecture

## Request paths

Public pages are pre-rendered from a validated publication with 60-second incremental regeneration, then enhanced for filtering, language selection, call confirmation and online background updates. A shared Next.js Data Cache stores only validated public publications, keyed by Supabase URL and tagged for invalidation. It uses `unstable_cache` to retain the existing non-Cache-Components/Webpack setup; a Cache Components migration is separate work. No public authentication is required. Configured database errors never substitute demonstration fixtures. A failed page regeneration throws so Next.js retains the last successful page; a configured production build needs a readable publication source.

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
| `/offline`                                                             | Redirect to the online directory for old bookmarks                        |

## Database and publication model

Private working content is relational: `categories`, `service_areas`, `contacts`, `contact_numbers`, `quick_call_assignments`, `guidance` and `campus_maps`. Categories/service areas use fixed seeded IDs and bilingual labels matching the application. `directory_drafts` holds one revision and scalar compatibility metadata; it no longer stores the full payload. Position columns preserve array order. The pilot remains capped at 300 contacts and 30 guidance topics.

`get_directory_draft()` assembles the existing `{payload, revision}` administrator contract from those tables in one consistent snapshot. `save_directory` locks/checks the revision and writes working rows atomically. Primary/foreign/unique keys enforce ownership and valid references; the complete document is still validated. Global saves remain serialized, not per-contact concurrent editing.

`publications` retains immutable complete JSON snapshots with one current version, adding nullable publisher identity/source revision. Existing snapshot bytes remain unchanged and older provenance is not guessed. `publish_directory` validates relational content, removes inactive contacts, creates a new version and switches the current version in one transaction. `restore_directory` imports a past snapshot through save/publish as a new version; original dates and history remain intact. Failed operations roll back the working rows, revision, publication and audit records together. A trigger protects snapshot content/history from updates/deletion.

Every table has RLS. Anonymous visitors see only the current publication and its authorized map. Authenticated non-administrators cannot read working content or call the draft loader. Active administrators may read working rows but must use authorized functions to write; internal importer/assembler functions have no public/visitor execute permissions. `administrators` references Auth identities; `audit_events` records actor, action, draft revision and optional publication. Publisher/actor references become null on account removal, preserving history. Visitor activity is not collected.

Database types are generated from the migrated local schema. The relational migration was applied locally; hosted migration and a matching frontend release remain separate steps. See [relational database design and rollout](RELATIONAL_DATABASE.md) for fields, ERD, preservation checks, backup/release sequencing and tests. `scripts/write-schema.ts` still creates new validation migrations from Zod and refuses to overwrite older migrations.

## Home quick calls

Home shows one category group per service with separate Call and View contacts controls. It has no priority contact list; the legacy stored `priority` flag is preserved without a maintenance checkbox. The optional v1 `quickCalls` array has at most six `{category, contactId, numberId}` assignments. Both application publication checks and SQL reject duplicates, missing or inactive contacts, category mismatches, ambiguous number IDs, text-only lines and all-zero dial values. Missing or duplicate references are rejected at save. Existing references with changed category, active status or channel can be saved for review but must be repaired before publishing. A shared client resolver checks the exact IDs, never array order, and renders category browsing when no usable assignment exists. Phone handoff reuses the existing frozen-target confirmation with a custom native button trigger. No query runs on activation.

Older v1 snapshots without this field remain readable. Known legacy fixture IDs receive the explicit authored demo assignments at normalization boundaries; non-fixture publications never infer assignments. Explicit `quickCalls: []` remains cleared. The six demo lines retain `09123456789`. New strict-schema fields require deploying the updated application reader before publishing assignments. Previously installed workers are retired by the static cleanup worker and online client cleanup.

`/admin/quick-calls` edits the assignments in the normal saved draft. `/admin/preview` includes Home and uses a preview provider that never refreshes the public publication. Publish/restore use the existing cache invalidation and warming hooks.

## Images and calling boundaries

Map storage is private. Uploads accept PNG/JPEG/WebP signatures up to 5 MB. Public reads require a reference in the current published snapshot. Structured text is rendered through React; arbitrary guidance HTML is not accepted.

Voice actions open an accessible confirmation showing the selected agency, branch, line label, displayed number and extension. A completed swipe release or the visible keyboard/tap alternative activates a validated `tel:` link synchronously within that user event. Text-only entries have no call control. All-zero legacy placeholders are rejected. The owner-requested `09123456789` remains callable. Display formatting, dial values and extensions remain distinct; only the raw dial value enters the URL. No connection/completion status is inferred. See CALLING.md.

The retired `/practice` route redirects online bookmarks to `/directory` and has no public navigation entry. The v1 `testContact` field and `mode` literal remain unchanged to preserve existing database schema and publications. There is no test-contact screen/editor or use of that field. Exact retired descriptions in known fixture copy are normalized at public read boundaries, without editing real content or changing any dial values.

## Public navigation and Guide

The three ordinary page links are `/`, `/directory`, and `/guidance`; About moves to the footer. At widths up to 760px, the bar is fixed at the bottom, uses device safe-area insets and reports its measured height through ResizeObserver to reserve content space. A visible call panel hides the mobile bar without losing its reservation. Desktop navigation stays above content. Current-page state uses an empty deterministic server snapshot followed by the browser's actual pathname to avoid hydration mismatches.

The existing `/guidance` route now renders the Guide hub. Static bilingual help describes calling and internet-access behavior; approved published guidance and the approved map link appear conditionally. Existing public URLs remain unchanged. These are page-navigation links, not an ARIA tab widget.

## Online access and legacy retirement

Pages require a network connection. The public provider starts with the server-rendered validated publication, performs one deduplicated conditional snapshot request, and retains data only in memory for the current page. An SHA-256 ETag permits 304 responses without repeating the body. Reconnection, visible-tab resume after 60 seconds, and a 60-second visible-page interval check for newer content. Invalid or failed refreshes retain the currently displayed data with a connection notice. A call confirmation keeps its selected recipient until it closes.

No directory snapshots or map bytes are written to browser Cache API. New pages do not register a service worker. The existing language preference remains in localStorage; it contains no directory records. Normal browser HTTP caching and Next.js server/page caching are separate performance mechanisms, not an offline feature.

For previously installed versions, `public/sw.js` is a static retirement worker with no fetch handler. It immediately activates, deletes the two legacy QROTECT data/map caches and Serwist precaches containing the old `/offline` shell, claims clients, and unregisters. Public-page startup also unregisters only QROTECT's `/sw.js` registrations and clears those owned caches. Unrelated registrations and caches are preserved; cleanup errors do not block the online directory. Old bookmarks to `/offline` redirect to `/directory`. Disconnected old installations cannot receive the retirement until they reconnect.

## Configuration

`.env.example` documents the project URL, publishable key and canonical site origin. Static HTML is tied to its build-time source. Local sample/admin preview scripts build using their selected source before starting; run one review environment at a time because they share `.next`. The full browser runner builds and tests sample/public and local/admin phases sequentially. Server helpers accept server-only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` overrides so local review processes can override frozen public build settings. The sample review process sets server-only `QROTECT_REVIEW_MODE=sample`; no visitor control enables it. The optional browser client uses normal Next.js build-time public variables. Secret/service-role keys never belong in public variables. Local review tooling reads temporary local management keys into process memory and never prints them.

The build uses Next.js with Webpack; Serwist is no longer a dependency.

## Cache freshness and publication

The public HTML and validated data cache each revalidate after 60 seconds on demand. `/api/public/snapshot` remains a dynamic, `no-store` response backed by the same server data cache; it has no independent CDN TTL, avoiding a second purge/invalidation system. Public HTML uses Next.js ISR and Vercel's framework cache. Admin/auth responses remain private and uncached. Health deliberately bypasses the public cache so an origin outage cannot appear healthy just because a publication is cached.

After a successful publish or restore transaction, the Server Action immediately expires the publication tag with `updateTag`, invalidates public layouts, and reads the publication to warm/check the data cache. Failed transactions do not invalidate anything. A committed transaction followed by a refresh failure is reported as a committed publication with an unconfirmed public refresh, rather than as a failed transaction. Regenerated HTML is produced on subsequent visits; already-open pages refresh through their background request and retain frozen calling details until the card closes.

A 60-second policy is not a freshness SLA: time-based stale-while-revalidate is request-driven, data/page layers and browser checks can add delay, and disconnected/suspended devices cannot receive changes. Warm caches retain the last successful data during origin failures; cold/evicted caches still need Supabase. Direct SQL changes bypass publication hooks and depend on time-based regeneration. Versioned CDN files would be the next architectural step if database-independent cold delivery becomes required. No Redis, realtime subscription, new database index or extra service is needed for this change.
