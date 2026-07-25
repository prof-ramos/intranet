import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { admins, auditLogs } from '@/lib/db/schema';
import { retryTransientConnection } from '@/lib/db/retry';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email';
import { temporaryPasswordEmailHtml, temporaryPasswordEmailText } from '@/lib/email/templates';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:service');

const DUMMY_HASH = '$2a$10$22V5F5Xg8N.0P5A/pZ7H/ee7o0T.3VvJ1Qz80J8w3Z1V2y0R.uw4S';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AdminNotFoundError extends AuthError {
  constructor() {
    super('Admin não encontrado.');
    this.name = 'AdminNotFoundError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('Credenciais inválidas.');
    this.name = 'InvalidCredentialsError';
  }
}

export class InactiveAdminError extends AuthError {
  constructor() {
    super('Conta desativada.');
    this.name = 'InactiveAdminError';
  }
}

export class InvalidCurrentPasswordError extends AuthError {
  constructor() {
    super('Senha atual inválida.');
    this.name = 'InvalidCurrentPasswordError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '@#$%&!';
  const digits = '0123456789';
  const bytes = randomBytes(10);
  const base = Array.from(bytes.slice(0, 6))
    .map((b) => chars[b % chars.length])
    .join('');
  const sym = symbols[bytes[6] % symbols.length];
  const dig = digits[bytes[7] % digits.length];
  const pos1 = bytes[8] % 8;
  const pos2 = 8 + (bytes[9] % 8);
  return base.slice(0, pos1) + sym + base.slice(pos1, pos2) + dig + base.slice(pos2);
}

// ---------------------------------------------------------------------------
// authenticate — login flow
// ---------------------------------------------------------------------------

export async function authenticate(
  email: string,
  password: string,
): Promise<{
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  isActive: boolean;
  mustChangePassword: boolean;
}> {
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

  const passwordMatches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !user.isActive || !passwordMatches) {
    throw new InvalidCredentialsError();
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

// ---------------------------------------------------------------------------
// changePassword — self-service password rotation
// ---------------------------------------------------------------------------

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [admin] = await retryTransientConnection(() =>
    db
      .select({ id: admins.id, passwordHash: admins.passwordHash })
      .from(admins)
      .where(eq(admins.id, userId))
      .limit(1),
  );

  if (!admin) {
    throw new AdminNotFoundError();
  }

  const currentPasswordMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!currentPasswordMatches) {
    throw new InvalidCurrentPasswordError();
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await retryTransientConnection(() =>
    db
      .update(admins)
      .set({
        passwordHash,
        mustChangePassword: false,
        sessionVersion: sql`${admins.sessionVersion} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(admins.id, userId)),
  );
}

// ---------------------------------------------------------------------------
// resetPassword — admin-initiated password reset with email delivery
// ---------------------------------------------------------------------------

export interface ResetPasswordResult {
  tempPassword: string;
  emailDelivered: boolean;
}

// ---------------------------------------------------------------------------
// toggleAdminActive — admin-initiated activation/deactivation
// ---------------------------------------------------------------------------

export interface ToggleAdminActiveResult {
  name: string;
  isActive: boolean;
}

export async function toggleAdminActive(
  targetId: number,
  actorId: number,
): Promise<ToggleAdminActiveResult> {
  const [target] = await retryTransientConnection(() =>
    db
      .select({ id: admins.id, name: admins.name, isActive: admins.isActive })
      .from(admins)
      .where(eq(admins.id, targetId))
      .limit(1),
  );

  if (!target) {
    throw new AdminNotFoundError();
  }

  const newState = !target.isActive;

  await db.transaction(async (tx) => {
    await tx
      .update(admins)
      .set({ isActive: newState, updatedAt: sql`now()` })
      .where(eq(admins.id, targetId));

    await tx.insert(auditLogs).values({
      action: newState ? 'account_activated' : 'account_deactivated',
      entityType: 'admin',
      entityId: targetId,
      performedBy: actorId,
    });
  });

  return { name: target.name, isActive: newState };
}

export async function resetPassword(
  targetId: number,
  actorId: number,
): Promise<ResetPasswordResult> {
  const [target] = await retryTransientConnection(() =>
    db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
        isActive: admins.isActive,
      })
      .from(admins)
      .where(eq(admins.id, targetId))
      .limit(1),
  );

  if (!target) {
    throw new AdminNotFoundError();
  }

  if (!target.isActive) {
    throw new InactiveAdminError();
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db.transaction(async (tx) => {
    await tx
      .update(admins)
      .set({
        passwordHash,
        mustChangePassword: true,
        sessionVersion: sql`${admins.sessionVersion} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(admins.id, targetId));

    await tx.insert(auditLogs).values({
      action: 'password_reset',
      entityType: 'admin',
      entityId: targetId,
      performedBy: actorId,
    });
  });

  let emailDelivered = false;
  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY && env.MAILJET_SENDER_VALIDATED) {
    try {
      await sendEmail({
        to: target.email,
        toName: target.name,
        subject: 'Redefinição de senha — ASOF Intranet',
        htmlBody: temporaryPasswordEmailHtml(target.name, tempPassword),
        textBody: temporaryPasswordEmailText(target.name, tempPassword),
      });
      emailDelivered = true;
    } catch (emailError) {
      logger.error('[resetPassword] Failed to deliver password reset email.', {
        targetId,
        error: toSafeErrorLog(emailError),
      });
    }
  }

  return { tempPassword, emailDelivered };
}
