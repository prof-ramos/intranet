import { createClient } from '@supabase/supabase-js';

type SupabaseMode = 'admin' | 'server';

function requireEnv(names: string[]) {
  const value = names
    .map((name) => process.env[name]?.trim())
    .find((envValue): envValue is string => Boolean(envValue));

  if (!value) {
    throw new Error(`${names.join(' or ')} must be set.`);
  }

  return value;
}

function createServerSupabaseClient(mode: SupabaseMode) {
  const url = requireEnv(['DATABASE_SUPABASE_URL', 'NEXT_PUBLIC_DATABASE_SUPABASE_URL']);
  const key =
    mode === 'admin'
      ? // Service role keys bypass RLS. Use only from server-side migrations or system operations.
        requireEnv(['DATABASE_SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_SUPABASE_SECRET_KEY'])
      : requireEnv([
          'DATABASE_SUPABASE_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY',
          'DATABASE_SUPABASE_ANON_KEY',
          'NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY',
        ]);

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseServerClient() {
  return createServerSupabaseClient('server');
}

export function getSupabaseAdminClient() {
  return createServerSupabaseClient('admin');
}
