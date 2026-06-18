'use client';

import { Users } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: Users,
  title: 'Erro ao carregar oficiais',
  message: 'Não foi possível carregar a lista de oficiais. Verifique sua conexão e tente novamente.',
  logMessage: 'Cadastro de Oficiais error boundary caught',
  loggerName: 'error-boundary:cadastro-oficiais',
  useFocusRing: true,
  containerClass: 'flex min-h-[60vh] flex-col items-center justify-center px-4',
  iconBgClass: 'bg-amber-100',
  iconTextClass: 'text-amber-600',
  buttonHoverClass: 'hover:bg-[#0d3260]',
  useSerif: false,
  messageClass: 'max-w-md text-[rgba(13,31,60,0.60)]',
  digestClass: 'text-sm text-[rgba(13,31,60,0.40)]',
});
