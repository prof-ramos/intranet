# Métricas de tempo dos testes (legado)

O coletor de métricas descrito anteriormente foi removido. Não existem comandos
de consulta/limpeza, reporters customizados nem o diretório de scripts de
métricas na árvore atual.

As tabelas `test_runs` e `test_results` permanecem no schema por compatibilidade
histórica, mas não possuem produtor ativo e não devem ser tratadas como fonte
operacional de métricas.

Para tempos locais, use a saída padrão dos runners existentes. Uma nova coleta
persistente exige decisão própria de tooling e não deve reutilizar comandos ou
caminhos removidos.
