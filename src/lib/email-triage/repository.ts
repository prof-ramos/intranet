import { db } from '@/lib/db';
import { emailTriagens, admins } from '@/lib/db/schema';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import type { EmailTriageStatus, EmailTriageCategoria, EmailTriageRisco } from './status';

export interface TriageListItem {
  id: number;
  subject: string;
  sender: string;
  categoria: string;
  nivelRisco: string;
  status: string;
  prazoData: string | null;
  haPrazo: boolean;
  exigeValidacaoHumana: boolean;
  receivedAt: string;
  createdAt: string;
}

export interface GetTriagesFilters {
  status?: EmailTriageStatus;
  categoria?: EmailTriageCategoria;
  nivelRisco?: EmailTriageRisco;
  search?: string;
}

export interface TriageDetail {
  id: number;
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  originalRecipient: string | null;
  bodyExcerpt: string;
  categoria: string;
  resumo: string;
  threadContextSummary: string | null;
  haPrazo: boolean;
  prazoData: string | null;
  prazoHora: string | null;
  prazoConfiancaData: string | null;
  tipoPrazo: string | null;
  trechoFonteDoPrazo: string | null;
  resumoAnexos: Array<{
    filename: string;
    mime_type: string | null;
    sha256: string | null;
    resumo: string;
    ha_prazo_no_anexo: boolean;
    trechos_relevantes: string[];
  }>;
  sourceEvidence: Array<{
    tipo: string;
    referencia: string;
    trecho: string;
  }>;
  nivelRisco: string;
  confianca: string;
  acaoRecomendada: string;
  responsavelSugerido: string | null;
  exigeValidacaoHumana: boolean;
  legalBasis: string;
  processedPurpose: string;
  processingVersion: string;
  modelName: string | null;
  modelResponseId: string | null;
  status: string;
  usuarioValidador: { id: number; name: string } | null;
  validatedAt: string | null;
  observacoesValidacao: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

import { normalizePagination } from '@/lib/pagination';

export function normalizeTriagesPagination(page: number, pageSize: number) {
  return normalizePagination(page, pageSize);
}

export async function countTriagesByStatus(status: EmailTriageStatus): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(emailTriagens)
    .where(eq(emailTriagens.status, status));
  return rows[0].count;
}

export async function countTriagesAguardandoValidacao(): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(emailTriagens)
    .where(eq(emailTriagens.status, 'aguardando_validacao'));
  return rows[0].count;
}

export async function countTriagesVencidas(): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(emailTriagens)
    .where(eq(emailTriagens.status, 'vencido'));
  return rows[0].count;
}

export async function countTriagesAltoRisco(): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(emailTriagens)
    .where(
      and(
        ne(emailTriagens.status, 'arquivado'),
        ne(emailTriagens.status, 'descartado_por_irrelevancia'),
        sql`${emailTriagens.nivelRisco} in ('alto', 'critico')`,
      ),
    );
  return rows[0].count;
}

export async function getTriagesPaginated(
  page: number,
  pageSize: number,
  filters: GetTriagesFilters = {},
): Promise<{ rows: TriageListItem[]; total: number }> {
  const normalized = normalizeTriagesPagination(page, pageSize);
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(emailTriagens.status, filters.status));
  }

  if (filters.categoria) {
    conditions.push(eq(emailTriagens.categoria, filters.categoria));
  }

  if (filters.nivelRisco) {
    conditions.push(eq(emailTriagens.nivelRisco, filters.nivelRisco));
  }

  if (filters.search) {
    const escaped = escapeLikePattern(filters.search);
    const pattern = `%${escaped}%`;
    conditions.push(
      sql`(${emailTriagens.subject} like ${pattern} escape '\\' or ${emailTriagens.sender} like ${pattern} escape '\\')`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: emailTriagens.id,
        subject: emailTriagens.subject,
        sender: emailTriagens.sender,
        categoria: emailTriagens.categoria,
        nivelRisco: emailTriagens.nivelRisco,
        status: emailTriagens.status,
        prazoData: emailTriagens.prazoData,
        haPrazo: emailTriagens.haPrazo,
        exigeValidacaoHumana: emailTriagens.exigeValidacaoHumana,
        receivedAt: emailTriagens.receivedAt,
        createdAt: emailTriagens.createdAt,
      })
      .from(emailTriagens)
      .where(where)
      .orderBy(desc(emailTriagens.receivedAt))
      .limit(normalized.pageSize)
      .offset((normalized.page - 1) * normalized.pageSize),
    db.select({ total: count() }).from(emailTriagens).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      sender: r.sender,
      categoria: r.categoria,
      nivelRisco: r.nivelRisco,
      status: r.status,
      prazoData: r.prazoData,
      haPrazo: r.haPrazo,
      exigeValidacaoHumana: r.exigeValidacaoHumana,
      receivedAt: r.receivedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}

export async function getTriageById(id: number): Promise<TriageDetail | null> {
  const validatorAdmin = alias(admins, 'validator_admin');

  const [row] = await db
    .select({
      id: emailTriagens.id,
      messageId: emailTriagens.messageId,
      threadId: emailTriagens.threadId,
      subject: emailTriagens.subject,
      sender: emailTriagens.sender,
      originalRecipient: emailTriagens.originalRecipient,
      bodyExcerpt: emailTriagens.bodyExcerpt,
      categoria: emailTriagens.categoria,
      resumo: emailTriagens.resumo,
      threadContextSummary: emailTriagens.threadContextSummary,
      haPrazo: emailTriagens.haPrazo,
      prazoData: emailTriagens.prazoData,
      prazoHora: emailTriagens.prazoHora,
      prazoConfiancaData: emailTriagens.prazoConfiancaData,
      tipoPrazo: emailTriagens.tipoPrazo,
      trechoFonteDoPrazo: emailTriagens.trechoFonteDoPrazo,
      resumoAnexos: emailTriagens.resumoAnexos,
      sourceEvidence: emailTriagens.sourceEvidence,
      nivelRisco: emailTriagens.nivelRisco,
      confianca: emailTriagens.confianca,
      acaoRecomendada: emailTriagens.acaoRecomendada,
      responsavelSugerido: emailTriagens.responsavelSugerido,
      exigeValidacaoHumana: emailTriagens.exigeValidacaoHumana,
      legalBasis: emailTriagens.legalBasis,
      processedPurpose: emailTriagens.processedPurpose,
      processingVersion: emailTriagens.processingVersion,
      modelName: emailTriagens.modelName,
      modelResponseId: emailTriagens.modelResponseId,
      status: emailTriagens.status,
      usuarioValidadorId: emailTriagens.usuarioValidadorId,
      validatedAt: emailTriagens.validatedAt,
      observacoesValidacao: emailTriagens.observacoesValidacao,
      receivedAt: emailTriagens.receivedAt,
      createdAt: emailTriagens.createdAt,
      updatedAt: emailTriagens.updatedAt,
      validatorId: validatorAdmin.id,
      validatorName: validatorAdmin.name,
    })
    .from(emailTriagens)
    .leftJoin(validatorAdmin, eq(emailTriagens.usuarioValidadorId, validatorAdmin.id))
    .where(eq(emailTriagens.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    messageId: row.messageId,
    threadId: row.threadId,
    subject: row.subject,
    sender: row.sender,
    originalRecipient: row.originalRecipient,
    bodyExcerpt: row.bodyExcerpt,
    categoria: row.categoria,
    resumo: row.resumo,
    threadContextSummary: row.threadContextSummary,
    haPrazo: row.haPrazo,
    prazoData: row.prazoData,
    prazoHora: row.prazoHora,
    prazoConfiancaData: row.prazoConfiancaData,
    tipoPrazo: row.tipoPrazo,
    trechoFonteDoPrazo: row.trechoFonteDoPrazo,
    resumoAnexos: (row.resumoAnexos ?? []) as TriageDetail['resumoAnexos'],
    sourceEvidence: (row.sourceEvidence ?? []) as TriageDetail['sourceEvidence'],
    nivelRisco: row.nivelRisco,
    confianca: row.confianca,
    acaoRecomendada: row.acaoRecomendada,
    responsavelSugerido: row.responsavelSugerido,
    exigeValidacaoHumana: row.exigeValidacaoHumana,
    legalBasis: row.legalBasis,
    processedPurpose: row.processedPurpose,
    processingVersion: row.processingVersion,
    modelName: row.modelName,
    modelResponseId: row.modelResponseId,
    status: row.status,
    usuarioValidador: row.validatorId
      ? { id: row.validatorId, name: row.validatorName! }
      : null,
    validatedAt: row.validatedAt ? row.validatedAt.toISOString() : null,
    observacoesValidacao: row.observacoesValidacao,
    receivedAt: row.receivedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateTriageStatus(
  id: number,
  newStatus: EmailTriageStatus,
  userId: number,
  observacoes?: string,
): Promise<void> {
  await db
    .update(emailTriagens)
    .set({
      status: newStatus,
      usuarioValidadorId: userId,
      validatedAt: new Date(),
      observacoesValidacao: observacoes ?? null,
      updatedAt: sql`current_timestamp`,
    })
    .where(eq(emailTriagens.id, id));
}

export async function addTriageObservacao(
  id: number,
  observacoes: string,
  _userId: number,
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const newEntry = `[${timestamp}] ${observacoes}`;

  await db
    .update(emailTriagens)
    .set({
      observacoesValidacao: sql`COALESCE(${emailTriagens.observacoesValidacao} || ${'\n'}, '') || ${newEntry}`,
      updatedAt: sql`current_timestamp`,
    })
    .where(eq(emailTriagens.id, id));
}

export async function updateTriageDeadline(
  id: number,
  prazoData: string,
  prazoHora?: string,
): Promise<void> {
  await db
    .update(emailTriagens)
    .set({
      prazoData,
      prazoHora: prazoHora ?? null,
      updatedAt: sql`current_timestamp`,
    })
    .where(eq(emailTriagens.id, id));
}

export async function markOverdueTriages(): Promise<number> {
  const result = await db
    .update(emailTriagens)
    .set({
      status: 'vencido',
      updatedAt: sql`current_timestamp`,
    })
    .where(
      and(
        sql`${emailTriagens.prazoData} < CURRENT_DATE`,
        sql`${emailTriagens.status} not in ('vencido', 'concluido', 'arquivado', 'descartado_por_irrelevancia', 'erro_validacao_ia', 'erro_processamento_anexo')`,
      ),
    )
    .returning({ id: emailTriagens.id });

  return result.length;
}
