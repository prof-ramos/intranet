import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApiKeyAction,
  listApiKeysAction,
  revokeApiKeyAction,
  rotateApiKeyAction,
} from './actions';

const requireAuthMock = vi.fn();
const requireRoleMock = vi.fn();
const createApiKeyServiceMock = vi.fn();
const listApiKeysServiceMock = vi.fn();
const revokeApiKeyServiceMock = vi.fn();
const rotateApiKeyServiceMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/integrations/keys/service', () => ({
  VALID_SCOPES: ['events:read', 'events:write', 'webhooks:manage', 'admin'],
  createApiKey: (...args: unknown[]) => createApiKeyServiceMock(...args),
  listApiKeys: (...args: unknown[]) => listApiKeysServiceMock(...args),
  revokeApiKey: (...args: unknown[]) => revokeApiKeyServiceMock(...args),
  rotateApiKey: (...args: unknown[]) => rotateApiKeyServiceMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('config integracoes api key actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 7 });
    requireRoleMock.mockResolvedValue(undefined);
    createApiKeyServiceMock.mockResolvedValue({ id: 10, name: 'Prod Key' });
    listApiKeysServiceMock.mockResolvedValue([{ id: 1, name: 'Existing' }]);
    revokeApiKeyServiceMock.mockResolvedValue(true);
    rotateApiKeyServiceMock.mockResolvedValue({ id: 11, name: 'Rotated Key' });
  });

  it('creates an api key with the authenticated actor id and revalidates', async () => {
    const result = await createApiKeyAction('  Prod Key  ', ['events:read', 'webhooks:manage']);

    expect(result).toEqual({ data: { id: 10, name: 'Prod Key' } });
    expect(createApiKeyServiceMock).toHaveBeenCalledWith(
      'Prod Key',
      ['events:read', 'webhooks:manage'],
      7,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes');
  });

  it('rejects invalid scopes before touching the service', async () => {
    const result = await createApiKeyAction('Valid name', ['events:read', 'invalid:scope']);

    expect(result).toEqual({ error: 'Invalid scope: "invalid:scope".' });
    expect(createApiKeyServiceMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rejects empty scopes before touching the service', async () => {
    const result = await createApiKeyAction('Valid name', []);

    expect(result).toEqual({ error: 'At least one scope must be selected.' });
    expect(createApiKeyServiceMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('maps duplicate-name failures to a friendly message', async () => {
    createApiKeyServiceMock.mockRejectedValue(new Error('unique constraint violation'));

    const result = await createApiKeyAction('Duplicated', ['events:read']);

    expect(result).toEqual({ error: 'An API key with this name already exists.' });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('lists api keys after auth and role checks', async () => {
    const result = await listApiKeysAction();

    expect(result).toEqual([{ id: 1, name: 'Existing' }]);
    expect(listApiKeysServiceMock).toHaveBeenCalledTimes(1);
  });

  it('stops before calling the service when the role gate rejects', async () => {
    requireRoleMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/app'));

    await expect(listApiKeysAction()).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(listApiKeysServiceMock).not.toHaveBeenCalled();
  });

  it('returns a typed error when revoking a missing key', async () => {
    revokeApiKeyServiceMock.mockResolvedValue(false);

    const result = await revokeApiKeyAction(404);

    expect(result).toEqual({ error: 'API key not found or already revoked.' });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rotates an api key with the authenticated actor id and revalidates', async () => {
    const result = await rotateApiKeyAction(9);

    expect(result).toEqual({ data: { id: 11, name: 'Rotated Key' } });
    expect(rotateApiKeyServiceMock).toHaveBeenCalledWith(9, 7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes');
  });
});
