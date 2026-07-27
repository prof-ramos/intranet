import type { Sensitivity } from './lgpd';

/**
 * Single source of truth for associate fields covered by `updateAssociateSchema`.
 * `exportEligible` decides CSV/report inclusion per field, so exclusion (e.g.
 * `internalNotes`) is explicit data here instead of a lateral denylist.
 */
export type FieldKind = 'text' | 'date' | 'enum' | 'boolean';

export interface AssociateFieldDefinition {
  key: string;
  label: string;
  sensitivity: Sensitivity;
  kind: FieldKind;
  exportEligible: boolean;
}

export const ASSOCIATE_FIELDS: AssociateFieldDefinition[] = [
  { key: 'fullName', label: 'Nome', sensitivity: 'public', kind: 'text', exportEligible: true },
  { key: 'sex', label: 'Sexo', sensitivity: 'public', kind: 'enum', exportEligible: true },
  {
    key: 'maritalStatus',
    label: 'Estado Civil',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'birthDate',
    label: 'Data de Nascimento',
    sensitivity: 'sensitive',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'birthCity',
    label: 'Naturalidade',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'birthState',
    label: 'UF Naturalidade',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  { key: 'cpf', label: 'CPF', sensitivity: 'sensitive', kind: 'text', exportEligible: true },
  { key: 'rg', label: 'RG', sensitivity: 'sensitive', kind: 'text', exportEligible: true },
  {
    key: 'rgIssuer',
    label: 'Órgão Expedidor RG',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  { key: 'rgState', label: 'UF RG', sensitivity: 'public', kind: 'text', exportEligible: true },
  {
    key: 'rgExpeditionDate',
    label: 'Data de Expedição do RG',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'siape',
    label: 'Matrícula SIAPE',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'primaryEmail',
    label: 'E-mail',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'secondaryEmail',
    label: 'E-mail Secundário',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'phone',
    label: 'Telefone',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'whatsapp',
    label: 'Celular/WhatsApp',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'address',
    label: 'Endereço',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'neighborhood',
    label: 'Bairro',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'addressState',
    label: 'UF Endereço',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  { key: 'zipCode', label: 'CEP', sensitivity: 'sensitive', kind: 'text', exportEligible: true },
  {
    key: 'locationCity',
    label: 'Cidade',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'locationCountry',
    label: 'País',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'assignment',
    label: 'Lotação',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'assignmentStartDate',
    label: 'Data da Lotação',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'classPattern',
    label: 'Classe e Padrão',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'associationCategory',
    label: 'Categoria',
    sensitivity: 'public',
    kind: 'text',
    exportEligible: true,
  },
  {
    key: 'functionalStatus',
    label: 'Situação Funcional',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'associationStatus',
    label: 'Vínculo ASOF',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'contributionStatus',
    label: 'Contribuição',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'paymentMethod',
    label: 'Forma de Pagamento',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'missionType',
    label: 'Tipo de Missão',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'careerOrigin',
    label: 'Origem de Carreira',
    sensitivity: 'public',
    kind: 'enum',
    exportEligible: true,
  },
  {
    key: 'admissionDate',
    label: 'Data de Admissão',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'inaugurationDate',
    label: 'Data de Posse',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'retirementDate',
    label: 'Data de Aposentadoria',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'leaveDate',
    label: 'Data de Licença',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'cancellationDate',
    label: 'Data de Cancelamento do Vínculo ASOF',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'joinedAt',
    label: 'Data de Adesão',
    sensitivity: 'public',
    kind: 'date',
    exportEligible: true,
  },
  {
    key: 'ceocMember',
    label: 'Membro CEOC',
    sensitivity: 'public',
    kind: 'boolean',
    exportEligible: true,
  },
  {
    key: 'caocMember',
    label: 'Membro CAOC',
    sensitivity: 'public',
    kind: 'boolean',
    exportEligible: true,
  },
  {
    key: 'internalNotes',
    label: 'Observações Internas',
    sensitivity: 'sensitive',
    kind: 'text',
    exportEligible: false,
  },
];

export function getExportableFields(): AssociateFieldDefinition[] {
  return ASSOCIATE_FIELDS.filter((field) => field.exportEligible);
}
