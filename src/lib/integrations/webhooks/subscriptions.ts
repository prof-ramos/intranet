import 'server-only';

import { z } from 'zod';
import { db, type DbExecutor } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema/audit';
import { domainEventType, type WebhookSubscription } from '@/lib/db/schema/integrations';
import { encryptWebhookSecret } from '@/lib/integrations/webhooks/secrets';
import { webhookSecretSchema, webhookSubscriptionFormSchema } from '@/lib/validation/schemas';
import {
  getWebhookSubscriptionById,
  insertWebhookSubscription,
  listWebhookSubscriptions,
  updateWebhookSubscriptionById,
} from '@/lib/integrations/webhooks/repository';

const allowedEventTypes = domainEventType.enumValues;

const subscriptionBaseSchema = webhookSubscriptionFormSchema;

const createSubscriptionSchema = subscriptionBaseSchema.extend({
  secret: webhookSecretSchema,
});

const updateSubscriptionSchema = subscriptionBaseSchema.extend({
  id: z.number().int().positive(),
  isActive: z.boolean(),
});

const idSchema = z.number().int().positive();

export type CreateWebhookSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateWebhookSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export function getAllowedWebhookEventTypes() {
  return [...allowedEventTypes];
}

export function validateWebhookSubscriptionEvents(events: string[]) {
  return z.array(z.enum(allowedEventTypes)).min(1).parse(events);
}

async function auditSubscription(
  tx: DbExecutor,
  input: {
    action: string;
    subscriptionId: number;
    actorAdminId: number;
    changes?: { old: Record<string, unknown>; new: Record<string, unknown> };
    metadata?: Record<string, unknown>;
  },
) {
  await tx.insert(auditLogs).values({
    action: input.action,
    entityType: 'webhook_subscription',
    entityId: input.subscriptionId,
    performedBy: input.actorAdminId,
    changes: input.changes ?? null,
    metadata: input.metadata ?? null,
  });
}

function publicSubscriptionState(subscription: WebhookSubscription) {
  return {
    name: subscription.name,
    targetUrl: subscription.targetUrl,
    subscribedEvents: subscription.subscribedEvents,
    isActive: subscription.isActive,
  };
}

export async function listManagedWebhookSubscriptions() {
  return listWebhookSubscriptions();
}

export async function createManagedWebhookSubscription(
  actorAdminId: number,
  input: CreateWebhookSubscriptionInput,
) {
  const parsed = createSubscriptionSchema.parse(input);

  return db.transaction(async (tx) => {
    const inserted = await insertWebhookSubscription(
      {
        name: parsed.name,
        targetUrl: parsed.targetUrl,
        secretCiphertext: encryptWebhookSecret(parsed.secret),
        subscribedEvents: parsed.subscribedEvents,
        isActive: true,
        createdBy: actorAdminId,
      },
      tx,
    );

    await auditSubscription(tx, {
      action: 'webhook_subscription_created',
      subscriptionId: inserted.id,
      actorAdminId,
      changes: {
        old: {},
        new: publicSubscriptionState(inserted),
      },
    });

    return inserted;
  });
}

export async function updateManagedWebhookSubscription(
  actorAdminId: number,
  input: UpdateWebhookSubscriptionInput,
) {
  const parsed = updateSubscriptionSchema.parse(input);

  return db.transaction(async (tx) => {
    const current = await getWebhookSubscriptionById(parsed.id, tx);
    if (!current) {
      throw new Error('Webhook subscription não encontrada.');
    }

    const updated = await updateWebhookSubscriptionById(
      parsed.id,
      {
        name: parsed.name,
        targetUrl: parsed.targetUrl,
        subscribedEvents: parsed.subscribedEvents,
        isActive: parsed.isActive,
      },
      tx,
    );

    if (!updated) {
      throw new Error('Falha ao atualizar webhook subscription.');
    }

    await auditSubscription(tx, {
      action: 'webhook_subscription_updated',
      subscriptionId: parsed.id,
      actorAdminId,
      changes: {
        old: publicSubscriptionState(current),
        new: publicSubscriptionState(updated),
      },
    });

    return updated;
  });
}

export async function setManagedWebhookSubscriptionActive(
  actorAdminId: number,
  id: number,
  isActive: boolean,
) {
  const parsedId = idSchema.parse(id);

  return db.transaction(async (tx) => {
    const current = await getWebhookSubscriptionById(parsedId, tx);
    if (!current) {
      throw new Error('Webhook subscription não encontrada.');
    }

    if (current.isActive === isActive) {
      return current;
    }

    const updated = await updateWebhookSubscriptionById(parsedId, { isActive }, tx);
    if (!updated) {
      throw new Error('Falha ao alterar status da webhook subscription.');
    }

    await auditSubscription(tx, {
      action: isActive ? 'webhook_subscription_reactivated' : 'webhook_subscription_deactivated',
      subscriptionId: parsedId,
      actorAdminId,
      changes: {
        old: { isActive: current.isActive },
        new: { isActive },
      },
    });

    return updated;
  });
}

export async function rotateManagedWebhookSubscriptionSecret(
  actorAdminId: number,
  id: number,
  secret: string,
) {
  const parsedId = idSchema.parse(id);
  const parsedSecret = webhookSecretSchema.parse(secret);

  return db.transaction(async (tx) => {
    const current = await getWebhookSubscriptionById(parsedId, tx);
    if (!current) {
      throw new Error('Webhook subscription não encontrada.');
    }

    const updated = await updateWebhookSubscriptionById(
      parsedId,
      { secretCiphertext: encryptWebhookSecret(parsedSecret) },
      tx,
    );
    if (!updated) {
      throw new Error('Falha ao rotacionar segredo da webhook subscription.');
    }

    await auditSubscription(tx, {
      action: 'webhook_subscription_secret_rotated',
      subscriptionId: parsedId,
      actorAdminId,
      metadata: {
        name: current.name,
      },
    });

    return updated;
  });
}
