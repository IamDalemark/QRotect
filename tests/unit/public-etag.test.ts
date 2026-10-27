import { expect, it, vi, afterEach } from 'vitest';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
import { snapshotETag } from '../../src/lib/directory/public-etag';
import { preferNewerPublication } from '../../src/lib/directory/publication-order';
import { fetchSnapshot } from '../../src/lib/directory/offline';
afterEach(() => vi.unstubAllGlobals());
it('changes the ETag when contact contents change even with the same version', async () => {
  const changed = structuredClone(fixtureSnapshot);
  changed.contacts[0].numbers[0].dial = '911';
  expect(await snapshotETag(changed)).not.toBe(await snapshotETag(fixtureSnapshot));
});
it('reuses the exact validated directory when the endpoint returns 304', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
  vi.stubGlobal('fetch', fetcher);
  expect(await fetchSnapshot(fixtureSnapshot)).toBe(fixtureSnapshot);
  expect(fetcher.mock.calls[0][1].headers['If-None-Match']).toBe(
    await snapshotETag(fixtureSnapshot),
  );
});
it('does not accept a 304 without a current snapshot', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 304 })));
  await expect(fetchSnapshot()).rejects.toThrow('Refresh unavailable');
});

it('keeps a newer saved publication when a slower node returns an older one', () => {
  const older = { ...fixtureSnapshot, publishedAt: '2026-10-27T00:00:00Z' };
  const newer = { ...fixtureSnapshot, publishedAt: '2026-10-28T00:00:00Z', contacts: [] };
  expect(preferNewerPublication(newer, older)).toBe(newer);
  expect(preferNewerPublication(older, newer)).toBe(newer);
  expect(preferNewerPublication(null, older)).toBe(older);
});
