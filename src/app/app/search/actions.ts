'use server';

import { defineServerAction } from '@/lib/server-actions/define-form-action';
import { searchAssociates, searchActivities } from '@/lib/search/queries';
import { z } from 'zod';

export interface GlobalSearchResults {
  associates: Array<{ id: number; title: string; subtitle: string | null; href: string }>;
  activities: Array<{ id: number; title: string; subtitle: string | null; href: string }>;
}

export const globalSearchAction = defineServerAction({
  auth: 'any',
  schema: z.string(),
  service: async (query: string) => {
    const trimmed = query.trim().slice(0, 80);
    if (trimmed.length < 2) return { associates: [], activities: [] } satisfies GlobalSearchResults;

    const [associates, activities] = await Promise.all([
      searchAssociates(trimmed),
      searchActivities(trimmed),
    ]);

    return { associates, activities };
  },
});
