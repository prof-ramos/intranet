/**
 * Integration test for VULN-001 fix: Granular role-based RLS policies
 *
 * Verifies that permissive USING(true) policies have been replaced with
 * role-based policies using JWT claims and admin role lookups.
 *
 * Run: node --env-file=.env.local ./node_modules/vitest/vitest.mjs run \
 *   --config vitest.integration.config.ts src/lib/db/rls-granular.integration.test.ts
 */
import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { env } from '@/lib/env';

const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set for RLS granular integration tests.');
}

const db = postgres(databaseUrl, { max: 1 });

afterAll(async () => {
  await db.end();
});

// Tables that should have granular policies (not permissive USING(true))
const granularRlsTables = [
  'admins',
  'associates',
  'activities',
  'audit_logs',
  'legal_consultations',
  'legal_processes',
  'legal_notes',
  'legal_opinions',
  'legal_opinion_tags',
  'assignments',
  'login_attempts',
  'rate_limits',
  'monthly_payments',
  'oficios',
  'domain_events',
  'webhook_subscriptions',
  'webhook_deliveries',
  'integration_api_keys',
];

describe('VULN-001: Granular RLS policies', () => {
  it('has no permissive USING(true) policies on any application table', async () => {
    // Check that no policy uses USING(true) or WITH CHECK(true) as standalone permissive expressions
    const rows = await db<
      {
        schemaname: string;
        tablename: string;
        policyname: string;
        qual: string | null;
        with_check: string | null;
      }[]
    >`
      select schemaname, tablename, policyname, qual, with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = any(${granularRlsTables})
      order by tablename, policyname
    `;

    // No policy should have qual = 'true' (which indicates USING(true))
    const permissivePolicies = rows.filter((row) => row.qual === 'true' || row.qual === '(true)');

    expect(
      permissivePolicies,
      `Found permissive USING(true) policies: ${permissivePolicies.map((p) => `${p.tablename}.${p.policyname}`).join(', ')}`,
    ).toEqual([]);
  });

  it('has no permissive WITH CHECK(true) policies on sensitive tables', async () => {
    // Tables where WITH CHECK(true) should NOT exist (non-rate-limit, non-audit-insert tables)
    const sensitiveTables = [
      'admins',
      'associates',
      'activities',
      'legal_consultations',
      'legal_processes',
      'legal_notes',
      'legal_opinions',
      'legal_opinion_tags',
      'assignments',
      'monthly_payments',
      'oficios',
      'domain_events',
      'webhook_subscriptions',
      'webhook_deliveries',
      'integration_api_keys',
    ];

    const rows = await db<
      {
        schemaname: string;
        tablename: string;
        policyname: string;
        qual: string | null;
        with_check: string | null;
      }[]
    >`
      select schemaname, tablename, policyname, qual, with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = any(${sensitiveTables})
      order by tablename, policyname
    `;

    // For sensitive tables, WITH CHECK(true) should not appear except for audit insert
    const permissiveCheckPolicies = rows.filter(
      (row) => row.with_check === 'true' || row.with_check === '(true)',
    );

    expect(
      permissiveCheckPolicies,
      `Found permissive WITH CHECK(true) policies: ${permissiveCheckPolicies.map((p) => `${p.tablename}.${p.policyname}`).join(', ')}`,
    ).toEqual([]);
  });

  it('has role-based helper functions for RLS', async () => {
    const functions = await db<
      { proname: string }[]
    >`select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = any(${['get_current_admin_role', 'get_current_admin_id', 'is_admin_role', 'is_privileged_role', 'is_staff_role']}) order by proname`;

    const functionNames = functions.map((f) => f.proname);
    expect(functionNames).toContain('get_current_admin_role');
    expect(functionNames).toContain('get_current_admin_id');
    expect(functionNames).toContain('is_admin_role');
    expect(functionNames).toContain('is_privileged_role');
    expect(functionNames).toContain('is_staff_role');
  });

  it('get_current_admin_role() references get_jwt_email() for JWT-based role resolution', async () => {
    const rows = await db<
      { prosrc: string }[]
    >`select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = 'get_current_admin_role'`;

    expect(rows).toHaveLength(1);
    const source = rows[0].prosrc;
    // Must reference get_jwt_email() — the helper that resolves JWT claims
    expect(source).toContain('get_jwt_email()');
    // Must reference the admins table for role lookup
    expect(source).toContain('admins');
    expect(source).toContain('role');
  });

  it('every granular RLS table has at least 2 policies (read + write separation)', async () => {
    const rows = await db<{ tablename: string; policy_count: number }[]>`
      select tablename, count(policyname)::int as policy_count
      from pg_policies
      where schemaname = 'public'
        and tablename = any(${granularRlsTables})
      group by tablename
      order by tablename
    `;

    const tableMap = Object.fromEntries(rows.map((r) => [r.tablename, r.policy_count]));

    for (const table of granularRlsTables) {
      const count = tableMap[table] ?? 0;
      expect(
        count,
        `Table ${table} should have at least 2 granular policies, got ${count}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('admins table only allows admin role for management', async () => {
    const policies = await db<
      { policyname: string; cmd: string; qual: string | null; with_check: string | null }[]
    >`
      select policyname, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename = 'admins'
      order by policyname
    `;

    // Should have at least one policy that uses is_admin_role()
    const adminOnlyPolicies = policies.filter(
      (p) => p.with_check?.includes('is_admin_role') || p.qual?.includes('is_admin_role'),
    );

    expect(
      adminOnlyPolicies.length,
      'Should have admin-only management policy using is_admin_role()',
    ).toBeGreaterThanOrEqual(1);

    // Should have a policy that allows users to read their own row
    const selfReadPolicies = policies.filter(
      (p) => p.qual?.includes('get_current_admin_id') || p.policyname.includes('select_own'),
    );

    expect(
      selfReadPolicies.length,
      'Should have self-read policy for admins table',
    ).toBeGreaterThanOrEqual(1);
  });

  it('associates table restricts read to staff and write to privileged roles', async () => {
    const policies = await db<
      { policyname: string; cmd: string; qual: string | null; with_check: string | null }[]
    >`
      select policyname, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename = 'associates'
      order by policyname
    `;

    // SELECT should use is_staff_role()
    const selectPolicies = policies.filter((p) => p.cmd === 'SELECT' || p.cmd === 'ALL');
    const staffRead = selectPolicies.some((p) => p.qual?.includes('is_staff_role'));
    expect(staffRead, 'Associates SELECT should require is_staff_role()').toBe(true);

    // INSERT/UPDATE/DELETE should use is_privileged_role()
    const writePolicies = policies.filter((p) => p.cmd !== 'SELECT');
    const privilegedWrite = writePolicies.some(
      (p) => p.with_check?.includes('is_privileged_role') || p.qual?.includes('is_privileged_role'),
    );
    expect(privilegedWrite, 'Associates write policies should require is_privileged_role()').toBe(
      true,
    );
  });

  it('webhook tables and integration_api_keys are admin-only', async () => {
    const adminOnlyTables = ['webhook_subscriptions', 'webhook_deliveries', 'integration_api_keys'];

    for (const table of adminOnlyTables) {
      const policies = await db<
        { policyname: string; qual: string | null; with_check: string | null }[]
      >`
        select policyname, qual, with_check
        from pg_policies
        where schemaname = 'public' and tablename = ${table}
      `;

      const allAdminOnly = policies.every(
        (p) => p.qual?.includes('is_admin_role') && p.with_check?.includes('is_admin_role'),
      );

      expect(allAdminOnly, `All policies on ${table} should use is_admin_role()`).toBe(true);
    }
  });

  it('audit_logs prevents UPDATE and DELETE for authenticated users', async () => {
    const policies = await db<
      { policyname: string; cmd: string; qual: string | null; with_check: string | null }[]
    >`
      select policyname, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public' and tablename = 'audit_logs'
      order by policyname
    `;

    // Should have UPDATE and DELETE policies that deny access
    const updatePolicy = policies.find((p) => p.cmd === 'UPDATE');
    expect(updatePolicy, 'Should have UPDATE policy on audit_logs').toBeDefined();
    expect(updatePolicy!.qual).toContain('false');

    const deletePolicy = policies.find((p) => p.cmd === 'DELETE');
    expect(deletePolicy, 'Should have DELETE policy on audit_logs').toBeDefined();
    expect(deletePolicy!.qual).toContain('false');
  });

  it('login_attempts and rate_limits allow INSERT/UPDATE but restrict SELECT to admin', async () => {
    const rateLimitTables = ['login_attempts', 'rate_limits'];

    for (const table of rateLimitTables) {
      const policies = await db<
        { policyname: string; cmd: string; qual: string | null; with_check: string | null }[]
      >`
        select policyname, cmd, qual, with_check
        from pg_policies
        where schemaname = 'public' and tablename = ${table}
        order by policyname
      `;

      const selectPolicy = policies.find((p) => p.cmd === 'SELECT');
      expect(selectPolicy, `${table} should have SELECT policy`).toBeDefined();
      expect(selectPolicy!.qual, `${table} SELECT should use is_admin_role()`).toContain(
        'is_admin_role',
      );

      const insertPolicy = policies.find((p) => p.cmd === 'INSERT');
      expect(insertPolicy, `${table} should have INSERT policy`).toBeDefined();
    }
  });

  it('FORCE ROW LEVEL SECURITY is enabled on all application tables', async () => {
    const rows = await db<{ relname: string; relforcerowsecurity: boolean }[]>`
      select c.relname, c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any(${granularRlsTables})
      order by c.relname
    `;

    const nonForced = rows.filter((r) => !r.relforcerowsecurity);
    expect(
      nonForced,
      `Tables without FORCE RLS: ${nonForced.map((r) => r.relname).join(', ')}`,
    ).toEqual([]);
  });
});
