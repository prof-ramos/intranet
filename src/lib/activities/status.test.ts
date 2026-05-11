import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_STATUS_FILTER_OPTIONS,
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

  describe('ACTIVITY_STATUS_FILTER_OPTIONS', () => {
    it('starts with empty "Todas" option', () => {
      expect(ACTIVITY_STATUS_FILTER_OPTIONS[0]).toEqual({ value: '', label: 'Todas' });
    });

    it('has one entry per status plus the empty option', () => {
      expect(ACTIVITY_STATUS_FILTER_OPTIONS).toHaveLength(ACTIVITY_STATUSES.length + 1);
    });
  });
});