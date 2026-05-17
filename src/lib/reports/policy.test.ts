import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireReportAccess } from './policy';

const requireRoleMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

describe('report policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the authorized user id for admin and diretoria access', async () => {
    requireRoleMock.mockResolvedValue({ userId: 7 });

    await expect(requireReportAccess()).resolves.toEqual({ userId: 7 });
    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'diretoria']);
  });

  it('maps authorization failures to a 403 response', async () => {
    requireRoleMock.mockRejectedValue(new Error('forbidden'));

    const result = await requireReportAccess();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});
