import { describe, expect, it, vi } from 'vitest';
import { ensureDevelopmentAdmin, type DevelopmentAdminStore } from './dev-admin';

function createStore(matches: Awaited<ReturnType<DevelopmentAdminStore['findByIdOrEmail']>> = []) {
  return {
    findByIdOrEmail: vi.fn().mockResolvedValue(matches),
    create: vi.fn().mockResolvedValue(undefined),
    normalize: vi.fn().mockResolvedValue(undefined),
    realignIdentitySequence: vi.fn().mockResolvedValue(undefined),
  } satisfies DevelopmentAdminStore;
}

const env = {
  SKIP_AUTH: 'true',
  DEV_USER_ID: '42',
  DEV_USER_NAME: 'Dev Operador',
  DEV_USER_EMAIL: 'dev@asof.local',
  DEV_USER_ROLE: 'admin',
};

describe('ensureDevelopmentAdmin', () => {
  it('creates the configured technical id when no matching admin exists', async () => {
    const store = createStore();

    await expect(
      ensureDevelopmentAdmin(store, env, async () => 'unusable-password-hash'),
    ).resolves.toBe(42);
    expect(store.create).toHaveBeenCalledWith(
      {
        userId: 42,
        name: 'Dev Operador',
        email: 'dev@asof.local',
        role: 'admin',
        mustChangePassword: false,
      },
      'unusable-password-hash',
    );
    expect(store.normalize).not.toHaveBeenCalled();
    expect(store.realignIdentitySequence).toHaveBeenCalledOnce();
  });

  it('normalizes the existing configured admin without changing its id', async () => {
    const store = createStore([{ id: 42, email: 'dev@asof.local' }]);

    await expect(ensureDevelopmentAdmin(store, env)).resolves.toBe(42);
    expect(store.normalize).toHaveBeenCalledWith({
      userId: 42,
      name: 'Dev Operador',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });
    expect(store.create).not.toHaveBeenCalled();
    expect(store.realignIdentitySequence).toHaveBeenCalledOnce();
  });

  it('fails closed when the configured id and email identify different admins', async () => {
    const store = createStore([
      { id: 42, email: 'other@asof.local' },
      { id: 99, email: 'dev@asof.local' },
    ]);

    await expect(ensureDevelopmentAdmin(store, env)).rejects.toThrow(
      'Development admin configuration conflicts with persisted admins.',
    );
    expect(store.create).not.toHaveBeenCalled();
    expect(store.normalize).not.toHaveBeenCalled();
    expect(store.realignIdentitySequence).not.toHaveBeenCalled();
  });
});
