import type { LabelPreset } from './types';

// Função auxiliar para converter centímetros em pontos PDF (1 cm = ~28.3465 pt)
const cmToPt = (cm: number) => cm * 28.3465;

/**
 * Presets de Etiquetas Pimaco.
 * 
 * TODO_VERIFY_WITH_PRINT_TEST: As medidas abaixo do A4054 são *aproximações teóricas*.
 * É OBRIGATÓRIO imprimir uma página de teste para calibrar e verificar o comportamento físico 
 * (verificar se a impressora local não está introduzindo margens invisíveis ou reduzindo a página)
 * antes do uso oficial em produção.
 */
export const LABEL_PRESETS: Record<string, LabelPreset> = {
  'pimaco-a4054-approx': {
    id: 'pimaco-a4054-approx',
    name: 'Pimaco A4054 (APROXIMADO - Requer Calibração Física)',
    page: {
      width: cmToPt(21), // A4: 21 cm (595.28 pt)
      height: cmToPt(29.7), // A4: 29.7 cm (841.89 pt)
    },
    margins: {
      top: cmToPt(0.88),
      left: cmToPt(0.47),
    },
    label: {
      width: cmToPt(9.90),
      height: cmToPt(2.54),
    },
    gap: {
      horizontal: cmToPt(0.26), // 10.16 - 9.90
      vertical: cmToPt(0), // 2.54 - 2.54
    },
    grid: {
      columns: 2,
      rows: 10,
    },
    padding: {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    },
    text: {
      fontName: 'Helvetica',
      fontSize: 10,
      lineHeight: 12,
      maxLines: 4,
    },
  },
};
