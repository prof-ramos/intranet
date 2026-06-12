'use server';

import { db } from '@/lib/db';
import { activities, admins } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { defineNoInputServerAction } from '@/lib/server-actions/define-form-action';
import { createNotification } from '@/lib/notifications/repository';

async function getAdminRecipientIds() {
  const rows = await db
    .select({ id: admins.id })
    .from(admins)
    .where(inArray(admins.role, ['admin', 'secretaria']));
  return rows.map((r) => r.id);
}

async function notifyAdmins(actorId: number, activityId: number, title: string, message: string) {
  const recipientIds = await getAdminRecipientIds();
  await Promise.allSettled(
    recipientIds
      .filter((id) => id !== actorId)
      .map((recipientId) =>
        createNotification({
          userId: recipientId,
          actorId,
          type: 'lgpd_request',
          title,
          message,
          href: '/app/atividades',
          entityType: 'activity',
          entityId: activityId,
          metadata: null,
          dedupeKey: `lgpd_request:${activityId}:${recipientId}`,
        }),
      ),
  );
}

export const requestDataDownload = defineNoInputServerAction({
  auth: 'any',
  service: async (session) => {
    const [activity] = await db
      .insert(activities)
      .values({
        title: 'Requisição LGPD: Baixar Dados',
        description:
          'Solicitação de cópia de dados (Direito de Acesso/Portabilidade). Compile os relatórios disponíveis e envie de forma segura.',
        status: 'a_fazer',
        priority: 'alta',
        createdBy: session.userId,
        tags: ['LGPD', 'Acesso'],
      })
      .returning({ id: activities.id });

    await notifyAdmins(
      session.userId,
      activity.id,
      'Requisição LGPD: Acesso a dados',
      'Um usuário solicitou cópia dos seus dados. Acesse Atividades para processar a requisição.',
    );

    revalidatePath('/app/privacidade');
  },
});

export const requestAccountDeletion = defineNoInputServerAction({
  auth: 'any',
  service: async (session) => {
    const [activity] = await db
      .insert(activities)
      .values({
        title: 'Solicitação de Exclusão - Direito ao Esquecimento',
        description:
          'Solicitação de EXCLUSÃO / ANONIMIZAÇÃO de conta (Direito ao Esquecimento). Revise pendências financeiras e jurídicas de acordo com o Art. 14 do Estatuto da ASOF antes de aprovar ou recusar o pedido.',
        status: 'a_fazer',
        priority: 'urgente',
        createdBy: session.userId,
        tags: ['LGPD', 'Exclusão'],
      })
      .returning({ id: activities.id });

    await notifyAdmins(
      session.userId,
      activity.id,
      'Requisição LGPD: Exclusão de conta',
      'Um usuário solicitou exclusão/anonimização da sua conta. Acesse Atividades para processar a requisição.',
    );

    revalidatePath('/app/privacidade');
  },
});
