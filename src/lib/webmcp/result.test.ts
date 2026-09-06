import { describe, expect, it } from 'vitest';
import { navigateResult, runTool, toolErrorResult, toolJsonResult } from './result';

describe('webmcp result helpers', () => {
  it('serializes dates in JSON results', () => {
    const result = toolJsonResult({ at: new Date('2026-09-04T15:00:00.000Z') });
    expect(result.content[0]?.text).toContain('2026-09-04T15:00:00.000Z');
  });

  it('wraps thrown errors as actionable text', () => {
    expect(toolErrorResult(new Error('Ofício inválido.'))).toEqual({
      content: [{ type: 'text', text: 'Erro: Ofício inválido.' }],
    });
  });

  it('surfaces success:false payloads as errors', async () => {
    const result = await runTool(async () => ({
      success: false,
      error: 'Muitas solicitações de IA.',
    }));
    expect(result.content[0]?.text).toBe('Erro: Muitas solicitações de IA.');
  });

  it('treats undefined action results as success', async () => {
    const result = await runTool(async () => undefined);
    expect(result.content[0]?.text).toContain('"success": true');
  });

  it('captures thrown errors from the action', async () => {
    const result = await runTool(async () => {
      throw new Error('ID do oficial inválido.');
    });
    expect(result.content[0]?.text).toBe('Erro: ID do oficial inválido.');
  });

  it('describes a navigation result', () => {
    const result = navigateResult('/app/associados/novo', 'Abrindo o formulário.');
    expect(result.content[0]?.text).toContain('/app/associados/novo');
  });
});
