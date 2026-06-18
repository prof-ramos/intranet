import { describe, expect, it } from 'vitest';
import { parseReportExportParams } from '@/lib/reports/export-filters';

describe('parseReportExportParams', () => {
  it('accepts valid filters and selected fields', () => {
    const params = new URLSearchParams({
      functionalStatus: 'ativo',
      associationStatus: 'nao_associado',
      contributionStatus: 'em_dia',
      birthMonth: '5',
    });
    params.append('fields', 'fullName');
    params.append('fields', 'primaryEmail');

    expect(parseReportExportParams(params)).toEqual({
      filters: {
        functionalStatus: 'ativo',
        associationStatus: 'nao_associado',
        contributionStatus: 'em_dia',
        birthMonth: 5,
      },
      selectedKeys: ['fullName', 'primaryEmail'],
    });
  });

  it('drops invalid and duplicate selected fields', () => {
    const params = new URLSearchParams();
    params.append('fields', 'fullName');
    params.append('fields', 'invalidField');
    params.append('fields', 'fullName');
    params.append('fields', 'primaryEmail');

    expect(parseReportExportParams(params)).toEqual({
      filters: {},
      selectedKeys: ['fullName', 'primaryEmail'],
    });
  });

  it('ignores invalid or neutral filter values', () => {
    const params = new URLSearchParams({
      functionalStatus: 'todos',
      associationStatus: 'foo',
      contributionStatus: 'bar',
      birthMonth: '13',
    });

    expect(parseReportExportParams(params)).toEqual({
      filters: {},
      selectedKeys: [],
    });
  });

  it('returns empty filters and fields for empty params', () => {
    expect(parseReportExportParams(new URLSearchParams())).toEqual({
      filters: {},
      selectedKeys: [],
    });
  });

  it.each(['0', '-1', 'abc', '1e2', '0x10'])(
    'ignores invalid birthMonth value %s',
    (birthMonth) => {
      expect(parseReportExportParams(new URLSearchParams({ birthMonth }))).toEqual({
        filters: {},
        selectedKeys: [],
      });
    },
  );
});
