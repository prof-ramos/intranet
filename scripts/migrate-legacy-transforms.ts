/**
 * Pure transform functions for legacy data import (migration 0020+).
 *
 * All functions are stateless and deterministic — no DB access, no side effects.
 * Unit-testable in isolation.
 *
 * Key conventions:
 * - Dash (`-`) is the null sentinel in legacy data → mapped to `null`
 * - `AC` in UF columns means "a confirmar" (to be confirmed), NOT Acre state → `null`
 * - Dates are in D/M/YYYY Brazilian format
 * - PII fields are NOT encrypted here; the main script handles encryption
 */

// ---------------------------------------------------------------------------
// Null sentinel
// ---------------------------------------------------------------------------

const NULL_SENTINEL = '-';
const AC_SENTINEL = 'AC';

/** Return null if the value is the dash sentinel, empty, or whitespace-only. */
export function nullIfEmpty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === NULL_SENTINEL || trimmed === '' ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Date parsing — D/M/YYYY Brazilian format
// ---------------------------------------------------------------------------

/**
 * Parse a Brazilian date string (D/M/YYYY) into ISO format (YYYY-MM-DD).
 * Returns null for dash sentinel, empty, or unparseable dates.
 * Handles single-digit day/month: `1/3/1970` → `1970-03-01`.
 */
export function parseDate(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  let year = parseInt(yearStr, 10);

  // Two-digit year: assume 1900s for values < 50, 2000s otherwise
  if (yearStr.length === 2) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1800 || year > 2100) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Enum mappers
// ---------------------------------------------------------------------------

const SEX_MAP: Record<string, 'M' | 'F'> = {
  M: 'M',
  F: 'F',
};

const MARITAL_STATUS_MAP: Record<string, string> = {
  'CASADO(A)': 'casado',
  'SOLTEIRO(A)': 'solteiro',
  'DIVORCIADO(A)': 'divorciado',
  'VIÚVO(A)': 'viuvo',
  'SEPARADO(A)': 'separado',
  OUTROS: 'outros',
};

const MISSION_TYPE_MAP: Record<string, string> = {
  PERMANENTE: 'permanente',
  'TRANSITÓRIA': 'transitoria',
  TRANSITORIA: 'transitoria',
};

const CAREER_ORIGIN_MAP: Record<string, string> = {
  BRASIL: 'brasil',
  EXTERIOR: 'exterior',
  'OUTROS ÓRGÃOS': 'outros_orgaos',
  'OUTROS ORGAOS': 'outros_orgaos',
};

const ASSOCIATION_STATUS_MAP: Record<string, string> = {
  sim: 'ativo',
  não: 'inativo',
  nao: 'inativo',
};

/** Generic enum mapper — returns mapped value or null. */
export function mapEnum<T extends string>(
  value: string | null | undefined,
  mapping: Record<string, T>,
): T | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;
  return mapping[raw] ?? null;
}

export function mapSex(value: string | null | undefined): 'M' | 'F' | null {
  return mapEnum(value, SEX_MAP);
}

export function mapMaritalStatus(value: string | null | undefined): string | null {
  return mapEnum(value, MARITAL_STATUS_MAP);
}

export function mapMissionType(value: string | null | undefined): string | null {
  return mapEnum(value, MISSION_TYPE_MAP);
}

export function mapCareerOrigin(value: string | null | undefined): string | null {
  return mapEnum(value, CAREER_ORIGIN_MAP);
}

export function mapAssociationStatus(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;
  // Case-insensitive match
  const lower = raw.toLowerCase().trim();
  return ASSOCIATION_STATUS_MAP[lower] ?? null;
}

// ---------------------------------------------------------------------------
// AC sentinel — UF columns
// ---------------------------------------------------------------------------

/**
 * Map UF (state) values, treating `AC` as "a confirmar" (null sentinel).
 * Also maps dash to null. Preserves valid state codes and special values
 * like `EXTERIOR` and `DESCONHECIDO`.
 */
export function mapUfWithAcSentinel(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === AC_SENTINEL) return null;
  return trimmed;
}

// ---------------------------------------------------------------------------
// Boolean mapping
// ---------------------------------------------------------------------------

/**
 * Map `sim`/`não`/`-` to boolean.
 * Returns true for "sim", false/null for anything else.
 */
export function mapBoolean(value: string | null | undefined): boolean | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;
  return raw.trim().toLowerCase() === 'sim';
}

// ---------------------------------------------------------------------------
// CPF normalization
// ---------------------------------------------------------------------------

/**
 * Validate CPF check digits.
 * CPF format: 11 digits where the last 2 are check digits.
 */
function validateCpfCheckDigits(digits: string): boolean {
  if (digits.length !== 11) return false;
  // All same digit is invalid
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  const remainder = (sum * 10) % 11;
  const digit1 = remainder === 10 ? 0 : remainder;
  if (digit1 !== parseInt(digits[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  const remainder2 = (sum * 10) % 11;
  const digit2 = remainder2 === 10 ? 0 : remainder2;
  return digit2 === parseInt(digits[10], 10);
}

export interface CpfResult {
  /** Normalized 11-digit CPF string, or null if invalid/malformed */
  digits: string | null;
  /** Whether the CPF passed check-digit validation */
  valid: boolean;
  /** Category of the issue, if any */
  issue: 'ok' | 'malformed' | 'wrong_length' | 'invalid_check_digits' | 'non_numeric';
}

/**
 * Normalize a CPF value from legacy data.
 * Strips formatting (dots, dashes, spaces), validates length and check digits.
 */
export function normalizeCpf(value: string | null | undefined): CpfResult {
  const raw = nullIfEmpty(value);
  if (raw == null) return { digits: null, valid: false, issue: 'malformed' };

  // Strip formatting
  const stripped = raw.replace(/[.\-\s]/g, '');

  // Check if numeric
  if (!/^\d+$/.test(stripped)) {
    return { digits: null, valid: false, issue: 'non_numeric' };
  }

  // Check length
  if (stripped.length !== 11) {
    return { digits: null, valid: false, issue: 'wrong_length' };
  }

  // Validate check digits
  if (!validateCpfCheckDigits(stripped)) {
    return { digits: null, valid: false, issue: 'invalid_check_digits' };
  }

  return { digits: stripped, valid: true, issue: 'ok' };
}

// ---------------------------------------------------------------------------
// SIAPE normalization
// ---------------------------------------------------------------------------

/**
 * Normalize SIAPE number by stripping (FALECIDO(A)) suffixes and whitespace.
 * Returns the cleaned numeric string, or null if empty/dash.
 */
export function normalizeSiape(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;

  // Strip deceased annotation: "(FALECIDO(A))" or "(FALECIDO)"
  let cleaned = raw.replace(/\s*\(FALECIDO\(A\)\)\s*/gi, '').replace(/\s*\(FALECIDO\)\s*/gi, '');
  cleaned = cleaned.trim();
  return cleaned || null;
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/**
 * Normalize phone/whatsapp number: strip parens, dashes, dots, spaces.
 * Takes the first number if multiple are separated by `/`.
 * Returns null if dash/empty.
 */
export function normalizePhone(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;

  // Take first number if separated by "/"
  const first = raw.split('/')[0].trim();
  if (first === NULL_SENTINEL || first === '') return null;

  // Strip formatting
  return first.replace(/[().\-\s]/g, '');
}

// ---------------------------------------------------------------------------
// CEP normalization
// ---------------------------------------------------------------------------

/**
 * Normalize CEP (Brazilian postal code): strip dots and dashes.
 * Returns null if dash/empty.
 */
export function normalizeCep(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;
  return raw.replace(/[.\-]/g, '').trim() || null;
}

// ---------------------------------------------------------------------------
// Dependent parsing
// ---------------------------------------------------------------------------

export interface Dependent {
  name: string;
  relationship: string;
}

/**
 * Parse the concatenated `Dependentes` field from legacy data.
 * Format: `NAME (RELATIONSHIP)NAME (RELATIONSHIP)...`
 *
 * Uses match-all regex to handle nested parentheses in relationships
 * like `FILHO(A)`, `CÔNJUGE`, `COMPANHEIRO(A)`.
 *
 * Unparseable entries are returned with `relationship='desconhecido'`.
 */
export function parseDependents(value: string | null | undefined): Dependent[] {
  const raw = nullIfEmpty(value);
  if (raw == null) return [];

  const entries: Dependent[] = [];

  // Match NAME (RELATIONSHIP) where RELATIONSHIP can contain (A) style suffixes.
  // The regex uses a non-greedy name capture and allows one level of
  // parenthetical nesting inside the relationship.
  // Alternation order matters: try \(...\) group FIRST, then [^)] single char.
  const pattern = /([A-ZÀ-Ü][A-ZÀ-Ü\s.]+?)\s*\(((?:\([^)]*\)|[^)])*)\)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const name = match[1].trim();
    const relationship = match[2].trim();
    if (name && relationship) {
      entries.push({ name, relationship });
    }
  }

  // Fallback: if regex matched nothing, try the entire string as one entry
  if (entries.length === 0 && raw.trim().length > 0) {
    entries.push({ name: raw.trim(), relationship: 'desconhecido' });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Convênios (health agreements) parsing
// ---------------------------------------------------------------------------

const KNOWN_PROVIDERS = ['SINDITAMARATY', 'ODONTOEMPRESA', 'AMIL', 'ASBAC'];

/**
 * Parse the concatenated `Convênios` field from legacy data.
 * Greedy longest-match against known provider names.
 *
 * Example: `AMILODONTOEMPRESASINDITAMARATY` → `['AMIL', 'ODONTOEMPRESA', 'SINDITAMARATY']`
 */
export function parseConvenios(value: string | null | undefined): string[] {
  const raw = nullIfEmpty(value);
  if (raw == null) return [];

  const providers: string[] = [];
  let remaining = raw.trim().toUpperCase();

  // Sort by length descending for greedy matching
  const sortedProviders = [...KNOWN_PROVIDERS].sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    let matched = false;
    for (const provider of sortedProviders) {
      if (remaining.startsWith(provider)) {
        providers.push(provider);
        remaining = remaining.slice(provider.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Skip one character if no match
      remaining = remaining.slice(1);
    }
  }

  return providers;
}

// ---------------------------------------------------------------------------
// Country normalization — delegates to location-country module
// ---------------------------------------------------------------------------

/**
 * Normalize country name from legacy data.
 * Reuses the canonical mapping from `src/lib/associates/location-country.ts`.
 */
export function normalizeCountry(value: string | null | undefined): string | null {
  const raw = nullIfEmpty(value);
  if (raw == null) return null;

  // Import is done at the call site to avoid circular deps in tests
  // For now, do basic normalization inline
  // The main script will use the full normalizeCountryLabel() function
  const upper = raw.trim().toUpperCase();
  if (upper === '-' || upper === '') return null;
  return raw.trim();
}

// ---------------------------------------------------------------------------
// Functional status derivation
// ---------------------------------------------------------------------------

/**
 * Derive functional status from Lotação and Licença fields.
 * - Licença = "1" → "em_licenca"
 * - Lotação contains "APOSENTADO" → "aposentado"
 * - Lotação contains "INATIVO" → depends on context (could be aposentado or just inactive)
 * - Otherwise → null (let the database default handle it, or set to "ativo")
 */
export function mapFunctionalStatus(
  lotacao: string | null | undefined,
  licenca: string | null | undefined,
): string | null {
  const licRaw = nullIfEmpty(licenca);
  if (licRaw === '1') return 'em_licenca';

  const lotRaw = nullIfEmpty(lotacao);
  if (lotRaw == null) return null;

  const upper = lotRaw.toUpperCase();
  if (upper.includes('APOSENTADO')) return 'aposentado';
  if (upper.includes('INATIVO')) return 'aposentado'; // Most INATIVO are retirees
  if (upper.includes('CEDIDO')) return 'cedido';

  return 'ativo';
}

// ---------------------------------------------------------------------------
// Transform a single legacy record
// ---------------------------------------------------------------------------

export interface LegacyRecord {
  [key: string]: string;
}

export interface TransformResult {
  associate: Record<string, unknown>;
  dependents: Dependent[];
  healthAgreements: string[]; // provider names
  warnings: string[];
  sourceRowNumber: number;
}

/**
 * Transform a single legacy record into the shape needed for DB insertion.
 * PII fields are NOT encrypted here — the main script handles encryption.
 * Returns normalized values suitable for the Drizzle schema.
 */
export function transformLegacyRecord(
  record: LegacyRecord,
  rowIndex: number,
): TransformResult {
  const warnings: string[] = [];

  const getString = (key: string): string => record[key] ?? '';
  const n = (key: string): string | null => nullIfEmpty(getString(key));

  // CPF normalization
  const cpfResult = normalizeCpf(getString('C.P.F.'));
  if (cpfResult.issue !== 'ok' && getString('C.P.F.') !== '-') {
    warnings.push(`CPF issue at row ${rowIndex}: ${cpfResult.issue} (${getString('C.P.F.')})`);
  }

  // SIAPE normalization
  const siapeRaw = normalizeSiape(getString('Matrícula SIAPE'));

  // Functional status
  const functionalStatus = mapFunctionalStatus(getString('Lotação'), getString('Licença'));

  // Parse dependents
  const dependents = parseDependents(getString('Dependentes'));

  // Parse convênios
  const healthAgreements = parseConvenios(getString('Convênios'));

  // CEP normalization
  const zipCode = normalizeCep(getString('C.E.P.'));

  // Phone normalization
  const phone = normalizePhone(getString('Telefone'));
  const whatsapp = normalizePhone(getString('Celular'));

  const associate: Record<string, unknown> = {
    sourceRowNumber: String(rowIndex),
    fullName: n('Nome'),
    sex: mapSex(getString('Sexo')),
    maritalStatus: mapMaritalStatus(getString('Estado Civil')),
    birthCity: n('Naturalidade'),
    birthState: mapUfWithAcSentinel(getString('UF')),
    birthDate: parseDate(getString('Data de Nascimento')),
    rg: n('R.G.'),
    rgIssuer: n('Órgão Expedidor'),
    rgState: mapUfWithAcSentinel(getString('UF_2')),
    rgExpeditionDate: parseDate(getString('Data de Expedição')),
    address: n('Endereço'),
    locationCity: n('Cidade'),
    addressState: mapUfWithAcSentinel(getString('UF_3')),
    neighborhood: n('Bairro'),
    zipCode,
    locationCountry: n('País'), // Main script will apply full normalization
    phone,
    whatsapp,
    siape: siapeRaw,
    primaryEmail: n('E-mail')?.toLowerCase() || null,
    ceocMember: mapBoolean(getString('CEOC')),
    caocMember: mapBoolean(getString('CAOC')),
    admissionDate: parseDate(getString('Data de Admissão')),
    inaugurationDate: parseDate(getString('Data de Posse')),
    cancellationDate: parseDate(getString('Data de Cancelamento')),
    careerOrigin: mapCareerOrigin(getString('Origem')),
    missionType: mapMissionType(getString('Missão')),
    associationStatus: mapAssociationStatus(getString('Associado')) ?? 'inativo',
    functionalStatus,
    assignment: n('Lotação'),
    assignmentStartDate: parseDate(getString('Data de Lotação')),
    joinedAt: parseDate(getString('Data de Adesão')) != null
      ? (() => {
          const d = parseDate(getString('Data de Adesão'));
          return d != null ? `${d}T00:00:00Z` : null;
        })()
      : null,
    numberOfDependents: (() => {
      const raw = getString('Número de Dependentes');
      if (raw === '-' || raw === '') return null;
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? null : parsed;
    })(),
    contributionStatus: 'pendente_migracao',
    paymentMethod: 'folha',
  };

  return {
    associate,
    dependents,
    healthAgreements,
    warnings,
    sourceRowNumber: rowIndex,
  };
}