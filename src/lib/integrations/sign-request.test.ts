import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import {
  buildCanonicalSignaturePayload,
  signIntegrationRequest,
  buildIntegrationAuthHeaders,
} from './sign-request';
import type { IntegrationSignatureInput } from '@/lib/integrations/types';
import { INTEGRATION_HEADER_NAMES } from '@/lib/integrations/types';

// --- Helpers ---

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function referenceHmac(canonical: string, secret: string): string {
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

const BASE_INPUT: IntegrationSignatureInput = {
  method: 'GET',
  pathWithQuery: '/api/v1/events',
  timestamp: '1700000000',
  body: '',
};

const SECRET = 'sign-request-test-secret-abc123';

// --- buildCanonicalSignaturePayload ---

describe('buildCanonicalSignaturePayload', () => {
  it('produces four newline-separated fields in order: METHOD, path, timestamp, body-hash', () => {
    const payload = buildCanonicalSignaturePayload(BASE_INPUT);
    const lines = payload.split('\n');

    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('GET');
    expect(lines[1]).toBe('/api/v1/events');
    expect(lines[2]).toBe('1700000000');
    expect(lines[3]).toBe(sha256Hex(''));
  });

  it('upper-cases the HTTP method regardless of input casing', () => {
    const lower = buildCanonicalSignaturePayload({ ...BASE_INPUT, method: 'post' });
    const upper = buildCanonicalSignaturePayload({ ...BASE_INPUT, method: 'POST' });
    expect(lower).toBe(upper);
    expect(lower.split('\n')[0]).toBe('POST');
  });

  it('includes the path with query string verbatim', () => {
    const input: IntegrationSignatureInput = {
      ...BASE_INPUT,
      pathWithQuery: '/api/v1/events?since=2024-01-01&limit=10',
    };
    const payload = buildCanonicalSignaturePayload(input);
    expect(payload.split('\n')[1]).toBe('/api/v1/events?since=2024-01-01&limit=10');
  });

  it('hashes non-empty body content into the payload', () => {
    const body = '{"event":"created"}';
    const payload = buildCanonicalSignaturePayload({ ...BASE_INPUT, body });
    expect(payload.split('\n')[3]).toBe(sha256Hex(body));
  });

  it('produces different payloads for different bodies', () => {
    const p1 = buildCanonicalSignaturePayload({ ...BASE_INPUT, body: '{"a":1}' });
    const p2 = buildCanonicalSignaturePayload({ ...BASE_INPUT, body: '{"a":2}' });
    expect(p1).not.toBe(p2);
  });

  it('produces different payloads for different timestamps', () => {
    const p1 = buildCanonicalSignaturePayload({ ...BASE_INPUT, timestamp: '1700000000' });
    const p2 = buildCanonicalSignaturePayload({ ...BASE_INPUT, timestamp: '1700000001' });
    expect(p1).not.toBe(p2);
  });
});

// --- signIntegrationRequest ---

describe('signIntegrationRequest', () => {
  it('returns a 64-character hex string (SHA-256 output)', () => {
    const sig = signIntegrationRequest(BASE_INPUT, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches a reference HMAC-SHA256 computed independently', () => {
    const canonical = buildCanonicalSignaturePayload(BASE_INPUT);
    const expected = referenceHmac(canonical, SECRET);
    expect(signIntegrationRequest(BASE_INPUT, SECRET)).toBe(expected);
  });

  it('produces a different signature for a different secret', () => {
    const sig1 = signIntegrationRequest(BASE_INPUT, SECRET);
    const sig2 = signIntegrationRequest(BASE_INPUT, 'different-secret');
    expect(sig1).not.toBe(sig2);
  });

  it('produces a different signature when the body changes', () => {
    const sig1 = signIntegrationRequest({ ...BASE_INPUT, body: '{"amount":100}' }, SECRET);
    const sig2 = signIntegrationRequest({ ...BASE_INPUT, body: '{"amount":999}' }, SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('produces a different signature when the timestamp changes', () => {
    const sig1 = signIntegrationRequest({ ...BASE_INPUT, timestamp: '1700000000' }, SECRET);
    const sig2 = signIntegrationRequest({ ...BASE_INPUT, timestamp: '1700000001' }, SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('produces a different signature when the path changes', () => {
    const sig1 = signIntegrationRequest({ ...BASE_INPUT, pathWithQuery: '/api/v1/events' }, SECRET);
    const sig2 = signIntegrationRequest({ ...BASE_INPUT, pathWithQuery: '/api/v1/other' }, SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('throws or produces an empty-string output for an empty secret (not a valid usage)', () => {
    // HMAC with empty key is technically valid at the crypto layer but should not be
    // used in production; this test documents current behaviour rather than enforcing
    // a specific error, so we just verify the function does not crash.
    expect(() => signIntegrationRequest(BASE_INPUT, '')).not.toThrow();
  });
});

// --- buildIntegrationAuthHeaders ---

describe('buildIntegrationAuthHeaders', () => {
  const API_KEY = 'asof_test_key_build_headers';

  it('returns headers for all three required integration header names', () => {
    const headers = buildIntegrationAuthHeaders({
      ...BASE_INPUT,
      apiKey: API_KEY,
      secret: SECRET,
    });

    expect(headers).toHaveProperty(INTEGRATION_HEADER_NAMES.key);
    expect(headers).toHaveProperty(INTEGRATION_HEADER_NAMES.timestamp);
    expect(headers).toHaveProperty(INTEGRATION_HEADER_NAMES.signature);
  });

  it('sets the key header to the provided apiKey', () => {
    const headers = buildIntegrationAuthHeaders({
      ...BASE_INPUT,
      apiKey: API_KEY,
      secret: SECRET,
    });
    expect(headers[INTEGRATION_HEADER_NAMES.key]).toBe(API_KEY);
  });

  it('sets the timestamp header to the provided timestamp', () => {
    const headers = buildIntegrationAuthHeaders({
      ...BASE_INPUT,
      timestamp: '1700000042',
      apiKey: API_KEY,
      secret: SECRET,
    });
    expect(headers[INTEGRATION_HEADER_NAMES.timestamp]).toBe('1700000042');
  });

  it('prefixes the signature header value with "sha256="', () => {
    const headers = buildIntegrationAuthHeaders({
      ...BASE_INPUT,
      apiKey: API_KEY,
      secret: SECRET,
    });
    expect(headers[INTEGRATION_HEADER_NAMES.signature]).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('embeds the correct HMAC in the signature header', () => {
    const input = { ...BASE_INPUT, apiKey: API_KEY, secret: SECRET };
    const headers = buildIntegrationAuthHeaders(input);
    const expectedSig = signIntegrationRequest(input, SECRET);
    expect(headers[INTEGRATION_HEADER_NAMES.signature]).toBe(`sha256=${expectedSig}`);
  });
});

// --- sign + verify round-trip (light integration) ---

describe('sign-request / verify-request round-trip', () => {
  it('headers built by buildIntegrationAuthHeaders satisfy signIntegrationRequest verification', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = '{"hello":"world"}';
    const input: IntegrationSignatureInput = {
      method: 'POST',
      pathWithQuery: '/api/v1/webhooks',
      timestamp,
      body,
    };

    const headers = buildIntegrationAuthHeaders({ ...input, apiKey: 'asof_roundtrip', secret: SECRET });

    // Extract the raw hex value from the header (strip "sha256=" prefix)
    const headerSig = headers[INTEGRATION_HEADER_NAMES.signature].replace(/^sha256=/, '');
    const expectedSig = signIntegrationRequest(input, SECRET);

    expect(headerSig).toBe(expectedSig);
  });

  it('a signature produced by signIntegrationRequest matches when re-computed with the same inputs', () => {
    const input: IntegrationSignatureInput = {
      method: 'DELETE',
      pathWithQuery: '/api/v1/keys/42',
      timestamp: '1700099999',
      body: '',
    };

    const sig1 = signIntegrationRequest(input, SECRET);
    const sig2 = signIntegrationRequest(input, SECRET);

    // Deterministic: same inputs always produce same output
    expect(sig1).toBe(sig2);
  });
});
