/**
 * Email triage pipeline — barrel export.
 *
 * Module layout:
 *   schema.ts      — Zod schemas + TypeScript types
 *   system-prompt.ts — embedded system prompt constant
 *   gmail.ts       — Gmail API client (raw fetch)
 *   analyzer.ts    — PII redaction, HTML-to-text, Gemini analysis
 *   pipeline.ts    — Orchestrator (fetch → analyze → persist → label)
 */

export * from './schema';
export { SYSTEM_PROMPT, EMAIL_TRIAGE_VERSION } from './system-prompt';
export {
  getGmailAccessToken,
  ensureLabel,
  fetchUnreadMessages,
  getMessage,
  markAsTriaged,
  batchMarkAsTriaged,
} from './gmail';
export {
  redactExcerpt,
  htmlToText,
  buildModelInput,
  buildPersistedExcerpt,
  extractTextAndAttachments,
  analyzeEmail,
} from './analyzer';
export { processEmail, processBatch, summarizeResults } from './pipeline';
