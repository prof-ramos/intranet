'use server';

import { revalidatePath } from 'next/cache';
import { defineNoInputServerAction } from '@/lib/server-actions/define-form-action';
import { createNotification } from '@/lib/notifications/repository';
import { createActivityService } from '@/lib/activities/service';
import { findAdminRecipientIds } from '@/lib/auth/service';
import { consumeIpRateLimit } from '@/lib/rate-limit';

const LGPD_REQUEST_RATE_LIMIT = { windowMs: 24 * 60 * 60_000, maxRequests: 2 };

async function assertAccountRequestBudget(userId: number, action: string): Promise<void> {
  const result = await consumeIpRateLimit(`account:${userId}`, action, LGPD_REQUEST_RATE_LIMIT);
  if (!result.allowed) {
    throw new Error('Muitas requisições. Aguarde um momento.');
  }
}

async function notifyAdmins(
  actorId: number,
  activityId: number,
  requestType: 'data_download' | 'account_deletion',
  title: string,
  message: string,
) {
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
          dedupeKey: `lgpd_request:${actorId}:${requestType}:${recipientId}`,
        }),
      ),
  );
}

export const requestDataDownload = defineNoInputServerAction({
  auth: 'any',
  rateLimit: { key: 'lgpd_data_download', ...LGPD_REQUEST_RATE_LIMIT },
  service: async (session) => {
    await assertAccountRequestBudget(session.userId, 'lgpd_data_download');
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
      'data_download',
      'Requisição LGPD: Acesso a dados',
      'Um usuário solicitou cópia dos seus dados. Acesse Atividades para processar a requisição.',
    );

    revalidatePath('/app/privacidade');
  },
});

export const requestAccountDeletion = defineNoInputServerAction({
  auth: 'any',
  rateLimit: { key: 'lgpd_account_deletion', ...LGPD_REQUEST_RATE_LIMIT },
  service: async (session) => {
    await assertAccountRequestBudget(session.userId, 'lgpd_account_deletion');
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
      'account_deletion',
      'Requisição LGPD: Exclusão de conta',
      'Um usuário solicitou exclusão/anonimização da sua conta. Acesse Atividades para processar a requisição.',
    );

    revalidatePath('/app/privacidade');
  },
});
