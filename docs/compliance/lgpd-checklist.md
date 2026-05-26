# Checklist LGPD-ready

Versao: 2026-05-26

Escopo: intranet ASOF com Next.js, PostgreSQL gerenciado, auth server-side propria e Mailjet para email transacional.

## Controles Tecnicos Presentes

- Autorizacao server-side com `requireAuth()` e `requireRole()`.
- Senhas administrativas com hash bcrypt em `admins.password_hash`.
- Sessao por cookie `httpOnly` assinado com `SESSION_SECRET`.
- Mascaramento por role para campos sensiveis.
- Criptografia e índices cegos para dados sensíveis.
  - Implementado: `associates.cpf_hash_blinded`, `associates.address_encrypted`, `associates.siape_encrypted`.
  - Não implementado: `associates.email`, `associates.name` (requerido para login, exibição na UI e busca textual, risco mitigado via RLS e logs).
- Logger e sanitizador de PII para reduzir vazamento em logs e eventos.
- Auditoria em `audit_logs`.

## Pendencias LGPD Antes Do Go-Live

- [ ] ROPA formal com finalidade, base legal, categorias de dados e operadores.
- [ ] Politica de privacidade publicada.
- [ ] Canal de contato do encarregado/DPO.
- [ ] Processo para direitos do titular.
- [ ] Politica de retencao e descarte por categoria de dado, incluindo retenção e descarte de backups do PostgreSQL gerenciado (documentando prazos, responsáveis e procedimentos de deleção segura para backups, com verificação e auditoria).
- [ ] Plano de resposta a incidentes.
- [ ] Lista de operadores/suboperadores: Vercel, provider PostgreSQL gerenciado, Mailjet e storage de objetos quando escolhido.
- [ ] **BLOQUEANTE:** Revisao de transferencia internacional e contratos/DPA dos operadores (especialmente o provider do PostgreSQL).

## Regras Operacionais

- A tabela `associates` é a fonte canônica de campos PII.
- Não logar CPF, SIAPE, endereco, email, telefone, data_nascimento, senha temporaria, cookie, token ou segredo. (Se houver exceção para email em logs de debug, registrar explicitamente aqui com regras de sanitização/truncamento e prazo de retenção rigoroso).
- Nao reutilizar segredos expostos durante investigacoes.
- Tratar storage de documentos como frente separada ate haver provider e DPA definidos.
