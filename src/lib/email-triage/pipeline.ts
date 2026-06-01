/**
 * Email triage pipeline orchestrator.
 *
 * Ties Gmail fetch → Gemini analysis → DB persist → correlation → labeling
 * into a single pipeline. Each email is processed independently (error isolation).
 *
 * Exports:
 *  - processEmail()   — full per-email pipeline
 *  - processBatch()   — concurrent batch with semaphore (max 3)
 *  - summarizeResults() — structured summary string
 */
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { emailTriagens, emailStatusTriagem as _emailStatusTriagem } from '@/lib/db/schema/email-triage';
import { admins } from '@/lib/db/schema';
import { piiBlindIndex } from '@/lib/crypto/pii';
import { findAssociateByPrimaryEmailHash } from '@/lib/associates/repository';
import { correlate, type CorrelationContext, type CorrelationAction } from './correlate';
import { createLogger } from '@/lib/logger';
import { eq, and as _and, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import {
  getGmailAccessToken,
  ensureLabel,
  fetchUnreadMessages,
  getMessage,
  markAsTriaged,
  getHeader,
} from './gmail';
import type { GmailMessage } from './gmail';
import {
  extractTextAndAttachments,
  analyzeEmail,
  buildPersistedExcerpt,
  redactExcerpt,
} from './analyzer';
import type { EmailPayload, EmailTriageResult } from './schema';
import { EMAIL_TRIAGE_VERSION } from './system-prompt';
import {
  insertNote,
  getOpenConsultationsByAssociate,
  touchConsultationInteraction,
} from '@/lib/juridico/repository';
import { markOverdueTriages } from './repository';
import { createNotificationFromEvent } from '@/lib/notifications/service';
import { extractSenderEmailForCorrelation } from './address';

const log = createLogger('email-triage');

// ─── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_CONCURRENCY = 3;

// ─── Exported Types ──────────────────────────────────────────────────────

export interface ProcessEmailResult {
  success: boolean;
  messageId: string;
  categoria?: string;
  error?: string;
}

export interface BatchResult {
  processed: number;
  errors: number;
  skipped: number;
  results: ProcessEmailResult[];
}

// ─── System Bot User ─────────────────────────────────────────────────────

let _systemBotUserId: number | null = null;

/**
 * Find or create the system bot admin user ('Sistema de Triagem').
 *
 * The bot user is used as `createdBy` for legal notes created by the
 * correlation engine. Created once per process lifetime; cached in memory.
 */
async function getSystemBotUserId(): Promise<number> {
  if (_systemBotUserId !== null) return _systemBotUserId;

  const systemBot = await db
    .select()
    .from(admins)
    .where(eq(admins.name, 'Sistema de Triagem'))
    .limit(1);

  if (systemBot.length > 0) {
    _systemBotUserId = systemBot[0].id;
    return _systemBotUserId;
  }

  const [created] = await db
    .insert(admins)
    .values({
      name: 'Sistema de Triagem',
      email: 'sistema-triagem@asof.local',
      passwordHash: `__SYSTEM_BOT__${createHash('sha256').update('sistema-triagem@asof.local').digest('hex').slice(0, 16)}`,
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
    })
    .onConflictDoNothing()
    .returning({ id: admins.id });

  if (created) {
    _systemBotUserId = created.id;
    log.info('Created system bot user for triage.', { userId: created.id });
    return created.id;
  }

  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, 'sistema-triagem@asof.local'))
    .limit(1);

  if (existing.length > 0) {
    _systemBotUserId = existing[0].id;
    return existing[0].id;
  }

  throw new Error('Failed to create or find system bot user.');
}

// ─── DB Persistence ──────────────────────────────────────────────────────

/**
 * Build the common insert/update values for email_triagens from a triage
 * result and its payload.
 */
function buildTriagemValues(
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

async function persistTriage(
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
async function persistFailure(
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
      resumo: 'Falha na validacao da resposta da IA; analise valida nao foi salva.',
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

// ─── Correlation Helpers ─────────────────────────────────────────────────

async function buildCorrelationContext(
  payload: EmailPayload,
): Promise<CorrelationContext> {
  const senderEmail = await extractSenderEmailForCorrelation(payload.sender);

  if (!senderEmail) return { associate: null, consultations: [] };

  const emailHash = piiBlindIndex(senderEmail);
  const associate = await findAssociateByPrimaryEmailHash(emailHash);

  if (!associate) return { associate: null, consultations: [] };

  const consultations = await getOpenConsultationsByAssociate(associate.id);

  return { associate: { id: associate.id }, consultations };
}

async function applyCorrelationActions(
  actions: CorrelationAction[],
): Promise<void> {
  for (const action of actions) {
    if (action.type === 'insert_note') {
      const botUserId = await getSystemBotUserId();
      await db.transaction(async (tx) => {
        await insertNote(
          {
            entityType: 'consultation',
            entityId: action.consultationId,
            content: action.content,
            createdBy: botUserId,
            isEscritorioResponse: false,
          },
          tx,
        );
        await touchConsultationInteraction(action.consultationId, tx);
      });
      log.info('Nota criada por correlação de triagem.', {
        consultationId: action.consultationId,
      });
    } else {
      log.info('Correlação ignorada.', { reason: action.reason });
    }
  }
}

// ─── processEmail ────────────────────────────────────────────────────────

/**
 * Full per-email pipeline.
 *
 * Steps:
 *  1. Fetch full message via Gmail API
 *  2. Extract text and attachments
 *  3. Build EmailPayload (PII-redacted excerpts, SHA256 hash)
 *  4. Call Gemini analysis
 *  5. Persist to `email_triagens` (upsert on conflict message_id)
 *  6. Run correlation engine against existing consultations
 *  7. Mark email with `asof-triaged` label in Gmail
 *
 * Error isolation: if a step fails, the error is captured in the returned
 * `ProcessEmailResult` — it does NOT throw.
 */
export async function processEmail(
  accessToken: string,
  messageId: string,
  options?: { userId?: string },
): Promise<ProcessEmailResult> {
  const userId = options?.userId ?? 'me';

  log.info('Processing email...', { messageId });

  // ── Step 1: Fetch message ────────────────────────────────────────────
  let message: GmailMessage;
  try {
    message = await getMessage(accessToken, messageId, userId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Failed to fetch message from Gmail.', { messageId, error });
    return { success: false, messageId, error: `Gmail fetch failed: ${error}` };
  }

  // ── Step 2: Extract text & attachments ────────────────────────────────
  let text: string;
  let attachmentInfos: import('./analyzer').AttachmentInfo[];
  try {
    const extracted = extractTextAndAttachments(message);
    text = extracted.text;
    attachmentInfos = extracted.attachments;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Failed to extract text and attachments.', { messageId, error });
    return { success: false, messageId, error: `Extraction failed: ${error}` };
  }

  // ── Step 3: Build EmailPayload ─────────────────────────────────────────
  const redactedText = redactExcerpt(text);

  const attachments = attachmentInfos.map((att) => ({
    filename: att.filename,
    mime_type: att.mimeType ?? null,
    sha256: att.sha256 ?? null,
    resumo: att.textExcerpt ?? '',
    ha_prazo_no_anexo: false,
    trechos_relevantes: [] as string[],
  }));

  const payload: EmailPayload = {
    message_id: message.id as string,
    thread_id: message.threadId as string,
    history_id: (message.historyId as string) ?? '',
    received_at: getHeader(message, 'Date') ?? new Date().toISOString(),
    sender: getHeader(message, 'From') ?? '',
    original_recipient:
      getHeader(message, 'Delivered-To') ?? getHeader(message, 'To') ?? '',
    subject: getHeader(message, 'Subject') ?? '(sem assunto)',
    body_hash: createHash('sha256').update(redactedText).digest('hex'),
    body_excerpt: buildPersistedExcerpt(redactedText),
    analysis_excerpt: redactedText.slice(0, 4000),
    attachments: attachments as EmailPayload['attachments'],
  };

  // ── Step 4: Gemini analysis ───────────────────────────────────────────
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = 'GEMINI_API_KEY nao configurada.';
    log.error(error);
    return { success: false, messageId, error };
  }

  let triageResult: EmailTriageResult;
  try {
    triageResult = await analyzeEmail(payload, apiKey, DEFAULT_MODEL);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Gemini analysis failed, persisting failure.', {
      messageId,
      error,
    });

    // Persist failure to DB with erro_validacao_ia status
    try {
      await persistFailure(payload, error, DEFAULT_MODEL);
    } catch (dbErr) {
      log.error('Failed to persist analysis failure to DB.', {
        messageId,
        dbError: String(dbErr),
      });
    }

    return { success: false, messageId, error: `Analysis failed: ${error}` };
  }

  // ── Step 5: Persist to DB ─────────────────────────────────────────────
  let triageId: number;
  try {
    triageId = await persistTriage(payload, triageResult, DEFAULT_MODEL, null);
    log.info('Triage result persisted.', {
      messageId,
      categoria: triageResult.categoria,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Failed to persist triage result.', { messageId, error });
    return { success: false, messageId, error: `DB persist failed: ${error}` };
  }

  if (triageResult.exige_validacao_humana) {
    try {
      const [botUser] = await db
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.name, 'Sistema de Triagem'))
        .limit(1);

      const actorId = botUser?.id ?? 1;

      const adminUsers = await db
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.role, 'admin'));

      const results = await Promise.allSettled(
        adminUsers.map((admin) =>
          createNotificationFromEvent('email_triage_pending', {
            recipientId: admin.id,
            actorId,
            title: 'Nova triagem aguardando revisão operacional',
            message: `E-mail "${payload.subject}" de ${payload.sender} foi classificado como ${triageResult.categoria} (risco ${triageResult.nivel_risco}) e exige revisão operacional.`,
            href: `/app/email-triage/${triageId}`,
            entityType: 'email_triagem',
            entityId: triageId,
          }),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        log.warn(`${failed.length} triage notifications failed (non-fatal).`);
      }
    } catch (nErr) {
      log.warn('Failed to notify admins of new triage (non-fatal).', { error: String(nErr) });
    }
  }

  // ── Step 6: Correlation engine ────────────────────────────────────────
  // Skipped when operational review is required; automatic notes are only
  // created for low-ambiguity control of existing open demands.
  if (!triageResult.exige_validacao_humana) {
    try {
      const context = await buildCorrelationContext(payload);
      const actions = correlate(payload, triageResult, context);
      await applyCorrelationActions(actions);
    } catch (err) {
      log.warn('Correlation engine failed (non-fatal).', {
        messageId,
        error: String(err),
      });
    }
  }

  // ── Step 7: Mark as triaged ───────────────────────────────────────────
  try {
    const labelId = await ensureLabel(accessToken, userId);
    await markAsTriaged(accessToken, messageId, labelId, userId);
    log.info('Email marked as triaged.', { messageId });
  } catch (err) {
    // Non-fatal: the triage result is already persisted; labeling can be
    // retried on the next batch run.
    log.warn('Failed to mark email as triaged (non-fatal).', {
      messageId,
      error: String(err),
    });
  }

  return {
    success: true,
    messageId,
    categoria: triageResult.categoria,
  };
}

// ─── processBatch ────────────────────────────────────────────────────────

/**
 * Process a batch of unread emails with concurrency control.
 *
 * Steps:
 *  1. Get access token via Gmail OAuth
 *  2. Ensure `asof-triaged` label exists
 *  3. Fetch unread messages matching the default query
 *  4. Process each message via `processEmail()` (max 3 concurrent)
 *  5. Collect and return results
 *
 * If the entire batch setup fails (token, label, fetch) this function
 * throws — individual email failures are captured per result.
 */
export async function processBatch(
  options?: { userId?: string; limit?: number },
): Promise<BatchResult> {
  const userId = options?.userId ?? 'me';
  const maxResults = options?.limit;

  log.info('Starting batch triage...', { userId, maxResults });

  // ── Step 0: Mark overdue triages ──────────────────────────────────
  try {
    const overdueCount = await markOverdueTriages();
    if (overdueCount > 0) {
      log.info(`Marked ${overdueCount} triagens as vencido (deadline expired).`);
    }
  } catch (err) {
    log.warn('Failed to mark overdue triages (non-fatal).', { error: String(err) });
  }

  // ── Step 1: Access token ────────────────────────────────────────────
  let accessToken: string;
  try {
    accessToken = await getGmailAccessToken();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Failed to obtain Gmail access token.', { error });
    throw new Error(`Cannot start batch: ${error}`);
  }

  // ── Step 2: Ensure label ────────────────────────────────────────────
  try {
    await ensureLabel(accessToken, userId);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Failed to ensure asof-triaged label.', { error });
    throw new Error(`Cannot start batch: ${error}`);
  }

  // ── Step 3: Fetch unread messages ─────────────────────────────────────
  let messages: Array<{ id: string; threadId: string }>;
  try {
    messages = await fetchUnreadMessages(accessToken, {
      userId,
      maxResults,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.error('Failed to fetch unread messages.', { error });
    throw new Error(`Cannot start batch: ${error}`);
  }

  if (messages.length === 0) {
    log.info('No unread messages to process.');
    return { processed: 0, errors: 0, skipped: 0, results: [] };
  }

  log.info(`Batch: ${messages.length} messages to process.`, {
    count: messages.length,
  });

  // ── Step 4: Process with concurrency limit (max 3) ────────────────────
  const results: ProcessEmailResult[] = [];

  for (let i = 0; i < messages.length; i += MAX_CONCURRENCY) {
    const chunk = messages.slice(i, i + MAX_CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map((msg) => processEmail(accessToken, msg.id, { userId })),
    );

    for (const r of chunkResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        // processEmail's own catch guarantees no unhandled rejections,
        // but guard against truly unexpected errors.
        results.push({
          success: false,
          messageId: 'unknown',
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }
  }

  // ── Step 5: Aggregate results ────────────────────────────────────────
  const processed = results.filter((r) => r.success).length;
  const errors = results.filter((r) => !r.success).length;

  log.info('Batch triage completed.', { total: results.length, processed, errors });

  return { processed, errors, skipped: 0, results };
}

// ─── summarizeResults ────────────────────────────────────────────────────

/**
 * Generate a structured summary string from an array of processing results.
 *
 * Useful for logging, notification messages, or response bodies.
 */
export function summarizeResults(results: ProcessEmailResult[]): string {
  const total = results.length;
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  // Group successes by category
  const byCategory = new Map<string, number>();
  for (const r of successes) {
    const cat = r.categoria ?? 'unknown';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }

  const lines: string[] = [
    'Processamento de E-mails - Resumo',
    '---',
    `Total: ${total}`,
    `Processados: ${successes.length}`,
    `Erros: ${failures.length}`,
  ];

  if (byCategory.size > 0) {
    lines.push('');
    lines.push('Por Categoria:');
    for (const [cat, count] of byCategory) {
      lines.push(`  ${cat}: ${count}`);
    }
  }

  if (failures.length > 0) {
    lines.push('');
    lines.push('Erros:');
    for (const f of failures) {
      lines.push(`  ${f.messageId}: ${f.error ?? 'Erro desconhecido'}`);
    }
  }

  return lines.join('\n');
}
