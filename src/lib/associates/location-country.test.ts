import { describe, expect, it } from 'vitest';
import { sql, type SQL } from 'drizzle-orm';
import {
  assignmentLocationTypeSql,
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
  describe('isDomesticCountry', () => {
    it('treats null, blank, Brasil and Brazil as nacional', () => {
      expect(isDomesticCountry(null)).toBe(true);
      expect(isDomesticCountry('')).toBe(true);
      expect(isDomesticCountry('   ')).toBe(true);
      expect(isDomesticCountry('Brasil')).toBe(true);
      expect(isDomesticCountry(' brazil ')).toBe(true);
    });

    it('treats Brasil typos as nacional', () => {
      expect(isDomesticCountry('BRASILI')).toBe(true);
      expect(isDomesticCountry('BRASILIA')).toBe(true);
      expect(isDomesticCountry('Brasilía')).toBe(true);
      expect(isDomesticCountry('Brasiléia')).toBe(true);
    });

    it('treats non-Brazil countries as exterior', () => {
      expect(isExteriorCountry('França')).toBe(true);
      expect(isExteriorCountry('Estados Unidos')).toBe(true);
      expect(isExteriorCountry('Brasil')).toBe(false);
    });
  });

  describe('normalizeCountryLabel', () => {
    it('normalizes domestic country aliases to Brasil', () => {
      expect(normalizeCountryLabel('Brasil')).toBe('Brasil');
      expect(normalizeCountryLabel(' brazil ')).toBe('Brasil');
      expect(normalizeCountryLabel('BRASILI')).toBe('Brasil');
      expect(normalizeCountryLabel('Brasilía')).toBe('Brasil');
    });

    it('consolidates EUA aliases to Estados Unidos', () => {
      expect(normalizeCountryLabel('EUA')).toBe('Estados Unidos');
      expect(normalizeCountryLabel('E.U.A')).toBe('Estados Unidos');
      expect(normalizeCountryLabel('E.U.A.')).toBe('Estados Unidos');
      expect(normalizeCountryLabel('USA')).toBe('Estados Unidos');
      expect(normalizeCountryLabel('United States')).toBe('Estados Unidos');
      expect(normalizeCountryLabel('ESTADOS UNIDOS')).toBe('Estados Unidos');
      expect(normalizeCountryLabel('Estados Unidos da América')).toBe('Estados Unidos');
    });

    it('consolidates UK aliases to Reino Unido', () => {
      expect(normalizeCountryLabel('Reino Unido')).toBe('Reino Unido');
      expect(normalizeCountryLabel('UK')).toBe('Reino Unido');
      expect(normalizeCountryLabel('United Kingdom')).toBe('Reino Unido');
      expect(normalizeCountryLabel('Inglaterra')).toBe('Reino Unido');
      expect(normalizeCountryLabel('England')).toBe('Reino Unido');
      expect(normalizeCountryLabel('Grã-Bretanha')).toBe('Reino Unido');
    });

    it('consolidates other common country aliases', () => {
      expect(normalizeCountryLabel('França')).toBe('França');
      expect(normalizeCountryLabel('France')).toBe('França');
      expect(normalizeCountryLabel('FRANCA')).toBe('França');
      expect(normalizeCountryLabel('Alemanha')).toBe('Alemanha');
      expect(normalizeCountryLabel('Germany')).toBe('Alemanha');
      expect(normalizeCountryLabel('Itália')).toBe('Itália');
      expect(normalizeCountryLabel('Italy')).toBe('Itália');
      expect(normalizeCountryLabel('ITALIA')).toBe('Itália');
      expect(normalizeCountryLabel('Japão')).toBe('Japão');
      expect(normalizeCountryLabel('Japan')).toBe('Japão');
      expect(normalizeCountryLabel('JAPAO')).toBe('Japão');
      expect(normalizeCountryLabel('Suíça')).toBe('Suíça');
      expect(normalizeCountryLabel('Switzerland')).toBe('Suíça');
    });

    it('maps ambiguous typos to likely country', () => {
      expect(normalizeCountryLabel('Cordoba')).toBe('Argentina');
      expect(normalizeCountryLabel('Córdoba')).toBe('Argentina');
    });

    it('handles Portuguese title casing for unknown countries', () => {
      expect(normalizeCountryLabel(' França ')).toBe('França');
      expect(normalizeCountryLabel('ALEMANHA')).toBe('Alemanha');
      expect(normalizeCountryLabel('ARGENTINA')).toBe('Argentina');
      expect(normalizeCountryLabel('SUÍÇA')).toBe('Suíça');
      expect(normalizeCountryLabel('COSTA DO MARFIM')).toBe('Costa do Marfim');
      expect(normalizeCountryLabel("CÔTE D'IVOIRE")).toBe('Costa do Marfim');
      expect(normalizeCountryLabel('REPÚBLICA DO CONGO')).toBe('República do Congo');
      expect(normalizeCountryLabel('SÃO TOMÉ E PRÍNCIPE')).toBe('São Tomé e Príncipe');
      expect(normalizeCountryLabel('GUINÉ-BISSAU')).toBe('Guiné-Bissau');
      expect(normalizeCountryLabel('TIMOR-LESTE')).toBe('Timor-Leste');
    });

    it('returns null for empty/null input', () => {
      expect(normalizeCountryLabel('')).toBeNull();
      expect(normalizeCountryLabel(null)).toBeNull();
    });
  });

  describe('SQL expressions', () => {
    it('prioritizes assignment type before falling back to country', () => {
      const compiled = compileSql(
        assignmentLocationTypeSql(sql.raw('assignment_type'), sql.raw('location_country')),
      );

      expect(compiled).toMatch(/coalesce\(\s*assignment_type::text/);
      expect(compiled).toContain('location_country is null');
      expect(compiled).toContain("then 'nacional' else 'exterior'");
    });

    it('builds a nacional SQL predicate with null and all domestic aliases', () => {
      const compiled = compileSql(isDomesticCountrySql(sql.raw('location_country')));

      expect(compiled).toContain('location_country is null');
      expect(compiled).toContain("nullif(btrim(location_country), '') is null");
      // Must include both base aliases and COUNTRY_ALIASES that map to 'Brasil'
      expect(compiled).toContain("'brasil'");
      expect(compiled).toContain("'brazil'");
      expect(compiled).toContain("'brasili'");
      expect(compiled).toContain("'brasilia'");
    });

    it('builds an exterior SQL predicate as the inverse of nacional', () => {
      const compiled = compileSql(isExteriorCountrySql(sql.raw('location_country')));

      expect(compiled).toContain('not (');
      expect(compiled).toContain("'brasil'");
      expect(compiled).toContain("'brazil'");
    });

    it('builds a normalized country label SQL expression with alias WHEN clauses', () => {
      const compiled = compileSql(normalizedCountryLabelSql(sql.raw('location_country')));

      // Null handling
      expect(compiled).toContain('case');
      expect(compiled).toContain(
        "when location_country is null or nullif(btrim(location_country), '') is null then null",
      );

      // Domestic alias group
      expect(compiled).toContain("'brasil'");
      expect(compiled).toContain("'brazil'");
      expect(compiled).toContain("'Brasil'");

      // EUA alias group
      expect(compiled).toContain("'eua'");
      expect(compiled).toContain("'Estados Unidos'");

      // Fallback: initcap + chained replace() for connector-word lowering
      expect(compiled).toContain('replace(');
      expect(compiled).toContain('initcap(lower(btrim(location_country)))');
      expect(compiled).toContain(' De ');
    });
  });
});
