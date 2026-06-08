'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Edit2, Download, Ban, Loader2, PenSquare } from 'lucide-react';
import { SendForSignatureModal } from './SendForSignatureModal';
import { cancelOfficialLetterAction } from '../actions';
import { success, error, warning, hairline, focusRingClass } from '@/lib/ui/tokens';

interface OficioRow {
  id: number;
  number: string;
  status: string;
  recipient: string;
  letterDate: string;
  subject: string;
  signatoryName: string;
  assinafyDocumentId: string | null;
  assinafyStatus: string | null;
  assinafySigningUrl: string | null;
}

export function OficiosTable({ oficios }: { oficios: OficioRow[] }) {
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [isCancelling, startCancelTransition] = useTransition();
  const [cancelledIds, setCancelledIds] = useState<Set<number>>(new Set());
  const [signatureModalOficio, setSignatureModalOficio] = useState<OficioRow | null>(null);

  function handleCancel(id: number) {
    startCancelTransition(async () => {
      const result = await cancelOfficialLetterAction(id);
      if (result.success) {
        setCancelledIds((prev) => new Set(prev).add(id));
        setCancelConfirmId(null);
      }
    });
  }

  if (oficios.length === 0) {
    return (
      <div
        className="overflow-x-auto rounded-[16px] bg-white"
        style={{ border: `1px solid ${hairline}` }}
      >
        <p className="px-6 py-10 text-center text-sm text-[rgba(13,31,60,0.45)]">
          Nenhum ofício encontrado.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-x-auto rounded-[16px] bg-white"
        style={{ border: `1px solid ${hairline}` }}
      >
        <table className="w-full text-left">
          <thead className="border-b bg-slate-50/50" style={{ borderColor: hairline }}>
            <tr>
              <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Número
              </th>
              <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Status
              </th>
              <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Destinatário
              </th>
              <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Data
              </th>
              <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Assunto
              </th>
              <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: hairline }}>
            {oficios.map((oficio) => {
              const isCancelled = oficio.status === 'cancelado' || cancelledIds.has(oficio.id);
              const statusColor = isCancelled
                ? error
                : oficio.status === 'rascunho'
                  ? warning
                  : success;
              const statusBg = isCancelled
                ? `${error}15`
                : oficio.status === 'rascunho'
                  ? `${warning}15`
                  : `${success}15`;

              return (
                <tr key={oficio.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">{oficio.number}</td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                      style={{ backgroundColor: statusBg, color: statusColor }}
                    >
                      {isCancelled ? 'cancelado' : oficio.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-6 py-4 text-sm">{oficio.recipient}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">{oficio.letterDate}</td>
                  <td className="max-w-[250px] truncate px-6 py-4 text-sm">{oficio.subject}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/secretaria/oficios/${oficio.id}/editar`}
                        className={`p-1 text-slate-400 transition-colors hover:text-[#040920] ${focusRingClass}`}
                        title="Editar"
                        aria-label="Editar ofício"
                      >
                        <Edit2 size={18} aria-hidden="true" />
                      </Link>
                      <a
                        href={`/api/oficios/${oficio.id}/download`}
                        className={`p-1 text-slate-400 transition-colors hover:text-[#040920] ${focusRingClass}`}
                        title="Download PDF"
                        aria-label="Download PDF"
                        download
                      >
                        <Download size={18} aria-hidden="true" />
                      </a>
                      {!isCancelled &&
                        (oficio.status === 'gerado' || oficio.status === 'rascunho') &&
                        oficio.assinafyDocumentId === null && (
                          <button
                            type="button"
                            onClick={() => setSignatureModalOficio(oficio)}
                            className={`p-1 text-slate-400 transition-colors hover:text-[#040920] ${focusRingClass}`}
                            title="Enviar para assinatura"
                            aria-label="Enviar para assinatura"
                          >
                            <PenSquare size={18} aria-hidden="true" />
                          </button>
                        )}
                      {!isCancelled &&
                        (cancelConfirmId === oficio.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-red-700">Confirmar?</span>
                            <button
                              type="button"
                              onClick={() => handleCancel(oficio.id)}
                              disabled={isCancelling}
                              className={`rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 ${focusRingClass}`}
                            >
                              {isCancelling ? (
                                <Loader2 className="motion-safe:animate-spin" size={12} />
                              ) : (
                                'Sim'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelConfirmId(null)}
                              className={`rounded-md border border-[rgba(4,9,32,0.1)] px-2 py-0.5 text-xs font-medium text-[rgba(13,31,60,0.6)] transition-colors hover:bg-gray-50 ${focusRingClass}`}
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCancelConfirmId(oficio.id)}
                            className={`p-1 text-slate-400 transition-colors hover:text-red-600 ${focusRingClass}`}
                            title="Cancelar ofício"
                            aria-label="Cancelar ofício"
                          >
                            <Ban size={18} aria-hidden="true" />
                          </button>
                        ))}
                    </div>
                    {oficio.assinafyStatus === 'pending_signature' && oficio.assinafySigningUrl && oficio.assinafySigningUrl.startsWith('https://') && (
                      <a
                        href={oficio.assinafySigningUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-xs font-medium transition-colors hover:bg-[#dbeafe] ${focusRingClass}`}
                        style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}
                        title="Abrir página de assinatura"
                      >
                        Assinatura pendente
                        <svg
                          className="inline-block"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                    {oficio.assinafyStatus &&
                      [
                        'certificated',
                        'expired',
                        'rejected_by_signer',
                        'rejected_by_user',
                        'failed',
                      ].includes(oficio.assinafyStatus) && (
                        <span className="mt-1.5 inline-flex items-center rounded-[6px] px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {oficio.assinafyStatus === 'certificated'
                            ? 'Assinado'
                            : oficio.assinafyStatus === 'expired'
                              ? 'Expirado'
                              : 'Rejeitado'}
                        </span>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {signatureModalOficio && (
        <SendForSignatureModal
          oficioId={signatureModalOficio.id}
          oficioNumber={signatureModalOficio.number}
          signatoryName={signatureModalOficio.signatoryName}
          isOpen={true}
          onClose={() => setSignatureModalOficio(null)}
          onSuccess={() => {
            // Table data is revalidated server-side via the action
          }}
        />
      )}
    </>
  );
}
