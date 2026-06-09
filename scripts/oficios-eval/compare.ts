/**
 * Compara duas execuções do harness (diretórios em runs/): mostra, por fixture,
 * a variação no scorecard e um diff linha-a-linha das saídas — para enxergar o
 * efeito de uma mudança no prompt.
 *
 * Uso:
 *   npm run eval:oficios:diff -- <labelA> <labelB>
 *   npm run eval:oficios:diff            # usa as duas execuções mais recentes
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(HERE, 'runs');

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail?: string;
}
interface Manifest {
  label: string;
  model: string;
  promptHash: string;
  promptSource: string;
  results: Array<{ fixture: string; checks: CheckResult[] }>;
}

function listRuns(): string[] {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((d) => existsSync(join(RUNS_DIR, d, 'report.json')))
    .map((d) => ({ d, t: statSync(join(RUNS_DIR, d)).mtimeMs }))
    .sort((a, b) => a.t - b.t)
    .map((x) => x.d);
}

function loadManifest(label: string): Manifest {
  return JSON.parse(readFileSync(join(RUNS_DIR, label, 'report.json'), 'utf-8')) as Manifest;
}

/** Diff de linhas minimalista (LCS) — sem dependências externas. */
function diffLines(a: string[], b: string[]): string[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push(`  ${a[i]}`);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push(`- ${a[i++]}`);
    } else {
      out.push(`+ ${b[j++]}`);
    }
  }
  while (i < n) out.push(`- ${a[i++]}`);
  while (j < m) out.push(`+ ${b[j++]}`);
  return out;
}

function statusMap(checks: CheckResult[]): Record<string, CheckResult> {
  return Object.fromEntries(checks.map((c) => [c.id, c]));
}

function main() {
  const argv = process.argv.slice(2);
  const runs = listRuns();
  let [a, b] = argv;
  if (!a || !b) {
    if (runs.length < 2) {
      throw new Error('São necessárias ao menos 2 execuções. Rode npm run eval:oficios primeiro.');
    }
    [a, b] = runs.slice(-2);
  }
  if (!existsSync(join(RUNS_DIR, a)) || !existsSync(join(RUNS_DIR, b))) {
    throw new Error(`Execução não encontrada. Disponíveis: ${runs.join(', ') || '(nenhuma)'}`);
  }

  const ma = loadManifest(a);
  const mb = loadManifest(b);

  console.log(`\n┌ A: ${a}  (modelo ${ma.model}, prompt sha ${ma.promptHash})`);
  console.log(`└ B: ${b}  (modelo ${mb.model}, prompt sha ${mb.promptHash})`);
  if (ma.promptHash === mb.promptHash) {
    console.log('  ⚠ Mesmo prompt nas duas execuções (diferenças vêm só da variação do modelo).');
  }
  console.log('');

  const fixtures = Array.from(new Set([...ma.results.map((r) => r.fixture), ...mb.results.map((r) => r.fixture)])).sort();

  for (const fx of fixtures) {
    console.log(`\n══════ ${fx} ══════`);

    const ca = statusMap(ma.results.find((r) => r.fixture === fx)?.checks ?? []);
    const cb = statusMap(mb.results.find((r) => r.fixture === fx)?.checks ?? []);
    const ids = Array.from(new Set([...Object.keys(ca), ...Object.keys(cb)]));
    for (const id of ids) {
      const sa = ca[id]?.status ?? '—';
      const sb = cb[id]?.status ?? '—';
      const flag = sa !== sb ? '  ← MUDOU' : '';
      console.log(`  ${id.padEnd(22)} A:${sa.padEnd(5)} B:${sb.padEnd(5)}${flag}`);
    }

    const fa = join(RUNS_DIR, a, `${fx}.txt`);
    const fb = join(RUNS_DIR, b, `${fx}.txt`);
    if (existsSync(fa) && existsSync(fb)) {
      const ta = readFileSync(fa, 'utf-8').trim();
      const tb = readFileSync(fb, 'utf-8').trim();
      if (ta === tb) {
        console.log('  (texto idêntico)');
      } else {
        console.log('  --- diff (- A / + B) ---');
        for (const line of diffLines(ta.split('\n'), tb.split('\n'))) {
          if (line.startsWith('  ')) continue; // omite linhas inalteradas
          console.log(`  ${line}`);
        }
      }
    }
  }
  console.log('');
}

try {
  main();
} catch (e) {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}\n`);
  process.exitCode = 1;
}
