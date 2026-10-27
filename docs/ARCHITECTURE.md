# Architecture

## Request paths

Public pages are server-rendered from the current publication, then enhanced for filtering, language selection, call confirmation and offline recovery. No public authentication is required. With no configured database, the app explicitly labels its demonstration fixtures. A configured database failure never silently substitutes invented contacts.

| Route                                                      | Responsibility                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `/`                                                        | National call confirmation, six categories, search, priority contacts |
| `/directory?category=&area=&q=`                            | Filterable contact rows with browser Back support                     |
| `/guidance`, `/campus-map`                                 | Approved supplied content; unavailable explanations until published   |
| `/about`                                                   | Research/privacy explanation                                          |
| `/admin/login`, `/admin/password`                          | Sign-in/recovery and protected password change                        |
| `/admin`, `/admin/{contacts,guidance,map,publish,history}` | Verified administrator maintenance                                    |
| `/admin/preview`                                           | Private saved-draft preview using either language                     |
| `/api/public/snapshot`                                     | Validated current publication only                                    |
| `/api/public/maps/[id]`                                    | Image only when referenced by current publication                     |
| `/api/admin/map`                                           | Verified administrator's private map preview                          |
| `/api/health`                                              | Minimal health response, no records or credentials                    |
| `/offline`                                                 | Public fallback shell; chooses requested public screen on the client  |

## Database and publication model

Categories and service areas are fixed bilingual application definitions. Contacts, individual numbers, guidance, map metadata and an inert legacy test-contact field form a strictly validated JSON document. This intentionally uses **one private working document** and immutable publication documents, rather than exposing editable records publicly. The pilot is capped at 300 contacts and 30 guidance topics. Revision checks serialize administrator saves; larger multi-editor datasets would need a separate relational editing model.

`directory_drafts` stores the working payload and revision. `publications` stores immutable versions, with a unique index allowing one current version. `administrators` stores authorized Auth user identifiers and active status. `audit_events` stores save/publication events and revision references; visitor activity is not collected.

`save_directory` validates the document and checks its expected revision. `publish_directory` locks the draft, checks approval/source/translation requirements, removes inactive contacts, creates a fresh version and atomically replaces the current publication. `restore_directory` restores a historical snapshot through a new save/publication transaction. Original verification dates remain unchanged. Failed operations roll back together.

Every relevant table has RLS. Anonymous visitors see only the current publication. Non-admin authenticated accounts cannot edit drafts or promote themselves. Protected pages/actions verify Auth identity and database membership; the session-refresh proxy alone is not treated as authorization. No privileged key is required by the website.

Database types are generated from the applied schema. `scripts/write-schema.ts <new_timestamp_name.sql>` creates a new validation migration from Zod; it refuses to overwrite existing migrations. HTTP source restrictions are represented explicitly because JSON-schema conversion does not encode Zod's protocol option.

## Images and calling boundaries

Map storage is private. Uploads accept PNG/JPEG/WebP signatures up to 5 MB. Public reads require a reference in the current published snapshot. Structured text is rendered through React; arbitrary guidance HTML is not accepted.

Voice actions open an accessible confirmation showing the selected agency, branch, line label, displayed number and extension. A completed swipe release or the visible keyboard/tap alternative activates a validated `tel:` link synchronously within that user event. Text-only entries have no call control. All-zero legacy placeholders are rejected. The owner-requested `09123456789` remains callable. Display formatting, dial values and extensions remain distinct; only the raw dial value enters the URL. No connection/completion status is inferred. See CALLING.md.

The retired `/practice` route redirects online bookmarks to `/directory` and is removed from the worker allowlist. The v1 `testContact` field and `mode` literal remain unchanged to preserve existing database schema, publications and offline caches. There is no test-contact screen/editor or use of that field. Exact retired descriptions in known fixture copy are normalized at public read/cache boundaries, without editing real content or changing any dial values.

## Offline boundaries

Serwist's post-build configurator precaches hashed static assets and the dedicated public fallback HTML. It does not precache admin HTML, auth pages, private images, API responses or mutations. Public document navigation uses the network with a three-second timeout and falls back only for the explicit public-route allowlist. Public links use full document navigation so offline recovery is independent of server-component requests.

The browser separately stores a complete Zod-validated snapshot and saved-at time in Cache API. A new invalid snapshot cannot replace the previous valid one. New complete versions replace the directory, removing withdrawn entries. Map caching is separate and reports its own download readiness. The UI reports offline readiness only once the data and fallback shell are saved and a service worker controls the page.

Reconnection refreshes content without automatic page reloads. An open call confirmation retains its selected content until closed. Waiting service-worker updates require an explicit update action. Seven-day saved-data and 30-day contact-verification warnings are research maintenance defaults, not availability guarantees. Storage eviction and a first uncached offline visit cannot be guaranteed.

## Configuration

`.env.example` documents the project URL, publishable key and canonical site origin. Server helpers accept server-only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` overrides so local review processes can override frozen public build settings. The sample review process sets server-only `QROTECT_REVIEW_MODE=sample`; no visitor control enables it. The optional browser client uses normal Next.js build-time public variables. Secret/service-role keys never belong in public variables. Local review tooling reads temporary local management keys into process memory and never prints them.

The implementation follows [Serwist configurator mode](https://serwist.pages.dev/docs/next/config) while retaining the agreed Webpack build.
