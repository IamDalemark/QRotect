import { afterEach, expect, it, vi } from 'vitest';
import { retireOfflineAccess } from '../../src/lib/directory/legacy-offline';
afterEach(() => vi.unstubAllGlobals());
it('unregisters only the retired QROTECT worker and deletes only its caches', async () => {
  const retired = vi.fn(),
    other = vi.fn(),
    remove = vi.fn();
  vi.stubGlobal('location', { origin: 'https://example.test' });
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistrations: async () => [
        { active: { scriptURL: 'https://example.test/sw.js' }, unregister: retired },
        { active: { scriptURL: 'https://example.test/another-worker.js' }, unregister: other },
      ],
    },
  });
  vi.stubGlobal('caches', {
    keys: async () => [
      'qrotect-public-data-v1',
      'qrotect-public-maps-v1',
      'serwist-precache-v2-ours',
      'serwist-precache-v2-other',
      'unrelated',
    ],
    open: async (name: string) => ({
      match: async () => (name.endsWith('ours') ? new Response('old shell') : undefined),
    }),
    delete: remove,
  });
  await retireOfflineAccess();
  expect(retired).toHaveBeenCalledOnce();
  expect(other).not.toHaveBeenCalled();
  expect(remove.mock.calls.map(([name]) => name).sort()).toEqual([
    'qrotect-public-data-v1',
    'qrotect-public-maps-v1',
    'serwist-precache-v2-ours',
  ]);
});
it('still cleans caches if worker access fails and tolerates unavailable storage', async () => {
  const remove = vi.fn();
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistrations: async () => {
        throw new Error('Denied');
      },
    },
  });
  vi.stubGlobal('caches', { keys: async () => ['qrotect-public-data-v1'], delete: remove });
  await expect(retireOfflineAccess()).resolves.toBeUndefined();
  expect(remove).toHaveBeenCalledOnce();
  vi.stubGlobal('caches', {
    keys: async () => {
      throw new Error('Denied');
    },
  });
  await expect(retireOfflineAccess()).resolves.toBeUndefined();
});
