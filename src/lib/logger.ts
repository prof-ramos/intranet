import { PII_TEXT_PATTERNS, sanitizePiiValue } from '@/lib/sanitize-pii';

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
    return safeStringify(sanitizePiiValue(entry));
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
    const clean = sanitizePiiValue(entry.context);
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
