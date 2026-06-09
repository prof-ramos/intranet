'use client';

import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RotateCcw } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { focusRingClass } from '@/lib/ui/tokens';

export interface ErrorBoundaryConfig {
  icon: LucideIcon;
  title: string;
  message: string;
  logMessage: string;
  loggerName: string;
  useFocusRing?: boolean;
  containerClass?: string;
  iconBgClass?: string;
  iconTextClass?: string;
  buttonHoverClass?: string;
  useSerif?: boolean;
  messageClass?: string;
  digestClass?: string;
}

export function createErrorBoundary({
  icon: Icon,
  title,
  message,
  logMessage,
  loggerName,
  useFocusRing = true,
  containerClass = 'flex min-h-[60vh] flex-col items-center justify-center px-4',
  iconBgClass = 'bg-amber-100',
  iconTextClass = 'text-amber-600',
  buttonHoverClass = 'hover:bg-[#06284f]',
  useSerif = false,
  messageClass = 'max-w-md text-[#59677a]',
  digestClass = 'text-sm text-[#59677a]/60',
}: ErrorBoundaryConfig) {
  const logger = createLogger(loggerName);

  return function ErrorBoundary({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    useEffect(() => {
      logger.error(logMessage, { error: toSafeErrorLog(error) }, error);
    }, [error]);

    const titleClass = useSerif
      ? 'font-serif text-2xl font-bold text-[#040920]'
      : 'text-2xl font-bold text-[#040920]';

    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${iconBgClass}`}>
            <Icon className={`h-8 w-8 ${iconTextClass}`} />
          </div>
          <h1 className={titleClass}>{title}</h1>
          <p className={messageClass}>{message}</p>
          {error.digest && <p className={digestClass}>Código: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            className={`inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-white transition ${buttonHoverClass} ${useFocusRing ? focusRingClass : ''}`}
          >
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
}
