# ADR 020: Spike Comparativo de Object Storage — Cloudflare R2 versus Garage

Status: accepted for isolated POC; outcome blocked on POC credentials

## Contexto

O ADR 008 mantém o módulo Documentos e o object storage fora do dia 1. O ADR
012 registrou o Papra como candidato histórico, mas a POC do Papra não foi
executada e não deve ser reaberta automaticamente. O ADR 019 também mantém
artefatos de exportação fora de storage persistente até existir uma decisão
própria.

O issue [#423](https://github.com/prof-ramos/intranet/issues/423) pede uma
comparação atual entre Cloudflare R2 e Garage, sem transformar o spike em
integração de produto. A `documents` table existente descreve metadados, mas
não há serviço de storage nem tela que possa ser alterado com segurança neste
lote.

## Decisão

Faremos um spike executável, isolado e somente com dados sintéticos, para
comparar R2 e Garage como backends S3-compatible. O spike:

1. usa um bucket privado de POC em cada provedor, nunca um bucket de produção;
2. usa `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`, sem acoplar o
   código da aplicação a um provedor;
3. exige `STORAGE_SPIKE_ALLOW_NETWORK=true` e variáveis de ambiente separadas:
   `R2_POC_*` e `GARAGE_POC_*`;
4. executa PUT e GET presignados, valida HEAD (tamanho e `Content-Type`),
   verifica o comportamento de uma restrição de tipo e de uma URL expirada;
5. gera chaves sob `storage-spike/<run-id>/` e, com `--cleanup`, remove apenas
   as três chaves criadas naquela execução;
6. não cria migration, tabela, rota, componente, variável Vercel, bucket de
   produção, workflow de deploy ou configuração de Papra/MCP.

O script está em [`scripts/storage-spike.ts`](../../scripts/storage-spike.ts),
com instruções operacionais em
[`scripts/storage-spike/README.md`](../../scripts/storage-spike/README.md) e
testes dos guardas em [`scripts/storage-spike.test.ts`](../../scripts/storage-spike.test.ts).

## Matriz de avaliação

Cada execução deve registrar apenas resultados operacionais e latência
aproximada, sem payloads, URLs assinadas, credenciais ou dados pessoais.

| Dimensão        | Evidência mínima                                                              |
| --------------- | ----------------------------------------------------------------------------- |
| Compatibilidade | PUT/GET presignados, HEAD, metadados e expiração                              |
| Segurança       | Bucket privado, escopo mínimo de credenciais, CORS restrito e ausência de PII |
| Retenção        | Lifecycle/TTL, deleção, abort de multipart e comportamento após expiração     |
| Resiliência     | Falhas/retries, limites de tamanho, latência e disponibilidade observada      |
| Operação        | Backup/restore, monitoramento, rotação de chaves e esforço de manutenção      |
| Custo           | Armazenamento, operações, egress e custos fixos sob o volume estimado         |
| Governança      | LGPD, localização, suboperadores, licença e possibilidade de saída            |

R2 deve ser avaliado conforme a documentação de [presigned
URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/)
e [lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
Garage deve ser avaliado com a mesma matriz, incluindo o custo operacional de
manter a infraestrutura e o plano de backup do cluster.

## Consequências

O resultado desta decisão é um artefato comparável e reproduzível, não uma
escolha definitiva de fornecedor. O uso de uma fixture sintética e de um
prefixo por execução limita risco de LGPD e torna a limpeza auditável. Em
contrapartida, o spike não prova integração com autenticação, UI, banco,
Vercel ou fluxo de documentos real.

Não haverá adoção em produção até um novo ADR (ou emenda explícita) escolher o
provedor e um plano separado definir integração, lifecycle, backup/restore,
políticas de acesso, migração e testes de documentos.

## Outcome

**Resultado: blocked-on-credentials** (2026-09-08). Nenhum provedor foi
escolhido, rejeitado ou adiado com evidência operacional. Não há ADR 022.

O spike **não foi executado** neste ambiente: `STORAGE_SPIKE_ALLOW_NETWORK` e
as variáveis `R2_POC_*` / `GARAGE_POC_*` não estavam disponíveis. Sem PUT/GET
presignados contra buckets de POC, a matriz (custo, operação, CORS, lifecycle,
LGPD, compatibilidade S3) não tem evidência. Inventar latência ou sucesso
violaria este ADR.

Os critérios de encerramento abaixo **permanecem abertos**. Papra continua
rejeitado ([ADR 012](./012-papra-dms-candidate-for-documents.md)) e não é
reaberto. `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` seguem em
`devDependencies` até um ADR posterior escolher provedor ou abandonar o spike.
Esta emenda **não** integra storage na aplicação: sem rota, UI de Documentos,
migration, variável Vercel, bucket de produção ou wiring de `@aws-sdk` em
`src/`.

Comentário secret-free já existe em
[#423](https://github.com/prof-ramos/intranet/issues/423) (execução real
pendente de credenciais de POC). O fechamento documental desta emenda é o
issue [#481](https://github.com/prof-ramos/intranet/issues/481).

### Próximo passo do operador

1. Provisionar buckets privados de POC (nunca nomes `prod`, `production` ou
   `main`).
2. Exportar `STORAGE_SPIKE_ALLOW_NETWORK=true` e `R2_POC_*` / `GARAGE_POC_*`
   conforme [`scripts/storage-spike/README.md`](../../scripts/storage-spike/README.md).
3. Executar `npm run storage:spike -- --cleanup` (ou `--provider=r2` /
   `--provider=garage`).
4. Registrar a matriz sem segredos em #423 e emendar este ADR (`chosen` /
   `rejected` / `deferred`). Só então abrir ADR 022 e um plano de integração,
   se um provedor for escolhido.

## Critérios de encerramento

- [ ] Executar o script contra um bucket R2 de POC e uma instância Garage de
      POC, com `--cleanup`.
- [ ] Anexar à issue #423 a matriz sem segredos nem payloads.
- [ ] Escolher ou rejeitar cada provedor com base em custo, operação,
      segurança, LGPD e compatibilidade.
- [ ] Abrir decisão e plano de integração antes de qualquer uso por uma rota da
      intranet.
