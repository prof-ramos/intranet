import { describe, it, expect } from 'vitest';
import { parseEmailTriageSearchParams } from './search-params';

describe('parseEmailTriageSearchParams', () => {
  it('returns defaults for empty input', () => {
    const result = parseEmailTriageSearchParams({});
    expect(result).toEqual({ q: '', page: 1 });
  });

  it('parses valid status', () => {
    const result = parseEmailTriageSearchParams({ status: 'novo' });
    expect(result.status).toBe('novo');
  });

  it('rejects invalid status', () => {
    const result = parseEmailTriageSearchParams({ status: 'invalid_status' });
    expect(result.status).toBeUndefined();
  });

  it('parses valid categoria', () => {
    const result = parseEmailTriageSearchParams({ categoria: 'juridico' });
    expect(result.categoria).toBe('juridico');
  });

  it('rejects invalid categoria', () => {
    const result = parseEmailTriageSearchParams({ categoria: 'not_a_categoria' });
    expect(result.categoria).toBeUndefined();
  });

  it('parses valid nivelRisco', () => {
    const result = parseEmailTriageSearchParams({ nivelRisco: 'alto' });
    expect(result.nivelRisco).toBe('alto');
  });

  it('rejects invalid nivelRisco', () => {
    const result = parseEmailTriageSearchParams({ nivelRisco: 'extreme' });
    expect(result.nivelRisco).toBeUndefined();
  });

  it('trims and limits search query', () => {
    const longQuery = 'a'.repeat(200);
    const result = parseEmailTriageSearchParams({ q: longQuery });
    expect(result.q).toHaveLength(120);
  });

  it('trims whitespace from search query', () => {
    const result = parseEmailTriageSearchParams({ q: '  hello world  ' });
    expect(result.q).toBe('hello world');
  });

  it('parses valid page number', () => {
    const result = parseEmailTriageSearchParams({ page: '5' });
    expect(result.page).toBe(5);
  });

  it('defaults to page 1 for invalid page', () => {
    const result = parseEmailTriageSearchParams({ page: 'abc' });
    expect(result.page).toBe(1);
  });

  it('defaults to page 1 for negative page', () => {
    const result = parseEmailTriageSearchParams({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('parses all filters together', () => {
    const result = parseEmailTriageSearchParams({
      q: 'test',
      status: 'vencido',
      categoria: 'financeiro',
      nivelRisco: 'critico',
      page: '3',
    });
    expect(result).toEqual({
      q: 'test',
      status: 'vencido',
      categoria: 'financeiro',
      nivelRisco: 'critico',
      page: 3,
    });
  });

  it('converts empty strings to undefined for filters', () => {
    const result = parseEmailTriageSearchParams({
      status: '',
      categoria: '',
      nivelRisco: '',
    });
    expect(result.status).toBeUndefined();
    expect(result.categoria).toBeUndefined();
    expect(result.nivelRisco).toBeUndefined();
  });

  it('handles all 13 valid statuses', () => {
    const statuses = [
      'novo', 'analisado', 'aguardando_validacao', 'validado',
      'em_andamento', 'concluido', 'vencido', 'arquivado',
      'erro_validacao_ia', 'erro_processamento_anexo',
      'aguardando_reprocessamento', 'descartado_por_irrelevancia',
      'pendente_validacao_lgpd',
    ];
    for (const status of statuses) {
      const result = parseEmailTriageSearchParams({ status });
      expect(result.status).toBe(status);
    }
  });

  it('handles all 6 valid categorias', () => {
    const categorias = [
      'juridico', 'administrativo', 'financeiro',
      'institucional', 'comunicacao', 'irrelevante',
    ];
    for (const categoria of categorias) {
      const result = parseEmailTriageSearchParams({ categoria });
      expect(result.categoria).toBe(categoria);
    }
  });

  it('handles all 4 valid riscos', () => {
    const riscos = ['baixo', 'medio', 'alto', 'critico'];
    for (const nivelRisco of riscos) {
      const result = parseEmailTriageSearchParams({ nivelRisco });
      expect(result.nivelRisco).toBe(nivelRisco);
    }
  });
});
