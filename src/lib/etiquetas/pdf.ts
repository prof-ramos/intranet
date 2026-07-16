import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { calculateLabelPosition } from './layout';
import { mmToPoints } from './measurements';
import { getLabelsPerPage, getPimacoTemplate } from './templates';
import type { GenerateLabelsOptions, LabelContent, PimacoTemplate } from './types';
import { assertStartPositionForTemplate } from './validations';

const INITIAL_FONT_SIZE = 9;
const MIN_FONT_SIZE = 6;
const LINE_HEIGHT_FACTOR = 1.18;
const PADDING_MM = 2.2;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
    } else {
      const chunks = splitLongWord(word, font, size, maxWidth);
      lines.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? '';
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function splitLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const char of word) {
    const candidate = `${current}${char}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      chunks.push(current);
      current = char;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const ellipsis = '...';
  let value = text;
  while (value.length > 0 && font.widthOfTextAtSize(`${value}${ellipsis}`, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return value ? `${value}${ellipsis}` : ellipsis;
}

function fitLines(content: LabelContent, font: PDFFont, maxWidth: number, maxHeight: number) {
  for (let size = INITIAL_FONT_SIZE; size >= MIN_FONT_SIZE; size -= 0.5) {
    const lineHeight = size * LINE_HEIGHT_FACTOR;
    const wrapped = content.lines.flatMap((line) => wrapText(line, font, size, maxWidth));
    const maxLines = Math.floor(maxHeight / lineHeight);
    if (wrapped.length <= maxLines) return { lines: wrapped, size, lineHeight };
  }

  const size = MIN_FONT_SIZE;
  const lineHeight = size * LINE_HEIGHT_FACTOR;
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  const wrapped = content.lines.flatMap((line) => wrapText(line, font, size, maxWidth));
  const kept = wrapped.slice(0, maxLines);
  if (wrapped.length > kept.length) {
    kept[kept.length - 1] = truncateToWidth(kept[kept.length - 1] ?? '', font, size, maxWidth);
  }
  return { lines: kept, size, lineHeight };
}

function setMetadata(pdfDoc: PDFDocument) {
  pdfDoc.setTitle('Etiquetas ASOF');
  pdfDoc.setAuthor('ASOF');
  pdfDoc.setCreator('ASOF Intranet');
  pdfDoc.setLanguage('pt-BR');
  pdfDoc.setKeywords(['ASOF', 'etiquetas', 'Pimaco', 'A4', 'correspondência']);
}

function drawDebugGrid(pdfDoc: PDFDocument, template: PimacoTemplate, pagesCount: number, options: GenerateLabelsOptions) {
  const labelsPerPage = getLabelsPerPage(template);
  for (let pageIndex = 0; pageIndex < pagesCount; pageIndex += 1) {
    const page = pdfDoc.getPage(pageIndex);
    for (let indexOnPage = 0; indexOnPage < labelsPerPage; indexOnPage += 1) {
      const pos = calculateLabelPosition(template, pageIndex * labelsPerPage + indexOnPage, {
        startPosition: options.startPosition ?? 1,
        offsetXmm: options.offsetXmm,
        offsetYmm: options.offsetYmm,
      });
      page.drawRectangle({
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        borderColor: rgb(1, 0, 0),
        borderWidth: 0.4,
      });
    }
  }
}

export async function generateEtiquetasPdf(options: GenerateLabelsOptions): Promise<Uint8Array> {
  const template = getPimacoTemplate(options.templateCode);
  const labelsPerPage = getLabelsPerPage(template);
  const startPosition = options.startPosition ?? 1;
  assertStartPositionForTemplate(startPosition, labelsPerPage);

  const pdfDoc = await PDFDocument.create();
  setMetadata(pdfDoc);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPositions = startPosition - 1 + options.labels.length;
  const pagesCount = Math.max(1, Math.ceil(totalPositions / labelsPerPage));

  for (let pageIndex = 0; pageIndex < pagesCount; pageIndex += 1) {
    pdfDoc.addPage([mmToPoints(template.pageWidthMm), mmToPoints(template.pageHeightMm)]);
  }

  if (options.debug) drawDebugGrid(pdfDoc, template, pagesCount, options);

  const padding = mmToPoints(PADDING_MM);
  options.labels.forEach((label, labelIndex) => {
    const pos = calculateLabelPosition(template, labelIndex, {
      startPosition,
      offsetXmm: options.offsetXmm,
      offsetYmm: options.offsetYmm,
    });
    const page = pdfDoc.getPage(pos.pageIndex);
    const maxWidth = Math.max(1, pos.width - padding * 2);
    const maxHeight = Math.max(1, pos.height - padding * 2);
    const fitted = fitLines(label, font, maxWidth, maxHeight);
    let y = pos.y + pos.height - padding - fitted.size;

    for (const line of fitted.lines) {
      if (y < pos.y + padding - 0.1) break;
      page.drawText(line, { x: pos.x + padding, y, size: fitted.size, font, color: rgb(0, 0, 0) });
      y -= fitted.lineHeight;
    }
  });

  return pdfDoc.save();
}
