import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { GenerateLabelsPdfOptions } from './types';

export async function generateLabelsPdf(options: GenerateLabelsPdfOptions): Promise<Uint8Array> {
  const { preset, items, startPosition = 0, drawDebugGrid = false } = options;

  const pdfDoc = await PDFDocument.create();
  
  // No Context7 vimos que Helvetica é parte das fontes nativas do pdf-lib.
  const font = await pdfDoc.embedFont(StandardFonts[preset.text.fontName]);

  const { columns, rows } = preset.grid;
  const labelsPerPage = columns * rows;

  let currentPage = pdfDoc.addPage([preset.page.width, preset.page.height]);
  let currentPosition = startPosition;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Se a posição atual ultrapassar as etiquetas disponíveis na página, cria nova página
    if (currentPosition >= labelsPerPage) {
      currentPage = pdfDoc.addPage([preset.page.width, preset.page.height]);
      currentPosition = 0;
    }

    const col = currentPosition % columns;
    const row = Math.floor(currentPosition / columns);

    // Calcular coordenadas da etiqueta (x, y do canto superior esquerdo da etiqueta)
    // No PDF o Y cresce de baixo para cima. Precisamos subtrair do topo.
    const labelX = preset.margins.left + col * (preset.label.width + preset.gap.horizontal);
    const labelTopY = preset.page.height - (preset.margins.top + row * (preset.label.height + preset.gap.vertical));
    const labelBottomY = labelTopY - preset.label.height;

    // Desenhar grade de teste se ativado
    if (drawDebugGrid) {
      currentPage.drawRectangle({
        x: labelX,
        y: labelBottomY,
        width: preset.label.width,
        height: preset.label.height,
        borderColor: rgb(1, 0, 0),
        borderWidth: 0.5,
      });
    }

    // Calcular área útil de texto descontando o padding
    const innerX = labelX + preset.padding.left;
    const innerTopY = labelTopY - preset.padding.top;
    const maxTextWidth = preset.label.width - (preset.padding.left + preset.padding.right);
    const maxTextHeight = preset.label.height - (preset.padding.top + preset.padding.bottom);

    // Preparar as linhas
    const rawLines = [item.name, item.line1, item.line2, item.line3].filter(
      (line): line is string => typeof line === 'string' && line.length > 0
    );

    // Renderizar linhas respeitando limite de altura e largura
    let currentY = innerTopY - preset.text.fontSize; // y é a base do texto em pdf-lib
    let linesRendered = 0;

    for (const textLine of rawLines) {
      if (linesRendered >= preset.text.maxLines) break;
      
      // Verifica se a próxima linha estoura o limite vertical da etiqueta
      const heightUsed = (linesRendered + 1) * preset.text.lineHeight;
      if (heightUsed > maxTextHeight) break;

      // Truncamento horizontal (evitar que o texto vaze da etiqueta horizontalmente)
      let truncatedText = textLine;
      let textWidth = font.widthOfTextAtSize(truncatedText, preset.text.fontSize);
      
      if (textWidth > maxTextWidth) {
        // Encurtar até caber com "..."
        const ellipsis = '...';
        const ellipsisWidth = font.widthOfTextAtSize(ellipsis, preset.text.fontSize);
        
        while (truncatedText.length > 0 && textWidth + ellipsisWidth > maxTextWidth) {
          truncatedText = truncatedText.slice(0, -1);
          textWidth = font.widthOfTextAtSize(truncatedText, preset.text.fontSize);
        }
        truncatedText += ellipsis;
      }

      currentPage.drawText(truncatedText, {
        x: innerX,
        y: currentY,
        size: preset.text.fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      currentY -= preset.text.lineHeight;
      linesRendered++;
    }

    currentPosition++;
  }

  // Se não houver itens mas pedirmos grade (ex: folha de teste vazia)
  if (items.length === 0 && drawDebugGrid) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        // Ignora posições antes do startPosition
        if (row * columns + col < startPosition) continue;

        const labelX = preset.margins.left + col * (preset.label.width + preset.gap.horizontal);
        const labelTopY = preset.page.height - (preset.margins.top + row * (preset.label.height + preset.gap.vertical));
        const labelBottomY = labelTopY - preset.label.height;

        currentPage.drawRectangle({
          x: labelX,
          y: labelBottomY,
          width: preset.label.width,
          height: preset.label.height,
          borderColor: rgb(1, 0, 0),
          borderWidth: 0.5,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
