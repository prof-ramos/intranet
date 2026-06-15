import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { generateEtiquetasFromRecipients } from '@/lib/etiquetas';
import { etiquetaGenerationInputSchema } from '@/lib/etiquetas/validations';

describe('PDF de etiquetas', () => {
  it('gera bytes válidos', async () => {
    const bytes = await generateEtiquetasFromRecipients({
      templateCode: '6182',
      mode: 'postal',
      recipients: [
        {
          id: '1',
          nome: 'Nome muito longo para testar quebra de linha controlada sem invadir a próxima etiqueta da folha',
          enderecoCompleto: 'Avenida muito longa, número 1234, complemento extenso, bloco administrativo',
          bairro: 'Centro',
          cidade: 'Brasília',
          uf: 'DF',
          cep: '70170900',
        },
      ],
      flags: { peo: true, ectOpenable: true },
      debug: false,
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe('Etiquetas ASOF');
  });

  it('gera PDF com debug', async () => {
    const bytes = await generateEtiquetasFromRecipients({
      templateCode: 'A4256',
      mode: 'mala_diplomatica',
      recipients: [{ id: '1', nome: 'Maria Silva', lotacao: 'SERE' }],
      debug: true,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });

  it('rejeita lista vazia', () => {
    const parsed = etiquetaGenerationInputSchema.safeParse({
      templateCode: '6182',
      mode: 'postal',
      recipients: [],
    });
    expect(parsed.success).toBe(false);
  });
});
