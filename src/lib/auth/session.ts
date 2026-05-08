import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: number;
  email: string;
  name: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  mustChangePassword: boolean;
  isLoggedIn: boolean;
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    'SESSION_SECRET must be set and at least 32 characters long. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

const secret = new TextEncoder().encode(SESSION_SECRET);
const COOKIE_NAME = 'asof-session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(payload: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(secret);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function updateSession(payload: Partial<SessionData>): Promise<void> {
  const current = await getSession();
  if (!current) return;
  await createSession({ ...current, ...payload });
}
