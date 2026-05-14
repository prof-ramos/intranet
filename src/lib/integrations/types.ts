import type { AuthRole } from '@/lib/auth/config';

export const INTEGRATION_API_VERSION = 'v1' as const;
export const INTEGRATION_AUTH_SCHEME = 'api-key-hmac-sha256' as const;

export const INTEGRATION_HEADER_NAMES = {
  key: 'x-asof-key',
  timestamp: 'x-asof-timestamp',
  signature: 'x-asof-signature',
  requestId: 'x-request-id',
} as const;

export type IntegrationErrorCode =
  | 'forbidden'
  | 'integration_auth_disabled'
  | 'integration_auth_invalid'
  | 'integration_auth_missing'
  | 'integration_auth_misconfigured'
  | 'invalid_request'
  | 'method_not_allowed'
  | 'not_implemented'
  | 'unauthorized';

export interface JsonEnvelopeMeta {
  apiVersion: typeof INTEGRATION_API_VERSION;
  requestId: string;
  timestamp: string;
}

export interface JsonSuccessEnvelope<T> {
  ok: true;
  data: T;
  meta: JsonEnvelopeMeta;
}

export interface JsonErrorEnvelope {
  ok: false;
  error: {
    code: IntegrationErrorCode;
    message: string;
    details?: IntegrationErrorDetails;
  };
  meta: JsonEnvelopeMeta;
}

export type JsonEnvelope<T> = JsonSuccessEnvelope<T> | JsonErrorEnvelope;

export interface IntegrationErrorDetails {
  [key: string]: unknown;
}

/**
 * Security: apiKey and hmacSecret are sensitive credentials.
 * Never serialize, log, expose in API responses, or commit these fields.
 * Store them only in environment variables or a secret manager and display
 * masked values only when strictly required for operator diagnostics.
 */
export interface IntegrationConfig {
  enabled: boolean;
  apiKey: string | null;
  hmacSecret: string | null;
  timestampToleranceSeconds: number;
}

export interface IntegrationSignatureInput {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  body: string;
}

export interface IntegrationPrincipal {
  kind: 'integration';
  scheme: typeof INTEGRATION_AUTH_SCHEME;
  keyId: string;
}

export interface SessionPrincipal {
  kind: 'session';
  userId: number;
  email: string;
  role: AuthRole;
}

export type RequestPrincipal = IntegrationPrincipal | SessionPrincipal;

export type IntegrationAuthFailureReason =
  | 'disabled'
  | 'misconfigured'
  | 'missing_headers'
  | 'invalid_key'
  | 'invalid_signature'
  | 'invalid_timestamp'
  | 'timestamp_skew';

export type IntegrationAuthResult =
  | {
      ok: true;
      principal: IntegrationPrincipal;
    }
  | {
      ok: false;
      reason: IntegrationAuthFailureReason;
      details?: Record<string, unknown>;
    };
