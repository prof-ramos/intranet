import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  getDevAuthUser,
  isAuthRole,
  isSkipAuthEnabled,
  SESSION_COOKIE_NAME,
  type SessionData,
} from '@/lib/auth/config';
import { env } from '@/lib/env';

const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface SessionTokenPayload {
  userId: number;
  email: string;
  sessionVersion: number;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET must be set when SKIP_AUTH is not enabled.');
  }
  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload);
  const expectedBuffer = Buffer.from(expected, 'base64url');
  const actualBuffer = Buffer.from(signature, 'base64url');

  return (
    expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function parseSessionToken(token: string | undefined): SessionTokenPayload | null {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature || !verifySignature(payload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Partial<SessionTokenPayload>;
    const { userId, email, iat, exp } = parsed;
    const sessionVersion = parsed.sessionVersion ?? 0;
    if (
      typeof userId !== 'number' ||
      !Number.isInteger(userId) ||
      typeof email !== 'string' ||
      typeof sessionVersion !== 'number' ||
      !Number.isInteger(sessionVersion) ||
      typeof iat !== 'number' ||
      !Number.isInteger(iat) ||
      typeof exp !== 'number' ||
      !Number.isInteger(exp)
    ) {
      return null;
    }

    if (exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId,
      email: email.trim().toLowerCase(),
      sessionVersion,
      iat,
      exp,
    };
  } catch {
    return null;
  }
}

function createSessionToken(input: {
  userId: number;
  email: string;
  sessionVersion: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(
    JSON.stringify({
      userId: input.userId,
      email: input.email.trim().toLowerCase(),
      sessionVersion: input.sessionVersion,
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    } satisfies SessionTokenPayload),
  );

  return `${payload}.${signPayload(payload)}`;
}

export async function createSession(input: { userId: number; email: string }): Promise<void> {
  const [admin] = await db
    .select({
      sessionVersion: admins.sessionVersion,
    })
    .from(admins)
    .where(and(eq(admins.id, input.userId), eq(admins.email, input.email.trim().toLowerCase())))
    .limit(1);

  if (!admin) {
    throw new Error('Cannot create a session for an unknown admin.');
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    createSessionToken({ ...input, sessionVersion: admin.sessionVersion }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    },
  );
}

export async function getSession(): Promise<SessionData | null> {
  if (isSkipAuthEnabled()) {
    return { ...getDevAuthUser(), isLoggedIn: true };
  }

  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!token) {
    return null;
  }

  const [admin] = await db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
      mustChangePassword: admins.mustChangePassword,
      sessionVersion: admins.sessionVersion,
    })
    .from(admins)
    .where(and(eq(admins.id, token.userId), eq(admins.email, token.email)))
    .limit(1);

  if (!admin || !admin.isActive || !isAuthRole(admin.role)) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (admin.sessionVersion !== token.sessionVersion) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return {
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
    isLoggedIn: true,
  };
}

export async function destroySession(): Promise<void> {
  if (isSkipAuthEnabled()) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
