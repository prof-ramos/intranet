'use client';

import { Scale } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: Scale,
  title: 'Erro no módulo jurídico',
  message: 'Não foi possível carregar esta seção. Verifique sua conexão e tente novamente.',
  logMessage: 'Jurídico error boundary caught',
  loggerName: 'juridico:error',
  useFocusRing: false,
  containerClass: 'mx-auto flex min-h-[60vh] w-full max-w-[1180px] flex-col items-center justify-center px-5 py-7',
  iconBgClass: 'bg-amber-100',
  iconTextClass: 'text-amber-600',
  buttonHoverClass: 'hover:bg-[#06284f]',
  useSerif: true,
  messageClass: 'max-w-md text-[#59677a]',
  digestClass: 'text-sm text-[#59677a]/60',
});
