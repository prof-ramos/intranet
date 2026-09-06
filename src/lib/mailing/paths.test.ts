import { describe, expect, it } from 'vitest';
import { campaignEtiquetasDownloadPath } from './paths';

describe('campaignEtiquetasDownloadPath', () => {
  it('aponta o PDF para a rota gerar existente', () => {
    expect(campaignEtiquetasDownloadPath(12, 'pdf')).toBe('/app/mala-direta/12/etiquetas/gerar');
  });

  it('aponta o CSV para a rota csv', () => {
    expect(campaignEtiquetasDownloadPath(12, 'csv')).toBe('/app/mala-direta/12/etiquetas/csv');
  });
});
