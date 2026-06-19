import { createServer, IncomingMessage, Server, ServerResponse } from 'http';

interface MockDocument {
  id: string;
  name: string;
  status: string;
}

interface MockSigner {
  id: string;
  full_name: string;
  email: string;
}

interface MockAssignment {
  id: string;
  method: string;
  signers: MockSigner[];
  signing_urls: Array<{ signer_id: string; url: string }>;
}

const MAX_BODY_SIZE = 1_048_576; // 1 MB

/**
 * Minimal mock Assinafy HTTP server for E2E tests.
 * Validates X-Api-Key and supports reset between tests.
 */
export class AssinafyMockServer {
  private server: Server | null = null;
  private port: number;
  private documents = new Map<string, MockDocument>();
  private signers = new Map<string, MockSigner>();
  private assignments = new Map<string, MockAssignment>();
  private apiKey: string;
  private accountId: string;
  private nextId = 0;

  // Pre-compiled route regexes (accountId-dependent, so built once in constructor)
  private readonly reDocUpload: RegExp;
  private readonly reSigner: RegExp;
  private static readonly RE_ASSIGNMENT = /^\/v1\/documents\/([^/]+)\/assignments$/;
  private static readonly RE_GET_DOC = /^\/v1\/documents\/([^/]+)$/;

  constructor(options: { port: number; apiKey: string; accountId: string }) {
    this.port = options.port;
    this.apiKey = options.apiKey;
    this.accountId = options.accountId;
    this.reDocUpload = new RegExp(`^/v1/accounts/${this.accountId}/documents$`);
    this.reSigner = new RegExp(`^/v1/accounts/${this.accountId}/signers$`);
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        console.log(`[AssinafyMockServer] Listening on http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        console.log('[AssinafyMockServer] Stopped');
        resolve();
      });
    });
  }

  reset(): void {
    this.documents.clear();
    this.signers.clear();
    this.assignments.clear();
    this.nextId = 0;
    console.log('[AssinafyMockServer] State reset');
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');

    const providedKey = req.headers['x-api-key'];
    if (providedKey !== this.apiKey) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const url = req.url ?? '';
    const method = req.method ?? '';

    let body = '';
    let bodyTooLarge = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        bodyTooLarge = true;
        res.statusCode = 413;
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (bodyTooLarge) return;
      try {
        this.route(method, url, body, res);
      } catch {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  private route(method: string, url: string, body: string, res: ServerResponse): void {
    // POST /accounts/{id}/documents
    if (this.reDocUpload.test(url) && method === 'POST') {
      const id = `mock-doc-${++this.nextId}`;
      const doc: MockDocument = { id, name: 'oficio.pdf', status: 'uploaded' };
      this.documents.set(id, doc);
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 200, data: doc }));
      return;
    }

    // POST /accounts/{id}/signers
    if (this.reSigner.test(url) && method === 'POST') {
      const payload = JSON.parse(body);
      const id = `mock-signer-${++this.nextId}`;
      const signer: MockSigner = {
        id,
        full_name: payload.full_name ?? 'Signatário',
        email: payload.email ?? 'signer@example.com',
      };
      this.signers.set(id, signer);
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 200, data: signer }));
      return;
    }

    // POST /documents/{id}/assignments
    const assignmentMatch = AssinafyMockServer.RE_ASSIGNMENT.exec(url);
    if (assignmentMatch && method === 'POST') {
      const docId = assignmentMatch[1];
      const existing = this.documents.get(docId);
      if (!existing) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }
      const id = `mock-assignment-${++this.nextId}`;
      const signerIds = Array.from(this.signers.keys()).slice(-1); // use last signer
      const signingUrls = signerIds.map((sid) => ({
        signer_id: sid,
        url: `https://assinafy.com.br/sign/${sid}-${docId}`,
      }));
      const signers = signerIds
        .map((sid) => this.signers.get(sid))
        .filter((s): s is MockSigner => s !== undefined);
      const assignment: MockAssignment = {
        id,
        method: 'virtual',
        signers,
        signing_urls: signingUrls,
      };
      this.assignments.set(id, assignment);
      this.documents.set(docId, { ...existing, status: 'pending_signature' });
      res.statusCode = 200;
      res.end(JSON.stringify({
        status: 200,
        data: { id, method: 'virtual', signers: assignment.signers, signing_urls: signingUrls },
      }));
      return;
    }

    // POST /__reset__ — test-only endpoint to reset mock state between tests.
    // Workers and globalSetup run in separate Node processes so globalThis is
    // not shared; HTTP is the only safe inter-process communication channel.
    if (url === '/v1/__reset__' && method === 'POST') {
      this.reset();
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // GET /documents/{id}
    const getDocMatch = AssinafyMockServer.RE_GET_DOC.exec(url);
    if (getDocMatch && method === 'GET') {
      const docId = getDocMatch[1];
      const doc = this.documents.get(docId);
      if (!doc) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 200, data: doc }));
      return;
    }

    // 404 fallback
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found', url, method }));
  }
}