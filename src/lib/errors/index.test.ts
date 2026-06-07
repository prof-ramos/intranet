import { describe, expect, it } from 'vitest';
import {
  ConcurrencyConflictError,
  DomainError,
  ExternalServiceError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
  isDomainError,
} from './index';

describe('DomainError hierarchy', () => {
  describe('DomainError', () => {
    it('has correct name and code', () => {
      const err = new DomainError('base message', 'BASE_CODE');
      expect(err.name).toBe('DomainError');
      expect(err.code).toBe('BASE_CODE');
      expect(err.message).toBe('base message');
    });

    it('preserves cause', () => {
      const cause = new Error('inner');
      const err = new DomainError('outer', 'OUTER', { cause });
      expect(err.cause).toBe(cause);
    });
  });

  describe('ConcurrencyConflictError', () => {
    it('has correct defaults', () => {
      const err = new ConcurrencyConflictError();
      expect(err.name).toBe('ConcurrencyConflictError');
      expect(err.code).toBe('CONCURRENCY_CONFLICT');
      expect(err.message).toBe('CONCURRENCY_CONFLICT');
    });

    it('accepts custom message', () => {
      const err = new ConcurrencyConflictError('custom conflict');
      expect(err.message).toBe('custom conflict');
    });
  });

  describe('NotFoundError', () => {
    it('formats message with resource', () => {
      const err = new NotFoundError('Pagamento');
      expect(err.message).toBe('Pagamento não encontrado.');
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('ValidationError', () => {
    it('preserves message', () => {
      const err = new ValidationError('Campo obrigatório');
      expect(err.message).toBe('Campo obrigatório');
      expect(err.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('RateLimitError', () => {
    it('has retryAfterMs', () => {
      const err = new RateLimitError(5000);
      expect(err.retryAfterMs).toBe(5000);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('ExternalServiceError', () => {
    it('includes service name', () => {
      const err = new ExternalServiceError('Gemini', 'timeout');
      expect(err.service).toBe('Gemini');
      expect(err.message).toBe('Erro no serviço externo Gemini: timeout');
      expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('works without originalMessage', () => {
      const err = new ExternalServiceError('Mailjet');
      expect(err.message).toBe('Erro no serviço externo Mailjet.');
    });
  });

  describe('UnauthorizedError', () => {
    it('has correct defaults', () => {
      const err = new UnauthorizedError();
      expect(err.message).toBe('Acesso negado.');
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('accepts custom message', () => {
      const err = new UnauthorizedError('Token expirado');
      expect(err.message).toBe('Token expirado');
    });
  });

  describe('isDomainError', () => {
    it('returns true for DomainError instances', () => {
      expect(isDomainError(new ValidationError('test'))).toBe(true);
      expect(isDomainError(new ConcurrencyConflictError())).toBe(true);
    });

    it('returns false for plain Error', () => {
      expect(isDomainError(new Error('plain'))).toBe(false);
    });

    it('returns false for null and primitives', () => {
      expect(isDomainError(null)).toBe(false);
      expect(isDomainError(undefined)).toBe(false);
      expect(isDomainError('string')).toBe(false);
      expect(isDomainError(42)).toBe(false);
    });

    it('works cross-realm via Symbol.for', () => {
      const fake = { [Symbol.for('asof.DomainError')]: true };
      expect(isDomainError(fake)).toBe(true);
    });
  });

  describe('instanceof chain', () => {
    it('all subclasses are instanceof DomainError', () => {
      expect(new NotFoundError('x')).toBeInstanceOf(DomainError);
      expect(new ValidationError('x')).toBeInstanceOf(DomainError);
      expect(new RateLimitError(1)).toBeInstanceOf(DomainError);
      expect(new ExternalServiceError('x')).toBeInstanceOf(DomainError);
      expect(new UnauthorizedError()).toBeInstanceOf(DomainError);
      expect(new ConcurrencyConflictError()).toBeInstanceOf(DomainError);
    });

    it('all are instanceof Error', () => {
      expect(new NotFoundError('x')).toBeInstanceOf(Error);
    });
  });
});
