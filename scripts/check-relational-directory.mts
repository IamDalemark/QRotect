import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { fixtureSnapshot, emptySnapshot } from '../src/lib/directory/fixtures';

const url =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local database checks only.');
const db = new pg.Client({ connectionString: url });
await db.connect();
let checks = 0;
async function fails(sql: string, values: unknown[] = [], code?: string) {
  await db.query('savepoint expected_failure');
  let failure: unknown;
  try {
    await db.query(sql, values);
  } catch (error) {
    failure = error;
  } finally {
    await db.query('rollback to savepoint expected_failure');
  }
  assert.ok(failure, 'Expected an integrity or permission failure');
  if (code) assert.equal((failure as { code: string }).code, code);
  checks++;
}
try {
  await db.query('begin');
  const admin = randomUUID(),
    visitor = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)', [admin, visitor]);
  await db.query('insert into public.administrators(user_id) values($1)', [admin]);
  const tables = [
    'categories',
    'service_areas',
    'contacts',
    'contact_numbers',
    'quick_call_assignments',
    'guidance',
    'campus_maps',
  ];
  await db.query('set local role anon');
  for (const table of tables) await fails(`select * from public.${table}`, [], '42501');
  for (const functionName of [
    'get_directory_draft()',
    '_directory_document()',
    `_replace_directory_content('${JSON.stringify(emptySnapshot)}'::jsonb)`,
  ])
    await fails(`select public.${functionName}`, [], '42501');
  await db.query('reset role');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [visitor]);
  for (const table of tables)
    assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0);
  await fails('select * from public.get_directory_draft()', [], '42501');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
  for (const table of tables) await fails(`delete from public.${table} where true`, [], '42501');
  await fails('select public._directory_document()', [], '42501');
  await fails('select public._replace_directory_content($1)', [emptySnapshot], '42501');

  const document = structuredClone(fixtureSnapshot);
  document.fixture = false;
  for (const contact of document.contacts) {
    contact.approved = true;
    contact.verifiedAt = '2026-10-01';
    contact.source = 'https://example.test/source';
  }
  document.contacts[0].aliases = ['First alias', 'Second alias'];
  document.contacts[0].numbers.push({
    ...document.contacts[0].numbers[0],
    id: randomUUID(),
    display: '0912 345 6789',
    dial: '09123456789',
    extension: '123',
    channel: 'text',
  });
  document.guidance = [
    {
      id: randomUUID(),
      title: { en: 'Test guidance', hil: 'Test guidance hil' },
      category: 'school',
      steps: [
        { en: 'First step', hil: 'First step hil' },
        { en: 'Second step', hil: 'Second step hil' },
      ],
      source: 'https://example.test/guide',
      reviewedAt: '2026-10-01',
      reviewer: 'External reviewer',
      approved: true,
    },
  ];
  document.map = {
    id: randomUUID(),
    assetPath: `${randomUUID()}.png`,
    description: { en: 'Test map', hil: 'Test map hil' },
    instructions: [{ en: 'Test instruction', hil: 'Test instruction hil' }],
    source: 'https://example.test/map',
    reviewedAt: '2026-10-01',
    reviewer: 'External reviewer',
    approved: true,
  };
  const initialRevision = (await db.query('select revision from public.directory_drafts')).rows[0]
    .revision;
  const saved = (
    await db.query('select public.save_directory($1,$2) revision', [document, initialRevision])
  ).rows[0].revision;
  const loaded = (await db.query('select * from public.get_directory_draft()')).rows[0];
  assert.deepEqual(loaded, { payload: document, revision: saved });
  checks++;
  assert.equal((await db.query('select count(*)::int n from public.contact_numbers')).rows[0].n, 7);
  const published = (await db.query('select public.publish_directory($1) id', [saved])).rows[0].id;
  const publication = (await db.query('select * from public.publications where id=$1', [published]))
    .rows[0];
  assert.equal(publication.published_by, admin);
  assert.equal(publication.source_revision, saved);
  assert.equal(
    (
      await db.query(
        "select publication_id from public.audit_events where action='publish' order by id desc limit 1",
      )
    ).rows[0].publication_id,
    published,
  );
  checks++;

  const invalid = structuredClone(document);
  invalid.quickCalls![0].numberId = randomUUID();
  await fails('select public.save_directory($1,$2)', [invalid, saved], '23503');
  assert.deepEqual((await db.query('select * from public.get_directory_draft()')).rows[0], loaded);
  const duplicate = structuredClone(document);
  duplicate.contacts[1].numbers[0].id = duplicate.contacts[0].numbers[0].id;
  duplicate.quickCalls = [];
  await fails('select public.save_directory($1,$2)', [duplicate, saved], '23505');
  assert.deepEqual((await db.query('select * from public.get_directory_draft()')).rows[0], loaded);
  await fails('select public.save_directory($1,$2)', [document, initialRevision], '40001');
  await fails('select public.save_directory($1,null)', [document], '40001');
  await fails('select public.publish_directory(null)', [], '40001');

  // Even privileged direct writes cannot bypass FK ownership or snapshot immutability.
  await db.query('reset role');
  await fails(
    'delete from public.contact_numbers where id=$1',
    [document.quickCalls![0].numberId],
    '23503',
  );
  await fails(
    "update public.contacts set category_id='unknown' where id=$1",
    [document.contacts[0].id],
    '23503',
  );
  await fails(
    "update public.publications set snapshot=jsonb_set(snapshot,'{version}','\"changed\"') where id=$1",
    [published],
  );
  await fails('delete from public.publications where id=$1', [published]);
  await db.query('set local role authenticated');
  const next = (
    await db.query('select public.save_directory($1,$2) revision', [emptySnapshot, saved])
  ).rows[0].revision;
  assert.deepEqual(
    (await db.query('select snapshot from public.publications where id=$1', [published])).rows[0]
      .snapshot,
    publication.snapshot,
  );
  const restored = (await db.query('select public.restore_directory($1,$2) id', [published, next]))
    .rows[0].id;
  assert.notEqual(restored, published);
  const restoredDocument = (await db.query('select payload from public.get_directory_draft()'))
    .rows[0].payload;
  assert.deepEqual(restoredDocument.contacts, document.contacts);
  assert.deepEqual(restoredDocument.guidance, document.guidance);
  assert.deepEqual(restoredDocument.map, document.map);
  assert.deepEqual(restoredDocument.quickCalls, document.quickCalls);
  checks++;
  const current = (await db.query('select id from public.publications where current')).rows[0].id;
  await fails('select public.restore_directory($1,$2)', [published, next], '40001');
  assert.equal(
    (await db.query('select id from public.publications where current')).rows[0].id,
    current,
  );
  await db.query('reset role');
  await db.query('delete from auth.users where id=$1', [admin]);
  assert.equal(
    (await db.query('select published_by from public.publications where id=$1', [published]))
      .rows[0].published_by,
    null,
  );
  assert.equal(
    (await db.query('select count(*)::int n from public.audit_events where actor_id=$1', [admin]))
      .rows[0].n,
    0,
  );
  assert.deepEqual(
    (await db.query('select snapshot from public.publications where id=$1', [published])).rows[0]
      .snapshot,
    publication.snapshot,
  );
  checks++;
  console.log(
    `Relational database checks passed: ${checks} assertions covering private reads/writes, helper access, FKs, complete bilingual round-trip, save rollback, conflicts, immutable history, provenance, restoration and account deletion. All test data rolled back.`,
  );
} finally {
  await db.query('rollback');
  await db.end();
}
