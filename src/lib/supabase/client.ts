'use client';
import type { Database } from './database.types';

import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseConfig } from './config';

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey);
}
