import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('supabase:server');

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
          if (env.NODE_ENV === 'development') {
            logger.warn('[Supabase] Ignored cookie write in read-only server context.', {
              error: toSafeErrorLog(error),
            });
          }
        }
      },
    },
  });
}
