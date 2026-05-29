import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import type { GenerateLabelsPdfOptions, LabelPreset } from './types';

const FONT_MAP: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

export interface LabelPosition {
  pageIndex: number;
  indexOnPage: number;
  col: number;
  row: number;
  x: number;
  yBottom: number;
  yTop: number;
  width: number;
  height: number;
}

/**
 * Função pura para calcular as coordenadas absolutas (em pontos PDF)
 * de uma etiqueta, garantindo que o gabarito físico seja respeitado.
 */
export function getLabelPosition(preset: LabelPreset, absoluteIndex: number): LabelPosition {
  const { columns, rows } = preset.grid;
  const labelsPerPage = columns * rows;

  const pageIndex = Math.floor(absoluteIndex / labelsPerPage);
  const indexOnPage = absoluteIndex % labelsPerPage;

  const col = indexOnPage % columns;
  const row = Math.floor(indexOnPage / columns);

  const x = preset.margins.left + col * (preset.label.width + preset.gap.horizontal);
  // No PDF o Y cresce de baixo para cima. O topo da página é preset.page.height.
  const yTop = preset.page.height - (preset.margins.top + row * (preset.label.height + preset.gap.vertical));
  const yBottom = yTop - preset.label.height;

  return {
    pageIndex,
    indexOnPage,
    col,
    row,
    x,
    yBottom,
    yTop,
    width: preset.label.width,
    height: preset.label.height,
  };
}

export async function generateLabelsPdf(options: GenerateLabelsPdfOptions): Promise<Uint8Array> {
  const { preset, items, startPosition = 0, drawDebugGrid = false } = options;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(FONT_MAP[preset.text.fontName] || StandardFonts.Helvetica);

  const { columns, rows } = preset.grid;
  const labelsPerPage = columns * rows;

  // Calcula total de posições que serão ocupadas (itens + posições puladas)
  const totalPositions = startPosition + items.length;
  // Se não houver itens, geramos pelo menos 1 página (que terá a grade de debug se ativo)
  const totalPages = Math.max(1, Math.ceil(totalPositions / labelsPerPage));

  const pages: PDFPage[] = [];
  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([preset.page.width, preset.page.height]);
    pages.push(page);

    if (drawDebugGrid) {
      // Desenhar grade completa da folha
      for (let i = 0; i < labelsPerPage; i++) {
        const absoluteIndex = p * labelsPerPage + i;
        const pos = getLabelPosition(preset, absoluteIndex);
        
        page.drawRectangle({
          x: pos.x,
          y: pos.yBottom,
          width: pos.width,
          height: pos.height,
          borderColor: rgb(1, 0, 0),
          borderWidth: 0.5,
        });
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const absoluteIndex = startPosition + i;
    const pos = getLabelPosition(preset, absoluteIndex);
    const currentPage = pages[pos.pageIndex];

    const innerX = pos.x + preset.padding.left;
    const innerTopY = pos.yTop - preset.padding.top;
    const maxTextWidth = pos.width - (preset.padding.left + preset.padding.right);
    const maxTextHeight = pos.height - (preset.padding.top + preset.padding.bottom);

    const rawLines = [item.name, item.line1, item.line2, item.line3].filter(
      (line): line is string => typeof line === 'string' && line.length > 0
    );

    let currentY = innerTopY - preset.text.fontSize;
    let linesRendered = 0;

    for (const textLine of rawLines) {
      if (linesRendered >= preset.text.maxLines) break;
      
      const heightUsed = (linesRendered + 1) * preset.text.lineHeight;
      if (heightUsed > maxTextHeight) break;

      let truncatedText = textLine;
      let textWidth = font.widthOfTextAtSize(truncatedText, preset.text.fontSize);
      
      if (textWidth > maxTextWidth) {
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
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

