import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptySnapshot } from '../../src/lib/directory/fixtures';

const state = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock('pg', () => ({
  default: {
    Client: class {
      query = state.query;
      connect = state.connect;
      end = state.end;
    },
  },
}));
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()),
  readFileSync: state.read,
  writeFileSync: state.write,
  mkdirSync: state.mkdir,
}));
import { main } from '../../scripts/database-content.mjs';

describe('content transaction boundaries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv(
      'QROTECT_LOCAL_DATABASE_URL',
      'postgresql://postgres:password@127.0.0.1:54322/postgres',
    );
    vi.stubEnv('QROTECT_ADMIN_USER_ID', '10000000-0000-4000-8000-000000000001');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    state.read.mockReturnValue(JSON.stringify(emptySnapshot));
    state.query.mockImplementation(async (sql: string) => {
      if (sql.includes('is_admin')) return { rows: [{ authorized: true }] };
      if (sql.includes('from public.directory_drafts'))
        return { rowCount: 1, rows: [{ id: true, revision: 4 }] };
      if (sql.includes('_directory_document')) return { rows: [{ payload: emptySnapshot }] };
      if (sql.includes('save_directory')) return { rows: [{ revision: 5 }] };
      if (sql.includes('publish_directory')) return { rows: [{ id: 'published' }] };
      return { rowCount: 0, rows: [] };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  const args = ['populate', '--target', 'local', '--file', 'directory.json'];
  const sql = () => state.query.mock.calls.map((call) => call[0] as string);

  it('hosted reset needs only its connection URL and creates no backup', async () => {
    vi.stubEnv(
      'QROTECT_HOSTED_DATABASE_URL',
      'postgresql://operator:password@db.test.example/postgres',
    );
    vi.stubEnv('QROTECT_ADMIN_USER_ID', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    state.write.mockImplementation(() => {
      throw new Error('No backups allowed');
    });
    await main(['reset', '--target', 'hosted']);
    expect(state.write).not.toHaveBeenCalled();
    expect(state.mkdir).not.toHaveBeenCalled();
    expect(sql().some((query) => /is_admin|save_directory|request.jwt/.test(query))).toBe(false);
    expect(sql().some((query) => query.includes('truncate table'))).toBe(true);
    expect(sql().at(-1)).toBe('commit');
  });
  it('reset dry run does not truncate or update any data', async () => {
    vi.stubEnv('QROTECT_ADMIN_USER_ID', '');
    await main(['reset', '--target', 'local', '--dry-run']);
    expect(sql().some((query) => /truncate table|insert into|^commit$/.test(query))).toBe(false);
    expect(sql().at(-1)).toBe('rollback');
    expect(state.write).not.toHaveBeenCalled();
  });
  it('reset rolls back clearing if draft initialization fails', async () => {
    const handler = state.query.getMockImplementation()!;
    state.query.mockImplementation(async (query: string) => {
      if (query.includes('insert into public.directory_drafts')) throw new Error('reset rejected');
      return handler(query);
    });
    await expect(main(['reset', '--target', 'local'])).rejects.toThrow('reset rejected');
    expect(sql().at(-1)).toBe('rollback');
    expect(sql()).not.toContain('commit');
  });
  it('reports a missing input before connecting to the database', async () => {
    state.read.mockImplementation(() => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    });
    await expect(main(args)).rejects.toThrow('JSON file not found');
    expect(state.connect).not.toHaveBeenCalled();
  });
  it('reports invalid JSON without exposing file contents or connecting', async () => {
    state.read.mockReturnValue('{private content');
    await expect(main(args)).rejects.toThrow('Invalid JSON in directory.json');
    expect(state.connect).not.toHaveBeenCalled();
  });
  it('dry run writes no backup and executes no mutations', async () => {
    await main([...args, '--dry-run']);
    expect(state.write).not.toHaveBeenCalled();
    expect(
      sql().some((query) =>
        /save_directory|publish_directory|delete from|truncate table|^commit$/.test(query),
      ),
    ).toBe(false);
    expect(sql()).toContain('rollback');
  });
  it('backup failure prevents saving or publishing', async () => {
    state.write.mockImplementation(() => {
      throw new Error('backup failed');
    });
    await expect(main(args)).rejects.toThrow('backup failed');
    expect(sql().some((query) => /save_directory|publish_directory|^commit$/.test(query))).toBe(
      false,
    );
    expect(sql()).toContain('rollback');
  });
  it('publication failure rolls back the saved draft', async () => {
    const handler = state.query.getMockImplementation()!;
    state.query.mockImplementation(async (query: string) => {
      if (query.includes('publish_directory')) throw new Error('publish rejected');
      return handler(query);
    });
    await expect(main(args)).rejects.toThrow('publish rejected');
    expect(state.write).toHaveBeenCalledOnce();
    expect(sql().some((query) => query.includes('save_directory'))).toBe(true);
    expect(sql()).toContain('rollback');
    expect(sql()).not.toContain('commit');
  });
  it('commits only after a protected backup, save and publication', async () => {
    await main(args);
    expect(state.write.mock.calls[0][2]).toEqual({ flag: 'wx', mode: 0o600 });
    expect(state.write.mock.invocationCallOrder[0]).toBeLessThan(
      state.query.mock.invocationCallOrder[
        sql().findIndex((query) => query.includes('save_directory'))
      ],
    );
    expect(sql().at(-1)).toBe('commit');
  });
  it('rejects a missing map asset without backup or mutation', async () => {
    const map = {
      id: '30000000-0000-4000-8000-000000000001',
      assetPath: '30000000-0000-4000-8000-000000000001.png',
      description: { en: 'Campus map.', hil: 'Mapa sang kampus.' },
      instructions: [{ en: 'View buildings.', hil: 'Tan-awa ang mga bilding.' }],
      source: 'https://example.com/map',
      reviewedAt: '2026-11-18',
      reviewer: 'Reviewer',
      approved: true,
    };
    state.read.mockReturnValue(JSON.stringify({ ...emptySnapshot, map }));
    await expect(main(args)).rejects.toThrow('Upload the referenced map');
    expect(state.write).not.toHaveBeenCalled();
    expect(sql()).toContain('rollback');
  });
});
