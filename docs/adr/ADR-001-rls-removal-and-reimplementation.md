# ADR 001: RLS Fora Do Gate Do Primeiro Go-Live

Status: accepted, revised 2026-05-26

## Contexto

O projeto ja alternou entre RLS permissiva, remocao de RLS e politicas mais restritivas. Essa historia ficou acoplada a uma tentativa de usar recursos de plataforma externos no caminho critico.

Para a estreia, a aplicacao volta a um modelo mais simples: Next.js server-side, Drizzle, PostgreSQL gerenciado e credenciais de banco nao expostas ao browser.

## Decisao

RLS nao e requisito bloqueante do primeiro go-live.

A fronteira de seguranca do dia 1 e:

- app server;
- `requireAuth()` e `requireRole()`;
- cookie `httpOnly` assinado;
- usuario PostgreSQL de runtime com privilegios restritos;
- logs com redacao LGPD;
- criptografia/mascaramento ja existentes para dados sensiveis.

## Consequencias

- O baseline limpo nao cria roles/policies/publications de plataforma.
- Testes de banco nao exigem `relrowsecurity` nem `pg_policies`.
- RLS pode voltar depois como hardening, usando contexto de sessao da aplicacao, por exemplo `SET LOCAL app.user_id` e `SET LOCAL app.role`.
- Qualquer decisao futura de expor cliente direto ao banco ou Data API ao browser reabre este ADR antes de deploy.
