import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabase/config';

let adminClient: ReturnType<typeof createClient> | null = null;
let anonClient: ReturnType<typeof createClient> | null = null;

/**
 * SERVER-ONLY admin storage client. Uses the service-role key and bypasses RLS;
 * callers must enforce authorization before invoking storage operations.
 */
export function getSupabaseAdminStorageClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client is server-only.');
  }

  adminClient ??= createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Server-created anon/publishable-key client for storage flows that must obey
 * Supabase RLS/policies instead of bypassing them with the service role key.
 */
export function getSupabaseAnonStorageClient() {
  anonClient ??= createClient(getSupabaseUrl(), getSupabasePublishableKey());
  return anonClient;
}

export const getSupabaseAdmin = getSupabaseAdminStorageClient;
export const getSupabaseClient = getSupabaseAnonStorageClient;
