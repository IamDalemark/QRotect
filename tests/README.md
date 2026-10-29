# Verification

Run `pnpm test` for directory, calling, publication, conditional-response, and legacy-worker-cleanup logic. Run `pnpm check` for formatting, lint, TypeScript, and production build.

`pnpm test:browser` builds isolated sample/public and clean local/admin sources sequentially. It requires local Supabase and refuses to use hosted databases or an existing publication dataset. Tests intercept telephone links and never place real calls or send external email.

Public browser checks cover Home quick calls, exact phone-line confirmation, cancellation, keyboard/touch alternatives, bilingual search and filters, URL/Back behavior, Guide content, responsive navigation, enlarged text, and automated accessibility. They verify that normal page requests use the network, no saved directory or worker registration is created, old offline bookmarks redirect, and the retirement worker clears only legacy QROTECT caches before unregistering. Connection/invalid-refresh handling preserves the currently rendered directory without reading a persistent saved copy.

Administrator checks cover protected editing, private preview isolation, assignment persistence, validation, publication, and withdrawal. Database checks exercise authorization and transactional publication; the offline-removal change does not alter the database schema or publishing workflow.

Physical QR scans, phone-app handoff, manual screen readers, reviewed translations, and the participant pilot remain separate release checks. Historic test counts in `docs/VALIDATION.md` describe earlier source revisions; record fresh results for this change.

Normal server caching remains: `pnpm exec tsx scripts/check-public-cache.mts` checks production caching against an isolated fake origin without modifying hosted data.

## Relational database checks

`pnpm test:migration` builds the previous schema in a disposable local database, seeds populated and legacy documents, applies the conversion, and verifies exact content/history preservation. Invalid references and duplicate IDs must roll back every migration change. It deletes only that disposable database.

`pnpm test:db` additionally checks private-table/helper denial, admin-only controlled writes, complete bilingual round-trip and ordering, foreign keys, save rollback, revision conflicts, publication provenance/immutability, restore and account deletion. Test records roll back. Browser checks use a clean local dataset and temporary account; privileged cleanup is restricted to that test account and its publications.

For a focused administrator rerun, use `pnpm exec tsx scripts/run-browser-checks.mts --admin-only`. It uses the real local Supabase API (including safe-update protections), an isolated port and temporary account, and checks save, preview, publication, withdrawal and restore. Public checks use port 3120 and administrator checks use 3122; occupied test ports fail before setup. Logs remain in `.local/browser-checks`.

## Performance and map regression checks

`pnpm perf:mobile <label>` measures a local production server with a fixed mobile profile and writes ignored JSON reports. See [measurement methodology](../docs/PERFORMANCE.md) for reproducible commands and limitations. `pnpm analyze` generates local Webpack bundle reports.

The public suite includes a delayed approved test image to verify stable map viewport/instruction geometry, zoom and download links. Administrator unit checks ensure unavailable history cannot block editing or private preview, Overview finds the actual current publication, and protected data remains inaccessible after authorization failure.
