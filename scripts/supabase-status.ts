import { getSupabaseAdminClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const tables = ['admins', 'associates', 'activities', 'audit_logs'] as const;

async function countTable(supabase: SupabaseClient, table: (typeof tables)[number]) {
  const { count, error } = await supabase.from(table).select('*', {
    count: 'exact',
    head: true,
  });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function main() {
  const supabase = getSupabaseAdminClient();
  const results = await Promise.all(
    tables.map(async (table) => ({
      table,
      count: await countTable(supabase, table),
    })),
  );

  for (const result of results) {
    console.log(`${result.table}: ${result.count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
