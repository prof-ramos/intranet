# ADR 009: Smoke De Go-Live Direto Em Producao, Em Janela Controlada

Status: accepted (emendado em 2026-07-18 — o Plano 060/PR #400 substituiu a janela manual única aqui descrita por um job CI recorrente, read-only por padrão em todo push a `main`, com os cenários mutantes atrás de `workflow_dispatch` explícito; ver `docs/runbook.md` e `TODO-PROD.md` para o contrato atual)
Data: 2026-05-26

## Contexto

O ADR 004 e o ADR 007 obrigam que previews/staging usem bancos separados de producao, mas nao definem a existencia de um ambiente staging dedicado. Em 2026-05-26, os envs gerais de banco foram removidos do ambiente Preview no Vercel, restando apenas `SESSION_SECRET` e uma `GEMINI_API_KEY` restrita a um branch especifico. Hoje nao existe banco staging vivo.

O `TODO-PROD.md` cita "staging/final" para o smoke manual e "staging" para E2E, mas sem alvo concreto isso vira instrucao orfa. O banco de producao Neon (`ep-empty-cake-ac26vl6w`) esta limpo, com baseline aplicado, `test:db` aprovado e apenas o admin inicial seedado.

## Decisao

O smoke manual de go-live e a validacao do cron com `CRON_SECRET` sao executados **diretamente no ambiente de producao**, em **janela controlada**, antes da liberacao de acesso para Secretaria e Diretoria.

Regras da janela:

- Janela aprovada com data/hora explicita registrada na `TODO-PROD.md` ou em runbook (ADR 002).
- Snapshot Neon imediatamente antes da janela; ponto de rollback documentado.
- Smoke executado por uma unica pessoa autenticada como admin inicial, com troca obrigatoria de senha ja realizada.
- Dados criados durante o smoke sao marcados (prefixo `SMOKE_` ou nome dedicado) e removidos via SQL direto contra Neon antes da liberacao.
- Auditoria registra integralmente as acoes de smoke; o registro de auditoria nao e apagado.
- Liberacao para usuarios finais so ocorre apos limpeza confirmada e checklist do `TODO-PROD.md` zerado.

E2E (`npm run test:e2e`) continua rodando localmente contra `asof_test`, nunca contra Neon producao. O resultado local de 2026-05-26 (52 testes) e suficiente como gate de E2E para a estreia.

## Opcoes Rejeitadas

- **Provisionar Neon branch staging dedicado**: rejeitado para a estreia. Exigiria criar branch Neon, configurar Preview no Vercel e refazer seed; custo de tempo alto para validar uma base de producao que hoje esta vazia. Pode voltar como hardening pos-estreia.
- **Smoke local contra Neon producao via `.env.local`**: rejeitado como gate. Nao exercita runtime real (Vercel Functions, cookies de dominio, rate limit, cron Vercel) e quebra o isolamento de credenciais.

## Consequencias

- O roteiro de smoke do `TODO-PROD.md` deve nomear explicitamente "producao em janela controlada" como ambiente.
- O plano de rollback (item separado em `TODO-PROD.md`) deve referenciar o snapshot Neon imediatamente anterior a janela.
- Owners de incidente devem estar de prontidao durante a janela.
- Pos-estreia, fica em aberto avaliar Neon branches para staging continuo.
