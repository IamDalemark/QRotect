import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { changeContent, validateTarget } from './database-content.mjs';
import { emptySnapshot, fixtureSnapshot } from '../src/lib/directory/fixtures';

const connection =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
validateTarget('local', connection, undefined, undefined);
const db = new pg.Client({ connectionString: connection, connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  await db.query('begin');
  const admin = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [admin]);
  await db.query('insert into public.administrators(user_id) values($1)', [admin]);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
  const revision = async () =>
    Number(
      (await db.query('select revision from public.directory_drafts where id')).rows[0].revision,
    );
  const document = {
    ...structuredClone(emptySnapshot),
    contacts: [
      { ...structuredClone(fixtureSnapshot.contacts[0]), id: randomUUID(), approved: true },
    ],
  };
  document.contacts[0].numbers[0].id = randomUUID();
  document.contacts[0].source = 'https://example.com/reviewed-contact';
  document.contacts[0].verifiedAt = '2026-01-01';
  const initial = await revision();
  const published = await changeContent(db, 'populate', document, initial);
  assert.ok(published);
  assert.equal(await revision(), initial + 1);
  assert.equal(
    (await db.query('select snapshot from public.publications where current')).rows[0].snapshot
      .contacts[0].id,
    document.contacts[0].id,
  );
  // A failed publication must leave the previously saved draft and publication intact.
  await db.query('savepoint failed_import');
  await assert.rejects(
    changeContent(
      db,
      'populate',
      { ...document, contacts: [{ ...document.contacts[0], approved: false }] },
      initial + 1,
    ),
  );
  await db.query('rollback to savepoint failed_import');
  assert.equal(await revision(), initial + 1);
  assert.equal(
    (await db.query('select id from public.publications where current')).rows[0].id,
    published,
  );
  await db.query("select set_config('request.jwt.claim.sub','',true)");
  // Reset uses direct operator privileges, without an administrator session.
  await changeContent(db, 'reset', emptySnapshot, initial + 1);
  assert.equal(await revision(), initial + 2);
  for (const table of [
    'contacts',
    'contact_numbers',
    'guidance',
    'campus_maps',
    'quick_call_assignments',
    'publications',
    'audit_events',
  ]) {
    assert.equal(Number((await db.query(`select count(*) n from public.${table}`)).rows[0].n), 0);
  }
  assert.equal((await db.query('select 1 from auth.users where id=$1', [admin])).rowCount, 1);
  assert.equal(
    (await db.query('select 1 from public.administrators where user_id=$1', [admin])).rowCount,
    1,
  );
  assert.equal((await db.query('select count(*)::int n from public.categories')).rows[0].n, 6);
  console.log(
    'Content replace, publish, rollback and reset checks passed; all test changes rolled back.',
  );
} finally {
  await db.query('rollback').catch(() => {});
  await db.end();
}
