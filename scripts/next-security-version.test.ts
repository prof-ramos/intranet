import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies: Record<string, string>;
};
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string }>;
};

describe('Next.js security patch', () => {
  it('pins the patched 16.2 release in both manifest and lockfile', () => {
    expect(packageJson.dependencies.next).toBe('16.2.12');
    expect(packageLock.packages['node_modules/next']?.version).toBe('16.2.12');
  });
});
