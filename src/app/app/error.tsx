'use client';

import { AlertTriangle } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: AlertTriangle,
  title: 'Algo deu errado',
  message: 'Ocorreu um erro inesperado ao carregar esta página. Tente novamente ou entre em contato com o suporte se o problema persistir.',
  logMessage: 'App error boundary caught',
  loggerName: 'app:error',
  useFocusRing: false,
  containerClass: 'flex min-h-screen flex-col items-center justify-center px-4',
  iconBgClass: 'bg-red-100',
  iconTextClass: 'text-red-600',
  buttonHoverClass: 'hover:bg-[#06284f]',
  useSerif: false,
  messageClass: 'max-w-md text-[#59677a]',
  digestClass: 'text-sm text-[#59677a]/60',
});
