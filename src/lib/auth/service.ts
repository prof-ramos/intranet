import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { retryTransientConnection } from '@/lib/db/retry';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  isActive: boolean;
  mustChangePassword: boolean;
}

const DUMMY_HASH = '$2a$10$22V5F5Xg8N.0P5A/pZ7H/ee7o0T.3VvJ1Qz80J8w3Z1V2y0R.uw4S';

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await retryTransientConnection(() =>
    db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        passwordHash: admins.passwordHash,
        role: admins.role,
        isActive: admins.isActive,
        mustChangePassword: admins.mustChangePassword,
      })
      .from(admins)
      .where(eq(admins.email, normalizedEmail))
      .limit(1),
  );

  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.passwordHash : DUMMY_HASH,
  );

  if (!user || !user.isActive || !passwordMatches) {
    throw new Error('Credenciais inválidas.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}
