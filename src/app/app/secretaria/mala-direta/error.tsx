'use client';

import { AlertTriangle } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: AlertTriangle,
  title: 'Erro ao carregar mala direta',
  message:
    'Não foi possível carregar a exportação de contatos. Verifique sua conexão e tente novamente.',
  logMessage: 'Mala direta error boundary caught',
  loggerName: 'error-boundary:mala-direta',
});
