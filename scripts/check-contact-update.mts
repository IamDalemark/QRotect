import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';
import { fixtureSnapshot } from '../src/lib/directory/fixtures';

const url =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local migration checks only.');
const manager = new pg.Client({ connectionString: url });
const name = `qrotect_contact_update_${randomUUID().replaceAll('-', '')}`;
await manager.connect();
await manager.query(`create database "${name}"`);
const isolated = new URL(url);
isolated.pathname = `/${name}`;
const db = new pg.Client({ connectionString: isolated.href });
const dir = 'supabase/migrations',
  migration = '202611180001_public_contacts_optional_verification.sql';
try {
  await db.connect();
  await db.query(`
    create schema extensions; create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
  `);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && f < migration)
    .sort())
    await db.query(readFileSync(`${dir}/${file}`, 'utf8'));
  const sql = readFileSync(`${dir}/${migration}`, 'utf8')
    .replace(/^begin;[ \t]*$/m, '')
    .replace(/^commit;[ \t]*$/m, '');
  for (const scenario of ['empty', 'hidden', 'unreviewed-hidden']) {
    await db.query('begin');
    try {
      const admin = randomUUID();
      await db.query('insert into auth.users(id) values($1)', [admin]);
      await db.query('insert into public.administrators(user_id) values($1)', [admin]);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
      let revision = Number(
        (await db.query('select revision from public.directory_drafts')).rows[0].revision,
      );
      if (scenario !== 'empty') {
        const document = structuredClone(fixtureSnapshot);
        document.fixture = false;
        document.quickCalls = [];
        for (const c of document.contacts) {
          c.approved = true;
          c.source = 'https://example.test';
          c.verifiedAt = '2026-01-01';
        }
        revision = Number(
          (await db.query('select public.save_directory($1,$2) revision', [document, revision]))
            .rows[0].revision,
        );
        await db.query('select public.publish_directory($1)', [revision]);
        const hidden = {
          ...document.contacts[0],
          active: false,
          approved: scenario !== 'unreviewed-hidden',
          source: '',
          verifiedAt: '',
        };
        revision = Number(
          (
            await db.query("select public.publish_directory_item('contact',$1,$2,$3) revision", [
              hidden.id,
              hidden,
              revision,
            ])
          ).rows[0].revision,
        );
        const working = (await db.query('select payload from public.get_directory_draft()')).rows[0]
          .payload;
        working.contacts[1].agency = 'Unpublished fire edit';
        working.contacts[1].approved = false;
        revision = Number(
          (await db.query('select public.save_directory($1,$2) revision', [working, revision]))
            .rows[0].revision,
        );
      }
      const before = (await db.query('select * from public.publications order by created_at,id'))
        .rows;
      await db.query('savepoint rollout');
      if (scenario === 'unreviewed-hidden') {
        await assert.rejects(
          db.query(sql),
          (e: unknown) => (e as { code: string }).code === '22023',
        );
        await db.query('rollback to rollout');
        assert.deepEqual(
          (await db.query('select * from public.publications order by created_at,id')).rows,
          before,
        );
        assert.equal(
          (await db.query('select active from public.contacts order by position limit 1')).rows[0]
            .active,
          false,
        );
      } else {
        await db.query(sql);
        const after = (await db.query('select * from public.publications order by created_at,id'))
          .rows;
        for (const old of before) {
          const retained = after.find((row) => row.id === old.id);
          assert.deepEqual(retained.snapshot, old.snapshot);
          assert.equal(retained.source_revision, old.source_revision);
        }
        if (scenario === 'empty') {
          assert.deepEqual(after, before);
          assert.equal(
            Number(
              (await db.query('select revision from public.directory_drafts')).rows[0].revision,
            ),
            revision,
          );
        } else {
          assert.equal(after.length, before.length + 1);
          const published = after.find((row) => row.current).snapshot;
          assert.equal(published.contacts.length, 6);
          assert.ok(published.contacts.every((c: { active: boolean }) => c.active));
          assert.equal(
            published.contacts.find((c: { category: string }) => c.category === 'fire').agency,
            'Sample fire station',
          );
          assert.equal(
            (await db.query('select payload from public.get_directory_draft()')).rows[0].payload
              .contacts[1].agency,
            'Unpublished fire edit',
          );
          const legacy = { ...published.contacts[0], active: false };
          revision = Number(
            (await db.query('select revision from public.directory_drafts')).rows[0].revision,
          );
          await db.query("select public.publish_directory_item('contact',$1,$2,$3)", [
            legacy.id,
            legacy,
            revision,
          ]);
          assert.equal(
            (await db.query('select active from public.contacts where id=$1', [legacy.id])).rows[0]
              .active,
            true,
          );
        }
      }
      console.log(`Contact update migration passed: ${scenario}`);
    } finally {
      await db.query('rollback');
    }
  }
} finally {
  await db.end();
  await manager.query(`drop database "${name}" with (force)`);
  await manager.end();
}
