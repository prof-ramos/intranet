# Qualidade de Código

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Pontos positivos

- Estrutura simples e fácil de navegar.
- TypeScript usado de ponta a ponta.
- Drizzle fornece tipagem de select/insert.
- `config.ts` de auth tem funções pequenas e testáveis.
- `session.ts` encapsula detalhes de JWT/cookie.
- A página de associados seleciona colunas explicitamente, reduzindo exposição acidental de dados sensíveis.

## Problemas e melhorias

### Comentários de protótipo em código de produção

`src/app/app/page.tsx` começa com comentários como "Drop-in replacement" e "All numbers below are placeholders". Isso é útil durante experimentação, mas não deve permanecer em tela principal de produção.

Recomendação: remover comentários temporários e mover contexto de design para documentação ou issue. Se mocks continuarem, encapsular como fixtures.

### Dados mockados misturados ao componente

Grandes arrays `mockKanban`, `mockAlerts` e `mockRegioes` aumentam o tamanho do arquivo e misturam renderização, dados e narrativa de produto.

Recomendação: mover para fixtures temporárias ou substituir por consultas reais. O componente deve receber dados já normalizados.

### Parsing manual de entrada

`page` e `q` são parseados inline em `src/app/app/associados/page.tsx`. Isso dificulta teste e deixa casos como `page=abc`.

Recomendação: criar `parseAssociatesSearchParams` com validação explícita.

### Tratamento de erro em scripts

`main().catch(console.error)` em scripts registra erro, mas pode não garantir exit code diferente de zero em todos os fluxos.

Recomendação: usar:

```ts
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Nomenclatura do pacote

`package.json` usa `"name": "tmp_app"`. Para um projeto institucional, isso é ruído e pode confundir logs/artefatos.

Recomendação: trocar para algo como `asof-intranet`.

### Inconsistência de aspas

Há arquivos com aspas duplas (`next.config.ts`, `eslint.config.mjs`) e simples na maior parte do código. Existe `.prettierrc`, então isso deve ser resolvido por formatação.

Recomendação: rodar Prettier de forma controlada ou adicionar script `format`.

### Rotas planejadas sem implementação

Sidebar aponta para rotas ainda ausentes. Isso é aceitável durante MVP, mas gera experiência quebrada se clicado.

Recomendação: implementar stubs protegidos ou desabilitar links até existirem.

## Tratamento de erros

Bom:

- Login usa redirecionamento genérico para falha.
- `getSession` retorna `null` para token inválido.
- `getSessionSecret` falha cedo com mensagem clara.

Melhorar:

- Scripts devem falhar com exit code claro.
- Seeds devem validar entrada externa antes de inserir.
- Páginas devem tratar parâmetros inválidos.

## Comentários e documentação inline

Há comentários úteis no `login` explicando o hash dummy e em `Sidebar` sobre preservação da marca. Comentários longos de protótipo no dashboard devem sair quando a tela for estabilizada.

## Organização recomendada

Próximos módulos pequenos:

- `src/lib/auth/authorization.ts`: guards por role.
- `src/lib/associates/queries.ts`: listagem e filtros.
- `src/lib/dashboard/queries.ts`: KPIs e métricas reais.
- `src/lib/validation/search-params.ts`: parsing reutilizável.

Evitar criar muitas camadas antes de haver repetição real; começar pelos pontos críticos de auth, queries compartilhadas e validação.
