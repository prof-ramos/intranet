import type { PimacoTemplate, PimacoTemplateCode } from './types';

export const PIMACO_TEMPLATES: Record<PimacoTemplateCode, PimacoTemplate> = {
  '6182': {
    code: '6182',
    name: 'Pimaco 6182',
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 99.1,
    labelHeightMm: 33.9,
    marginLeftMm: 4.7,
    marginTopMm: 12.9,
    gapHorizontalMm: 2.8,
    gapVerticalMm: 0,
    columns: 2,
    rows: 8,
    description: '16 etiquetas por folha A4 para endereçamento postal.',
  },
  '3080': {
    code: '3080',
    name: 'Pimaco 3080',
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    marginLeftMm: 4.7,
    marginTopMm: 10.7,
    gapHorizontalMm: 2.8,
    gapVerticalMm: 0,
    columns: 2,
    rows: 7,
    description: '14 etiquetas por folha A4, com área vertical maior.',
  },
  A4256: {
    code: 'A4256',
    name: 'Pimaco A4256',
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 63.5,
    labelHeightMm: 25.4,
    marginLeftMm: 7.2,
    marginTopMm: 8.8,
    gapHorizontalMm: 2.6,
    gapVerticalMm: 0,
    columns: 3,
    rows: 11,
    description: '33 etiquetas por folha A4 para volumes menores.',
  },
};

export function getPimacoTemplate(code: PimacoTemplateCode): PimacoTemplate {
  const template = PIMACO_TEMPLATES[code];
  if (!template) {
    throw new Error('Modelo Pimaco não suportado.');
  }
  return template;
}

export function getLabelsPerPage(template: PimacoTemplate): number {
  return template.columns * template.rows;
}
