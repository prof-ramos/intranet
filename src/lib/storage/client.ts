import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabase/config';

let adminClient: ReturnType<typeof createClient> | null = null;
let anonClient: ReturnType<typeof createClient> | null = null;

function getStorageClientOptions(accessToken?: string) {
  return {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  };
}

/**
 * SERVER-ONLY admin storage client. Uses the service-role key and bypasses RLS;
 * callers must enforce authorization before invoking storage operations.
 */
export function getSupabaseAdminStorageClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client is server-only.');
  }

  adminClient ??= createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    getStorageClientOptions(),
  );

  return adminClient;
}

/**
 * Server-created anon/publishable-key client for storage flows that must obey
 * Supabase RLS/policies instead of bypassing them with the service role key.
 * Pass accessToken (from session) so RLS policies can evaluate auth.uid().
 */
export function getSupabaseAnonStorageClient(accessToken?: string) {
  if (accessToken) {
    return createClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      getStorageClientOptions(accessToken),
    );
  }

  anonClient ??= createClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    getStorageClientOptions(),
  );
  return anonClient;
}

export const getSupabaseAdmin = getSupabaseAdminStorageClient;
export const getSupabaseClient = getSupabaseAnonStorageClient;
