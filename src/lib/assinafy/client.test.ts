import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AssinafyClient, AssinafyError } from './client';

const BASE_URL = 'https://sandbox.assinafy.com.br/v1';
const API_KEY = 'test-api-key';

describe('AssinafyClient', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws when API key is missing', () => {
      expect(() => new AssinafyClient({ apiKey: '' })).toThrow('API key is required');
    });

    it('uses sandbox URL by default', () => {
      const client = new AssinafyClient({ apiKey: API_KEY });
      expect(client.baseUrl).toBe(BASE_URL);
    });

    it('accepts custom base URL', () => {
      const client = new AssinafyClient({ apiKey: API_KEY, baseUrl: 'https://api.assinafy.com.br/v1' });
      expect(client.baseUrl).toBe('https://api.assinafy.com.br/v1');
    });
  });

  describe('uploadDocument', () => {
    it('sends multipart form data with X-Api-Key header', async () => {
      const mockPayload = { id: 'doc123', name: 'test.pdf', status: 'uploaded' };
      const mockResponse = { status: 200, data: mockPayload };
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      const pdf = Buffer.from('fake-pdf');
      const result = await client.uploadDocument(pdf, 'test.pdf');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/accounts/acc123/documents`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-Api-Key': API_KEY }),
        }),
      );
      expect(result).toEqual(mockPayload);
    });

    it('throws AssinafyError on non-JSON response (502)', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }));

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      await expect(client.uploadDocument(Buffer.from('x'), 'f.pdf')).rejects.toThrow(AssinafyError);
    });

    it('throws AssinafyError on API error response', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 400, message: 'Invalid file' }), { status: 400 }),
      );

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      await expect(client.uploadDocument(Buffer.from('x'), 'f.pdf')).rejects.toThrow('Invalid file');
    });
  });

  describe('createSigner', () => {
    it('sends POST with full_name and email', async () => {
      const mockResponse = { status: 200, data: { id: 'signer1', full_name: 'João', email: 'j@x.com' } };
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      const result = await client.createSigner('João', 'j@x.com');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/accounts/acc123/signers`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Api-Key': API_KEY,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ full_name: 'João', email: 'j@x.com' }),
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createAssignment', () => {
    it('sends POST with method, signers, and expiration', async () => {
      const mockPayload = {
        id: 'assign1',
        method: 'virtual',
        signers: [{ id: 'signer1' }],
        signing_urls: [{ signer_id: 'signer1', url: 'https://sign.url' }],
      };
      const mockResponse = { status: 200, data: mockPayload };
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      const result = await client.createAssignment('doc123', {
        method: 'virtual',
        signers: [{ id: 'signer1', verification_method: 'Email', notification_methods: ['Email'], step: 1 }],
        expires_at: '2026-12-31T23:59:00Z',
      });

      expect(result).toEqual(mockPayload);
    });
  });

  describe('getDocumentStatus', () => {
    it('fetches document status by ID', async () => {
      const mockResponse = { id: 'doc123', status: 'pending_signature' };
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      const result = await client.getDocumentStatus('doc123');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/documents/doc123`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Api-Key': API_KEY }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('handles non-JSON response gracefully (502 HTML)', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('<html><body>502 Bad Gateway</body></html>', { status: 502 }),
      );

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      await expect(client.getDocumentStatus('doc123')).rejects.toThrow(AssinafyError);
    });

    it('includes status code in error', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 404, message: 'Not found' }), { status: 404 }),
      );

      const client = new AssinafyClient({ apiKey: API_KEY, accountId: 'acc123' });
      try {
        await client.getDocumentStatus('doc123');
        expect.fail('should throw');
      } catch (e) {
        expect(e).toBeInstanceOf(AssinafyError);
        expect((e as AssinafyError).statusCode).toBe(404);
      }
    });
  });
});
