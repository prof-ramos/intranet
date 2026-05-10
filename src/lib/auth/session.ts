import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  getSessionSecret,
  type SessionData,
} from '@/lib/auth/config';

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  cachedSecret ??= new TextEncoder().encode(getSessionSecret());
  return cachedSecret;
}

export async function createSession(payload: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_COOKIE_MAX_AGE}s`)
    .sign(getSecret());

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
    partitioned: true,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
      clockTolerance: 5,
    });
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function updateSession(payload: Partial<SessionData>): Promise<void> {
  const current = await getSession();
  if (!current) return;
  await createSession({ ...current, ...payload });
}
