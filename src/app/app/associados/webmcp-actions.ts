'use server';

import { z } from 'zod';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import { getAssociateProfile, getAssociatesListPage } from '@/lib/associates/service';
import {
  associateSearchHelp,
  isAssociateSearchReady,
  type AssociateSearchMode,
} from '@/lib/associates/search-params';
import { associateSearchParamsSchema } from '@/lib/validation/schemas';
import { serializeOfficialProfile } from '@/lib/webmcp/serialize';

const SEARCH_PAGE_SIZE = 20;

const searchOfficialsSchema = associateSearchParamsSchema.extend({
  q: z.string().optional().default(''),
});

export const searchOfficialsAction = defineServerAction({
  auth: 'any',
  schema: searchOfficialsSchema,
  service: async (input) => {
    const q = input.q.trim();
    const searchBy: AssociateSearchMode = input.searchBy ?? 'name';
    const filters = {
      contributionStatus: input.contributionStatus,
      functionalStatus: input.functionalStatus,
      associationStatus: input.associationStatus,
      location: input.location,
    };
    const hasSearch = isAssociateSearchReady(q, searchBy);
    const hasFilters = Object.values(filters).some(Boolean);

    if (!hasSearch && !hasFilters) {
      return {
        rows: [],
        total: 0,
        page: input.page,
        message: q
          ? associateSearchHelp(searchBy)
          : 'Informe um termo de busca (mínimo 2 caracteres) ou um filtro (vínculo, situação funcional, contribuição ou localização).',
      };
    }

    const { rows, total } = await getAssociatesListPage(
      input.page,
      SEARCH_PAGE_SIZE,
      hasSearch ? q : undefined,
      filters,
      searchBy,
    );

    return {
      rows: rows.map((row) => ({
        ...row,
        href: `/app/associados/${row.id}`,
      })),
      total,
      page: input.page,
      pageSize: SEARCH_PAGE_SIZE,
      searchedBy: searchBy,
    };
  },
});

export const getOfficialProfileAction = defineServerAction({
  auth: 'any',
  schema: z.object({
    id: z.number().int().positive('ID do oficial inválido.'),
  }),
  service: async ({ id }, user) => {
    const profile = await getAssociateProfile(id, user.role);
    if (!profile) {
      return { found: false, id };
    }
    return { found: true, official: serializeOfficialProfile(profile) };
  },
});
