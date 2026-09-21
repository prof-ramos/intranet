'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  defineNoInputServerAction,
  defineServerAction,
} from '@/lib/server-actions/define-form-action';
import {
  createOperatorMcpToken,
  listOperatorMcpTokens,
  revokeOperatorMcpToken,
  rotateOperatorMcpToken,
} from '@/lib/mcp/tokens';

const MCP_PATH = '/app/config/integracoes/mcp';

const _createMcpTokenAction = defineServerAction({
  auth: ['admin'],
  schema: z.object({
    name: z.string(),
    lgpdAcknowledged: z.boolean(),
  }),
  service: async (input, actor) => {
    const name = input.name.trim();
    if (name.length < 2) {
      return { error: 'O nome deve ter pelo menos 2 caracteres.' };
    }
    if (!input.lgpdAcknowledged) {
      return { error: 'Confirme a ciência sobre o tratamento de dados via MCP.' };
    }

    const result = await createOperatorMcpToken({
      adminId: actor.userId,
      name,
      lgpdAcknowledged: true,
    });
    revalidatePath(MCP_PATH);
    return { data: result };
  },
});

export async function createMcpTokenAction(name: string, lgpdAcknowledged: boolean) {
  return _createMcpTokenAction({ name, lgpdAcknowledged });
}

export const listMcpTokensAction = defineNoInputServerAction({
  auth: ['admin'],
  service: async (actor) => {
    const data = await listOperatorMcpTokens({ adminId: actor.userId, includeAll: true });
    return { data };
  },
});

export const revokeMcpTokenAction = defineServerAction({
  auth: ['admin'],
  schema: z.number().int().positive('Token inválido.'),
  service: async (id, actor) => {
    const revoked = await revokeOperatorMcpToken({ id, actorId: actor.userId });
    if (!revoked) {
      return { error: 'Token não encontrado ou já revogado.' };
    }
    revalidatePath(MCP_PATH);
    return { data: { id } };
  },
});

export const rotateMcpTokenAction = defineServerAction({
  auth: ['admin'],
  schema: z.number().int().positive('Token inválido.'),
  service: async (id, actor) => {
    const result = await rotateOperatorMcpToken({ id, actorId: actor.userId });
    if (!result) {
      return { error: 'Token não encontrado ou já revogado.' };
    }
    revalidatePath(MCP_PATH);
    return { data: result };
  },
});
