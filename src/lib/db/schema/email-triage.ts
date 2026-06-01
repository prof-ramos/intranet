import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { admins } from './admins';

export const emailCategoria = pgEnum('email_categoria', [
  'juridico',
  'administrativo',
  'financeiro',
  'institucional',
  'comunicacao',
  'irrelevante',
]);

export const emailTipoPrazo = pgEnum('email_tipo_prazo', [
  'processual',
  'administrativo',
  'contratual',
  'financeiro',
  'reuniao',
  'resposta',
  'outro',
]);

export const emailNivelRisco = pgEnum('email_nivel_risco', ['baixo', 'medio', 'alto', 'critico']);

export const emailConfianca = pgEnum('email_confianca', ['baixa', 'media', 'alta']);

export const emailResponsavel = pgEnum('email_responsavel', [
  'juridico',
  'administrativo',
  'financeiro',
  'diretoria',
]);

export const emailStatusTriagem = pgEnum('email_status_triagem', [
  'novo',
  'analisado',
  'aguardando_validacao',
  'validado',
  'em_andamento',
  'concluido',
  'vencido',
  'arquivado',
  'erro_validacao_ia',
  'erro_processamento_anexo',
  'aguardando_reprocessamento',
  'descartado_por_irrelevancia',
  'pendente_validacao_lgpd',
]);

export type EmailAttachmentSummary = {
  filename: string;
  mime_type: string | null;
  sha256: string | null;
  resumo: string;
  ha_prazo_no_anexo: boolean;
  trechos_relevantes: string[];
};

export type EmailSourceEvidence = {
  tipo: 'corpo_email' | 'anexo' | 'cabecalho' | 'thread';
  referencia: string;
  trecho: string;
};

export const emailTriagens = pgTable(
  'email_triagens',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    messageId: varchar('message_id', { length: 255 }).notNull().unique(),
    threadId: varchar('thread_id', { length: 255 }).notNull(),
    historyId: varchar('history_id', { length: 255 }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    sender: varchar('sender', { length: 512 }).notNull(),
    originalRecipient: varchar('original_recipient', { length: 512 }),
    subject: varchar('subject', { length: 1000 }).notNull(),
    bodyHash: char('body_hash', { length: 64 }).notNull(),
    bodyExcerpt: text('body_excerpt').notNull(),
    rawBodyStored: boolean('raw_body_stored').notNull().default(false),
    redactionApplied: boolean('redaction_applied').notNull().default(true),
    categoria: emailCategoria('categoria').notNull(),
    resumo: text('resumo').notNull(),
    threadContextSummary: text('thread_context_summary'),
    haPrazo: boolean('ha_prazo').notNull().default(false),
    prazoData: date('prazo_data'),
    prazoHora: time('prazo_hora'),
    prazoConfiancaData: emailConfianca('prazo_confianca_data'),
    tipoPrazo: emailTipoPrazo('tipo_prazo'),
    trechoFonteDoPrazo: text('trecho_fonte_do_prazo'),
    resumoAnexos: jsonb('resumo_anexos')
      .$type<EmailAttachmentSummary[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sourceEvidence: jsonb('source_evidence')
      .$type<EmailSourceEvidence[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    attachmentsHashes: jsonb('attachments_hashes')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    nivelRisco: emailNivelRisco('nivel_risco').notNull(),
    confianca: emailConfianca('confianca').notNull(),
    acaoRecomendada: text('acao_recomendada').notNull(),
    responsavelSugerido: emailResponsavel('responsavel_sugerido'),
    exigeValidacaoHumana: boolean('exige_validacao_humana').notNull().default(true),
    legalBasis: varchar('legal_basis', { length: 100 })
      .notNull()
      .default('avaliacao_humana_necessaria'),
    processedPurpose: varchar('processed_purpose', { length: 255 }).notNull(),
    dataRetentionUntil: timestamp('data_retention_until', { withTimezone: true }),
    processingVersion: varchar('processing_version', { length: 100 })
      .notNull()
      .default('email-controller-mvp-v1'),
    modelName: varchar('model_name', { length: 255 }),
    modelResponseId: varchar('model_response_id', { length: 255 }),
    status: emailStatusTriagem('status').notNull().default('novo'),
    usuarioValidadorId: bigint('usuario_validador_id', { mode: 'number' }).references(
      () => admins.id,
      { onDelete: 'set null' },
    ),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
    observacoesValidacao: text('observacoes_validacao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_email_triagens_thread_id').on(table.threadId),
    index('idx_email_triagens_history_id').on(table.historyId),
    index('idx_email_triagens_status').on(table.status),
    index('idx_email_triagens_received_at').on(table.receivedAt.desc()),
    index('idx_email_triagens_prazo_data')
      .on(table.prazoData)
      .where(sql`${table.haPrazo} = true and ${table.prazoData} is not null`),
    index('idx_email_triagens_exige_validacao')
      .on(table.exigeValidacaoHumana)
      .where(sql`${table.exigeValidacaoHumana} = true`),
    index('idx_email_triagens_source_evidence_gin').using('gin', table.sourceEvidence),
    index('idx_email_triagens_resumo_anexos_gin').using('gin', table.resumoAnexos),
    check('chk_email_triagens_body_hash_sha256', sql`${table.bodyHash} ~ '^[a-f0-9]{64}$'`),
    check('chk_email_triagens_body_excerpt_len', sql`char_length(${table.bodyExcerpt}) <= 600`),
    check(
      'chk_email_triagens_prazo_data_conf',
      sql`${table.prazoData} is null or ${table.prazoConfiancaData} is not null`,
    ),
    check(
      'chk_email_triagens_sem_prazo_sem_tipo',
      sql`${table.haPrazo} = true or (${table.prazoData} is null and ${table.prazoHora} is null and ${table.prazoConfiancaData} is null and ${table.tipoPrazo} is null and ${table.trechoFonteDoPrazo} is null)`,
    ),
    check(
      'chk_email_triagens_prazo_com_evidencia',
      sql`${table.haPrazo} = false or jsonb_array_length(${table.sourceEvidence}) > 0`,
    ),
  ],
);

export type EmailTriagem = typeof emailTriagens.$inferSelect;
export type NewEmailTriagem = typeof emailTriagens.$inferInsert;
