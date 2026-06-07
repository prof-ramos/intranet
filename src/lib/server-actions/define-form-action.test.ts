import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  defineFormAction,
  defineFormStateAction,
  defineServerAction,
} from './define-form-action';

const requireRoleMock = vi.fn();
const requireAuthMock = vi.fn();
const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();
const redirectMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const getTrustedClientIpMock = vi.fn();
const headersMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));

vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: (...args: unknown[]) => getTrustedClientIpMock(...args),
}));

vi.mock('next/headers', () => ({
  headers: (...args: unknown[]) => headersMock(...args),
}));

describe('defineFormAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7, role: 'admin', name: 'Admin' });
    headersMock.mockResolvedValue(new Headers());
    getTrustedClientIpMock.mockReturnValue('127.0.0.1');
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it('parses form data, calls service, revalidates and redirects', async () => {
    const serviceMock = vi.fn().mockResolvedValue({ id: 42 });
    const action = defineFormAction({
      auth: ['admin'],
      schema: z.object({ name: z.string().min(1, 'Nome obrigatório.') }),
      service: serviceMock,
      revalidate: '/app/test',
      redirect: (output: { id: number }) => `/app/test/${output.id}`,
    });

    const formData = new FormData();
    formData.set('name', 'Teste');

    await expect(action(formData)).rejects.toThrow('NEXT_REDIRECT:/app/test/42');

    expect(requireRoleMock).toHaveBeenCalledWith(['admin']);
    expect(serviceMock).toHaveBeenCalledWith({ name: 'Teste' }, { userId: 7, role: 'admin', name: 'Admin' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/test');
    expect(redirectMock).toHaveBeenCalledWith('/app/test/42');
  });

  it('applies preprocess before schema parsing', async () => {
    const serviceMock = vi.fn().mockResolvedValue(undefined);
    const action = defineFormAction({
      auth: 'any',
      schema: z.object({ active: z.boolean() }),
      preprocess: (raw) => ({ ...raw, active: raw.active === 'true' }),
      service: serviceMock,
    });

    requireAuthMock.mockResolvedValue({ userId: 7, role: 'admin', name: 'Admin' });

    const formData = new FormData();
    formData.set('active', 'true');

    await action(formData);

    expect(serviceMock).toHaveBeenCalledWith({ active: true }, expect.anything());
  });

  it('throws on schema validation failure', async () => {
    const serviceMock = vi.fn();
    const action = defineFormAction({
      auth: ['admin'],
      schema: z.object({ name: z.string().min(1, 'Nome obrigatório.') }),
      service: serviceMock,
    });

    const formData = new FormData();
    formData.set('name', '');

    await expect(action(formData)).rejects.toThrow('Nome obrigatório.');
    expect(serviceMock).not.toHaveBeenCalled();
  });

  it('enforces rate limit before auth', async () => {
    consumeIpRateLimitMock.mockResolvedValue({ allowed: false });
    const serviceMock = vi.fn();
    const action = defineFormAction({
      auth: ['admin'],
      schema: z.object({ name: z.string() }),
      service: serviceMock,
      rateLimit: { key: 'test', windowMs: 60_000, maxRequests: 5 },
    });

    const formData = new FormData();
    formData.set('name', 'Teste');

    await expect(action(formData)).rejects.toThrow('Muitas requisições. Aguarde um momento.');
    expect(requireRoleMock).not.toHaveBeenCalled();
    expect(serviceMock).not.toHaveBeenCalled();
  });

  it('revalidates multiple paths and tags', async () => {
    const serviceMock = vi.fn().mockResolvedValue(undefined);
    const action = defineFormAction({
      auth: ['admin'],
      schema: z.object({ name: z.string() }),
      service: serviceMock,
      revalidate: {
        path: ['/app/a', '/app/b'],
        tag: ['tag-a', 'tag-b'],
      },
    });

    const formData = new FormData();
    formData.set('name', 'Teste');

    await action(formData);

    expect(revalidatePathMock).toHaveBeenCalledWith('/app/a');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/b');
    expect(revalidateTagMock).toHaveBeenCalledWith('tag-a', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('tag-b', 'max');
  });
});

describe('defineFormStateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7, role: 'admin', name: 'Admin' });
    headersMock.mockResolvedValue(new Headers());
    getTrustedClientIpMock.mockReturnValue('127.0.0.1');
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
  });

  it('returns state on success', async () => {
    const serviceMock = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
    const action = defineFormStateAction({
      auth: ['admin'],
      schema: z.object({ name: z.string() }),
      service: serviceMock,
      revalidate: '/app/test',
    });

    const formData = new FormData();
    formData.set('name', 'Teste');

    const result = await action(null, formData);

    expect(result).toEqual({ success: true, message: 'OK' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/test');
  });

  it('returns error state via onError when schema fails', async () => {
    const serviceMock = vi.fn();
    const action = defineFormStateAction({
      auth: ['admin'],
      schema: z.object({ name: z.string().min(1, 'Nome obrigatório.') }),
      service: serviceMock,
      onError: (error) => ({
        success: false,
        message: error instanceof Error ? error.message : 'Erro.',
      }),
    });

    const formData = new FormData();
    formData.set('name', '');

    const result = await action(null, formData);

    expect(result).toEqual({ success: false, message: 'Nome obrigatório.' });
    expect(serviceMock).not.toHaveBeenCalled();
  });

  it('passes raw formData when no schema is provided', async () => {
    const serviceMock = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
    const action = defineFormStateAction({
      auth: ['admin'],
      service: serviceMock,
    });

    const formData = new FormData();
    formData.set('custom', 'value');

    await action(null, formData);

    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({ custom: 'value' }),
      expect.anything(),
    );
  });

  it('calls onError for service exceptions', async () => {
    const serviceMock = vi.fn().mockRejectedValue(new Error('Service down'));
    const action = defineFormStateAction({
      auth: ['admin'],
      schema: z.object({ name: z.string() }),
      service: serviceMock,
      onError: (error) => ({
        success: false,
        message: error instanceof Error ? error.message : 'Erro.',
      }),
    });

    const formData = new FormData();
    formData.set('name', 'Teste');

    const result = await action(null, formData);

    expect(result).toEqual({ success: false, message: 'Service down' });
  });

  it('rethrows when onError is absent', async () => {
    const serviceMock = vi.fn().mockRejectedValue(new Error('Boom'));
    const action = defineFormStateAction({
      auth: ['admin'],
      schema: z.object({ name: z.string() }),
      service: serviceMock,
    });

    const formData = new FormData();
    formData.set('name', 'Teste');

    await expect(action(null, formData)).rejects.toThrow('Boom');
  });
});

describe('defineServerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 7, role: 'admin', name: 'Admin' });
    requireRoleMock.mockResolvedValue({ userId: 7, role: 'admin', name: 'Admin' });
    headersMock.mockResolvedValue(new Headers());
    getTrustedClientIpMock.mockReturnValue('127.0.0.1');
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it('validates schema, calls service and returns output', async () => {
    const serviceMock = vi.fn().mockResolvedValue({ id: 99 });
    const action = defineServerAction({
      auth: 'any',
      schema: z.object({ id: z.number().int().positive() }),
      service: serviceMock,
    });

    const result = await action({ id: 5 });

    expect(result).toEqual({ id: 99 });
    expect(serviceMock).toHaveBeenCalledWith({ id: 5 }, expect.anything());
  });

  it('throws on schema validation failure', async () => {
    const serviceMock = vi.fn();
    const action = defineServerAction({
      auth: 'any',
      schema: z.object({ id: z.number().int().positive() }),
      service: serviceMock,
    });

    await expect(action({ id: -1 })).rejects.toThrow('Too small');
    expect(serviceMock).not.toHaveBeenCalled();
  });

  it('works without schema for manual validation', async () => {
    const serviceMock = vi.fn().mockResolvedValue('ok');
    const action = defineServerAction({
      auth: ['admin'],
      service: serviceMock,
    });

    const result = await action('raw-input');

    expect(result).toBe('ok');
    expect(serviceMock).toHaveBeenCalledWith('raw-input', expect.anything());
  });

  it('enforces rate limit', async () => {
    consumeIpRateLimitMock.mockResolvedValue({ allowed: false });
    const serviceMock = vi.fn();
    const action = defineServerAction({
      auth: 'any',
      service: serviceMock,
      rateLimit: { key: 'server', windowMs: 60_000, maxRequests: 3 },
    });

    await expect(action('x')).rejects.toThrow('Muitas requisições. Aguarde um momento.');
    expect(serviceMock).not.toHaveBeenCalled();
  });

  it('revalidates and redirects on success', async () => {
    const serviceMock = vi.fn().mockResolvedValue({ id: 3 });
    const action = defineServerAction({
      auth: 'any',
      service: serviceMock,
      revalidate: '/app/test',
      redirect: '/app/test/detail',
    });

    await expect(action('x')).rejects.toThrow('NEXT_REDIRECT:/app/test/detail');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/test');
  });

  it('supports dynamic redirect', async () => {
    const serviceMock = vi.fn().mockResolvedValue({ id: 5 });
    const action = defineServerAction({
      auth: 'any',
      service: serviceMock,
      redirect: (output: { id: number }) => `/app/items/${output.id}`,
    });

    await expect(action('x')).rejects.toThrow('NEXT_REDIRECT:/app/items/5');
  });
});
