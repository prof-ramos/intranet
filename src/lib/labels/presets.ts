import type { LabelPreset } from './types';

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
  'pimaco-a4048-approx': {
    id: 'pimaco-a4048-approx',
    name: 'A4048/A4248/A4348 (102 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(3.1),
      height: cmToPt(1.7),
    },
    grid: {
      columns: 6,
      rows: 17,
    },
    margins: {
      top: cmToPt(0.4),
      left: cmToPt(1.25),
    },
    gap: {
      horizontal: cmToPt(0.2),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4049-approx': {
    id: 'pimaco-a4049-approx',
    name: 'A4049/A4249/A4349 (133 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(2.6),
      height: cmToPt(1.5),
    },
    grid: {
      columns: 7,
      rows: 19,
    },
    margins: {
      top: cmToPt(0.6),
      left: cmToPt(1.35),
    },
    gap: {
      horizontal: cmToPt(0.2),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4050-approx': {
    id: 'pimaco-a4050-approx',
    name: 'A4050/A4250/A4350 (10 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(9.9),
      height: cmToPt(5.58),
    },
    grid: {
      columns: 2,
      rows: 5,
    },
    margins: {
      top: cmToPt(0.9),
      left: cmToPt(0.47),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4051-approx': {
    id: 'pimaco-a4051-approx',
    name: 'A4051/A4251/A4351 (70 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(3.82),
      height: cmToPt(2.12),
    },
    grid: {
      columns: 5,
      rows: 14,
    },
    margins: {
      top: cmToPt(1.07),
      left: cmToPt(0.45),
    },
    gap: {
      horizontal: cmToPt(0.25),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4054-approx': {
    id: 'pimaco-a4054-approx',
    name: 'A4054/A4254/A4354/A4054R (22 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(9.9),
      height: cmToPt(2.54),
    },
    grid: {
      columns: 2,
      rows: 11,
    },
    margins: {
      top: cmToPt(0.88),
      left: cmToPt(0.47),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4055-approx': {
    id: 'pimaco-a4055-approx',
    name: 'A4055/A4255/A4355 (27 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(6.35),
      height: cmToPt(3.1),
    },
    grid: {
      columns: 3,
      rows: 9,
    },
    margins: {
      top: cmToPt(0.9),
      left: cmToPt(0.72),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4056-approx': {
    id: 'pimaco-a4056-approx',
    name: 'A4056/A4256/A4356/A4056R (33 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(6.35),
      height: cmToPt(2.54),
    },
    grid: {
      columns: 3,
      rows: 11,
    },
    margins: {
      top: cmToPt(0.88),
      left: cmToPt(0.72),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4060-approx': {
    id: 'pimaco-a4060-approx',
    name: 'A4060/A4260/A4360 (21 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(6.35),
      height: cmToPt(3.81),
    },
    grid: {
      columns: 3,
      rows: 7,
    },
    margins: {
      top: cmToPt(1.52),
      left: cmToPt(0.72),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4261-approx': {
    id: 'pimaco-a4261-approx',
    name: 'A4261/A4361 (18 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(6.35),
      height: cmToPt(4.65),
    },
    grid: {
      columns: 3,
      rows: 6,
    },
    margins: {
      top: cmToPt(0.91),
      left: cmToPt(0.72),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4062-approx': {
    id: 'pimaco-a4062-approx',
    name: 'A4062/A4262/A4362 (16 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(9.9),
      height: cmToPt(3.39),
    },
    grid: {
      columns: 2,
      rows: 8,
    },
    margins: {
      top: cmToPt(1.29),
      left: cmToPt(0.47),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4063-approx': {
    id: 'pimaco-a4063-approx',
    name: 'A4063/A4263/A4363/A4063R (14 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(9.9),
      height: cmToPt(3.81),
    },
    grid: {
      columns: 2,
      rows: 7,
    },
    margins: {
      top: cmToPt(1.52),
      left: cmToPt(0.47),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4264-approx': {
    id: 'pimaco-a4264-approx',
    name: 'A4264/A4364 (12 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(6.35),
      height: cmToPt(7.19),
    },
    grid: {
      columns: 3,
      rows: 4,
    },
    margins: {
      top: cmToPt(0.47),
      left: cmToPt(0.72),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4265-approx': {
    id: 'pimaco-a4265-approx',
    name: 'A4265/A4365 (8 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(9.9),
      height: cmToPt(6.78),
    },
    grid: {
      columns: 2,
      rows: 4,
    },
    margins: {
      top: cmToPt(1.3),
      left: cmToPt(0.47),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4266-approx': {
    id: 'pimaco-a4266-approx',
    name: 'A4266/A4366 (6 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(9.9),
      height: cmToPt(9.3),
    },
    grid: {
      columns: 2,
      rows: 3,
    },
    margins: {
      top: cmToPt(0.9),
      left: cmToPt(0.47),
    },
    gap: {
      horizontal: cmToPt(0.26),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4067-approx': {
    id: 'pimaco-a4067-approx',
    name: 'A4067/A4267/A4367 (1 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(20),
      height: cmToPt(28.85),
    },
    grid: {
      columns: 1,
      rows: 1,
    },
    margins: {
      top: cmToPt(0.43),
      left: cmToPt(0.5),
    },
    gap: {
      horizontal: cmToPt(0),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4268-approx': {
    id: 'pimaco-a4268-approx',
    name: 'A4268/A4368 (2 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(19.99),
      height: cmToPt(14.34),
    },
    grid: {
      columns: 1,
      rows: 2,
    },
    margins: {
      top: cmToPt(0.51),
      left: cmToPt(0.51),
    },
    gap: {
      horizontal: cmToPt(0),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4291f-approx': {
    id: 'pimaco-a4291f-approx',
    name: 'A4291F (12 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(7.62),
      height: cmToPt(4.64),
    },
    grid: {
      columns: 2,
      rows: 6,
    },
    margins: {
      top: cmToPt(0.93),
      left: cmToPt(2.75),
    },
    gap: {
      horizontal: cmToPt(0.25),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4291l-approx': {
    id: 'pimaco-a4291l-approx',
    name: 'A4291L (17 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(14.5),
      height: cmToPt(1.7),
    },
    grid: {
      columns: 1,
      rows: 17,
    },
    margins: {
      top: cmToPt(1.25),
      left: cmToPt(3.25),
    },
    gap: {
      horizontal: cmToPt(0),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4292-approx': {
    id: 'pimaco-a4292-approx',
    name: 'A4292 (10 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(7),
      height: cmToPt(5.2),
    },
    grid: {
      columns: 2,
      rows: 5,
    },
    margins: {
      top: cmToPt(1.85),
      left: cmToPt(2.33),
    },
    gap: {
      horizontal: cmToPt(2.33),
      vertical: cmToPt(0),
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
  },
  'pimaco-a4293-approx': {
    id: 'pimaco-a4293-approx',
    name: 'A4293 (24 etiq. - APROXIMADO)',
    page: {
      width: cmToPt(21), // A4
      height: cmToPt(29.7), // A4
      unit: 'pt',
    },
    label: {
      width: cmToPt(2.97),
      height: cmToPt(2.97),
    },
    grid: {
      columns: 4,
      rows: 6,
    },
    margins: {
      top: cmToPt(2.36),
      left: cmToPt(2.12),
    },
    gap: {
      horizontal: cmToPt(1.63),
      vertical: cmToPt(1.43),
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
  },
};
