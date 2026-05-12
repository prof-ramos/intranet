import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { type OfficialLetter } from '@/lib/db/schema/oficios';

// Conversions
const CM_TO_PT = 28.3465;

export async function generateOfficialLetterPdf(oficio: OfficialLetter) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([21 * CM_TO_PT, 29.7 * CM_TO_PT]); // A4
  const { width, height } = page.getSize();
  
  const marginLeft = 3 * CM_TO_PT;
  const marginRight = 1.5 * CM_TO_PT;
  const marginTop = 2 * CM_TO_PT;
  const marginBottom = 2 * CM_TO_PT;
  const contentWidth = width - marginLeft - marginRight;
  
  let currentY = height - marginTop;
  
  // 1. Cabeçalho (Area of 5cm)
  // We'll skip the Brasão for now as we don't have the asset, but we'll reserve the space
  currentY -= 1 * CM_TO_PT; // Brasão space
  
  page.drawText('ASSOCIAÇÃO NACIONAL DOS OFICIAIS DE CHANCELARIA', {
    x: width / 2,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  // Need to center text manually in pdf-lib if not using a high-level lib
  const header1Width = fontBold.widthOfTextAtSize('ASSOCIAÇÃO NACIONAL DOS OFICIAIS DE CHANCELARIA', 10);
  page.drawText('ASSOCIAÇÃO NACIONAL DOS OFICIAIS DE CHANCELARIA', {
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
  
  // 2. Identificação do Expediente (Left Aligned)
  page.drawText(oficio.number, {
    x: marginLeft,
    y: currentY,
    size: 12,
    font,
  });
  
  // 3. Local e Data (Right Aligned)
  const dateText = oficio.letterDate;
  const dateWidth = font.widthOfTextAtSize(dateText, 12);
  page.drawText(dateText, {
    x: width - marginRight - dateWidth,
    y: currentY,
    size: 12,
    font,
  });
  
  currentY -= 40;
  
  // 4. Endereçamento (Left Aligned)
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
  
  // 5. Assunto (Bold, Left Aligned)
  const subjectLabel = 'Assunto: ';
  const subjectText = oficio.subject;
  page.drawText(subjectLabel + subjectText, {
    x: marginLeft,
    y: currentY,
    size: 12,
    font: fontBold,
  });
  
  currentY -= 40;
  
  // 6. Texto do Documento
  const paragraphs = oficio.bodyPlainText.split('\n').filter(p => p.trim() !== '');
  const useNumbering = paragraphs.length >= 3;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const pText = useNumbering ? `${i + 1}. ${paragraphs[i]}` : paragraphs[i];
    
    page.drawText(pText, {
      x: marginLeft + 2.5 * CM_TO_PT,
      y: currentY,
      size: 12,
      font,
      maxWidth: contentWidth - 2.5 * CM_TO_PT,
      lineHeight: 16,
    });
    
    // Estimate height (this is crude, pdf-lib doesn't give wrapped height easily)
    const lines = Math.ceil(font.widthOfTextAtSize(pText, 12) / (contentWidth - 2.5 * CM_TO_PT)) + 1;
    currentY -= lines * 16 + 6; // 6pt after
    
    if (currentY < marginBottom + 50) {
      // Very basic page break handling (would need more logic for real robust use)
      break; 
    }
  }
  
  currentY -= 20;
  
  // 7. Fecho
  page.drawText(oficio.closure, {
    x: marginLeft + 2.5 * CM_TO_PT,
    y: currentY,
    size: 12,
    font,
  });
  
  currentY -= 60;
  
  // 8. Identificação do Signatário (Centered)
  const sigName = oficio.signatoryName.toUpperCase();
  const sigRole = oficio.signatoryRole;
  
  const sigNameWidth = font.widthOfTextAtSize(sigName, 12);
  const sigRoleWidth = font.widthOfTextAtSize(sigRole, 12);
  
  page.drawText(sigName, {
    x: (width - sigNameWidth) / 2,
    y: currentY,
    size: 12,
    font,
  });
  currentY -= 15;
  page.drawText(sigRole, {
    x: (width - sigRoleWidth) / 2,
    y: currentY,
    size: 12,
    font,
  });
  
  return pdfDoc.save();
}
