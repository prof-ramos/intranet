import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import type { GenerateLabelsPdfOptions } from './types';

const FONT_MAP: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

export async function generateLabelsPdf(options: GenerateLabelsPdfOptions): Promise<Uint8Array> {
  const { preset, items, startPosition = 0, drawDebugGrid = false } = options;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(FONT_MAP[preset.text.fontName] || StandardFonts.Helvetica);

  const { columns, rows } = preset.grid;
  const labelsPerPage = columns * rows;

  const drawGridForPage = (page: PDFPage) => {
    if (!drawDebugGrid) return;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const labelX = preset.margins.left + c * (preset.label.width + preset.gap.horizontal);
        const labelTopY = preset.page.height - (preset.margins.top + r * (preset.label.height + preset.gap.vertical));
        const labelBottomY = labelTopY - preset.label.height;

        page.drawRectangle({
          x: labelX,
          y: labelBottomY,
          width: preset.label.width,
          height: preset.label.height,
          borderColor: rgb(1, 0, 0),
          borderWidth: 0.5,
        });
      }
    }
  };

  let currentPage = pdfDoc.addPage([preset.page.width, preset.page.height]);
  drawGridForPage(currentPage);

  let currentPosition = startPosition;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (currentPosition >= labelsPerPage) {
      currentPage = pdfDoc.addPage([preset.page.width, preset.page.height]);
      drawGridForPage(currentPage);
      currentPosition = 0;
    }

    const col = currentPosition % columns;
    const row = Math.floor(currentPosition / columns);

    const labelX = preset.margins.left + col * (preset.label.width + preset.gap.horizontal);
    const labelTopY = preset.page.height - (preset.margins.top + row * (preset.label.height + preset.gap.vertical));

    const innerX = labelX + preset.padding.left;
    const innerTopY = labelTopY - preset.padding.top;
    const maxTextWidth = preset.label.width - (preset.padding.left + preset.padding.right);
    const maxTextHeight = preset.label.height - (preset.padding.top + preset.padding.bottom);

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

    currentPosition++;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

