/**
 * Unit test for VULN-001 fix: Verify migration SQL replaces USING(true) with granular policies
 *
 * This test parses migrations 0039a, 0039b, 0039c to verify correctness
 * without needing a live database connection.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'drizzle/postgres');
const helpersFile = path.join(migrationDir, '0039a_rls_helpers.sql');
const coreTablesFile = path.join(migrationDir, '0039b_rls_core_tables.sql');
const auxTablesFile = path.join(migrationDir, '0039c_rls_aux_tables.sql');
const oldMigrationFile = path.join(migrationDir, '0039_granular_rls_policies.sql');
const journalFile = path.join(migrationDir, 'meta/_journal.json');

describe('VULN-001: Migration 0039 granular RLS policies', () => {
  let helpersSql: string;
  let coreTablesSql: string;
  let auxTablesSql: string;

  it('old single migration file does NOT exist', () => {
    expect(fs.existsSync(oldMigrationFile)).toBe(false);
  });

  it('new split migration files exist', () => {
    expect(fs.existsSync(helpersFile)).toBe(true);
    expect(fs.existsSync(coreTablesFile)).toBe(true);
    expect(fs.existsSync(auxTablesFile)).toBe(true);

    helpersSql = fs.readFileSync(helpersFile, 'utf8');
    coreTablesSql = fs.readFileSync(coreTablesFile, 'utf8');
    auxTablesSql = fs.readFileSync(auxTablesFile, 'utf8');
  });

  it('creates helper functions for role-based RLS in 0039a', () => {
    expect(helpersSql).toContain('CREATE OR REPLACE FUNCTION get_jwt_email()');
    expect(helpersSql).toContain('CREATE OR REPLACE FUNCTION get_current_admin_role()');
    expect(helpersSql).toContain('CREATE OR REPLACE FUNCTION get_current_admin_id()');
    expect(helpersSql).toContain('CREATE OR REPLACE FUNCTION is_admin_role()');
    expect(helpersSql).toContain('CREATE OR REPLACE FUNCTION is_privileged_role()');
    expect(helpersSql).toContain('CREATE OR REPLACE FUNCTION is_staff_role()');
  });

  it('SECURITY DEFINER functions have SET search_path to prevent privilege escalation', () => {
    const definerFunctions = [
      'get_jwt_email',
      'get_current_admin_role',
      'get_current_admin_id',
    ];

    for (const fn of definerFunctions) {
      const pattern = new RegExp(
        `CREATE OR REPLACE FUNCTION ${fn}\\(\\)[\\s\\S]*?SECURITY DEFINER[\\s\\S]*?SET search_path = ''`,
      );
      expect(
        helpersSql,
        `${fn} should have SECURITY DEFINER with SET search_path = ''`,
      ).toMatch(pattern);
    }
  });

  it('helpers use to_regprocedure for environment detection, never auth.jwt() stub', () => {
    // Must detect auth.jwt() dynamically
    expect(helpersSql).toContain("to_regprocedure('auth.jwt()')");
    // Must NEVER create a stub that overwrites the native function
    expect(helpersSql).not.toContain("CREATE OR REPLACE FUNCTION auth.jwt()");
    expect(helpersSql).not.toContain("CREATE FUNCTION auth.jwt()");
  });

  it('get_jwt_email falls back to current_setting when auth.jwt() is unavailable', () => {
    expect(helpersSql).toContain("current_setting('request.jwt.claims', true)");
    expect(helpersSql).toContain('NULLIF(');
  });

  it('0039b drops all permissive *_all policies from migration 0009', () => {
    const droppedPolicies = [
      'admins_all',
      'associates_all',
      'activities_all',
      'audit_logs_all',
      'legal_consultations_all',
      'legal_processes_all',
      'legal_notes_all',
      'legal_opinions_all',
      'legal_opinion_tags_all',
      'assignments_all',
    ];

    for (const policy of droppedPolicies) {
      expect(
        coreTablesSql,
        `Migration 0039b should drop policy ${policy}`,
      ).toContain(`DROP POLICY IF EXISTS ${policy}`);
    }
  });

  it('0039c drops remaining permissive policies', () => {
    const droppedPolicies = [
      'login_attempts_all',
      'rate_limits_all',
      'monthly_payments_all',
      'oficios_all',
      'domain_events_all',
      'webhook_subscriptions_all',
      'webhook_deliveries_all',
      'integration_api_keys_all',
    ];

    for (const policy of droppedPolicies) {
      expect(
        auxTablesSql,
        `Migration 0039c should drop policy ${policy}`,
      ).toContain(`DROP POLICY IF EXISTS ${policy}`);
    }
  });

  it('creates granular policies for core tables in 0039b', () => {
    const expectedPolicies = [
      'admins_select_own',
      'admins_manage_admin',
      'associates_select',
      'associates_manage',
      'activities_select',
      'activities_insert',
      'activities_update',
      'activities_delete',
      'audit_logs_select',
      'audit_logs_insert',
      'audit_logs_no_update',
      'audit_logs_no_delete',
      'legal_consultations_select',
      'legal_consultations_manage',
      'legal_processes_select',
      'legal_processes_manage',
      'legal_notes_select',
      'legal_notes_manage',
      'legal_opinions_select',
      'legal_opinions_manage',
      'legal_opinion_tags_select',
      'legal_opinion_tags_manage',
      'assignments_select',
      'assignments_manage',
    ];

    for (const policy of expectedPolicies) {
      expect(
        coreTablesSql,
        `Should create policy ${policy}`,
      ).toContain(`CREATE POLICY ${policy}`);
    }
  });

  it('creates granular policies for aux tables in 0039c', () => {
    const expectedPolicies = [
      'monthly_payments_select',
      'monthly_payments_manage',
      'oficios_select',
      'oficios_insert',
      'oficios_update',
      'oficios_delete',
      'login_attempts_select',
      'login_attempts_insert',
      'login_attempts_update',
      'login_attempts_delete',
      'rate_limits_select',
      'rate_limits_insert',
      'rate_limits_update',
      'rate_limits_delete',
      'domain_events_select',
      'domain_events_insert',
      'domain_events_update',
      'domain_events_delete',
      'webhook_subscriptions_all',
      'webhook_deliveries_all',
      'integration_api_keys_all',
    ];

    for (const policy of expectedPolicies) {
      expect(
        auxTablesSql,
        `Should create policy ${policy}`,
      ).toContain(`CREATE POLICY ${policy}`);
    }
  });

  it('webhook and integration tables use is_admin_role() only', () => {
    expect(auxTablesSql).toMatch(/webhook_subscriptions[\s\S]*?USING \(is_admin_role\(\)\)/);
    expect(auxTablesSql).toMatch(/integration_api_keys[\s\S]*?USING \(is_admin_role\(\)\)/);
  });

  it('audit_logs denies UPDATE and DELETE', () => {
    expect(coreTablesSql).toContain('audit_logs_no_update');
    expect(coreTablesSql).toContain('audit_logs_no_delete');
    expect(coreTablesSql).toMatch(/audit_logs_no_update[\s\S]*?USING \(false\)/);
    expect(coreTablesSql).toMatch(/audit_logs_no_delete[\s\S]*?USING \(false\)/);
  });

  it('asserts FORCE ROW LEVEL SECURITY on all tables in 0039c', () => {
    const forceRlsTables = [
      'admins', 'associates', 'activities', 'audit_logs',
      'legal_consultations', 'legal_processes', 'legal_notes',
      'legal_opinions', 'legal_opinion_tags', 'assignments',
      'login_attempts', 'rate_limits', 'monthly_payments', 'oficios',
      'domain_events', 'webhook_subscriptions', 'webhook_deliveries',
      'integration_api_keys',
    ];

    for (const table of forceRlsTables) {
      expect(
        auxTablesSql,
        `Should FORCE ROW LEVEL SECURITY on ${table}`,
      ).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  });

  it('no new USING(true) permissive policies are created', () => {
    const combinedSql = helpersSql + coreTablesSql + auxTablesSql;
    const permissiveMatches = [
      ...combinedSql.matchAll(/CREATE\s+POLICY[\s\S]*?USING\s*\(\s*true\s*\)/gi),
    ].map((m) => m[0].replace(/\n/g, ' ').trim());

    const illegitimatePermissive = permissiveMatches.filter(
      (match) =>
        !match.includes('login_attempts_insert') &&
        !match.includes('rate_limits_insert'),
    );

    expect(
      illegitimatePermissive,
      `Found policies with USING(true): ${illegitimatePermissive.join('; ')}`,
    ).toEqual([]);
  });

  it('journal has entries for 0039a, 0039b, 0039c', () => {
    const journal = JSON.parse(
      fs.readFileSync(journalFile, 'utf8'),
    ) as { entries: Array<{ tag: string }> };

    const tags = journal.entries.map((e) => e.tag);
    expect(tags).toContain('0039a_rls_helpers');
    expect(tags).toContain('0039b_rls_core_tables');
    expect(tags).toContain('0039c_rls_aux_tables');
    expect(tags).not.toContain('0039_granular_rls_policies');
  });

  it('notifications table is NOT affected by this migration', () => {
    const combinedSql = helpersSql + coreTablesSql + auxTablesSql;
    expect(combinedSql).not.toContain('DROP POLICY IF EXISTS notifications_');
    expect(combinedSql).not.toContain('CREATE POLICY notifications_');
  });
});
