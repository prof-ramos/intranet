'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import {
  createOperatorMcpToken,
  listOperatorMcpTokens,
  revokeOperatorMcpToken,
} from '@/lib/mcp/tokens';
import {
  defineNoInputServerAction,
  defineServerAction,
} from '@/lib/server-actions/define-form-action';

const logger = createLogger('mcp-tokens');
const operatorRoles = ['admin', 'diretoria', 'secretaria'] as const;

export const createOperatorMcpTokenAction = defineServerAction({
  auth: operatorRoles,
  schema: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres.')
      .max(80, 'O nome deve ter no máximo 80 caracteres.'),
    lgpdAcknowledged: z
      .boolean()
      .refine((acknowledged) => acknowledged, 'É necessário confirmar a ciência sobre a LGPD.'),
  }),
  service: async (input, actor) => {
    try {
      const data = await createOperatorMcpToken({
        adminId: actor.userId,
        name: input.name,
        lgpdAcknowledged: true,
      });
      revalidatePath('/app/config/mcp');
      return { data };
    } catch (error) {
      logger.error('Erro ao criar token MCP.', { userId: actor.userId }, error as Error);
      return { error: 'Não foi possível criar o token MCP.' };
    }
  },
});

export const listOperatorMcpTokensAction = defineNoInputServerAction({
  auth: operatorRoles,
  service: async (actor) => {
    try {
      const data = await listOperatorMcpTokens({
        adminId: actor.userId,
        includeAll: actor.role === 'admin',
      });
      return { data };
    } catch (error) {
      logger.error('Erro ao listar tokens MCP.', { userId: actor.userId }, error as Error);
      return { error: 'Não foi possível listar os tokens MCP.' };
    }
  },
});

export const revokeOperatorMcpTokenAction = defineServerAction({
  auth: operatorRoles,
  schema: z.number().int().positive('Token MCP inválido.'),
  service: async (id, actor) => {
    try {
      const revoked = await revokeOperatorMcpToken({
        id,
        actorId: actor.userId,
        actorRole: actor.role,
      });
      if (!revoked) {
        return { error: 'Token MCP não encontrado ou já revogado.' };
      }
      revalidatePath('/app/config/mcp');
      return { data: { id } };
    } catch (error) {
      logger.error(
        'Erro ao revogar token MCP.',
        { userId: actor.userId, tokenId: id },
        error as Error,
      );
      return { error: 'Não foi possível revogar o token MCP.' };
    }
  },
});
