import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'layout.tsx'), 'utf8');
const e2eSpec = readFileSync(resolve(here, '../../../e2e/tests/notifications.spec.ts'), 'utf8');
const e2eFixtures = readFileSync(resolve(here, '../../../e2e/fixtures.ts'), 'utf8');

describe('authenticated layout notifications', () => {
  it('mounts the PostgreSQL NotificationBell and not the Novu inbox', () => {
    expect(source).toMatch(
      /import \{ NotificationBellWrapper \} from '@\/components\/NotificationBellWrapper'/,
    );
    expect(source).toMatch(/getUnreadNotificationsCountForUser/);
    expect(source).toMatch(/<NotificationBellWrapper initialUnreadCount=\{unreadCount\} \/>/);
    expect(source).not.toMatch(/from '@\/components\/NotificationBell'/);
    expect(source).not.toMatch(/NotificationInboxWrapper/);
  });

  it('covers opening the Bell panel in the PR Playwright suite', () => {
    expect(e2eSpec).toMatch(/getByTestId\('notification-bell'\)/);
    expect(e2eSpec).toMatch(/Painel de notificações/);
    expect(e2eSpec).toMatch(/Nenhuma notificação encontrada/);
  });

  it('does not wait for Bell hydration on every login', () => {
    expect(e2eFixtures).not.toMatch(/notification-bell/);
    expect(e2eFixtures).not.toMatch(/Painel de notificações/);
  });
});
