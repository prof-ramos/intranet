/**
 * Gmail API client for email triage pipeline.
 *
 * Uses raw fetch() — no googleapis dependency.
 * Handles 401 (expired token) and 429 (rate limit) errors.
 * All state comes from env vars (no file-based token storage).
 */
import { createLogger } from '@/lib/logger';
import { sanitizePiiValue } from '@/lib/sanitize-pii';

const log = createLogger('email-triage/gmail');

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const TRIAGED_LABEL_NAME = 'asof-triaged';
const DEFAULT_QUERY = 'to:controller@asof.org.br -label:asof-triaged';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ─── Gmail message header helper ────────────────────────────────────────

/**
 * Extract a header value by name from a Gmail message payload.
 */
export interface GmailMessage {
  id?: string;
  threadId?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string }; filename?: string }>;
  };
  snippet?: string;
  [key: string]: unknown;
}

function getHeader(message: GmailMessage | null, name: string): string | null {
  const headers = message?.payload?.headers ?? [];
  const lower = name.toLowerCase();
  for (const h of headers) {
    if (h.name?.toLowerCase() === lower) return h.value;
  }
  return null;
}

// ─── Rate-limited fetch with exponential backoff ────────────────────────

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Perform a fetch with 429 retry (exponential backoff) and 401 handling.
 *
 * @throws If the request fails after all retries, or on 401.
 */
async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
      });

      if (response.status === 401) {
        const body = await response.text().catch(() => '');
        log.error('Gmail API returned 401 — refresh token likely expired.', {
          status: response.status,
          bodyPreview: body.slice(0, 200),
        });
        throw new Error(
          'Token de acesso do Gmail expirado. Execute o script de bootstrap para renovar as credenciais.',
        );
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        log.warn(`Gmail API rate limited (429). Retrying in ${backoffMs}ms...`, {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          backoffMs,
        });
        await sleep(backoffMs);
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Gmail API error: ${response.status} ${response.statusText} — ${body.slice(0, 500)}`,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Token de acesso')) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES) {
        log.warn(`Gmail API request failed. Retrying...`, {
          attempt: attempt + 1,
          error: lastError.message,
        });
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error('Gmail API request failed after retries.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Token management ───────────────────────────────────────────────────

/**
 * Exchange the stored refresh token for a fresh access token.
 *
 * POSTs to https://oauth2.googleapis.com/token with client credentials.
 *
 * @throws If the refresh token is invalid/expired.
 */
export async function getGmailAccessToken(): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    log.error('GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN not set.');
    throw new Error(
      'Credenciais Gmail não configuradas. Verifique GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN.',
    );
  }

  log.info('Exchanging refresh token for access token...');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    log.error('Failed to exchange refresh token for access token.', {
      status: response.status,
      bodyPreview: body.slice(0, 300),
    });

    if (response.status === 400 || response.status === 401) {
      throw new Error(
        'Refresh token do Gmail expirado ou inválido. Execute o script de bootstrap para reautenticar.',
      );
    }

    throw new Error(
      `Falha ao obter access token do Gmail: ${response.status} — ${body.slice(0, 500)}`,
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    log.error('Token endpoint returned no access_token.', {
      responseKeys: Object.keys(data),
    });
    throw new Error('Resposta do token endpoint não contém access_token.');
  }

  log.info('Gmail access token obtained successfully.');
  return data.access_token as string;
}

// ─── Label management ───────────────────────────────────────────────────

/**
 * Get or create the 'asof-triaged' label for the given user.
 *
 * First lists existing labels; if the label already exists returns its ID.
 * Otherwise creates it and returns the new label ID.
 */
export async function ensureLabel(
  accessToken: string,
  userId: string = 'me',
): Promise<string> {
  log.info('Ensuring asof-triaged label exists...');

  // Try listing existing labels
  const listUrl = `${GMAIL_API_BASE}/${userId}/labels`;
  const listResponse = await fetchWithRetry(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const listData = await listResponse.json();
  const labels: Array<{ id: string; name: string }> = listData.labels ?? [];

  for (const label of labels) {
    if (label.name === TRIAGED_LABEL_NAME) {
      log.info('asof-triaged label found.', { labelId: label.id });
      return label.id;
    }
  }

  // Label not found — create it
  log.info('asof-triaged label not found. Creating...');
  const createUrl = `${GMAIL_API_BASE}/${userId}/labels`;
  const createResponse = await fetchWithRetry(createUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      name: TRIAGED_LABEL_NAME,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  });

  const created = await createResponse.json();

  if (!created.id) {
    log.error('Failed to create asof-triaged label — no ID returned.', {
      responseKeys: Object.keys(created),
    });
    throw new Error('Falha ao criar label asof-triaged no Gmail.');
  }

  log.info('asof-triaged label created.', { labelId: created.id });
  return created.id as string;
}

// ─── Message listing ────────────────────────────────────────────────────

/**
 * Fetch unread Gmail messages that match the given query.
 *
 * Default query: 'to:controller@asof.org.br -label:asof-triaged'
 * Returns a minimal list of { id, threadId }.
 */
export async function fetchUnreadMessages(
  accessToken: string,
  options: {
    userId?: string;
    query?: string;
    maxResults?: number;
  } = {},
): Promise<Array<{ id: string; threadId: string }>> {
  const userId = options.userId ?? 'me';
  const query = options.query ?? DEFAULT_QUERY;
  const maxResults =
    options.maxResults ??
    (process.env.GMAIL_MAX_EMAILS_PER_RUN
      ? Number(process.env.GMAIL_MAX_EMAILS_PER_RUN)
      : 10);

  log.info('Fetching unread messages...', { query, maxResults });

  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const url = `${GMAIL_API_BASE}/${userId}/messages?${params.toString()}`;

  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  const messages: Array<{ id: string; threadId: string }> = data.messages ?? [];

  log.info(`Found ${messages.length} unread messages.`, { count: messages.length });
  return messages;
}

// ─── Single message retrieval ───────────────────────────────────────────

/**
 * Fetch a full Gmail message by ID.
 *
 * Uses 'format=full' to get headers, body, and attachments.
 * Returns the raw Gmail API message object.
 */
export async function getMessage(
  accessToken: string,
  messageId: string,
  userId: string = 'me',
): Promise<GmailMessage> {
  log.info('Fetching message...', {
    messageId: sanitizePiiValue(messageId) as string,
  });

  const url = `${GMAIL_API_BASE}/${userId}/messages/${messageId}?format=full`;

  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const message = await response.json();

  if (!message.id) {
    log.error('Gmail API returned invalid message object — no id.', {
      responseKeys: Object.keys(message),
    });
    throw new Error(`Resposta inválida da API Gmail para messageId=${messageId}.`);
  }

  // Log safe headers only (subject, date, from)
  const subject = getHeader(message, 'Subject');
  const from = getHeader(message, 'From');
  const date = getHeader(message, 'Date');
  log.info('Message fetched.', {
    messageId: message.id,
    subject: subject?.slice(0, 80),
    from: from ? sanitizePiiValue(from.slice(0, 80)) : null,
    date,
  });

  return message;
}

// ─── Single message label ───────────────────────────────────────────────

/**
 * Add the 'asof-triaged' label to a single message.
 */
export async function markAsTriaged(
  accessToken: string,
  messageId: string,
  labelId: string,
  userId: string = 'me',
): Promise<void> {
  const url = `${GMAIL_API_BASE}/${userId}/messages/${messageId}/modify`;

  log.info('Marking message as triaged...', { messageId: sanitizePiiValue(messageId) });

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });

  // Consume response body to avoid hanging connections
  await response.text();

  log.info('Message marked as triaged.', { messageId });
}

// ─── Batch message label ────────────────────────────────────────────────

/**
 * Batch-mark multiple messages with the 'asof-triaged' label.
 *
 * Each message is labelled independently: an error on one message does
 * not prevent the others from being processed.
 */
export async function batchMarkAsTriaged(
  accessToken: string,
  messageIds: string[],
  labelId: string,
  userId: string = 'me',
): Promise<void> {
  if (messageIds.length === 0) {
    log.info('batchMarkAsTriaged: no messages to mark.');
    return;
  }

  log.info(`Batch-marking ${messageIds.length} messages as triaged...`, {
    count: messageIds.length,
  });

  const results = await Promise.allSettled(
    messageIds.map((id) =>
      markAsTriaged(accessToken, id, labelId, userId).then(() => id),
    ),
  );

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled',
  ).length;
  const failed = results.filter(
    (r) => r.status === 'rejected',
  ).length;

  if (failed > 0) {
    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message ?? String(r.reason));
    log.warn(
      `Batch mark: ${succeeded} succeeded, ${failed} failed.`,
      { failedCount: failed, errors: failures.slice(0, 5) },
    );
  } else {
    log.info(`Batch mark: all ${succeeded} messages marked as triaged.`);
  }

  if (failed > 0 && succeeded === 0) {
    throw new Error(
      `Falha ao marcar mensagens como triadas: todas as ${failed} falharam.`,
    );
  }
}

// ─── Push Notifications (Pub/Sub) ────────────────────────────────────

/**
 * Register a Gmail push notification watch.
 *
 * POSTs to https://gmail.googleapis.com/gmail/v1/users/me/watch
 * with the configured Pub/Sub topic.
 *
 * The watch expires after 7 days — renew weekly via cron.
 */
export async function watchGmail(
  accessToken: string,
  topicName: string,
  userId: string = 'me',
): Promise<{ historyId: string; expiration: string }> {
  log.info('Registering Gmail watch...', { topicName });

  const url = `${GMAIL_API_BASE}/${userId}/watch`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    }),
  });

  const data = await response.json();

  if (!data.historyId) {
    log.error('Gmail watch returned no historyId.', {
      responseKeys: Object.keys(data),
    });
    throw new Error('Gmail watch não retornou historyId.');
  }

  log.info('Gmail watch registered.', {
    historyId: data.historyId,
    expiration: data.expiration,
  });

  return {
    historyId: data.historyId,
    expiration: data.expiration,
  };
}

/**
 * Fetch changes since a given historyId using the Gmail history.list API.
 *
 * Returns the list of message IDs that were added or modified.
 */
export async function getHistoryChanges(
  accessToken: string,
  startHistoryId: string,
  userId: string = 'me',
): Promise<Array<{ id: string; threadId: string }>> {
  log.info('Fetching history changes...', { startHistoryId });

  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: 'messageAdded',
  });

  const url = `${GMAIL_API_BASE}/${userId}/history?${params.toString()}`;
  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  const messages: Array<{ id: string; threadId: string }> = [];

  if (data.history) {
    for (const record of data.history) {
      if (record.messagesAdded) {
        for (const msg of record.messagesAdded) {
          if (msg.message?.id && msg.message?.threadId) {
            messages.push({
              id: msg.message.id,
              threadId: msg.message.threadId,
            });
          }
        }
      }
    }
  }

  log.info(`History changes: ${messages.length} new messages.`, {
    count: messages.length,
  });

  return messages;
}

// ─── Re-export helper for external use ──────────────────────────────────

export { getHeader, TRIAGED_LABEL_NAME, DEFAULT_QUERY };
