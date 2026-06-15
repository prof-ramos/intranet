import { mmToPoints } from './measurements';
import { getLabelsPerPage } from './templates';
import type { LabelLayoutOptions, LabelPosition, PimacoTemplate } from './types';

export function calculateLabelPosition(
  template: PimacoTemplate,
  labelIndex: number,
  options: LabelLayoutOptions = {},
): LabelPosition {
  const labelsPerPage = getLabelsPerPage(template);
  const startPosition = options.startPosition ?? 1;

  if (startPosition < 1 || startPosition > labelsPerPage) {
    throw new Error(`A posição inicial deve estar entre 1 e ${labelsPerPage}.`);
  }

  const absoluteIndex = labelIndex + startPosition - 1;
  const pageIndex = Math.floor(absoluteIndex / labelsPerPage);
  const indexOnPage = absoluteIndex % labelsPerPage;
  const row = Math.floor(indexOnPage / template.columns);
  const column = indexOnPage % template.columns;

  const width = mmToPoints(template.labelWidthMm);
  const height = mmToPoints(template.labelHeightMm);
  const x =
    mmToPoints(template.marginLeftMm + (options.offsetXmm ?? 0)) +
    column * mmToPoints(template.labelWidthMm + template.gapHorizontalMm);
  const yTop =
    mmToPoints(template.pageHeightMm) -
    mmToPoints(template.marginTopMm + (options.offsetYmm ?? 0)) -
    row * mmToPoints(template.labelHeightMm + template.gapVerticalMm);

  return { pageIndex, indexOnPage, row, column, x, y: yTop - height, width, height };
}

export function calculateLabelPositions(
  template: PimacoTemplate,
  count: number,
  options: LabelLayoutOptions = {},
): LabelPosition[] {
  return Array.from({ length: count }, (_, index) => calculateLabelPosition(template, index, options));
}
