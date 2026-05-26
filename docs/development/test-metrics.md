# Métricas de tempo dos testes

## Objetivo

Registrar automaticamente a duração de cada teste executado no projeto para acompanhar regressões ou melhorias de performance ao longo do tempo.

A coleta é feita no nível dos runners, sem alterar os arquivos de teste existentes.

## Runners cobertos

- Vitest unitário: `npm run test`
- Vitest integração: `npm run test:db`
- Playwright E2E: `npm run test:e2e`

## Saída gerada

Os arquivos são gerados em:

```text
.test-metrics/
  runs/
    <run-id>.jsonl
    <run-id>.summary.json
  vitest-unit-latest.json
  vitest-integration-latest.json
  playwright-e2e-latest.json
```

`.test-metrics/` é ignorado pelo Git porque contém artefatos locais/CI de execução.

## Formato por teste

Cada linha `.jsonl` representa um teste executado:

```json
{
  "schemaVersion": 1,
  "runId": "2026-05-26T08-00-00-000Z_vitest_unit_12345_abcd1234",
  "recordedAt": "2026-05-26T08:00:01.000Z",
  "environment": "local",
  "runner": "vitest",
  "suite": "unit",
  "file": "src/lib/example.test.ts",
  "name": "deve validar o comportamento esperado",
  "fullName": "módulo > deve validar o comportamento esperado",
  "status": "passed",
  "durationMs": 42,
  "retry": null,
  "projectName": null,
  "errorCount": 0
}
```

## Como consultar

Depois de rodar uma ou mais suítes:

```bash
npm run test:metrics
```

O comando mostra, por runner/suíte:

- duração total da última execução;
- comparação com a execução anterior;
- contagem de testes por status;
- testes mais lentos;
- maiores regressões por teste quando houver base comparável.

## Como limpar métricas locais

```bash
npm run test:metrics:clean
```

## Como desabilitar temporariamente

```bash
TEST_METRICS_DISABLED=1 npm run test
```

Também funciona com `true` ou `yes`.

## Diretório customizado

```bash
TEST_METRICS_DIR=/tmp/asof-test-metrics npm run test
```

## Interpretação

Use as métricas como sinal operacional, não como benchmark absoluto. Tempo de teste varia conforme máquina, carga do sistema, banco local, cache, CI e rede.

A comparação mais útil é entre execuções no mesmo ambiente, especialmente no CI ou na mesma máquina local.

## Arquivos principais

- `scripts/test-metrics/metrics.ts`
- `scripts/test-metrics/vitest-reporter.ts`
- `scripts/test-metrics/playwright-reporter.ts`
- `scripts/test-metrics/summary.ts`
- `vitest.config.ts`
- `vitest.integration.config.ts`
- `playwright.config.ts`
