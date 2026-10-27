import 'server-only';
import { unstable_cache } from 'next/cache';
import { publicSnapshot } from './public-snapshot';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { emptySnapshot, fixtureSnapshot } from './fixtures';
import { snapshotSchema, type Snapshot } from './schema';

export function databaseConfigured() {
  if (process.env.QROTECT_REVIEW_MODE === 'sample') return false;
  const environment = process.env;
  return Boolean(
    (environment.SUPABASE_URL ?? environment.NEXT_PUBLIC_SUPABASE_URL) &&
    (environment.SUPABASE_PUBLISHABLE_KEY ?? environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}
export function publicDatabase() {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(3000) }),
    },
  });
}
export async function loadCurrentSnapshot(): Promise<Snapshot> {
  if (!databaseConfigured()) return fixtureSnapshot;
  const { data, error } = await publicDatabase()
    .from('publications')
    .select('snapshot')
    .eq('current', true)
    .maybeSingle();
  if (error) throw new Error('The published directory could not be loaded.');
  return data ? publicSnapshot(snapshotSchema.parse(data.snapshot)) : emptySnapshot;
}

// Cache only validated public publications. Keep the source identity in the key
// so local review and different Supabase projects never share a publication.
export const PUBLIC_SNAPSHOT_TAG = 'qrotect-public-publication';
export async function currentSnapshot(): Promise<Snapshot> {
  if (!databaseConfigured()) return fixtureSnapshot;
  const { url } = getSupabaseConfig();
  return unstable_cache(loadCurrentSnapshot, ['public-publication-v2', url], {
    tags: [PUBLIC_SNAPSHOT_TAG],
    revalidate: 60,
  })();
}
