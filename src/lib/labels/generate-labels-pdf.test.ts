import { describe, it, expect } from 'vitest';
import { generateLabelsPdf } from './generate-labels-pdf';
import { LABEL_PRESETS } from './presets';
import { PDFDocument } from 'pdf-lib';

describe('generateLabelsPdf', () => {
  const preset = LABEL_PRESETS['pimaco-a4054-approx'];

  it('generates a valid PDF with correct page size', async () => {
    const pdfBytes = await generateLabelsPdf({
      preset,
      items: [
        { id: '1', name: 'Test 1' },
      ],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);

    const page = doc.getPages()[0];
    const { width, height } = page.getSize();
    
    // Width and height might have slight precision differences due to math, so we check approximate equality or exact if we trust JS math
    expect(Math.round(width)).toBe(Math.round(preset.page.width));
    expect(Math.round(height)).toBe(Math.round(preset.page.height));
  });

  it('creates multiple pages if items exceed labelsPerPage', async () => {
    const labelsPerPage = preset.grid.columns * preset.grid.rows; // 2 * 10 = 20
    const items = Array.from({ length: labelsPerPage + 5 }).map((_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }));

    const pdfBytes = await generateLabelsPdf({ preset, items });
    const doc = await PDFDocument.load(pdfBytes);

    expect(doc.getPageCount()).toBe(2);
  });

  it('respects startPosition properly', async () => {
    // Start at position 15, we have 10 items.
    // So items will occupy index 15 to 24.
    // Index 15-19 are on page 1 (5 items).
    // Index 20-24 are on page 2 (5 items).
    // Total pages should be 2.
    const items = Array.from({ length: 10 }).map((_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }));

    const pdfBytes = await generateLabelsPdf({ preset, items, startPosition: 15 });
    const doc = await PDFDocument.load(pdfBytes);

    expect(doc.getPageCount()).toBe(2);
  });

  it('can draw debug grid with zero items', async () => {
    const pdfBytes = await generateLabelsPdf({ preset, items: [], drawDebugGrid: true });
    const doc = await PDFDocument.load(pdfBytes);

    // Deve gerar o arquivo sem explodir, contendo apenas as bordas vermelhas.
    expect(doc.getPageCount()).toBe(1);
  });
});
