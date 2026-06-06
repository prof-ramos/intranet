import { jsonError, jsonOk } from '@/lib/integrations/http';
import { createLogger } from '@/lib/logger';
import { getGmailAccessToken, getHistoryChanges } from '@/lib/email-triage/gmail';
import { processEmail } from '@/lib/email-triage/pipeline';
import { createWebhookHandler, parseJsonWebhook } from '@/lib/integrations/webhook-handler';

export const dynamic = 'force-dynamic';

const log = createLogger('gmail-webhook');

async function processWebhookAsync(historyId: string) {
  try {
    const accessToken = await getGmailAccessToken();
    const messages = await getHistoryChanges(accessToken, historyId);

    if (messages.length === 0) {
      log.info('No new messages to process.');
      return;
    }

    log.info(`Processing ${messages.length} new messages...`);

    const results = await Promise.allSettled(
      messages.map((msg) => processEmail(accessToken, msg.id)),
    );

    const processed = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length;
    const errors = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success),
    ).length;

    log.info('Gmail webhook processing completed.', { processed, errors });
  } catch (error) {
    log.error('Gmail webhook processing failed.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const POST = createWebhookHandler<{
  message?: { data?: string };
}>({
  parse: parseJsonWebhook,
  catchHandleErrors: true,
  handle: async (body) => {
    if (!body.message?.data) {
      log.warn('Invalid Pub/Sub payload — no message.data');
      return jsonOk({ status: 'ignored', reason: 'no_message_data' });
    }

    const decoded = Buffer.from(body.message.data, 'base64url').toString('utf-8');
    const { historyId } = JSON.parse(decoded);

    log.info('Gmail Pub/Sub notification received.', { historyId });

    if (!historyId) {
      log.warn('No historyId in decoded payload');
      return jsonOk({ status: 'ignored', reason: 'no_history_id' });
    }

    processWebhookAsync(historyId).catch((err) => {
      log.error('Async processing failed.', { error: String(err) });
    });

    return jsonOk({ status: 'accepted', historyId });
  },
  onError: (error) => {
    log.error('Gmail webhook failed.', {
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonError(500, 'invalid_request', 'Gmail webhook failed.');
  },
});

export async function GET(_request: Request) {
  return jsonOk({ status: 'healthy', service: 'gmail-webhook' });
}
