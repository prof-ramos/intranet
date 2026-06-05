import { describe, expect, it, afterAll } from 'vitest';
import postgres from 'postgres';
import { persistTriage, persistFailure } from './persister';
import type { EmailPayload, EmailTriageResult } from './schema';
import { EMAIL_TRIAGE_VERSION } from './system-prompt';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL must be set for email-triage persister integration tests.',
  );
}

const sql = postgres(databaseUrl, { max: 1 });

afterAll(async () => {
  await sql.end();
});

function makePayload(
  overrides: Partial<EmailPayload> & { message_id: string },
): EmailPayload {
  return {
    thread_id: 'test-thread-default',
    history_id: 'test-history-default',
    received_at: '2026-06-01T10:00:00Z',
    sender: 'associado@example.com',
    original_recipient: 'asof@asof.org.br',
    subject: 'Assunto de teste',
    body_hash: 'a'.repeat(64),
    body_excerpt: 'Corpo do email de teste para integracao.',
    analysis_excerpt: 'Trecho de analise para teste.',
    attachments: [],
    ...overrides,
  };
}

function makeResult(
  overrides: Partial<EmailTriageResult> = {},
): EmailTriageResult {
  return {
    categoria: 'juridico',
    resumo: 'Resumo do email de teste para integracao.',
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
    acao_recomendada: 'Nenhuma acao necessaria.',
    responsavel_sugerido: null,
    exige_validacao_humana: false,
    legal_basis: 'interesse_legitimo',
    processed_purpose: 'teste de integracao.',
    ...overrides,
  };
}

describe('email-triage persister integration', () => {
  const testMessageIds: string[] = [];

  afterAll(async () => {
    if (testMessageIds.length > 0) {
      await sql`
        DELETE FROM email_triagens
        WHERE message_id IN ${sql(testMessageIds)}
      `;
    }
  });

  // ─── Test 1: Insert new triage record ───────────────────────────

  it('inserts a new triage record and persists all fields correctly', async () => {
    const messageId = `test-int-insert-${Date.now()}`;
    testMessageIds.push(messageId);

    const payload = makePayload({
      message_id: messageId,
      thread_id: 'thread-insert-001',
      subject: 'Teste insercao completa de campos',
      sender: 'remetente@test.com',
      original_recipient: 'destino@asof.org.br',
    });
    const result = makeResult({
      categoria: 'financeiro',
      resumo: 'Resumo para teste de insercao completa de todos os campos.',
      nivel_risco: 'medio',
      confianca: 'media',
      acao_recomendada: 'Encaminhar para o setor financeiro.',
      responsavel_sugerido: 'financeiro',
      exige_validacao_humana: true,
    });

    const id = await persistTriage(payload, result, 'test-model', 'resp-001');

    expect(id).toBeGreaterThan(0);

    const [row] = await sql`
      SELECT * FROM email_triagens WHERE id = ${id}
    `;
    expect(row).toBeDefined();

    // ── Identifiers ──
    expect(row.message_id).toBe(messageId);
    expect(row.thread_id).toBe('thread-insert-001');

    // ── Sender / recipient ──
    expect(row.sender).toBe('remetente@test.com');
    expect(row.original_recipient).toBe('destino@asof.org.br');
    expect(row.subject).toBe('Teste insercao completa de campos');

    // ── Body ──
    expect(row.body_hash).toBe('a'.repeat(64));
    expect(row.body_excerpt).toBe('Corpo do email de teste para integracao.');
    expect(row.raw_body_stored).toBe(false);
    expect(row.redaction_applied).toBe(true);

    // ── Classification ──
    expect(row.categoria).toBe('financeiro');
    expect(row.resumo).toBe(
      'Resumo para teste de insercao completa de todos os campos.',
    );
    expect(row.nivel_risco).toBe('medio');
    expect(row.confianca).toBe('media');
    expect(row.acao_recomendada).toBe('Encaminhar para o setor financeiro.');
    expect(row.responsavel_sugerido).toBe('financeiro');
    expect(row.exige_validacao_humana).toBe(true);

    // ── Deadline fields (all null since ha_prazo=false) ──
    expect(row.ha_prazo).toBe(false);
    expect(row.prazo_data).toBeNull();
    expect(row.prazo_hora).toBeNull();
    expect(row.prazo_confianca_data).toBeNull();
    expect(row.tipo_prazo).toBeNull();
    expect(row.trecho_fonte_do_prazo).toBeNull();
    expect(row.thread_context_summary).toBeNull();

    // ── JSON arrays ──
    expect(row.resumo_anexos).toEqual([]);
    expect(row.source_evidence).toEqual([]);
    expect(row.attachments_hashes).toEqual([]);

    // ── Processing metadata ──
    expect(row.status).toBe('aguardando_validacao');
    expect(row.model_name).toBe('test-model');
    expect(row.model_response_id).toBe('resp-001');
    expect(row.processing_version).toBe(EMAIL_TRIAGE_VERSION);
    expect(row.legal_basis).toBe('interesse_legitimo');
    expect(row.processed_purpose).toBe('teste de integracao.');
    expect(row.data_retention_until).toBeNull();

    // ── Timestamps ──
    expect(row.created_at).not.toBeNull();
    expect(row.updated_at).not.toBeNull();
  });

  // ─── Test 2: Upsert on duplicate message_id ────────────────────

  it('upserts on duplicate message_id and updates fields', async () => {
    const messageId = `test-int-upsert-${Date.now()}`;
    testMessageIds.push(messageId);

    // Insert initial record
    const payload1 = makePayload({
      message_id: messageId,
      subject: 'Primeiro assunto - juridico',
    });
    const result1 = makeResult({
      categoria: 'juridico',
      resumo: 'Primeiro resumo - juridico.',
      confianca: 'alta',
      nivel_risco: 'alto',
    });

    const id1 = await persistTriage(payload1, result1, 'model-v1', 'resp-001');

    // Verify initial insert
    let [row] = await sql`
      SELECT * FROM email_triagens WHERE id = ${id1}
    `;
    expect(row.categoria).toBe('juridico');
    expect(row.status).toBe('analisado');

    // Upsert with same message_id, different values
    const payload2 = makePayload({
      message_id: messageId,
      subject: 'Segundo assunto - administrativo',
      sender: 'outro-remetente@test.com',
    });
    const result2 = makeResult({
      categoria: 'administrativo',
      resumo: 'Segundo resumo - administrativo.',
      confianca: 'baixa',
      nivel_risco: 'medio',
      exige_validacao_humana: true,
    });

    const id2 = await persistTriage(payload2, result2, 'model-v2', 'resp-002');

    // Should be the same row (same id)
    expect(id2).toBe(id1);

    // Fetch and verify update
    [row] = await sql`
      SELECT * FROM email_triagens WHERE id = ${id2}
    `;

    // Fields that changed
    expect(row.categoria).toBe('administrativo');
    expect(row.resumo).toBe('Segundo resumo - administrativo.');
    expect(row.confianca).toBe('baixa');
    expect(row.nivel_risco).toBe('medio');
    expect(row.status).toBe('aguardando_validacao');
    expect(row.model_name).toBe('model-v2');
    expect(row.model_response_id).toBe('resp-002');
    expect(row.subject).toBe('Segundo assunto - administrativo');
    expect(row.sender).toBe('outro-remetente@test.com');

    // Should still be only one row for this message_id
    const count = await sql`
      SELECT COUNT(*)::int AS cnt FROM email_triagens WHERE message_id = ${messageId}
    `;
    expect(count[0].cnt).toBe(1);
  });

  // ─── Test 3: Upsert preserves fields not in the update set ────

  it('upsert preserves createdAt even after update', async () => {
    const messageId = `test-int-preserve-${Date.now()}`;
    testMessageIds.push(messageId);

    const payload = makePayload({ message_id: messageId });
    const result = makeResult();

    await persistTriage(payload, result, 'model-v1', 'resp-001');

    // Capture createdAt from the initial insert
    const [before] = await sql`
      SELECT created_at FROM email_triagens WHERE message_id = ${messageId}
    `;
    const createdAtBefore = new Date(before.created_at).getTime();

    // Small delay to ensure timestamps would differ if overwritten
    await new Promise((r) => setTimeout(r, 50));

    // Upsert with same message_id but different data
    const updatedResult = makeResult({
      categoria: 'administrativo',
      resumo: 'Resumo atualizado para testar preservacao de createdAt.',
    });
    await persistTriage(
      payload,
      updatedResult,
      'model-v2',
      'resp-002',
    );

    // Read createdAt again — must be unchanged
    const [after] = await sql`
      SELECT created_at, categoria, resumo
      FROM email_triagens
      WHERE message_id = ${messageId}
    `;
    const createdAtAfter = new Date(after.created_at).getTime();

    expect(createdAtAfter).toBe(createdAtBefore);

    // Other fields SHOULD have been updated
    expect(after.categoria).toBe('administrativo');
    expect(after.resumo).toBe(
      'Resumo atualizado para testar preservacao de createdAt.',
    );
  });

  // ─── Test 4: persistFailure creates failure record ────────────

  it('persistFailure creates a record with erro_validacao_ia status', async () => {
    const messageId = `test-int-fail-${Date.now()}`;
    testMessageIds.push(messageId);

    const payload = makePayload({ message_id: messageId });

    await persistFailure(
      payload,
      'Erro de parseamento do JSON retornado pela IA.',
      'test-model',
    );

    const [row] = await sql`
      SELECT * FROM email_triagens WHERE message_id = ${messageId}
    `;
    expect(row).toBeDefined();
    expect(row.status).toBe('erro_validacao_ia');
    expect(row.categoria).toBe('irrelevante');
    expect(row.exige_validacao_humana).toBe(true);
    expect(row.resumo).toContain('Falha na validacao');
    expect(row.resumo).toContain(
      'Erro de parseamento do JSON retornado pela IA.',
    );
    expect(row.model_name).toBe('test-model');
    expect(row.confianca).toBe('baixa');
    expect(row.nivel_risco).toBe('medio');
    expect(row.ha_prazo).toBe(false);
    expect(row.acao_recomendada).toBe(
      'Reprocessar e encaminhar para revisao operacional se persistir.',
    );
    expect(row.legal_basis).toBe('avaliacao_humana_necessaria');
  });

  // ─── Test 5: persistFailure does NOT overwrite valid record ───

  it('persistFailure does NOT overwrite an existing valid triage record', async () => {
    const messageId = `test-int-no-overwrite-${Date.now()}`;
    testMessageIds.push(messageId);

    // First create a valid triage record
    const payload = makePayload({
      message_id: messageId,
      subject: 'Registro valido que deve ser preservado',
    });
    const result = makeResult({
      categoria: 'juridico',
      resumo: 'Resumo do registro valido que precisa ser preservado apos tentativa de falha.',
      nivel_risco: 'alto',
      confianca: 'alta',
      exige_validacao_humana: true,
    });

    await persistTriage(payload, result, 'model-v1', 'resp-001');

    // Then try to persist a failure for the same message_id
    await persistFailure(
      payload,
      'Erro simulado que nao deve sobrescrever o registro valido.',
      'model-v2',
    );

    // Verify original record is preserved intact
    const [row] = await sql`
      SELECT * FROM email_triagens WHERE message_id = ${messageId}
    `;
    expect(row).toBeDefined();
    expect(row.status).toBe('aguardando_validacao');
    expect(row.categoria).toBe('juridico');
    expect(row.resumo).toBe(
      'Resumo do registro valido que precisa ser preservado apos tentativa de falha.',
    );
    expect(row.nivel_risco).toBe('alto');
    expect(row.confianca).toBe('alta');
    expect(row.model_name).toBe('model-v1');
    expect(row.model_response_id).toBe('resp-001');

    // Verify there's still only one row
    const count = await sql`
      SELECT COUNT(*)::int AS cnt FROM email_triagens WHERE message_id = ${messageId}
    `;
    expect(count[0].cnt).toBe(1);
  });
});
