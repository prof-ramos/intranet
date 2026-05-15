import { describe, it, expect } from 'vitest';
import { getRequestId, jsonOk, jsonError, jsonMethodNotAllowed } from './http';
import { INTEGRATION_HEADER_NAMES, INTEGRATION_API_VERSION } from '@/lib/integrations/types';

describe('getRequestId', () => {
  it('returns x-asof-request-id header when present', () => {
    const request = new Request('https://example.com/api/v1/events', {
      headers: { [INTEGRATION_HEADER_NAMES.requestId]: 'req-123' },
    });
    expect(getRequestId(request)).toBe('req-123');
  });

  it('returns a UUID when header is absent', () => {
    const request = new Request('https://example.com/api/v1/events');
    const id = getRequestId(request);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('trims whitespace from header value', () => {
    const request = new Request('https://example.com/api/v1/events', {
      headers: { [INTEGRATION_HEADER_NAMES.requestId]: '  req-456  ' },
    });
    expect(getRequestId(request)).toBe('req-456');
  });
});

describe('jsonOk', () => {
  it('returns response with ok:true and data', async () => {
    const response = jsonOk({ message: 'hello' });
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ message: 'hello' });
  });

  it('includes meta with apiVersion and requestId', async () => {
    const response = jsonOk({ result: 1 }, { requestId: 'test-req-id' });
    const body = await response.json();

    expect(body.meta.apiVersion).toBe(INTEGRATION_API_VERSION);
    expect(body.meta.requestId).toBe('test-req-id');
    expect(body.meta.timestamp).toBeDefined();
  });

  it('sets cache-control: no-store header', () => {
    const response = jsonOk({ result: 1 }, { requestId: 'test' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('sets content-type: application/json header', () => {
    const response = jsonOk({ result: 1 }, { requestId: 'test' });
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('sets x-asof-request-id header', () => {
    const response = jsonOk({ result: 1 }, { requestId: 'custom-id' });
    expect(response.headers.get(INTEGRATION_HEADER_NAMES.requestId)).toBe('custom-id');
  });

  it('generates a requestId when none provided', () => {
    const response = jsonOk({ result: 1 });
    const id = response.headers.get(INTEGRATION_HEADER_NAMES.requestId);
    expect(id).toBeDefined();
    expect(id).toMatch(/^[0-9a-f-]+$/);
  });

  it('jsonError generates requestId when none provided', async () => {
    const response = jsonError(500, 'rate_limit_exceeded', 'Error');
    const body = await response.json();

    expect(body.meta.requestId).toMatch(/^[0-9a-f-]+$/);
    expect(response.headers.get(INTEGRATION_HEADER_NAMES.requestId)).toMatch(/^[0-9a-f-]+$/);
  });

  it('returns status 200 by default', () => {
    const response = jsonOk({ result: 1 });
    expect(response.status).toBe(200);
  });

  it('accepts custom status code', () => {
    const response = jsonOk({ created: true }, { status: 201 });
    expect(response.status).toBe(201);
  });
});

describe('jsonError', () => {
  it('returns response with ok:false and error object', async () => {
    const response = jsonError(400, 'invalid_request', 'Invalid input');
    const body = await response.json();

    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('invalid_request');
    expect(body.error.message).toBe('Invalid input');
  });

  it('includes details when provided', async () => {
    const response = jsonError(422, 'invalid_request', 'Invalid fields', {
      details: { fields: ['email'] },
    });
    const body = await response.json();

    expect(body.error.details).toEqual({ fields: ['email'] });
  });

  it('omits details when not provided', async () => {
    const response = jsonError(404, 'method_not_allowed', 'Not found');
    const body = await response.json();

    expect(body.error.details).toBeUndefined();
  });

  it('sets the correct HTTP status', () => {
    const response = jsonError(401, 'unauthorized', 'Unauthorized');
    expect(response.status).toBe(401);
  });

  it('includes meta with requestId', async () => {
    const response = jsonError(500, 'rate_limit_exceeded', 'Error', { requestId: 'err-1' });
    const body = await response.json();

    expect(body.meta.requestId).toBe('err-1');
    expect(body.meta.apiVersion).toBe(INTEGRATION_API_VERSION);
  });
});

describe('jsonMethodNotAllowed', () => {
  it('returns 405 with Allow header', async () => {
    const response = jsonMethodNotAllowed(['GET', 'POST']);
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, POST');
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('method_not_allowed');
    expect(body.error.details).toEqual({ allowedMethods: ['GET', 'POST'] });
  });

  it('works with single method', () => {
    const response = jsonMethodNotAllowed(['GET']);
    expect(response.headers.get('Allow')).toBe('GET');
  });
});
