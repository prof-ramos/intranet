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
