# src/app/change-password — Troca de senha obrigatória

Rota semi-protegida (`/change-password`). Acessível quando o usuário possui sessão válida mas `mustChangePassword = true`. Após trocar a senha com sucesso, redireciona para `/app`.

## Arquivos

- `page.tsx` — formulário com campos `currentPassword`, `newPassword`, `confirmPassword`.
- `actions.ts` — Server Action `changePassword(formData)`: requer `requireAuth()`, valida a senha atual com bcrypt, aplica `validateNewPassword()` e atualiza `password_hash` + `must_change_password = false`.

## Regras críticas

- A validação de senha forte está em `src/lib/auth/password.ts`: mínimo 12 chars, maiúscula, minúscula, número e símbolo. Nunca contornar essa validação.
- Sempre atualizar `updatedAt` via `sql\`now()\`` no UPDATE.
- Após a troca, chamar `updateSession({ mustChangePassword: false })` para sincronizar o cookie de sessão.
- Não remover a exigência de `currentPassword`; o admin que resetou a senha do usuário gerou uma senha temporária — o usuário precisa confirmá-la antes de definir a nova.
