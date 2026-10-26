'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { databaseConfigured } from '@/lib/directory/server';
import { requireAdmin } from '@/lib/admin/auth';
export async function signIn(_state: { message: string }, form: FormData) {
  if (!databaseConfigured())
    return { message: 'Connect the Supabase project before administrator sign-in.' };
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(200) })
    .safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { message: 'Enter a valid email and password.' };
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return { message: 'Sign-in failed. Check your email and password, then try again.' };
  const { data: allowed } = await client.rpc('is_admin');
  if (!allowed) {
    await client.auth.signOut();
    return { message: 'This account does not have administrator access.' };
  }
  redirect('/admin');
}
export async function signOut() {
  const client = await createClient();
  await client.auth.signOut();
  redirect('/admin/login');
}
export async function requestRecovery(_state: { message: string }, form: FormData) {
  const email = z.email().safeParse(form.get('email'));
  if (!email.success || !databaseConfigured())
    return { message: 'Enter your administrator email. Supabase must be connected.' };
  const client = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  await client.auth.resetPasswordForEmail(email.data, {
    redirectTo: new URL('/auth/callback', site).toString(),
  });
  return {
    message: 'If this address has an account, a recovery link will be sent. Check your email.',
  };
}
export async function updatePassword(_state: { message: string }, form: FormData) {
  const { client } = await requireAdmin();
  const password = z.string().min(12).max(200).safeParse(form.get('password'));
  if (!password.success || form.get('password') !== form.get('confirm'))
    return { message: 'Use at least 12 characters and enter matching passwords.' };
  const { error } = await client.auth.updateUser({ password: password.data });
  return {
    message: error
      ? 'Password could not be updated. Request a new recovery link.'
      : 'Password updated. You can return to the administrator portal.',
  };
}
