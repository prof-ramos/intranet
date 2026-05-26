# ADR 002: Runbook e Estratégia do Primeiro Go-Live

Status: accepted, 2026-05-26

## Contexto

A ASOF está se preparando para o primeiro go-live da sua intranet. Houve uma série de simplificações arquiteturais e operacionais para garantir uma estreia segura, controlada e aderente à LGPD, reduzindo o escopo de dependências externas complexas e focando em estabilidade.

A documentação operacional desse processo foi consolidada no arquivo `docs/runbook.md`. É necessário registrar formalmente a decisão arquitetural e o fluxo técnico que suporta essa estreia limpa.

## Decisão

Adotamos a estratégia do "Baseline Limpo" para o primeiro go-live, conforme as regras estabelecidas no Runbook Operacional.

As premissas inegociáveis para a estreia são:

1. **Banco de Dados Limpo e Gerenciado**: A estreia utilizará um banco PostgreSQL gerenciado novo, com os scripts de migration Drizzle zerados ou recriados para refletir apenas o estado atual necessário. Nenhuma bagagem de tentativas antigas de infraestrutura será carregada.
2. **Segurança e Envs**: Separação estrita de acessos via `DATABASE_URL` (para a aplicação web em runtime, utilizando connection pooling) e `DATABASE_MIGRATION_URL` (conexão direta apenas para apply de migrations).
3. **Autenticação**: Uso de autenticação 100% server-side própria da aplicação, sem exposição ao browser e sem bypasses em produção (`SKIP_AUTH` obrigatoriamente desabilitado).
4. **Tratamento de PII**: Criptografia em repouso configurada através da `ENCRYPTION_MASTER_KEY` e obrigatoriedade do uso do `src/lib/sanitize-pii.ts` para ofuscação de dados sensíveis em logs.

## Consequências

- **Estabilidade Previsível**: A execução de `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` seguida do `npm run db:seed` em um banco descartável pode ser testada exaustivamente e com confiança antes do deploy definitivo.
- **Isolamento de Funcionalidades Incompletas**: Módulos que requerem integrações externas pendentes (como Storage Físico e Integrações complexas via `ASOF_INTEGRATIONS_ENABLED`) permanecem desligados ou limitados na estreia.
- **Recuperação Descomplicada**: A estratégia de rollback foca em snapshots de provedor de nuvem (antes da execução do migrate) e rollback do código da aplicação, garantindo que o banco de dados da estreia não sofra com sujeira de testes passados.
