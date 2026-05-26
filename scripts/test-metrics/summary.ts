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
  const totalSeconds = formatMs(summary.totalDurationMs);

  console.log(`\n## ${groupName}`);
  console.log(`Última execução: ${summary.finishedAt}`);
  console.log(`Total: ${totalSeconds}`);
  console.log(
    `Testes: ${summary.totals.total} | passed: ${summary.totals.passed} | failed: ${summary.totals.failed} | skipped: ${summary.totals.skipped}`,
  );

  if (previous) {
    const deltaMs = summary.totalDurationMs - previous.summary.totalDurationMs;
    const marker = deltaMs <= 0 ? 'mais rápida' : 'mais lenta';
    console.log(
      `Comparação com execução anterior: ${formatSignedMs(deltaMs)} (${marker})`,
    );

    printSlowestRegressions(latest.entries, previous.entries);
  } else {
    console.log('Comparação com execução anterior: indisponível.');
  }

  console.log('Testes mais lentos da última execução:');
  for (const test of summary.slowestTests.slice(0, 10)) {
    console.log(`- ${formatMs(test.durationMs)} — ${test.fullName} (${test.file})`);
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
    console.log('Regressões por teste: sem dados comparáveis.');
    return;
  }

  const regressions = deltas.filter((item) => item.deltaMs > 0);

  if (regressions.length === 0) {
    console.log('Maiores regressões por teste: nenhuma regressão positiva entre testes comparáveis.');
    return;
  }

  console.log('Maiores regressões por teste:');
  for (const delta of regressions) {
    const percent =
      delta.deltaPercent === null ? '' : `, ${delta.deltaPercent.toFixed(1)}%`;
    console.log(
      `- +${formatMs(delta.deltaMs)}${percent} — ${delta.fullName} (${delta.file})`,
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
