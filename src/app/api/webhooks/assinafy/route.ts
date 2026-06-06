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

    // Process event (idempotent ack — always return 200)
    try {
      await handleWebhookEvent(event);
      logger.info('Webhook processed', {
        eventId: event.id,
        event: event.event,
        documentId: event.object.id,
      });
    } catch (error) {
      logger.error('Webhook handler error (acknowledged)', {
        eventId: event.id,
        event: event.event,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({ received: true });
  },
  onError: () => {
    logger.error('Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  },
});

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
