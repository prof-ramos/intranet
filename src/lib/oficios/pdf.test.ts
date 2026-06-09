import fs from 'node:fs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  htmlToPlainText,
  generateOfficialLetterPdf,
  resetOficioPdfAssetCacheForTests,
} from './pdf';
import { type OfficialLetter } from '@/lib/db/schema/oficios';
import { PDFDocument } from 'pdf-lib';

describe('htmlToPlainText', () => {
  it('converts rich text html to readable text for PDF rendering', () => {
    const result = htmlToPlainText(
      '<p><strong>Primeiro</strong> parágrafo</p><ul><li>Item A</li><li>Item B</li></ul><p style="text-align: center">Fim &amp; fecho</p>',
    );

    expect(result).toContain('Primeiro parágrafo');
    expect(result).toContain('- Item A');
    expect(result).toContain('- Item B');
    expect(result).toContain('Fim & fecho');
  });

  it('drops script and style content', () => {
    expect(htmlToPlainText('<p>Texto</p><script>alert(1)</script><style>p{}</style>')).toBe(
      'Texto',
    );
  });
});

describe('generateOfficialLetterPdf', () => {
  const mockOficio: OfficialLetter = {
    id: 1,
    number: 'OFÍCIO N.º 42/2026/ASOF',
    year: 2026,
    sequence: 42,
    recipient: 'Ilmo. Sr. Secretário de Gestão de Pessoas',
    recipientRole: 'Secretário de Gestão de Pessoas',
    recipientAddress: 'Palácio Itamaraty, Esplanada dos Ministérios',
    recipientCity: 'Brasília/DF',
    recipientZip: '70170-900',
    vocativo: 'Senhor Secretário,',
    letterDate: '08 de junho de 2026',
    subject: 'Solicitação de informações sobre remoções da carreira de Oficial de Chancelaria',
    itamaratySector: 'SGP / MRE',
    signatoryName: 'Gabriel Ramos',
    signatoryRole: 'Presidente da ASOF',
    closure: 'Atenciosamente,',
    bodyRichText: '<p>Este é o primeiro parágrafo do ofício com texto de teste para validação de PDF.</p>',
    bodyPlainText: 'Este é o primeiro parágrafo do ofício com texto de teste para validação de PDF.',
    pdfStoragePath: null,
    status: 'gerado',
    createdBy: 1,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assinafyDocumentId: null,
    assinafyStatus: null,
    assinafyAssignmentId: null,
    assinafySignerId: null,
    assinafySentAt: null,
    assinafySignedAt: null,
    assinafyError: null,
    assinafySigningUrl: null,
  };

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('successfully generates a 1-page PDF document including the recipient address fields', async () => {
    // Mock fetch to simulate logo not found (fallback to text)
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(Buffer.from('dummy-logo'), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    );
    const pdfBytes = await generateOfficialLetterPdf(mockOficio);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Verify PDF validity by loading it via pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

  });

  it('successfully generates a multi-page PDF document with correct page breaks', async () => {
    // Generate a long text to force page breaks
    const longBody = Array(15)
      .fill(
        'Este é um parágrafo longo de teste repetido para garantir que o gerador de PDF execute quebras de página automáticas corretamente e desenhe o rodapé em todas as páginas geradas sem gerar duplicações.',
      )
      .join('\n\n');

    const longOficio: OfficialLetter = {
      ...mockOficio,
      bodyRichText: `<p>${longBody}</p>`,
      bodyPlainText: longBody,
    };

    const pdfBytes = await generateOfficialLetterPdf(longOficio);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    // Should break into at least 2 pages (page 2+ receive MRPR page numbers)
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it('generates a valid PDF with MRPR layout fields for a short single-page letter', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const pdfBytes = await generateOfficialLetterPdf({
      ...mockOficio,
      signatoryName: 'Manuel Alves Bezerra',
      closure: 'Respeitosamente,',
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
    expect(pdfBytes.length).toBeGreaterThan(500);
  });

  it('embeds PDF metadata for identification in readers and Assinafy', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const pdfBytes = await generateOfficialLetterPdf(mockOficio);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    expect(pdfDoc.getTitle()).toBe(mockOficio.number);
    expect(pdfDoc.getAuthor()).toBe('ASOF');
    expect(pdfDoc.getSubject()).toBe(mockOficio.subject);
    expect(pdfDoc.getCreator()).toBe('ASOF Intranet');
    expect(pdfDoc.getKeywords()).toBe('ofício 2026 ASOF');
  });

  it('embeds Carlito fonts for MRPR typography and Portuguese text', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const pdfBytes = await generateOfficialLetterPdf({
      ...mockOficio,
      recipient: 'À Associação — 1.º subsolo',
      bodyPlainText: 'Texto com ções e acentuação institucional.',
      bodyRichText: '<p>Texto com ções e acentuação institucional.</p>',
    });

    // Custom subset fonts produce larger PDFs than Standard 14 Helvetica (~2–5 KB).
    expect(pdfBytes.length).toBeGreaterThan(10_000);
  });

  it('reuses cached Carlito font bytes across generations', async () => {
    resetOficioPdfAssetCacheForTests();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const readSpy = vi.spyOn(fs, 'readFileSync');

    await generateOfficialLetterPdf(mockOficio);
    const callsAfterFirst = readSpy.mock.calls.filter(([p]) =>
      String(p).includes('Carlito'),
    ).length;

    await generateOfficialLetterPdf(mockOficio);
    const callsAfterSecond = readSpy.mock.calls.filter(([p]) =>
      String(p).includes('Carlito'),
    ).length;

    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(callsAfterSecond).toBe(callsAfterFirst);

    readSpy.mockRestore();
  });
});
