import { beforeEach, expect, it, vi } from 'vitest';
import { fixtureSnapshot } from '../../src/lib/directory/fixtures';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rpc: vi.fn(),
  tag: vi.fn(),
  path: vi.fn(),
  read: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ updateTag: mocks.tag, revalidatePath: mocks.path }));
vi.mock('../../src/lib/admin/auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('../../src/lib/directory/server', () => ({
  PUBLIC_SNAPSHOT_TAG: 'public-test',
  currentSnapshot: mocks.read,
}));
import { publishItem } from '../../src/app/admin/content-actions';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ client: { rpc: mocks.rpc } });
  mocks.rpc.mockResolvedValue({ data: 9, error: null });
  mocks.read.mockResolvedValue(fixtureSnapshot);
});
function reviewed() {
  const c = structuredClone(fixtureSnapshot.contacts[0]);
  c.approved = true;
  c.source = 'https://example.test/contact';
  c.verifiedAt = '2026-01-01';
  return c;
}
it('returns inline errors without sending an invalid record to the database', async () => {
  const c = reviewed();
  c.numbers[0].dial = '0912 345 6789';
  const result = await publishItem('contact', c.id, c, 8);
  expect(result.ok).toBe(false);
  expect(result.errors?.['numbers.0.dial']).toContain('09123456789');
  expect(result.message).not.toContain('contacts.');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('publishes exactly the selected item and invalidates public data', async () => {
  const c = reviewed();
  const result = await publishItem('contact', c.id, c, 8);
  expect(result).toMatchObject({ ok: true, revision: 9 });
  expect(mocks.rpc).toHaveBeenCalledWith('publish_directory_item', {
    item_kind: 'contact',
    item_key: c.id,
    item: c,
    expected_revision: 8,
  });
  expect(mocks.tag).toHaveBeenCalledWith('public-test');
});
it('keeps conflicts and dependency failures out of field-path messages and does not invalidate caches', async () => {
  const c = reviewed();
  mocks.rpc.mockResolvedValue({ error: { code: '23503' } });
  const result = await publishItem('contact', c.id, c, 8);
  expect(result.message).toContain('Home quick call');
  expect(mocks.tag).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({ error: { code: '40001' } });
  expect((await publishItem('contact', c.id, c, 8)).message).toContain('Another administrator');
});
it('distinguishes committed publication from a cache-refresh failure', async () => {
  mocks.read.mockRejectedValue(new Error('Refresh failed'));
  const c = reviewed();
  expect(await publishItem('contact', c.id, c, 8)).toMatchObject({
    ok: true,
    revision: 9,
    message: expect.stringContaining('in the database'),
  });
});
it('does not attempt writes when authorization fails', async () => {
  mocks.auth.mockRejectedValue(new Error('Access denied'));
  await expect(publishItem('map', 'campus-map', null, 8)).rejects.toThrow('Access denied');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
