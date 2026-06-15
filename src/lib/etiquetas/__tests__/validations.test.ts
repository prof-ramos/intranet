import { describe, expect, it } from 'vitest';
import { etiquetaGenerationInputSchema, etiquetaRouteRequestSchema } from '@/lib/etiquetas/validations';

describe('validações de etiquetas', () => {
  it('valida startPosition contra o template selecionado', () => {
    const parsed = etiquetaGenerationInputSchema.safeParse({
      templateCode: '6182',
      mode: 'postal',
      recipients: [{ id: '1', nome: 'Maria Silva' }],
      startPosition: 17,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['startPosition']);
    }
  });

  it('aceita rota com IDs de associados', () => {
    const parsed = etiquetaRouteRequestSchema.safeParse({
      templateCode: 'A4256',
      mode: 'mala_diplomatica',
      recipientIds: [1, 2],
    });

    expect(parsed.success).toBe(true);
  });

  it('aceita rota com recipients normalizados', () => {
    const parsed = etiquetaRouteRequestSchema.safeParse({
      templateCode: '3080',
      mode: 'postal',
      recipients: [{ id: '1', nome: 'Maria Silva' }],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejeita rota com IDs e recipients ao mesmo tempo', () => {
    const parsed = etiquetaRouteRequestSchema.safeParse({
      templateCode: '3080',
      mode: 'postal',
      recipientIds: [1],
      recipients: [{ id: '1', nome: 'Maria Silva' }],
    });

    expect(parsed.success).toBe(false);
  });
});
