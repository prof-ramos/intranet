import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { handleWebhookEvent } from '@/lib/assinafy/service';
import type { AssinafyWebhookEvent } from '@/lib/assinafy/types';
import {
  createWebhookHandler,
  parseJsonWebhook,
  requireSecretHeader,
} from '@/lib/integrations/webhook-handler';

const logger = createLogger('assinafy:webhook');

// Generous tolerance to accommodate Assinafy retries arriving slightly late.
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 600;
export const dynamic = 'force-dynamic';

export const POST = createWebhookHandler<AssinafyWebhookEvent>({
  authenticate: (request) =>
    requireSecretHeader({
      request,
      secret: process.env.ASSINAFY_WEBHOOK_SECRET,
      headerName: 'X-Webhook-Secret',
      missingSecretResponse: () => {
        logger.error('ASSINAFY_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
      },
      unauthorizedResponse: () => {
        logger.warn('Invalid or missing webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      },
    }),
  parse: parseJsonWebhook,
  handle: async (event) => {
    // Validate required fields
    if (!event.event || !event.object?.id) {
      logger.warn('Missing required fields in webhook event', { event: event.event });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof event.created_at !== 'number') {
      logger.warn('Missing timestamp in webhook event', { event: event.event });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Reject events with timestamps outside the tolerance window
    const skewSeconds = Math.abs(Math.floor(Date.now() / 1000) - event.created_at);
    if (skewSeconds > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
      logger.warn('Webhook event timestamp out of tolerance', {
        event: event.event,
        skewSeconds,
        tolerance: WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const result = await handleWebhookEvent(event);

      if (result.status === 'invalid') {
        logger.warn('Invalid Assinafy webhook event', { event: event.event });
        return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
      }

      if (result.status === 'failed') {
        logger.error('Assinafy webhook processing failed', { event: event.event });
        // Preserved until Plan 037 switches retryable failures to HTTP 500.
        return NextResponse.json({ received: false });
      }

      logger.info('Assinafy webhook handled', { event: event.event, status: result.status });
      return NextResponse.json({ received: true });
    } catch {
      logger.error('Unexpected Assinafy webhook handler failure', { event: event.event });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  onError: () => {
    logger.error('Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  },
});

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
