import { db, type DbExecutor } from '@/lib/db';
import {
  legalConsultations,
  legalNotes,
  legalConsultationStatus,
  associates,
  admins,
} from '@/lib/db/schema';
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import { isSlaDueSoonSql } from './sla';
import type { LegalConsultationStatus } from './status';
import { normalizePagination } from '@/lib/pagination';

export interface ConsultationListItem {
  id: number;
  internalNumber: string;
  title: string;
  status: string;
  slaDueDate: string | null;
  lastInteractionAt: string | null;
  associateName: string | null;
  createdAt: string;
}

export interface GetConsultationsFilters {
  status?: LegalConsultationStatus;
  search?: string;
  staleDays?: number;
}

export function normalizeConsultationsPagination(page: number, pageSize: number) {
  return normalizePagination(page, pageSize);
}

export async function countConsultationsByStatus(
  status: (typeof legalConsultationStatus.enumValues)[number],
): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(legalConsultations)
    .where(eq(legalConsultations.status, status));
  return rows[0].count;
}

export async function countConsultationsStale(days = 7): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(legalConsultations)
    .where(
      and(
        ne(legalConsultations.status, 'arquivada'),
        sql`${legalConsultations.lastInteractionAt} < now() - interval '1 day' * ${days}`,
      ),
    );
  return rows[0].count;
}

export async function countConsultationsSlaDueSoon(days = 2): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(legalConsultations)
    .where(
      and(
        ne(legalConsultations.status, 'arquivada'),
        isSlaDueSoonSql(legalConsultations.slaDueDate, days),
      ),
    );
  return rows[0].count;
}

export async function countConsultationsRespondedThisMonth(): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(legalConsultations)
    .where(
      and(
        eq(legalConsultations.status, 'respondida'),
        sql`date_trunc('month', ${legalConsultations.updatedAt}) = date_trunc('month', now())`,
      ),
    );
  return rows[0].count;
}

export async function getConsultationsPaginated(
  page: number,
  pageSize: number,
  filters: GetConsultationsFilters = {},
): Promise<{ rows: ConsultationListItem[]; total: number }> {
  const normalized = normalizeConsultationsPagination(page, pageSize);
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(legalConsultations.status, filters.status));
  }

  if (filters.search) {
    const escaped = escapeLikePattern(filters.search);
    const pattern = `%${escaped}%`;
    conditions.push(
      sql`${legalConsultations.title} like ${pattern} escape '\\' or ${legalConsultations.internalNumber} like ${pattern} escape '\\'`,
    );
  }

  if (filters.staleDays) {
    conditions.push(
      and(
        ne(legalConsultations.status, 'arquivada'),
        sql`${legalConsultations.lastInteractionAt} < now() - interval '1 day' * ${filters.staleDays}`,
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: legalConsultations.id,
        internalNumber: legalConsultations.internalNumber,
        title: legalConsultations.title,
        status: legalConsultations.status,
        slaDueDate: legalConsultations.slaDueDate,
        lastInteractionAt: legalConsultations.lastInteractionAt,
        associateName: associates.fullName,
        createdAt: legalConsultations.createdAt,
      })
      .from(legalConsultations)
      .leftJoin(associates, eq(legalConsultations.associateId, associates.id))
      .where(where)
      .orderBy(desc(legalConsultations.createdAt))
      .limit(normalized.pageSize)
      .offset((normalized.page - 1) * normalized.pageSize),
    db.select({ total: count() }).from(legalConsultations).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      slaDueDate: r.slaDueDate ? r.slaDueDate.toISOString() : null,
      lastInteractionAt: r.lastInteractionAt ? r.lastInteractionAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}

export interface ConsultationDetail {
  id: number;
  internalNumber: string;
  title: string;
  questionSummary: string;
  questionFullText: string | null;
  status: string;
  satisfaction: string | null;
  slaDueDate: string | null;
  lastInteractionAt: string | null;
  finalAnswer: string | null;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  associate: { id: number; name: string } | null;
  answeredBy: { id: number; name: string } | null;
  createdBy: { id: number; name: string };
}

export async function getConsultationById(
  id: number,
  executor: DbExecutor = db,
): Promise<ConsultationDetail | null> {
  const answeredByAdmin = alias(admins, 'answered_by_admin');
  const createdByAdmin = alias(admins, 'created_by_admin');

  const [row] = await executor
    .select({
      id: legalConsultations.id,
      internalNumber: legalConsultations.internalNumber,
      title: legalConsultations.title,
      questionSummary: legalConsultations.questionSummary,
      questionFullText: legalConsultations.questionFullText,
      status: legalConsultations.status,
      satisfaction: legalConsultations.satisfaction,
      slaDueDate: legalConsultations.slaDueDate,
      lastInteractionAt: legalConsultations.lastInteractionAt,
      finalAnswer: legalConsultations.finalAnswer,
      attachments: legalConsultations.attachments,
      createdAt: legalConsultations.createdAt,
      updatedAt: legalConsultations.updatedAt,
      associateId: associates.id,
      associateName: associates.fullName,
      answeredById: answeredByAdmin.id,
      answeredByName: answeredByAdmin.name,
      createdByAdminId: createdByAdmin.id,
      createdByAdminName: createdByAdmin.name,
      createdById: legalConsultations.createdBy,
    })
    .from(legalConsultations)
    .leftJoin(associates, eq(legalConsultations.associateId, associates.id))
    .leftJoin(answeredByAdmin, eq(legalConsultations.answeredBy, answeredByAdmin.id))
    .leftJoin(createdByAdmin, eq(legalConsultations.createdBy, createdByAdmin.id))
    .where(eq(legalConsultations.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    internalNumber: row.internalNumber,
    title: row.title,
    questionSummary: row.questionSummary,
    questionFullText: row.questionFullText,
    status: row.status,
    satisfaction: row.satisfaction,
    slaDueDate: row.slaDueDate ? row.slaDueDate.toISOString() : null,
    lastInteractionAt: row.lastInteractionAt ? row.lastInteractionAt.toISOString() : null,
    finalAnswer: row.finalAnswer,
    attachments: (row.attachments as string[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    associate: row.associateId ? { id: row.associateId, name: row.associateName! } : null,
    answeredBy: row.answeredById ? { id: row.answeredById, name: row.answeredByName! } : null,
    createdBy: row.createdByAdminId
      ? { id: row.createdByAdminId, name: row.createdByAdminName! }
      : { id: row.createdById ?? 0, name: 'Desconhecido' },
  };
}

export interface NoteItem {
  id: number;
  content: string;
  createdBy: { id: number; name: string };
  isEscritorioResponse: boolean;
  createdAt: string;
}

export async function getNotesByEntity(
  entityType: 'consultation' | 'process',
  entityId: number,
): Promise<NoteItem[]> {
  const rows = await db
    .select({
      id: legalNotes.id,
      content: legalNotes.content,
      createdByName: admins.name,
      createdById: legalNotes.createdBy,
      isEscritorioResponse: legalNotes.isEscritorioResponse,
      createdAt: legalNotes.createdAt,
    })
    .from(legalNotes)
    .leftJoin(admins, eq(legalNotes.createdBy, admins.id))
    .where(and(eq(legalNotes.entityType, entityType), eq(legalNotes.entityId, entityId)))
    .orderBy(asc(legalNotes.createdAt));

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdBy: { id: r.createdById, name: r.createdByName ?? 'Desconhecido' },
    isEscritorioResponse: r.isEscritorioResponse,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface PendingAction {
  id: number;
  internalNumber: string;
  title: string;
  type: 'sla_vencendo' | 'sem_atualizacao' | 'aguardando_escritorio';
  days: number;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const [slaRows, staleRows, escritorioRows] = await Promise.all([
    db
      .select({
        id: legalConsultations.id,
        internalNumber: legalConsultations.internalNumber,
        title: legalConsultations.title,
        slaDueDate: legalConsultations.slaDueDate,
      })
      .from(legalConsultations)
      .where(
        and(
          ne(legalConsultations.status, 'arquivada'),
          isSlaDueSoonSql(legalConsultations.slaDueDate),
        ),
      )
      .orderBy(asc(legalConsultations.slaDueDate))
      .limit(5),
    db
      .select({
        id: legalConsultations.id,
        internalNumber: legalConsultations.internalNumber,
        title: legalConsultations.title,
        lastInteractionAt: legalConsultations.lastInteractionAt,
      })
      .from(legalConsultations)
      .where(
        and(
          ne(legalConsultations.status, 'arquivada'),
          sql`${legalConsultations.lastInteractionAt} < now() - interval '7 days'`,
        ),
      )
      .orderBy(asc(legalConsultations.lastInteractionAt))
      .limit(5),
    db
      .select({
        id: legalConsultations.id,
        internalNumber: legalConsultations.internalNumber,
        title: legalConsultations.title,
      })
      .from(legalConsultations)
      .where(eq(legalConsultations.status, 'aguardando_escritorio'))
      .orderBy(asc(legalConsultations.updatedAt))
      .limit(5),
  ]);

  const actions: PendingAction[] = [
    ...slaRows.map((r) => ({
      id: r.id,
      internalNumber: r.internalNumber,
      title: r.title,
      type: 'sla_vencendo' as const,
      days: 0,
    })),
    ...staleRows.map((r) => ({
      id: r.id,
      internalNumber: r.internalNumber,
      title: r.title,
      type: 'sem_atualizacao' as const,
      days: Math.floor(
        (Date.now() - new Date(r.lastInteractionAt!).getTime()) / (1000 * 60 * 60 * 24),
      ),
    })),
    ...escritorioRows.map((r) => ({
      id: r.id,
      internalNumber: r.internalNumber,
      title: r.title,
      type: 'aguardando_escritorio' as const,
      days: 0,
    })),
  ];

  return actions.slice(0, 10);
}

export interface ConsultationSummary {
  id: number;
  internalNumber: string;
  title: string;
  status: string;
  createdAt: Date;
  lastInteractionAt: Date | null;
}

function toConsultationSummary(row: {
  id: number;
  internalNumber: string;
  title: string;
  status: string;
  createdAt: Date;
  lastInteractionAt: Date | null;
}): ConsultationSummary {
  return {
    id: row.id,
    internalNumber: row.internalNumber,
    title: row.title,
    status: row.status,
    createdAt: row.createdAt,
    lastInteractionAt: row.lastInteractionAt ?? null,
  };
}

export async function getConsultationsByAssociate(
  associateId: number,
  executor: DbExecutor = db,
): Promise<ConsultationSummary[]> {
  const rows = await executor
    .select({
      id: legalConsultations.id,
      internalNumber: legalConsultations.internalNumber,
      title: legalConsultations.title,
      status: legalConsultations.status,
      createdAt: legalConsultations.createdAt,
      lastInteractionAt: legalConsultations.lastInteractionAt,
    })
    .from(legalConsultations)
    .where(eq(legalConsultations.associateId, associateId))
    .orderBy(desc(legalConsultations.createdAt))
    .limit(10);

  return rows.map(toConsultationSummary);
}

export async function findAssociateWithOpenConsultationsByEmailHash(
  primaryEmailHash: string,
  executor: DbExecutor = db,
): Promise<{ associate: { id: number } | null; consultations: ConsultationSummary[] }> {
  const selectedAssociate = alias(associates, 'selected_associate');
  const rows = await executor
    .select({
      associateId: selectedAssociate.id,
      consultationId: legalConsultations.id,
      internalNumber: legalConsultations.internalNumber,
      title: legalConsultations.title,
      status: legalConsultations.status,
      createdAt: legalConsultations.createdAt,
      lastInteractionAt: legalConsultations.lastInteractionAt,
    })
    .from(selectedAssociate)
    .leftJoin(
      legalConsultations,
      and(
        eq(legalConsultations.associateId, selectedAssociate.id),
        eq(legalConsultations.status, 'aberta'),
      ),
    )
    .where(
      eq(
        selectedAssociate.id,
        sql<number>`(
          select ${associates.id}
          from ${associates}
          where ${associates.primaryEmailHash} = ${primaryEmailHash}
          order by ${associates.id} asc
          limit 1
        )`,
      ),
    )
    .orderBy(desc(legalConsultations.createdAt))
    .limit(10);

  if (rows.length === 0) {
    return { associate: null, consultations: [] };
  }

  return {
    associate: { id: rows[0].associateId },
    consultations: rows
      .filter(
        (
          row,
        ): row is typeof row & {
          consultationId: number;
          internalNumber: string;
          title: string;
          status: string;
          createdAt: Date;
        } =>
          row.consultationId !== null &&
          row.internalNumber !== null &&
          row.title !== null &&
          row.status !== null &&
          row.createdAt !== null,
      )
      .map((row) =>
        toConsultationSummary({
          id: row.consultationId,
          internalNumber: row.internalNumber,
          title: row.title,
          status: row.status,
          createdAt: row.createdAt,
          lastInteractionAt: row.lastInteractionAt,
        }),
      ),
  };
}

export async function insertConsultation(
  values: {
    internalNumber: string;
    title: string;
    questionSummary: string;
    questionFullText: string | null;
    associateId: number | null;
    slaDueDate: Date;
    createdBy: number;
    lastInteractionAt: Date;
    lawyerId?: number | null;
    threadId?: string | null;
  },
  executor: DbExecutor = db,
) {
  const [inserted] = await executor
    .insert(legalConsultations)
    .values({
      internalNumber: values.internalNumber,
      title: values.title,
      questionSummary: values.questionSummary,
      questionFullText: values.questionFullText,
      associateId: values.associateId,
      slaDueDate: values.slaDueDate,
      createdBy: values.createdBy,
      lastInteractionAt: values.lastInteractionAt,
      lawyerId: values.lawyerId ?? null,
      threadId: values.threadId ?? null,
    })
    .returning({ id: legalConsultations.id });

  return inserted;
}

export async function updateConsultationStatus(
  id: number,
  status: (typeof legalConsultationStatus.enumValues)[number],
  lastInteractionAt?: Date,
  executor: DbExecutor = db,
) {
  const set: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (lastInteractionAt) {
    set.lastInteractionAt = lastInteractionAt;
  }

  await executor.update(legalConsultations).set(set).where(eq(legalConsultations.id, id));
}

export async function insertNote(
  values: {
    entityType: 'consultation' | 'process';
    entityId: number;
    content: string;
    createdBy: number;
    isEscritorioResponse: boolean;
  },
  executor: DbExecutor = db,
) {
  await executor.insert(legalNotes).values({
    entityType: values.entityType,
    entityId: values.entityId,
    content: values.content,
    createdBy: values.createdBy,
    isEscritorioResponse: values.isEscritorioResponse,
  });
}

export async function touchConsultationInteraction(entityId: number, executor: DbExecutor = db) {
  await executor
    .update(legalConsultations)
    .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
    .where(eq(legalConsultations.id, entityId));
}
