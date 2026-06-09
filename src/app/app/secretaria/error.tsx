'use client';

import { FileSpreadsheet } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: FileSpreadsheet,
  title: 'Erro ao carregar secretaria',
  message: 'Não foi possível carregar a secretaria. Verifique sua conexão e tente novamente.',
  logMessage: 'Secretaria error boundary caught',
  loggerName: 'error-boundary:secretaria',
  useFocusRing: true,
  containerClass: 'flex min-h-[60vh] flex-col items-center justify-center px-4',
  iconBgClass: 'bg-amber-100',
  iconTextClass: 'text-amber-600',
  buttonHoverClass: 'hover:bg-[#06284f]',
  useSerif: false,
  messageClass: 'max-w-md text-[#59677a]',
  digestClass: 'text-sm text-[#59677a]/60',
});
