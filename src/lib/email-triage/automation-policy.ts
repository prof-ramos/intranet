import type { CorrelationAction, CorrelationContext } from './correlate';
import type { EmailTriageResult } from './schema';

export type TriageAutomationDecision =
  | { requiresReview: true; reason: string; actions: [] }
  | { requiresReview: false; actions: [Extract<CorrelationAction, { type: 'insert_note' }>] };

/**
 * Determines whether code-derived facts authorize the single supported
 * automatic effect. Model output may require review, but never grants authority.
 */
export function decideTriageAutomation(
  result: EmailTriageResult,
  context: CorrelationContext | null,
  actions: CorrelationAction[],
): TriageAutomationDecision {
  if (result.exige_validacao_humana) {
    return { requiresReview: true, reason: 'modelo sinalizou necessidade de revisão', actions: [] };
  }

  if (context?.associate === null || context === null) {
    return {
      requiresReview: true,
      reason: 'remetente sem contexto cadastral confiável',
      actions: [],
    };
  }

  if (context.consultations.length !== 1) {
    return {
      requiresReview: true,
      reason: 'quantidade de consultas abertas não é determinística',
      actions: [],
    };
  }

  if (actions.length !== 1 || actions[0].type !== 'insert_note') {
    return {
      requiresReview: true,
      reason: 'correlação não autorizou nota operacional',
      actions: [],
    };
  }

  if (actions[0].consultationId !== context.consultations[0].id) {
    return {
      requiresReview: true,
      reason: 'ação inconsistente com o contexto resolvido',
      actions: [],
    };
  }

  return { requiresReview: false, actions: [actions[0]] };
}
