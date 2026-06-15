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

  constructor(options: { port: number; apiKey: string; accountId: string }) {
    this.port = options.port;
    this.apiKey = options.apiKey;
    this.accountId = options.accountId;
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
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
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
    const docUploadMatch = url.match(
      new RegExp(`^/v1/accounts/${this.accountId}/documents$`),
    );
    if (docUploadMatch && method === 'POST') {
      const id = `mock-doc-${Date.now()}`;
      this.documents.set(id, { id, name: 'oficio.pdf', status: 'uploaded' });
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 200, data: { id, name: 'oficio.pdf', status: 'uploaded' } }));
      return;
    }

    // POST /accounts/{id}/signers
    const signerMatch = url.match(new RegExp(`^/v1/accounts/${this.accountId}/signers$`));
    if (signerMatch && method === 'POST') {
      const payload = JSON.parse(body);
      const id = `mock-signer-${Date.now()}`;
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
    const assignmentMatch = url.match(/^\/v1\/documents\/([^/]+)\/assignments$/);
    if (assignmentMatch && method === 'POST') {
      const docId = assignmentMatch[1];
      const id = `mock-assignment-${Date.now()}`;
      const signerIds = Array.from(this.signers.keys()).slice(-1); // use last signer
      const signingUrls = signerIds.map((sid) => ({
        signer_id: sid,
        url: `https://assinafy.com.br/sign/${sid}-${docId}`,
      }));
      const assignment: MockAssignment = {
        id,
        method: 'virtual',
        signers: signerIds.map((sid) => this.signers.get(sid)!).filter(Boolean),
        signing_urls: signingUrls,
      };
      this.assignments.set(id, assignment);
      this.documents.set(docId, { ...this.documents.get(docId)!, status: 'pending_signature' });
      res.statusCode = 200;
      res.end(JSON.stringify({
        status: 200,
        data: { id, method: 'virtual', signers: assignment.signers, signing_urls: signingUrls },
      }));
      return;
    }

    // GET /documents/{id}
    const getDocMatch = url.match(/^\/v1\/documents\/([^/]+)$/);
    if (getDocMatch && method === 'GET') {
      const docId = getDocMatch[1];
      const doc = this.documents.get(docId);
      if (!doc) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify(doc));
      return;
    }

    // 404 fallback
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found', url, method }));
  }

  /**
   * Utility for tests to force a 500 error on next upload.
   */
  forceNextUploadFailure = false;
  forceNextSignerFailure = false;
  forceNextAssignmentFailure = false;
  forceEmptySigningUrls = false;
}
