import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_OPTIONS,
  isActivityPriority,
  isActivityStatus,
  getActivityStatusLabel,
} from '@/lib/activities/status';
import { ACTIVITY_STATUSES } from '@/lib/activities/types';

describe('activities/status', () => {
  describe('isActivityStatus', () => {
    it('returns true for valid statuses', () => {
      for (const status of ACTIVITY_STATUSES) {
        expect(isActivityStatus(status)).toBe(true);
      }
    });

    it('returns false for invalid statuses', () => {
      expect(isActivityStatus('invalid')).toBe(false);
      expect(isActivityStatus('')).toBe(false);
    });
  });

  describe('getActivityStatusLabel', () => {
    it('returns label for valid statuses', () => {
      expect(getActivityStatusLabel('a_fazer')).toBe('A fazer');
      expect(getActivityStatusLabel('em_andamento')).toBe('Em andamento');
      expect(getActivityStatusLabel('aguardando_terceiros')).toBe('Aguardando terceiros');
      expect(getActivityStatusLabel('concluido')).toBe('Concluído');
    });

    it('returns raw value for invalid statuses', () => {
      expect(getActivityStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('isActivityPriority', () => {
    it('returns true for valid priorities', () => {
      for (const p of ['baixa', 'normal', 'alta', 'urgente'] as const) {
        expect(isActivityPriority(p)).toBe(true);
      }
    });

    it('returns false for invalid priorities', () => {
      expect(isActivityPriority('medium')).toBe(false);
      expect(isActivityPriority('')).toBe(false);
    });
  });

  describe('ACTIVITY_PRIORITY_LABELS', () => {
    it('has a label for each priority', () => {
      expect(ACTIVITY_PRIORITY_LABELS.baixa).toBeDefined();
      expect(ACTIVITY_PRIORITY_LABELS.normal).toBeDefined();
      expect(ACTIVITY_PRIORITY_LABELS.alta).toBeDefined();
      expect(ACTIVITY_PRIORITY_LABELS.urgente).toBeDefined();
    });

    it('labels match priorityStyles', () => {
      expect(ACTIVITY_PRIORITY_LABELS.urgente).toBe('Urgente');
      expect(ACTIVITY_PRIORITY_LABELS.alta).toBe('Alta');
    });
  });

  describe('ACTIVITY_STATUS_OPTIONS', () => {
    it('has an option for each status', () => {
      expect(ACTIVITY_STATUS_OPTIONS).toHaveLength(ACTIVITY_STATUSES.length);
    });

    it('each option has value, label, and accent', () => {
      for (const opt of ACTIVITY_STATUS_OPTIONS) {
        expect(ACTIVITY_STATUS_LABELS[opt.value]).toBeDefined();
        expect(opt.accent).toBeDefined();
      }
    });
  });
});
