export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { associates } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { getDevAuthUser, isSkipAuthEnabled } from '@/lib/auth/config';
import type { Associate } from '@/lib/db/schema/associates';

type FieldDef = {
  key: string;
  label: string;
  get: (r: Associate) => string | null | undefined;
};

const ALL_FIELDS: FieldDef[] = [
  { key: 'fullName', label: 'Nome', get: (r) => r.fullName },
  { key: 'primaryEmail', label: 'E-mail', get: (r) => r.primaryEmail },
  { key: 'secondaryEmail', label: 'E-mail Secundário', get: (r) => r.secondaryEmail },
  { key: 'birthDate', label: 'Data de Nascimento', get: (r) => r.birthDate },
  { key: 'cpf', label: 'CPF', get: (r) => r.cpf },
  { key: 'address', label: 'Endereço', get: (r) => r.address },
  { key: 'locationCity', label: 'Cidade', get: (r) => r.locationCity },
  { key: 'locationCountry', label: 'País', get: (r) => r.locationCountry },
  { key: 'phone', label: 'Telefone', get: (r) => r.phone },
  { key: 'whatsapp', label: 'Celular/WhatsApp', get: (r) => r.whatsapp },
  { key: 'siape', label: 'Matrícula SIAPE', get: (r) => r.siape },
  { key: 'assignment', label: 'Lotação', get: (r) => r.assignment },
  { key: 'assignmentStartDate', label: 'Data da Lotação', get: (r) => r.assignmentStartDate },
  { key: 'classPattern', label: 'Classe e Padrão', get: (r) => r.classPattern },
  { key: 'functionalStatus', label: 'Situação Funcional', get: (r) => r.functionalStatus },
  { key: 'associationStatus', label: 'Situação Associativa', get: (r) => r.associationStatus },
  { key: 'contributionStatus', label: 'Contribuição', get: (r) => r.contributionStatus },
  { key: 'joinedAt', label: 'Data de Adesão', get: (r) => r.joinedAt },
  { key: 'associationCategory', label: 'Categoria', get: (r) => r.associationCategory },
];

function toCsvCell(value: string | null | undefined): string {
  const str = value == null ? '' : value;
  return `"${str.replace(/"/g, '""')}"`;
}

function isFunctionalStatus(v: string): v is 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' {
  return ['ativo', 'aposentado', 'cedido', 'em_licenca'].includes(v);
}

function isAssociationStatus(v: string): v is 'ativo' | 'inativo' {
  return ['ativo', 'inativo'].includes(v);
}

function isContributionStatus(
  v: string,
): v is 'em_dia' | 'inadimplente' | 'pendente_migracao' {
  return ['em_dia', 'inadimplente', 'pendente_migracao'].includes(v);
}

export async function GET(request: NextRequest) {
  if (isSkipAuthEnabled()) {
    getDevAuthUser();
  } else {
    const session = await getSession();
    if (!session?.isLoggedIn) {
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }
  }

  // Lazy import avoids DB initialization at Next.js build time
  const { db } = await import('@/lib/db');

  const { searchParams } = new URL(request.url);
  const selectedKeys = searchParams.getAll('fields');

  const selectedFields =
    selectedKeys.length > 0
      ? ALL_FIELDS.filter((f) => selectedKeys.includes(f.key))
      : ALL_FIELDS;

  const conditions = [];

  const functionalStatusParam = searchParams.get('functionalStatus');
  if (functionalStatusParam && functionalStatusParam !== 'todos') {
    if (isFunctionalStatus(functionalStatusParam)) {
      conditions.push(eq(associates.functionalStatus, functionalStatusParam));
    }
  }

  const associationStatusParam = searchParams.get('associationStatus');
  if (associationStatusParam && associationStatusParam !== 'todos') {
    if (isAssociationStatus(associationStatusParam)) {
      conditions.push(eq(associates.associationStatus, associationStatusParam));
    }
  }

  const contributionStatusParam = searchParams.get('contributionStatus');
  if (contributionStatusParam && contributionStatusParam !== 'todos') {
    if (isContributionStatus(contributionStatusParam)) {
      conditions.push(eq(associates.contributionStatus, contributionStatusParam));
    }
  }

  const birthMonthParam = searchParams.get('birthMonth');
  if (birthMonthParam && birthMonthParam !== 'todos') {
    const month = parseInt(birthMonthParam, 10);
    if (month >= 1 && month <= 12) {
      conditions.push(
        sql`extract(month from ${associates.birthDate})::integer = ${month}`,
      );
    }
  }

  const rows = await db
    .select()
    .from(associates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(associates.fullName));

  const headerRow = selectedFields.map((f) => toCsvCell(f.label)).join(',');
  const dataRows = rows.map((row) =>
    selectedFields.map((f) => toCsvCell(f.get(row))).join(','),
  );

  // BOM prefix ensures Excel opens UTF-8 correctly
  const csv = '﻿' + [headerRow, ...dataRows].join('\r\n');
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-asof-${date}.csv"`,
    },
  });
}
