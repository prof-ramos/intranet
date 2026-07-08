export const AUTH_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

export const PRIVILEGED_ROLES: readonly AuthRole[] = ['admin', 'diretoria'];

export type AuthRole = (typeof AUTH_ROLES)[number];

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: AuthRole;
  mustChangePassword: boolean;
}

export interface SessionData extends AuthUser {
  isLoggedIn: boolean;
}

export const SESSION_COOKIE_NAME = 'asof_session';

const DEFAULT_DEV_USER: AuthUser = {
  userId: 1,
  name: 'ASOF Dev User',
  email: 'dev@asof.local',
  role: 'admin',
  mustChangePassword: false,
};

type AuthEnv = Record<string, string | undefined>;

export function isAuthRole(value: string | undefined): value is AuthRole {
  return AUTH_ROLES.includes(value as AuthRole);
}

export function isSkipAuthEnabled(env: AuthEnv = process.env): boolean {
  if (env.SKIP_AUTH !== 'true') return false;
  // Guard: Vercel production always blocks SKIP_AUTH regardless of NODE_ENV
  if (env.VERCEL_ENV === 'production') return false;
  // Guard: explicit NODE_ENV=production also blocks
  if (env.NODE_ENV === 'production') return false;
  return true;
}

function parseDevUserId(value: string | undefined): number {
  if (!value) return DEFAULT_DEV_USER.userId;

  if (!/^\d+$/.test(value)) {
    throw new Error('DEV_USER_ID must be a positive integer when SKIP_AUTH=true.');
  }

  const userId = Number.parseInt(value, 10);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new Error('DEV_USER_ID must be a positive integer when SKIP_AUTH=true.');
  }

  return userId;
}

function parseDevUserRole(value: string | undefined): AuthRole {
  if (!value) return DEFAULT_DEV_USER.role;
  if (isAuthRole(value)) return value;

  throw new Error(`DEV_USER_ROLE must be one of: ${AUTH_ROLES.join(', ')}.`);
}

export function getDevAuthUser(env: AuthEnv = process.env): AuthUser {
  return {
    userId: parseDevUserId(env.DEV_USER_ID),
    name: env.DEV_USER_NAME || DEFAULT_DEV_USER.name,
    email: env.DEV_USER_EMAIL || DEFAULT_DEV_USER.email,
    role: parseDevUserRole(env.DEV_USER_ROLE),
    mustChangePassword: env.DEV_USER_MUST_CHANGE_PASSWORD === 'true',
  };
}
