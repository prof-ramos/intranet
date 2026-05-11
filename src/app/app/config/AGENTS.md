# src/app/app/config — Configurações do Sistema

Página de configurações administrativas. Rota: `/app/config`. Acesso exclusivo para `admin`.

## Estado atual

O módulo está em preparação (`page.tsx` exibe placeholder). Configurações futuras previstas:
- Gerenciamento de parâmetros de rate-limit
- Configuração de e-mail SMTP (quando implementado)
- Exportação de backups de dados

## Regras

- Qualquer configuração sensível (chaves, segredos) deve ser lida de variáveis de ambiente; nunca salvar em banco.
- Acesso deve sempre ser restrito a `requireRole(['admin'])`.
- Ao implementar configurações persistentes, criar tabela dedicada `system_config` — não reutilizar tabelas de domínio.
