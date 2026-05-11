# src/app/app — Área autenticada

Todo conteúdo sob `/app/*` requer autenticação válida. O `layout.tsx` deste diretório aplica `requireAuth()` globalmente e renderiza a `Navbar` e o `Sidebar`.

## Estrutura de sub-rotas

| Rota | Diretório | Acesso mínimo |
|---|---|---|
| `/app` | `page.tsx` | Qualquer role |
| `/app/associados` | `associados/` | `admin`, `diretoria`, `secretaria` |
| `/app/atividades` | `atividades/` | Qualquer role |
| `/app/juridico` | `juridico/` | `admin`, `diretoria` |
| `/app/auditoria` | `auditoria/` | `admin` |
| `/app/config` | `config/` | `admin` |
| `/app/usuarios` | `usuarios/` | `admin` |

## Convenções

- Cada sub-rota chama `requireRole([...])` ou `requireAuth()` no topo do Server Component raiz.
- Server Actions ficam em `actions.ts` dentro da sub-rota correspondente, nunca em arquivos compartilhados de rota.
- Client Components que precisam de estado interativo usam `useActionState` com a Server Action — não `fetch` manual.
- Prefixar com `_` diretórios de componentes privados de rota (ex: `_board/`, `_dashboard/`) para excluí-los do roteamento.
- Arquivos `error.tsx` e `loading.tsx` são obrigatórios em rotas com queries assíncronas pesadas.

## O que NÃO fazer

- Não colocar queries de banco direto em `layout.tsx`; use Server Components nas `page.tsx` de cada sub-rota.
- Não duplicar lógica de autorização; sempre usar `requireRole` de `src/lib/auth/authorization.ts`.
