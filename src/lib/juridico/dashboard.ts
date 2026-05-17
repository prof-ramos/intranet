import type { LegalConsultationStatus } from './status';

export interface JuridicoDashboardStatusCounts {
  aberta: number;
  aguardando_escritorio: number;
  respondida: number;
  arquivada: number;
}

export function buildJuridicoStatusSummary(
  counts: JuridicoDashboardStatusCounts,
): Record<LegalConsultationStatus, number> {
  return {
    aberta: counts.aberta,
    aguardando_escritorio: counts.aguardando_escritorio,
    respondida: counts.respondida,
    arquivada: counts.arquivada,
  };
}
