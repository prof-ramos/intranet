import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSkipAuthEnabled } from '@/lib/auth/config';
import { createProxySupabaseClient } from '@/lib/supabase/proxy';

const PROTECTED_ROUTE_PREFIXES = ['/app', '/change-password'] as const;
const AUTH_PAGES = ['/login'] as const;

export async function proxy(request: NextRequest) {
  if (isSkipAuthEnabled()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const { client, getResponse } = createProxySupabaseClient(request);
  let user = null;
  try {
    const result = await client.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.warn('[Auth proxy] Supabase user lookup failed.', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return getResponse();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/change-password'],
};
