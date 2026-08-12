import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { toPortugueseTitleCase } from '@/lib/utils/portuguese-title-case';

/**
 * Canonical country labels (Portuguese) mapped from known aliases.
 * Keys are lowercased/trimmed for matching; values are the display labels.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  // Brasil
  brasil: 'Brasil',
  brazil: 'Brasil',
  brasili: 'Brasil',
  brasilia: 'Brasil',
  brasilía: 'Brasil',
  brasiléia: 'Brasil',
  // Estados Unidos
  eua: 'Estados Unidos',
  'e.u.a': 'Estados Unidos',
  'e.u.a.': 'Estados Unidos',
  usa: 'Estados Unidos',
  'united states': 'Estados Unidos',
  'united states of america': 'Estados Unidos',
  'estados unidos': 'Estados Unidos',
  'estados unidos da américa': 'Estados Unidos',
  'estados unidos da america': 'Estados Unidos',
  'estados unidos do américa': 'Estados Unidos',
  // Reino Unido
  'reino unido': 'Reino Unido',
  'reino unido da grã-bretanha': 'Reino Unido',
  uk: 'Reino Unido',
  'united kingdom': 'Reino Unido',
  'grã-bretanha': 'Reino Unido',
  'gra-bretanha': 'Reino Unido',
  inglaterra: 'Reino Unido',
  england: 'Reino Unido',
  // Argentina
  argentina: 'Argentina',
  // França
  frança: 'França',
  france: 'França',
  franca: 'França',
  // Portugal
  portugal: 'Portugal',
  // Alemanha
  alemanha: 'Alemanha',
  germany: 'Alemanha',
  deutschland: 'Alemanha',
  // Itália
  itália: 'Itália',
  italia: 'Itália',
  italy: 'Itália',
  // Japão
  japão: 'Japão',
  japao: 'Japão',
  japan: 'Japão',
  // China
  china: 'China',
  // Espanha
  espanha: 'Espanha',
  spain: 'Espanha',
  // Uruguai
  uruguai: 'Uruguai',
  uruguay: 'Uruguai',
  // Paraguai
  paraguai: 'Paraguai',
  paraguay: 'Paraguai',
  // Chile
  chile: 'Chile',
  // Colômbia
  colômbia: 'Colômbia',
  colombia: 'Colômbia',
  // Peru
  peru: 'Peru',
  // Bolívia
  bolívia: 'Bolívia',
  bolivia: 'Bolívia',
  // Venezuela
  venezuela: 'Venezuela',
  // Cuba
  cuba: 'Cuba',
  // Índia
  índia: 'Índia',
  india: 'Índia',
  // Rússia
  rússia: 'Rússia',
  russia: 'Rússia',
  // Suíça
  suíça: 'Suíça',
  suica: 'Suíça',
  switzerland: 'Suíça',
  // Bélgica
  bélgica: 'Bélgica',
  belgica: 'Bélgica',
  belgium: 'Bélgica',
  // Holanda / Países Baixos
  holanda: 'Holanda',
  'países baixos': 'Holanda',
  'paises baixos': 'Holanda',
  netherlands: 'Holanda',
  'the netherlands': 'Holanda',
  // África do Sul
  'áfrica do sul': 'África do Sul',
  'africa do sul': 'África do Sul',
  'south africa': 'África do Sul',
  // Catar
  catar: 'Catar',
  qatar: 'Catar',
  // Emirados Árabes
  'emirados árabes unidos': 'Emirados Árabes Unidos',
  'emirados arabes unidos': 'Emirados Árabes Unidos',
  'united arab emirates': 'Emirados Árabes Unidos',
  uae: 'Emirados Árabes Unidos',
  // Turquia
  turquia: 'Turquia',
  turkey: 'Turquia',
  // Costa do Marfim (Côte d'Ivoire)
  'costa do marfim': 'Costa do Marfim',
  "côte d'ivoire": 'Costa do Marfim',
  'cote d ivoire': 'Costa do Marfim',
  'cote divoire': 'Costa do Marfim',
  'ivory coast': 'Costa do Marfim',
  // Cordoba → ambiguous, but likely Argentina typo from data
  cordoba: 'Argentina',
  córdoba: 'Argentina',
};

const DOMESTIC_COUNTRY_ALIASES = ['brasil', 'brazil'] as const;

function normalizeCountryValue(country: string | null | undefined): string | null {
  const normalized = country?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isDomesticCountry(country: string | null | undefined): boolean {
  const normalized = normalizeCountryValue(country);
  return (
    normalized === null ||
    DOMESTIC_COUNTRY_ALIASES.includes(normalized as (typeof DOMESTIC_COUNTRY_ALIASES)[number]) ||
    COUNTRY_ALIASES[normalized] === 'Brasil'
  );
}

export function isExteriorCountry(country: string | null | undefined): boolean {
  return !isDomesticCountry(country);
}

export function normalizeCountryLabel(country: string | null | undefined): string | null {
  const normalized = normalizeCountryValue(country);

  if (normalized === null) {
    return null;
  }

  if (normalized in COUNTRY_ALIASES) {
    return COUNTRY_ALIASES[normalized];
  }

  return toPortugueseTitleCase(country ?? '');
}

export function isDomesticCountrySql(column: SQLWrapper): SQL {
  // Collect all aliases that normalize to 'Brasil' for the SQL IN clause
  const domesticAliases = [
    ...DOMESTIC_COUNTRY_ALIASES,
    ...Object.entries(COUNTRY_ALIASES)
      .filter(([, label]) => label === 'Brasil')
      .map(([alias]) => alias),
  ];
  const inClause = domesticAliases.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');

  return sql`(
    ${column} is null
    or nullif(btrim(${column}), '') is null
    or lower(btrim(${column})) in (${sql.raw(inClause)})
  )`;
}

export function isExteriorCountrySql(column: SQLWrapper): SQL {
  return sql`not ${isDomesticCountrySql(column)}`;
}

export function assignmentLocationTypeSql(
  assignmentTypeColumn: SQLWrapper,
  countryColumn: SQLWrapper,
): SQL<'nacional' | 'exterior'> {
  return sql`coalesce(
    ${assignmentTypeColumn}::text,
    case when ${isDomesticCountrySql(countryColumn)} then 'nacional' else 'exterior' end
  )`;
}

/**
 * Builds a SQL expression that applies Portuguese title case to a column value.
 * Uses chained `replace()` calls instead of `regexp_replace` with backreferences,
 * because PostgreSQL evaluates `lower('\1')` as a literal before backreference
 * substitution, making connector-word lowering impossible with `regexp_replace`.
 */
function toPortugueseTitleCaseSql(column: SQLWrapper): SQL {
  // initcap(lower(trim(col))) gives us "Costa Do Marfim" — we then
  // lowercase the known connector words via chained replace().
  const connectors = ['De', 'Da', 'Do', 'Das', 'Dos', 'E'];
  let expr: SQL | SQLWrapper = sql`initcap(lower(btrim(${column})))`;
  for (const word of connectors) {
    const lower = word.toLowerCase();
    const from = `' ${word.replace(/'/g, "''")} '`;
    const to = `' ${lower.replace(/'/g, "''")} '`;
    expr = sql`replace(${expr}, ${sql.raw(from)}, ${sql.raw(to)})`;
  }
  // Also handle connector at start: initcap never uppercases 2nd char of first word,
  // but handle edge case where first word IS a connector (unlikely for countries).
  return sql`${expr}`;
}

/**
 * Builds a SQL CASE expression that normalizes country labels using the alias map.
 * Priority: null → null, domestic aliases → 'Brasil', known aliases → canonical label,
 * everything else → Portuguese title case via initcap + connector lowering.
 */
export function normalizedCountryLabelSql(column: SQLWrapper): SQL<string | null> {
  // Build WHEN clauses from COUNTRY_ALIASES, grouping aliases by canonical label
  const labelGroups = new Map<string, string[]>();
  for (const [alias, label] of Object.entries(COUNTRY_ALIASES)) {
    if (!labelGroups.has(label)) {
      labelGroups.set(label, []);
    }
    labelGroups.get(label)!.push(alias);
  }

  const whenClauses: SQL[] = [];
  for (const [label, aliases] of labelGroups) {
    // Alias list and label are constant strings — safe as raw SQL.
    // Column reference uses ${column} inside sql`` to let Drizzle manage it,
    // avoiding reliance on SQLWrapper.toString() (P2 fix).
    const aliasList = aliases.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
    whenClauses.push(
      sql`when lower(btrim(${column})) in (${sql.raw(aliasList)}) then ${sql.raw(`'${label.replace(/'/g, "''")}'`)}`,
    );
  }

  return sql<string | null>`case
    when ${column} is null or nullif(btrim(${column}), '') is null then null
    ${sql.join(whenClauses, sql.raw(' '))}
    else ${toPortugueseTitleCaseSql(column)}
  end`;
}
