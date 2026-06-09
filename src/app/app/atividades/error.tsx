'use client';

import { Kanban } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: Kanban,
  title: 'Erro ao carregar atividades',
  message: 'Não foi possível carregar o painel de atividades. Verifique sua conexão e tente novamente.',
  logMessage: 'Atividades error boundary caught',
  loggerName: 'error-boundary:atividades',
  useFocusRing: true,
  containerClass: 'flex min-h-[60vh] flex-col items-center justify-center px-4',
  iconBgClass: 'bg-amber-100',
  iconTextClass: 'text-amber-600',
  buttonHoverClass: 'hover:bg-[#06284f]',
  useSerif: false,
  messageClass: 'max-w-md text-[#59677a]',
  digestClass: 'text-sm text-[#59677a]/60',
});
