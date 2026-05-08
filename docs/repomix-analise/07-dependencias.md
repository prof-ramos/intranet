# Análise de Dependências

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Dependências principais

`package.json` indica:

- `next`: `16.2.6`
- `react`: `^19.2.6`
- `react-dom`: `^19.2.6`
- `drizzle-orm`: `^0.45.2`
- `@libsql/client`: `^0.15.11`
- `jose`: `^6.2.3`
- `bcryptjs`: `^3.0.3`
- `zod`: `^4.4.3`
- `tailwindcss`: `^4`
- `daisyui`: `^5.5.19`
- `lucide-react`: `^1.14.0`

Dev dependencies relevantes:

- `drizzle-kit`: `^0.31.10`
- `vitest`: `^4.1.5`
- `typescript`: `^6`
- `eslint`: `^9`
- `eslint-config-next`: `16.2.6`
- `prettier`: `^3.8.3`

## Observações

### Next.js e React

O projeto usa versões muito recentes. Isso combina com a nota institucional de que "este não é o Next.js conhecido" e exige consulta aos docs locais/Context7 antes de mexer em APIs de roteamento, proxy, server actions, cookies ou build.

Ponto positivo: `proxy.ts` já usa a nomenclatura atual do Next.js 16.

Risco: dependências em versões de ponta podem ter mudanças rápidas; manter `next` e `eslint-config-next` travados na mesma versão é correto.

### Drizzle/libSQL

Uso está alinhado com schema TypeScript e migrações geradas. O projeto deve expandir índices e relações conforme consultas reais forem surgindo.

Risco: scripts de seed fazem casts diretos de dados externos. Para importação recorrente, adicionar validação com Zod antes de inserir.

### `bcryptjs`

É simples e portátil, mas puro JS. Para volume baixo de login administrativo, é aceitável. Se houver exigência de performance/segurança mais forte, avaliar implementação nativa compatível com o ambiente de deploy.

### `zod`

Está instalado, mas pouco usado no código analisado. Há oportunidade clara de usá-lo em:

- validação de login;
- parsing de `searchParams`;
- seed/importação de associados;
- payloads futuros de atividades/admins.

### Tailwind/DaisyUI

A configuração usa Tailwind 4 com plugin DaisyUI no CSS. Isso está coerente com versões modernas, mas muda padrões de versões antigas. Alterações em tema e PostCSS devem ser validadas com build.

## Vulnerabilidades conhecidas

O XML não inclui resultado de `npm audit`. Portanto, não é possível afirmar ausência de vulnerabilidades. Recomendações:

```bash
npm audit
npm outdated
```

Avaliar advisories antes de deploy.

## Recomendações de upgrade

- Manter `next` e `eslint-config-next` sincronizados exatamente.
- Evitar upgrades automáticos amplos enquanto o projeto usa Next 16/React 19 recentes.
- Rodar `npm outdated` mensalmente e priorizar pacotes de segurança (`next`, `jose`, `@libsql/client`, `drizzle-orm`, `bcryptjs`).
- Não trocar gerenciador de pacotes sem decisão explícita.

## Pacotes alternativos

Não há necessidade imediata de substituição. Possíveis avaliações futuras:

- `bcrypt`/`argon2`: se o ambiente suportar nativo e houver exigência de hashing mais robusto.
- Playwright: para testes E2E de login e navegação autenticada.
- SQLite FTS/libSQL search: para busca eficiente em associados.

## Padrões de uso

Boas práticas:

- Drizzle com schemas centralizados.
- `jose` encapsulado em `session.ts`.
- imports nomeados de `lucide-react` e otimização no Next config.

Melhorias:

- Usar Zod onde já há entrada externa.
- Adicionar scripts `audit` e talvez `typecheck`.
- Documentar política de atualização de dependências.
