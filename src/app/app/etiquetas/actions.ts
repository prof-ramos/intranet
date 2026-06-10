'use server';

import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { LabelItem } from '@/lib/labels/types';

export async function fetchAssociatesForLabels(query?: string): Promise<LabelItem[]> {
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);
  if (!user) {
    throw new Error('Unauthorized');
  }

  const conditions = [eq(associates.associationStatus, 'ativo')];
  if (query) {
    conditions.push(ilike(associates.fullName, `%${query}%`));
  }

  const results = await db
    .select({
      id: associates.id,
      fullName: associates.fullName,
      address: associates.address,
      locationCity: associates.locationCity,
      assignment: associates.assignment,
      classPattern: associates.classPattern,
    })
    .from(associates)
    .where(and(...conditions))
    .limit(500);

  return results.map(row => {
    return {
      id: String(row.id),
      name: row.fullName,
      line1: row.assignment || '',
      line2: row.classPattern || '',
      line3: row.locationCity ? `Cidade: ${row.locationCity}` : '',
    };
  });
}
