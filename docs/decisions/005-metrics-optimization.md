# ADR 005: Otimização de Métricas do Dashboard

## Decisão

Migrar lógica de métricas de closure na rota para MetricsService com queries agregadas e cache.

## Drivers

- Performance: 10 queries sequenciais degradavam UX
- Manutenibilidade: Lógica de negócio não deveria estar em rotas
- Escalabilidade: Cache permite servir mais usuários com mesma infra

## Alternativas Consideradas

1. **View materializada no banco** - Descartada por sobrecarga de manutenção
2. **Job em fila executando periodicamente** - Descartada por adicionar complexidade
3. **Cache HTTP no navegador** - Insuficiente, dados mudam frequentemente

## Consequências

- Positiva: Performance melhorada (~10x com cache hit)
- Positiva: Separação clara de responsabilidades
- Negativa: Dados podem ter até 5 minutos de atraso
- Mitigação: Cache invalidado em eventos de mudança por meio de Observers nas tabelas correspondentes.

## Follow-ups

- Monitorar taxa de cache miss/hit
- Considerar TTL por tipo de métrica
