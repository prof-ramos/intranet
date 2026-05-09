# Diagnostico do travamento ao rodar `npm run dev`

Data: 2026-05-08
Projeto: `ASOF/intranet`

## Resumo

O travamento observado ao rodar a intranet foi reproduzido no caminho original com Next.js 16.2.6 usando Turbopack. A evidencia mais forte aponta para uma combinacao de Next/Turbopack com Tailwind/PostCSS neste projeto, e nao para uma falha global do Node isoladamente.

A mitigacao aplicada foi trocar o caminho padrao de desenvolvimento e build para Webpack:

- `npm run dev` agora executa `next dev --webpack`.
- `npm run build` agora executa `next build --webpack`.
- Turbopack continua disponivel apenas em scripts explicitos: `npm run dev:turbo` e `npm run build:turbo`.

Com Webpack, o app rodou por 60 segundos com encerramento controlado, respondeu HTTP 200 repetidas vezes e nao deixou processos residuais.

## Sintomas observados

- Ao rodar a intranet com o fluxo original, o Mac travou ao ponto de reiniciar.
- O log da aplicacao original (`next-dev-60s.log`) mostra Next.js 16.2.6 com Turbopack.
- O mesmo log mostra varias mensagens de `MallocStackLogging` em processos Node.
- O erro principal repetido foi:

```text
Error: Can't resolve 'tailwindcss' in '<workspace>/ASOF'
```

O detalhe importante e que o resolvedor procurou `tailwindcss` fora do projeto real:

```text
resolve 'tailwindcss' in '<workspace>/ASOF'
using description file: <home>/package.json
<workspace>/ASOF/node_modules doesn't exist
<workspace-parent>/node_modules doesn't exist
<home>/node_modules/tailwindcss doesn't exist
```

Isso indica um problema de resolucao/root no pipeline de CSS, nao apenas uma dependencia ausente dentro de `<workspace>/ASOF/intranet`.

## Logs do macOS

Durante a tentativa que travou, os logs da maquina mostraram sinais de pressao de sistema:

- eventos `memorystatus: killing`;
- eventos `WindowServer timed out fence`;
- eventos de latencia;
- reinicio da maquina por volta de 2026-05-08 12:02.

Esses sinais batem com travamento por pressao/estouro de trabalho no ambiente grafico e de memoria. Eles nao apareceram da mesma forma no teste corrigido com Webpack.

## Comparacao com outro projeto

Foi testado tambem o projeto:

```text
<workspace>/proframos/ai-wiki-br
```

Resultado:

- rodou por 60 segundos com wrapper;
- respondeu HTTP 200;
- nao travou a maquina.

Esse teste enfraquece a hipotese de que qualquer `npm run dev` esteja quebrado globalmente neste momento. O problema ficou concentrado na combinacao especifica da intranet com Next 16/Turbopack/Tailwind/PostCSS.

## Achados de performance avaliados

Foi revisado o relatorio de performance enviado durante a investigacao.

Achados que ja estavam resolvidos no codigo atual:

- fontes italicas grandes ja tinham sido removidas de `src/app/layout.tsx`;
- `requireAuth()` ja estava protegido com `cache()` em `src/lib/auth/require-auth.ts`;
- pragmas principais do SQLite ja estavam presentes em `src/lib/db/index.ts`.

Achados que eram validos, mas nao explicavam sozinhos o travamento total:

- autenticacao redundante e queries duplicadas poderiam aumentar latencia, mas nao justificam congelamento do sistema inteiro no startup;
- fontes grandes poderiam piorar build/primeira compilacao, mas nao eram o gatilho principal observado nos logs;
- pragmas SQLite impactam throughput de banco, mas nao explicam o erro de resolucao de `tailwindcss`;
- imports barrel do `lucide-react` podem piorar tempo de bundling, mas sao secundarios diante do erro Turbopack/PostCSS.

Achado aplicado:

- `SESSION_SECRET` em `src/lib/auth/session.ts` foi alterado para inicializacao lazy. Isso evita crash em import/module load quando o segredo nao esta definido.

## Mudancas aplicadas

### `package.json`

Antes:

```json
"dev": "next dev",
"build": "next build"
```

Depois:

```json
"dev": "next dev --webpack",
"dev:turbo": "next dev --turbopack",
"build": "next build --webpack",
"build:turbo": "next build --turbopack"
```

Motivo: Next 16 usa Turbopack por padrao. Como o travamento foi observado nesse caminho, Webpack passou a ser o caminho seguro para desenvolvimento e build local.

### `next.config.ts`

Mudancas:

- `turbopack.root` passou a usar path absoluto;
- `@libsql/client` foi marcado em `serverExternalPackages`;
- `lucide-react` foi incluido em `experimental.optimizePackageImports`.

Motivo: reduzir ambiguidade de root quando Turbopack for usado explicitamente e manter imports/bundling mais previsiveis.

### `src/lib/auth/session.ts`

Mudanca:

- `SESSION_SECRET` deixou de ser validado no topo do modulo;
- a validacao agora ocorre somente quando o segredo e realmente usado para assinar/verificar JWT.

Motivo: evitar crash de inicializacao em cenarios de build/import sem `.env` completo.

### `scripts/run-dev-60s.sh`

O script foi endurecido para testes seguros:

- `set -euo pipefail`;
- validacao de `DURATION_SECONDS`, `PORT`, `HOST` e `LOG_FILE`;
- verificacao previa de `node`, `npm` e `curl`;
- encerramento recursivo da arvore de processos;
- `curl` com timeout curto;
- filtro de processos remanescentes mais especifico;
- passagem explicita de `-H "$host"` ao `next dev`.

Motivo: permitir testar o servidor com encerramento automatico sem deixar processos pendurados.

## Validacoes executadas

### Lint

```bash
npm run lint
```

Resultado: passou.

### Build

```bash
npm run build
```

Resultado:

```text
next build --webpack
Compiled successfully
Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /app
```

### Teste controlado de 60 segundos

Comando:

```bash
DURATION_SECONDS=60 PORT=3010 LOG_FILE=next-dev-webpack-60s.log scripts/run-dev-60s.sh
```

Resultado:

```text
Next.js 16.2.6 (webpack)
Ready in 221ms
GET / 200
GET / 200
GET / 200
Remaining matching processes: none
```

O servidor respondeu HTTP 200 em todos os snapshots e foi encerrado corretamente.

### Server live

Comando efetivo:

```bash
npm run dev -- -p 3000 -H 127.0.0.1
```

Resultado:

```text
Next.js 16.2.6 (webpack)
Local: http://127.0.0.1:3000
Ready in 241ms
```

Verificacao:

```bash
curl -I http://127.0.0.1:3000/
```

Resultado:

```text
HTTP/1.1 200 OK
```

## Conclusao

O servidor da intranet roda sem travar quando usa Webpack. O caminho inseguro neste momento e Turbopack, especialmente acionando Tailwind/PostCSS no projeto.

Recomendacao operacional:

- usar `npm run dev` normalmente;
- evitar `npm run dev:turbo` ate haver uma investigacao especifica do root/resolution do Tailwind com Turbopack;
- manter `scripts/run-dev-60s.sh` como forma segura de reproduzir e validar mudancas de runtime;
- se o travamento voltar, coletar primeiro:
  - `next-dev-*.log`;
  - `log show` filtrando `memorystatus`, `WindowServer timed out fence` e `node`;
  - lista de processos `next dev`, `next-server`, `postcss.js` e `node`.

## Estado pendente

- Existem logs diagnosticos no diretorio do projeto:
  - `next-dev-60s.log`;
  - `next-dev-webpack-20s.log`;
  - `next-dev-webpack-60s.log`;
  - `next-dev-live.log`.
- `repomix-output.xml` tambem aparece como arquivo nao rastreado.
- Ha alteracoes de codigo que ja existiam ou foram feitas em paralelo em:
  - `src/app/layout.tsx`;
  - `src/lib/auth/require-auth.ts`;
  - `src/lib/db/index.ts`;
  - `package-lock.json`.

Esses arquivos nao devem ser revertidos automaticamente sem uma decisao explicita, porque podem conter trabalho valido feito durante a investigacao.
