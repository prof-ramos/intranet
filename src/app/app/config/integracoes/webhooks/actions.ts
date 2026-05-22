'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireRole } from '@/lib/auth/authorization';
import { webhookSecretSchema, webhookSubscriptionFormSchema } from '@/lib/validation/schemas';
import {
  createManagedWebhookSubscription,
  rotateManagedWebhookSubscriptionSecret,
  setManagedWebhookSubscriptionActive,
  updateManagedWebhookSubscription,
  validateWebhookSubscriptionEvents,
} from '@/lib/integrations/webhooks/subscriptions';

type ActionState = { success: boolean; message: string } | null;

function zodMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function parseId(formData: FormData) {
  const raw = formData.get('id')?.toString() ?? '';
  const id = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Webhook subscription inválida.');
  }
  return id;
}

function parseSubscriptionForm(formData: FormData) {
  const parsed = webhookSubscriptionFormSchema.parse({
    name: formData.get('name')?.toString() ?? '',
    targetUrl: formData.get('targetUrl')?.toString() ?? '',
    subscribedEvents: formData.getAll('subscribedEvents').map((value) => value.toString()),
  });

  return {
    ...parsed,
    subscribedEvents: validateWebhookSubscriptionEvents(parsed.subscribedEvents),
  };
}

export async function createWebhookSubscription(
  _prevState: ActionState,
  formData: FormData,
): Promise<NonNullable<ActionState>> {
  const actor = await requireRole(['admin']);

  try {
    await createManagedWebhookSubscription(actor.userId, {
      ...parseSubscriptionForm(formData),
      secret: webhookSecretSchema.parse(formData.get('secret')?.toString() ?? ''),
    });
    revalidatePath('/app/config/integracoes/webhooks');
    return { success: true, message: 'Webhook subscription criada.' };
  } catch (error) {
    return { success: false, message: zodMessage(error, 'Falha ao criar subscription.') };
  }
}

export async function updateWebhookSubscription(
  _prevState: ActionState,
  formData: FormData,
): Promise<NonNullable<ActionState>> {
  const actor = await requireRole(['admin']);

  try {
    await updateManagedWebhookSubscription(actor.userId, {
      id: parseId(formData),
      ...parseSubscriptionForm(formData),
      isActive: formData.get('isActive') === 'true',
    });
    revalidatePath('/app/config/integracoes/webhooks');
    return { success: true, message: 'Webhook subscription atualizada.' };
  } catch (error) {
    return { success: false, message: zodMessage(error, 'Falha ao atualizar subscription.') };
  }
}

export async function toggleWebhookSubscription(
  _prevState: ActionState,
  formData: FormData,
): Promise<NonNullable<ActionState>> {
  const actor = await requireRole(['admin']);

  try {
    await setManagedWebhookSubscriptionActive(
      actor.userId,
      parseId(formData),
      formData.get('isActive') === 'true',
    );
    revalidatePath('/app/config/integracoes/webhooks');
    return { success: true, message: 'Status da webhook subscription atualizado.' };
  } catch (error) {
    return { success: false, message: zodMessage(error, 'Falha ao alterar status.') };
  }
}

export async function rotateWebhookSubscriptionSecret(
  _prevState: ActionState,
  formData: FormData,
): Promise<NonNullable<ActionState>> {
  const actor = await requireRole(['admin']);

  try {
    await rotateManagedWebhookSubscriptionSecret(
      actor.userId,
      parseId(formData),
      webhookSecretSchema.parse(formData.get('secret')?.toString() ?? ''),
    );
    revalidatePath('/app/config/integracoes/webhooks');
    return { success: true, message: 'Segredo rotacionado.' };
  } catch (error) {
    return { success: false, message: zodMessage(error, 'Falha ao rotacionar segredo.') };
  }
}
