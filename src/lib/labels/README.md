# Geração de Etiquetas PDF

Este módulo gerencia a criação de PDFs para etiquetas, como as da marca Pimaco, com uso de coordenadas absolutas via `pdf-lib`. O sistema processa os itens de texto e os desenha com base nas dimensões de um gabarito físico.

## Importante: Calibração Física do Gabarito

Os presets definidos em `presets.ts` determinam com precisão matemática onde cada etiqueta será impressa na folha. Para garantir a fidelidade da impressão, **nunca** compense desalinhamentos criando "offsets escondidos" ou modificando os eixos de renderização do código. Todo ajuste deve ser reflexo fiel de dimensões reais configuradas no preset correspondente.

Antes de aprovar e utilizar qualquer preset em produção, siga rigorosamente os passos abaixo de aferição:

1. Acesse o painel de geração de etiquetas na intranet.
2. Gere um PDF de teste marcando a opção **Desenhar Grade de Teste (Debug)** (modo `drawDebugGrid`).
3. Ao abrir o PDF gerado em seu visualizador e mandar para a impressora:
   - **Desative** a opção "Ajustar à página", "Fit to page" ou "Fit to printable area".
   - **Imprima sempre em escala exata de 100%**.
4. Imprima a primeira página em uma **folha sulfite/A4 comum** primeiro.
5. Coloque a folha impressa atrás de uma folha de etiquetas Pimaco original contra uma fonte de luz.
6. Meça o deslocamento horizontal e vertical se houver diferenças entre a grade vermelha impressa e os cortes adesivos reais.
7. Ajuste **apenas** as dimensões (`margin.left`, `margin.top`, espaçamentos ou tamanhos da etiqueta) dentro do respectivo modelo em `src/lib/labels/presets.ts`.
8. Repita o teste até que a grade alinhe com perfeição.

Não se baseie na aparência visual da tela de administração ou visualizadores web. O gabarito só estará validado após conformação na impressora final do setor.
