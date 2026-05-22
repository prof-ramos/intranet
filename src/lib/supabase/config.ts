import { env } from '@/lib/env';

function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} must be set to use Supabase auth.`);
  }

  return value;
}

export function getSupabaseUrl(): string {
  return requireValue(
    env.NEXT_PUBLIC_SUPABASE_URL ??
      env.NEXT_PUBLIC_DATABASE_SUPABASE_URL ??
      env.DATABASE_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_DATABASE_SUPABASE_URL',
  );
}

export function getSupabasePublishableKey(): string {
  return requireValue(
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      env.NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY ??
      env.DATABASE_SUPABASE_PUBLISHABLE_KEY ??
      env.NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY ??
      env.DATABASE_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY',
  );
}

/**
 * SERVER-ONLY. The Supabase service-role key bypasses RLS and must never be
 * imported by client components, logged, returned from APIs, or exposed with a
 * NEXT_PUBLIC_ prefix.
 */
export function getSupabaseServiceRoleKey(): string {
  return requireValue(
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.DATABASE_SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY or DATABASE_SUPABASE_SERVICE_ROLE_KEY',
  );
}
