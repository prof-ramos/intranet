import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'layout.tsx'), 'utf8');

describe('authenticated layout notifications', () => {
  it('mounts the PostgreSQL NotificationBell and not the Novu inbox', () => {
    expect(source).toMatch(/NotificationBell/);
    expect(source).not.toMatch(/NotificationInboxWrapper/);
  });
});
