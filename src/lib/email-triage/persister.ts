/**
 * DB persistence layer for email triage.
 *
 * Extracted from pipeline.ts (US-003) to separate persistence logic from
 * orchestration. All functions are pure DB operations with no side effects.
 */
import { db } from '@/lib/db';
import { emailTriagens } from '@/lib/db/schema/email-triage';
import { sql } from 'drizzle-orm';
import { EMAIL_TRIAGE_VERSION } from './system-prompt';
import type { EmailPayload, EmailTriageResult } from './schema';

/**
 * Build the common insert/update values for email_triagens from a triage
 * result and its payload.
 */
export function buildTriagemValues(
  payload: EmailPayload,
  result: EmailTriageResult,
  modelName: string,
  responseId: string | null,
) {
  const attachmentHashes: string[] = payload.attachments
    .map((a) => a.sha256)
    .filter((h): h is string => h !== null);

  const status = result.exige_validacao_humana
    ? ('aguardando_validacao' as const)
    : ('analisado' as const);

  return {
    messageId: payload.message_id,
    threadId: payload.thread_id,
    historyId: payload.history_id || null,
    receivedAt: new Date(payload.received_at),
    sender: payload.sender,
    originalRecipient: payload.original_recipient || null,
    subject: payload.subject,
    bodyHash: payload.body_hash,
    bodyExcerpt: payload.body_excerpt,
    rawBodyStored: false,
    redactionApplied: true,
    categoria: result.categoria,
    resumo: result.resumo,
    threadContextSummary: result.thread_context_summary ?? null,
    haPrazo: result.ha_prazo,
    prazoData: result.prazo_data ?? null,
    prazoHora: result.prazo_hora ?? null,
    prazoConfiancaData: result.prazo_confianca_data ?? null,
    tipoPrazo: result.tipo_prazo ?? null,
    trechoFonteDoPrazo: result.trecho_fonte_do_prazo ?? null,
    resumoAnexos: result.resumo_anexos,
    sourceEvidence: result.source_evidence,
    attachmentsHashes: attachmentHashes,
    nivelRisco: result.nivel_risco,
    confianca: result.confianca,
    acaoRecomendada: result.acao_recomendada,
    responsavelSugerido: result.responsavel_sugerido ?? null,
    exigeValidacaoHumana: result.exige_validacao_humana,
    legalBasis: result.legal_basis,
    processedPurpose: result.processed_purpose,
    dataRetentionUntil: null,
    processingVersion: EMAIL_TRIAGE_VERSION,
    modelName,
    modelResponseId: responseId,
    status,
  };
}

export async function persistTriage(
  payload: EmailPayload,
  result: EmailTriageResult,
  modelName: string,
  responseId: string | null,
): Promise<number> {
  const values = buildTriagemValues(payload, result, modelName, responseId);

  const [row] = await db
    .insert(emailTriagens)
    .values(values)
    .onConflictDoUpdate({
      target: emailTriagens.messageId,
      set: {
        threadId: values.threadId,
        historyId: values.historyId,
        receivedAt: values.receivedAt,
        sender: values.sender,
        originalRecipient: values.originalRecipient,
        subject: values.subject,
        bodyHash: values.bodyHash,
        bodyExcerpt: values.bodyExcerpt,
        categoria: values.categoria,
        resumo: values.resumo,
        threadContextSummary: values.threadContextSummary,
        haPrazo: values.haPrazo,
        prazoData: values.prazoData,
        prazoHora: values.prazoHora,
        prazoConfiancaData: values.prazoConfiancaData,
        tipoPrazo: values.tipoPrazo,
        trechoFonteDoPrazo: values.trechoFonteDoPrazo,
        resumoAnexos: values.resumoAnexos,
        sourceEvidence: values.sourceEvidence,
        attachmentsHashes: values.attachmentsHashes,
        nivelRisco: values.nivelRisco,
        confianca: values.confianca,
        acaoRecomendada: values.acaoRecomendada,
        responsavelSugerido: values.responsavelSugerido,
        exigeValidacaoHumana: values.exigeValidacaoHumana,
        legalBasis: values.legalBasis,
        processedPurpose: values.processedPurpose,
        processingVersion: values.processingVersion,
        modelName: values.modelName,
        modelResponseId: values.modelResponseId,
        status: values.status,
        updatedAt: sql`current_timestamp`,
      },
    })
    .returning({ id: emailTriagens.id });

  return row.id;
}

/**
 * Persist a partial record for an email that failed AI analysis.
 */
export async function persistFailure(
  payload: EmailPayload,
  failureReason: string,
  modelName: string,
): Promise<void> {
  const attachmentHashes: string[] = payload.attachments
    .map((a) => a.sha256)
    .filter((h): h is string => h !== null);

  await db
    .insert(emailTriagens)
    .values({
      messageId: payload.message_id,
      threadId: payload.thread_id,
      historyId: payload.history_id || null,
      receivedAt: new Date(payload.received_at),
      sender: payload.sender,
      originalRecipient: payload.original_recipient || null,
      subject: payload.subject,
      bodyHash: payload.body_hash,
      bodyExcerpt: payload.body_excerpt,
      rawBodyStored: false,
      redactionApplied: true,
      categoria: 'irrelevante',
      resumo: `Falha na validacao da resposta da IA: ${failureReason}`,
      haPrazo: false,
      resumoAnexos: [],
      sourceEvidence: [],
      attachmentsHashes: attachmentHashes,
      nivelRisco: 'medio',
      confianca: 'baixa',
      acaoRecomendada: 'Reprocessar e encaminhar para revisao operacional se persistir.',
      exigeValidacaoHumana: true,
      legalBasis: 'avaliacao_humana_necessaria',
      processedPurpose: 'registro de falha tecnica da triagem interna',
      processingVersion: EMAIL_TRIAGE_VERSION,
      modelName,
      status: 'erro_validacao_ia',
    })
    .onConflictDoUpdate({
      target: emailTriagens.messageId,
      set: {
        status: sql`'erro_validacao_ia'`,
        updatedAt: sql`current_timestamp`,
      },
    });
}
