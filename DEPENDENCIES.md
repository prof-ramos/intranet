# Dependencias

Atualizado em 2026-05-26 apos reset da camada de banco/autenticacao.

## Stack Mantido

- Next.js 16, React 19 e TypeScript.
- Drizzle ORM + `postgres` para PostgreSQL.
- `bcryptjs` para hashes de senha administrativa.
- `@google/genai` para analise de triagem de e-mails com Gemini.
- `mailparser` para parsing estruturado de remetentes de e-mail.
- `@novu/react` para inbox de notificacoes quando configurado.
- Tiptap para editor rico de oficios.
- Mailjet via helper interno de email.
- Playwright/Vitest/ESLint/Prettier para validacao.

## Dependencias Removidas Nesta Frente

- SDKs de plataforma externa para auth, entrega em tempo real e storage.
- WebSocket dedicado ao smoke de entrega em tempo real.

O go-live nao depende de auth externo, entrega em tempo real externa nem storage externo. Storage de objetos privado sera escolhido em frente separada se Documentos for obrigatorio. A implementação final de storage físico deverá ser acompanhada de uma decisão formal de adoção.

## Comandos De Saude

```bash
npm audit
npm run typecheck
npm run lint
npm run test
npm run build
```

Use `npm run test:db` quando `DATABASE_URL` apontar para um PostgreSQL migrado pelo baseline atual.
