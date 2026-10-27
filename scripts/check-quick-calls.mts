import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { fixtureSnapshot } from '../src/lib/directory/fixtures';
const url =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local database checks only.');
const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  await db.query('begin');
  const admin = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [admin]);
  await db.query('insert into public.administrators(user_id) values($1)', [admin]);
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
  const snapshot = structuredClone(fixtureSnapshot);
  snapshot.fixture = false;
  for (const contact of snapshot.contacts) {
    contact.approved = true;
    contact.source = 'https://example.test/approved';
    contact.verifiedAt = new Date().toISOString().slice(0, 10);
  }
  const save = async (document: unknown) => {
    const revision = (await db.query('select revision from public.directory_drafts')).rows[0]
      .revision;
    return (
      await db.query('select public.save_directory($1::jsonb,$2) revision', [
        JSON.stringify(document),
        revision,
      ])
    ).rows[0].revision;
  };
  const revision = await save(snapshot);
  const published = (await db.query('select public.publish_directory($1) id', [revision])).rows[0]
    .id;
  assert.deepEqual(
    (await db.query('select snapshot from public.publications where id=$1', [published])).rows[0]
      .snapshot.quickCalls,
    snapshot.quickCalls,
  );
  for (const failure of [
    'missing',
    'inactive',
    'category',
    'text',
    'zero',
    'line',
    'duplicate',
    'duplicate-line',
  ]) {
    await db.query('savepoint invalid_assignment');
    const bad = structuredClone(snapshot);
    if (failure === 'missing') bad.quickCalls![0].contactId = randomUUID();
    if (failure === 'inactive') bad.contacts[0].active = false;
    if (failure === 'category') bad.contacts[0].category = 'fire';
    if (failure === 'text') bad.contacts[0].numbers[0].channel = 'text';
    if (failure === 'zero') bad.contacts[0].numbers[0].dial = '000';
    if (failure === 'line') bad.quickCalls![0].numberId = randomUUID();
    if (failure === 'duplicate') bad.quickCalls = [bad.quickCalls![0], bad.quickCalls![0]];
    if (failure === 'duplicate-line')
      bad.contacts[0].numbers.push({ ...bad.contacts[0].numbers[0] });
    const invalidRevision = await save(bad); // Drafts can be repaired; publication must reject.
    let rejected = false;
    try {
      await db.query('select public.publish_directory($1)', [invalidRevision]);
    } catch {
      rejected = true;
    }
    await db.query('rollback to savepoint invalid_assignment');
    assert.ok(rejected, `Publication must reject ${failure}`);
    assert.equal(
      (await db.query('select id from public.publications where current')).rows[0].id,
      published,
    );
  }
  const legacy = structuredClone(snapshot);
  delete legacy.quickCalls;
  const legacyRevision = await save(legacy);
  await db.query('select public.publish_directory($1)', [legacyRevision]);
  console.log(
    'Quick-call database checks passed: atomic assignments, legacy compatibility, eight invalid-target rejections and publication rollback. All test data rolled back.',
  );
} finally {
  await db.query('rollback');
  await db.end();
}
