import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

export const DEFAULT_STATUS_TABLES = [
  'admins',
  'associates',
  'activities',
  'audit_logs',
  'assignments',
  'legal_consultations',
  'legal_notes',
  'legal_opinion_tags',
  'legal_opinions',
  'legal_processes',
  'login_attempts',
  'monthly_payments',
  'oficios',
  'rate_limits',
] as const;

type StatusEnv = Record<string, string | undefined>;

export interface SupabaseStatusEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
}

interface SupabaseCountClient {
  from(table: string): {
    select(
      columns: string,
      options: { count: 'exact'; head: true },
    ): Promise<{ count: number | null; error: { message: string } | null }>;
  };
}

type SupabaseClientFactory = (
  supabaseUrl: string,
  serviceRoleKey: string,
  options: {
    auth: {
      autoRefreshToken: false;
      detectSessionInUrl: false;
      persistSession: false;
    };
  },
) => SupabaseCountClient;

export interface SupabaseTableStatus {
  table: string;
  count: number | null;
  ok: boolean;
  error?: string;
}

export interface SupabaseStatusReport {
  supabaseUrl: string;
  serviceRoleKey: string;
  tables: SupabaseTableStatus[];
}

export function resolveSupabaseStatusEnv(env: StatusEnv = process.env): SupabaseStatusEnv {
  const supabaseUrl =
    env.NEXT_PUBLIC_SUPABASE_URL ??
    env.NEXT_PUBLIC_DATABASE_SUPABASE_URL ??
    env.DATABASE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Supabase URL must be set for db:supabase:status.');
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.DATABASE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Supabase service-role key must be set for db:supabase:status.');
  }

  return { supabaseUrl, serviceRoleKey };
}

export function createSupabaseStatusClient(
  env: SupabaseStatusEnv,
  clientFactory: SupabaseClientFactory = createClient as unknown as SupabaseClientFactory,
) {
  return clientFactory(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function collectSupabaseStatus(
  client: SupabaseCountClient,
  tables: readonly string[] = DEFAULT_STATUS_TABLES,
): Promise<SupabaseTableStatus[]> {
  const statuses = await Promise.all(
    tables.map(async (table) => {
      try {
        const { count, error } = await client
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          return { table, count: null, ok: false, error: error.message };
        }

        if (count === null) {
          return { table, count: null, ok: false, error: 'count unavailable' };
        }

        return { table, count, ok: true };
      } catch (error) {
        return {
          table,
          count: null,
          ok: false,
          error: error instanceof Error ? error.message : 'unknown error',
        };
      }
    }),
  );

  return statuses;
}

export function formatSupabaseStatus(report: SupabaseStatusReport): string {
  const host = new URL(report.supabaseUrl).host;
  const lines = [`Supabase project: ${host}`, 'Table counts:'];

  for (const table of report.tables) {
    if (table.ok) {
      lines.push(`- ${table.table}: ${table.count}`);
    } else {
      lines.push(`- ${table.table}: ERROR ${table.error ?? 'unknown error'}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const env = resolveSupabaseStatusEnv();
  const client = createSupabaseStatusClient(env);
  const tables = await collectSupabaseStatus(client);
  console.log(formatSupabaseStatus({ ...env, tables }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
