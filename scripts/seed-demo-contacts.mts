import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { fixtureSnapshot } from '../src/lib/directory/fixtures';
import { snapshotSchema } from '../src/lib/directory/schema';
if (!process.argv.includes('--public-demo'))
  throw new Error('Pass --public-demo only for an explicitly requested public demonstration.');
const require = createRequire(import.meta.resolve('next/package.json'));
require('@next/env').loadEnvConfig(process.cwd());
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const projectRef = new URL(endpoint).hostname.split('.')[0];
const account = JSON.parse(readFileSync('.local/hosted-demo-administrator.json', 'utf8'));
if (account.projectRef !== projectRef)
  throw new Error('Administrator and configured project do not match.');
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
  },
};
const admin = createClient(endpoint, publicKey, options);
try {
  const login = await admin.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (login.error) throw new Error('Administrator sign-in failed.');
  const draft = await admin.from('directory_drafts').select('payload,revision').single();
  const current = await admin.from('publications').select('id').eq('current', true).maybeSingle();
  if (draft.error || current.error) throw new Error('Existing content could not be inspected.');
  if (current.data || draft.data.payload.contacts.length)
    throw new Error(
      'Content already exists. It was preserved; this first-time seed will not overwrite it.',
    );
  let keys: unknown;
  try {
    keys = JSON.parse(
      execFileSync(
        'pnpm',
        [
          'exec',
          'supabase',
          'projects',
          'api-keys',
          '--project-ref',
          projectRef,
          '--reveal',
          '-o',
          'json',
        ],
        { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    );
  } catch {
    throw new Error('Project management access is unavailable; no changes were made.');
  }
  let secret: string | undefined;
  function findSecret(value: unknown) {
    if (typeof value === 'string') {
      if (value.startsWith('sb_secret_') && !value.includes('*')) secret ??= value;
      if (value.startsWith('eyJ')) {
        try {
          if (
            JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role ===
            'service_role'
          )
            secret ??= value;
        } catch {}
      }
    } else if (value && typeof value === 'object')
      for (const child of Object.values(value)) findSecret(child);
  }
  findSecret(keys);
  if (!secret) throw new Error('An authorized server key is required; no changes were made.');
  const contacts = fixtureSnapshot.contacts.map((contact) => ({
    ...structuredClone(contact),
    numbers: contact.numbers.map((number) => ({
      ...number,
      display: '0912 345 6789',
      dial: '09123456789',
    })),
  }));
  const working = snapshotSchema.parse({ ...draft.data.payload, contacts });
  const id = randomUUID(),
    publishedAt = new Date().toISOString();
  const demo = snapshotSchema.parse({ ...fixtureSnapshot, contacts, version: id, publishedAt });
  mkdirSync('.local', { recursive: true, mode: 0o700 });
  writeFileSync('.local/before-demo-contacts.json', JSON.stringify(draft.data, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  const saved = await admin.rpc('save_directory', {
    document: working,
    expected_revision: draft.data.revision,
  });
  if (saved.error)
    throw new Error('The draft changed or could not be saved; no public demo was installed.');
  // Explicit demo installation preserves fixture metadata and does not falsify approvals.
  // The regular administrator publication function continues to reject unapproved content.
  const management = createClient(endpoint, secret, options);
  const installed = await management
    .from('publications')
    .insert({ id, snapshot: demo, current: true });
  if (installed.error) throw new Error('Public demo installation failed; the draft remains saved.');
  const visitor = createClient(endpoint, publicKey, options);
  const result = await visitor.from('publications').select('snapshot').eq('current', true).single();
  if (result.error) throw new Error('The public result could not be verified.');
  const publicData = snapshotSchema.parse(result.data.snapshot);
  if (
    !publicData.fixture ||
    publicData.testContact ||
    publicData.contacts.length !== 6 ||
    publicData.contacts.some(
      (contact) => contact.approved || contact.numbers[0].dial !== '09123456789',
    )
  )
    throw new Error('Unexpected demo result.');
  console.log(
    'Installed six public demo contacts and six editable draft contacts, one per category.',
  );
  console.log('Display number: 0912 345 6789. Agency calling remains simulated.');
} finally {
  await admin.auth.signOut({ scope: 'local' });
}
