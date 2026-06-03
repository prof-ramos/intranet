import type { EmailPayload, EmailTriageResult } from './schema';

export type CorrelationContext = {
  associate: { id: number } | null;
  consultations: Array<{ id: number }>;
};

export type CorrelationAction =
  | { type: 'insert_note'; consultationId: number; content: string }
  | { type: 'skip'; reason: string };

/**
 * Pure correlation decision function.
 *
 * Rules (applied in order):
 *  1. Only correlate juridico and administrativo categories.
 *  2. Remetente must be a known Associado.
 *  3. Associado must have exactly one open Consulta Jurídica.
 *
 * Returns a list of actions for the orchestrator to apply. Never performs I/O.
 */
export function correlate(
  payload: EmailPayload,
  result: EmailTriageResult,
  context: CorrelationContext,
): CorrelationAction[] {
  if (result.categoria !== 'juridico' && result.categoria !== 'administrativo') {
    return [{ type: 'skip', reason: `categoria '${result.categoria}' não correlaciona` }];
  }

  if (context.associate === null) {
    return [{ type: 'skip', reason: 'remetente não é associado cadastrado' }];
  }

  if (context.consultations.length === 0) {
    return [{ type: 'skip', reason: 'associado sem consultas jurídicas abertas' }];
  }

  if (context.consultations.length > 1) {
    return [
      {
        type: 'skip',
        reason: `ambíguo — ${context.consultations.length} consultas abertas; coordenador deve vincular`,
      },
    ];
  }

  return [
    {
      type: 'insert_note',
      consultationId: context.consultations[0].id,
      content: buildNoteContent(payload, result),
    },
  ];
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildNoteContent(payload: EmailPayload, result: EmailTriageResult): string {
  const lines: string[] = [
    '### Triagem Operacional de E-mail',
    '',
    'Registro automatico para acompanhamento interno de prazo/demanda. Nao representa decisao de merito juridico, resposta oficial, arquivamento ou conclusao.',
    '',
  ];

  lines.push(`**Categoria:** ${result.categoria}`);
  lines.push(`**Resumo:** ${escapeMarkdown(result.resumo)}`);

  if (result.ha_prazo) {
    const parts: string[] = ['Sim'];
    if (result.prazo_data) parts.push(result.prazo_data);
    if (result.prazo_hora) parts.push(result.prazo_hora);
    if (result.tipo_prazo) parts.push(`(${result.tipo_prazo})`);
    lines.push(`**Prazo:** ${parts.join(' · ')}`);
  } else {
    lines.push('**Prazo:** Não');
  }

  lines.push(`**Nível de Risco:** ${result.nivel_risco} · **Confiança:** ${result.confianca}`);
  lines.push(`**Ação Recomendada:** ${result.acao_recomendada}`);

  if (result.responsavel_sugerido) {
    lines.push(`**Responsável Sugerido:** ${result.responsavel_sugerido}`);
  }

  lines.push('');
  lines.push(`*Origem: e-mail processado automaticamente · Message-ID: ${payload.message_id}*`);

  return lines.join('\n');
}
