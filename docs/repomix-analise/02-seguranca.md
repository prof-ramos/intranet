# Revisão de Segurança

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Resumo

A base tem boas decisões iniciais para autenticação: JWT assinado com `jose`, cookie `httpOnly`, segredo obrigatório com tamanho mínimo e proteção de rota via `proxy.ts`. Os principais riscos estão em autorização granular ainda ausente, seed com senha padrão, ausência de rate limiting, dados LGPD em campos de associados e validação incompleta de entradas.

## Achados

### Alta: seed cria senha padrão previsível

`scripts/seed-admin.ts` usa `INITIAL_ADMIN_PASSWORD || 'admin123'`. Mesmo com `mustChangePassword: true`, uma senha padrão conhecida em banco local ou ambiente compartilhado é uma porta óbvia.

Remediação:

- Remover fallback fixo e exigir `INITIAL_ADMIN_PASSWORD`.
- Validar tamanho/complexidade mínima.
- Falhar o script com mensagem clara quando a variável não existir.
- Evitar imprimir dados além do email administrativo necessário.

### Alta: autorização por role ainda não é fronteira server-side

`src/components/Sidebar.tsx` oculta links para `secretaria`, mas isso não substitui checagem no servidor. O `proxy.ts` só valida sessão e troca obrigatória de senha.

Remediação:

- Criar `requireRole(roles)` em `src/lib/auth`.
- Aplicar em rotas administrativas e Server Actions.
- Registrar tentativas negadas em `audit_logs` quando houver endpoints mutáveis.

### Média: login sem rate limiting ou lockout

`src/app/login/actions.ts` valida credenciais, mas não limita tentativas por IP, usuário ou janela temporal. Em produção, isso permite brute force contra emails administrativos.

Remediação:

- Adicionar rate limiting no fluxo de login.
- Registrar tentativas falhas sem expor se o email existe.
- Considerar lockout temporário ou backoff progressivo para contas administrativas.

### Média: payload de sessão carrega atributos que podem ficar obsoletos

O JWT inclui `role` e `mustChangePassword`, mas `requireAuth` recarrega o usuário do banco e retorna os valores atuais. Isso é bom. Já o `proxy.ts` só lê `isLoggedIn` e `mustChangePassword` do token, sem consultar banco; se uma conta for desativada, o proxy deixa a requisição passar e a página redireciona depois.

Remediação:

- Manter `requireAuth` em todas as páginas protegidas.
- Para rotas/API mutáveis futuras, nunca depender apenas do proxy.
- Considerar versão de sessão ou revogação quando houver exigência operacional.

### Média: dados LGPD exigem allowlist consistente

`associates` contém CPF, SIAPE, telefone, WhatsApp, endereço, data de nascimento e notas internas. A listagem em `src/app/app/associados/page.tsx` seleciona apenas campos de exibição, o que é bom. O risco aparece quando futuras telas/exportações forem adicionadas.

Remediação:

- Criar DTOs por caso de uso.
- Proibir `select()` completo de `associates` em rotas de UI/exportação.
- Redigir logs e erros para nunca incluir CPF, SIAPE, email, endereço ou notas.
- Auditar exportações e downloads.

### Média: validação de query string ainda é manual

`page` é calculado com `Math.max(1, Number(pageParam))`. Para valores como `abc`, o resultado vira `NaN`, gerando offset inválido.

Remediação:

- Validar `searchParams` com Zod ou helper local.
- Limitar tamanho de `q`.
- Normalizar `page` para inteiro positivo e redirecionar ou cair para `1`.

### Baixa: busca LIKE precisa de escape SQL explícito completo

O código escapa `%` e `_`, mas usa `like(associates.fullName, pattern)` sem declarar `ESCAPE`. Dependendo do dialeto/comportamento, a barra invertida pode não agir como escape no SQLite/libSQL.

Remediação:

- Testar comportamento real.
- Se necessário, usar `sql` parametrizado com `ESCAPE '\\'`.
- Considerar busca normalizada ou FTS se a listagem crescer.

## Dependências

Não há evidência no XML de lockfile auditado. As dependências são modernas, mas incluem superfície relevante: Next.js, `jose`, Drizzle/libSQL, `bcryptjs`, Tailwind/DaisyUI. Recomenda-se rodar `npm audit` e revisar advisories antes de deploy.

## Boas práticas observadas

- `SESSION_SECRET` é obrigatório e precisa ter pelo menos 32 caracteres.
- `bcrypt.compare` com hash dummy reduz enumeração por tempo no login.
- Cookie de sessão é `httpOnly`, `sameSite: strict`, `secure` em produção e tem `maxAge`.
- `SKIP_AUTH` é ignorado em produção no `proxy.ts`.
