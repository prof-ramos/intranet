'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { randomBytes } from 'crypto';

function generateTemporaryPassword(): string {
  // Gera senha temporária segura: 16 chars com letras, números e símbolo
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '@#$%&!';
  const bytes = randomBytes(14);
  let password = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
  // Garante pelo menos um símbolo e um número para passar validateNewPassword
  password = password.slice(0, 13) + symbols[randomBytes(1)[0] % symbols.length] + '7';
  return password;
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
    .select({ id: admins.id, name: admins.name, email: admins.email, isActive: admins.isActive })
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

  return {
    success: true,
    message: `Senha de ${target.name} (${target.email}) foi resetada com sucesso.`,
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

  return {
    success: true,
    message: `Usuário ${target.name} foi ${newState ? 'ativado' : 'desativado'} com sucesso.`,
  };
}
