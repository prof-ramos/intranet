# Open Questions - Planos Intranet ASOF

## [Melhorias Críticas Intranet ASOF] - 2025-03-18

- [ ] **TTL do cache de métricas** — O plano define 5 minutos (300s), mas pode ser necessário ajustar baseado em quão frequente os dados mudam na prática. Confirmar com equipe.

- [ ] **Estratégia de invalidação de cache** — Plano usa Observers para invalidar, mas há risco de cache stale se modificações forem feitas diretamente no banco ou via seeder. Aceitável?

- [ ] **Escopo de Phase 2** — Outros Controllers (MeetingRecord, Notice, QuickLink) também não têm Policies. Deve ser planejado como Phase 2 ou tratado de forma diferente?

- [ ] **User::isAdmin() baseado em email** — Plano documenta FIXME, mas a migração para roles deve ser prioridade alta ou pode aguardar?

- [ ] **Padrão de Response para autorização falha** — Laravel retorna 403 Forbidden por padrão. Frontend está preparado para tratar isso adequadamente em todos os endpoints?

- [ ] **Testes de performance com dados reais** — Plano propõe benchmark, mas pode ser necessário testar com volume de dados similar à produção para validar melhoria real.
