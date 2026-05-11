# src/app/app/juridico — Módulo Jurídico

Gestão de instrumentos jurídicos da ASOF: processos, consultas e pareceres. Rota base: `/app/juridico`. Acesso restrito a `admin` e `diretoria`.

## Sub-rotas

| Rota | Conteúdo |
|---|---|
| `/app/juridico` | Dashboard com resumo de processos e consultas abertas |
| `/app/juridico/consultas` | Listagem de consultas jurídicas com filtro por status |
| `/app/juridico/consultas/nova` | Formulário de abertura de nova consulta |
| `/app/juridico/consultas/[id]` | Detalhe da consulta com histórico e pareceres |

## Schemas relevantes

- `legal_consultations` — consultas com `status`: `open | in_progress | closed`
- `legal_processes` — processos com número, partes, tribunal e status
- `legal_opinions` — pareceres vinculados a uma consulta
- `legal_notes` — anotações internas (não exibir para `secretaria`)

## Regras

- `layout.tsx` deste módulo aplica `requireRole(['admin', 'diretoria'])`; todas as sub-rotas herdam.
- `actions.ts` na raiz do módulo contém as Server Actions compartilhadas entre sub-rotas (`updateConsultaStatus`, `addParecer`, etc.).
- Nunca expor dados de partes (CPF, nome de terceiros) em listagens; exibir apenas número do processo e assunto.
- Mutations registram em `audit_logs` com `entity_type = 'legal_consultation'` ou `'legal_process'`.
