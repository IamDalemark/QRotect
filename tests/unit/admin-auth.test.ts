import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  createClient: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  setHeader: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock('@/lib/directory/server', () => ({ databaseConfigured: mocks.configured }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
import { requireAdmin, requireAdminForRender } from '@/lib/admin/auth';

const user = { id: 'administrator' };
const identity = { data: { user }, error: null };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.createClient.mockResolvedValue({
    auth: { getSession: mocks.getSession, getUser: mocks.getUser },
    rpc: mocks.rpc,
  });
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } } });
  mocks.getUser.mockResolvedValue(identity);
  mocks.rpc.mockReturnValue({ setHeader: mocks.setHeader });
  mocks.setHeader.mockResolvedValue({ data: true, error: null });
});

it('starts both live checks with the same token and waits for both', async () => {
  let completeIdentity: (result: typeof identity) => void = () => {};
  mocks.getUser.mockReturnValue(
    new Promise<typeof identity>((resolve) => {
      completeIdentity = resolve;
    }),
  );
  const authorized = vi.fn();
  const request = requireAdminForRender().then(authorized);
  await vi.waitFor(() =>
    expect(mocks.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer session-token'),
  );
  expect(mocks.getUser).toHaveBeenCalledWith('session-token');
  expect(mocks.rpc).toHaveBeenCalledWith('is_admin');
  expect(authorized).not.toHaveBeenCalled();
  completeIdentity(identity);
  await request;
  expect(authorized).toHaveBeenCalledWith({ user, client: expect.any(Object) });
});

it('redirects a missing session before calling Supabase Auth or PostgREST', async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  await expect(requireAdminForRender()).rejects.toThrow(/^\/admin\/login$/);
  expect(mocks.getUser).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('denies a revoked session even when the membership RPC returns true', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'session_not_found' } });
  await expect(requireAdminForRender()).rejects.toThrow(/^\/admin\/login$/);
  expect(mocks.setHeader).toHaveBeenCalledOnce();
});

it.each([
  { data: false, error: null },
  { data: null, error: { message: 'Unavailable' } },
])('denies access when membership cannot be confirmed', async (membership) => {
  mocks.setHeader.mockResolvedValue(membership);
  await expect(requireAdminForRender()).rejects.toThrow('/admin/login?access=denied');
});

it('retains a separate fresh check for every write or API invocation', async () => {
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  await requireAdmin();
  await requireAdmin();
  expect(mocks.getUser.mock.calls).toEqual([[], []]);
  expect(mocks.rpc.mock.calls).toEqual([['is_admin'], ['is_admin']]);
  expect(mocks.getSession).not.toHaveBeenCalled();
});
