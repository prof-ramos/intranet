'use server';

import { z } from 'zod';
import { countAssociatesForReport } from '@/lib/reports/queries';
import { parseReportExportParams } from '@/lib/reports/export-filters';
import { defineServerAction } from '@/lib/server-actions/define-form-action';

const reportCountFiltersSchema = z.object({
  functionalStatus: z.string(),
  associationStatus: z.string(),
  contributionStatus: z.string(),
  missionType: z.string(),
  careerOrigin: z.string(),
  paymentMethod: z.string(),
  birthMonth: z.string(),
});

export const countReportAssociatesAction = defineServerAction({
  auth: ['admin', 'diretoria'],
  schema: reportCountFiltersSchema,
  service: async (input) => {
    const { filters } = parseReportExportParams(new URLSearchParams(input));
    const count = await countAssociatesForReport(filters);
    return { count };
  },
});
