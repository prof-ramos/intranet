import { describe, it, expect, vi } from 'vitest';
import { resolveModel, runWithAbort, extractText } from './gemini';
import { GeminiError } from './errors';
import { EMAIL_MODEL } from './constants';
import type { GenerateContentResponse } from '@google/genai';

describe('resolveModel', () => {
  it('should return fallback when model is undefined', () => {
    const result = resolveModel(undefined, EMAIL_MODEL);
    expect(result).toBe(EMAIL_MODEL);
  });

  it('should return the model when it is allowed', () => {
    const result = resolveModel('gemini-2.5-flash', EMAIL_MODEL);
    expect(result).toBe('gemini-2.5-flash');
  });

  it('should throw GeminiError when model is not allowed', () => {
    expect(() => resolveModel('invalid-model-name', EMAIL_MODEL)).toThrow(
      new GeminiError('Modelo de IA não suportado.'),
    );
  });
});

describe('extractText', () => {
  it('should return text when generation is successful', () => {
    const response: GenerateContentResponse = {
      text: 'Texto gerado com sucesso',
      candidates: [{ finishReason: 'STOP' }],
    } as unknown as GenerateContentResponse;

    const result = extractText(response);
    expect(result).toBe('Texto gerado com sucesso');
  });

  it('should throw GeminiError when generation is blocked by content policy', () => {
    const response: GenerateContentResponse = {
      promptFeedback: { blockReason: 'SAFETY' },
    } as unknown as GenerateContentResponse;

    expect(() => extractText(response)).toThrow(
      /A geração foi bloqueada pela política de conteúdo \(SAFETY\)\./,
    );
  });

  it('should throw GeminiError when generation is interrupted with bad finishReason', () => {
    const response: GenerateContentResponse = {
      candidates: [{ finishReason: 'OTHER' }],
    } as unknown as GenerateContentResponse;

    expect(() => extractText(response)).toThrow(
      /A geração foi interrompida \(motivo: OTHER\)\./,
    );
  });

  it('should allow MAX_TOKENS finishReason', () => {
    const response: GenerateContentResponse = {
      text: 'Texto incompleto por limite',
      candidates: [{ finishReason: 'MAX_TOKENS' }],
    } as unknown as GenerateContentResponse;

    const result = extractText(response);
    expect(result).toBe('Texto incompleto por limite');
  });

  it('should throw GeminiError when returned text is empty', () => {
    const response: GenerateContentResponse = {
      text: '   ',
      candidates: [{ finishReason: 'STOP' }],
    } as unknown as GenerateContentResponse;

    expect(() => extractText(response)).toThrow(
      /O modelo retornou conteúdo vazio. Tente novamente./,
    );
  });
});

describe('runWithAbort', () => {
  it('should resolve with value if task completes before timeout', async () => {
    const task = vi.fn().mockResolvedValue('success-value');
    const result = await runWithAbort(task, 1000, 'timeout msg');
    expect(result).toBe('success-value');
    expect(task).toHaveBeenCalled();
  });

  it('should throw GeminiError if task times out', async () => {
    const task = (signal: AbortSignal) => {
      return new Promise<string>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    await expect(runWithAbort(task, 10, 'Tempo esgotado.')).rejects.toThrow(
      new GeminiError('Tempo esgotado.'),
    );
  });

  it('should rethrow non-abort errors thrown by the task', async () => {
    const task = vi.fn().mockRejectedValue(new Error('Network failure'));
    await expect(runWithAbort(task, 1000, 'timeout msg')).rejects.toThrow(
      'Network failure',
    );
  });

  it('should rethrow non-abort errors even if the controller was concurrently aborted', async () => {
    const task = (signal: AbortSignal) => {
      return new Promise<string>((_resolve, reject) => {
        // Simulates a scenario where a network error occurs, and concurrently the signal is aborted
        setTimeout(() => {
          // Trigger the abort signal manually to simulate the timeout racing
          const abortEvent = new Event('abort');
          Object.defineProperty(signal, 'aborted', { value: true, writable: true });
          signal.dispatchEvent(abortEvent);

          // But the SDK throws a normal API error instead of AbortError
          const apiError = new Error('API Rate Limit Exceeded');
          apiError.name = 'GoogleGenAIError';
          reject(apiError);
        }, 5);
      });
    };

    await expect(runWithAbort(task, 1000, 'timeout msg')).rejects.toThrow(
      'API Rate Limit Exceeded',
    );
  });
});
