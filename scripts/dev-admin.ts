import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDevAuthUser, type AuthUser } from '../src/lib/auth/config';

type PersistedDevelopmentAdmin = Pick<AuthUser, 'email'> & { id: number };

export interface DevelopmentAdminStore {
  findByIdOrEmail(userId: number, email: string): Promise<PersistedDevelopmentAdmin[]>;
  create(user: AuthUser, passwordHash: string): Promise<void>;
  normalize(user: AuthUser): Promise<void>;
  realignIdentitySequence(): Promise<void>;
}

type DevelopmentAdminEnv = Record<string, string | undefined>;
type PasswordHasher = () => Promise<string>;

async function hashUnusablePassword(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString('base64url'), 12);
}

export async function ensureDevelopmentAdmin(
  store: DevelopmentAdminStore,
  env: DevelopmentAdminEnv = process.env,
  passwordHasher: PasswordHasher = hashUnusablePassword,
): Promise<number> {
  const user = getDevAuthUser(env);
  const matches = await store.findByIdOrEmail(user.userId, user.email);

  if (matches.length === 0) {
    await store.create(user, await passwordHasher());
    await store.realignIdentitySequence();
    return user.userId;
  }

  if (matches.length !== 1 || matches[0].id !== user.userId || matches[0].email !== user.email) {
    throw new Error(
      'Development admin configuration conflicts with persisted admins. Align DEV_USER_ID and DEV_USER_EMAIL before seeding.',
    );
  }

  await store.normalize(user);
  await store.realignIdentitySequence();
  return user.userId;
}
