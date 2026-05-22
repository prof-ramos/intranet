import { describe, it, expect, vi } from 'vitest';
import {
  getIntegrationConfig,
  isIntegrationAuthConfigured,
  isIntegrationAuthAvailable,
} from './config';

// Mock server-only to avoid import errors in test environment
vi.mock('server-only', () => ({}));

// Mock the db module using vi.hoisted so it's available when vi.mock runs
const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: mockFrom,
    }),
  },
}));

describe('getIntegrationConfig', () => {
  it('returns enabled=true when ASOF_INTEGRATIONS_ENABLED is "true"', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATIONS_ENABLED: 'true',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.enabled).toBe(true);
  });

  it('returns enabled=true when ASOF_INTEGRATIONS_ENABLED is "1"', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATIONS_ENABLED: '1',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.enabled).toBe(true);
  });

  it('returns enabled=false when env var is absent', () => {
    const config = getIntegrationConfig({} as NodeJS.ProcessEnv);
    expect(config.enabled).toBe(false);
  });

  it('returns enabled=false when env var is "false"', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATIONS_ENABLED: 'false',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.enabled).toBe(false);
  });

  it('returns apiKey from env var when set', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATIONS_ENABLED: 'true',
      ASOF_INTEGRATION_API_KEY: 'test-key',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.apiKey).toBe('test-key');
  });

  it('returns null for apiKey when env var is absent', () => {
    const config = getIntegrationConfig({} as NodeJS.ProcessEnv);
    expect(config.apiKey).toBeNull();
  });

  it('returns null for apiKey when env var is whitespace only', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATION_API_KEY: '   ',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.apiKey).toBeNull();
  });

  it('returns hmacSecret from env var when set', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATION_HMAC_SECRET: 'test-secret',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.hmacSecret).toBe('test-secret');
  });

  it('returns null for hmacSecret when env var is absent', () => {
    const config = getIntegrationConfig({} as NodeJS.ProcessEnv);
    expect(config.hmacSecret).toBeNull();
  });

  it('returns default timestampToleranceSeconds (300) when env var is absent', () => {
    const config = getIntegrationConfig({} as NodeJS.ProcessEnv);
    expect(config.timestampToleranceSeconds).toBe(300);
  });

  it('returns parsed timestampToleranceSeconds when env var is valid integer', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS: '600',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.timestampToleranceSeconds).toBe(600);
  });

  it('returns default timestampToleranceSeconds for invalid values', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS: 'abc',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.timestampToleranceSeconds).toBe(300);

    const config2 = getIntegrationConfig({
      ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS: '-50',
    } as unknown as NodeJS.ProcessEnv);
    expect(config2.timestampToleranceSeconds).toBe(300);
  });

  it('rejects non-decimal timestampToleranceSeconds encodings', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS: '300abc',
    } as unknown as NodeJS.ProcessEnv);

    expect(config.timestampToleranceSeconds).toBe(300);
  });

  it('accepts 0 as valid timestampToleranceSeconds', () => {
    const config = getIntegrationConfig({
      ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS: '0',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.timestampToleranceSeconds).toBe(0);
  });
});

describe('isIntegrationAuthConfigured', () => {
  it('returns true when both apiKey and hmacSecret are present', () => {
    const config = {
      enabled: true,
      apiKey: 'key',
      hmacSecret: 'secret',
      timestampToleranceSeconds: 300,
    };
    expect(isIntegrationAuthConfigured(config)).toBe(true);
  });

  it('returns false when apiKey is missing', () => {
    const config = {
      enabled: true,
      apiKey: null,
      hmacSecret: 'secret',
      timestampToleranceSeconds: 300,
    };
    expect(isIntegrationAuthConfigured(config)).toBe(false);
  });

  it('returns false when hmacSecret is missing', () => {
    const config = {
      enabled: true,
      apiKey: 'key',
      hmacSecret: null,
      timestampToleranceSeconds: 300,
    };
    expect(isIntegrationAuthConfigured(config)).toBe(false);
  });

  it('returns false when both are missing', () => {
    const config = {
      enabled: false,
      apiKey: null,
      hmacSecret: null,
      timestampToleranceSeconds: 300,
    };
    expect(isIntegrationAuthConfigured(config)).toBe(false);
  });
});

describe('isIntegrationAuthAvailable', () => {
  it('returns true when env-var auth is configured (no DB query needed)', async () => {
    const config = {
      enabled: true,
      apiKey: 'key',
      hmacSecret: 'secret',
      timestampToleranceSeconds: 300,
    };
    const result = await isIntegrationAuthAvailable(config);
    expect(result).toBe(true);
    // DB mock should not have been called
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns false when no hmacSecret is set (table-backed keys cannot work)', async () => {
    const config = {
      enabled: false,
      apiKey: null,
      hmacSecret: null,
      timestampToleranceSeconds: 300,
    };
    const result = await isIntegrationAuthAvailable(config);
    expect(result).toBe(false);
  });

  it('returns true when DB has at least one active key', async () => {
    mockFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });

    const config = {
      enabled: false,
      apiKey: null,
      hmacSecret: 'secret',
      timestampToleranceSeconds: 300,
    };
    const result = await isIntegrationAuthAvailable(config);
    expect(result).toBe(true);
  });

  it('returns false when DB has no active keys', async () => {
    mockFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });

    const config = {
      enabled: false,
      apiKey: null,
      hmacSecret: 'secret',
      timestampToleranceSeconds: 300,
    };
    const result = await isIntegrationAuthAvailable(config);
    expect(result).toBe(false);
  });
});
