# src/lib/validation — Schemas Zod

Schemas de validação compartilhados entre Server Actions. Todos os inputs de formulário devem ser validados com Zod antes de qualquer operação no banco.

## Arquivo principal: `schemas.ts`

Contém schemas para:
- `loginSchema` — e-mail + senha
- `changePasswordSchema` — `currentPassword`, `newPassword`, `confirmPassword`
- Schemas de associados (criar/editar)
- Schemas de atividades
- Schemas de consultas jurídicas

## Regras

- Sempre usar `schema.safeParse()` em Server Actions — nunca `schema.parse()` (lança exceção não tratada).
- Extrair o primeiro erro com `parsed.error.issues[0]?.message` para exibição ao usuário.
- Não duplicar regras de validação: se a lógica é complexa (ex: força de senha), delegar para funções em `src/lib/auth/password.ts`; o schema Zod faz só a validação estrutural (tipo, presença).
- Todo novo schema deve ter teste correspondente em `schemas.test.ts`.
