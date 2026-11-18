import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { databaseConfigured } from '@/lib/directory/server';

async function adminClient() {
  if (!databaseConfigured()) redirect('/admin/login?setup=required');
  return createClient();
}

export const requireAdminForRender = cache(async () => {
  const client = await adminClient();
  // Inspect only the token from the cookie-backed session. Supabase Auth still
  // verifies the live user, and PostgREST checks membership with that same token.
  const { data, error } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) redirect('/admin/login');

  const [identity, membership] = await Promise.all([
    client.auth.getUser(token),
    client.rpc('is_admin').setHeader('Authorization', `Bearer ${token}`),
  ]);
  const user = identity.data.user;
  if (identity.error || !user) redirect('/admin/login');
  if (membership.error || !membership.data) redirect('/admin/login?access=denied');

  return { client, user };
});

export async function requireAdmin() {
  const client = await adminClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect('/admin/login');
  const { data: allowed } = await client.rpc('is_admin');
  if (!allowed) redirect('/admin/login?access=denied');
  return { client, user };
}
