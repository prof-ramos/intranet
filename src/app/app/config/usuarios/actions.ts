'use server';

import { revalidatePath } from 'next/cache';
import { defineFormStateAction } from '@/lib/server-actions/define-form-action';
import {
  resetPassword,
  AdminNotFoundError,
  InactiveAdminError,
} from '@/lib/auth/service';
import { db } from '@/lib/db';
import { admins, auditLogs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const adminIdSchema = z.object({ userId: z.string().default('') });

function parseAdminId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    return Number.NaN;
  }
  return Number.parseInt(raw, 10);
}

export interface ResetUserPasswordResult {
  success: boolean;
  message: string;
  tempPassword?: string;
}

export const resetUserPassword = defineFormStateAction({
  auth: ['admin'],
  schema: adminIdSchema,
  service: async (data, actor): Promise<ResetUserPasswordResult> => {
    const targetId = parseAdminId(data.userId);

    if (!Number.isInteger(targetId) || targetId < 1) {
      return { success: false, message: 'Usuário inválido.' };
    }

    if (targetId === actor.userId) {
      return {
        success: false,
        message: 'Use a página de troca de senha para alterar sua própria senha.',
      };
    }

    try {
      const result = await resetPassword(targetId, actor.userId);

      revalidatePath('/app/config/usuarios');

      return {
        success: true,
        message: result.emailDelivered
          ? 'Senha temporária gerada e enviada ao usuário.'
          : 'Senha temporária gerada. Comunique-a ao usuário por canal seguro.',
        tempPassword: result.emailDelivered ? undefined : result.tempPassword,
      };
    } catch (error) {
      if (error instanceof AdminNotFoundError) {
        return { success: false, message: 'Usuário não encontrado.' };
      }
      if (error instanceof InactiveAdminError) {
        return { success: false, message: 'Não é possível resetar a senha de um usuário inativo.' };
      }
      throw error;
    }
  },
  onError: (error): ResetUserPasswordResult => ({
    success: false,
    message: error instanceof Error ? error.message : 'Falha ao resetar senha.',
  }),
});

export const toggleUserActive = defineFormStateAction({
  auth: ['admin'],
  schema: adminIdSchema,
  service: async (data, actor): Promise<ResetUserPasswordResult> => {
    const targetId = parseAdminId(data.userId);

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
  },
  onError: (error): ResetUserPasswordResult => ({
    success: false,
    message: error instanceof Error ? error.message : 'Falha ao alterar status do usuário.',
  }),
});
