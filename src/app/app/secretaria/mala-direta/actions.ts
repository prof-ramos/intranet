'use server';

import { z } from 'zod';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import { countMalaDiretaAudience, type MalaDiretaFilters } from '@/lib/mala-direta';

const filtersSchema = z
  .object({
    associationStatus: z.enum(['associado', 'nao_associado', 'todos']).optional(),
    functionalStatus: z.enum(['ativo', 'aposentado', 'cedido', 'em_licenca', 'todos']).optional(),
    location: z.enum(['brasil', 'exterior', 'todos']).optional(),
  })
  .strict();

function toServiceFilters(input: z.infer<typeof filtersSchema>): MalaDiretaFilters {
  const filters: MalaDiretaFilters = {};

  if (!input.associationStatus) {
    filters.associationStatus = 'associado';
  } else if (input.associationStatus !== 'todos') {
    filters.associationStatus = input.associationStatus;
  }

  if (input.functionalStatus && input.functionalStatus !== 'todos') {
    filters.functionalStatus = input.functionalStatus;
  }

  if (input.location && input.location !== 'todos') {
    filters.location = input.location;
  }

  return filters;
}

export const countMalaDiretaAudienceAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: filtersSchema,
  service: async (input) => {
    const count = await countMalaDiretaAudience(toServiceFilters(input));
    return { count };
  },
});
