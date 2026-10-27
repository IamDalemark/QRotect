import { snapshotSchema, type Snapshot } from './schema';
export const DATA_CACHE = 'qrotect-public-data-v1';
export const MAP_CACHE = 'qrotect-public-maps-v1';
const key = '/__qrotect/saved-directory';
export type SavedDirectory = { snapshot: Snapshot; savedAt: number; mapSaved: boolean };
export async function readSaved(): Promise<SavedDirectory | null> {
  const response = await (await caches.open(DATA_CACHE)).match(key);
  if (!response) return null;
  const value = await response.json();
  const parsed = snapshotSchema.safeParse(value.snapshot);
  if (!parsed.success || typeof value.savedAt !== 'number') return null;
  return { snapshot: parsed.data, savedAt: value.savedAt, mapSaved: Boolean(value.mapSaved) };
}
export async function saveSnapshot(snapshot: Snapshot): Promise<SavedDirectory> {
  const valid = snapshotSchema.parse(snapshot);
  let mapSaved = false;
  const maps = await caches.open(MAP_CACHE);
  if (valid.map) {
    const url = `/api/public/maps/${valid.map.id}`;
    try {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
      if (
        response.ok &&
        /^image\/(png|jpeg|webp)/.test(response.headers.get('Content-Type') || '')
      ) {
        await maps.put(url, response);
        mapSaved = true;
      }
    } catch {
      mapSaved = Boolean(await maps.match(url));
    }
  }
  for (const request of await maps.keys())
    if (!valid.map || !request.url.endsWith(`/api/public/maps/${valid.map.id}`))
      await maps.delete(request);
  const value = { snapshot: valid, savedAt: Date.now(), mapSaved };
  await (
    await caches.open(DATA_CACHE)
  ).put(
    key,
    new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }),
  );
  return value;
}
export async function fetchSnapshot(): Promise<Snapshot> {
  const response = await fetch('/api/public/snapshot', {
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error('Refresh unavailable');
  return snapshotSchema.parse(await response.json());
}
export function snapshotIsOld(savedAt: number, now: number) {
  return now - savedAt > 7 * 86400000;
}
