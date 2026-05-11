export const AREAS = [
  {
    key: 'administrativo',
    label: 'Administrativo',
    accent: '#76AEEA',
    desc: 'Secretaria, comunicação, operação',
  },
  {
    key: 'juridico',
    label: 'Jurídico',
    accent: '#a16207',
    desc: 'Pareceres, processos, consultas',
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    accent: '#15803d',
    desc: 'Contribuições, pagamentos, prestação de contas',
  },
] as const;

export type Area = (typeof AREAS)[number]['key'];

export const TAG_SUGGESTIONS = [
  'secretaria',
  'comunicacao',
  'diretoria',
  'ti',
  'cadastro',
  'siape',
  'juridico',
  'financeiro',
] as const;