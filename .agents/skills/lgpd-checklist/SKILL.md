---
name: lgpd-checklist
description: Create LGPD-ready operational checklists, audit checklists, release reviews, privacy-by-design reviews, or third-party evidence requests with explicit legal basis. Use when the user asks for LGPD compliance, privacy checklist, ROPA/inventory, cookies/consent, data minimization, data subject rights, retention, security, incident response, vendors, international transfers, or wants columns such as Item, Evidence, Legal basis, Status, and Risk.
---

# LGPD Checklist

## Purpose

Build practical LGPD-ready checklists with article-level legal grounding. Prefer operational evidence over generic compliance prose.

This skill is not legal advice. Use it to structure engineering, audit, governance, and vendor-review artifacts; advise legal review for final legal positions.

## Workflow

1. Identify scope: feature, repo, product area, vendor, audit, release, or organizational process.
2. Classify the treatment: data categories, titulares, controlador/operador, finalidade, base legal, sharing, retention, and security controls.
3. Load `references/base-legal.md` when citing LGPD/ANPD provisions or building a full checklist.
4. Produce checklist items with explicit evidence requests and legal basis.
5. Flag uncertainty instead of overstating compliance. If a legal citation is not certain, mark it as "verificar com jurídico" and cite the nearest likely article.
6. Prefer official/current sources when the user asks for legally current output; verify against Planalto and ANPD before presenting final legal claims.

## Output Patterns

For operational checklists, use this table:

| Item | Evidencia esperada | Base legal | Status | Risco |
|---|---|---|---|---|
| Descrever a verificacao concreta | Arquivo, tela, log sanitizado, contrato, politica, query, ticket ou decisao | LGPD, art. X; norma ANPD quando aplicavel | Pendente/Parcial/Conforme/Nao aplicavel | Baixo/Medio/Alto + motivo |

For audit summaries, use:

- **Escopo:** what was reviewed and what was out of scope.
- **Achados:** ordered by risk, each with evidence and legal basis.
- **Lacunas:** missing documents, missing proof, or facts needing owner confirmation.
- **Proximas acoes:** concrete remediation tasks with owners when known.

For repo/product reviews, map checklist items to concrete artifacts:

- Code: routes, server actions, schemas, models, logs, env vars, permissions, tests.
- Docs: privacy policy, runbook, incident process, retention schedule, vendor list.
- Operations: access reviews, backup/restore, incident drills, DSR workflow, consent records.

## Checklist Domains

Cover only domains relevant to the request:

- Inventario/ROPA and records of processing.
- Base legal and finalidade.
- Transparencia and privacy notices.
- Consentimento, cookies, and proof/revocation.
- Minimizacao, anonymization, pseudonymization, and logging.
- Dados sensiveis and children/adolescents.
- Seguranca, access control, secrets, backups, and incident response.
- Direitos do titular and response workflow.
- Retencao and secure disposal.
- Terceiros, operadores, subprocessadores, and international transfer.
- Governanca, accountability, audit evidence, and periodic review.

## Style

- Write in Portuguese when the user writes in Portuguese.
- Cite legal bases inline: `[LGPD, art. 6º, III]`, `[LGPD, arts. 7º e 11]`, `[Resolucao CD/ANPD nº 2/2022, art. 9º]`.
- Do not cite non-official blogs as legal authority. Use them only as secondary reading if the user explicitly asks.
- Do not expose secrets, tokens, CPF, SIAPE, emails, or raw provider responses in evidence examples.
