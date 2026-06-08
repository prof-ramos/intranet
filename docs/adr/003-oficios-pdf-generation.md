# ADR 003: Geração de Ofícios em Memória com Fontes ABNT

## Status

Aceito / Revisado (Junho 2026)

## Contexto

A ASOF necessita de um sistema de geração de Ofícios que siga rigorosamente o Manual de Redação da Presidência da República (MRPR). O sistema suporta edição, cancelamento e visualização histórica. Inicialmente, utilizamos fontes padrão do PDF (Helvetica) para evitar carregamento de arquivos externos. No entanto, a integração com a plataforma de assinaturas (Assinafy) quebrou a renderização dos textos quando as fontes nativas foram utilizadas sem o devido embutimento completo.

## Decisão

Adotamos a geração de arquivos PDF de forma **puramente dinâmica (on-the-fly)** utilizando a biblioteca `pdf-lib` no lado do servidor (Node.js), mas **alteramos a estratégia de fontes** e renderização.

Principais pontos da decisão:

1. **Uso de Fontes ABNT Customizadas**:
   - Deixamos de usar `StandardFonts.Helvetica` e adotamos a **Carlito** (substituta open-source da Calibri) em formato `.ttf`, conforme recomendação do MRPR.
2. **Embutimento Completo (Disable Subsetting)**:
   - Para evitar que assinadores de terceiros (como a Assinafy) corrompam o dicionário de caracteres ou apresentem letras invisíveis, utilizamos `embedFont(fontBytes)` com o subsetting desativado (`subset: false` ou omitido). Isso anexa a fonte inteira ao binário do PDF.
3. **Matemática de Renderização e Layout MRPR**:
   - O PDF aplica rigorosamente as margens oficiais (3cm esquerda, 1.5cm direita).
   - Ao renderizar blocos de texto após imagens (`drawImage`), sempre somamos a altura da imagem **mais um buffer de linha** ao eixo Y, pois a coordenada `y` do `pdf-lib` aponta para a `baseline` (linha base) da fonte, evitando sobreposição de textos.
4. **Estado em Memória**:
   - O arquivo PDF não é salvo no S3. Ele é reconstruído a partir do banco de dados na hora do download (`NextResponse`), garantindo refletir a última edição instantaneamente.

## Consequências

- **Positivas**: 
  - Conformidade perfeita com o MRPR usando fontes aprovadas (Carlito).
  - 100% de confiabilidade na integração com plataformas externas de assinatura (sem letras invisíveis).
  - Layout preciso sem sobreposição de cabeçalhos.
- **Negativas**: 
  - O PDF gerado tem um tamanho maior (~500KB) devido ao embutimento completo da fonte `.ttf`, comparado aos míseros KBs da StandardFont. Isso é aceitável para o nosso contexto institucional.
