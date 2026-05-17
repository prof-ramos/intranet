import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export function effectivePaymentMethodSql(
  monthPaymentMethod: SQLWrapper,
  defaultPaymentMethod: SQLWrapper,
): SQL {
  return sql`coalesce(${monthPaymentMethod}, ${defaultPaymentMethod})`;
}
