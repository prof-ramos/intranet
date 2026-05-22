import { and, eq, lte, like, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, admins, associates } from '@/lib/db/schema';

export async function checkAndEmitLgpdRetentionActivities({ limit }: { limit: number }) {
  // Encontrar o primeiro admin ativo para ser o "createdBy" das atividades geradas pelo sistema
  const [systemAdmin] = await db
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
  const expiredAssociates = await db
    .select({
      id: associates.id,
      fullName: associates.fullName,
    })
    .from(associates)
    .leftJoin(
      activities,
      and(
        eq(activities.associateId, associates.id),
        eq(activities.status, 'a_fazer'),
        like(activities.title, titlePrefix + '%')
      )
    )
    .where(
      and(
        eq(associates.associationStatus, 'inativo'),
        lte(associates.updatedAt, fiveYearsAgo),
        isNull(activities.id) // Não ter atividade pendente
      )
    )
    .limit(limit);

  if (expiredAssociates.length === 0) {
    return { createdCount: 0 };
  }

  // Cria as atividades
  const newActivities = expiredAssociates.map((associate) => ({
    title: `${titlePrefix}${associate.fullName}`,
    description: `Atenção: O prazo de guarda (5 anos de inatividade) do associado ${associate.fullName} expirou. Aprovar anonimização? Por favor, revise de acordo com o Estatuto da ASOF.`,
    status: 'a_fazer' as const,
    priority: 'alta' as const,
    associateId: associate.id,
    createdBy: systemAdmin.id,
    tags: ['LGPD', 'Retenção'],
  }));

  const inserted = await db.insert(activities).values(newActivities).returning({ id: activities.id });

  return { createdCount: inserted.length };
}
