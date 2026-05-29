import 'server-only';

import { createHash, createHmac } from 'node:crypto';
import type { IntegrationSignatureInput } from '@/lib/integrations/types';
import { INTEGRATION_HEADER_NAMES } from '@/lib/integrations/types';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Build the canonical payload string for HMAC signing.
 * Format: METHOD\npathWithQuery\ntimestamp\nsha256(body)
 */
export function buildCanonicalSignaturePayload(input: IntegrationSignatureInput): string {
  return [
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    sha256Hex(input.body),
  ].join('\n');
}

/**
 * Sign an integration request payload using HMAC-SHA256.
 */
export function signIntegrationRequest(input: IntegrationSignatureInput, secret: string): string {
  const canonicalPayload = buildCanonicalSignaturePayload(input);
  return createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}

/**
 * Build the full set of integration auth headers for an outbound request.
 */
export function buildIntegrationAuthHeaders(
  input: IntegrationSignatureInput & {
    apiKey: string;
    secret: string;
  },
): Record<string, string> {
  return {
    [INTEGRATION_HEADER_NAMES.key]: input.apiKey,
    [INTEGRATION_HEADER_NAMES.timestamp]: input.timestamp,
    [INTEGRATION_HEADER_NAMES.signature]: `sha256=${signIntegrationRequest(input, input.secret)}`,
  };
}
