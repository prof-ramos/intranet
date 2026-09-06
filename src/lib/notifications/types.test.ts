import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOTIFICATION_EVENT_TYPES } from './types';

const here = dirname(fileURLToPath(import.meta.url));

describe('notification types', () => {
  it('lists the persisted in-app event types without a UI consumer assumption', () => {
    expect([...NOTIFICATION_EVENT_TYPES]).toEqual([
      'activity.completed',
      'legal_consultation.answered',
      'activity.assigned',
      'legal_consultation.sla_warning',
      'lgpd_request',
      'email_triage_pending',
      'oficio.status_changed',
    ]);
  });

  it('keeps the persistence service from importing the writer', () => {
    const source = readFileSync(resolve(here, 'service.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"]@\/lib\/events['"]/);
  });
});
