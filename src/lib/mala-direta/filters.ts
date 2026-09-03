import { MALA_DIRETA_DEFAULT_FILTERS, type MalaDiretaFilters } from './types';

function isAssociationStatus(v: string): v is NonNullable<MalaDiretaFilters['associationStatus']> {
  return v === 'associado' || v === 'nao_associado';
}

function isFunctionalStatus(v: string): v is NonNullable<MalaDiretaFilters['functionalStatus']> {
  return v === 'ativo' || v === 'aposentado' || v === 'cedido' || v === 'em_licenca';
}

function isLocation(v: string): v is NonNullable<MalaDiretaFilters['location']> {
  return v === 'brasil' || v === 'exterior';
}

/**
 * Parses query/form params for the Gmail Contacts export.
 * Default vínculo ASOF is `associado` when the param is missing or empty.
 * Explicit `todos` clears associationStatus (exports both vínculos).
 */
export function parseMalaDiretaFilters(searchParams: URLSearchParams): MalaDiretaFilters {
  const filters: MalaDiretaFilters = {
    ...MALA_DIRETA_DEFAULT_FILTERS,
  };

  const associationStatusParam = searchParams.get('associationStatus');
  if (!associationStatusParam || associationStatusParam === '') {
    filters.associationStatus = MALA_DIRETA_DEFAULT_FILTERS.associationStatus;
  } else if (associationStatusParam === 'todos') {
    delete filters.associationStatus;
  } else if (isAssociationStatus(associationStatusParam)) {
    filters.associationStatus = associationStatusParam;
  }

  const functionalStatusParam = searchParams.get('functionalStatus');
  if (
    functionalStatusParam &&
    functionalStatusParam !== 'todos' &&
    isFunctionalStatus(functionalStatusParam)
  ) {
    filters.functionalStatus = functionalStatusParam;
  }

  const locationParam = searchParams.get('location');
  if (locationParam && locationParam !== 'todos' && isLocation(locationParam)) {
    filters.location = locationParam;
  }

  return filters;
}
