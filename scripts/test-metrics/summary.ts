import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { TestMetricEntry, TestMetricsSummary } from './metrics';
import { resolveMetricsDir } from './metrics';

interface RunArtifacts {
  summary: TestMetricsSummary;
  entries: TestMetricEntry[];
}

interface TestDelta {
  fullName: string;
  file: string;
  previousMs: number;
  latestMs: number;
  deltaMs: number;
  deltaPercent: number | null;
}

const metricsDir = resolveMetricsDir();
const runsDir = path.join(metricsDir, 'runs');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

main();

function main(): void {
  if (!fs.existsSync(runsDir)) {
    console.log('Nenhuma métrica encontrada. Rode npm run test, npm run test:db ou npm run test:e2e.');
    return;
  }

  const summaries = loadSummaries();

  if (summaries.length === 0) {
    console.log('Nenhum summary de métricas encontrado em .test-metrics/runs.');
    return;
  }

  const groups = groupByRunnerAndSuite(summaries);

  for (const [groupName, groupSummaries] of groups) {
    const ordered = groupSummaries.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const latestSummary = ordered.at(-1);
    const previousSummary = ordered.at(-2);

    if (!latestSummary) {
      continue;
    }

    const latest = loadRunArtifacts(latestSummary);
    const previous = previousSummary ? loadRunArtifacts(previousSummary) : null;

    printRunReport(groupName, latest, previous);
  }
}

function loadSummaries(): TestMetricsSummary[] {
  return fs
    .readdirSync(runsDir)
    .filter((file) => file.endsWith('.summary.json'))
    .flatMap((file) => {
      const fullPath = path.join(runsDir, file);

      try {
        return [JSON.parse(fs.readFileSync(fullPath, 'utf8')) as TestMetricsSummary];
      } catch {
        console.warn(`Ignorando summary inválido: ${path.relative(process.cwd(), fullPath)}`);
        return [];
      }
    });
}

function groupByRunnerAndSuite(
  summaries: TestMetricsSummary[],
): Map<string, TestMetricsSummary[]> {
  const groups = new Map<string, TestMetricsSummary[]>();

  for (const summary of summaries) {
    const key = `${summary.runner}/${summary.suite}`;
    const values = groups.get(key) ?? [];
    values.push(summary);
    groups.set(key, values);
  }

  return groups;
}

function loadRunArtifacts(summary: TestMetricsSummary): RunArtifacts {
  const jsonlPath = path.resolve(process.cwd(), summary.files.jsonl);
  const entries = fs
    .readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as TestMetricEntry];
      } catch {
        return [];
      }
    });

  return { summary, entries };
}

function printRunReport(groupName: string, latest: RunArtifacts, previous: RunArtifacts | null): void {
  const { summary } = latest;
  const totalDuration = formatMs(summary.totalDurationMs);

  // Group Header Block
  console.log(`\n${colors.bold}${colors.cyan}╭──────────────────────────────────────────────────────────────╮${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}│  📊 RUNNER: ${groupName.padEnd(47)} │${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╰──────────────────────────────────────────────────────────────╯${colors.reset}`);

  console.log(`  ${colors.bold}Última execução:${colors.reset} ${colors.gray}${new Date(summary.finishedAt).toLocaleString('pt-BR')}${colors.reset}`);
  
  // Status with nice colors
  const passedStr = `${colors.green}${summary.totals.passed} passed${colors.reset}`;
  const failedStr = summary.totals.failed > 0 ? `${colors.red}${summary.totals.failed} failed${colors.reset}` : `${colors.gray}0 failed${colors.reset}`;
  const skippedStr = summary.totals.skipped > 0 ? `${colors.yellow}${summary.totals.skipped} skipped${colors.reset}` : `${colors.gray}0 skipped${colors.reset}`;
  console.log(`  ${colors.bold}Resultados:     ${colors.reset}${colors.bold}${summary.totals.total}${colors.reset} total | ${passedStr} | ${failedStr} | ${skippedStr}`);
  
  // Duration & Comparison
  let compStr = '';
  if (previous) {
    const deltaMs = summary.totalDurationMs - previous.summary.totalDurationMs;
    const isFaster = deltaMs <= 0;
    const marker = isFaster ? `${colors.green}✔ mais rápida${colors.reset}` : `${colors.red}⚠ mais lenta${colors.reset}`;
    compStr = ` (${formatSignedMs(deltaMs)} ${marker})`;
  } else {
    compStr = ` (${colors.gray}comparação anterior indisponível${colors.reset})`;
  }
  console.log(`  ${colors.bold}Tempo Total:    ${colors.reset}${colors.bold}${colors.blue}${totalDuration}${colors.reset}${compStr}`);

  // Regression section
  if (previous) {
    printSlowestRegressions(latest.entries, previous.entries);
  }

  // Slowest tests list
  console.log(`\n  ${colors.bold}${colors.yellow}⏱  TESTES MAIS LENTOS DA ÚLTIMA EXECUÇÃO:${colors.reset}`);
  for (const test of summary.slowestTests.slice(0, 10)) {
    console.log(`    ${colors.bold}${colors.red}${formatMs(test.durationMs).padStart(8)}${colors.reset} ${colors.dim}—${colors.reset} ${test.fullName} ${colors.gray}(${test.file})${colors.reset}`);
  }
}

function printSlowestRegressions(latest: TestMetricEntry[], previous: TestMetricEntry[]): void {
  const previousByKey = new Map(previous.map((entry) => [testKey(entry), entry]));
  const deltas: TestDelta[] = latest
    .flatMap((entry) => {
      const previousEntry = previousByKey.get(testKey(entry));

      if (!previousEntry) {
        return [];
      }

      const deltaMs = entry.durationMs - previousEntry.durationMs;

      return [
        {
          fullName: entry.fullName,
          file: entry.file,
          previousMs: previousEntry.durationMs,
          latestMs: entry.durationMs,
          deltaMs,
          deltaPercent:
            previousEntry.durationMs > 0 ? (deltaMs / previousEntry.durationMs) * 100 : null,
        },
      ];
    })
    .sort((a, b) => b.deltaMs - a.deltaMs)
    .slice(0, 5);

  if (deltas.length === 0) {
    console.log(`\n  ${colors.bold}${colors.gray}📈 Regressões por teste: sem dados comparáveis.${colors.reset}`);
    return;
  }

  const regressions = deltas.filter((item) => item.deltaMs > 0);

  if (regressions.length === 0) {
    console.log(`\n  ${colors.bold}${colors.green}📈 Regressões por teste: nenhuma regressão de performance encontrada.${colors.reset}`);
    return;
  }

  console.log(`\n  ${colors.bold}${colors.red}📈 MAIORES REGRESSÕES DE PERFORMANCE:${colors.reset}`);
  for (const delta of regressions) {
    const percent =
      delta.deltaPercent === null ? '' : ` (${colors.bold}${colors.red}+${delta.deltaPercent.toFixed(1)}%${colors.reset})`;
    console.log(
      `    ${colors.bold}${colors.red}+${formatMs(delta.deltaMs).padEnd(6)}${colors.reset}${percent} ${colors.dim}—${colors.reset} ${delta.fullName} ${colors.gray}(${delta.file})${colors.reset}`,
    );
  }
}

function testKey(entry: TestMetricEntry): string {
  return `${entry.runner}:${entry.suite}:${entry.projectName ?? ''}:${entry.file}:${entry.fullName}`;
}

function formatMs(value: number): string {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
}

function formatSignedMs(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMs(value)}`;
}
