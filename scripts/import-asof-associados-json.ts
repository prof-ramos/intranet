import { loadEnvConfig } from '@next/env';
import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

type RawAssociate = Record<string, unknown>;

type SourceFile = RawAssociate[];

type FunctionalStatus = 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
type AssociationStatus = 'ativo' | 'inativo';
type ContributionStatus = 'em_dia' | 'inadimplente' | 'pendente_migracao';

type ImportedAssociate = ReturnType<typeof toAssociate>;

const BATCH_SIZE = 100;

function stringValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function boolValue(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = stringValue(value)?.toLowerCase();
  return ['1', 'true', 'sim', 's', 'ativo'].includes(normalized ?? '');
}

function digitsOnly(value: unknown) {
  const digits = stringValue(value)?.replace(/\D/g, '') ?? null;
  return digits && digits.length > 0 ? digits : null;
}

function cpfValue(value: unknown) {
  const digits = digitsOnly(value);
  return digits?.length === 11 ? digits : null;
}

function emailValue(value: unknown) {
  const email = stringValue(value)?.toLowerCase() ?? null;
  return email?.includes('@') ? email : null;
}

function dateValue(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!br) return null;

  const [, day, month, year] = br;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function timestampValue(value: unknown) {
  const date = dateValue(value);
  return date ? `${date}T00:00:00.000Z` : null;
}

function addressValue(row: RawAssociate) {
  return (
    [
      stringValue(row.endereco),
      stringValue(row.bairro),
      stringValue(row.cidade),
      stringValue(row.uf_endereco),
      stringValue(row.cep),
      stringValue(row.pais),
    ]
      .filter(Boolean)
      .join(' · ') || null
  );
}

function functionalStatus(row: RawAssociate): FunctionalStatus {
  const lotacao = stringValue(row.lotacao)?.toUpperCase() ?? '';
  const origem = stringValue(row.origem)?.toUpperCase() ?? '';

  const licencas = Array.isArray(row.licencas) ? row.licencas : [];
  const licenca = licencas[0] as Record<string, unknown> | undefined;
  if (stringValue(licenca?.tipo) || stringValue(licenca?.data_licenca)) return 'em_licenca';
  if (lotacao.includes('APOSENTAD')) return 'aposentado';
  if (lotacao.includes('CEDID') || origem.includes('OUTROS')) return 'cedido';
  return 'ativo';
}

function dedupe<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const seen = new Set<string>();

  for (const row of rows) {
    const value = typeof row[key] === 'string' ? row[key] : null;
    if (!value) continue;

    if (seen.has(value)) {
      row[key] = null as T[keyof T];
      continue;
    }

    seen.add(value);
  }
}

function toAssociate(row: RawAssociate, index: number) {
  const isAssociated = boolValue(row.associado);
  const associationStatus: AssociationStatus = isAssociated ? 'ativo' : 'inativo';
  const contributionStatus: ContributionStatus = isAssociated ? 'em_dia' : 'pendente_migracao';
  const sourcePayload = {
    origem: 'asof_merged.json',
    row,
  };

  return {
    source_row_number: String(index + 1),
    full_name: stringValue(row.nome) ?? `Registro sem nome ${index + 1}`,
    cpf: cpfValue(row.cpf),
    primary_email: emailValue(row.email),
    phone: stringValue(row.telefone),
    whatsapp: stringValue(row.celular),
    siape: digitsOnly(row.matricula_siape),
    functional_status: functionalStatus(row),
    assignment: stringValue(row.lotacao),
    assignment_start_date: dateValue(row.data_lotacao),
    location_city: stringValue(row.cidade),
    location_country: stringValue(row.pais),
    association_status: associationStatus,
    joined_at: timestampValue(row.data_adesao),
    association_category: stringValue(row.missao),
    contribution_status: contributionStatus,
    address: addressValue(row),
    secondary_email: null,
    internal_notes: (() => {
      const licencas = Array.isArray(row.licencas) ? row.licencas : [];
      const dataCancelamento = stringValue(
        (licencas[0] as Record<string, unknown> | undefined)?.data_cancelamento,
      );
      return dataCancelamento ? `Cancelamento no sistema legado: ${dataCancelamento}` : null;
    })(),
    birth_date: dateValue(row.data_nascimento),
    class_pattern: (() => {
      const classe = stringValue(row.classe);
      const padrao = stringValue(row.padrao);
      if (classe && padrao) return `${classe} - ${padrao}`;
      return classe ?? padrao ?? null;
    })(),
    source_payload: JSON.stringify(sourcePayload),
  };
}

async function loadSource(filePath: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const parsed = JSON.parse(await fs.readFile(absolutePath, 'utf8'));

  if (!Array.isArray(parsed)) {
    throw new Error('JSON inválido: arquivo deve conter uma lista de associados.');
  }

  return parsed as SourceFile;
}

async function main() {
  loadEnvConfig(process.cwd());

  const sourcePath = process.argv[2];
  const shouldApply = process.argv.includes('--apply');
  const shouldReplace = process.argv.includes('--replace');

  if (!sourcePath) {
    throw new Error(
      'Uso: npx tsx scripts/import-asof-associados-json.ts <arquivo.json> [--apply] [--replace]',
    );
  }

  const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DATABASE_POSTGRES_URL must be set.');
  }

  const sourceRows = await loadSource(sourcePath);
  const rows = sourceRows.map(toAssociate);
  dedupe(rows, 'cpf');
  dedupe(rows, 'siape');
  dedupe(rows, 'primary_email');

  const summary = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc.association[row.association_status] += 1;
      acc.functional[row.functional_status] += 1;
      return acc;
    },
    {
      total: 0,
      association: {
        ativo: 0,
        inativo: 0,
      } satisfies Record<AssociationStatus, number>,
      functional: {
        ativo: 0,
        aposentado: 0,
        cedido: 0,
        em_licenca: 0,
      } satisfies Record<FunctionalStatus, number>,
    },
  );

  console.log(`Arquivo pronto para importação: ${summary.total} associados.`);
  console.log(
    `Associação: ${summary.association.ativo} ativos, ${summary.association.inativo} inativos. Funcional: ${summary.functional.ativo} ativos, ${summary.functional.aposentado} aposentados, ${summary.functional.cedido} cedidos, ${summary.functional.em_licenca} em licença.`,
  );

  if (!shouldApply) {
    console.log('Dry-run concluído. Reexecute com --apply para gravar no banco.');
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl:
      process.env.DB_SSL === 'true' ||
      process.env.NODE_ENV === 'production' ||
      new URL(databaseUrl).searchParams.get('sslmode') === 'require'
        ? 'require'
        : undefined,
  });

  try {
    const before = await sql<{ count: string }[]>`select count(*)::text as count from associates`;
    const activities = await sql<
      { count: string }[]
    >`select count(*)::text as count from activities`;
    const activityCount = Number(activities[0]?.count ?? 0);

    if (shouldReplace && activityCount > 0) {
      throw new Error(
        `Importação com --replace bloqueada: existem ${activityCount} atividades que podem referenciar associados.`,
      );
    }

    await sql.begin(async (transaction) => {
      if (shouldReplace) {
        await transaction`delete from associates`;
      }

      const columns: (keyof ImportedAssociate)[] = [
        'source_row_number',
        'full_name',
        'cpf',
        'primary_email',
        'phone',
        'whatsapp',
        'siape',
        'functional_status',
        'assignment',
        'assignment_start_date',
        'location_city',
        'location_country',
        'association_status',
        'joined_at',
        'association_category',
        'contribution_status',
        'address',
        'secondary_email',
        'internal_notes',
        'birth_date',
        'class_pattern',
        'source_payload',
      ];

      for (let index = 0; index < rows.length; index += BATCH_SIZE) {
        const batch = rows.slice(index, index + BATCH_SIZE);
        await transaction`insert into associates ${transaction(batch, columns)}`;
        console.log(
          `Inserido lote ${Math.floor(index / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`,
        );
      }
    });

    const after = await sql<{ count: string }[]>`select count(*)::text as count from associates`;
    console.log(
      `Associados antes: ${before[0]?.count ?? '0'}. Associados depois: ${after[0]?.count ?? '0'}.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
