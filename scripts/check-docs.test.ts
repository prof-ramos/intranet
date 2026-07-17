import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkMarkdownFiles, runDocsCheck } from './check-docs.mjs';

const temporaryDirectories: string[] = [];

async function createFixture(files: Record<string, string>) {
  const rootDir = await mkdtemp(join(tmpdir(), 'asof-docs-check-'));
  temporaryDirectories.push(rootDir);
  for (const [path, content] of Object.entries(files)) {
    const absolutePath = join(rootDir, path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }
  return rootDir;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe('documentation checker', () => {
  it('accepts existing npm scripts, relative links, URLs and anchors', async () => {
    const rootDir = await createFixture({
      'README.md': [
        '`npm run test`',
        '[guide](docs/guide.md#usage)',
        '[legacy guide](docs/foo_(legacy).md)',
        '[escaped guide](docs/foo_\\(escaped\\).md)',
        '[site](https://example.test/docs)',
        '[section](#usage)',
      ].join('\n'),
      'docs/guide.md': '# Usage',
      'docs/foo_(legacy).md': '# Legacy',
      'docs/foo_(escaped).md': '# Escaped',
    });

    expect(
      checkMarkdownFiles({ rootDir, markdownFiles: ['README.md'], scripts: { test: 'vitest' } }),
    ).toEqual([]);
  });

  it('reports invalid commands and broken links with file and line', async () => {
    const rootDir = await createFixture({
      'docs/guide.md': ['# Guide', '`npm run missing`', '[missing](./absent.md)'].join('\n'),
    });

    expect(
      checkMarkdownFiles({
        rootDir,
        markdownFiles: ['docs/guide.md'],
        scripts: { test: 'vitest' },
      }),
    ).toEqual([
      { file: 'docs/guide.md', line: 2, message: 'unknown npm script: missing' },
      { file: 'docs/guide.md', line: 3, message: 'broken relative link: ./absent.md' },
    ]);
  });

  it('validates shell fences but ignores non-executable fenced examples and links', async () => {
    const rootDir = await createFixture({
      'README.md': [
        '```text',
        'npm run illustrative-only',
        '[fixture](missing.md)',
        '```',
        '```bash',
        'npm run test',
        '```',
      ].join('\n'),
    });

    expect(
      checkMarkdownFiles({ rootDir, markdownFiles: ['README.md'], scripts: { test: 'vitest' } }),
    ).toEqual([]);
  });

  it('returns exit code 1 and emits deterministic diagnostics', async () => {
    const rootDir = await createFixture({ 'README.md': 'npm run absent' });
    const diagnostics: string[] = [];

    const exitCode = runDocsCheck({
      rootDir,
      markdownFiles: ['README.md'],
      scripts: {},
      write: (message) => diagnostics.push(message),
    });

    expect(exitCode).toBe(1);
    expect(diagnostics).toEqual(['README.md:1: unknown npm script: absent']);
  });
});
