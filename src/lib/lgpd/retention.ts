import { and, eq, lte, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, admins, associates } from '@/lib/db/schema';

const MAX_RETENTION_QUERY_LIMIT = 100;

export async function checkAndEmitLgpdRetentionActivities({ limit }: { limit: number }) {
  const validatedLimit = Math.min(Math.max(Math.floor(limit), 1), MAX_RETENTION_QUERY_LIMIT);

  return db.transaction(async (tx) => {
    // Encontrar o primeiro admin ativo para ser o "createdBy" das atividades geradas pelo sistema
    const [systemAdmin] = await tx
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.isActive, true))
      .orderBy(admins.id)
      .limit(1);

    if (!systemAdmin) {
      throw new Error('No active admin found to create LGPD activities');
    }

    // Define a data limite: 5 anos atrás
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const titlePrefix = 'Revisar Retenção LGPD (Prazo Expirado) - ';

    // Busca associados inativos há mais de 5 anos
    // e que ainda NÃO possuem uma atividade de retenção pendente
    const expiredAssociates = await tx
      .select({ id: associates.id })
      .from(associates)
      .where(
        and(
          eq(associates.associationStatus, 'inativo'),
          lte(associates.updatedAt, fiveYearsAgo),
          sql`NOT EXISTS (
            SELECT 1 FROM ${activities}
            WHERE ${activities.associateId} = ${associates.id}
            AND ${activities.status} = 'a_fazer'
            AND ${activities.title} LIKE ${titlePrefix + '%'}
          )`
        )
      )
      .limit(validatedLimit);

    if (expiredAssociates.length === 0) {
      return { createdCount: 0 };
    }

    // Cria as atividades
    const newActivities = expiredAssociates.map((associate) => ({
      title: `${titlePrefix}Associado ID ${associate.id}`,
      description: `Prazo de guarda (5 anos de inatividade) do associado ID ${associate.id} expirou. Aprovar anonimização? Revise de acordo com o Estatuto da ASOF.`,
      status: 'a_fazer' as const,
      priority: 'alta' as const,
      associateId: associate.id,
      createdBy: systemAdmin.id,
      tags: ['LGPD', 'Retenção'],
    }));

    const inserted = await tx.insert(activities).values(newActivities).returning({ id: activities.id });

    return { createdCount: inserted.length };
  });
}
