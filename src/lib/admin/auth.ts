import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { databaseConfigured } from '@/lib/directory/server';
export async function requireAdmin() {
  if (!databaseConfigured()) redirect('/admin/login?setup=required');
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect('/admin/login');
  const { data: allowed } = await client.rpc('is_admin');
  if (!allowed) redirect('/admin/login?access=denied');
  return { client, user };
}
