import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { fixtureSnapshot } from '../src/lib/directory/fixtures';
const url =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local item-publishing checks only.');
const db = new pg.Client({ connectionString: url });
await db.connect();
let checks = 0;
async function fails(sql: string, values: unknown[], code: string) {
  await db.query('savepoint failed');
  try {
    await assert.rejects(
      db.query(sql, values),
      (e: unknown) => (e as { code: string }).code === code,
    );
    checks++;
  } finally {
    await db.query('rollback to failed');
  }
}
const rpc = 'select public.publish_directory_item($1,$2,$3,$4) revision';
try {
  await db.query('begin');
  const settings = await db.query(
    "select proconfig from pg_proc where oid in ('public.publish_directory_item(text,text,jsonb,bigint)'::regprocedure, 'public.publish_directory(bigint)'::regprocedure)",
  );
  assert.equal(settings.rows.length, 2);
  for (const row of settings.rows) assert.ok(row.proconfig.includes('TimeZone=Asia/Manila'));
  checks++;
  const today = (
    await db.query("select (now() at time zone 'Asia/Manila')::date::text as review_date")
  ).rows[0].review_date;
  // Publishers must use Manila even when a caller's session uses another timezone.
  await db.query("set local timezone = 'Pacific/Honolulu'");
  const admin = randomUUID(),
    visitor = randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)', [admin, visitor]);
  await db.query('insert into public.administrators(user_id) values($1)', [admin]);
  await db.query('set local role anon');
  await fails(rpc, ['contact', randomUUID(), null, 0], '42501');
  await db.query('reset role');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [visitor]);
  await fails(rpc, ['contact', randomUUID(), null, 0], '42501');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [admin]);
  const document = structuredClone(fixtureSnapshot);
  document.fixture = false;
  document.quickCalls = [];
  for (const c of document.contacts) {
    c.approved = true;
    c.source = 'https://example.test/contact';
    c.verifiedAt = today;
  }
  let revision = Number(
    (await db.query('select revision from public.directory_drafts')).rows[0].revision,
  );
  revision = Number(
    (await db.query('select public.save_directory($1,$2) revision', [document, revision])).rows[0]
      .revision,
  );
  await db.query('select public.publish_directory($1)', [revision]);
  const original = (await db.query('select snapshot from public.publications where current'))
    .rows[0].snapshot;
  // Unrelated saved private edits must never be swept into an item publication.
  document.contacts[1].agency = 'Unpublished private fire change';
  document.contacts[1].approved = false;
  revision = Number(
    (await db.query('select public.save_directory($1,$2) revision', [document, revision])).rows[0]
      .revision,
  );
  const contact = structuredClone(document.contacts[0]);
  contact.agency = 'Published police correction';
  const oldRevision = revision;
  revision = Number(
    (await db.query(rpc, ['contact', contact.id, contact, revision])).rows[0].revision,
  );
  let published = (await db.query('select snapshot from public.publications where current')).rows[0]
    .snapshot;
  assert.equal(published.contacts[0].agency, contact.agency);
  assert.deepEqual(published.contacts.slice(1), original.contacts.slice(1));
  checks++;
  assert.equal(
    (await db.query('select payload from public.get_directory_draft()')).rows[0].payload.contacts[1]
      .agency,
    document.contacts[1].agency,
  );
  checks++;
  await fails(rpc, ['contact', contact.id, contact, oldRevision], '40001');
  await fails(rpc, ['contact', contact.id, contact, null], '40001');
  await fails(rpc, ['contact', randomUUID(), contact, revision], '22023');
  const invalid = structuredClone(contact);
  invalid.numbers[0].dial = '0912-345-6789';
  await fails(rpc, ['contact', contact.id, invalid, revision], '22023');
  invalid.numbers[0].dial = '09123456789';
  invalid.approved = false;
  await fails(rpc, ['contact', contact.id, invalid, revision], '22023');
  const q = { category: contact.category, contactId: contact.id, numberId: contact.numbers[0].id };
  revision = Number(
    (await db.query(rpc, ['quick-call', q.category, q, revision])).rows[0].revision,
  );
  const hidden = { ...contact, active: false };
  await fails(rpc, ['contact', contact.id, hidden, revision], '23503');
  const missingLine = structuredClone(contact);
  missingLine.numbers[0].id = randomUUID();
  await fails(rpc, ['contact', contact.id, missingLine, revision], '23503');
  const textLine = structuredClone(contact);
  textLine.numbers[0].channel = 'text';
  await fails(rpc, ['contact', contact.id, textLine, revision], '23503');
  revision = Number(
    (await db.query(rpc, ['quick-call', q.category, null, revision])).rows[0].revision,
  );
  revision = Number(
    (await db.query(rpc, ['contact', contact.id, hidden, revision])).rows[0].revision,
  );
  published = (await db.query('select snapshot from public.publications where current')).rows[0]
    .snapshot;
  assert.ok(!published.contacts.some((c: { id: string }) => c.id === contact.id));
  checks++;
  assert.ok(
    (
      await db.query('select payload from public.get_directory_draft()')
    ).rows[0].payload.contacts.some(
      (c: { id: string; active: boolean }) => c.id === contact.id && !c.active,
    ),
  );
  checks++;
  const guide = {
    id: randomUUID(),
    category: 'school',
    title: { en: 'Test topic', hil: 'Test title' },
    steps: [{ en: 'Supplied test text', hil: 'Test text hil' }],
    source: 'https://example.test/guide',
    reviewedAt: today,
    reviewer: 'Test reviewer',
    approved: true,
  };
  revision = Number(
    (await db.query(rpc, ['guidance', guide.id, guide, revision])).rows[0].revision,
  );
  const beforeMap = (await db.query('select snapshot from public.publications where current'))
    .rows[0].snapshot;
  const map = {
    id: randomUUID(),
    assetPath: `${randomUUID()}.png`,
    description: { en: 'Test map', hil: 'Test map text' },
    instructions: [{ en: 'Test text', hil: 'Test text hil' }],
    source: 'https://example.test/map',
    reviewedAt: today,
    reviewer: 'Test reviewer',
    approved: true,
  };
  revision = Number((await db.query(rpc, ['map', 'campus-map', map, revision])).rows[0].revision);
  published = (await db.query('select snapshot from public.publications where current')).rows[0]
    .snapshot;
  assert.deepEqual(published.contacts, beforeMap.contacts);
  assert.deepEqual(published.guidance, beforeMap.guidance);
  assert.deepEqual(published.map, map);
  checks++;
  await fails(
    rpc,
    ['guidance', guide.id, { ...guide, title: { en: 'Test', hil: '' } }, revision],
    '22023',
  );
  await fails(rpc, ['map', 'campus-map', { ...map, approved: false }, revision], '22023');
  revision = Number((await db.query(rpc, ['guidance', guide.id, null, revision])).rows[0].revision);
  revision = Number((await db.query(rpc, ['map', 'campus-map', null, revision])).rows[0].revision);
  published = (await db.query('select snapshot from public.publications where current')).rows[0]
    .snapshot;
  assert.deepEqual(published.guidance, []);
  assert.equal(published.map, null);
  checks++;
  // A first publication must not include other private records.
  await db.query('savepoint first_publication');
  await db.query('reset role');
  await db.query('update public.publications set current=false where current');
  await db.query('set local role authenticated');
  revision = Number(
    (await db.query(rpc, ['contact', contact.id, contact, revision])).rows[0].revision,
  );
  published = (await db.query('select snapshot from public.publications where current')).rows[0]
    .snapshot;
  assert.equal(published.contacts.length, 1);
  assert.deepEqual(published.contacts[0], contact);
  checks++;
  await db.query('rollback to first_publication');
  console.log(
    `${checks} item-publication checks passed: scoped changes, untouched private edits, rollback, conflicts, review, references, permissions, guidance/maps and first publication.`,
  );
} finally {
  await db.query('rollback');
  await db.end();
}
