/**
 * Executa o gerador de ofícios sobre as fixtures usando a API real do Gemini e
 * salva as saídas + scorecard num diretório versionado, para comparar versões
 * do prompt.
 *
 * Uso:
 *   npm run eval:oficios -- [--label <nome>] [--prompt <arquivo>] [--model <id>] [--temp <n>]
 *
 *   --label   Nome do diretório de saída em runs/ (padrão: timestamp).
 *   --prompt  Caminho de um arquivo .txt com uma system instruction alternativa.
 *             Sem isso, usa o SYSTEM_INSTRUCTION de produção (src/lib/ai/prompts.ts).
 *   --model   Modelo Gemini (padrão: o LETTER_MODEL de produção).
 *   --temp    Temperatura (padrão: 0.4).
 *   --only    Roda apenas a fixture com este id.
 *
 * Requer GEMINI_API_KEY (ambiente ou .env.local).
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { SYSTEM_INSTRUCTION, buildLetterUserMessage } from '@/lib/ai/prompts';
import { LETTER_MODEL } from '@/lib/ai/constants';
import { generateLetter } from './gemini-runner';
import { runChecks, summarize, type Fixture, type CheckResult } from './checks';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, 'fixtures');
const RUNS_DIR = join(HERE, 'runs');

interface Args {
  label: string;
  promptFile?: string;
  model: string;
  temp: number;
  only?: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    label: get('--label') ?? stamp,
    promptFile: get('--prompt'),
    model: get('--model') ?? LETTER_MODEL,
    temp: get('--temp') ? Number(get('--temp')) : 0.4,
    only: get('--only'),
  };
}

function loadFixtures(only?: string): Fixture[] {
  const files = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const fixtures = files.map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf-8')) as Fixture);
  return only ? fixtures.filter((fx) => fx.id === only) : fixtures;
}

function statusIcon(s: CheckResult['status']): string {
  return s === 'pass' ? '✓' : s === 'warn' ? '!' : '✗';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const systemInstruction = args.promptFile
    ? readFileSync(args.promptFile, 'utf-8')
    : SYSTEM_INSTRUCTION;
  const promptHash = createHash('sha256').update(systemInstruction).digest('hex').slice(0, 12);
  const promptSource = args.promptFile ?? 'producao (src/lib/ai/prompts.ts)';

  const fixtures = loadFixtures(args.only);
  if (fixtures.length === 0) {
    throw new Error('Nenhuma fixture encontrada.');
  }

  const outDir = join(RUNS_DIR, args.label);
  mkdirSync(outDir, { recursive: true });

  console.log(`\n▶ Run "${args.label}"`);
  console.log(`  modelo:  ${args.model}  temp: ${args.temp}`);
  console.log(`  prompt:  ${promptSource}  (sha ${promptHash})`);
  console.log(`  fixtures: ${fixtures.length}\n`);

  const report: Array<{
    fixture: string;
    output: string;
    checks: CheckResult[];
    summary: ReturnType<typeof summarize>;
  }> = [];

  for (const fixture of fixtures) {
    process.stdout.write(`  • ${fixture.id} … `);
    let output = '';
    let error: string | undefined;
    try {
      output = await generateLetter({
        systemInstruction,
        userMessage: buildLetterUserMessage(fixture.input),
        model: args.model,
        temperature: args.temp,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    if (error) {
      console.log(`ERRO: ${error}`);
      writeFileSync(join(outDir, `${fixture.id}.txt`), `__ERRO__: ${error}\n`, 'utf-8');
      report.push({
        fixture: fixture.id,
        output: '',
        checks: [{ id: 'generation', label: 'Geração', status: 'fail', detail: error }],
        summary: { pass: 0, warn: 0, fail: 1 },
      });
      continue;
    }

    const checks = runChecks(output, fixture);
    const summary = summarize(checks);
    writeFileSync(join(outDir, `${fixture.id}.txt`), output, 'utf-8');
    report.push({ fixture: fixture.id, output, checks, summary });

    const badges = checks.map((c) => `${statusIcon(c.status)}${c.id}`).join(' ');
    console.log(`${summary.fail ? '✗' : summary.warn ? '!' : '✓'}  ${badges}`);
    for (const c of checks.filter((c) => c.status !== 'pass')) {
      console.log(`        ${statusIcon(c.status)} ${c.label}: ${c.detail ?? ''}`);
    }
  }

  const manifest = {
    label: args.label,
    createdAt: new Date().toISOString(),
    model: args.model,
    temperature: args.temp,
    promptSource,
    promptHash,
    results: report.map((r) => ({ fixture: r.fixture, summary: r.summary, checks: r.checks })),
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  const totals = report.reduce(
    (acc, r) => ({
      pass: acc.pass + r.summary.pass,
      warn: acc.warn + r.summary.warn,
      fail: acc.fail + r.summary.fail,
    }),
    { pass: 0, warn: 0, fail: 0 },
  );
  console.log(`\n  Total: ${totals.pass} pass · ${totals.warn} warn · ${totals.fail} fail`);
  console.log(`  Saída: ${join('scripts/oficios-eval/runs', args.label)}\n`);

  if (existsSync(outDir)) {
    console.log('  Compare com outra execução: npm run eval:oficios:diff -- <labelA> <labelB>\n');
  }
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}\n`);
  process.exitCode = 1;
});
