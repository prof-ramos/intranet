import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { DEFAULT_SLA_DUE_SOON_DAYS, isSlaDueSoonSql } from './sla';

describe('juridico/sla', () => {
  it('builds a due-soon predicate with the default 2-day window', () => {
    const fragment = isSlaDueSoonSql(sql.raw('sla_due_date'));
    const compiled = fragment.toQuery({
      escapeName: (name: string) => `"${name}"`,
      escapeParam: (_: unknown, index: number) => `$${index + 1}`,
      escapeString: (value: string) => `'${value}'`,
      casing: { getColumnCasing: (column: string) => column },
      inlineParams: false,
      paramStartIndex: { value: 0 },
    } as never);

    expect(compiled.sql).toContain("sla_due_date < now() + interval '1 day' * $");
    expect(compiled.sql).toContain('sla_due_date >= now()');
    expect(compiled.params.at(-1)).toBe(2);
    expect(DEFAULT_SLA_DUE_SOON_DAYS).toBe(2);
  });

  it('accepts a custom due-soon window', () => {
    const fragment = isSlaDueSoonSql(sql.raw('sla_due_date'), 5);
    const compiled = fragment.toQuery({
      escapeName: (name: string) => `"${name}"`,
      escapeParam: (_: unknown, index: number) => `$${index + 1}`,
      escapeString: (value: string) => `'${value}'`,
      casing: { getColumnCasing: (column: string) => column },
      inlineParams: false,
      paramStartIndex: { value: 0 },
    } as never);

    expect(compiled.sql).toContain("sla_due_date < now() + interval '1 day' * $");
    expect(compiled.params.at(-1)).toBe(5);
  });
});
