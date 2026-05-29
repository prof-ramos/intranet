import { createLogger } from '@/lib/logger';

const logger = createLogger('assinafy');

export class AssinafyError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = 'AssinafyError';
  }
}

export interface AssinafyClientOptions {
  apiKey: string;
  accountId?: string;
  baseUrl?: string;
}

export interface SignerConfig {
  id: string;
  verification_method: string;
  notification_methods: string[];
  step: number;
}

export interface AssignmentOptions {
  method: 'virtual' | 'collect';
  signers: SignerConfig[];
  expires_at: string;
  message?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BASE_URL = 'https://sandbox.assinafy.com.br/v1';

export class AssinafyClient {
  public readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly accountId: string;

  constructor(options: AssinafyClientOptions) {
    if (!options.apiKey) {
      throw new AssinafyError('API key is required');
    }
    this.apiKey = options.apiKey;
    this.accountId = options.accountId ?? '';
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      ...extra,
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { ...this.headers(), ...(init.headers as Record<string, string>) },
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new AssinafyError(`Request timed out: ${path}`);
      }
      throw new AssinafyError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeout);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      logger.error('Non-JSON response from Assinafy', { path, status: response.status, body: text.slice(0, 200) });
      throw new AssinafyError(
        `Non-JSON response (${response.status}): ${text.slice(0, 100)}`,
        response.status,
        text,
      );
    }

    const data = body as { status?: number; message?: string; data?: unknown };
    if (response.status >= 400 || (data.status && data.status >= 400)) {
      throw new AssinafyError(
        data.message ?? `Assinafy API error (${response.status})`,
        response.status,
        JSON.stringify(body),
      );
    }

    return body as T;
  }

  async uploadDocument(pdf: Buffer, filename: string) {
    const form = new FormData();
    form.set('file', new Blob([pdf], { type: 'application/pdf' }), filename);

    return this.request<{ id: string; name: string; status: string }>(
      `/accounts/${this.accountId}/documents`,
      { method: 'POST', body: form },
    );
  }

  async createSigner(fullName: string, email: string) {
    const resp = await this.request<{ status: number; data: { id: string; full_name: string; email: string } }>(
      `/accounts/${this.accountId}/signers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email }),
      },
    );
    return resp.data;
  }

  async createAssignment(documentId: string, options: AssignmentOptions) {
    return this.request<{
      id: string;
      method: string;
      signers: unknown[];
      signing_urls: { signer_id: string; url: string }[];
    }>(
      `/documents/${documentId}/assignments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      },
    );
  }

  async getDocumentStatus(documentId: string) {
    return this.request<{ id: string; status: string }>(
      `/documents/${documentId}`,
      { method: 'GET' },
    );
  }
}
