import { jsonError, jsonOk } from '@/lib/integrations/http';
import { createLogger } from '@/lib/logger';
import { getGmailAccessToken, getHistoryChanges } from '@/lib/email-triage/gmail';
import { processEmail } from '@/lib/email-triage/pipeline';

export const dynamic = 'force-dynamic';

const log = createLogger('gmail-webhook');

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    if (!body.message?.data) {
      log.warn('Invalid Pub/Sub payload — no message.data');
      return jsonOk({ status: 'ignored', reason: 'no_message_data' });
    }

    const decoded = Buffer.from(body.message.data, 'base64url').toString('utf-8');
    const { emailAddress, historyId } = JSON.parse(decoded);

    log.info('Gmail Pub/Sub notification received.', {
      emailAddress: emailAddress ? '***@***' : null,
      historyId,
    });

    if (!historyId) {
      log.warn('No historyId in decoded payload');
      return jsonOk({ status: 'ignored', reason: 'no_history_id' });
    }

    const accessToken = await getGmailAccessToken();

    const messages = await getHistoryChanges(accessToken, historyId);

    if (messages.length === 0) {
      log.info('No new messages to process.');
      return jsonOk({ status: 'ok', processed: 0 });
    }

    log.info(`Processing ${messages.length} new messages...`);

    const results = [];
    for (const msg of messages) {
      const result = await processEmail(accessToken, msg.id);
      results.push(result);
    }

    const processed = results.filter((r) => r.success).length;
    const errors = results.filter((r) => !r.success).length;
    const elapsed = Math.round(performance.now() - startTime);

    log.info('Gmail webhook processing completed.', {
      processed,
      errors,
      duration_ms: elapsed,
    });

    return jsonOk({
      status: 'ok',
      processed,
      errors,
      duration: `${elapsed}ms`,
    });
  } catch (error) {
    const elapsed = Math.round(performance.now() - startTime);
    log.error('Gmail webhook processing failed.', {
      error: error instanceof Error ? error.message : String(error),
      duration_ms: elapsed,
    });

    return jsonError(500, 'invalid_request', 'Gmail webhook processing failed.');
  }
}

export async function GET(_request: Request) {
  return jsonOk({ status: 'healthy', service: 'gmail-webhook' });
}
