import { describe, expect, it } from 'vitest';
import { sql, type SQL } from 'drizzle-orm';
import {
  isDomesticCountry,
  isDomesticCountrySql,
  isExteriorCountry,
  isExteriorCountrySql,
  normalizeCountryLabel,
  normalizedCountryLabelSql,
} from './location-country';

function compileSql(fragment: SQL) {
  return fragment.toQuery({
    escapeName: (name: string) => `"${name}"`,
    escapeParam: (_: unknown, index: number) => `$${index + 1}`,
    escapeString: (value: string) => `'${value}'`,
    casing: { getColumnCasing: (column: string) => column },
    inlineParams: false,
    paramStartIndex: { value: 0 },
  } as never).sql;
}

describe('location-country helpers', () => {
  it('treats null, blank, Brasil and Brazil as domestic', () => {
    expect(isDomesticCountry(null)).toBe(true);
    expect(isDomesticCountry('')).toBe(true);
    expect(isDomesticCountry('   ')).toBe(true);
    expect(isDomesticCountry('Brasil')).toBe(true);
    expect(isDomesticCountry(' brazil ')).toBe(true);
  });

  it('treats non-Brazil countries as exterior', () => {
    expect(isExteriorCountry('França')).toBe(true);
    expect(isExteriorCountry('Estados Unidos')).toBe(true);
    expect(isExteriorCountry('Brasil')).toBe(false);
  });

  it('normalizes Brazil aliases but preserves other countries and nulls', () => {
    expect(normalizeCountryLabel('Brasil')).toBe('Brasil');
    expect(normalizeCountryLabel(' brazil ')).toBe('Brasil');
    expect(normalizeCountryLabel(' França ')).toBe('França');
    expect(normalizeCountryLabel('')).toBeNull();
    expect(normalizeCountryLabel(null)).toBeNull();
  });

  it('builds a domestic SQL predicate with null and alias handling', () => {
    const compiled = compileSql(isDomesticCountrySql(sql.raw('location_country')));

    expect(compiled).toContain('location_country is null');
    expect(compiled).toContain("nullif(btrim(location_country), '') is null");
    expect(compiled).toContain("lower(btrim(location_country)) in ('brasil', 'brazil')");
  });

  it('builds an exterior SQL predicate as the inverse of domestic', () => {
    const compiled = compileSql(isExteriorCountrySql(sql.raw('location_country')));

    expect(compiled).toContain('not (');
    expect(compiled).toContain("lower(btrim(location_country)) in ('brasil', 'brazil')");
  });

  it('builds a normalized country label SQL expression', () => {
    const compiled = compileSql(normalizedCountryLabelSql(sql.raw('location_country')));

    expect(compiled).toContain('case');
    expect(compiled).toContain("when location_country is null or nullif(btrim(location_country), '') is null then null");
    expect(compiled).toContain("when lower(btrim(location_country)) in ('brasil', 'brazil') then 'Brasil'");
    expect(compiled).toContain('else btrim(location_country)');
  });
});
