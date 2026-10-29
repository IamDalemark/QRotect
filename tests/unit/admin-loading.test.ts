import { beforeEach, expect, it, vi } from 'vitest';
import { emptySnapshot } from '../../src/lib/directory/fixtures';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), draft: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/admin/auth', () => ({ requireAdmin: mocks.auth }));
import { dashboard } from '../../src/lib/admin/data';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.draft.mockResolvedValue({ data: { payload: emptySnapshot, revision: 4 }, error: null });
  mocks.auth.mockResolvedValue({
    client: { rpc: () => ({ single: mocks.draft }), from: mocks.from },
  });
});

it.each(['contacts', 'guidance', 'map', 'preview'])(
  '%s remains usable without querying publication history or audit events',
  async (section) => {
    mocks.from.mockImplementation(() => {
      throw new Error('History service unavailable');
    });
    const data = await dashboard(section);
    expect(data.initialRevision).toBe(4);
    expect(data.initial).toEqual(emptySnapshot);
    expect(data.history).toEqual([]);
    expect(data.events).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  },
);

it('overview finds the current publication even when newer noncurrent rows exist', async () => {
  const publications = Array.from({ length: 25 }, (_, index) => ({
    id: String(index),
    created_at: String(100 - index),
    current: index === 24,
  }));
  mocks.from.mockImplementation((table: string) => {
    expect(table).toBe('publications');
    return {
      select: () => ({
        eq: (column: string, value: boolean) => ({
          limit: async (count: number) => ({
            data: publications.filter((row) => row[column as 'current'] === value).slice(0, count),
            error: null,
          }),
        }),
      }),
    };
  });
  const data = await dashboard();
  expect(data.history).toEqual([publications[24]]);
  expect(data.events).toEqual([]);
});

it('history still returns publications and audit events and rejects incomplete loads', async () => {
  const publication = { id: 'p1', created_at: '2026-10-29', current: true };
  const event = { id: 1, action: 'publish', revision: 4, created_at: '2026-10-29' };
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({
      order: () => ({
        limit: async () => ({
          data: table === 'publications' ? [publication] : [event],
          error: null,
        }),
      }),
    }),
  }));
  const data = await dashboard('history');
  expect(data.history).toEqual([publication]);
  expect(data.events).toEqual([event]);
  mocks.from.mockReturnValue({
    select: () => ({
      order: () => ({
        limit: async () => ({ data: null, error: { message: 'Unavailable' } }),
      }),
    }),
  });
  await expect(dashboard('history')).rejects.toThrow('Administrator data could not be loaded');
});

it('fails closed before reading data when administrator authorization fails', async () => {
  mocks.auth.mockRejectedValue(new Error('Access denied'));
  await expect(dashboard('contacts')).rejects.toThrow('Access denied');
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.draft).not.toHaveBeenCalled();
});

it('quick-call choices come from the current publication, not unfinished contacts', async () => {
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { snapshot: emptySnapshot }, error: null }) }),
    }),
  });
  const data = await dashboard('quick-calls');
  expect(data.publishedContacts).toEqual([]);
  expect(data.history).toEqual([]);
  expect(data.events).toEqual([]);
});
