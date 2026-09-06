import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'NotificationBellWrapper.tsx'),
  'utf8',
);

describe('NotificationBellWrapper', () => {
  it('loads NotificationBell through a dynamic import without the action graph', () => {
    expect(source).toMatch(/dynamic\(/);
    expect(source).toMatch(/ssr:\s*false/);
    expect(source).toMatch(/import\('\.\/NotificationBell'\)/);
    expect(source).not.toMatch(/from '@\/hooks\/use-notifications'/);
    expect(source).not.toMatch(/from '@\/app\/app\/notifications\/actions'/);
  });
});
