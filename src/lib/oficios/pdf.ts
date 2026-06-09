import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  type PDFPage,
  type PDFFont,
} from 'pdf-lib';
import { type OfficialLetter } from '@/lib/db/schema/oficios';

const CARLITO_FONTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public', 'fonts', 'carlito');
const LOGO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public', 'logo.png');

// Conversions
const CM_TO_PT = 28.3465;

// MRPR margins (Manual de Redação da Presidência da República): A4
const marginLeft = 3 * CM_TO_PT;
const marginRight = 1.5 * CM_TO_PT;
const marginTop = 2 * CM_TO_PT;
const marginBottom = 2 * CM_TO_PT;

const BODY_FONT_SIZE = 12;
/** Rodapé institucional (MRPR). */
const FOOTER_FONT_SIZE = 11;
/** Espaço após cada parágrafo (6 pt, MRPR). */
const PARAGRAPH_SPACING = 6;

let cachedCarlitoFonts: { regular: Uint8Array; bold: Uint8Array } | null = null;
let cachedLogoBytes: Uint8Array | null | undefined;

/** Resets in-memory asset cache (tests only). */
export function resetOficioPdfAssetCacheForTests() {
  cachedCarlitoFonts = null;
  cachedLogoBytes = undefined;
}

async function getCarlitoFontBytes(): Promise<{ regular: Uint8Array; bold: Uint8Array } | null> {
  if (!cachedCarlitoFonts) {
    try {
      cachedCarlitoFonts = {
        regular: fs.readFileSync(path.join(CARLITO_FONTS_DIR, 'Carlito-Regular.ttf')),
        bold: fs.readFileSync(path.join(CARLITO_FONTS_DIR, 'Carlito-Bold.ttf')),
      };
    } catch {
      // Serverless fallback: fetch fonts via HTTP from the app URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        const [regularResp, boldResp] = await Promise.all([
          fetch(`${baseUrl}/fonts/carlito/Carlito-Regular.ttf`, { signal: AbortSignal.timeout(5000) }),
          fetch(`${baseUrl}/fonts/carlito/Carlito-Bold.ttf`, { signal: AbortSignal.timeout(5000) }),
        ]);
        if (!regularResp.ok || !boldResp.ok) throw new Error('Font fetch failed');
        cachedCarlitoFonts = {
          regular: new Uint8Array(await regularResp.arrayBuffer()),
          bold: new Uint8Array(await boldResp.arrayBuffer()),
        };
      } catch {
        return null;
      }
    }
  }
  return cachedCarlitoFonts;
}

async function loadLogoBytes(): Promise<Uint8Array | ArrayBuffer> {
  if (cachedLogoBytes) {
    return cachedLogoBytes;
  }
  try {
    cachedLogoBytes = fs.readFileSync(LOGO_PATH);
    return cachedLogoBytes;
  } catch {
    // Serverless fallback: fetch logo via HTTP from the app URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      const resp = await fetch(`${baseUrl}/logo.png`, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error('Logo fetch failed');
      cachedLogoBytes = new Uint8Array(await resp.arrayBuffer());
      return cachedLogoBytes;
    } catch {
      return new Uint8Array();
    }
  }
}

async function embedOficioFonts(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);

  const carlito = await getCarlitoFontBytes();
  if (carlito) {
    const font = await pdfDoc.embedFont(carlito.regular);
    const fontBold = await pdfDoc.embedFont(carlito.bold);
    return { font, fontBold };
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { font, fontBold };
}

function addA4Page(pdfDoc: PDFDocument, bodyLineSpacing: number) {
  const page = pdfDoc.addPage(PageSizes.A4);
  page.setLineHeight(bodyLineSpacing);
  return page;
}

function setDocumentMetadata(pdfDoc: PDFDocument, oficio: OfficialLetter) {
  pdfDoc.setTitle(oficio.number);
  pdfDoc.setAuthor('ASOF');
  pdfDoc.setSubject(oficio.subject);
  pdfDoc.setCreator('ASOF Intranet');
  pdfDoc.setLanguage('pt-BR');
  pdfDoc.setKeywords(['ofício', String(oficio.year), 'ASOF']);
}

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

const MESES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatDatePtBr(dateStr: string): string {
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    if (month >= 0 && month < 12) {
      return `${day} de ${MESES_PT[month]} de ${year}`;
    }
  }

  return dateStr;
}

const FOOTER_LINE_1 = 'ASOF – Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro';
const FOOTER_LINE_2 = 'Esplanada dos Ministérios, Bloco H – Zona Cívico-Administrativa – 1.º Subsolo, Sala ASOF';
const FOOTER_LINE_3 = 'Brasília/DF – CEP 70170-900     |     CNPJ: 26.989.392/0001-57';

function drawPageNumber(
  page: PDFPage,
  pageNumber: number,
  width: number,
  height: number,
  font: PDFFont,
) {
  const label = String(pageNumber);
  const y = height - marginTop + 4;
  page.drawText(label, {
    x: width - marginRight - font.widthOfTextAtSize(label, BODY_FONT_SIZE),
    y,
    size: BODY_FONT_SIZE,
    font,
  });
}

/** Desenha "Assunto:" em negrito e o texto do assunto em fonte regular (MRPR). */
function drawSubjectBlock(
  page: PDFPage,
  subject: string,
  y: number,
  font: PDFFont,
  fontBold: PDFFont,
  contentWidth: number,
  bodyLineSpacing: number,
): number {
  const prefix = 'Assunto: ';
  const prefixWidth = fontBold.widthOfTextAtSize(prefix, BODY_FONT_SIZE);
  const firstLineWidth = contentWidth - prefixWidth;

  page.drawText(prefix, {
    x: marginLeft,
    y,
    size: BODY_FONT_SIZE,
    font: fontBold,
  });

  const words = subject.split(/\s+/).filter(Boolean);
  let firstLineText = '';
  let consumed = 0;

  for (const word of words) {
    const candidate = firstLineText ? `${firstLineText} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, BODY_FONT_SIZE) <= firstLineWidth) {
      firstLineText = candidate;
      consumed += 1;
    } else {
      break;
    }
  }

  if (firstLineText) {
    page.drawText(firstLineText, {
      x: marginLeft + prefixWidth,
      y,
      size: BODY_FONT_SIZE,
      font,
    });
  }

  let currentY = y - bodyLineSpacing;
  const remainder = words.slice(consumed).join(' ');
  const continuationLines = remainder ? wrapText(remainder, font, BODY_FONT_SIZE, contentWidth) : [];

  for (const line of continuationLines) {
    page.drawText(line, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
    currentY -= bodyLineSpacing;
  }

  return currentY;
}

function drawFooter(
  page: PDFPage,
  width: number,
  font: PDFFont,
  fontBold: PDFFont,
) {
  const footerLineSpacing = font.heightAtSize(FOOTER_FONT_SIZE);
  const footerY = 18;

  page.drawText(FOOTER_LINE_1, {
    x: (width - fontBold.widthOfTextAtSize(FOOTER_LINE_1, FOOTER_FONT_SIZE)) / 2,
    y: footerY + footerLineSpacing * 2,
    size: FOOTER_FONT_SIZE,
    font: fontBold,
  });
  page.drawText(FOOTER_LINE_2, {
    x: (width - font.widthOfTextAtSize(FOOTER_LINE_2, FOOTER_FONT_SIZE)) / 2,
    y: footerY + footerLineSpacing,
    size: FOOTER_FONT_SIZE,
    font,
  });
  page.drawText(FOOTER_LINE_3, {
    x: (width - font.widthOfTextAtSize(FOOTER_LINE_3, FOOTER_FONT_SIZE)) / 2,
    y: footerY,
    size: FOOTER_FONT_SIZE,
    font,
  });
}

export async function generateOfficialLetterPdf(oficio: OfficialLetter) {
  const pdfDoc = await PDFDocument.create();
  setDocumentMetadata(pdfDoc, oficio);

  const { font, fontBold } = await embedOficioFonts(pdfDoc);
  const bodyLineSpacing = font.heightAtSize(BODY_FONT_SIZE);

  let page = addA4Page(pdfDoc, bodyLineSpacing);
  const { width, height } = page.getSize();

  const contentWidth = width - marginLeft - marginRight;

  let currentY = height - marginTop;

  // ── 1. Logo ──
  try {
    const logoBytes = await loadLogoBytes();
    const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoWidth = 4.125 * CM_TO_PT; // 0.25 \textwidth (16.5cm * 0.25)
      const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
      page.drawImage(logoImage, {
        x: (width - logoWidth) / 2,
        y: currentY - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
      // Add extra spacing (approx. two blank lines) before the text
      currentY -= logoHeight + 48;
  } catch {
    // Fallback: render text placeholder if logo fails to load
    const fallback = 'ASOF';
    const fallbackSize = 14;
    page.drawText(fallback, {
      x: (width - fontBold.widthOfTextAtSize(fallback, fallbackSize)) / 2,
      y: currentY - fallbackSize,
      size: fallbackSize,
      font: fontBold,
    });
    // Add extra spacing (approx. two blank lines) before the text
    currentY -= fallbackSize + 48;
  }

  // ── 2. Ofício Number (left-aligned, bold, uppercase — MRPR) ──
  const numberSize = 14;
  const upperNumber = oficio.number.toUpperCase();
  const hasOrdinal = /N[.º]?\s*\d/.test(upperNumber);
  const hasPrefix = /^OF[ÍI]CIO/.test(upperNumber);
  const displayNumber = hasOrdinal
    ? (hasPrefix ? upperNumber : `OFÍCIO ${upperNumber}`)
    : `OFÍCIO N.º ${oficio.number.replace(/^OF[ÍI]CIO\s+/i, '').toUpperCase()}`;
  page.drawText(displayNumber, {
    x: marginLeft,
    y: currentY,
    size: numberSize,
    font: fontBold,
  });
  currentY -= 28; // Equivalent to \vspace{0.5cm} + line height

  // ── 3. Date (right-aligned block) ──
  const formattedDate = formatDatePtBr(oficio.letterDate);
  const dateStr = `Brasília, ${formattedDate}.`;
  page.drawText(dateStr, {
    x: width - marginRight - font.widthOfTextAtSize(dateStr, BODY_FONT_SIZE),
    y: currentY,
    size: BODY_FONT_SIZE,
    font,
  });
  currentY -= 36; // Equivalent to \vspace{0.8cm}

  // ── 4. Recipient block (diplomatic formatting) ──

  page.drawText(oficio.recipient, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
  currentY -= bodyLineSpacing;

  page.drawText(oficio.recipientRole, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
  currentY -= bodyLineSpacing;

  page.drawText(oficio.itamaratySector, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
  currentY -= bodyLineSpacing;

  if (oficio.recipientAddress) {
    page.drawText(oficio.recipientAddress, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
    currentY -= bodyLineSpacing;
  }

  if (oficio.recipientCity || oficio.recipientZip) {
    const cityZip = [oficio.recipientCity, oficio.recipientZip].filter(Boolean).join(' – ');
    page.drawText(cityZip, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
    currentY -= bodyLineSpacing;
  }

  currentY -= 24;

  // ── 5. Subject ("Assunto:" bold, remainder regular — MRPR) ──
  if (currentY < marginBottom + 50) {
    page = addA4Page(pdfDoc, bodyLineSpacing);
    currentY = height - marginTop;
  }
  currentY = drawSubjectBlock(
    page,
    oficio.subject,
    currentY,
    font,
    fontBold,
    contentWidth,
    bodyLineSpacing,
  );
  currentY -= 24;

  // ── 6. Body ──
  const bodyText = oficio.bodyRichText?.trim()
    ? htmlToPlainText(oficio.bodyRichText)
    : oficio.bodyPlainText;
  const paragraphs = bodyText.split('\n').filter((p) => p.trim() !== '');
  const useNumbering = false; // MRPR: paragraphs use first-line indent, not explicit numbering

  const firstLineIndent = 2.5 * CM_TO_PT; // MRPR: 2,5 cm recuo primeira linha

  // Vocativo (não numerado — MRPR)  
  if (oficio.vocativo) {
    page.drawText(oficio.vocativo, { x: marginLeft, y: currentY, size: BODY_FONT_SIZE, font });
    currentY -= bodyLineSpacing + 6;
  }

  for (let i = 0; i < paragraphs.length; i++) {
    // Determine numbering
    let pText = paragraphs[i];
    if (useNumbering && !/^\d+\./.test(pText)) {
      // MRPR says first paragraph is unnumbered if it's the only one, 
      // but if there are multiple, all are numbered.
      pText = `${i + 1}. ${pText}`;
    }

    const allWords = pText.split(/\s+/).filter(Boolean);

    // First line with indent
    const firstLineWidth = contentWidth - firstLineIndent;
    const firstLineLines = wrapText(pText, font, BODY_FONT_SIZE, firstLineWidth);
    const firstLineWords = firstLineLines[0]?.split(/\s+/).filter(Boolean) ?? [];
    const remainingWords = allWords.slice(firstLineWords.length);
    const remainingText = remainingWords.join(' ');
    const remainingLines = remainingText
      ? wrapText(remainingText, font, BODY_FONT_SIZE, contentWidth)
      : [];

    const allLines = [firstLineLines[0], ...remainingLines].filter(Boolean);

    for (let j = 0; j < allLines.length; j++) {
      if (currentY < marginBottom + 50) {
        page = addA4Page(pdfDoc, bodyLineSpacing);
        currentY = height - marginTop;
      }
      const x = j === 0 ? marginLeft + firstLineIndent : marginLeft;
      const lineWidth = j === 0 ? contentWidth - firstLineIndent : contentWidth;
      const isLastLine = j === allLines.length - 1;

      if (!isLastLine) {
        const lineWords = allLines[j].split(' ');
        if (lineWords.length > 1) {
          const totalWordsWidth = lineWords.reduce(
            (acc, word) => acc + font.widthOfTextAtSize(word, BODY_FONT_SIZE),
            0,
          );
          const spacePerGap = (lineWidth - totalWordsWidth) / (lineWords.length - 1);

          let xPos = x;
          for (let k = 0; k < lineWords.length; k++) {
            page.drawText(lineWords[k], { x: xPos, y: currentY, size: BODY_FONT_SIZE, font });
            if (k < lineWords.length - 1) {
              xPos += font.widthOfTextAtSize(lineWords[k], BODY_FONT_SIZE) + spacePerGap;
            }
          }
          currentY -= bodyLineSpacing;
          continue;
        }
      }

      page.drawText(allLines[j], {
        x,
        y: currentY,
        size: BODY_FONT_SIZE,
        font,
      });
      currentY -= bodyLineSpacing;
    }

    currentY -= PARAGRAPH_SPACING;
  }

  currentY -= 20;

  // ── 7. Closure ──
  if (currentY < marginBottom + 80) {
    page = addA4Page(pdfDoc, bodyLineSpacing);
    currentY = height - marginTop;
  }
  // Closure has the same paragraph indent
  page.drawText(oficio.closure, {
    x: marginLeft + firstLineIndent,
    y: currentY,
    size: BODY_FONT_SIZE,
    font,
  });
  currentY -= 60;

  // ── 8. Signatory (centralizado — MRPR) ──
  if (currentY < marginBottom + 60) {
    page = addA4Page(pdfDoc, bodyLineSpacing);
    currentY = height - marginTop;
  }

  const signatoryNameWidth = fontBold.widthOfTextAtSize(oficio.signatoryName, BODY_FONT_SIZE);
  page.drawText(oficio.signatoryName, {
    x: (width - signatoryNameWidth) / 2,
    y: currentY,
    size: BODY_FONT_SIZE,
    font: fontBold,
  });
  currentY -= bodyLineSpacing;

  const signatoryRoleWidth = font.widthOfTextAtSize(oficio.signatoryRole, BODY_FONT_SIZE);
  page.drawText(oficio.signatoryRole, {
    x: (width - signatoryRoleWidth) / 2,
    y: currentY,
    size: BODY_FONT_SIZE,
    font,
  });

  // ── 9. Rodapé institucional + numeração a partir da 2ª página (MRPR) ──
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    drawFooter(pages[i], width, font, fontBold);
    if (i > 0) {
      drawPageNumber(pages[i], i + 1, width, height, font);
    }
  }

  return pdfDoc.save();
}
