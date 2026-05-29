# Controller de E-mails ASOF — Evolucao pos-MVP

Esta issue entrega apenas o MVP validavel por script: Gmail API direta, prompt versionado, structured output com Pydantic, persistencia PostgreSQL e marcacao de e-mails processados.

## Proxima fase

1. Substituir polling manual por Gmail API `watch()` com Cloud Pub/Sub.
2. Adicionar fila de processamento idempotente para retries e backoff.
3. Criar tela interna de validacao humana para base legal, prazos, risco e responsavel.
4. Medir falsos positivos/negativos do prompt antes de automatizar qualquer acao operacional.
5. Definir politica final de retencao documental com a diretoria antes de apagar ou anonimizar dados.

## Restrições mantidas

- O corpo integral do e-mail nao e persistido por padrao.
- A base legal sugerida pela IA nao e decisao final.
- Conteudo juridico, prazo, risco alto/critico ou baixa/media confianca sempre exige validacao humana.
- Falhas de JSON/validacao nao devem ser salvas como analise valida.
