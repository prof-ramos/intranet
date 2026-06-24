import { NextResponse } from 'next/server';
import { and, eq, gt, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { handleWebhookEvent } from '@/lib/assinafy/service';
import type { AssinafyWebhookEvent } from '@/lib/assinafy/types';
import {
  createWebhookHandler,
  parseJsonWebhook,
  requireSecretHeader,
} from '@/lib/integrations/webhook-handler';
import { db } from '@/lib/db';
import { integrationSignatureNonces } from '@/lib/db/schema';

const logger = createLogger('assinafy:webhook');

// Generous tolerance to accommodate Assinafy retries arriving slightly late.
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 600;
// Nonces expire after 24 h; combined with the timestamp check this covers the full replay window.
const WEBHOOK_NONCE_TTL_MS = 24 * 60 * 60 * 1000;

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

    if (typeof event.id !== 'number' || typeof event.created_at !== 'number') {
      logger.warn('Missing event ID or timestamp in webhook event', { event: event.event });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Reject events with timestamps outside the tolerance window
    const skewSeconds = Math.abs(Math.floor(Date.now() / 1000) - event.created_at);
    if (skewSeconds > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
      logger.warn('Webhook event timestamp out of tolerance', {
        eventId: event.id,
        skewSeconds,
        tolerance: WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Idempotency: return 200 immediately if this event was already successfully processed
    const nonceKey = 'assinafy';
    const nonceValue = String(event.id);
    const existing = await db
      .select({ id: integrationSignatureNonces.id })
      .from(integrationSignatureNonces)
      .where(
        and(
          eq(integrationSignatureNonces.keyId, nonceKey),
          eq(integrationSignatureNonces.signature, nonceValue),
          gt(integrationSignatureNonces.expiresAt, sql`now()`),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      logger.info('Duplicate webhook event, already processed', { eventId: event.id });
      return NextResponse.json({ received: true });
    }

    // Process event (return 500 on failure so Assinafy can retry)
    try {
      await handleWebhookEvent(event);
      logger.info('Webhook processed', {
        eventId: event.id,
        event: event.event,
        documentId: event.object.id,
      });

      // Record nonce only after successful processing so retries can proceed on failure
      const expiresAt = new Date(Date.now() + WEBHOOK_NONCE_TTL_MS);
      await db
        .insert(integrationSignatureNonces)
        .values({ keyId: nonceKey, signature: nonceValue, expiresAt })
        .onConflictDoNothing();

      return NextResponse.json({ received: true });
    } catch (error) {
      logger.error('Webhook handler error', {
        eventId: event.id,
        event: event.event,
        error: error instanceof Error ? error.message : String(error),
      });
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
