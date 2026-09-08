export interface MalaDiretaFilters {
  associationStatus?: 'associado' | 'nao_associado';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  location?: 'brasil' | 'exterior';
}

export interface GmailContactRow {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const GMAIL_CONTACTS_HEADERS = [
  'Name',
  'First Name',
  'Last Name',
  'Email 1 - Value',
] as const;

export const MALA_DIRETA_DEFAULT_LIMIT = 5000;

/** Default audience: ASOF associates only. */
export const MALA_DIRETA_DEFAULT_FILTERS: Required<Pick<MalaDiretaFilters, 'associationStatus'>> = {
  associationStatus: 'associado',
};
