import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  isSkipAuthEnabled,
} from '@/lib/auth/config';

let encodedSecret: Uint8Array | null = null;

function getEncodedSecret(): Uint8Array {
  encodedSecret ??= new TextEncoder().encode(getSessionSecret());
  return encodedSecret;
}

export async function middleware(request: NextRequest) {
  if (isSkipAuthEnabled()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), { clockTolerance: 60 });
    const session = payload as unknown as { isLoggedIn?: boolean; mustChangePassword?: boolean };

    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (
      session.mustChangePassword &&
      !request.nextUrl.pathname.startsWith('/change-password')
    ) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/app/:path*', '/change-password'],
};
