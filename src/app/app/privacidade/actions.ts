'use server';

import { revalidatePath } from 'next/cache';
import { defineNoInputServerAction } from '@/lib/server-actions/define-form-action';
import { createNotification } from '@/lib/notifications/repository';
import { createActivityService } from '@/lib/activities/service';
import { findAdminRecipientIds } from '@/lib/auth/service';

async function notifyAdmins(actorId: number, activityId: number, title: string, message: string) {
  const recipientIds = await findAdminRecipientIds(['admin', 'secretaria']);
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
    const activity = await createActivityService({
      title: 'Requisição LGPD: Baixar Dados',
      description:
        'Solicitação de cópia de dados (Direito de Acesso/Portabilidade). Compile os relatórios disponíveis e envie de forma segura.',
      status: 'a_fazer',
      priority: 'alta',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: ['LGPD', 'Acesso'],
      createdBy: session.userId,
    });

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
    const activity = await createActivityService({
      title: 'Solicitação de Exclusão - Direito ao Esquecimento',
      description:
        'Solicitação de EXCLUSÃO / ANONIMIZAÇÃO de conta (Direito ao Esquecimento). Revise pendências financeiras e jurídicas de acordo com o Art. 14 do Estatuto da ASOF antes de aprovar ou recusar o pedido.',
      status: 'a_fazer',
      priority: 'urgente',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: ['LGPD', 'Exclusao'],
      createdBy: session.userId,
    });

    await notifyAdmins(
      session.userId,
      activity.id,
      'Requisição LGPD: Exclusão de conta',
      'Um usuário solicitou exclusão/anonimização da sua conta. Acesse Atividades para processar a requisição.',
    );

    revalidatePath('/app/privacidade');
  },
});
