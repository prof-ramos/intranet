/**
 * Integration auth module — split into inbound and outbound responsibilities.
 *
 * - verify-request.ts: verifyIntegrationRequest(), authorizeIntegrationRequest()
 *   (inbound: validate API key, check scopes, map to HTTP responses)
 *
 * - sign-request.ts: signIntegrationRequest(), buildIntegrationAuthHeaders()
 *   (outbound: construct HMAC headers for outbound dispatch)
 */

export {
  verifyIntegrationRequest,
  authorizeIntegrationRequest,
} from './verify-request';

export {
  signIntegrationRequest,
  buildIntegrationAuthHeaders,
  buildCanonicalSignaturePayload,
} from './sign-request';

export type { IntegrationAuthResult } from '@/lib/integrations/types';
