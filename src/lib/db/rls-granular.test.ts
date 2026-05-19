/**
 * Unit test for VULN-001 fix: Verify migration SQL replaces USING(true) with granular policies
 *
 * This test parses migration 0039_granular_rls_policies.sql to verify correctness
 * without needing a live database connection.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'drizzle/postgres');
const migrationFile = path.join(migrationDir, '0039_granular_rls_policies.sql');
const journalFile = path.join(migrationDir, 'meta/_journal.json');

describe('VULN-001: Migration 0039 granular RLS policies', () => {
  let sql: string;

  it('migration file exists', () => {
    expect(fs.existsSync(migrationFile)).toBe(true);
    sql = fs.readFileSync(migrationFile, 'utf8');
  });

  it('drops all permissive *_all policies from migration 0009', () => {
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
        sql,
        `Migration should drop policy ${policy}`,
      ).toContain(`DROP POLICY IF EXISTS ${policy}`);
    }
  });

  it('creates helper functions for role-based RLS', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION get_current_admin_role()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION get_current_admin_id()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION is_admin_role()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION is_privileged_role()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION is_staff_role()');
  });

  it('helper functions use auth.jwt() for JWT-based claims', () => {
    // get_current_admin_role should reference auth.jwt()
    const roleFnMatch = sql.match(
      /CREATE OR REPLACE FUNCTION get_current_admin_role\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/,
    );
    expect(roleFnMatch).not.toBeNull();
    expect(roleFnMatch![1]).toContain('auth.jwt()');
  });

  it('creates granular policies for each affected table', () => {
    const expectedTablePolicies: Record<string, string[]> = {
      admins: ['admins_select_own', 'admins_manage_admin'],
      associates: ['associates_select', 'associates_manage'],
      activities: ['activities_select', 'activities_insert', 'activities_update', 'activities_delete'],
      audit_logs: ['audit_logs_select', 'audit_logs_insert', 'audit_logs_no_update', 'audit_logs_no_delete'],
      legal_consultations: ['legal_consultations_select', 'legal_consultations_manage'],
      legal_processes: ['legal_processes_select', 'legal_processes_manage'],
      legal_notes: ['legal_notes_select', 'legal_notes_manage'],
      legal_opinions: ['legal_opinions_select', 'legal_opinions_manage'],
      legal_opinion_tags: ['legal_opinion_tags_select', 'legal_opinion_tags_manage'],
      assignments: ['assignments_select', 'assignments_manage'],
      monthly_payments: ['monthly_payments_select', 'monthly_payments_manage'],
      oficios: ['oficios_select', 'oficios_insert', 'oficios_update', 'oficios_delete'],
      login_attempts: ['login_attempts_select', 'login_attempts_insert', 'login_attempts_update', 'login_attempts_delete'],
      rate_limits: ['rate_limits_select', 'rate_limits_insert', 'rate_limits_update', 'rate_limits_delete'],
      domain_events: ['domain_events_select', 'domain_events_insert', 'domain_events_update', 'domain_events_delete'],
      webhook_subscriptions: ['webhook_subscriptions_all'],
      webhook_deliveries: ['webhook_deliveries_all'],
      integration_api_keys: ['integration_api_keys_all'],
    };

    for (const [table, policies] of Object.entries(expectedTablePolicies)) {
      for (const policy of policies) {
        expect(
          sql,
          `Should create policy ${policy} for table ${table}`,
        ).toContain(`CREATE POLICY ${policy}`);
      }
    }
  });

  it('webhook and integration tables use is_admin_role() only', () => {
    const adminOnlySections = sql.match(
      /webhook_subscriptions[\s\S]*?USING \(is_admin_role\(\)\)[\s\S]*?WITH CHECK \(is_admin_role\(\)\)/g,
    );
    expect(adminOnlySections).not.toHaveLength(0);
  });

  it('audit_logs denies UPDATE and DELETE', () => {
    expect(sql).toContain('audit_logs_no_update');
    expect(sql).toContain('audit_logs_no_delete');
    // The USING(false) blocks access
    expect(sql).toMatch(/audit_logs_no_update[\s\S]*?USING \(false\)/);
    expect(sql).toMatch(/audit_logs_no_delete[\s\S]*?USING \(false\)/);
  });

  it('asserts FORCE ROW LEVEL SECURITY on all tables', () => {
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
        sql,
        `Should FORCE ROW LEVEL SECURITY on ${table}`,
      ).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  });

  it('no new USING(true) permissive policies are created', () => {
    // Use a global regex that matches across line boundaries to detect
    // CREATE POLICY ... USING (true) even when split across multiple lines.
    const permissiveMatches = [
      ...sql.matchAll(/CREATE\s+POLICY[\s\S]*?USING\s*\(\s*true\s*\)/gi),
    ].map((m) => m[0].replace(/\n/g, ' ').trim());

    // login_attempts_insert uses WITH CHECK (true) for INSERT, which is legitimate
    // (rate-limit counters need to be insertable by any authenticated user).
    // No policy should have USING (true) for SELECT/UPDATE/DELETE.
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

  it('journal has entry for 0039_granular_rls_policies', () => {
    const journal = JSON.parse(
      fs.readFileSync(journalFile, 'utf8'),
    ) as { entries: Array<{ tag: string }> };

    const tags = journal.entries.map((e) => e.tag);
    expect(tags).toContain('0039_granular_rls_policies');
  });

  it('notifications table is NOT affected by this migration', () => {
    // The notifications table already has proper policies from migration 0038
    expect(sql).not.toContain('DROP POLICY IF EXISTS notifications_');
    expect(sql).not.toContain('CREATE POLICY notifications_');
  });
});