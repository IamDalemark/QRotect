import { beforeEach, expect, it, vi } from 'vitest';
import { fixtureSnapshot, emptySnapshot } from '@/lib/directory/fixtures';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), rpc: vi.fn(), draft: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/auth', () => ({ requireAdminForRender: mocks.auth }));
import { loadAdminEditor, loadAdminHistory, loadAdminOverview } from '@/lib/admin/data';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.draft.mockResolvedValue({ data: { payload: emptySnapshot, revision: 4 }, error: null });
  mocks.rpc.mockReturnValue({ single: mocks.draft });
  mocks.auth.mockResolvedValue({ client: { rpc: mocks.rpc, from: mocks.from } });
});

it.each(['contacts', 'guidance', 'map', 'preview'] as const)(
  '%s fetches only the working draft',
  async (section) => {
    expect(await loadAdminEditor(section)).toEqual({
      initial: emptySnapshot,
      initialRevision: 4,
      publishedContacts: [],
    });
    expect(mocks.rpc).toHaveBeenCalledWith('get_directory_draft');
    expect(mocks.from).not.toHaveBeenCalled();
  },
);

it('filters for the current publication and counts all stored contacts without fetching the draft', async () => {
  const countDraft = vi.fn().mockResolvedValue({ count: 12, error: null });
  const selectContacts = vi.fn().mockReturnValue({ eq: countDraft });
  const publication = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { created_at: '2026-11-18' }, error: null }),
  };
  const selectPublication = vi.fn().mockReturnValue(publication);
  mocks.from.mockImplementation((table: string) => ({
    select: table === 'contacts' ? selectContacts : selectPublication,
  }));

  expect(await loadAdminOverview()).toEqual({ contactCount: 12, publishedAt: '2026-11-18' });
  publication.maybeSingle.mockResolvedValue({ data: null, error: null });
  countDraft.mockResolvedValue({ count: 0, error: null });
  expect(await loadAdminOverview()).toEqual({ contactCount: 0, publishedAt: null });

  expect(mocks.from.mock.calls.slice(0, 2)).toEqual([['contacts'], ['publications']]);
  expect(selectContacts).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  expect(countDraft).toHaveBeenCalledWith('draft_id', true);
  expect(selectPublication).toHaveBeenCalledWith('created_at');
  expect(publication.eq).toHaveBeenCalledWith('current', true);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('loads the revision needed to restore along with bounded publication and audit lists', async () => {
  const publication = { id: 'p1', created_at: '2026-10-29', current: true };
  const event = { id: 1, action: 'publish', created_at: '2026-10-29' };
  const revision = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { revision: 8 }, error: null }),
  };
  const publications = {
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [publication], error: null }),
  };
  const events = {
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [event], error: null }),
  };
  const select = vi
    .fn()
    .mockReturnValueOnce(revision)
    .mockReturnValueOnce(publications)
    .mockReturnValueOnce(events);
  mocks.from.mockReturnValue({ select });

  expect(await loadAdminHistory()).toEqual({
    revision: 8,
    publications: [publication],
    events: [event],
  });
  expect(mocks.from.mock.calls).toEqual([['directory_drafts'], ['publications'], ['audit_events']]);
  expect(select.mock.calls).toEqual([
    ['revision'],
    ['id,created_at,current'],
    ['id,action,created_at'],
  ]);
  expect(revision.eq).toHaveBeenCalledWith('id', true);
  expect(publications.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(publications.limit).toHaveBeenCalledWith(20);
  expect(events.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(events.limit).toHaveBeenCalledWith(30);
  expect(mocks.rpc).not.toHaveBeenCalled();

  select
    .mockReturnValueOnce(revision)
    .mockReturnValueOnce(publications)
    .mockReturnValueOnce(events);
  events.limit.mockResolvedValue({ data: null, error: { message: 'Unavailable' } });
  await expect(loadAdminHistory()).rejects.toThrow('Administrator data could not be loaded');
});

it.each([loadAdminOverview, loadAdminHistory, () => loadAdminEditor('contacts')])(
  'fails closed before reading data when administrator authorization fails',
  async (load) => {
    mocks.auth.mockRejectedValue(new Error('Access denied'));
    await expect(load()).rejects.toThrow('Access denied');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);

it('quick-call choices come from the published snapshot rather than the working draft', async () => {
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { snapshot: fixtureSnapshot }, error: null }),
      }),
    }),
  });
  const { initial, publishedContacts } = await loadAdminEditor('quick-calls');
  expect(initial.contacts).toHaveLength(0);
  expect(publishedContacts).toEqual(fixtureSnapshot.contacts);
});
