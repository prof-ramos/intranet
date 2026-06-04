# Controller de E-mails ASOF — Evolucao pos-MVP

Esta issue entrega o MVP validavel por script: Gmail API direta, prompt versionado, structured output, persistencia PostgreSQL, marcacao de e-mails processados e controle operacional de prazos/demandas.

A IA nao toma decisoes juridicas. Ela classifica mensagens, extrai prazos, resume demandas e registra evidencias operacionais para acompanhamento interno. Decisoes de merito juridico, respostas ao associado, arquivamento e conclusao seguem fora do escopo da automacao.

## Proxima fase

1. Substituir polling manual por Gmail API `watch()` com Cloud Pub/Sub.
2. Adicionar fila de processamento idempotente para retries e backoff.
3. Criar tela interna de revisao operacional para falhas, ambiguidades severas e dados insuficientes.
4. Medir falsos positivos/negativos do prompt antes de automatizar qualquer decisao juridica ou comunicacao externa.
5. Definir politica final de retencao documental com a diretoria antes de apagar ou anonimizar dados.

## Restrições mantidas

- O corpo integral do e-mail nao e persistido por padrao.
- A base legal sugerida pela IA nao e decisao final.
- Conteudo juridico, prazo, risco alto/critico ou baixa/media confianca nao exige validacao humana por si so; exige evidencias suficientes e tratamento estritamente operacional.
- `exige_validacao_humana` representa revisao operacional excepcional, nao validacao juridica de merito.
- Falhas de JSON/validacao nao devem ser salvas como analise valida.

## Persistencia e compatibilidade

- As constraints antigas que obrigavam `exige_validacao_humana=true` para categoria `juridico`, risco `alto`/`critico` ou confianca diferente de `alta` foram removidas pela migration `drizzle/postgres/0010_relax_email_triage_operational_review.sql`.
- Permanecem obrigatorias as constraints anti-alucinacao: prazo preenchido exige `ha_prazo`, `prazo_data` exige `prazo_confianca_data`, e `ha_prazo=true` exige evidencias em `source_evidence`.
- O campo `exige_validacao_humana` continua existindo por compatibilidade de banco, UI e notificacoes, mas deve ser lido como revisao operacional excepcional.
