import { describe, expect, it } from 'vitest';
import { NOTIFICATION_EVENT_TYPES } from './types';

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
});
