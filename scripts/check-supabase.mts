import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { snapshotSchema } from '../src/lib/directory/schema';
const require = createRequire(import.meta.resolve('next/package.json'));
require('@next/env').loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Set the Supabase URL and publishable key in the environment.');
if (key.startsWith('sb_secret_')) throw new Error('Use a publishable key, not a secret key.');
if (key.startsWith('eyJ')) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (payload.role !== 'anon') throw new Error('Use a publishable or legacy anon key.');
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
});
const publication = await client
  .from('publications')
  .select('snapshot')
  .eq('current', true)
  .maybeSingle();
const authorization = await client.rpc('is_admin');
let failed = false;
for (const [name, result] of [
  ['Publication table', publication],
  ['Administrator function', authorization],
] as const) {
  if (result.error) {
    failed = true;
    const missing = ['PGRST205', 'PGRST202', '42P01', '42883'].includes(result.error.code);
    console.log(
      `${name}: ${missing ? 'MISSING — apply the project migrations' : `FAILED (${result.status}, ${result.error.code || 'network error'})`}`,
    );
  } else console.log(`${name}: ready`);
}
// Probe required administrator RPCs anonymously: presence must be confirmed by
// an access-denied response, never by exporting a draft or making a write.
for (const [name, result] of await Promise.all([
  client.rpc('get_directory_draft').then((result) => ['Draft reader', result] as const),
  client
    .rpc('publish_directory_item', {
      item_kind: 'map',
      item_key: 'campus-map',
      item: null,
      expected_revision: -1,
    })
    .then((result) => ['Item publisher', result] as const),
])) {
  if (result.error?.code === '42501') console.log(`${name}: ready and protected`);
  else {
    failed = true;
    console.log(
      `${name}: ${['PGRST202', '42883'].includes(result.error?.code ?? '') ? 'MISSING — apply the required migration before deploying' : 'FAILED — verify database permissions and availability'}`,
    );
  }
}
if (!publication.error) {
  if (!publication.data)
    console.log(
      'No publication yet. The connected website will show an empty directory until content is published.',
    );
  else if (!snapshotSchema.safeParse(publication.data.snapshot).success) {
    console.log(
      'Published data is invalid; restore or publish a validated version from administration.',
    );
    failed = true;
  } else console.log('Published data: valid');
}
if (!authorization.error && authorization.data !== false) {
  console.log('Unexpected public administrator authorization. Review membership policies.');
  failed = true;
}
console.log('No credentials or contact records were printed.');
process.exitCode = failed ? 1 : 0;
