import 'server-only';

import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/server';
import type { AuthRole } from '@/lib/auth/config';
import type { OperatorMcpPrincipal } from '../tokens';
import {
  getAssociate,
  listAssociateDependents,
  listAssociateHealthAgreements,
  searchAssociates,
} from './associates';

const ALL_ROLES: readonly AuthRole[] = ['admin', 'diretoria', 'secretaria'];
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType<Record<string, unknown>>;
  annotations: typeof READ_ONLY_ANNOTATIONS;
  allowedRoles: readonly AuthRole[];
  execute: (
    input: Record<string, unknown>,
    principal: OperatorMcpPrincipal,
  ) => Promise<CallToolResult>;
}

const searchSchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    page: z.number().int().min(1).optional(),
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(50).default(20),
    searchBy: z.enum(['name', 'cpf', 'siape']).default('name'),
    contributionStatus: z.enum(['em_dia', 'inadimplente']).optional(),
    functionalStatus: z.enum(['ativo', 'aposentado', 'cedido', 'em_licenca']).optional(),
    associationStatus: z.enum(['associado', 'nao_associado']).optional(),
    location: z.enum(['brasil', 'exterior']).optional(),
  })
  .superRefine((input, context) => {
    if (input.offset !== undefined && input.offset % input.limit !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['offset'],
        message: 'offset deve ser múltiplo de limit.',
      });
    }
  });

const getSchema = z.object({
  id: z.number().int().positive(),
  include_sensitive: z.boolean().default(false),
});

const associateIdSchema = z.object({
  associateId: z.number().int().positive(),
});

const sensitiveAssociateIdSchema = associateIdSchema.extend({
  include_sensitive: z.literal(true),
});

export const CADASTRO_READ_TOOLS: readonly ToolDef[] = [
  {
    name: 'asof_search_associates',
    title: 'Buscar oficiais',
    description:
      'Busca e filtra o Cadastro de Oficiais. A listagem retorna apenas campos operacionais.',
    inputSchema: searchSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    allowedRoles: ALL_ROLES,
    execute: async (input, principal) => searchAssociates(searchSchema.parse(input), principal),
  },
  {
    name: 'asof_get_associate',
    title: 'Consultar oficial',
    description:
      'Consulta um oficial por ID. Dados pessoais sensíveis exigem include_sensitive=true.',
    inputSchema: getSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    allowedRoles: ALL_ROLES,
    execute: async (input, principal) => getAssociate(getSchema.parse(input), principal),
  },
  {
    name: 'asof_list_associate_dependents',
    title: 'Listar dependentes do oficial',
    description: 'Lista os dependentes cadastrados de um oficial.',
    inputSchema: associateIdSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    allowedRoles: ALL_ROLES,
    execute: async (input, principal) =>
      listAssociateDependents(associateIdSchema.parse(input), principal),
  },
  {
    name: 'asof_list_associate_health_agreements',
    title: 'Listar convênios de saúde do oficial',
    description:
      'Lista os convênios de saúde cadastrados de um oficial mediante include_sensitive=true.',
    inputSchema: sensitiveAssociateIdSchema,
    annotations: READ_ONLY_ANNOTATIONS,
    allowedRoles: ALL_ROLES,
    execute: async (input, principal) =>
      listAssociateHealthAgreements(sensitiveAssociateIdSchema.parse(input), principal),
  },
];

export function filterToolsForRole(definitions: readonly ToolDef[], role: AuthRole): ToolDef[] {
  return definitions.filter((tool) => tool.allowedRoles.includes(role));
}

export function toolsForRole(role: AuthRole): ToolDef[] {
  return filterToolsForRole(CADASTRO_READ_TOOLS, role);
}
