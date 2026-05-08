# Cobertura de Testes

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Estado atual

Vitest está configurado para `src/**/*.test.{ts,tsx}` em ambiente Node. Existem dois conjuntos visíveis:

- `src/smoke.test.ts`: valida que Vitest executa.
- `src/lib/auth/config.test.ts`: cobre leitura do usuário de desenvolvimento, defaults e role inválida.

A cobertura é inicial e insuficiente para a superfície crítica do app.

## Componentes sem testes

- `src/app/login/actions.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/require-auth.ts`
- `proxy.ts`
- `src/app/app/associados/page.tsx`
- `src/app/app/page.tsx`
- scripts de seed
- schemas e migrações
- componentes de navegação (`Sidebar`, `NavLink`, `LogoutButton`)

## Testes recomendados

### Autenticação

Casos:

- Login com email inexistente deve redirecionar sem revelar usuário.
- Login com senha inválida deve redirecionar para erro.
- Login com admin inativo deve falhar.
- Login válido deve chamar `createSession` com payload esperado.
- Hash dummy deve ser usado quando usuário não existe.

### Sessão

Casos:

- `createSession` define cookie com `httpOnly`, `sameSite`, `path`, `maxAge`.
- `secure` é verdadeiro em produção.
- `getSession` retorna `null` para token ausente ou inválido.
- `destroySession` remove cookie.
- `updateSession` preserva campos existentes.

### Proxy

Casos:

- Sem token em `/app` redireciona para `/login`.
- Token inválido redireciona.
- Token válido permite `NextResponse.next()`.
- `mustChangePassword=true` redireciona para `/change-password`.
- `SKIP_AUTH=true` só passa fora de produção.

### Listagem de associados

Casos:

- `page` ausente vira página 1.
- `page` inválido não gera offset `NaN`.
- `q` escapa caracteres especiais ou é parametrizado corretamente.
- Query seleciona apenas campos permitidos.
- Resultado vazio exibe estado vazio.

### Banco e seed

Casos:

- Seed admin falha sem senha explícita, após ajuste recomendado.
- Seed de associados valida campos mínimos.
- Migração cria índices esperados.

### Componentes

Casos:

- `Sidebar` não renderiza links administrativos para `secretaria`.
- `NavLink` marca rota ativa corretamente.
- `LogoutButton` abre modal e submete action.

Para componentes React, considerar ambiente `jsdom` ou projeto separado de testes de browser no Vitest.

## Estratégia recomendada

1. Aumentar cobertura de auth antes de expandir funcionalidades.
2. Criar helpers puros para parsing de query string e testá-los sem renderizar páginas.
3. Introduzir testes de integração com banco temporário para queries Drizzle.
4. Adicionar E2E mínimo com Playwright quando login real e rotas principais estabilizarem.
5. Incluir coverage no CI após a base de testes não ser apenas smoke.

## Métricas iniciais

- 100% dos helpers de auth com testes unitários.
- 100% das Server Actions críticas com testes de fluxo.
- Pelo menos um teste de integração para cada consulta de dashboard/listagem.
- Pelo menos um E2E cobrindo login, dashboard e listagem de associados.
