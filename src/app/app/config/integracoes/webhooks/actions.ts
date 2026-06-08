'use server';

import { revalidatePath } from 'next/cache';
import { defineFormStateAction } from '@/lib/server-actions/define-form-action';
import { ZodError } from 'zod';
import { webhookSecretSchema, webhookSubscriptionFormSchema } from '@/lib/validation/schemas';
import {
  createManagedWebhookSubscription,
  rotateManagedWebhookSubscriptionSecret,
  setManagedWebhookSubscriptionActive,
  updateManagedWebhookSubscription,
  validateWebhookSubscriptionEvents,
} from '@/lib/integrations/webhooks/subscriptions';

function zodMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function parseId(formData: Record<string, unknown>) {
  const raw = (formData.id as string) ?? '';
  const id = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Webhook subscription inválida.');
  }
  return id;
}

function parseSubscriptionForm(formData: Record<string, unknown>) {
  const parsed = webhookSubscriptionFormSchema.parse({
    name: (formData.name as string) ?? '',
    targetUrl: (formData.targetUrl as string) ?? '',
    subscribedEvents: Array.isArray(formData.subscribedEvents)
      ? formData.subscribedEvents.map(String)
      : formData.subscribedEvents
        ? [String(formData.subscribedEvents)]
        : [],
  });

  return {
    ...parsed,
    subscribedEvents: validateWebhookSubscriptionEvents(parsed.subscribedEvents),
  };
}

export const createWebhookSubscription = defineFormStateAction({
  auth: ['admin'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    try {
      await createManagedWebhookSubscription(actor.userId, {
        ...parseSubscriptionForm(formData),
        secret: webhookSecretSchema.parse((formData.secret as string) ?? ''),
      });
      revalidatePath('/app/config/integracoes/webhooks');
      return { success: true, message: 'Webhook subscription criada.' };
    } catch (error) {
      return { success: false, message: zodMessage(error, 'Falha ao criar subscription.') };
    }
  },
  onError: (error) => ({ success: false, message: zodMessage(error, 'Falha ao criar subscription.') }),
});

export const updateWebhookSubscription = defineFormStateAction({
  auth: ['admin'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    try {
      await updateManagedWebhookSubscription(actor.userId, {
        id: parseId(formData),
        ...parseSubscriptionForm(formData),
        isActive: formData.isActive === 'true',
      });
      revalidatePath('/app/config/integracoes/webhooks');
      return { success: true, message: 'Webhook subscription atualizada.' };
    } catch (error) {
      return { success: false, message: zodMessage(error, 'Falha ao atualizar subscription.') };
    }
  },
  onError: (error) => ({ success: false, message: zodMessage(error, 'Falha ao atualizar subscription.') }),
});

export const toggleWebhookSubscription = defineFormStateAction({
  auth: ['admin'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    try {
      await setManagedWebhookSubscriptionActive(
        actor.userId,
        parseId(formData),
        formData.isActive === 'true',
      );
      revalidatePath('/app/config/integracoes/webhooks');
      return { success: true, message: 'Status da webhook subscription atualizado.' };
    } catch (error) {
      return { success: false, message: zodMessage(error, 'Falha ao alterar status.') };
    }
  },
  onError: (error) => ({ success: false, message: zodMessage(error, 'Falha ao alterar status.') }),
});

export const rotateWebhookSubscriptionSecret = defineFormStateAction({
  auth: ['admin'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    try {
      await rotateManagedWebhookSubscriptionSecret(
        actor.userId,
        parseId(formData),
        webhookSecretSchema.parse((formData.secret as string) ?? ''),
      );
      revalidatePath('/app/config/integracoes/webhooks');
      return { success: true, message: 'Segredo rotacionado.' };
    } catch (error) {
      return { success: false, message: zodMessage(error, 'Falha ao rotacionar segredo.') };
    }
  },
  onError: (error) => ({ success: false, message: zodMessage(error, 'Falha ao rotacionar segredo.') }),
});
