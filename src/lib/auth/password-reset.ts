import { createHash, randomBytes, randomInt } from 'node:crypto';
import { eq, and, gt, lt, isNull, ne, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { admins, passwordResetTokens, passwordResetAttempts, auditLogs } from '@/lib/db/schema';
import { hashEmail } from '@/lib/auth/login-rate-limit';
import { retryTransientConnection } from '@/lib/db/retry';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email';
import { passwordResetEmailHtml, passwordResetEmailText } from '@/lib/email/templates';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:password-reset');

const TOKEN_BYTES = 32;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const RESPONSE_TIME_FLOOR_MS = 800; // floor para mitigar timing attack — cobre latência típica do path ativo

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

async function checkRateLimit(email: string): Promise<boolean> {
  const emailHash = hashEmail(email);
  const now = Date.now();
  const expiresAt = new Date(now + RATE_LIMIT_WINDOW_MS);

  const rows = await retryTransientConnection(() =>
    db
      .insert(passwordResetAttempts)
      .values({
        emailHash,
        attempts: 1,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: passwordResetAttempts.emailHash,
        set: {
          attempts: sql`CASE
            WHEN ${passwordResetAttempts.expiresAt} <= ${new Date(now).toISOString()} THEN 1
            ELSE ${passwordResetAttempts.attempts} + 1
          END`,
          expiresAt: sql`CASE
            WHEN ${passwordResetAttempts.expiresAt} <= ${new Date(now).toISOString()} THEN ${expiresAt.toISOString()}
            ELSE ${passwordResetAttempts.expiresAt}
          END`,
          updatedAt: new Date(),
        },
      })
      .returning(),
  );

  return rows[0].attempts <= RATE_LIMIT_MAX_ATTEMPTS;
}

// ---------------------------------------------------------------------------
// requestPasswordReset — inicia o fluxo
// ---------------------------------------------------------------------------

export async function requestPasswordReset(email: string): Promise<void> {
  const startTime = Date.now();
  const normalizedEmail = email.trim().toLowerCase();

  // Best-effort cleanup de tokens expirados
  try {
    await retryTransientConnection(() =>
      db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date())),
    );
  } catch {
    // Falha silenciosa — não bloqueia o fluxo principal
  }

  // Rate limit por email (fail-closed: erro de DB ou infra nega o pedido)
  let allowed = false;
  try {
    allowed = await checkRateLimit(normalizedEmail);
  } catch (error) {
    logger.warn(
      '[requestPasswordReset] Rate-limit check failed; denying request (fail-closed).',
      { error: toSafeErrorLog(error) },
      ensureError(error),
    );
    allowed = false;
  }

  if (!allowed) {
    logger.warn('[requestPasswordReset] Rate limit exceeded or unavailable.', {
      emailHash: hashEmail(normalizedEmail),
    });
    // Timing-safe: não revelar se o e-mail existe nem se o limite falhou por erro
    const jitter = randomInt(50, 200);
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed + jitter);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return;
  }

  // Busca admin pelo email
  const [admin] = await retryTransientConnection(() =>
    db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        isActive: admins.isActive,
      })
      .from(admins)
      .where(eq(admins.email, normalizedEmail))
      .limit(1),
  );

  // Timing-safe: se admin não existe ou está inativo, espera o floor e retorna sem erro
  if (!admin || !admin.isActive) {
    const jitter = randomInt(50, 200);
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed + jitter);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return;
  }

  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY || !env.MAILJET_SENDER_VALIDATED) {
    logger.warn('[requestPasswordReset] Email not configured; keeping existing reset tokens.', {
      adminId: admin.id,
    });
    // Timing-safe: espera o floor para não distinguir deste path
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return;
  }

  // Gera token
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHashed = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  const [createdToken] = await retryTransientConnection(() =>
    db
      .insert(passwordResetTokens)
      .values({
        adminId: admin.id,
        tokenHash: tokenHashed,
        expiresAt,
      })
      .returning({ id: passwordResetTokens.id }),
  );

  if (!createdToken) {
    throw new Error('Failed to create password reset token.');
  }

  const baseUrl = env.ASOF_INTRANET_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendEmail({
      to: admin.email,
      toName: admin.name,
      subject: 'Redefinição de senha — ASOF Intranet',
      htmlBody: passwordResetEmailHtml(admin.name, resetLink),
      textBody: passwordResetEmailText(admin.name, resetLink),
    });
  } catch (emailError) {
    await retryTransientConnection(() =>
      db
        .delete(passwordResetTokens)
        .where(
          and(eq(passwordResetTokens.id, createdToken.id), isNull(passwordResetTokens.usedAt)),
        ),
    );

    logger.error(
      '[requestPasswordReset] Failed to deliver reset email.',
      { adminId: admin.id, error: toSafeErrorLog(emailError) },
      ensureError(emailError),
    );
    // Timing-safe: espera o floor para não distinguir deste path
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return;
  }

  await retryTransientConnection(() =>
    db.transaction(async (tx) => {
      await tx
        .delete(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.adminId, admin.id),
            isNull(passwordResetTokens.usedAt),
            ne(passwordResetTokens.id, createdToken.id),
          ),
        );

      await tx.insert(auditLogs).values({
        action: 'password_reset_requested',
        entityType: 'admin',
        entityId: admin.id,
      });
    }),
  );

  // Timing-safe: espera até completar o floor + jitter para manter consistência
  const jitter = randomInt(50, 200);
  const elapsed = Date.now() - startTime;
  const wait = Math.max(0, RESPONSE_TIME_FLOOR_MS - elapsed + jitter);
  await new Promise((resolve) => setTimeout(resolve, wait));
}

// ---------------------------------------------------------------------------
// validateResetToken — verifica se token é válido
// ---------------------------------------------------------------------------

export interface ValidateResetTokenResult {
  valid: boolean;
  adminId?: number;
}

export async function validateResetToken(token: string): Promise<ValidateResetTokenResult> {
  const tokenHashed = hashToken(token);

  const [record] = await retryTransientConnection(() =>
    db
      .select({
        id: passwordResetTokens.id,
        adminId: passwordResetTokens.adminId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHashed))
      .limit(1),
  );

  if (!record) {
    return { valid: false };
  }

  if (record.usedAt) {
    return { valid: false };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { valid: false };
  }

  return { valid: true, adminId: record.adminId };
}

// ---------------------------------------------------------------------------
// consumeResetToken — valida e aplica nova senha (transactional)
// ---------------------------------------------------------------------------

export async function consumeResetToken(token: string, newPassword: string): Promise<void> {
  const tokenHashed = hashToken(token);

  // Hash da nova senha (operação lenta — fora da transação)
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  // Escrita atômica: consome token antes de alterar a senha.
  await retryTransientConnection(() =>
    db.transaction(async (tx) => {
      const [record] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHashed),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({
          id: passwordResetTokens.id,
          adminId: passwordResetTokens.adminId,
        });

      if (!record) {
        throw new InvalidResetTokenError();
      }

      await tx
        .update(admins)
        .set({
          passwordHash,
          mustChangePassword: false,
          sessionVersion: sql`${admins.sessionVersion} + 1`,
          updatedAt: sql`now()`,
        })
        .where(eq(admins.id, record.adminId));

      await tx
        .delete(passwordResetTokens)
        .where(
          and(eq(passwordResetTokens.adminId, record.adminId), isNull(passwordResetTokens.usedAt)),
        );

      await tx.insert(auditLogs).values({
        action: 'password_reset_completed',
        entityType: 'admin',
        entityId: record.adminId,
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InvalidResetTokenError extends Error {
  constructor() {
    super('Token de redefinição inválido ou expirado.');
    this.name = 'InvalidResetTokenError';
  }
}

// ---------------------------------------------------------------------------
// ensureError — compat helper
// ---------------------------------------------------------------------------

function ensureError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}
