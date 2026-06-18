import type { getAssociatesForReport } from '@/lib/reports/queries';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { ASSOCIATE_EXPORT_FIELDS } from '@/lib/associates/lgpd';

export type ReportFilters = NonNullable<Parameters<typeof getAssociatesForReport>[0]>;

const ALLOWED_EXPORT_FIELD_KEYS = new Set(ASSOCIATE_EXPORT_FIELDS.map((field) => field.key));

function isFunctionalStatus(v: string): v is 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' {
  return ['ativo', 'aposentado', 'cedido', 'em_licenca'].includes(v);
}

function isAssociationStatus(v: string): v is 'associado' | 'nao_associado' {
  return ['associado', 'nao_associado'].includes(v);
}

function isContributionStatus(v: string): v is 'em_dia' | 'inadimplente' {
  return ['em_dia', 'inadimplente'].includes(v);
}

function isMissionType(v: string): v is 'permanente' | 'transitoria' {
  return ['permanente', 'transitoria'].includes(v);
}

function isCareerOrigin(v: string): v is 'brasil' | 'exterior' | 'outros_orgaos' {
  return ['brasil', 'exterior', 'outros_orgaos'].includes(v);
}

function isPaymentMethod(v: string): v is 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros' {
  return ['folha', 'boleto', 'pix', 'transferencia', 'outros'].includes(v);
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

  const missionTypeParam = searchParams.get('missionType');
  if (missionTypeParam && missionTypeParam !== 'todos' && isMissionType(missionTypeParam)) {
    filters.missionType = missionTypeParam;
  }

  const careerOriginParam = searchParams.get('careerOrigin');
  if (careerOriginParam && careerOriginParam !== 'todos' && isCareerOrigin(careerOriginParam)) {
    filters.careerOrigin = careerOriginParam;
  }

  const paymentMethodParam = searchParams.get('paymentMethod');
  if (paymentMethodParam && paymentMethodParam !== 'todos' && isPaymentMethod(paymentMethodParam)) {
    filters.paymentMethod = paymentMethodParam;
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
      .filter(
        (field, index, fields) =>
          ALLOWED_EXPORT_FIELD_KEYS.has(field) && fields.indexOf(field) === index,
      ),
  };
}
