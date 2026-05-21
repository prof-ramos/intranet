'use server';

import { requireAuth } from '@/lib/auth/require-auth';
import { searchAssociates, searchActivities } from '@/lib/search/queries';

export interface GlobalSearchResults {
  associates: Array<{ id: number; title: string; subtitle: string | null; href: string }>;
  activities: Array<{ id: number; title: string; subtitle: string | null; href: string }>;
}

export async function globalSearchAction(query: string): Promise<GlobalSearchResults> {
  await requireAuth();

  const trimmed = query.trim().slice(0, 80);
  if (trimmed.length < 2) return { associates: [], activities: [] };

  const [associates, activities] = await Promise.all([
    searchAssociates(trimmed),
    searchActivities(trimmed),
  ]);

  return { associates, activities };
}
