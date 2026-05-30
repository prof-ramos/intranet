import { describe, it, expect } from 'vitest';
import {
  EMAIL_TRIAGE_STATUSES,
  EMAIL_TRIAGE_CATEGORIAS,
  EMAIL_TRIAGE_RISCOS,
  EMAIL_TRIAGE_STATUS_LABELS,
  EMAIL_TRIAGE_CATEGORIA_LABELS,
  EMAIL_TRIAGE_RISCO_LABELS,
  EMAIL_TRIAGE_STATUS_FILTER_OPTIONS,
  EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS,
  EMAIL_TRIAGE_RISCO_FILTER_OPTIONS,
  isEmailTriageStatus,
  isEmailTriageCategoria,
  isEmailTriageRisco,
  getStatusLabel,
  getCategoriaLabel,
  getRiscoLabel,
  getStatusBadgeClass,
  getCategoriaBadgeClass,
  getRiscoBadgeClass,
} from './status';

describe('EMAIL_TRIAGE_STATUSES', () => {
  it('contains all 13 statuses', () => {
    expect(EMAIL_TRIAGE_STATUSES).toHaveLength(13);
  });

  it('includes expected statuses', () => {
    expect(EMAIL_TRIAGE_STATUSES).toContain('novo');
    expect(EMAIL_TRIAGE_STATUSES).toContain('aguardando_validacao');
    expect(EMAIL_TRIAGE_STATUSES).toContain('vencido');
    expect(EMAIL_TRIAGE_STATUSES).toContain('concluido');
  });
});

describe('EMAIL_TRIAGE_CATEGORIAS', () => {
  it('contains all 6 categorias', () => {
    expect(EMAIL_TRIAGE_CATEGORIAS).toHaveLength(6);
  });
});

describe('EMAIL_TRIAGE_RISCOS', () => {
  it('contains all 4 riscos', () => {
    expect(EMAIL_TRIAGE_RISCOS).toHaveLength(4);
  });
});

describe('labels', () => {
  it('has a label for every status', () => {
    for (const status of EMAIL_TRIAGE_STATUSES) {
      expect(EMAIL_TRIAGE_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('has a label for every categoria', () => {
    for (const cat of EMAIL_TRIAGE_CATEGORIAS) {
      expect(EMAIL_TRIAGE_CATEGORIA_LABELS[cat]).toBeTruthy();
    }
  });

  it('has a label for every risco', () => {
    for (const risco of EMAIL_TRIAGE_RISCOS) {
      expect(EMAIL_TRIAGE_RISCO_LABELS[risco]).toBeTruthy();
    }
  });
});

describe('filter options', () => {
  it('status filter starts with Todos', () => {
    expect(EMAIL_TRIAGE_STATUS_FILTER_OPTIONS[0]).toEqual({ value: '', label: 'Todos' });
  });

  it('categoria filter starts with Todas', () => {
    expect(EMAIL_TRIAGE_CATEGORIA_FILTER_OPTIONS[0]).toEqual({ value: '', label: 'Todas' });
  });

  it('risco filter starts with Todos', () => {
    expect(EMAIL_TRIAGE_RISCO_FILTER_OPTIONS[0]).toEqual({ value: '', label: 'Todos' });
  });

  it('status filter has correct length (13 + 1 Todos)', () => {
    expect(EMAIL_TRIAGE_STATUS_FILTER_OPTIONS).toHaveLength(14);
  });
});

describe('type guards', () => {
  it('isEmailTriageStatus accepts valid status', () => {
    expect(isEmailTriageStatus('novo')).toBe(true);
    expect(isEmailTriageStatus('vencido')).toBe(true);
  });

  it('isEmailTriageStatus rejects invalid status', () => {
    expect(isEmailTriageStatus('invalid')).toBe(false);
    expect(isEmailTriageStatus('')).toBe(false);
  });

  it('isEmailTriageCategoria accepts valid categoria', () => {
    expect(isEmailTriageCategoria('juridico')).toBe(true);
    expect(isEmailTriageCategoria('irrelevante')).toBe(true);
  });

  it('isEmailTriageCategoria rejects invalid categoria', () => {
    expect(isEmailTriageCategoria('invalid')).toBe(false);
  });

  it('isEmailTriageRisco accepts valid risco', () => {
    expect(isEmailTriageRisco('baixo')).toBe(true);
    expect(isEmailTriageRisco('critico')).toBe(true);
  });

  it('isEmailTriageRisco rejects invalid risco', () => {
    expect(isEmailTriageRisco('invalid')).toBe(false);
  });
});

describe('label helpers', () => {
  it('getStatusLabel returns label for valid status', () => {
    expect(getStatusLabel('novo')).toBe('Novo');
    expect(getStatusLabel('vencido')).toBe('Vencido');
  });

  it('getStatusLabel returns raw value for invalid status', () => {
    expect(getStatusLabel('unknown')).toBe('unknown');
  });

  it('getCategoriaLabel returns label for valid categoria', () => {
    expect(getCategoriaLabel('juridico')).toBe('Jurídico');
  });

  it('getCategoriaLabel returns raw value for invalid categoria', () => {
    expect(getCategoriaLabel('unknown')).toBe('unknown');
  });

  it('getRiscoLabel returns label for valid risco', () => {
    expect(getRiscoLabel('critico')).toBe('Crítico');
  });

  it('getRiscoLabel returns raw value for invalid risco', () => {
    expect(getRiscoLabel('unknown')).toBe('unknown');
  });
});

describe('badge classes', () => {
  it('getStatusBadgeClass returns red for vencido', () => {
    expect(getStatusBadgeClass('vencido')).toContain('red');
  });

  it('getStatusBadgeClass returns emerald for concluido', () => {
    expect(getStatusBadgeClass('concluido')).toContain('emerald');
  });

  it('getStatusBadgeClass returns amber for aguardando_validacao', () => {
    expect(getStatusBadgeClass('aguardando_validacao')).toContain('amber');
  });

  it('getStatusBadgeClass returns slate fallback for unknown', () => {
    expect(getStatusBadgeClass('unknown')).toContain('slate');
  });

  it('getCategoriaBadgeClass returns violet for juridico', () => {
    expect(getCategoriaBadgeClass('juridico')).toContain('violet');
  });

  it('getCategoriaBadgeClass returns emerald for financeiro', () => {
    expect(getCategoriaBadgeClass('financeiro')).toContain('emerald');
  });

  it('getRiscoBadgeClass returns red for critico', () => {
    expect(getRiscoBadgeClass('critico')).toContain('red');
  });

  it('getRiscoBadgeClass returns emerald for baixo', () => {
    expect(getRiscoBadgeClass('baixo')).toContain('emerald');
  });

  it('getRiscoBadgeClass returns orange for alto', () => {
    expect(getRiscoBadgeClass('alto')).toContain('orange');
  });
});
