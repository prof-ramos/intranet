/**
 * Email triage module — Gmail ingestion, Gemini analysis, correlation, and
 * persistence for the Controller de E-mails ASOF pipeline.
 *
 * Import examples:
 *   import { processEmail, analyzeEmail, persistTriage } from '@/lib/email-triage'
 *   import type { EmailPayload, EmailTriageResult } from '@/lib/email-triage'
 */

// ── Schemas & types ─────────────────────────────────────────────────────────
export {
  CATEGORIAS,
  CONFIANCA,
  NIVEL_RISCO,
  TIPO_PRAZO,
  RESPONSAVEL,
  LEGAL_BASIS,
  SOURCE_TIPO,
  attachmentSummarySchema,
  sourceEvidenceSchema,
  emailPayloadSchema,
  emailTriageResultSchema,
} from "./schema";
export type {
  AttachmentSummary,
  SourceEvidence,
  EmailPayload,
  EmailTriageResult,
} from "./schema";

// ── Status enums & helpers ────────────────────────────────────────────────────
export {
  EMAIL_TRIAGE_STATUSES,
  EMAIL_TRIAGE_CATEGORIAS,
  EMAIL_TRIAGE_RISCOS,
  EMAIL_TRIAGE_STATUS_LABELS,
  EMAIL_TRIAGE_CATEGORIA_LABELS,
  EMAIL_TRIAGE_RISCO_LABELS,
  EMAIL_TRIAGE_STATUS_FILTER_OPTIONS,
  EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS,
  EMAIL_TRIAGE_RISCO_FILTER_OPTIONS,
  isEmailTriageStatus,
  isEmailTriageCategoria,
  isEmailTriageRisco,
  getStatusLabel,
  getCategoriaLabel,
  getRiscoLabel,
  getStatusBadgeClass,
  getCategoriaBadgeClass,
  getRiscoBadgeClass,
} from "./status";
export type {
  EmailTriageStatus,
  EmailTriageCategoria,
  EmailTriageRisco,
} from "./status";

// ── System prompt ─────────────────────────────────────────────────────────────
export { SYSTEM_PROMPT, EMAIL_TRIAGE_VERSION } from "./system-prompt";

// ── Sender email extraction ───────────────────────────────────────────────────
export { extractSenderEmailForCorrelation } from "./address";

// ── Gmail API client ──────────────────────────────────────────────────────────
export {
  getGmailAccessToken,
  ensureLabel,
  fetchUnreadMessages,
  getMessage,
  markAsTriaged,
  batchMarkAsTriaged,
  watchGmail,
  getHistoryChanges,
  getHeader,
  TRIAGED_LABEL_NAME,
  DEFAULT_QUERY,
} from "./gmail";
export type { GmailMessage } from "./gmail";

// ── PII redaction & Gemini analysis ───────────────────────────────────────────
export {
  redactExcerpt,
  htmlToText,
  buildModelInput,
  buildPersistedExcerpt,
  extractTextAndAttachments,
  analyzeEmail,
} from "./analyzer";
export type { AttachmentInfo } from "./analyzer";

// ── DB persistence ────────────────────────────────────────────────────────────
export { buildTriagemValues, persistTriage, persistFailure } from "./persister";

// ── Correlation engine ────────────────────────────────────────────────────────
export { correlate } from "./correlate";
export type { CorrelationContext, CorrelationAction } from "./correlate";

// ── Apply correlation actions ─────────────────────────────────────────────────
export { applyCorrelationActions } from "./correlation-actions";

// ── Build correlation context ─────────────────────────────────────────────────
export { buildCorrelationContext } from "./correlation-context";

// ── Admin notifications ───────────────────────────────────────────────────────
export { notifyNeedsValidation } from "./notifier";
export type { NotifyResult } from "./notifier";

// ── Pipeline orchestrator ─────────────────────────────────────────────────────
export { processEmail, processBatch, summarizeResults } from "./pipeline";
export type { ProcessEmailResult, BatchResult } from "./pipeline";

// ── Data access (repository) ──────────────────────────────────────────────────
export {
  normalizeTriagesPagination,
  countTriagesByStatus,
  countTriagesAguardandoValidacao,
  countTriagesVencidas,
  countTriagesAltoRisco,
  getTriagesPaginated,
  getTriageById,
  updateTriageStatus,
  addTriageObservacao,
  updateTriageDeadline,
  markOverdueTriages,
} from "./repository";
export type { TriageListItem, GetTriagesFilters, TriageDetail } from "./repository";

// ── UI search params ──────────────────────────────────────────────────────────
export { parseEmailTriageSearchParams } from "./search-params";
export type { EmailTriageSearchParams } from "./search-params";
