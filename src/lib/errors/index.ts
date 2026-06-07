const DOMAIN_ERROR_MARKER = Symbol.for('asof.DomainError');

export class DomainError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  [DOMAIN_ERROR_MARKER] = true;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class ConcurrencyConflictError extends DomainError {
  constructor(message = 'CONCURRENCY_CONFLICT', options?: { cause?: unknown }) {
    super(message, 'CONCURRENCY_CONFLICT', options);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, options?: { cause?: unknown }) {
    super(`${resource} não encontrado.`, 'NOT_FOUND', options);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'VALIDATION_FAILED', options);
  }
}

export class RateLimitError extends DomainError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number, options?: { cause?: unknown }) {
    super('Limite de requisições excedido.', 'RATE_LIMIT_EXCEEDED', options);
    this.retryAfterMs = retryAfterMs;
  }
}

export class ExternalServiceError extends DomainError {
  readonly service: string;

  constructor(service: string, originalMessage?: string, options?: { cause?: unknown }) {
    super(
      originalMessage ? `Erro no serviço externo ${service}: ${originalMessage}` : `Erro no serviço externo ${service}.`,
      'EXTERNAL_SERVICE_ERROR',
      options,
    );
    this.service = service;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Acesso negado.', options?: { cause?: unknown }) {
    super(message, 'UNAUTHORIZED', options);
  }
}

export const isDomainError = (err: unknown): err is DomainError =>
  err != null && typeof err === 'object' && (err as Record<symbol, unknown>)[DOMAIN_ERROR_MARKER] === true;
