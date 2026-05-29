/**
 * @deprecated This module has been split. Import from:
 * - `@/lib/integrations/verify-request` for inbound verification
 * - `@/lib/integrations/sign-request` for outbound signing
 */
export {
  verifyIntegrationRequest,
  authorizeIntegrationRequest,
  hasIntegrationHeaders,
  isTimestampWithinTolerance,
  readRequestBody,
  getPathWithQuery,
  normalizeSignatureHeader,
} from './verify-request';

export {
  signIntegrationRequest,
  buildIntegrationAuthHeaders,
  buildCanonicalSignaturePayload,
} from './sign-request';
