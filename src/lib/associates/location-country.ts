import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

const DOMESTIC_COUNTRY_ALIASES = ['brasil', 'brazil'] as const;

function normalizeCountryValue(country: string | null | undefined): string | null {
  const normalized = country?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isDomesticCountry(country: string | null | undefined): boolean {
  const normalized = normalizeCountryValue(country);
  return (
    normalized === null ||
    DOMESTIC_COUNTRY_ALIASES.includes(normalized as (typeof DOMESTIC_COUNTRY_ALIASES)[number])
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

  if (DOMESTIC_COUNTRY_ALIASES.includes(normalized as (typeof DOMESTIC_COUNTRY_ALIASES)[number])) {
    return 'Brasil';
  }

  return country?.trim() ?? null;
}

export function isDomesticCountrySql(column: SQLWrapper): SQL {
  return sql`(
    ${column} is null
    or nullif(btrim(${column}), '') is null
    or lower(btrim(${column})) in ('brasil', 'brazil')
  )`;
}

export function isExteriorCountrySql(column: SQLWrapper): SQL {
  return sql`not ${isDomesticCountrySql(column)}`;
}

export function normalizedCountryLabelSql(column: SQLWrapper): SQL<string | null> {
  return sql<string | null>`case
    when ${column} is null or nullif(btrim(${column}), '') is null then null
    when lower(btrim(${column})) in ('brasil', 'brazil') then 'Brasil'
    else btrim(${column})
  end`;
}
