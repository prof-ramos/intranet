# src/app/app/auditoria — Log de Auditoria

Visualização do log de auditoria do sistema. Rota: `/app/auditoria`. Acesso exclusivo para `admin`.

## Schema (`audit_logs`)

```
audit_logs(
  id, action, entity_type (enum), entity_id,
  performed_by → admins.id,
  changes: { old, new } (jsonb),
  metadata (jsonb),
  created_at
)
```

Indexes: `idx_audit_entity` (entity_type, entity_id), `idx_audit_performed_by`, `idx_audit_created_at`.

## Regras

- Esta rota é **somente leitura** — nunca adicionar mutations aqui.
- Paginação obrigatória; nunca carregar todos os logs sem `LIMIT`.
- Filtros esperados: `entity_type`, `performed_by`, intervalo de `created_at`.
- O campo `changes` pode conter dados sensíveis (ex: hash de senha antiga) — não renderizar `changes.old.passwordHash` ou `changes.new.passwordHash` na UI.
- Para registrar novos eventos de auditoria, inserir diretamente na tabela via `db.insert(auditLogs)` a partir das Server Actions de cada módulo.
