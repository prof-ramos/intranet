import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { applyCorrelationActions } from './correlation-actions';
import { resolveSystemBotUser } from '@/lib/system-users';
import { addNoteService } from '@/lib/juridico/service';
import { createLogger } from '@/lib/logger';
import type { CorrelationAction } from './correlate';

vi.mock('@/lib/system-users', () => ({
  resolveSystemBotUser: vi.fn(),
}));

vi.mock('@/lib/juridico/service', () => ({
  addNoteService: vi.fn(),
}));

vi.mock('@/lib/logger', () => {
  const warn = vi.fn();
  const info = vi.fn();
  return {
    createLogger: vi.fn(() => ({ warn, info })),
  };
});

describe('applyCorrelationActions', () => {
  let mockWarn: Mock;
  let mockInfo: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    const logger = createLogger('correlation-actions');
    mockWarn = logger.warn as unknown as Mock;
    mockInfo = logger.info as unknown as Mock;
  });

  it('should skip notes and not throw if resolveSystemBotUser fails', async () => {
    const error = new Error('Bot user missing');
    vi.mocked(resolveSystemBotUser).mockRejectedValueOnce(error);

    const actions: CorrelationAction[] = [
      { type: 'insert_note', consultationId: 1, content: 'Test note' },
    ];

    await expect(applyCorrelationActions(actions)).resolves.toBeUndefined();

    expect(mockWarn).toHaveBeenCalledWith(
      'Failed to resolve system bot user (non-fatal, skipping notes).',
      {},
      error,
    );
    expect(addNoteService).not.toHaveBeenCalled();
  });

  it('should add note if resolveSystemBotUser succeeds', async () => {
    vi.mocked(resolveSystemBotUser).mockResolvedValueOnce(999);

    const actions: CorrelationAction[] = [
      { type: 'insert_note', consultationId: 1, content: 'Test note' },
    ];

    await expect(applyCorrelationActions(actions)).resolves.toBeUndefined();

    expect(addNoteService).toHaveBeenCalledWith({
      entityType: 'consultation',
      entityId: 1,
      content: 'Test note',
      createdBy: 999,
      isEscritorioResponse: false,
    });
    expect(mockInfo).toHaveBeenCalledWith('Nota criada por correlacao de triagem.', {
      consultationId: 1,
    });
  });

  it('should skip adding note if action is not insert_note', async () => {
    const actions: CorrelationAction[] = [{ type: 'skip', reason: 'Not relevant' }];

    await expect(applyCorrelationActions(actions)).resolves.toBeUndefined();

    expect(resolveSystemBotUser).not.toHaveBeenCalled();
    expect(addNoteService).not.toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalledWith('Correlacao ignorada.', { reason: 'Not relevant' });
  });

  it('should log and not throw if addNoteService throws', async () => {
    vi.mocked(resolveSystemBotUser).mockResolvedValueOnce(999);
    const error = new Error('Service unavailable');
    vi.mocked(addNoteService).mockRejectedValueOnce(error);

    const actions: CorrelationAction[] = [
      { type: 'insert_note', consultationId: 1, content: 'Test note' },
    ];

    await expect(applyCorrelationActions(actions)).resolves.toBeUndefined();

    expect(mockWarn).toHaveBeenCalledWith(
      'Failed to apply correlation action (non-fatal).',
      { actionType: 'insert_note' },
      error,
    );
  });
});
