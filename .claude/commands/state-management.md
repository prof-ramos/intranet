# State Management

Implement or fix state for: **$ARGUMENTS**

## This project's state hierarchy

1. **Server Component props** — default. Fetch in Server Component, pass as props. No client state needed.
2. **URL search params** — for filters, pagination, sort. Use `src/lib/associates/search-params.ts` as the pattern.
3. **Server Actions + `useActionState`** — for form mutations. See `src/app/app/associados/actions.ts`.
4. **`react-hook-form` + Zod** — for client-side form validation. Always pair with `@hookform/resolvers/zod`.
5. **Context API** — only for UI-only state (modals, sidebar open/close, notification badge).
6. **`useState` / `useReducer`** — only for ephemeral UI state within a single component.

**Do not install or use Redux, Zustand, or Jotai.** This project does not use them.

## Task

1. **Identify the state category**: Which level above fits? Start from level 1 and go down only as far as needed.
2. **Check existing patterns**: Look at `src/lib/associates/search-params.ts` (URL state), `src/app/app/associados/actions.ts` (Server Actions), `src/components/NotificationBell.tsx` (Context).
3. **Implement**: Follow the matched pattern exactly — don't invent new abstractions.
4. **Validate types**: Run `npm run typecheck` before finishing.

## Pattern reference

### URL search params (filters/pagination)
```typescript
// src/lib/<module>/search-params.ts
import { parseSearchParams } from '@/lib/associates/search-params'; // use as reference
```

### Server Action + useActionState
```typescript
// Server Action (src/app/app/<module>/actions.ts)
'use server';
export async function myAction(prevState: unknown, formData: FormData) {
  try {
    const user = await requireAuth();
    // validate with Zod, mutate via repository
    revalidateTag('<cache-tag>');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Client Component
'use client';
const [state, formAction, isPending] = useActionState(myAction, null);
```

### react-hook-form + Zod
```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });
```

### ⚠️ LGPD / PII Safety Rules

- **Nunca armazenar PII em plaintext no client-side**: Não use `localStorage` ou `sessionStorage` para dados como CPF, SIAPE, email, telefone ou endereço.
- **Nunca colocar PII em query strings de URL**: Parâmetros de busca e filtros não devem conter dados pessoais identificáveis.
- **`parseSearchParams` é referência local**: A implementação em `src/lib/associates/search-params.ts` é específica do módulo de associados e não deve ser importada transversalmente por outros módulos.

## Implementation requirements

- Follow project TypeScript conventions (strict mode, no `any`)
- No new state management library installs
- Colocate state as close to consumers as possible
- For loading/error UI: use `role="status"` + `aria-live="polite"` (loading) and `role="alert"` (error)
