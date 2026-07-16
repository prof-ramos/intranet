import { describe, expect, it } from 'vitest';
import {
  etiquetaGenerationInputSchema,
  etiquetaRouteRequestSchema,
  resolveFieldsForMode,
  DEFAULT_FIELDS_BY_MODE,
} from '@/lib/etiquetas/validations';
import type { EtiquetaFieldKey } from '@/lib/etiquetas/types';

describe('validações de etiquetas', () => {
  describe('resolveFieldsForMode', () => {
    it('retorna os campos selecionados quando fornecidos e não vazios', () => {
      const selectedFields: EtiquetaFieldKey[] = ['nome', 'email'];
      const result = resolveFieldsForMode('postal', selectedFields);
      expect(result).toEqual(['nome', 'email']);
    });

    it('faz fallback para campos padrão do modo quando selectedFields é undefined', () => {
      const resultPostal = resolveFieldsForMode('postal');
      expect(resultPostal).toEqual(DEFAULT_FIELDS_BY_MODE['postal']);

      const resultMala = resolveFieldsForMode('mala_diplomatica');
      expect(resultMala).toEqual(DEFAULT_FIELDS_BY_MODE['mala_diplomatica']);

      const resultCustom = resolveFieldsForMode('custom');
      expect(resultCustom).toEqual(DEFAULT_FIELDS_BY_MODE['custom']);
    });

    it('faz fallback para campos padrão do modo quando selectedFields é um array vazio', () => {
      const result = resolveFieldsForMode('postal', []);
      expect(result).toEqual(DEFAULT_FIELDS_BY_MODE['postal']);
    });
  });

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
