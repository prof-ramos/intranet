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
