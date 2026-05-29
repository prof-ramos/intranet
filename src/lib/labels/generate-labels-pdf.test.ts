import { describe, it, expect } from 'vitest';
import { generateLabelsPdf, getLabelPosition } from './generate-labels-pdf';
import { LABEL_PRESETS } from './presets';
import { PDFDocument } from 'pdf-lib';

describe('Gabarito Físico (getLabelPosition)', () => {
  const preset = LABEL_PRESETS['pimaco-a4054-approx'];
  const labelsPerPage = preset.grid.columns * preset.grid.rows; // 2 * 10 = 20

  it('posição da primeira etiqueta (índice 0)', () => {
    const pos = getLabelPosition(preset, 0);
    expect(pos.pageIndex).toBe(0);
    expect(pos.indexOnPage).toBe(0);
    expect(pos.col).toBe(0);
    expect(pos.row).toBe(0);
    expect(pos.x).toBeCloseTo(preset.margins.left);
    
    const expectedTopY = preset.page.height - preset.margins.top;
    expect(pos.yTop).toBeCloseTo(expectedTopY);
    expect(pos.yBottom).toBeCloseTo(expectedTopY - preset.label.height);
  });

  it('posição da segunda coluna (índice 1)', () => {
    const pos = getLabelPosition(preset, 1);
    expect(pos.col).toBe(1);
    expect(pos.row).toBe(0);
    expect(pos.x).toBeCloseTo(preset.margins.left + preset.label.width + preset.gap.horizontal);
  });

  it('posição da segunda linha (índice 2)', () => {
    const pos = getLabelPosition(preset, 2);
    expect(pos.col).toBe(0);
    expect(pos.row).toBe(1);
    const expectedTopY = preset.page.height - (preset.margins.top + preset.label.height + preset.gap.vertical);
    expect(pos.yTop).toBeCloseTo(expectedTopY);
  });

  it('posição da última etiqueta da primeira página', () => {
    const pos = getLabelPosition(preset, labelsPerPage - 1);
    expect(pos.pageIndex).toBe(0);
    expect(pos.indexOnPage).toBe(19);
    expect(pos.col).toBe(1);
    expect(pos.row).toBe(9);
  });

  it('primeira etiqueta da segunda página', () => {
    const pos = getLabelPosition(preset, labelsPerPage);
    expect(pos.pageIndex).toBe(1);
    expect(pos.indexOnPage).toBe(0);
    expect(pos.col).toBe(0);
    expect(pos.row).toBe(0);
    expect(pos.yTop).toBeCloseTo(preset.page.height - preset.margins.top);
  });
});

describe('generateLabelsPdf', () => {
  const preset = LABEL_PRESETS['pimaco-a4054-approx'];
  const labelsPerPage = preset.grid.columns * preset.grid.rows;

  it('tamanho exato da página A4 em pontos e quantidade de etiquetas (grid)', async () => {
    const pdfBytes = await generateLabelsPdf({
      preset,
      items: [{ id: '1', name: 'Test 1' }],
    });

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);

    const page = doc.getPages()[0];
    const { width, height } = page.getSize();
    
    expect(Math.round(width)).toBe(Math.round(preset.page.width));
    expect(Math.round(height)).toBe(Math.round(preset.page.height));
  });

  it('startPosition = 0 cria páginas corretamente', async () => {
    const items = Array.from({ length: labelsPerPage + 5 }).map((_, i) => ({ id: String(i) }));
    const pdfBytes = await generateLabelsPdf({ preset, items, startPosition: 0 });
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(2);
  });

  it('startPosition = labelsPerPage - 1 (última posição) vaza para próxima página com apenas 2 itens', async () => {
    const items = [{ id: 'A' }, { id: 'B' }];
    const pdfBytes = await generateLabelsPdf({ preset, items, startPosition: labelsPerPage - 1 });
    const doc = await PDFDocument.load(pdfBytes);
    // Item A na última pos da pág 1. Item B na primeira pos da pág 2.
    expect(doc.getPageCount()).toBe(2);
  });

  it('geração de grid completo sem itens não quebra e gera 1 página', async () => {
    const pdfBytes = await generateLabelsPdf({ preset, items: [], drawDebugGrid: true });
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('geração com exatas 600 etiquetas funciona', async () => {
    const items = Array.from({ length: 600 }).map((_, i) => ({ id: String(i) }));
    const pdfBytes = await generateLabelsPdf({ preset, items });
    const doc = await PDFDocument.load(pdfBytes);
    // 600 etiquetas / 20 = 30 páginas
    expect(doc.getPageCount()).toBe(30);
  });
});
