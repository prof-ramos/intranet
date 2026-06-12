'use server';

import { revalidatePath } from 'next/cache';
import { defineFormStateAction } from '@/lib/server-actions/define-form-action';
import { z, ZodError } from 'zod';
import { webhookSecretSchema, webhookSubscriptionFormSchema } from '@/lib/validation/schemas';
import {
  createManagedWebhookSubscription,
  rotateManagedWebhookSubscriptionSecret,
  setManagedWebhookSubscriptionActive,
  updateManagedWebhookSubscription,
  validateWebhookSubscriptionEvents,
} from '@/lib/integrations/webhooks/subscriptions';

const subscribedEventsSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (Array.isArray(value) ? value : value ? [value] : []));

const webhookFormFields = {
  name: z.string().default(''),
  targetUrl: z.string().default(''),
  subscribedEvents: subscribedEventsSchema,
};

const createWebhookSchema = z.object({
  ...webhookFormFields,
  secret: z.string().default(''),
});
const updateWebhookSchema = z.object({
  id: z.string().default(''),
  ...webhookFormFields,
  isActive: z.string().default('false'),
});
const toggleWebhookSchema = z.object({
  id: z.string().default(''),
  isActive: z.string().default('false'),
});
const rotateWebhookSchema = z.object({
  id: z.string().default(''),
  secret: z.string().default(''),
});

function zodMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function parseId(raw: string) {
  const id = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Webhook subscription inválida.');
  }
  return id;
}

function parseSubscriptionForm(formData: {
  name: string;
  targetUrl: string;
  subscribedEvents: string[];
}) {
  const parsed = webhookSubscriptionFormSchema.parse({
    name: formData.name,
    targetUrl: formData.targetUrl,
    subscribedEvents: formData.subscribedEvents,
  });

  return {
    ...parsed,
    subscribedEvents: validateWebhookSubscriptionEvents(parsed.subscribedEvents),
  };
}

export const createWebhookSubscription = defineFormStateAction({
  auth: ['admin'],
  schema: createWebhookSchema,
  service: async (data, actor) => {
    try {
      await createManagedWebhookSubscription(actor.userId, {
        ...parseSubscriptionForm(data),
        secret: webhookSecretSchema.parse(data.secret),
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
  schema: updateWebhookSchema,
  service: async (data, actor) => {
    try {
      await updateManagedWebhookSubscription(actor.userId, {
        id: parseId(data.id),
        ...parseSubscriptionForm(data),
        isActive: data.isActive === 'true',
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
  schema: toggleWebhookSchema,
  service: async (data, actor) => {
    try {
      await setManagedWebhookSubscriptionActive(
        actor.userId,
        parseId(data.id),
        data.isActive === 'true',
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
  schema: rotateWebhookSchema,
  service: async (data, actor) => {
    try {
      await rotateManagedWebhookSubscriptionSecret(
        actor.userId,
        parseId(data.id),
        webhookSecretSchema.parse(data.secret),
      );
      revalidatePath('/app/config/integracoes/webhooks');
      return { success: true, message: 'Segredo rotacionado.' };
    } catch (error) {
      return { success: false, message: zodMessage(error, 'Falha ao rotacionar segredo.') };
    }
  },
  onError: (error) => ({ success: false, message: zodMessage(error, 'Falha ao rotacionar segredo.') }),
});
