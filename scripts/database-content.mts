import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import pg from 'pg';
import { z } from 'zod';
import { emptySnapshot } from '../src/lib/directory/fixtures';
import {
  snapshotSchema,
  workingDirectoryIssues,
  publicationIssues,
} from '../src/lib/directory/schema';

export function parseCommand(
  args: string[],
  env: Record<string, string | undefined> = process.env,
) {
  const { values, positionals } = parseArgs({
    args: args.filter((arg) => arg !== '--'),
    allowPositionals: true,
    options: {
      target: { type: 'string' },
      file: { type: 'string' },
      'confirm-project': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const action = z.enum(['reset', 'populate']).parse(positionals[0]);
  if (positionals.length !== 1) throw new Error('Expected reset or populate only.');
  const target = z.enum(['local', 'hosted']).parse(values.target || env.QROTECT_DB_TARGET);
  const file = values.file || env.QROTECT_POPULATE_FILE || './directory.json';
  if (action === 'reset' && values.file) throw new Error('Reset does not accept --file.');
  return {
    action,
    target,
    file: action === 'populate' ? file : undefined,
    confirmation: values['confirm-project'],
    dryRun: values['dry-run'],
  };
}

export function databaseConnection(
  target: 'local' | 'hosted',
  env: Record<string, string | undefined> = process.env,
) {
  const prefix = `QROTECT_${target.toUpperCase()}`;
  if (env[`${prefix}_DATABASE_URL`]) return env[`${prefix}_DATABASE_URL`]!;
  const required = (field: string) => {
    const key = `${prefix}_DB_${field}`;
    if (!env[key]) throw new Error(`Set ${key} or ${prefix}_DATABASE_URL.`);
    return env[key]!;
  };
  const host = required('HOST');
  if (!/^(?:[a-zA-Z0-9.-]+|\[::1\])$/.test(host))
    throw new Error(`${prefix}_DB_HOST must be a hostname without a protocol or port.`);
  const port = env[`${prefix}_DB_PORT`] || '5432';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error(`${prefix}_DB_PORT must be between 1 and 65535.`);
  const user = required('USER');
  const password = required('PASSWORD');
  const name = env[`${prefix}_DB_NAME`] || 'postgres';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}

export function readDirectoryFile(file: string) {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT')
      throw new Error(
        `JSON file not found: ${file}. Save your directory JSON there or set QROTECT_POPULATE_FILE in .env.local to its actual path.`,
      );
    throw new Error(`Cannot read JSON file: ${file}. Check that it is a readable file.`);
  }
  let input: unknown;
  try {
    input = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in ${file}. Check its JSON syntax before importing.`);
  }
  return validateDocument(input);
}

export function validateDocument(input: unknown) {
  const document = snapshotSchema.parse(input);
  const issues = [...workingDirectoryIssues(document), ...publicationIssues(document)];
  if (document.testContact) issues.push('Legacy testContact must be null.');
  if (issues.length) throw new Error(issues.join('\n'));
  return document;
}

export function validateTarget(
  target: 'local' | 'hosted',
  connection: string,
  api: string | undefined,
  confirmation: string | undefined,
) {
  const db = new URL(connection);
  if (!['postgres:', 'postgresql:'].includes(db.protocol))
    throw new Error('Expected a PostgreSQL connection URL.');
  const loopback = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (target === 'local') {
    if (!loopback(db.hostname)) throw new Error('Local target requires a loopback database host.');
    return 'local';
  }
  if (!api) throw new Error('Hosted target requires NEXT_PUBLIC_SUPABASE_URL.');
  const hostname = new URL(api).hostname;
  const match = /^([a-z0-9]+)\.supabase\.co$/.exec(hostname);
  if (!match || (confirmation && match[1] !== confirmation))
    throw new Error('The configured Supabase URL or explicit project reference is invalid.');
  const ref = match[1];
  const direct = db.hostname === `db.${ref}.supabase.co`;
  const pool =
    db.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(db.username) === `postgres.${ref}`;
  if (!direct && !pool)
    throw new Error('Database connection does not match the configured hosted project.');
  return ref;
}

// Uses the operator's database privileges; no application administrator is needed.
export async function resetContent(db: pg.Client) {
  await db.query(`truncate table public.quick_call_assignments, public.contact_numbers,
    public.contacts, public.guidance, public.campus_maps,
    public.audit_events, public.publications`);
  await db.query(`insert into public.directory_drafts
    (id,revision,document_version,document_published_at,legacy_test_contact,quick_calls_defined)
    values (true,0,'unpublished',null,null,false)
    on conflict (id) do update set revision=public.directory_drafts.revision+1,
      updated_at=now(),document_version='unpublished',document_published_at=null,
      legacy_test_contact=null,quick_calls_defined=false`);
}

async function runReset(connection: string, dryRun: boolean) {
  const db = new pg.Client({ connectionString: connection, connectionTimeoutMillis: 10000 });
  try {
    await db.connect();
    await db.query('begin');
    await db.query("set local lock_timeout = '10s'");
    await db.query("set local statement_timeout = '30s'");
    await db.query('select id from public.directory_drafts where id for update');
    if (dryRun) {
      const counts = await db.query(`select
        (select count(*) from public.contacts) contacts,
        (select count(*) from public.guidance) guidance,
        (select count(*) from public.campus_maps) maps,
        (select count(*) from public.publications) publications`);
      console.log('Dry run; website content to clear:', counts.rows[0]);
      await db.query('rollback');
      return;
    }
    await resetContent(db);
    await db.query('commit');
    console.log('Website content and history cleared. Admin accounts retained.');
    console.log(
      'Refresh after the website cache revalidates (60-second interval), or restart the website.',
    );
  } catch (error) {
    await db.query('rollback').catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

export async function changeContent(
  db: pg.Client,
  action: 'reset' | 'populate',
  document: ReturnType<typeof snapshotSchema.parse>,
  revision: number,
) {
  if (action === 'reset') {
    await resetContent(db);
    return null;
  }
  const saved = await db.query('select public.save_directory($1::jsonb,$2::bigint) revision', [
    JSON.stringify(document),
    revision,
  ]);
  const result = await db.query('select public.publish_directory($1::bigint) id', [
    saved.rows[0].revision,
  ]);
  return result.rows[0].id as string;
}

export async function main(args = process.argv.slice(2)) {
  const require = createRequire(import.meta.resolve('next/package.json'));
  require('@next/env').loadEnvConfig(process.cwd());
  const options = parseCommand(args);
  const document =
    options.action === 'populate'
      ? readDirectoryFile(options.file!)
      : structuredClone(emptySnapshot);
  const connection = databaseConnection(options.target);
  if (options.action === 'reset') {
    // Only local reset restricts the host. Hosted reset uses its configured URL directly.
    if (options.target === 'local') validateTarget('local', connection, undefined, undefined);
    else if (!['postgres:', 'postgresql:'].includes(new URL(connection).protocol))
      throw new Error('Expected a PostgreSQL connection URL.');
    await runReset(connection, options.dryRun);
    return;
  }
  const identity = validateTarget(
    options.target,
    connection,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    options.confirmation,
  );
  const administrator = z.uuid().parse(process.env.QROTECT_ADMIN_USER_ID);
  const db = new pg.Client({ connectionString: connection, connectionTimeoutMillis: 10000 });
  let committed = false;
  try {
    await db.connect();
    await db.query('begin isolation level repeatable read');
    await db.query("set local lock_timeout = '10s'");
    await db.query("set local statement_timeout = '30s'");
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [administrator]);
    const membership = await db.query('select public.is_admin() authorized');
    if (!membership.rows[0].authorized)
      throw new Error('QROTECT_ADMIN_USER_ID must identify an active administrator.');
    const draft = await db.query('select * from public.directory_drafts where id for update');
    if (draft.rowCount !== 1)
      throw new Error('Expected one initialized directory draft. Apply migrations first.');
    // Prevent concurrent publication/history changes while capturing the backup.
    await db.query(
      'lock table public.publications, public.audit_events in share row exclusive mode',
    );
    const current = await db.query('select public._directory_document() payload');
    if (document.map) {
      const asset = await db.query(
        "select 1 from storage.objects where bucket_id='campus-maps' and name=$1",
        [document.map.assetPath],
      );
      if (!asset.rowCount)
        throw new Error('Upload the referenced map image through Administration → Map first.');
    }
    const publications = await db.query('select * from public.publications order by created_at');
    const audit = await db.query('select * from public.audit_events order by id');
    console.log(
      `${options.action} target: ${identity}. Existing: ${current.rows[0].payload.contacts.length} contacts, ${publications.rowCount} publications. Incoming: ${document.contacts.length} contacts, ${document.guidance.length} guides, ${document.map ? 1 : 0} map.`,
    );
    if (options.dryRun) {
      await db.query('rollback');
      console.log('Dry run complete. No content or backup files changed.');
      return;
    }
    mkdirSync('.local/backups', { recursive: true, mode: 0o700 });
    const backup = `.local/backups/${Date.now()}-${randomUUID()}.json`;
    writeFileSync(
      backup,
      JSON.stringify(
        {
          format: 'qrotect-content-backup-v1',
          target: identity,
          createdAt: new Date().toISOString(),
          draft: draft.rows[0],
          document: current.rows[0].payload,
          publications: publications.rows,
          auditEvents: audit.rows,
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    console.log(`Backup: ${backup}`);
    const publication = await changeContent(db, options.action, document, draft.rows[0].revision);
    await db.query('commit');
    committed = true;
    console.log(
      publication
        ? `Published: ${publication}`
        : 'Website content and history reset. Accounts, schema and uploaded images preserved.',
    );
    console.log(
      'Public pages use a 60-second revalidation interval; refresh after revalidation or restart the website to clear its cache.',
    );
  } finally {
    if (!committed) await db.query('rollback').catch(() => {});
    await db.end();
  }
}
