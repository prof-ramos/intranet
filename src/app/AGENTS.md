# src/app — Next.js App Router (raiz)

Este diretório é a raiz do App Router. Contém o `layout.tsx` global, `globals.css`, fontes e a página raiz (`page.tsx`) que redireciona para `/app` ou `/login`.

## Convenções

- `layout.tsx` — layout HTML raiz: define `<html>`, fontes Inter + Lora, e o `<body>`. Não adicionar lógica de autenticação aqui.
- `globals.css` — estilos Tailwind base. Não adicionar estilos de componente aqui.
- Subpastas da rota pública (sem autenticação): `login/`, `change-password/`.
- A área autenticada fica inteiramente em `src/app/app/`.

## O que NÃO fazer

- Não criar rotas de API (`route.ts`) neste nível; use Server Actions.
- Não importar `db` diretamente neste nível; toda query fica nas sub-rotas ou em `src/lib/`.
- Não mover `change-password/` para dentro de `app/`; ele precisa ser acessível antes da sessão estar totalmente validada (fluxo `mustChangePassword`).
