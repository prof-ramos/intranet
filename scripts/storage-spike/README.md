# Storage spike: R2 versus Garage

Este spike usa somente uma fixture sintética e nunca deve receber PII. Ele
valida o contrato mínimo de um object store privado: PUT e GET presignados,
metadados, restrição de `Content-Type` e expiração de URL.

## R2 de teste

Crie um bucket privado temporário, separado de produção, e um par de credenciais
S3 com escopo mínimo ao bucket. Não salve os valores em arquivos versionados.

```bash
export STORAGE_SPIKE_ALLOW_NETWORK=true
export STORAGE_SPIKE_PROVIDER=r2
export R2_POC_ACCOUNT_ID='...'
export R2_POC_BUCKET='asof-docs-poc-...'
export R2_POC_ACCESS_KEY_ID='...'
export R2_POC_SECRET_ACCESS_KEY='...'
export R2_POC_REGION=auto

npm run storage:spike -- --provider=r2 --cleanup
```

O endpoint padrão é `https://<account>.r2.cloudflarestorage.com`. Use
`R2_POC_ENDPOINT` apenas para um endpoint de teste explicitamente documentado.

## Garage

Suba uma instância Garage isolada, crie um bucket não produtivo e forneça um
endpoint S3 compatível e credenciais de teste:

```bash
export STORAGE_SPIKE_ALLOW_NETWORK=true
export GARAGE_POC_ENDPOINT='http://127.0.0.1:3900'
export GARAGE_POC_BUCKET='asof-docs-poc'
export GARAGE_POC_ACCESS_KEY_ID='...'
export GARAGE_POC_SECRET_ACCESS_KEY='...'
export GARAGE_POC_REGION=garage

npm run storage:spike -- --provider=garage --cleanup
```

O script usa `forcePathStyle` para Garage e não provisiona nem remove a
instância. A limpeza remove somente as três chaves do prefixo gerado pela
execução; a exclusão do bucket é uma operação separada e manual.

## Segurança e evidência

- `STORAGE_SPIKE_ALLOW_NETWORK=true` é obrigatório.
- Buckets com nomes `prod`, `production` ou `main` são recusados.
- O script não imprime credenciais nem URLs presignadas.
- `--cleanup` é recomendado e remove somente as chaves sintéticas da própria
  execução; sem a flag, o resultado deve ser preservado apenas para diagnóstico
  e as chaves precisam ser removidas manualmente pelo operador.
- A matriz comparativa deve registrar resultado, latência aproximada, operação
  de retenção/backup, limitações de CORS, custo e risco LGPD sem incluir payloads.
