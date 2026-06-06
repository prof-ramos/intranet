import { describe, expect, it } from 'vitest';
import { correlate } from './correlate';
import type { EmailPayload, EmailTriageResult } from './schema';

const payload: EmailPayload = {
  message_id: 'msg-123',
  thread_id: 'thread-456',
  history_id: 'history-789',
  received_at: '2026-06-01T10:00:00Z',
  sender: 'Associado <associado@example.com>',
  original_recipient: 'controller@asof.org.br',
  subject: 'Atualizacao de demanda',
  body_hash: 'hash',
  body_excerpt: '[short-body-redacted; sha256 stored]',
  analysis_excerpt: 'Responder ate 10/06/2026.',
  attachments: [],
};

const result: EmailTriageResult = {
  categoria: 'juridico',
  resumo: 'Demanda juridica recebida para acompanhamento operacional.',
  thread_context_summary: null,
  ha_prazo: true,
  prazo_data: '2026-06-10',
  prazo_hora: null,
  prazo_confianca_data: 'alta',
  tipo_prazo: 'resposta',
  trecho_fonte_do_prazo: 'Responder ate 10/06/2026.',
  resumo_anexos: [],
  source_evidence: [
    {
      tipo: 'corpo_email',
      referencia: 'body',
      trecho: 'Responder ate 10/06/2026.',
    },
  ],
  nivel_risco: 'medio',
  confianca: 'alta',
  acao_recomendada: 'Registrar prazo e acompanhar demanda.',
  responsavel_sugerido: 'juridico',
  advogado_nome: null,
  advogado_email: null,
  exige_validacao_humana: false,
  legal_basis: 'interesse_legitimo',
  processed_purpose: 'controle operacional de demanda interna',
};

describe('correlate', () => {
  it('creates one operational note action for exactly one open consultation', () => {
    const actions = correlate(payload, result, {
      associate: { id: 10 },
      consultations: [{ id: 20 }],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: 'insert_note',
      consultationId: 20,
    });
    expect(actions[0].type === 'insert_note' ? actions[0].content : '').toContain(
      'Triagem Operacional de E-mail',
    );
    expect(actions[0].type === 'insert_note' ? actions[0].content : '').toContain(
      'Nao representa decisao de merito juridico',
    );
    expect(actions[0].type === 'insert_note' ? actions[0].content : '').not.toContain(
      payload.sender,
    );
  });

  it('escapes markdown control characters in the AI resumo', () => {
    const maliciousResult: EmailTriageResult = {
      ...result,
      resumo: '[click](javascript:alert(1))',
    };

    const actions = correlate(payload, maliciousResult, {
      associate: { id: 10 },
      consultations: [{ id: 20 }],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: 'insert_note' });
    const content = actions[0].type === 'insert_note' ? actions[0].content : '';
    expect(content).toContain('\\[click\\]\\(javascript:alert\\(1\\)\\)');
    expect(content).not.toContain('[click](javascript:alert(1))');
  });

  it('skips when multiple open consultations make correlation ambiguous', () => {
    const actions = correlate(payload, result, {
      associate: { id: 10 },
      consultations: [{ id: 20 }, { id: 21 }],
    });

    expect(actions).toEqual([
      {
        type: 'skip',
        reason: 'ambíguo — 2 consultas abertas; coordenador deve vincular',
      },
    ]);
  });

  it('skips when sender is not a known associate', () => {
    const actions = correlate(payload, result, {
      associate: null,
      consultations: [],
    });

    expect(actions).toEqual([
      {
        type: 'skip',
        reason: 'remetente não é associado cadastrado',
      },
    ]);
  });
});
