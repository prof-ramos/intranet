import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function getBrowserSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL ?? null;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY ??
    null;

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const config = getBrowserSupabaseConfig();

  if (!config) {
    return null;
  }

  browserClient ??= createBrowserClient(config.url, config.publishableKey);

  return browserClient;
}
