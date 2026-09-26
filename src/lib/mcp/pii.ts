import type { Associate } from '@/lib/db/schema/associates';
import type { AssociateListItem } from '@/lib/associates/repository';
import { PUBLIC_FIELDS } from '@/lib/associates/lgpd';

// Política de PII por CANAL (não por papel): dentro da intranet a visibilidade
// operacional é integral e o mascaramento por papel é proibido (CONTEXT.md,
// linha 341). Porém a mesma linha 342 de CONTEXT.md deixa claro que "a
// visibilidade integral no app não autoriza exposição fora da intranet" — e o
// MCP é um canal de saída para clientes externos (Claude/Cursor). Por isso a
// projeção padrão retorna apenas campos operacionais e os campos sensíveis só
// são incluídos quando o chamador pede explicitamente `includeSensitive: true`.
type DecryptedAssociatePii = {
  cpf: string | null;
  siape: string | null;
  primaryEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  rg: string | null;
};

const MCP_SENSITIVE_FIELDS = [
  'cpf',
  'siape',
  'primaryEmail',
  'secondaryEmail',
  'phone',
  'whatsapp',
  'address',
  'rg',
  'birthDate',
  'neighborhood',
  'zipCode',
  'internalNotes',
] as const satisfies readonly (keyof Associate)[];

const FORBIDDEN_STORAGE_FIELD = /(Ciphertext|Hash)$/;

export type McpAssociateInput =
  | Associate
  | AssociateListItem
  | (Partial<Associate> & { id: number });

export function toMcpAssociate(
  row: McpAssociateInput,
  decrypted: DecryptedAssociatePii | null,
  includeSensitive: boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const record = row as Record<string, unknown>;

  for (const field of PUBLIC_FIELDS) {
    if (!FORBIDDEN_STORAGE_FIELD.test(field) && field !== 'sourcePayload' && field in record) {
      result[field] = record[field];
    }
  }
  result.id = row.id;

  if (!includeSensitive) return result;
  if (!decrypted) {
    throw new Error('Os dados sensíveis solicitados não puderam ser descriptografados.');
  }

  for (const field of MCP_SENSITIVE_FIELDS) {
    result[field] =
      field in decrypted ? decrypted[field as keyof DecryptedAssociatePii] : record[field];
  }

  return result;
}

export { MCP_SENSITIVE_FIELDS };
