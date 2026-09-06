import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CLIENT_MODULES = [
  'src/lib/webmcp/build-tools.ts',
  'src/lib/webmcp/serialize-letters.ts',
  'src/lib/webmcp/download-csv.ts',
  'src/components/webmcp/WebMcpRegistry.tsx',
];

describe('WebMCP client boundary', () => {
  it('does not import server PII crypto from client modules', () => {
    for (const file of CLIENT_MODULES) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from ['"]\.\/serialize['"]/);
      expect(src, file).not.toMatch(/pii-mapping/);
      expect(src, file).not.toMatch(/decryptAssociatePii/);
      expect(src, file).not.toMatch(/node:crypto/);
    }
  });
});
