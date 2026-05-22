# ADR 003: Geração de Ofícios em Memória com Fonte Padrão

## Status

Aceito

## Contexto

A ASOF necessita de um sistema de geração de Ofícios que siga rigorosamente o Manual de Redação da Presidência da República. O sistema deve suportar edição, cancelamento e visualização histórica, com alta performance e baixo consumo de recursos no servidor.

## Decisão

Adotamos a geração de arquivos PDF de forma **puramente dinâmica (on-the-fly)** utilizando a biblioteca `pdf-lib` no lado do servidor (Node.js).

Principais pontos da decisão:

1. **Uso de StandardFonts (Helvetica)**: Confirmado via documentação da `pdf-lib` (/websites/pdf-lib_js), utilizaremos a enumeração `StandardFonts.Helvetica`. Estas fontes fazem parte da especificação base do PDF (Standard 14 Fonts), o que significa que:
   - Não requerem o carregamento de arquivos externos (`.ttf` ou `.otf`).
   - Não aumentam o tamanho final do arquivo binário, pois não precisam ser "incorporadas" (embedded).
   - Garantem renderização instantânea e baixo consumo de memória no servidor.
2. **Estado**: O PDF não será armazenado fisicamente em disco ou storage. Ele será reconstruído a partir dos dados do banco de dados a cada requisição de download via `NextResponse`, garantindo que o documento sempre reflita a última versão editada sem riscos de dessincronização.
3. **Conformidade**: As margens e recuos serão implementados via código (precisão em pontos) seguindo as medidas do manual (3cm esquerda, 1.5cm direita).

## Consequências

- **Positivas**: Arquitetura mais simples e resiliente; deploy facilitado; consistência garantida entre banco e documento.
- **Negativas**: Leve aumento no processamento da CPU no momento do download (insignificante para o volume esperado da ASOF).
