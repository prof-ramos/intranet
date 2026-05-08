# Documentação de API e Interfaces Públicas

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Observação

O XML não mostra Route Handlers REST (`route.ts`). As interfaces públicas atuais são rotas App Router, formulários com Server Actions e scripts npm.

## Rotas web

### `GET /`

Redireciona para `/app` via `redirect('/app')` em `src/app/page.tsx`.

### `GET /login`

Renderiza a tela de login. Aceita query string `error=1` para exibir estado de erro. Quando o formulário é enviado, chama a Server Action `login`.

Campos esperados:

- `email`: string
- `password`: string

Falhas redirecionam para `/login?error=1`.

Sucesso cria cookie de sessão e redireciona para `/app`.

### `GET /app`

Página autenticada do dashboard. Requer sessão válida por `proxy.ts` e `requireAuth()`.

Dados reais exibidos:

- Total de associados ativos.
- Total com contribuição em `pendente_migracao`.
- Total de atividades em aberto.
- Total de atividades atrasadas.

Dados ainda mockados:

- Kanban de atividades.
- Alertas.
- Distribuição regional.
- Percentual de contribuições em dia.

### `GET /app/associados`

Página autenticada de listagem de associados ativos.

Query params:

- `q`: busca por nome.
- `page`: página numérica, padrão `1`.

Resposta visual:

- Tabela com nome, lotação, padrão/classe, email e situação funcional.
- Paginação anterior/próxima.

Observações:

- A página seleciona uma allowlist de campos e não expõe CPF, SIAPE, telefone, endereço ou notas internas.
- O botão de exportação existe visualmente, mas não há endpoint de exportação no XML.

### `GET /change-password`

O `proxy.ts` referencia `/change-password` quando `mustChangePassword` é verdadeiro. O XML não mostra implementação da rota. Hoje isso é uma lacuna funcional.

## Server Actions

### `login(formData: FormData)`

Arquivo: `src/app/login/actions.ts`.

Entrada:

- `email`
- `password`

Fluxo:

1. Busca admin por email.
2. Executa `bcrypt.compare` contra hash real ou dummy.
3. Rejeita usuário inexistente, inativo ou senha inválida.
4. Cria sessão JWT com `createSession`.
5. Redireciona para `/app`.

Erros conhecidos:

- Campos ausentes ou credenciais inválidas redirecionam para `/login?error=1`.

### `logout()`

Arquivo: `src/lib/auth/actions.ts`.

Fluxo:

1. Remove o cookie de sessão com `destroySession`.
2. Redireciona para `/login`.

## Sessão

Cookie:

- Nome: `asof-session`
- `httpOnly: true`
- `sameSite: strict`
- `secure: true` em produção
- Duração: 7 dias

Payload:

- `userId`
- `name`
- `email`
- `role`
- `mustChangePassword`
- `isLoggedIn`

## Scripts operacionais

### `npm run db:seed`

Executa:

```bash
tsx scripts/seed-associados.ts && tsx scripts/seed-admin.ts
```

Variáveis relevantes:

- `SEED_SOURCE_DB`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

### `npm run db:migrate`

Executa Drizzle Kit com `drizzle.config.ts`.

### `scripts/run-dev-60s.sh`

Wrapper diagnóstico para `npm run dev`, com amostragem de processo, curl local, log em `next-dev-60s.log` e encerramento do processo ao final.

## Limitações atuais

- Não há API REST documentada porque não há `route.ts` no pacote analisado.
- Não há endpoint real de exportação de associados.
- Rotas apontadas pela sidebar ainda não aparecem implementadas no XML.
- `/change-password` é exigida pelo proxy, mas não aparece implementada.
