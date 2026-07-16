import type {
  EtiquetaFieldKey,
  EtiquetaGenerationInput,
  EtiquetaPrintFlags,
  EtiquetaRecipient,
  LabelContent,
} from './types';
import { resolveFieldsForMode } from './validations';

const FIELD_ORDER: EtiquetaFieldKey[] = [
  'nome',
  'matricula',
  'categoria',
  'situacao_associativa',
  'lotacao',
  'posto',
  'endereco_completo',
  'complemento',
  'bairro',
  'cidade_uf',
  'cep',
  'email',
  'telefone',
  'observacao',
];

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null' || normalized === 'NaN')
    return null;
  return normalized;
}

export function formatCep(value?: string | null): string | null {
  const normalized = clean(value);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return normalized;
}

function cityUf(recipient: EtiquetaRecipient): string | null {
  const city = clean(recipient.cidade);
  const uf = clean(recipient.uf)?.toUpperCase();
  if (city && uf) return `${city}/${uf}`;
  return city ?? uf ?? null;
}

function labelForField(field: EtiquetaFieldKey, recipient: EtiquetaRecipient): string | null {
  switch (field) {
    case 'nome':
      return clean(recipient.nome);
    case 'matricula':
      return clean(recipient.matricula) ? `Matrícula: ${clean(recipient.matricula)}` : null;
    case 'categoria':
      return clean(recipient.categoria);
    case 'situacao_associativa':
      return clean(recipient.situacaoAssociativa);
    case 'lotacao':
      return clean(recipient.lotacao);
    case 'posto':
      return clean(recipient.posto);
    case 'endereco_completo':
      return clean(recipient.enderecoCompleto);
    case 'complemento':
      return clean(recipient.complemento);
    case 'bairro':
      return clean(recipient.bairro);
    case 'cidade_uf':
      return cityUf(recipient);
    case 'cep': {
      const cep = formatCep(recipient.cep);
      return cep ? `CEP ${cep}` : null;
    }
    case 'email':
      return clean(recipient.email);
    case 'telefone':
      return clean(recipient.telefone);
    case 'observacao':
      return clean(recipient.observacao);
  }
}

function uniqueNonEmpty(lines: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const normalized = clean(line);
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}

function flagLines(flags?: EtiquetaPrintFlags): string[] {
  const lines: string[] = [];
  if (flags?.peo) lines.push('P.E.O.');
  if (flags?.ectOpenable) lines.push('PODE SER ABERTO PELA ECT');
  return lines;
}

export function formatPostalLabel(
  recipient: EtiquetaRecipient,
  flags?: EtiquetaPrintFlags,
): LabelContent {
  const cep = formatCep(recipient.cep);
  return {
    id: recipient.id,
    lines: uniqueNonEmpty([
      recipient.nome,
      recipient.enderecoCompleto,
      recipient.complemento,
      recipient.bairro,
      cityUf(recipient),
      cep ? `CEP ${cep}` : null,
      ...flagLines(flags),
    ]),
  };
}

export function formatMalaDiplomaticaLabel(
  recipient: EtiquetaRecipient,
  flags?: EtiquetaPrintFlags,
): LabelContent {
  return {
    id: recipient.id,
    lines: uniqueNonEmpty([
      recipient.nome,
      recipient.posto ?? recipient.lotacao,
      ...flagLines(flags),
    ]),
  };
}

export function formatCustomLabel(
  recipient: EtiquetaRecipient,
  fields: EtiquetaFieldKey[],
  flags?: EtiquetaPrintFlags,
): LabelContent {
  const orderedFields = FIELD_ORDER.filter((field) => fields.includes(field));
  return {
    id: recipient.id,
    lines: uniqueNonEmpty([
      ...orderedFields.map((field) => labelForField(field, recipient)),
      ...flagLines(flags),
    ]),
  };
}

export function formatEtiquetaLines(input: EtiquetaGenerationInput): LabelContent[] {
  const fields = resolveFieldsForMode(input.mode, input.selectedFields);
  const hasManualFieldSelection = Boolean(input.selectedFields?.length);
  return input.recipients.map((recipient) => {
    if (hasManualFieldSelection) return formatCustomLabel(recipient, fields, input.flags);
    if (input.mode === 'postal') return formatPostalLabel(recipient, input.flags);
    if (input.mode === 'mala_diplomatica')
      return formatMalaDiplomaticaLabel(recipient, input.flags);
    return formatCustomLabel(recipient, fields, input.flags);
  });
}
