import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { emptySnapshot, fixtureSnapshot } from '../src/lib/directory/fixtures';
const url =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Database checks are restricted to a local test database.');
const db = new pg.Client({ connectionString: url });
await db.connect();
async function fails(sql: string, values: unknown[] = []) {
  await db.query('savepoint expected_failure');
  let failed = false;
  try {
    await db.query(sql, values);
  } catch {
    failed = true;
  } finally {
    await db.query('rollback to savepoint expected_failure');
  }
  assert.ok(failed, 'Expected access/validation failure');
}
try {
  await db.query('begin');
  const admin = randomUUID(),
    visitor = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)', [admin, visitor]);
  await db.query('insert into public.administrators(user_id) values($1)', [admin]);
  const row = (await db.query('select revision from public.directory_drafts')).rows[0];
  await db.query('set local role anon');
  assert.equal((await db.query('select * from public.publications where current')).rows.length, 0);
  await fails('select * from public.directory_drafts');
  await fails('select public.save_directory($1::jsonb,$2)', [
    JSON.stringify(emptySnapshot),
    row.revision,
  ]);
  await db.query('reset role');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [visitor]);
  assert.equal((await db.query('select * from public.directory_drafts')).rows.length, 0);
  await fails('select public.save_directory($1::jsonb,$2)', [
    JSON.stringify(emptySnapshot),
    row.revision,
  ]);
  await fails('insert into public.administrators(user_id) values($1)', [visitor]);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
  assert.equal((await db.query('select public.is_admin() as allowed')).rows[0].allowed, true);
  const rev = (
    await db.query('select public.save_directory($1::jsonb,$2) as revision', [
      JSON.stringify(emptySnapshot),
      row.revision,
    ])
  ).rows[0].revision;
  await fails('select public.save_directory($1::jsonb,$2)', [
    JSON.stringify(emptySnapshot),
    row.revision,
  ]);
  await fails('select public.save_directory($1::jsonb,$2)', [
    JSON.stringify({ ...emptySnapshot, privateNote: 'private' }),
    rev,
  ]);
  const publication = (await db.query('select public.publish_directory($1) as id', [rev])).rows[0]
    .id;
  const unapproved = { ...emptySnapshot, contacts: fixtureSnapshot.contacts };
  const next = (
    await db.query('select public.save_directory($1::jsonb,$2) as revision', [
      JSON.stringify(unapproved),
      rev,
    ])
  ).rows[0].revision;
  await fails('select public.publish_directory($1)', [next]);
  assert.equal(
    (await db.query('select id from public.publications where current')).rows[0].id,
    publication,
  );
  const restored = (
    await db.query('select public.restore_directory($1,$2) as id', [publication, next])
  ).rows[0].id;
  assert.notEqual(restored, publication);
  assert.equal(
    (await db.query('select count(*)::int as count from public.publications')).rows[0].count,
    2,
  );
  assert.equal(
    (await db.query('select snapshot from public.publications where current')).rows[0].snapshot
      .contacts.length,
    0,
  );
  await db.query('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',true)");
  await db.query('set local role anon');
  assert.equal((await db.query('select * from public.publications')).rows.length, 1);
  assert.equal(
    (await db.query('select snapshot from public.publications')).rows[0].snapshot.contacts.length,
    0,
  );
  console.log(
    'Database checks passed: anonymous/non-admin denial, self-promotion denial, draft privacy, optimistic conflict, schema validation, publication rollback, and version-preserving restore.',
  );
} finally {
  await db.query('rollback');
  await db.end();
}
