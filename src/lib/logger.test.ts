import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts PII from log messages before writing output', () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger('logger-test');

    logger.info('contact maria@example.com cpf 123.456.789-00 token Bearer secret-token');

    expect(output).toHaveBeenCalledTimes(1);
    const [message] = output.mock.calls[0];
    expect(message).toContain('[email]');
    expect(message).toContain('[cpf]');
    expect(message).toContain('Bearer [token]');
    expect(message).not.toContain('maria@example.com');
    expect(message).not.toContain('123.456.789-00');
    expect(message).not.toContain('secret-token');
  });
});
