import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { decryptAssociatePii } from '@/lib/associates/pii-mapping';
import { buildAssociateNameSearchPattern } from '@/lib/associates/search-params';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import type { EtiquetaRecipient } from './types';

export interface EtiquetaAssociateOption {
  id: number;
  nome: string;
  lotacao: string | null;
  cidade: string | null;
  uf: string | null;
}

const etiquetaAssociateColumns = {
  id: associates.id,
  fullName: associates.fullName,
  siape: associates.siape,
  siapeCiphertext: associates.siapeCiphertext,
  primaryEmail: associates.primaryEmail,
  primaryEmailCiphertext: associates.primaryEmailCiphertext,
  phone: associates.phone,
  phoneCiphertext: associates.phoneCiphertext,
  address: associates.address,
  addressCiphertext: associates.addressCiphertext,
  associationCategory: associates.associationCategory,
  associationStatus: associates.associationStatus,
  assignment: associates.assignment,
  locationCity: associates.locationCity,
  addressState: associates.addressState,
  neighborhood: associates.neighborhood,
  zipCode: associates.zipCode,
};

const hasPrintableAssociateName = sql`${associates.fullName} IS NOT NULL
  AND btrim(${associates.fullName}) <> ''
  AND ${associates.fullName} <> '(sem nome)'`;

export async function searchAssociatesForEtiquetas(query?: string): Promise<EtiquetaAssociateOption[]> {
  const normalizedQuery = query?.trim();

  const rows = await db
    .select({
      id: associates.id,
      fullName: associates.fullName,
      assignment: associates.assignment,
      locationCity: associates.locationCity,
      addressState: associates.addressState,
    })
    .from(associates)
    .where(
      and(
        eq(associates.associationStatus, 'ativo'),
        hasPrintableAssociateName,
        normalizedQuery
          ? sql`${associates.fullName} ilike ${buildAssociateNameSearchPattern(normalizedQuery)} escape '\\'`
          : undefined,
      ),
    )
    .orderBy(asc(associates.fullName), asc(associates.id))
    .limit(100);

  return rows.map((row) => ({
    id: row.id,
    nome: row.fullName,
    lotacao: row.assignment,
    cidade: row.locationCity,
    uf: row.addressState,
  }));
}

export async function getEtiquetaRecipientsByIds(ids: number[]): Promise<EtiquetaRecipient[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select(etiquetaAssociateColumns)
    .from(associates)
    .where(and(eq(associates.associationStatus, 'ativo'), hasPrintableAssociateName, inArray(associates.id, ids)))
    .orderBy(asc(associates.fullName), asc(associates.id));

  return rows.map((row) => {
    const decrypted = decryptAssociatePii({
      cpf: null,
      cpfCiphertext: null,
      siape: row.siape,
      siapeCiphertext: row.siapeCiphertext,
      primaryEmail: row.primaryEmail,
      primaryEmailCiphertext: row.primaryEmailCiphertext,
      phone: row.phone,
      phoneCiphertext: row.phoneCiphertext,
      whatsapp: null,
      whatsappCiphertext: null,
      address: row.address,
      addressCiphertext: row.addressCiphertext,
      rg: null,
      rgCiphertext: null,
      cpfHash: null,
      siapeHash: null,
      primaryEmailHash: null,
      phoneHash: null,
      whatsappHash: null,
      addressHash: null,
      rgHash: null,
    });

    return {
      id: String(row.id),
      nome: row.fullName,
      matricula: decrypted.siape,
      categoria: row.associationCategory,
      situacaoAssociativa: row.associationStatus,
      lotacao: row.assignment,
      posto: row.assignment,
      enderecoCompleto: decrypted.address,
      bairro: row.neighborhood,
      cidade: row.locationCity,
      uf: row.addressState,
      cep: row.zipCode,
      email: decrypted.primaryEmail,
      telefone: decrypted.phone,
    };
  });
}
