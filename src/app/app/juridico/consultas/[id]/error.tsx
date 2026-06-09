'use client';

import { MessageSquare } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: MessageSquare,
  title: 'Erro ao carregar consulta',
  message: 'Não foi possível carregar esta consulta. Verifique sua conexão e tente novamente.',
  logMessage: 'Consulta detalhe error boundary caught',
  loggerName: 'juridico:consultas:detalhe:error',
  useFocusRing: false,
  containerClass: 'flex min-h-[60vh] flex-col items-center justify-center px-4',
  iconBgClass: 'bg-amber-100',
  iconTextClass: 'text-amber-600',
  buttonHoverClass: 'hover:bg-[#06284f]',
  useSerif: false,
  messageClass: 'max-w-md text-[#59677a]',
  digestClass: 'text-sm text-[#59677a]/60',
});
