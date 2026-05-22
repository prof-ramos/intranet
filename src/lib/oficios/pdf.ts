import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type OfficialLetter } from '@/lib/db/schema/oficios';

// Conversions
const CM_TO_PT = 28.3465;

/** Split a paragraph into lines that fit within maxWidth, using the given font/size. */
function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = `${currentLine} ${words[i]}`;
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Draw a paragraph with automatic line wrapping.
 * Returns the Y position after the last drawn line.
 */
function drawWrappedText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  size: number,
  lineHeight: number,
  options?: {
    color?: ReturnType<typeof rgb>;
    font?: Parameters<typeof page.drawText>[1] extends { font?: infer F } ? F : never;
  },
): number {
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    if (y < 50) break; // page boundary guard
    page.drawText(line, {
      x,
      y,
      size,
      lineHeight,
      ...options,
    });
    y -= lineHeight;
  }
  return y;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

export function htmlToPlainText(html: string) {
  if (!html.trim()) return '';

  return decodeHtmlEntities(
    html
      .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, '')
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n- ')
      .replace(/<\s*\/\s*li\s*>/gi, '')
      .replace(/<\s*\/\s*(p|div|h[1-6]|blockquote)\s*>/gi, '\n\n')
      .replace(/<\s*(p|div|h[1-6]|blockquote)[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

export async function generateOfficialLetterPdf(oficio: OfficialLetter) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([21 * CM_TO_PT, 29.7 * CM_TO_PT]); // A4
  const { width, height } = page.getSize();

  const marginLeft = 3 * CM_TO_PT;
  const marginRight = 1.5 * CM_TO_PT;
  const marginTop = 2 * CM_TO_PT;
  const contentWidth = width - marginLeft - marginRight;

  let currentY = height - marginTop;

  // 1. Header (5cm area)
  currentY -= 1 * CM_TO_PT; // reserved for Brasão

  const header1 = 'ASSOCIAÇÃO NACIONAL DOS OFICIAIS DE CHANCERLARIA';
  const header1Width = fontBold.widthOfTextAtSize(header1, 10);
  page.drawText(header1, {
    x: (width - header1Width) / 2,
    y: currentY,
    size: 10,
    font: fontBold,
  });

  currentY -= 12;
  const header2 = 'DO SERVIÇO EXTERIOR BRASILEIRO — ASOF';
  const header2Width = font.widthOfTextAtSize(header2, 9);
  page.drawText(header2, {
    x: (width - header2Width) / 2,
    y: currentY,
    size: 9,
    font,
  });

  currentY = height - 5 * CM_TO_PT; // Start after 5cm header area

  // 2. Number (left) and Date (right)
  page.drawText(oficio.number, { x: marginLeft, y: currentY, size: 12, font });

  const dateWidth = font.widthOfTextAtSize(oficio.letterDate, 12);
  page.drawText(oficio.letterDate, {
    x: width - marginRight - dateWidth,
    y: currentY,
    size: 12,
    font,
  });

  currentY -= 40;

  // 3. Addressing block
  page.drawText(oficio.vocativo, { x: marginLeft, y: currentY, size: 12, font });
  currentY -= 15;
  page.drawText(oficio.recipient, { x: marginLeft, y: currentY, size: 12, font: fontBold });
  currentY -= 15;
  page.drawText(oficio.recipientRole, { x: marginLeft, y: currentY, size: 12, font });
  currentY -= 15;
  page.drawText(oficio.itamaratySector, { x: marginLeft, y: currentY, size: 12, font });
  currentY -= 15;
  page.drawText('Brasília – DF', { x: marginLeft, y: currentY, size: 12, font });

  currentY -= 40;

  // 4. Subject (bold)
  const subjectLine = `Assunto: ${oficio.subject}`;
  currentY = drawWrappedText(
    page,
    subjectLine,
    marginLeft,
    currentY,
    contentWidth,
    fontBold,
    12,
    16,
  );

  currentY -= 30;

  // 5. Body — with proper line wrapping
  const bodyIndent = 2.5 * CM_TO_PT;
  const bodyMaxWidth = contentWidth - bodyIndent;
  const bodyText = oficio.bodyRichText?.trim()
    ? htmlToPlainText(oficio.bodyRichText)
    : oficio.bodyPlainText;
  const paragraphs = bodyText.split('\n').filter((p) => p.trim() !== '');
  const useNumbering = paragraphs.length >= 3;

  for (let i = 0; i < paragraphs.length; i++) {
    const pText = useNumbering ? `${i + 1}. ${paragraphs[i]}` : paragraphs[i];

    currentY = drawWrappedText(
      page,
      pText,
      marginLeft + bodyIndent,
      currentY,
      bodyMaxWidth,
      font,
      12,
      16,
    );

    currentY -= 6; // spacing between paragraphs

    // Simple page break: if we're near the bottom, stop
    if (currentY < marginTop + 50) break;
  }

  currentY -= 20;

  // 6. Closure
  page.drawText(oficio.closure, { x: marginLeft + bodyIndent, y: currentY, size: 12, font });

  currentY -= 60;

  // 7. Signatory (centered)
  const sigName = oficio.signatoryName.toUpperCase();
  const sigNameWidth = font.widthOfTextAtSize(sigName, 12);
  page.drawText(sigName, { x: (width - sigNameWidth) / 2, y: currentY, size: 12, font });

  currentY -= 15;
  const sigRoleWidth = font.widthOfTextAtSize(oficio.signatoryRole, 12);
  page.drawText(oficio.signatoryRole, {
    x: (width - sigRoleWidth) / 2,
    y: currentY,
    size: 12,
    font,
  });

  return pdfDoc.save();
}
