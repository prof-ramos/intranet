# Observação pós-merge do smoke de produção

Este registro é o gate operacional depois de um merge em `main`. Ele não
substitui os gates de CI nem transforma o smoke em uma exigência para PRs que
intencionalmente permanecem sem execução de produção (por exemplo, drafts).

## Registro da janela atual

- **SHA observado:** `b827bc4ec96f86e2143f52a128bbf890f3c159e5`
- **Deployment Vercel:** `5976036942` — `success`
- **CI pós-deploy:** [run 32215753730](https://github.com/prof-ramos/intranet/actions/runs/32215753730)
- **Smoke:** [job 95959765685](https://github.com/prof-ramos/intranet/actions/runs/32215753730/job/95959765685)
- **Início da observação:** 2026-08-19 04:26 UTC (deploy); smoke concluído
  aproximadamente às 04:46 UTC
- **Fim da janela de 48 h:** 2026-08-21 04:46 UTC
- **Modo:** `SMOKE_ALLOW_MUTATIONS=false`

O smoke confirmou o SHA completo pelo endpoint autenticado de health, executou
10 testes, teve 6 aprovações e deixou os 4 testes mutantes em `skipped`. Login,
dashboard operacional, mensalidades sem inicialização, auditoria,
notificações e reset de senha passaram. Não foram observados erros de login,
rate-limit ou resíduos de mutação no log do run.

As verificações públicas complementares retornaram `/login` com HTTP 200 e `/`
redirecionando para login. `/api/v1/health` sem credencial retornou HTTP 401,
comportamento esperado para uma rota autenticada; a confirmação do payload e do
SHA foi feita pelo próprio smoke.

## Checklist para cada janela

1. Registrar o SHA completo, deployment, run do CI e horário UTC.
2. Confirmar que `SMOKE_ALLOW_MUTATIONS=false`; não solicitar nem copiar
   secrets para o registro.
3. Confirmar o resultado do smoke: 6 passados e 4 mutantes pulados no modo
   padrão.
4. Conferir o alias canônico, `/login` e o redirecionamento da raiz sem
   provocar login inválido ou outra escrita deliberada.
5. Revisar os logs do run e, quando houver acesso autorizado, consultar de
   forma somente leitura `login_attempts`, `rate_limits` e `audit_logs`.
6. Registrar limitações de acesso. A ausência de credencial administrativa não
   deve ser contornada por alteração de senha, criação de dados ou limpeza SQL.
7. Encerrar a janela somente após 24–48 h sem incidente; qualquer alerta deve
   abrir incidente e preservar o SHA e os links acima.

## Owners e alertas

| Sinal                                                        | Primeiro owner                          | Escalonamento      |
| ------------------------------------------------------------ | --------------------------------------- | ------------------ |
| Deployment, alias, CI ou smoke                               | Gabriel Ramos (técnico)                 | Diretoria nomeada  |
| Pico de falhas de login, rate-limit ou auditoria             | Gabriel Ramos + DBA/admin               | Diretoria e DPO    |
| PII ou impacto em titular                                    | DPO; Diretoria enquanto não formalizado | Canal de incidente |
| Ruído de automação fora do gate (ex.: `Issue Triage Shadow`) | Owner de CI/automação                   | Gabriel Ramos      |

O canal único de incidente e o compromisso de monitoramento seguem o
[ADR 011](../adr/011-incident-owners-day-one.md). Não registrar nomes de
usuários, senhas, tokens, URLs de conexão ou PII neste arquivo.

## E2E: evidência e decisão

Na execução de `main` usada nesta janela, o job E2E durou 14m06s: instalação do
Chromium levou aproximadamente 77 s e os 83 testes consumiram aproximadamente
12m10s, em um worker por causa do banco compartilhado. O gargalo é a execução
sequencial e os logins repetidos, não a instalação do navegador.

O timeout de E2E permanece em **25 minutos**. Ele não deve ser aumentado sem
uma nova medição por estágio. Uma otimização futura segura é reutilizar sessões
por papel dentro da execução do worker, com fallback para login completo e
teste de invalidação; paralelizar specs ou compartilhar sessão entre workers
continua proibido enquanto o banco de E2E for único.

## Limitações desta observação

O binário local do Vercel CLI está quebrado e não foi reparado nesta janela. Sem
sessão administrativa, assinatura M2M ou conexão read-only autorizada, não é
possível contar atualmente `login_attempts`, `rate_limits` e `audit_logs` nem
consultar logs de função da Vercel. Isso é uma limitação registrada, não uma
falha do smoke; não foram criados dados para tentar medi-la.
