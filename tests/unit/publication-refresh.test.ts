import { beforeEach, expect, it, vi } from 'vitest';
import { emptySnapshot } from '../../src/lib/directory/fixtures';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  path: vi.fn(),
  read: vi.fn(),
}));
vi.mock('next/cache', () => ({ updateTag: mocks.update, revalidatePath: mocks.path }));
vi.mock('@/lib/admin/auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/directory/server', () => ({
  currentSnapshot: mocks.read,
  PUBLIC_SNAPSHOT_TAG: 'public-test',
}));
import { publishDraft, restorePublication } from '../../src/app/admin/content-actions';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    client: {
      rpc: mocks.rpc,
      from: () => ({ select: () => ({ single: mocks.single }) }),
    },
  });
  mocks.single.mockResolvedValue({ data: { payload: emptySnapshot, revision: 3 }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.read.mockResolvedValue(emptySnapshot);
});
it('does not invalidate public data when a publication transaction fails', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Conflict' } });
  expect((await publishDraft(3)).ok).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.path).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
});
it('expires and warms the public cache after successful publication', async () => {
  expect((await publishDraft(3)).ok).toBe(true);
  expect(mocks.update).toHaveBeenCalledWith('public-test');
  expect(mocks.path).toHaveBeenCalledWith('/', 'layout');
  expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.update.mock.invocationCallOrder[0],
  );
  expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.read.mock.invocationCallOrder[0],
  );
});
it('reports a committed publication separately from a failed public refresh', async () => {
  mocks.read.mockRejectedValue(new Error('Origin unavailable'));
  const result = await publishDraft(3);
  expect(result.ok).toBe(true);
  expect(result.message).toContain('in the database');
  expect(result.message).toContain('could not be confirmed');
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it('refreshes the same cache after restoring a historical publication', async () => {
  expect((await restorePublication('10000000-0000-4000-8000-000000000001', 3)).ok).toBe(true);
  expect(mocks.rpc).toHaveBeenCalledWith('restore_directory', {
    source_id: '10000000-0000-4000-8000-000000000001',
    expected_revision: 3,
  });
  expect(mocks.update).toHaveBeenCalledWith('public-test');
  expect(mocks.read).toHaveBeenCalledOnce();
});
it('requires administrator authorization before a cache-affecting mutation', async () => {
  mocks.auth.mockRejectedValue(new Error('Denied'));
  await expect(publishDraft(3)).rejects.toThrow('Denied');
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
