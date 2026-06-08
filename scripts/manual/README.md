# Scripts Manuais

Scripts nesta pasta **nao sao executados pelo CI/CD** e nao sao
referenciados em `package.json`. Sao ferramentas de
administracao/desenvolvimento usadas pontualmente por humanos.

| Script | Proposito |
|---|---|
| `generate-sample-pdf.ts` | Gera um PDF de oficio de amostra para validacao visual da biblioteca `pdf-lib` |
| `send-assinafy-test.ts` | Envia um oficio de teste para a API de assinatura digital Assinafy |

Para executar:

```bash
cd scripts/manual
npx tsx generate-sample-pdf.ts
npx tsx send-assinafy-test.ts
```
