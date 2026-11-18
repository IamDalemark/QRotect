import { describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { databaseConnection } from '../../scripts/database-content.mjs';
import { emptySnapshot, fixtureSnapshot } from '../../src/lib/directory/fixtures';
import {
  parseCommand,
  readDirectoryFile,
  validateDocument,
  validateTarget,
  changeContent,
  planDemoGuidance,
} from '../../scripts/database-content.mjs';

describe('database content tools', () => {
  it('requires explicit target and input; supports pnpm argument separator', () => {
    expect(() => parseCommand(['reset'], {})).toThrow();
    expect(parseCommand(['populate', '--target', 'local'], {}).file).toBe('./directory.json');
    expect(() => parseCommand(['reset', '--target', 'local', '--file', 'x'])).toThrow();
    expect(
      parseCommand(['populate', '--', '--target', 'local', '--file', 'x', '--dry-run']).dryRun,
    ).toBe(true);
  });
  it('plans only demo replacements and treats the committed set as a no-op', () => {
    const { guidance } = readDirectoryFile('./directory.json', true);
    const oldDemo = {
      ...guidance[0],
      id: '40000000-0000-4000-8000-000000000002',
      reviewer: 'Demo content review',
    };
    const reviewed = {
      ...guidance[1],
      id: '40000000-0000-4000-8000-000000000009',
      reviewer: 'Reviewer',
    };
    expect(guidance).toHaveLength(8);
    expect(new Set(guidance.map((guide) => guide.category)).size).toBe(6);
    expect(planDemoGuidance([reviewed, oldDemo], [reviewed, oldDemo], guidance)).toEqual({
      remove: [oldDemo],
      add: guidance,
    });
    expect(planDemoGuidance([reviewed, ...guidance], [reviewed, ...guidance], guidance)).toEqual({
      remove: [],
      add: [],
    });
    expect(() => planDemoGuidance([oldDemo], [oldDemo, guidance[0]], guidance)).toThrow(
      'private guidance',
    );
    expect(() =>
      planDemoGuidance([oldDemo], [{ ...oldDemo, source: 'https://example.com/new' }], guidance),
    ).toThrow('unpublished guidance edits');
    expect(() => parseCommand(['reset', '--target', 'local', '--demo-guidance-only'])).toThrow();
  });
  it('blocks samples, malformed data, unapproved records and broken references', () => {
    expect(() => validateDocument(fixtureSnapshot)).toThrow('Sample records');
    expect(() => validateDocument({})).toThrow();
    expect(() => validateDocument({ ...fixtureSnapshot, fixture: false })).toThrow('approval');
    expect(() =>
      validateDocument({
        ...emptySnapshot,
        quickCalls: [
          {
            category: 'police',
            contactId: fixtureSnapshot.contacts[0].id,
            numberId: fixtureSnapshot.contacts[0].numbers[0].id,
          },
        ],
      }),
    ).toThrow('Reassign');
    expect(validateDocument(emptySnapshot)).toEqual(emptySnapshot);
  });
  it('rejects duplicate identifiers', () => {
    const contact = { ...fixtureSnapshot.contacts[0], approved: true };
    expect(() => validateDocument({ ...emptySnapshot, contacts: [contact, contact] })).toThrow(
      'unique',
    );
  });
  it('restricts local connections and binds hosted confirmation to the database', () => {
    expect(
      validateTarget(
        'local',
        'postgresql://postgres:password@127.0.0.1:54322/postgres',
        undefined,
        undefined,
      ),
    ).toBe('local');
    expect(() =>
      validateTarget('local', 'postgresql://db.example.com/postgres', undefined, undefined),
    ).toThrow();
    expect(
      validateTarget(
        'hosted',
        'postgresql://postgres:password@db.abc.supabase.co/postgres',
        'https://abc.supabase.co',
        'abc',
      ),
    ).toBe('abc');
    expect(
      validateTarget(
        'hosted',
        'postgresql://postgres.abc:password@aws-0-region.pooler.supabase.com:5432/postgres',
        'https://abc.supabase.co',
        'abc',
      ),
    ).toBe('abc');
    expect(() =>
      validateTarget(
        'hosted',
        'postgresql://db.other.supabase.co/postgres',
        'https://abc.supabase.co',
        'abc',
      ),
    ).toThrow();
    expect(() =>
      validateTarget(
        'hosted',
        'postgresql://db.abc.supabase.co/postgres',
        'https://abc.supabase.co',
        'other',
      ),
    ).toThrow();
  });
  it('publishes the revision returned by save without clearing history', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ revision: '8' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'publication' }] });
    expect(
      await changeContent({ query } as unknown as pg.Client, 'populate', emptySnapshot, 7),
    ).toBe('publication');
    expect(query.mock.calls[1][1]).toEqual(['8']);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('clears content directly and initializes the draft without administrator functions', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ revision: '9' }] });
    await changeContent({ query } as unknown as pg.Client, 'reset', emptySnapshot, 8);
    expect(query.mock.calls[0][0]).toContain('truncate table public.quick_call_assignments');
    expect(query.mock.calls[0][0]).not.toContain('administrators');
    expect(query.mock.calls[1][0]).toContain('on conflict (id) do update');
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('split database environment', () => {
  const env = {
    QROTECT_HOSTED_DB_HOST: 'aws-0-ap-southeast-1.pooler.supabase.com',
    QROTECT_HOSTED_DB_USER: 'postgres.example',
    QROTECT_HOSTED_DB_PASSWORD: 'password@with:/#%?characters',
  };
  it('builds a connection and encodes raw credentials with defaults', () => {
    const connection = new URL(databaseConnection('hosted', env));
    expect(decodeURIComponent(connection.password)).toBe(env.QROTECT_HOSTED_DB_PASSWORD);
    expect(connection.port).toBe('5432');
    expect(connection.pathname).toBe('/postgres');
    expect(connection.username).toBe('postgres.example');
  });
  it('keeps full URLs working and gives them precedence', () => {
    expect(
      databaseConnection('hosted', {
        ...env,
        QROTECT_HOSTED_DATABASE_URL: 'postgresql://existing',
      }),
    ).toBe('postgresql://existing');
  });
  it('requires complete credentials without exposing their values', () => {
    expect(() => databaseConnection('hosted', {})).toThrow('QROTECT_HOSTED_DB_HOST');
    expect(() => databaseConnection('hosted', { ...env, QROTECT_HOSTED_DB_PASSWORD: '' })).toThrow(
      'QROTECT_HOSTED_DB_PASSWORD',
    );
    expect(() => databaseConnection('hosted', { ...env, QROTECT_HOSTED_DB_PORT: '65536' })).toThrow(
      'DB_PORT',
    );
    expect(() =>
      databaseConnection('hosted', { ...env, QROTECT_HOSTED_DB_HOST: 'https://wrong' }),
    ).toThrow('DB_HOST');
  });
  it('supports local fields and custom database/port independently', () => {
    const connection = new URL(
      databaseConnection('local', {
        QROTECT_LOCAL_DB_HOST: '127.0.0.1',
        QROTECT_LOCAL_DB_USER: 'postgres',
        QROTECT_LOCAL_DB_PASSWORD: 'postgres',
        QROTECT_LOCAL_DB_PORT: '54322',
        QROTECT_LOCAL_DB_NAME: 'test_db',
      }),
    );
    expect(connection.port).toBe('54322');
    expect(connection.pathname).toBe('/test_db');
  });
});

describe('environment command defaults', () => {
  const env = { QROTECT_DB_TARGET: 'hosted', QROTECT_POPULATE_FILE: './data/directory.json' };
  it('allows population and reset without inline configuration', () => {
    expect(parseCommand(['populate'], env)).toMatchObject({
      target: 'hosted',
      file: './data/directory.json',
    });
    expect(parseCommand(['reset'], env)).toMatchObject({ target: 'hosted', file: undefined });
  });
  it('lets command flags override environment defaults', () => {
    expect(
      parseCommand(['populate', '--target', 'local', '--file', './custom.json'], env),
    ).toMatchObject({ target: 'local', file: './custom.json' });
  });
  it('derives project identity from the Supabase URL without a confirmation flag', () => {
    expect(
      validateTarget(
        'hosted',
        'postgresql://postgres.abc:password@aws-0-region.pooler.supabase.com:5432/postgres',
        'https://abc.supabase.co',
        undefined,
      ),
    ).toBe('abc');
    expect(() =>
      validateTarget(
        'hosted',
        'postgresql://postgres.other:password@aws-0-region.pooler.supabase.com:5432/postgres',
        'https://abc.supabase.co',
        undefined,
      ),
    ).toThrow('does not match');
  });
});

describe('import file errors', () => {
  it('identifies a missing JSON file and explains the environment setting', () => {
    expect(() => readDirectoryFile('/nonexistent-qrotect-import-file.json')).toThrow(
      'JSON file not found: /nonexistent-qrotect-import-file.json',
    );
    expect(() => readDirectoryFile('/nonexistent-qrotect-import-file.json')).toThrow(
      'QROTECT_POPULATE_FILE',
    );
  });
});
