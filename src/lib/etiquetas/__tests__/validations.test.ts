import { describe, expect, it } from 'vitest';
import {
  etiquetaGenerationInputSchema,
  etiquetaRouteRequestSchema,
  resolveFieldsForMode,
} from '@/lib/etiquetas/validations';
import type { EtiquetaFieldKey, EtiquetaPrintMode } from '@/lib/etiquetas/types';

describe('validações de etiquetas', () => {
  describe('resolveFieldsForMode', () => {
    const defaultsByMode: Array<[EtiquetaPrintMode, EtiquetaFieldKey[]]> = [
      [
        'postal',
        ['nome', 'endereco_completo', 'complemento', 'bairro', 'cidade_uf', 'cep'],
      ],
      ['mala_diplomatica', ['nome', 'lotacao']],
      ['custom', ['nome', 'lotacao', 'endereco_completo', 'cidade_uf', 'cep']],
    ];

    it('preserva uma seleção explícita não vazia', () => {
      const selectedFields: EtiquetaFieldKey[] = ['nome', 'email'];
      expect(resolveFieldsForMode('postal', selectedFields)).toEqual(['nome', 'email']);
    });

    it.each(defaultsByMode)(
      'usa os campos padrão de %s quando a seleção está ausente',
      (mode, expected) => {
        expect(resolveFieldsForMode(mode)).toEqual(expected);
      },
    );

    it.each(defaultsByMode)(
      'usa os campos padrão de %s quando a seleção está vazia',
      (mode, expected) => {
        expect(resolveFieldsForMode(mode, [])).toEqual(expected);
      },
    );
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
