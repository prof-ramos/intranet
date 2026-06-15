import { etiquetaGenerationInputSchema } from './validations';
import { formatEtiquetaLines } from './formatter';
import { generateEtiquetasPdf } from './pdf';
import type { EtiquetaGenerationInput, EtiquetaRecipient, LabelContent } from './types';

export function buildLabelsFromRecipients(input: EtiquetaGenerationInput): LabelContent[] {
  const validated = etiquetaGenerationInputSchema.parse(input);
  return formatEtiquetaLines(validated);
}

export async function generateEtiquetasFromRecipients(input: EtiquetaGenerationInput): Promise<Uint8Array> {
  const validated = etiquetaGenerationInputSchema.parse(input);
  const labels = formatEtiquetaLines(validated);
  return generateEtiquetasPdf({
    templateCode: validated.templateCode,
    labels,
    startPosition: validated.startPosition,
    offsetXmm: validated.offsetXmm,
    offsetYmm: validated.offsetYmm,
    debug: validated.debug,
  });
}

export async function generateEtiquetasFromLabels(
  input: Omit<EtiquetaGenerationInput, 'recipients'> & { labels: LabelContent[] },
): Promise<Uint8Array> {
  return generateEtiquetasPdf({
    templateCode: input.templateCode,
    labels: input.labels,
    startPosition: input.startPosition,
    offsetXmm: input.offsetXmm,
    offsetYmm: input.offsetYmm,
    debug: input.debug,
  });
}

export type { EtiquetaRecipient };
