import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSkipAuthEnabled, SESSION_COOKIE_NAME } from '@/lib/auth/config';

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

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/change-password'],
};
