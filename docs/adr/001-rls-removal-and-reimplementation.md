# ADR 001: RLS Fora Do Gate Do Primeiro Go-Live

Status: accepted, revised 2026-05-26

## Contexto

O projeto já alternou entre RLS permissiva, remoção de RLS e politicas mais restritivas. Essa história ficou acoplada a uma tentativa de usar recursos de plataforma externos no caminho crítico.

Para a estreia, a aplicacao volta a um modelo mais simples: Next.js server-side, Drizzle, PostgreSQL gerenciado e credenciais de banco nao expostas ao browser.

## Decisao

RLS não é requisito bloqueante do primeiro go-live.

A fronteira de seguranca do dia 1 (Application-Layer Controls) e:

- app server protegido (middlewares para rotas restritas);
- `requireAuth()` e `requireRole()` aplicados em toda Server Action / Route Handler;
- cookie `httpOnly` assinado gerindo sessoes;
- usuario PostgreSQL de runtime com privilegios restritos;
- logs com redacao LGPD;
- criptografia/mascaramento ja existentes para dados sensiveis;
- filtragem explícita de ownership (ex: `eq(table.userId, currentUserId)`) em todas as queries para dados pessoais.

## Consequencias

- O baseline limpo nao cria roles/policies/publications de plataforma.
- Testes de banco nao exigem `relrowsecurity` nem `pg_policies`.
- RLS pode voltar depois como hardening, usando contexto de sessao da aplicacao. O contexto será derivado do cookie de sessão assinado: os valores `user_id` e `role` são extraídos no momento da autenticação e propagados para a sessão do DB com `SET LOCAL app.user_id` e `SET LOCAL app.role` durante a transação, assegurando que as políticas de RLS leiam essas variáveis de sessão `app.*`.
- A exigência de filtragem explícita de ownership deve ser validada mecanicamente por meio de checklists de code-review e uma regra de lint/análise estática (ou CI) para garantir a presença dos filtros em queries que acessam dados pessoais.
- Qualquer decisao futura de expor cliente direto ao banco ou Data API ao browser reabre este ADR antes de deploy.
