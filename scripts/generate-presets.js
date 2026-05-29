const fs = require('fs');

const data = [
  { id: 'a4048', name: 'A4048/A4248/A4348', cols: 6, rows: 17, width: 3.1, height: 1.7, gapH: 0.2, gapV: 0, mLeft: 1.25, mTop: 0.4 },
  { id: 'a4049', name: 'A4049/A4249/A4349', cols: 7, rows: 19, width: 2.6, height: 1.5, gapH: 0.2, gapV: 0, mLeft: 1.35, mTop: 0.6 },
  { id: 'a4050', name: 'A4050/A4250/A4350', cols: 2, rows: 5, width: 9.9, height: 5.58, gapH: 0.26, gapV: 0, mLeft: 0.47, mTop: 0.9 },
  { id: 'a4051', name: 'A4051/A4251/A4351', cols: 5, rows: 14, width: 3.82, height: 2.12, gapH: 0.25, gapV: 0, mLeft: 0.45, mTop: 1.07 },
  { id: 'a4054', name: 'A4054/A4254/A4354/A4054R', cols: 2, rows: 11, width: 9.9, height: 2.54, gapH: 0.26, gapV: 0, mLeft: 0.47, mTop: 0.88 },
  { id: 'a4055', name: 'A4055/A4255/A4355', cols: 3, rows: 9, width: 6.35, height: 3.1, gapH: 0.26, gapV: 0, mLeft: 0.72, mTop: 0.9 },
  { id: 'a4056', name: 'A4056/A4256/A4356/A4056R', cols: 3, rows: 11, width: 6.35, height: 2.54, gapH: 0.26, gapV: 0, mLeft: 0.72, mTop: 0.88 },
  { id: 'a4060', name: 'A4060/A4260/A4360', cols: 3, rows: 7, width: 6.35, height: 3.81, gapH: 0.26, gapV: 0, mLeft: 0.72, mTop: 1.52 },
  { id: 'a4261', name: 'A4261/A4361', cols: 3, rows: 6, width: 6.35, height: 4.65, gapH: 0.26, gapV: 0, mLeft: 0.72, mTop: 0.91 },
  { id: 'a4062', name: 'A4062/A4262/A4362', cols: 2, rows: 8, width: 9.9, height: 3.39, gapH: 0.26, gapV: 0, mLeft: 0.47, mTop: 1.29 },
  { id: 'a4063', name: 'A4063/A4263/A4363/A4063R', cols: 2, rows: 7, width: 9.9, height: 3.81, gapH: 0.26, gapV: 0, mLeft: 0.47, mTop: 1.52 },
  { id: 'a4264', name: 'A4264/A4364', cols: 3, rows: 4, width: 6.35, height: 7.19, gapH: 0.26, gapV: 0, mLeft: 0.72, mTop: 0.47 },
  { id: 'a4265', name: 'A4265/A4365', cols: 2, rows: 4, width: 9.9, height: 6.78, gapH: 0.26, gapV: 0, mLeft: 0.47, mTop: 1.3 },
  { id: 'a4266', name: 'A4266/A4366', cols: 2, rows: 3, width: 9.9, height: 9.3, gapH: 0.26, gapV: 0, mLeft: 0.47, mTop: 0.9 },
  { id: 'a4067', name: 'A4067/A4267/A4367', cols: 1, rows: 1, width: 20, height: 28.85, gapH: 0, gapV: 0, mLeft: 0.5, mTop: 0.43 },
  { id: 'a4268', name: 'A4268/A4368', cols: 1, rows: 2, width: 19.99, height: 14.34, gapH: 0, gapV: 0, mLeft: 0.51, mTop: 0.51 },
  { id: 'a4291f', name: 'A4291F', cols: 2, rows: 6, width: 7.62, height: 4.64, gapH: 0.25, gapV: 0, mLeft: 2.75, mTop: 0.93 },
  { id: 'a4291l', name: 'A4291L', cols: 1, rows: 17, width: 14.5, height: 1.7, gapH: 0, gapV: 0, mLeft: 3.25, mTop: 1.25 },
  { id: 'a4292', name: 'A4292', cols: 2, rows: 5, width: 7, height: 5.2, gapH: 2.33, gapV: 0, mLeft: 2.33, mTop: 1.85 },
  { id: 'a4293', name: 'A4293', cols: 4, rows: 6, width: 2.97, height: 2.97, gapH: 1.63, gapV: 1.43, mLeft: 2.12, mTop: 2.36 }
];

let output = `import type { LabelPreset } from './types';

// Conversão cm para pt (1 cm = 28.3465 pt)
const cmToPt = (cm: number) => cm * 28.3465;

/**
 * Presets de Etiquetas Pimaco (Folhas A4)
 * 
 * TODO_VERIFY_WITH_PRINT_TEST: As medidas abaixo são *aproximações teóricas* 
 * extraídas de manuais. É OBRIGATÓRIO imprimir uma página de teste para calibrar
 * e verificar o comportamento físico (se a impressora não introduz margens 
 * invisíveis ou reduz a página) antes do uso oficial em produção.
 */
export const LABEL_PRESETS: Record<string, LabelPreset> = {
`;

for (const d of data) {
  const id = `pimaco-${d.id}-approx`;
  const labelsCount = d.cols * d.rows;
  output += `  '${id}': {
    id: '${id}',
    name: '${d.name} (${labelsCount} etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(${d.width}),
      height: cmToPt(${d.height}),
    },
    grid: {
      columns: ${d.cols},
      rows: ${d.rows},
    },
    margins: {
      top: cmToPt(${d.mTop}),
      left: cmToPt(${d.mLeft}),
    },
    gap: {
      horizontal: cmToPt(${d.gapH}),
      vertical: cmToPt(${d.gapV}),
    },
    padding: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
    text: {
      fontSize: 10,
      lineHeight: 12,
      maxLines: 4,
      fontName: 'Helvetica',
    },
  },\n`;
}

output += `};\n`;

fs.writeFileSync('src/lib/labels/presets.ts', output);
