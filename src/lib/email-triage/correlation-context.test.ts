import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCorrelationContext } from './correlation-context';

const mockExtractSenderEmailForCorrelation = vi.fn();
const mockPiiBlindIndex = vi.fn();
const mockFindAssociateWithOpenConsultationsByEmailHash = vi.fn();

vi.mock('./address', () => ({
  extractSenderEmailForCorrelation: (...args: unknown[]) =>
    mockExtractSenderEmailForCorrelation(...args),
}));

vi.mock('@/lib/crypto/pii', () => ({
  piiBlindIndex: (...args: unknown[]) => mockPiiBlindIndex(...args),
}));

vi.mock('@/lib/juridico/repository', () => ({
  findAssociateWithOpenConsultationsByEmailHash: (...args: unknown[]) =>
    mockFindAssociateWithOpenConsultationsByEmailHash(...args),
}));

describe('buildCorrelationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty context when sender email cannot be extracted', async () => {
    mockExtractSenderEmailForCorrelation.mockResolvedValue(null);

    const context = await buildCorrelationContext({ sender: 'invalid sender' });

    expect(context).toEqual({ associate: null, consultations: [] });
    expect(mockPiiBlindIndex).not.toHaveBeenCalled();
    expect(mockFindAssociateWithOpenConsultationsByEmailHash).not.toHaveBeenCalled();
  });

  it('uses a single repository lookup for associate and open consultations', async () => {
    const expected = { associate: { id: 10 }, consultations: [{ id: 20 }] };
    mockExtractSenderEmailForCorrelation.mockResolvedValue('alice@example.com');
    mockPiiBlindIndex.mockReturnValue('hash:alice@example.com');
    mockFindAssociateWithOpenConsultationsByEmailHash.mockResolvedValue(expected);

    const context = await buildCorrelationContext({ sender: 'Alice <alice@example.com>' });

    expect(context).toEqual(expected);
    expect(mockPiiBlindIndex).toHaveBeenCalledWith('alice@example.com');
    expect(mockFindAssociateWithOpenConsultationsByEmailHash).toHaveBeenCalledWith(
      'hash:alice@example.com',
    );
  });
});
