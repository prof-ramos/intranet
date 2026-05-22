import { PII_TEXT_PATTERNS } from '@/lib/sanitize-pii';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string | number;
  module?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const PII_KEYS = new Set([
  'cpf', 'siape', 'email', 'primaryEmail', 'phone', 'address', 'whatsapp',
  'password', 'token', 'secret', 'apiKey', 'authorization', 'resetlink', 'reset_link', 'recoverylink', 'recovery_link',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[nested]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 200) return value.slice(0, 200) + '...';
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (
        PII_KEYS.has(key) ||
        PII_KEYS.has(lowerKey) ||
        key.includes('password') ||
        key.includes('token') ||
        key.includes('secret') ||
        key.includes('ciphertext') ||
        lowerKey.includes('resetlink') ||
        lowerKey.includes('reset_link') ||
        lowerKey.includes('recoverylink') ||
        lowerKey.includes('recovery_link')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redact(val, depth + 1);
      }
    }
    return result;
  }
  return '[unknown]';
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[unserializable]';
  }
}

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (level && level in LEVELS) return level;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const CURRENT_LEVEL = getLogLevel();
const IS_PROD = process.env.NODE_ENV === 'production';

function sanitizeErrorMessage(message: string): string {
  let safe = message;
  for (const [pattern, replacement] of PII_TEXT_PATTERNS) {
    safe = safe.replace(pattern, replacement);
  }
  return safe;
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[CURRENT_LEVEL];
}

function formatLog(entry: LogEntry): string {
  if (IS_PROD) {
    return safeStringify(redact(entry));
  }

  const colorMap: Record<LogLevel, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const color = colorMap[entry.level];

  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    const clean = redact(entry.context);
    output += ` ${safeStringify(clean)}`;
  }

  if (entry.error) {
    output += `\n  ${color}${entry.error.name}:${reset} ${entry.error.message}`;
    if (entry.error.stack && !IS_PROD) {
      output += `\n${entry.error.stack}`;
    }
  }

  return output;
}

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? { ...context, module: this.module } : { module: this.module },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: sanitizeErrorMessage(error.message),
        stack: IS_PROD ? undefined : error.stack,
      };
    }

    const output = formatLog(entry);
    if (level === 'error' || level === 'warn') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }
}

export function createLogger(module: string): Logger {
  return new Logger(module);
}

// Default logger for one-off usage
export const logger = createLogger('app');
