# Etiquetas Pimaco ASOF

Gera PDFs A4 server-side com `pdf-lib` para etiquetas de associados.

## Templates suportados

- Pimaco 6182: 2 colunas x 8 linhas.
- Pimaco 3080: 2 colunas x 7 linhas.
- Pimaco A4256: 3 colunas x 11 linhas.

As medidas estão centralizadas em `templates.ts` e podem precisar de calibração fina por impressora usando `offsetXmm` e `offsetYmm`.

## Modos

- `postal`: nome, endereço, bairro, cidade/UF e CEP.
- `mala_diplomatica`: nome e posto/lotação.
- `custom`: campos escolhidos pela administração.

Flags opcionais: `P.E.O.` e `PODE SER ABERTO PELA ECT`.

## Impressão

Imprimir em folha A4, escala 100%, sem "ajustar à página". Use `debug` para desenhar bordas de teste, `startPosition` para reaproveitar folhas parcialmente usadas e offsets para calibração.

## Referências consultadas

Context7 não estava disponível na sessão. Foram usadas fontes oficiais: pdf-lib para metadados, páginas, fontes e medição de texto; Next.js App Router para Route Handlers; Zod para schemas/enums/arrays; Vitest para testes assíncronos.
