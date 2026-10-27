import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, openSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
const api = status.API_URL as string;
if (new URL(api).hostname !== '127.0.0.1')
  throw new Error('Browser checks require the local test project.');
const admin = createClient(api, status.SECRET_KEY || status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const db = new pg.Client({ connectionString: status.DB_URL });
await db.connect();
const before = (await db.query('select payload,revision from public.directory_drafts')).rows[0];
if (
  before.payload.contacts.length > 0 ||
  (await db.query('select id from public.publications')).rows.length > 0
)
  throw new Error('Use a clean local test project before running browser checks.');
const email = `qrotect-check-${randomUUID()}@example.test`,
  password = randomBytes(24).toString('base64url');
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) throw new Error('Could not create the local test account.');
const userId = data.user.id;
await db.query('insert into public.administrators(user_id) values($1)', [userId]);
mkdirSync('test-results', { recursive: true });
const servers: ChildProcess[] = [];
function environment(connected: boolean) {
  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: connected ? api : '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: connected
      ? status.PUBLISHABLE_KEY || status.ANON_KEY
      : '',
    QROTECT_REVIEW_MODE: connected ? 'local' : 'sample',
    SUPABASE_URL: connected ? api : '',
    SUPABASE_PUBLISHABLE_KEY: connected ? status.PUBLISHABLE_KEY || status.ANON_KEY : '',
    NEXT_TELEMETRY_DISABLED: '1',
  };
}
function start(port: number, connected: boolean) {
  const stream = openSync(`test-results/server-${port}.log`, 'w');
  const child = spawn('pnpm', ['start', '--hostname', '127.0.0.1', '--port', String(port)], {
    detached: true,
    env: environment(connected),
    stdio: ['ignore', stream, stream],
  });
  servers.push(child);
}
async function ready(port: number) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/admin/login`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Test server ${port} did not start.`);
}
let result = 1;
try {
  // Static HTML belongs to the environment used at build time. Run phases
  // sequentially so a hosted/sample build can never seed the local admin site.
  for (const connected of [false, true]) {
    execFileSync('pnpm', ['build'], { env: environment(connected), stdio: 'inherit' });
    const port = connected ? 3102 : 3100;
    start(port, connected);
    await ready(port);
    const sample = await (await fetch(`http://127.0.0.1:${port}/api/public/snapshot`)).json();
    if (sample.fixture === connected) throw new Error('Browser server source isolation failed.');
    result = await new Promise<number>((resolve) => {
      const files = connected
        ? ['tests/e2e/admin.spec.ts']
        : [
            'tests/e2e/public.spec.ts',
            'tests/e2e/calling.spec.ts',
            'tests/e2e/performance.spec.ts',
            'tests/e2e/filters.spec.ts',
          ];
      const child = spawn('pnpm', ['exec', 'playwright', 'test', ...files, '--workers=2'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          QROTECT_E2E_ADMIN_EMAIL: email,
          QROTECT_E2E_ADMIN_PASSWORD: password,
        },
      });
      child.on('exit', (code) => resolve(code ?? 1));
    });
    const server = servers.pop()!;
    if (server.pid) process.kill(-server.pid, 'SIGTERM');
    await new Promise<void>((resolve) => server.once('exit', () => resolve()));
    if (result) break;
  }
} finally {
  for (const child of servers)
    if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {}
    }
  const current = (await db.query('select payload from public.directory_drafts')).rows[0].payload;
  if (current.contacts.length === 1 && current.contacts[0].agency === 'QROTECT browser test')
    await db.query('update public.directory_drafts set payload=$1,revision=revision+1 where id', [
      before.payload,
    ]);
  await db.query('delete from public.publications');
  await db.query('delete from public.audit_events where actor=$1', [userId]);
  await db.query('delete from public.administrators where user_id=$1', [userId]);
  await admin.auth.admin.deleteUser(userId);
  await db.end();
}
process.exitCode = result;
