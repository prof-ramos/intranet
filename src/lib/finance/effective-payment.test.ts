import { describe, expect, it } from 'vitest';
import { sql, type SQL } from 'drizzle-orm';
import { effectivePaymentMethodSql } from './effective-payment';

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

describe('finance/effective-payment', () => {
  it('builds a coalesce expression for effective payment method', () => {
    const compiled = compileSql(
      effectivePaymentMethodSql(sql.raw('month_payment_method'), sql.raw('default_payment_method')),
    );

    expect(compiled).toContain('coalesce(month_payment_method, default_payment_method)');
  });
});
