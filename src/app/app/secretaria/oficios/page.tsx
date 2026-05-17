import Link from 'next/link';
import { getOfficialLettersAction } from './actions';
import { FilePlus, Download, Edit2, Ban, Search } from 'lucide-react';
import {
  navy,
  textMuted,
  hairline,
  primaryContainerHover,
  success,
  error,
  warning,
  focusRingClass
} from '@/lib/ui/tokens';
import { CSSProperties } from 'react';

export default async function OficiosPage() {
  const oficios = await getOfficialLettersAction();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
            Secretaria
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold md:text-[3rem]">
            Ofícios
          </h1>
        </div>
        <Link
          href="/app/secretaria/oficios/novo"
          className={`inline-flex h-10 items-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] ${focusRingClass}`}
          style={{ backgroundColor: navy, '--primary-hover': primaryContainerHover } as CSSProperties}
        >
          <FilePlus size={18} aria-hidden="true" /> Novo Ofício
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-[12px] border bg-white px-4 py-2" style={{ borderColor: hairline }}>
        <Search size={18} style={{ color: textMuted }} aria-hidden="true" />
        <input
          type="text"
          placeholder="Buscar por número, destinatário ou assunto…"
          aria-label="Buscar ofícios"
          className={`flex-1 text-sm ${focusRingClass}`}
        />
      </div>

      <div className="overflow-x-auto rounded-[16px] bg-white" style={{ border: `1px solid ${hairline}` }}>
        <table className="w-full text-left">
          <thead className="border-b bg-slate-50/50" style={{ borderColor: hairline }}>
            <tr>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Número</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Destinatário</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Data</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Assunto</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: hairline }}>
            {oficios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: textMuted }}>
                  Nenhum ofício encontrado.
                </td>
              </tr>
            ) : (
              oficios.map((oficio) => (
                <tr key={oficio.id} className="hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold">{oficio.number}</td>
                  <td className="px-6 py-4">
                    <span 
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                      style={{ 
                        backgroundColor: oficio.status === 'gerado' ? `${success}15` : oficio.status === 'cancelado' ? `${error}15` : `${warning}15`,
                        color: oficio.status === 'gerado' ? success : oficio.status === 'cancelado' ? error : warning
                      }}
                    >
                      {oficio.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm max-w-[200px] truncate">{oficio.recipient}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{oficio.letterDate}</td>
                  <td className="px-6 py-4 text-sm max-w-[250px] truncate">{oficio.subject}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/secretaria/oficios/${oficio.id}/editar`}
                        className={`p-1 text-slate-400 hover:text-navy transition-colors ${focusRingClass}`}
                        title="Editar"
                        aria-label="Editar ofício"
                      >
                        <Edit2 size={18} aria-hidden="true" />
                      </Link>
                      <a
                        href={`/api/oficios/${oficio.id}/download`}
                        className={`p-1 text-slate-400 hover:text-navy transition-colors ${focusRingClass}`}
                        title="Download PDF"
                        aria-label="Download PDF"
                        download
                      >
                        <Download size={18} aria-hidden="true" />
                      </a>
                      {oficio.status !== 'cancelado' && (
                        <button
                          type="button"
                          className={`p-1 text-slate-400 hover:text-error transition-colors ${focusRingClass}`}
                          title="Cancelar"
                          aria-label="Cancelar ofício"
                        >
                          <Ban size={18} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
