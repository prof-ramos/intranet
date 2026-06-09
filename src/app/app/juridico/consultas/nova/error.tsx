'use client';

import { FilePlus } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: FilePlus,
  title: 'Erro ao carregar nova consulta',
  message: 'Não foi possível carregar o formulário de nova consulta. Verifique sua conexão e tente novamente.',
  logMessage: 'Nova consulta error boundary caught',
  loggerName: 'juridico:consultas:nova:error',
  useFocusRing: false,
  containerClass: 'flex min-h-[60vh] flex-col items-center justify-center px-4',
  iconBgClass: 'bg-amber-100',
  iconTextClass: 'text-amber-600',
  buttonHoverClass: 'hover:bg-[#06284f]',
  useSerif: false,
  messageClass: 'max-w-md text-[#59677a]',
  digestClass: 'text-sm text-[#59677a]/60',
});
