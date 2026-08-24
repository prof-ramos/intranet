import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const smokeJob = workflow.slice(workflow.indexOf('  smoke-prod:'), workflow.indexOf('\n  e2e:'));
const e2eJob = workflow.slice(workflow.indexOf('  e2e:'));
const smokeSpec = readFileSync('e2e/smoke-prod.spec.ts', 'utf8');

describe('production smoke workflow contract', () => {
  it('declares an explicit mutation opt-in that defaults to false', () => {
    expect(workflow).toMatch(
      /workflow_dispatch:\s+inputs:\s+production_mutations:\s+description:.*\s+required: true\s+type: boolean\s+default: false/,
    );
  });

  it('binds every run to the exact triggering SHA and a run-scoped identifier', () => {
    expect(smokeJob).toContain('SMOKE_EXPECTED_COMMIT_SHA: ${{ github.sha }}');
    expect(smokeJob).toContain(
      "SMOKE_RUN_ID: ${{ format('{0}-{1}', github.run_id, github.run_attempt) }}",
    );
  });

  it('allows mutations only for an explicitly authorized manual dispatch', () => {
    expect(smokeJob).toContain(
      "SMOKE_ALLOW_MUTATIONS: ${{ github.event_name == 'workflow_dispatch' && inputs.production_mutations == true }}",
    );
    expect(smokeJob).toContain('name: Smoke Test — Production');
    expect(smokeJob).toContain("github.ref == 'refs/heads/main'");
    expect(smokeJob).not.toContain('DATABASE_URL');
    expect(smokeJob).not.toContain('DATABASE_MIGRATION_URL');
  });

  it('gives E2E 25 minutes without extending the production smoke timeout', () => {
    expect(e2eJob).toContain('timeout-minutes: 25');
    expect(smokeJob).toContain('timeout-minutes: 15');
  });

  it('caches Playwright browsers in both E2E and production smoke jobs', () => {
    const cacheStep = 'uses: actions/cache@caa296126883cff596d87d8935842f9db880ef25 # v5.1.0';
    const cachePath = 'path: ~/.cache/ms-playwright';
    const cacheKey = "key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}";

    for (const job of [e2eJob, smokeJob]) {
      expect(job).toContain(cacheStep);
      expect(job).toContain(cachePath);
      expect(job).toContain(cacheKey);
    }
  });

  it('keeps password reset read-only and limits writes to the four declared mutation tests', () => {
    expect(smokeSpec).toContain("test('10. Reset de Senha — página carrega sem disparar action'");
    expect(smokeSpec).not.toContain('SMOKE_RESET_EMAIL');
    expect(smokeSpec.match(/mutatingTest\('/g)).toHaveLength(4);
  });

  it('asserts that dashboard and mensalidades perform no write requests', () => {
    const dashboardReadOnly = smokeSpec.slice(
      smokeSpec.indexOf("test('2. Dashboard"),
      smokeSpec.indexOf('// ── 3. Associados'),
    );
    const financeReadOnly = smokeSpec.slice(
      smokeSpec.indexOf("test('6. Financeiro"),
      smokeSpec.indexOf('// ── 7. Ofícios'),
    );

    for (const scenario of [dashboardReadOnly, financeReadOnly]) {
      expect(scenario).toContain('captureUnexpectedWriteMethods(page)');
      expect(scenario).toContain('expect(unexpectedWriteMethods).toEqual([])');
      expect(scenario).not.toContain('.click(');
    }
    expect(financeReadOnly).not.toContain('initializeMonthAction');
    expect(financeReadOnly).not.toContain('updatePaymentAction');
  });

  it('fails cleanup closed after removing entity-linked outbox records in FK-safe order', () => {
    expect(smokeSpec).toContain("entity_type = 'activity'");
    expect(smokeSpec).toContain("entity_type = 'legal_consultation'");
    expect(smokeSpec).toContain("entity_type = 'official_letter'");
    expect(smokeSpec.indexOf('DELETE FROM webhook_deliveries')).toBeLessThan(
      smokeSpec.indexOf('DELETE FROM domain_events'),
    );
    expect(smokeSpec).toContain("RAISE EXCEPTION 'smoke_cleanup_incomplete'");
  });
});
