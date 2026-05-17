import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export const DEFAULT_SLA_DUE_SOON_DAYS = 2;

export function isSlaDueSoonSql(
  column: SQLWrapper,
  windowDays = DEFAULT_SLA_DUE_SOON_DAYS,
): SQL {
  return sql`(
    ${column} < now() + interval '1 day' * ${windowDays}
    and ${column} >= now()
  )`;
}
