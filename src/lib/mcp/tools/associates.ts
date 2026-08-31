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
    metadata: { channel: 'mcp', tool: 'asof_search_associates' },
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
  input: { id: number; include_sensitive?: boolean },
  principal: OperatorMcpPrincipal,
) {
  const row = await findAssociateById(input.id);
  if (!row) {
    return mcpError('Oficial não encontrado.', 'NOT_FOUND', 404);
  }

  const includeSensitive = input.include_sensitive ?? false;
  if (includeSensitive && !canAccessRole(principal.role, SENSITIVE_ALLOWED_ROLES)) {
    return mcpError('Papel não autorizado para visualizar dados sensíveis.', 'FORBIDDEN', 403);
  }

  const decrypted = includeSensitive ? decryptAssociatePii(row) : null;

  await logDataAccess({
    adminId: principal.userId,
    action: 'view',
    entityType: 'associate',
    entityId: input.id,
    metadata: { channel: 'mcp', tool: 'asof_get_associate', includeSensitive },
  });

  return mcpRespond(toMcpAssociate(row, decrypted, includeSensitive));
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
      tool: 'asof_list_associate_dependents',
      includeSensitive: false,
    },
  });
  return mcpRespond({ items });
}

export async function listAssociateHealthAgreements(
  input: { associateId: number; include_sensitive?: boolean },
  principal: OperatorMcpPrincipal,
) {
  const missing = await requireAssociate(input.associateId);
  if (missing) return missing;

  const includeSensitive = Boolean(input.include_sensitive);
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
      tool: 'asof_list_associate_health_agreements',
      includeSensitive,
    },
  });
  return mcpRespond({ items });
}
