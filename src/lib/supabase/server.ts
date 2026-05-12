import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Server Components cannot mutate cookies; the request proxy keeps them refreshed.
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Supabase] Ignored cookie write in read-only server context.', {
              error: error instanceof Error ? error.message : 'unknown',
            });
          }
        }
      },
    },
  });
}
