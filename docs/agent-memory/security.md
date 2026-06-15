# Segurança

> Regras de segurança, áreas sensíveis, exigência de autorização, comandos destrutivos, cuidados com backup, proteção de credenciais, limites de autonomia e políticas de alteração.

---

*(Nenhum registro de segurança identificado nesta sessão.)*

## 2026-06-12 — Comandos autorizados por default no projeto ASOF/intranet

- **Tipo**: Política de autorização
- **Escopo**: Comandos de desenvolvimento
- **Memória**: Usuário explicitou que `uv`, `npm` e `gh` estão autorizados por default neste projeto. `git` **não** está incluído — requer aprovação explícita por comando para operações que alteram o repositório (commit, push, branch -d, merge, reset).
- **Evidência**: Sessão 2026-06-12 — comando `git branch -d` ficou pendente 386s; usuário precisou intervir e explicitar a regra.
- **Regra preventiva**: Sempre solicitar aprovação para comandos `git` que modificam o repositório. Não assumir que git está no conjunto autorizado por default.
- **Confiança**: alta

## 2026-06-15 — Connection string visível em output de neonctl

- **Tipo**: Exposição de credencial
- **Escopo**: Neon CLI output
- **Memória**: `neonctl branch create --output json` retorna connection strings com senha em plaintext no campo `connection_uris`. O output foi exibido no terminal e pode aparecer em logs/transcripts. A connection string da branch de dev inclui role `neondb_owner` e senha `npg_...`.
- **Evidência**: Sessão 2026-06-15 — `neonctl branch create --output json` retornou `"connection_uri": "postgresql://neondb_owner:npg_...@ep-steep-art-acc7tgtg..."`.
- **Regra preventiva**: Ao usar `neonctl` com `--output json`, tratar o output como sensível. Não logar/exibir connection strings completas. Considerar `--output table` (que mascara credenciais) ou capturar apenas os campos necessários (branch_id, host), não connection_uri.
- **Confiança**: alta

## 2026-06-15 — Não acessar VPS legada sem autorização explícita

- **Tipo**: Política de alteração
- **Escopo**: VPS legada (legacy-vps-web, legacy-vps-db)
- **Memória**: O usuário explicitou "Não vamos mexer na outra VPS". Os dados já foram extraído via web (Chrome DevTools) e dumps MySQL. Não há necessidade de acessar as VPS para a migração. Dumps existem localmente em `data/asof-prod-dump/`.
- **Evidência**: Sessão 2026-06-15 — usuário rejeitou rotação de credenciais VPS e apontou que dados web eram suficientes.
- **Regra preventiva**: Não propor operações nas VPS legadas (acesso, rotação, modificação) sem autorização explícita do usuário. Os dados necessários já estão disponíveis localmente.
- **Confiança**: alta

## 2026-06-15 — LGPD masking desabilitado por requisito — funções de máscara preservadas

- **Tipo**: Decisão de segurança com impacto em compliance
- **Escopo**: LGPD / visibilidade de dados sensíveis
- **Memória**: `canViewSensitiveFields()` agora retorna `true` para todos os roles. Isso é intencional — o sistema é interno e todos os usuários autenticados (admin, diretoria, secretaria) devem ver dados completos. As funções de máscara (`maskCpf`, `maskSiape`, `maskEmail`, `maskPhone`) e `toAssociateProfileDTO()` permanecem no código para futuros exports a terceiros. O set `SENSITIVE_FIELDS` continua sendo usado para logging de acesso (Art. 30/37). Se no futuro for necessário reativar LGPD masking para um role específico (ex: estagiário, viewer), basta alterar `canViewSensitiveFields()` de volta para lógica baseada em role.
- **Evidência**: Sessão 2026-06-15 — aviso LGPD removido da página de detalhes, PII sempre descriptografado na listagem e no formulário de edição.
- **Regra preventiva**: Não remover as funções de máscara (`maskCpf`, etc.) nem o set `SENSITIVE_FIELDS`. Elas são infraestrutura para compliance futuro. Ao revisar código LGPD, verificar que `canViewSensitiveFields()` é o único gate — não adicionar checks condicionais inline nas páginas.
- **Confiança**: alta

## 2026-06-15 — safeReturnTo: regex `^/app/[\w/_-]*$` como padrão para validação de returnTo

- **Tipo**: Regra de segurança
- **Escopo**: Parâmetros `returnTo` em páginas de detalhe/edição
- **Memória**: A validação `returnTo && returnTo.startsWith('/app/') && !returnTo.includes('..')` passa URLs como `/app/associados?redirect=//evil.com` (open redirect intra-aplicação). Regex `^/app/[\w/_-]*$` restringe a pathname segura sem query strings, fragments ou caracteres não-ASCII.
- **Evidência**: Sessão 2026-06-15 — autoreview P1 encontrou open redirect em `src/app/app/associados/[id]/page.tsx:164`.
- **Regra preventiva**: Para TODO parâmetro `returnTo` ou `redirect` que redireciona o browser, usar `new URL(path).pathname` OU regex `^/app/[\w/_-]*$`. Nunca confiar em `startsWith('/')` sozinho.
- **Confiança**: alta

## 2026-06-15 — Delete com row count check via `.returning()`

- **Tipo**: Regra de segurança / robustez
- **Escopo**: Repository deletes com Drizzle ORM
- **Memória**: `deleteDependentById` e `deleteHealthAgreementById` executavam `db.delete().where(...)` sem verificar quantas linhas foram afetadas. Quando o ID não existia ou o `associateId` não correspondia, a operação silenciava o erro e o action prosseguia com `revalidatePath`. Isso mascara race conditions, stale IDs e potenciais tentativas IDOR.
- **Evidência**: Sessão 2026-06-15 — autoreview P2. Corrigido com `.returning({ id: table.id })` + `if (result.length === 0) throw new Error(...)`.
- **Regra preventiva**: Todo `db.delete()` que representa uma ação de usuário deve incluir `.returning({ id: table.id })` e verificar `result.length === 0` antes de prosseguir. Se zero linhas, lançar erro claro para o usuário.
- **Confiança**: alta
