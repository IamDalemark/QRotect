import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { emptySnapshot, fixtureSnapshot } from './fixtures';
import { snapshotSchema, type Snapshot } from './schema';

export function databaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
export async function currentSnapshot(): Promise<Snapshot> {
  if (!databaseConfigured()) return fixtureSnapshot;
  const { data, error } = await publicDatabase()
    .from('publications')
    .select('snapshot')
    .eq('current', true)
    .maybeSingle();
  if (error) throw new Error('The published directory could not be loaded.');
  return data ? snapshotSchema.parse(data.snapshot) : emptySnapshot;
}
