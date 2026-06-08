import fs from 'node:fs';
import { generateOfficialLetterPdf } from '../../src/lib/oficios/pdf';
import { type OfficialLetter } from '../../src/lib/db/schema/oficios';

const sampleOficio: OfficialLetter = {
  id: 1,
  number: 'Ofício nº 123/2026/ASOF',
  year: 2026,
  sequence: 123,
  recipient: 'Ao Senhor FULANO DE TAL',
  recipientRole: 'Ministro de Estado das Relações Exteriores',
  recipientAddress: 'Esplanada dos Ministérios, Bloco H',
  recipientCity: 'Brasília/DF',
  recipientZip: 'CEP 70170-900',
  vocativo: 'Senhor Ministro,',
  letterDate: '08/06/2026',
  subject: 'Solicitação de adequação de sistemas corporativos.',
  itamaratySector: 'Ministério das Relações Exteriores',
  signatoryName: 'BELTRANO DA SILVA',
  signatoryRole: 'Presidente da ASOF',
  closure: 'Respeitosamente,',
  bodyRichText: '<p>Temos a honra de nos dirigir a Vossa Excelência para solicitar providências quanto à adequação dos sistemas corporativos internos.</p><p>A modernização dos sistemas é essencial para a eficiência administrativa do Ministério das Relações Exteriores, de modo a assegurar o cumprimento adequado das metas institucionais.</p>',
  bodyPlainText: 'Temos a honra de nos dirigir a Vossa Excelência para solicitar providências quanto à adequação dos sistemas corporativos internos.\n\nA modernização dos sistemas é essencial para a eficiência administrativa do Ministério das Relações Exteriores, de modo a assegurar o cumprimento adequado das metas institucionais.',
  status: 'rascunho',
  assinafyDocumentId: null,
  assinafyAssignmentId: null,
  assinafySignerId: null,
  assinafySigningUrl: null,
  assinafyStatus: null,
  assinafyError: null,
  assinafySentAt: null,
  assinafySignedAt: null,
  pdfStoragePath: null,
  createdBy: 1,
  updatedBy: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function main() {
  const pdfBytes = await generateOfficialLetterPdf(sampleOficio);
  const outPath = '/Users/gabrielramos/.gemini/antigravity-cli/brain/08d5dc30-304b-4717-954d-1e3f1f33d43b/oficio-padrao-teste.pdf';
  fs.writeFileSync(outPath, pdfBytes);
  console.log('PDF saved to', outPath);
}

main().catch(console.error);
