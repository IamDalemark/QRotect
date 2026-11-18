import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import {
  changeContent,
  planDemoGuidance,
  publishDemoGuidance,
  readDirectoryFile,
  validateTarget,
} from './database-content.mjs';
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
  const incoming = readDirectoryFile('./directory.json', true).guidance;
  const oldDemo = { ...incoming[0], id: randomUUID(), reviewer: 'Demo content review' };
  const reviewed = { ...incoming[0], id: randomUUID(), reviewer: 'Test reviewer' };
  const drafts = async () =>
    (await db.query('select public._directory_document() document')).rows[0].document;
  const snapshot = async () =>
    (await db.query('select snapshot from public.publications where current')).rows[0].snapshot;
  await changeContent(
    db,
    'populate',
    { ...document, guidance: [reviewed, oldDemo] },
    await revision(),
  );
  const before = await snapshot();
  const privateDraft = {
    ...(await drafts()),
    guidance: [reviewed, oldDemo, { ...reviewed, id: randomUUID(), approved: false }],
  };
  privateDraft.contacts[0].agency = 'Private unpublished edit';
  await db.query('select public.save_directory($1::jsonb,$2::bigint)', [
    JSON.stringify(privateDraft),
    await revision(),
  ]);
  const change = planDemoGuidance(before.guidance, privateDraft.guidance, incoming);

  await db.query('savepoint before_demo_import');
  await assert.rejects(
    publishDemoGuidance(
      db,
      { ...change, add: [...incoming.slice(0, 1), { ...incoming[1], approved: false }] },
      await revision(),
    ),
  );
  await db.query('rollback to savepoint before_demo_import');
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual((await drafts()).guidance, privateDraft.guidance);

  await publishDemoGuidance(db, change, await revision());
  const after = await snapshot();
  assert.deepEqual(after.guidance, [reviewed, ...incoming]);
  assert.deepEqual(after.contacts, before.contacts);
  assert.deepEqual(after.quickCalls, before.quickCalls);
  assert.deepEqual(after.map, before.map);
  assert.deepEqual((await drafts()).contacts, privateDraft.contacts);
  assert.deepEqual((await drafts()).guidance, [reviewed, privateDraft.guidance[2], ...incoming]);
  assert.equal(
    (await db.query('select 1 from public.publications where id=$1', [before.version])).rowCount,
    1,
  );
  assert.deepEqual(planDemoGuidance(after.guidance, (await drafts()).guidance, incoming), {
    remove: [],
    add: [],
  });
  const beforeReset = await revision();
  await db.query("select set_config('request.jwt.claim.sub','',true)");
  // Reset uses direct operator privileges, without an administrator session.
  await changeContent(db, 'reset', emptySnapshot, beforeReset);
  assert.equal(await revision(), beforeReset + 1);
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
