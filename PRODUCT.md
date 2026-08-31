# Product

## Register

product

## Users

ASOF staff and leadership use this intranet in an authenticated, operational context: administrators, secretaria, and diretoria. They are managing real institutional records for Oficiais de Chancelaria, including sensitive personal, functional, legal, and financial data. Their work is repetitive, detail-heavy, and audit-sensitive; they need fast scanning, reliable filters, clear status language, and predictable workflows.

## Product Purpose

ASOF Intranet centralizes the operational management of Oficiais de Chancelaria and ASOF association workflows: cadastro, vínculo ASOF, situação funcional, atividades, jurídico, ofícios, notifications, audit, and LGPD operations. Financeiro/mensalidades and email triage remain in the codebase for V2 ([#429](https://github.com/prof-ramos/intranet/issues/429)) but are hidden from the operator UI. Success means the team can trust the system as the canonical operational surface: data is complete, terminology is precise, actions are traceable, and routine administrative work is faster without weakening privacy or governance.

## Brand Personality

Institutional, precise, and calm. The product should feel like a serious administrative tool for a national professional association: formal enough for diplomatic/legal/financial work, but not ceremonious to the point of slowing daily operation. The interface should communicate steadiness, discretion, and competence.

## Anti-references

This should not look like a marketing landing page, generic SaaS dashboard, decorative analytics demo, or consumer social app. Avoid oversized hero treatment inside authenticated workflows, ornamental cards, gratuitous gradients, flashy motion, ambiguous status language, and any visual pattern that makes dense administrative data harder to scan. Avoid using "Associados" as shorthand for the full universe of Oficiais when the screen includes non-associated officials.

## Design Principles

1. Use the domain language exactly: "Oficial de Chancelaria", "Vínculo ASOF", "Situação funcional", "Aposentado", "Data de aposentadoria", and "Data de cancelamento do vínculo ASOF" are not interchangeable.
2. Prioritize scan speed over decoration. Lists, filters, tables, and status chips should be dense but orderly.
3. Make privacy and accountability implicit in the workflow: no exposed secrets, no casual PII treatment, no ambiguous destructive actions.
4. Keep interaction patterns familiar. Standard forms, tables, filters, pagination, and navigation should behave predictably.
5. Responsive behavior must preserve the task. On constrained screens, collapse structure and reduce columns before forcing horizontal document scroll.

## Accessibility & Inclusion

Target accessible, keyboard-operable product UI with clear focus states, sufficient color contrast, readable labels, and touch targets appropriate for tablet/mobile use. The user base includes administrative staff and leadership who may use the system under time pressure and may not be technical specialists; copy should be plain, unambiguous Portuguese. Reduced motion should be respected for any animation.
