import { describe, expect, it } from 'vitest';
import {
  LEGAL_CONSULTATION_STATUSES,
  LEGAL_CONSULTATION_STATUS_LABELS,
  LEGAL_CONSULTATION_STATUS_OPTIONS,
  isLegalConsultationStatus,
  getLegalConsultationStatusLabel,
  getLegalConsultationStatusBadgeClass,
} from '@/lib/juridico/status';

describe('juridico/status', () => {
  describe('isLegalConsultationStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isLegalConsultationStatus('aberta')).toBe(true);
      expect(isLegalConsultationStatus('aguardando_escritorio')).toBe(true);
      expect(isLegalConsultationStatus('respondida')).toBe(true);
      expect(isLegalConsultationStatus('arquivada')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isLegalConsultationStatus('invalid')).toBe(false);
      expect(isLegalConsultationStatus('')).toBe(false);
    });
  });

  describe('getLegalConsultationStatusLabel', () => {
    it('returns label for valid statuses', () => {
      expect(getLegalConsultationStatusLabel('aberta')).toBe('Aberta');
      expect(getLegalConsultationStatusLabel('aguardando_escritorio')).toBe('Aguardando escritório');
      expect(getLegalConsultationStatusLabel('respondida')).toBe('Respondida');
      expect(getLegalConsultationStatusLabel('arquivada')).toBe('Arquivada');
    });

    it('returns raw value for invalid statuses', () => {
      expect(getLegalConsultationStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('getLegalConsultationStatusBadgeClass', () => {
    it('returns badge class for each status', () => {
      expect(getLegalConsultationStatusBadgeClass('aberta')).toContain('bg-slate');
      expect(getLegalConsultationStatusBadgeClass('aguardando_escritorio')).toContain('bg-amber');
      expect(getLegalConsultationStatusBadgeClass('respondida')).toContain('bg-emerald');
      expect(getLegalConsultationStatusBadgeClass('arquivada')).toContain('bg-slate');
    });

    it('returns default class for unknown status', () => {
      expect(getLegalConsultationStatusBadgeClass('unknown')).toContain('bg-slate');
    });
  });

  describe('LEGAL_CONSULTATION_STATUS_OPTIONS', () => {
    it('has an option for each status', () => {
      expect(LEGAL_CONSULTATION_STATUS_OPTIONS).toHaveLength(LEGAL_CONSULTATION_STATUSES.length);
    });

    it('each option has value and label', () => {
      for (const opt of LEGAL_CONSULTATION_STATUS_OPTIONS) {
        expect(LEGAL_CONSULTATION_STATUS_LABELS[opt.value]).toBeDefined();
      }
    });
  });
});