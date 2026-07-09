# Higiene de Secrets (ASOF Intranet)

Procedimento operacional para evitar vazamento de credenciais e manter rotação
controlada. **Nunca cole valores de secrets neste arquivo, em issues ou em PRs.**

## Regras absolutas

1. Secrets de produção vivem na **Vercel** (e GitHub Secrets só para smoke CI).
2. Desenvolvimento diário usa `.env.local` com **Postgres local** e seed sintético.
3. Arquivos `.env*` (exceto `.env.example`) são gitignored — não force-add.
4. **Proibido** manter no root do repositório cópias tipo:
   - `.env.local.prod.bak`
   - `.env.production`
   - dumps com connection string embutida
5. Se um backup de env for inevitável, guarde **fora do repo**, em diretório
   `chmod 700`, arquivo `chmod 600` (ex.: `~/.asof-private/`), ou em cofre
   (1Password/Bitwarden/team vault).

## Ação executada em 2026-07-09

- O arquivo local `.env.local.prod.bak` foi **removido do workspace do projeto**
  e movido para um diretório privado do operador (`~/.asof-private/`), modo `600`.
- O repositório não versiona esse arquivo (`.gitignore`: `.env*`).

## Quando rotacionar (obrigatório)

Rotacione **imediatamente** se qualquer um for verdadeiro:

- [ ] O arquivo `.env*.bak` / dump foi colado em chat, PR, ticket ou log
- [ ] A máquina do operador foi compartilhada, perdida ou comprometida
- [ ] Um colaborador com acesso a prod saiu do time
- [ ] Suspeita de vazamento LGPD / incidente ADR 011

Rotacione **periodicamente** (recomendado a cada 90 dias) mesmo sem incidente:

| Secret                                    | Onde atualizar                   | Impacto                                         |
| ----------------------------------------- | -------------------------------- | ----------------------------------------------- |
| `SESSION_SECRET`                          | Vercel Production                | Invalida sessões ativas (logout global)         |
| `ENCRYPTION_MASTER_KEY`                   | **Só com plano** — ver nota      | Quebra decrypt de PII se trocada sem re-encrypt |
| `CRON_SECRET`                             | Vercel + quem chama crons        | Crons 401 até alinhar                           |
| `DATABASE_URL` / `DATABASE_MIGRATION_URL` | Neon role password + Vercel      | App e migrate param até alinhar                 |
| Mailjet keys                              | Mailjet + Vercel                 | E-mail/reset param                              |
| `SMOKE_ADMIN_PASSWORD`                    | GitHub Actions secret            | Smoke CI falha                                  |
| Assinafy / Gemini / Gmail (se ativos)     | Provider + Vercel / app_settings | Integração afeta                                |

### Nota crítica: `ENCRYPTION_MASTER_KEY`

**Não rotacione a chave mestra de PII sem design de re-encrypt.** Troca isolada
torna ciphertexts ilegíveis. Fluxo seguro (resumo):

1. Manter chave antiga disponível só no job de migração.
2. Re-encrypt de todas as colunas ciphertext em janela controlada.
3. Só então desativar a chave antiga.

Na dúvida, **não** rotacione `ENCRYPTION_MASTER_KEY` no mesmo ciclo de
`SESSION_SECRET` / senhas de DB.

## Checklist de rotação segura (sem imprimir valores)

```bash
# 1) Gerar material novo (exemplo — copiar só para o painel Vercel)
openssl rand -hex 32   # SESSION_SECRET ou CRON_SECRET

# 2) Atualizar Vercel Production (use --yes em automação)
# vercel env add SESSION_SECRET production --force --yes
# (preferir painel se a CLI pedir confirmação interativa)

# 3) Redeploy production após envs

# 4) Validar login + um cron com CRON_SECRET + smoke se a janela permitir

# 5) Revogar material antigo no provider (Neon reset password, Mailjet revoke)
```

## Inventário de arquivos locais (operador)

| Esperado no repo   | Não esperado no repo                 |
| ------------------ | ------------------------------------ |
| `.env.example`     | `.env.local.prod.bak`                |
| `.env.local` (dev) | Qualquer `.env` com host Neon `main` |
| —                  | Dumps `*.sql.gz` com PII             |

## Relacionados

- [`docs/runbook.md`](../runbook.md) — release, backup, incidentes LGPD
- [`docs/environments.md`](../environments.md) — matriz de envs
- ADR 010 (rollback), ADR 011 (incidentes), ADR 016 (reset chave)
