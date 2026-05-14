import { db, type Tx } from '@/lib/db';
import {
  domainEvents,
  domainEventEntityType,
  domainEventType,
} from '@/lib/db/schema/integrations';
import { sanitizePiiValue } from '@/lib/sanitize-pii';
import { z } from 'zod';

export type DomainEventType = (typeof domainEventType.enumValues)[number];
export type DomainEventEntityType = (typeof domainEventEntityType.enumValues)[number];

const linksSchema = z.object({
  app: z.string().min(1),
});

const payloadSchemaByEventType = {
  'associate.updated': z
    .object({
      associateId: z.number().int().positive().optional(),
      changedFields: z.array(z.string().min(1)).optional(),
      links: linksSchema.optional(),
    })
    .strict(),
  'legal_consultation.created': z
    .object({
      internalNumber: z.string().min(1),
      status: z.string().min(1),
      associateId: z.number().int().positive().nullable(),
      slaDueDate: z.string().datetime(),
      title: z.string().min(1),
      links: linksSchema,
    })
    .strict(),
  'legal_consultation.status_changed': z
    .object({
      internalNumber: z.string().min(1),
      title: z.string().min(1),
      previousStatus: z.string().min(1),
      status: z.string().min(1),
      links: linksSchema,
    })
    .strict(),
  'official_letter.created': z
    .object({
      number: z.string().min(1),
      status: z.string().min(1),
      year: z.number().int().positive(),
      sequence: z.number().int().positive(),
      links: linksSchema,
    })
    .strict(),
  'monthly_payment.updated': z
    .object({
      associateId: z.number().int().positive(),
      year: z.number().int().positive(),
      month: z.number().int().min(1).max(12),
      previousStatus: z.string().min(1),
      status: z.string().min(1),
      paymentMethod: z.string().min(1),
      paidAt: z.string().datetime().nullable(),
      links: linksSchema,
    })
    .strict(),
  'official_letter.published': z
    .object({
      number: z.string().min(1),
      status: z.string().min(1),
      year: z.number().int().positive(),
      sequence: z.number().int().positive(),
      links: linksSchema,
    })
    .strict(),
} satisfies Record<DomainEventType, z.ZodType<Record<string, unknown>>>;

export type DomainEventPayloadMap = {
  [K in DomainEventType]: z.infer<(typeof payloadSchemaByEventType)[K]>;
};

export interface EmitDomainEventInput<T extends DomainEventType = DomainEventType> {
  type: T;
  entityType: DomainEventEntityType;
  entityId: number;
  actorAdminId: number | null;
  payload: DomainEventPayloadMap[T];
}

export async function emitDomainEvent(
  input: EmitDomainEventInput,
  executor: Pick<Tx, 'insert'> = db,
) {
  const payload = payloadSchemaByEventType[input.type].parse(
    sanitizePiiValue(input.payload),
  ) as DomainEventPayloadMap[typeof input.type];

  const [event] = await executor
    .insert(domainEvents)
    .values({
      eventType: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      actorAdminId: input.actorAdminId,
      payload,
      deliveryStatus: 'pending',
    })
    .returning();

  if (!event) {
    throw new Error(
      `Failed to insert domain event ${input.type} for ${input.entityType}:${input.entityId}.`,
    );
  }

  return event;
}
