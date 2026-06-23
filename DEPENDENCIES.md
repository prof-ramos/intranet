# Dependencias

Atualizado em 2026-06-14. Inclui mudancas pos-go-live: refatoracao de atividades, mensalidades bulk upsert, validacao de server actions, error boundaries, Assinafy.

## Stack Mantido

### Runtime

- **Next.js 16.2.6** (App Router) com React 19 e TypeScript 6.
- **Drizzle ORM** (`drizzle-orm` 0.45+) + `postgres` para PostgreSQL.
- **DaisyUI 5** + **Tailwind CSS 4** para UI e design system.
- **Tiptap** (`@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, extensões `text-align` e `text-style`) para editor rico de oficios.
- **pdf-lib** + `@pdf-lib/fontkit` para geracao de PDF Carlito/ABNT.
- **react-hook-form** + `@hookform/resolvers` + **Zod 4** para validacao de formularios e schemas.
- **@hello-pangea/dnd** para drag-and-drop no Kanban de atividades.
- **lucide-react** para icones.
- **bcryptjs** para hashes de senha administrativa.
- **@google/genai** para analise de triagem de e-mails com Gemini.
- **mailparser** para parsing estruturado de remetentes de e-mail.
- **server-only** para garantir execucao server-side.
- **zod** v4 para validacao de schemas compartilhados (server actions, API, forms).

### Desenvolvimento

- **Vitest** (`vitest` 4.1+) + `@vitest/coverage-v8` para testes unitarios e cobertura.
- **Playwright** (`@playwright/test` 1.60+) para testes E2E.
- **Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`) para testes de componentes.
- **ESLint 9** + `eslint-config-next` + `eslint-config-prettier` para linting.
- **Prettier** + `prettier-plugin-tailwindcss` para formatacao.
- **Drizzle Kit** (`drizzle-kit` 0.31+) para geracao e aplicacao de migrations.
- **@next/bundle-analyzer** para analise de bundle.
- **tsx** para scripts operacionais (seed, guardrails).
- **jsdom** para ambiente de testes DOM.

## Dependencias Removidas Nesta Frente

- SDKs de plataforma externa para auth, entrega em tempo real e storage.
- WebSocket dedicado ao smoke de entrega em tempo real.

O go-live nao depende de auth externo, entrega em tempo real externa nem storage externo. Storage de objetos privado sera escolhido em frente separada se Documentos for obrigatorio. A implementacao final de storage fisico devera ser acompanhada de uma decisao formal de adocao.

## Vulnerabilidades Conhecidas (2026-06-23)

Uma vulnerabilidade transitiva esta presente e nao possui fix sem breaking change:

- **esbuild** (low): afeta `drizzle-kit` e `tsx` (dev dependencies). Nao afeta producao.

`npm audit fix --force` propoe downgrade de `drizzle-kit` para 0.19 (breaking), portanto nao deve ser aplicado. Monitorar advisories e aplicar quando patches estiverem disponiveis.

A cadeia `ws`/`socket.io-client`/`engine.io-client` (antes transitiva via `@novu/react`) foi **eliminada** com a remocao da dependencia em 2026-06-23 (5 CVEs resolvidas).

## Comandos De Saude

```bash
npm audit              # verificar vulnerabilidades
npm run typecheck      # TypeScript sem emitir
npm run lint           # ESLint
npm run test           # Vitest (unitarios)
npm run build          # Next.js build (Webpack)
npm run validate:quick # lint + typecheck + testes unitarios
npm run validate:full  # quick + test:db + test:integration + build
npm run pr:check       # gate completo de PR
```

Use `npm run test:db` quando `DATABASE_URL` apontar para um PostgreSQL migrado pelo baseline atual.