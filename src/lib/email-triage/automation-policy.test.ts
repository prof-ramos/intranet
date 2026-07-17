import { describe, expect, it } from 'vitest';
import { decideTriageAutomation } from './automation-policy';
import type { CorrelationAction, CorrelationContext } from './correlate';
import type { EmailTriageResult } from './schema';

const result = {
  categoria: 'juridico',
  exige_validacao_humana: false,
} as EmailTriageResult;

const insertNote: CorrelationAction = {
  type: 'insert_note',
  consultationId: 20,
  content: 'Nota operacional sintética.',
};

const deterministicContext: CorrelationContext = {
  associate: { id: 10 },
  consultations: [{ id: 20 }],
};

describe('decideTriageAutomation', () => {
  it.each<{
    name: string;
    modelRequiresReview: boolean;
    context: CorrelationContext | null;
    actions: CorrelationAction[];
  }>([
    {
      name: 'model requests review',
      modelRequiresReview: true,
      context: deterministicContext,
      actions: [insertNote],
    },
    {
      name: 'context is unavailable',
      modelRequiresReview: false,
      context: null,
      actions: [],
    },
    {
      name: 'sender is unknown',
      modelRequiresReview: false,
      context: { associate: null, consultations: [] },
      actions: [{ type: 'skip', reason: 'unknown sender' }],
    },
    {
      name: 'there are no open consultations',
      modelRequiresReview: false,
      context: { associate: { id: 10 }, consultations: [] },
      actions: [{ type: 'skip', reason: 'none open' }],
    },
    {
      name: 'multiple consultations are open',
      modelRequiresReview: false,
      context: { associate: { id: 10 }, consultations: [{ id: 20 }, { id: 21 }] },
      actions: [{ type: 'skip', reason: 'ambiguous' }],
    },
    {
      name: 'correlation skips despite one open consultation',
      modelRequiresReview: false,
      context: deterministicContext,
      actions: [{ type: 'skip', reason: 'not eligible' }],
    },
    {
      name: 'action targets a different consultation',
      modelRequiresReview: false,
      context: deterministicContext,
      actions: [{ ...insertNote, consultationId: 99 }],
    },
  ])('requires review when $name', ({ modelRequiresReview, context, actions }) => {
    expect(
      decideTriageAutomation(
        { ...result, exige_validacao_humana: modelRequiresReview },
        context,
        actions,
      ),
    ).toMatchObject({ requiresReview: true, actions: [] });
  });

  it('allows only the note derived from exactly one open consultation', () => {
    expect(decideTriageAutomation(result, deterministicContext, [insertNote])).toEqual({
      requiresReview: false,
      actions: [insertNote],
    });
  });
});
