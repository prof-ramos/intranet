'use client';

import { AlertTriangle } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

export default createErrorBoundary({
  icon: AlertTriangle,
  title: 'Erro ao carregar campanhas',
  message:
    'Não foi possível carregar as campanhas de mala direta. Verifique sua conexão e tente novamente.',
  logMessage: 'Mailing campaigns error boundary caught',
  loggerName: 'error-boundary:mailing-campaigns',
});
