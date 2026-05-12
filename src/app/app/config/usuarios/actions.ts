'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { admins, auditLogs } from '@/lib/db/schema';
import { randomBytes } from 'crypto';

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '@#$%&!';
  const digits = '0123456789';
  const bytes = randomBytes(20);
  const base = Array.from(bytes.slice(0, 14))
    .map((b) => chars[b % chars.length])
    .join('');
  const sym = symbols[bytes[14] % symbols.length];
  const dig = digits[bytes[15] % digits.length];
  const pos1 = bytes[16] % 8;
  const pos2 = 8 + (bytes[17] % 7);
  const end = base.slice(0, pos1) + sym + base.slice(pos1, pos2) + dig + base.slice(pos2);
  return end;
}

export async function resetUserPassword(
  _prevState: { success: boolean; message: string; tempPassword?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string; tempPassword?: string }> {
  const actor = await requireRole(['admin']);

  const targetIdRaw = formData.get('userId');
  const targetId = targetIdRaw ? Number(targetIdRaw) : NaN;

  if (!Number.isInteger(targetId) || targetId < 1) {
    return { success: false, message: 'Usuário inválido.' };
  }

  if (targetId === actor.userId) {
    return { success: false, message: 'Use a página de troca de senha para alterar sua própria senha.' };
  }

  const [target] = await db
    .select({ id: admins.id, name: admins.name, isActive: admins.isActive })
    .from(admins)
    .where(eq(admins.id, targetId))
    .limit(1);

  if (!target) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (!target.isActive) {
    return { success: false, message: 'Não é possível resetar a senha de um usuário inativo.' };
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

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

  return {
    success: true,
    message: `Senha de ${target.name} foi resetada com sucesso.`,
    tempPassword,
  };
}

export async function toggleUserActive(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin']);

  const targetIdRaw = formData.get('userId');
  const targetId = targetIdRaw ? Number(targetIdRaw) : NaN;

  if (!Number.isInteger(targetId) || targetId < 1) {
    return { success: false, message: 'Usuário inválido.' };
  }

  if (targetId === actor.userId) {
    return { success: false, message: 'Não é possível desativar sua própria conta.' };
  }

  const [target] = await db
    .select({ id: admins.id, name: admins.name, isActive: admins.isActive })
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