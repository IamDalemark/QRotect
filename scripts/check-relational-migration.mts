import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';
import { fixtureSnapshot } from '../src/lib/directory/fixtures';

const url =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local migration checks only.');
const name = `qrotect_migration_${randomUUID().replaceAll('-', '')}`;
const manager = new pg.Client({ connectionString: url });
await manager.connect();
await manager.query(`create database "${name}"`);
const isolated = new URL(url);
isolated.pathname = `/${name}`;
const db = new pg.Client({ connectionString: isolated.href });
try {
  await db.connect();
  // Minimal Supabase-owned dependencies; no hosted project or existing local data is touched.
  await db.query(`
    create schema extensions; create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
  `);
  const dir = 'supabase/migrations';
  const migration = '202610290001_relational_directory.sql';
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && f < migration)
    .sort())
    await db.query(readFileSync(`${dir}/${file}`, 'utf8'));
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && f >= migration)
    .sort()
    .map((f) =>
      readFileSync(`${dir}/${f}`, 'utf8')
        .replace(/^begin;[ \t]*$/m, '')
        .replace(/^commit;[ \t]*$/m, ''),
    )
    .join('\n');
  for (const scenario of ['populated', 'legacy', 'missing-reference', 'duplicate-id']) {
    await db.query('begin');
    try {
      const admin = randomUUID();
      await db.query('insert into auth.users(id) values($1)', [admin]);
      await db.query('insert into public.administrators(user_id) values($1)', [admin]);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
      const document = structuredClone(fixtureSnapshot);
      document.fixture = false;
      document.version = 'pre-migration-working-version';
      for (const c of document.contacts) {
        c.approved = true;
        c.source = 'https://example.test/source';
        c.verifiedAt = '2026-10-01';
      }
      document.guidance = [
        {
          id: randomUUID(),
          category: 'school',
          title: { en: 'Test title', hil: 'Test title hil' },
          steps: [{ en: 'Test step', hil: 'Test step hil' }],
          source: 'https://example.test/guide',
          reviewedAt: '2026-10-01',
          reviewer: 'Test reviewer',
          approved: true,
        },
      ];
      document.map = {
        id: randomUUID(),
        assetPath: `${randomUUID()}.png`,
        description: { en: 'Test map', hil: 'Test map hil' },
        instructions: [{ en: 'Test text', hil: 'Test text hil' }],
        source: 'https://example.test/map',
        reviewedAt: '2026-10-01',
        reviewer: 'Test reviewer',
        approved: true,
      };
      if (scenario === 'legacy') {
        delete document.quickCalls;
        document.testContact = {
          name: 'Inert compatibility value',
          dial: '09123456789',
          consentedAt: '2026-10-01',
        };
      }
      const rev = (await db.query('select revision from public.directory_drafts')).rows[0].revision;
      const saved = (
        await db.query('select public.save_directory($1,$2) revision', [document, rev])
      ).rows[0].revision;
      const publication = (await db.query('select public.publish_directory($1) id', [saved]))
        .rows[0].id;
      const historical = (
        await db.query('select snapshot from public.publications where id=$1', [publication])
      ).rows[0].snapshot;
      if (scenario === 'missing-reference') document.quickCalls![0].numberId = randomUUID();
      if (scenario === 'duplicate-id') document.contacts[1].id = document.contacts[0].id;
      await db.query('update public.directory_drafts set payload=$1', [document]);
      await db.query('savepoint migration_attempt');
      if (scenario === 'missing-reference' || scenario === 'duplicate-id') {
        let rejected = false;
        try {
          await db.query(sql);
        } catch {
          rejected = true;
        }
        assert.ok(rejected, `Migration must reject ${scenario}`);
        await db.query('rollback to savepoint migration_attempt');
        assert.deepEqual(
          (await db.query('select payload from public.directory_drafts')).rows[0].payload,
          document,
        );
        assert.equal(
          (await db.query("select to_regclass('public.contacts') relation")).rows[0].relation,
          null,
        );
      } else {
        await db.query(sql);
        assert.deepEqual(
          (await db.query('select payload,revision from public.get_directory_draft()')).rows[0],
          { payload: document, revision: saved },
        );
        assert.equal(
          (await db.query('select count(*)::int n from public.contacts')).rows[0].n,
          document.contacts.length,
        );
        assert.equal((await db.query('select count(*)::int n from public.guidance')).rows[0].n, 1);
        assert.equal(
          (await db.query('select count(*)::int n from public.campus_maps')).rows[0].n,
          1,
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from information_schema.columns where table_schema='public' and table_name='directory_drafts' and column_name='payload'",
            )
          ).rows[0].n,
          0,
        );
      }
      assert.deepEqual(
        (await db.query('select snapshot from public.publications where id=$1', [publication]))
          .rows[0].snapshot,
        historical,
      );
      console.log(`Migration check passed: ${scenario}; original publication preserved.`);
    } finally {
      await db.query('rollback');
    }
  }
} finally {
  await db.end();
  await manager.query(`drop database "${name}" with (force)`);
  await manager.end();
}
