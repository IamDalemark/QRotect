import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptySnapshot, fixtureSnapshot } from '../../src/lib/directory/fixtures';
import {
  DATA_CACHE,
  MAP_CACHE,
  readSaved,
  saveSnapshot,
  snapshotIsOld,
} from '../../src/lib/directory/offline';
const stores = new Map<string, Map<string, Response>>();
beforeEach(() => {
  stores.clear();
  vi.stubGlobal('caches', {
    open: async (name: string) => {
      const entries = stores.get(name) || new Map<string, Response>();
      stores.set(name, entries);
      return {
        match: async (key: string) => entries.get(key)?.clone(),
        put: async (key: string, response: Response) => entries.set(key, response.clone()),
        keys: async () => [...entries.keys()].map((url) => ({ url })),
        delete: async (key: { url: string }) => entries.delete(key.url),
      };
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it('retains the last complete saved version when a new payload is invalid', async () => {
  await saveSnapshot(fixtureSnapshot);
  await expect(saveSnapshot({ ...emptySnapshot, schemaVersion: 99 } as never)).rejects.toThrow();
  expect((await readSaved())?.snapshot).toEqual(fixtureSnapshot);
});
it('adopts a complete new publication and removes withdrawn contacts', async () => {
  await saveSnapshot(fixtureSnapshot);
  await saveSnapshot({ ...emptySnapshot, version: 'withdrawal' });
  expect((await readSaved())?.snapshot.contacts).toEqual([]);
  expect((await readSaved())?.snapshot.version).toBe('withdrawal');
});
it('does not report offline map readiness when its download fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Disconnected')));
  const id = '00000000-0000-4000-8000-000000000009';
  const saved = await saveSnapshot({
    ...emptySnapshot,
    map: {
      id,
      assetPath: `${id}.png`,
      description: { en: 'Test image', hil: 'Test image' },
      instructions: [{ en: 'Test only', hil: 'Test only' }],
      source: 'https://example.test/map',
      reviewedAt: '2026-01-01',
      reviewer: 'Test',
      approved: true,
    },
  });
  expect(saved.mapSaved).toBe(false);
  expect((await readSaved())?.snapshot.map?.id).toBe(id);
  expect(stores.get(MAP_CACHE)?.size).toBe(0);
});
it('rejects a saved payload with an unsupported schema', async () => {
  await saveSnapshot(emptySnapshot);
  const entries = stores.get(DATA_CACHE)!;
  const key = [...entries.keys()][0];
  entries.set(key, new Response(JSON.stringify({ snapshot: { schemaVersion: 99 }, savedAt: 1 })));
  expect(await readSaved()).toBeNull();
});
it('marks a snapshot older than seven days without changing verification dates', () => {
  const savedAt = Date.UTC(2026, 0, 1),
    week = 7 * 86400000;
  expect(snapshotIsOld(savedAt, savedAt + week)).toBe(false);
  expect(snapshotIsOld(savedAt, savedAt + week + 1)).toBe(true);
});

it('downloads each versioned map once and removes it on withdrawal', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response('image', { headers: { 'Content-Type': 'image/png' } }));
  vi.stubGlobal('fetch', fetcher);
  const id = '00000000-0000-4000-8000-000000000009';
  const snapshot = {
    ...emptySnapshot,
    map: {
      id,
      assetPath: `${id}.png`,
      description: { en: 'Test', hil: 'Test' },
      instructions: [{ en: 'Test', hil: 'Test' }],
      source: 'https://example.test/map',
      reviewedAt: '2026-01-01',
      reviewer: 'Test',
      approved: true,
    },
  };
  expect((await saveSnapshot(snapshot)).mapSaved).toBe(true);
  expect((await saveSnapshot(snapshot)).mapSaved).toBe(true);
  expect(fetcher).toHaveBeenCalledOnce();
  await saveSnapshot(emptySnapshot);
  expect(stores.get(MAP_CACHE)?.size).toBe(0);
});
