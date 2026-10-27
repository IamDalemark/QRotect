import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
if (existsSync('.local/administrator.txt'))
  throw new Error('Local settings already exist. Preserve them and follow docs/OPERATIONS.md.');
const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
const api = new URL(status.API_URL);
if (api.hostname !== '127.0.0.1') throw new Error('Setup is restricted to local Supabase.');
const client = createClient(api.href, status.SECRET_KEY || status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const email = 'administrator@qrotect.local',
  password = randomBytes(24).toString('base64url');
const { data, error } = await client.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error || !data.user)
  throw new Error('Local review account was not created; settings were preserved.');
const db = new pg.Client({ connectionString: status.DB_URL });
try {
  await db.connect();
  await db.query('insert into public.administrators(user_id) values($1)', [data.user.id]);
  mkdirSync('.local', { recursive: true, mode: 0o700 });
  writeFileSync(
    '.local/administrator.txt',
    `LOCAL REVIEW ONLY\nEmail: ${email}\nPassword: ${password}\nAdmin: http://localhost:3102/admin\n`,
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Local administrator created without sending email. Credentials: .local/administrator.txt (untracked).',
  );
} finally {
  await db.end();
}
