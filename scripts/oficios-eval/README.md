# Harness de avaliação — Gerador de Ofícios

Roda o mesmo conjunto de rascunhos pela **API real do Gemini** e salva as saídas
otimizadas + um scorecard determinístico, para você comparar o efeito de mudanças
no `SYSTEM_INSTRUCTION` ao longo do tempo.

> ⚠️ Faz chamadas reais à API (consome quota). Requer `GEMINI_API_KEY` no ambiente
> ou em `.env.local`. As fixtures são **sintéticas e sem PII** — nunca coloque
> dados reais de associados aqui (LGPD).

## Pré-requisitos

```bash
export GEMINI_API_KEY="AIza..."   # ou deixe em .env.local
```

## Fluxo de uso

```bash
# 1. Gera com o prompt ATUAL de produção (src/lib/ai/prompts.ts)
npm run eval:oficios -- --label antes

# 2. Edite o SYSTEM_INSTRUCTION em src/lib/ai/prompts.ts

# 3. Gere de novo
npm run eval:oficios -- --label depois

# 4. Compare lado a lado (scorecard + diff do texto)
npm run eval:oficios:diff -- antes depois
```

Sem `--label`, o diretório recebe um timestamp; sem argumentos, o `diff` compara
as duas execuções mais recentes.

## Opções do `run`

| Flag | Efeito |
|------|--------|
| `--label <nome>` | Nome do diretório em `runs/` (padrão: timestamp) |
| `--prompt <arquivo>` | Usa uma system instruction alternativa de um `.txt`, sem editar o código — útil para comparar duas variantes numa só sessão |
| `--model <id>` | Modelo Gemini (padrão: `LETTER_MODEL` de produção) |
| `--temp <n>` | Temperatura (padrão: `0.4`) |
| `--only <id>` | Roda apenas uma fixture |

Exemplo comparando duas variantes de prompt sem mexer no código:

```bash
npm run eval:oficios -- --label variante-A --prompt ./prompts/variante-A.txt
npm run eval:oficios -- --label variante-B --prompt ./prompts/variante-B.txt
npm run eval:oficios:diff -- variante-A variante-B
```

## O que o scorecard verifica

Regras do MRPR/Itamaraty checáveis automaticamente (não substituem revisão humana
do mérito):

- **non_empty** — corpo com conteúdo mínimo
- **forbidden_expressions** — ausência de fórmulas vedadas ("Venho por meio deste", "Outrossim", "Destarte", etc.)
- **pronoun** — pronome de tratamento correto (Excelência × Senhoria) conforme `expect.pronoun` da fixture; sem abreviação e sem tratamentos vedados
- **no_markdown** — texto puro, sem `**`, `#`, crases ou bullets
- **no_vocativo_fecho** — sem vocativo de abertura nem fecho/assinatura (gerados pelo sistema, não pelo modelo)
- **paragraph_numbering** — numeração sequencial quando ≥3 parágrafos; dispensada em textos curtos

## Estrutura

```
scripts/oficios-eval/
├── fixtures/        # rascunhos sintéticos (.json) — adicione os seus
├── checks.ts        # verificações determinísticas
├── gemini-runner.ts # cliente Gemini mínimo (lê GEMINI_API_KEY)
├── run.ts           # executa fixtures × prompt e salva runs/<label>/
├── compare.ts       # diff entre duas execuções
└── runs/            # saídas (git-ignored)
```

## Adicionar uma fixture

Crie `fixtures/NN-descricao.json`:

```json
{
  "id": "NN-descricao",
  "description": "...",
  "expect": { "pronoun": "excelencia" },
  "input": {
    "recipient": "...", "recipientRole": "...",
    "subject": "...", "itamaratySector": "...",
    "signatory": "...", "signatoryRole": "...",
    "instruction": "..."
  }
}
```
