import type { getAssociatesForReport } from '@/lib/reports/queries';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { ASSOCIATE_EXPORT_FIELDS } from '@/lib/associates/lgpd';

export type ReportFilters = NonNullable<Parameters<typeof getAssociatesForReport>[0]>;

const ALLOWED_EXPORT_FIELD_KEYS = new Set(ASSOCIATE_EXPORT_FIELDS.map((field) => field.key));

function isFunctionalStatus(v: string): v is 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' {
  return ['ativo', 'aposentado', 'cedido', 'em_licenca'].includes(v);
}

function isAssociationStatus(v: string): v is 'ativo' | 'inativo' {
  return ['ativo', 'inativo'].includes(v);
}

function isContributionStatus(v: string): v is 'em_dia' | 'inadimplente' | 'pendente_migracao' {
  return ['em_dia', 'inadimplente', 'pendente_migracao'].includes(v);
}

export function parseReportExportParams(searchParams: URLSearchParams): {
  filters: ReportFilters;
  selectedKeys: string[];
} {
  const filters: ReportFilters = {};

  const functionalStatusParam = searchParams.get('functionalStatus');
  if (
    functionalStatusParam &&
    functionalStatusParam !== 'todos' &&
    isFunctionalStatus(functionalStatusParam)
  ) {
    filters.functionalStatus = functionalStatusParam;
  }

  const associationStatusParam = searchParams.get('associationStatus');
  if (
    associationStatusParam &&
    associationStatusParam !== 'todos' &&
    isAssociationStatus(associationStatusParam)
  ) {
    filters.associationStatus = associationStatusParam;
  }

  const contributionStatusParam = searchParams.get('contributionStatus');
  if (
    contributionStatusParam &&
    contributionStatusParam !== 'todos' &&
    isContributionStatus(contributionStatusParam)
  ) {
    filters.contributionStatus = contributionStatusParam;
  }

  const birthMonthParam = searchParams.get('birthMonth');
  if (birthMonthParam && birthMonthParam !== 'todos') {
    const month = parsePositiveIntParam(birthMonthParam);
    if (month !== null && month <= 12) {
      filters.birthMonth = month;
    }
  }

  return {
    filters,
    selectedKeys: searchParams
      .getAll('fields')
      .filter((field, index, fields) =>
        ALLOWED_EXPORT_FIELD_KEYS.has(field) && fields.indexOf(field) === index,
      ),
  };
}
