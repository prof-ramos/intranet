import 'server-only';

import { sql } from 'drizzle-orm';
import type { IntegrationConfig } from '@/lib/integrations/types';
import { db } from '@/lib/db';
import { integrationApiKeys } from '@/lib/db/schema/integrations';

const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;

function readOptionalEnv(name: string, env: NodeJS.ProcessEnv): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parseTimestampTolerance(value: string | undefined): number {
  if (!value) return DEFAULT_TIMESTAMP_TOLERANCE_SECONDS;

  if (!/^\d+$/.test(value)) {
    return DEFAULT_TIMESTAMP_TOLERANCE_SECONDS;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_TIMESTAMP_TOLERANCE_SECONDS;
  }

  return parsed;
}

export function getIntegrationConfig(env: NodeJS.ProcessEnv = process.env): IntegrationConfig {
  return {
    enabled: parseBoolean(env.ASOF_INTEGRATIONS_ENABLED),
    apiKey: readOptionalEnv('ASOF_INTEGRATION_API_KEY', env),
    hmacSecret: readOptionalEnv('ASOF_INTEGRATION_HMAC_SECRET', env),
    timestampToleranceSeconds: parseTimestampTolerance(
      env.ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS,
    ),
  };
}

export function isIntegrationAuthConfigured(
  config: IntegrationConfig = getIntegrationConfig(),
): boolean {
  return Boolean(config.apiKey && config.hmacSecret);
}

/**
 * Check whether integration auth is available through EITHER the configured
 * environment-variable credentials OR at least one active database-backed key.
 * This involves a DB query, so prefer `isIntegrationAuthConfigured` for
 * synchronous/fast-path checks that only care about env-var availability.
 */
export async function isIntegrationAuthAvailable(
  config: IntegrationConfig = getIntegrationConfig(),
): Promise<boolean> {
  if (isIntegrationAuthConfigured(config)) {
    return true;
  }

  // If no hmacSecret is set, table-backed keys can't work either.
  if (!config.hmacSecret) {
    return false;
  }

  const [row] = await db
    .select({ id: integrationApiKeys.id })
    .from(integrationApiKeys)
    .where(sql`${integrationApiKeys.isActive} = true`)
    .limit(1);

  return !!row;
}
