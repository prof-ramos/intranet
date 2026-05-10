import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { env } from '@/lib/env';
import { SESSION_COOKIE_NAME, isSkipAuthEnabled } from '@/lib/auth/config';

async function getSecret(): Promise<Uint8Array> {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function proxy(request: NextRequest) {
  if (isSkipAuthEnabled()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, await getSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 60,
    });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/app/:path*'],
};
