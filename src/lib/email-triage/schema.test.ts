import { describe, expect, it } from 'vitest';
import { emailTriageResultSchema, type EmailTriageResult } from './schema';

const baseResult: EmailTriageResult = {
  categoria: 'administrativo',
  resumo: 'Demanda recebida para acompanhamento operacional.',
  thread_context_summary: null,
  ha_prazo: false,
  prazo_data: null,
  prazo_hora: null,
  prazo_confianca_data: null,
  tipo_prazo: null,
  trecho_fonte_do_prazo: null,
  resumo_anexos: [],
  source_evidence: [],
  nivel_risco: 'baixo',
  confianca: 'alta',
  acao_recomendada: 'Registrar demanda para acompanhamento.',
  responsavel_sugerido: 'administrativo',
  exige_validacao_humana: false,
  legal_basis: 'interesse_legitimo',
  processed_purpose: 'controle operacional de demanda interna',
};

describe('emailTriageResultSchema', () => {
  it('accepts juridico triage without mandatory human validation', () => {
    const result = emailTriageResultSchema.safeParse({
      ...baseResult,
      categoria: 'juridico',
      nivel_risco: 'alto',
      confianca: 'media',
      responsavel_sugerido: 'juridico',
      acao_recomendada: 'Registrar prazo e demanda para acompanhamento operacional.',
    });

    expect(result.success).toBe(true);
  });

  it('accepts deadlines with evidence without mandatory human validation', () => {
    const result = emailTriageResultSchema.safeParse({
      ...baseResult,
      categoria: 'juridico',
      ha_prazo: true,
      prazo_data: '2026-06-10',
      prazo_confianca_data: 'baixa',
      tipo_prazo: 'resposta',
      trecho_fonte_do_prazo: 'Responder ate 10/06/2026.',
      source_evidence: [
        {
          tipo: 'corpo_email',
          referencia: 'body',
          trecho: 'Responder ate 10/06/2026.',
        },
      ],
      exige_validacao_humana: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects deadlines without source evidence', () => {
    const result = emailTriageResultSchema.safeParse({
      ...baseResult,
      ha_prazo: true,
      prazo_data: '2026-06-10',
      prazo_confianca_data: 'alta',
      tipo_prazo: 'resposta',
      trecho_fonte_do_prazo: 'Responder ate 10/06/2026.',
      source_evidence: [],
      exige_validacao_humana: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['source_evidence'],
          message: 'ha_prazo=true exige ao menos uma evidencia em source_evidence.',
        }),
      ]),
    );
  });
});
