'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { admins, auditLogs } from '@/lib/db/schema';
import { randomBytes } from 'crypto';
import { ensureAdminPasswordAuthUser, generatePasswordResetLink } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email';
import { passwordResetEmailHtml, passwordResetEmailText } from '@/lib/email/templates';

const logger = createLogger('usuarios:actions');

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

function parseAdminId(formData: FormData): number {
  const raw = formData.get('userId')?.toString() ?? '';
  if (!/^\d+$/.test(raw)) {
    return Number.NaN;
  }
  return Number.parseInt(raw, 10);
}

export interface ResetUserPasswordResult {
  success: boolean;
  message: string;
  resetLink?: string;
  tempPassword?: string;
}

export async function resetUserPassword(
  _prevState: ResetUserPasswordResult | null,
  formData: FormData,
): Promise<ResetUserPasswordResult> {
  const actor = await requireRole(['admin']);

  const targetId = parseAdminId(formData);

  if (!Number.isInteger(targetId) || targetId < 1) {
    return { success: false, message: 'Usuário inválido.' };
  }

  if (targetId === actor.userId) {
    return { success: false, message: 'Use a página de troca de senha para alterar sua própria senha.' };
  }

  const [target] = await db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
    })
    .from(admins)
    .where(eq(admins.id, targetId))
    .limit(1);

  if (!target) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (!target.isActive) {
    return { success: false, message: 'Não é possível resetar a senha de um usuário inativo.' };
  }

  // CR#3: Generate the recovery link BEFORE invalidating the password.
  // If link generation fails, we abort without leaving the user locked out.
  let resetLink: string;
  try {
    resetLink = await generatePasswordResetLink(target.email);
  } catch (linkError) {
    logger.error(
      '[resetUserPassword] Failed to generate password reset link.',
      { targetId, error: toSafeErrorLog(linkError) },
      linkError instanceof Error ? linkError : undefined,
    );
    return {
      success: false,
      message: 'Falha ao gerar link de recuperação. A senha não foi alterada. Tente novamente.',
    };
  }

  // Now safe to invalidate: set a temporary password and mark must-change
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await ensureAdminPasswordAuthUser({
    email: target.email,
    password: tempPassword,
    name: target.name,
    role: target.role,
    mustChangePassword: true,
    resetPassword: true,
  });

  await db
    .update(admins)
    .set({
      passwordHash,
      mustChangePassword: true,
      updatedAt: sql`now()`,
    })
    .where(eq(admins.id, targetId));

  await db.insert(auditLogs).values({
    action: 'password_reset',
    entityType: 'admin',
    entityId: targetId,
    performedBy: actor.userId,
  });

  revalidatePath('/app/config/usuarios');

  let emailDelivered = false;
  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) {
    try {
      await sendEmail({
        to: target.email,
        toName: target.name,
        subject: 'Redefinição de senha — ASOF Intranet',
        htmlBody: passwordResetEmailHtml(target.name, resetLink),
        textBody: passwordResetEmailText(target.name, resetLink),
      });
      emailDelivered = true;
    } catch (emailError) {
      logger.error(
        '[resetUserPassword] Failed to deliver password reset email.',
        { targetId, error: toSafeErrorLog(emailError) },
        emailError instanceof Error ? emailError : undefined,
      );
      // Email delivery failure should not block the password reset
    }
  }

  return {
    success: true,
    message: emailDelivered
      ? `Senha resetada. Email de recuperação enviado para ${target.email}.`
      : `Senha resetada. Comunique o link de recuperação ao usuário por canal seguro.`,
    resetLink: emailDelivered ? undefined : resetLink,
  };
}

export async function toggleUserActive(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin']);

  const targetId = parseAdminId(formData);

  if (!Number.isInteger(targetId) || targetId < 1) {
    return { success: false, message: 'Usuário inválido.' };
  }

  if (targetId === actor.userId) {
    return { success: false, message: 'Não é possível desativar sua própria conta.' };
  }

  const [target] = await db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
    })
    .from(admins)
    .where(eq(admins.id, targetId))
    .limit(1);

  if (!target) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  const newState = !target.isActive;

  await db
    .update(admins)
    .set({ isActive: newState, updatedAt: sql`now()` })
    .where(eq(admins.id, targetId));

  await db.insert(auditLogs).values({
    action: newState ? 'account_activated' : 'account_deactivated',
    entityType: 'admin',
    entityId: targetId,
    performedBy: actor.userId,
  });

  revalidatePath('/app/config/usuarios');

  return {
    success: true,
    message: `Usuário ${target.name} foi ${newState ? 'ativado' : 'desativado'} com sucesso.`,
  };
}
