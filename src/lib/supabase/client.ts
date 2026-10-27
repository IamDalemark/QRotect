'use client';
import type { Database } from './database.types';

import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseConfig } from './config';

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return createBrowserClient<Database>(url, publishableKey);
}
