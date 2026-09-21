import 'server-only';

import {
  findAssociateById,
  findDependentsByAssociateId,
  findHealthAgreementsByAssociateId,
  type AssociatesFilters,
  type DependentItem,
  type HealthAgreementItem,
} from '@/lib/associates/repository';
import { getAssociatesListPage } from '@/lib/associates/service';
import { decryptAssociatePii } from '@/lib/associates/pii-mapping';
import { logDataAccess } from '@/lib/audit/service';
import { searchActivities, searchAssociates as searchAssociatesGlobal } from '@/lib/search/queries';
import { canAccessRole } from '@/lib/auth/authorization';
import type { AuthRole } from '@/lib/auth/config';
import type { AssociateSearchMode } from '@/lib/associates/search-params';
import type { OperatorMcpPrincipal } from '../tokens';
import { toMcpAssociate } from '../pii';
import { mcpError, mcpRespond } from '../respond';

const SENSITIVE_ALLOWED_ROLES: readonly AuthRole[] = ['admin', 'diretoria', 'secretaria'];

export interface SearchAssociatesInput extends AssociatesFilters {
  q?: string;
  page?: number;
  offset?: number;
  limit?: number;
  searchBy?: AssociateSearchMode;
}

export async function searchAssociates(
  input: SearchAssociatesInput,
  principal: OperatorMcpPrincipal,
) {
  const limit = input.limit ?? 20;
  const offset =
    input.page !== undefined
      ? (input.page - 1) * limit
      : input.offset !== undefined
        ? Math.floor(input.offset / limit) * limit
        : 0;
  const page = Math.floor(offset / limit) + 1;
  const filters: AssociatesFilters = {
    contributionStatus: input.contributionStatus,
    functionalStatus: input.functionalStatus,
    associationStatus: input.associationStatus,
    location: input.location,
  };

  const { rows, total } = await getAssociatesListPage(
    page,
    limit,
    input.q,
    filters,
    input.searchBy,
  );

  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'associate',
    metadata: { channel: 'mcp', tool: 'officials_search' },
  });

  const items = rows.map((row) => toMcpAssociate(row, null, false));

  return mcpRespond({
    items,
    total,
    limit,
    offset,
    has_more: offset + items.length < total,
  });
}

export async function getAssociate(
  input: { id: number; includeSensitive?: boolean },
  principal: OperatorMcpPrincipal,
) {
  const row = await findAssociateById(input.id);
  if (!row) {
    return mcpError('Oficial não encontrado.', 'NOT_FOUND', 404);
  }

  const includeSensitive = input.includeSensitive ?? false;
  if (includeSensitive && !canAccessRole(principal.role, SENSITIVE_ALLOWED_ROLES)) {
    return mcpError('Papel não autorizado para visualizar dados sensíveis.', 'FORBIDDEN', 403);
  }

  const decrypted = includeSensitive ? decryptAssociatePii(row) : null;

  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'associate',
    entityId: input.id,
    metadata: { channel: 'mcp', tool: 'official_get', includeSensitive },
  });

  return mcpRespond(toMcpAssociate(row, decrypted, includeSensitive));
}

export async function globalSearch(
  input: { query: string; limit?: number },
  principal: OperatorMcpPrincipal,
) {
  const limit = input.limit ?? 5;
  // Busca global operacional: nome do oficial + título da atividade.
  // Deliberadamente NÃO aceita CPF/SIAPE — identificadores sensíveis não
  // participam do canal MCP global; use `officials_search` com searchBy
  // ou `official_get` por ID para consultas dirigidas.
  const [associates, activities] = await Promise.all([
    searchAssociatesGlobal(input.query, limit),
    searchActivities(input.query, limit),
  ]);

  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'associate',
    metadata: { channel: 'mcp', tool: 'global_search' },
  });
  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'activity',
    metadata: { channel: 'mcp', tool: 'global_search' },
  });

  return mcpRespond({ associates, activities });
}

async function requireAssociate(associateId: number) {
  const associate = await findAssociateById(associateId);
  return associate ? null : mcpError('Oficial não encontrado.', 'NOT_FOUND', 404);
}

export function toMcpDependent(dependent: DependentItem, associateId: number) {
  return {
    id: dependent.id,
    associateId,
    name: dependent.name,
    relationship: dependent.relationship,
  };
}

export function toMcpHealthAgreement(agreement: HealthAgreementItem, associateId: number) {
  return {
    id: agreement.id,
    associateId,
    provider: agreement.provider,
    startDate: agreement.startDate ?? null,
    endDate: agreement.endDate ?? null,
  };
}

export async function listAssociateDependents(
  input: { associateId: number },
  principal: OperatorMcpPrincipal,
) {
  const missing = await requireAssociate(input.associateId);
  if (missing) return missing;

  const rawItems = await findDependentsByAssociateId(input.associateId);
  const items = rawItems.map((item) => toMcpDependent(item, input.associateId));

  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'associate',
    entityId: input.associateId,
    metadata: {
      channel: 'mcp',
      tool: 'official_list_dependents',
      includeSensitive: false,
    },
  });
  return mcpRespond({ items });
}

export async function listAssociateHealthAgreements(
  input: { associateId: number; includeSensitive?: boolean },
  principal: OperatorMcpPrincipal,
) {
  const missing = await requireAssociate(input.associateId);
  if (missing) return missing;

  const includeSensitive = Boolean(input.includeSensitive);
  if (includeSensitive && !canAccessRole(principal.role, SENSITIVE_ALLOWED_ROLES)) {
    return mcpError('Papel não autorizado para visualizar dados sensíveis.', 'FORBIDDEN', 403);
  }

  const rawItems = await findHealthAgreementsByAssociateId(input.associateId);
  const items = includeSensitive
    ? rawItems.map((item) => toMcpHealthAgreement(item, input.associateId))
    : [];

  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'associate',
    entityId: input.associateId,
    metadata: {
      channel: 'mcp',
      tool: 'official_list_health_agreements',
      includeSensitive,
    },
  });
  return mcpRespond({ items });
}
