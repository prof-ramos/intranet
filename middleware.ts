import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET;
const secret = SESSION_SECRET ? new TextEncoder().encode(SESSION_SECRET) : null;

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('asof-session')?.value;

  if (!token || !secret) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
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
