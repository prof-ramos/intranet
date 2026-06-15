import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { hairline, focusRingClass, textMuted } from '@/lib/ui/tokens';
import type { AssociateListItem } from '@/lib/associates/repository';
import { StatusBadge } from './StatusBadge';

interface AssociatesTableProps {
  rows: AssociateListItem[];
  currentListUrl: string;
}

function AssociateCard({ row, currentListUrl }: { row: AssociateListItem; currentListUrl: string }) {
  return (
    <div
      key={row.id}
      className="border-b p-4"
      style={{ borderColor: hairline }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link
          href={`/app/associados/${row.id}?returnTo=${encodeURIComponent(currentListUrl)}`}
          className={`font-medium hover:underline ${focusRingClass}`}
        >
          {row.fullName}
        </Link>
        <Link
          href={`/app/associados/${row.id}/editar?returnTo=${encodeURIComponent(currentListUrl)}`}
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[rgba(13,31,60,0.55)] hover:bg-[#f8fafc] hover:text-[#76aeea] ${focusRingClass}`}
          aria-label={`Editar ${row.fullName}`}
        >
          <Pencil size={14} aria-hidden="true" />
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Lotação</dt>
          <dd className="font-medium">{row.assignment ?? '—'}</dd>
        </div>
        {row.siape && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>SIAPE</dt>
            <dd className="font-mono">{row.siape}</dd>
          </div>
        )}
        {row.primaryEmail && (
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Email</dt>
            <dd className="break-all">{row.primaryEmail}</dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Situação</dt>
          <dd><StatusBadge type="functional" value={row.functionalStatus} /></dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Associativo</dt>
          <dd><StatusBadge type="association" value={row.associationStatus} /></dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Contribuição</dt>
          <dd><StatusBadge type="contribution" value={row.contributionStatus} /></dd>
        </div>
        {(row.whatsapp || row.phone) && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Telefone</dt>
            <dd className="font-mono">{row.whatsapp ?? row.phone}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function AssociatesTable({ rows, currentListUrl }: AssociatesTableProps) {
  return (
    <div style={{ borderColor: hairline }}>
      {/* Mobile cards */}
      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: textMuted }}>
            Nenhum associado encontrado.
          </div>
        ) : (
          rows.map((row) => (
            <AssociateCard key={row.id} row={row} currentListUrl={currentListUrl} />
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto border-t" style={{ borderColor: hairline }}>
        <table className="w-full text-sm" aria-label="Lista de associados">
          <thead className="bg-[#040920] text-white">
            <tr className="text-left">
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Lotação
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                SIAPE
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Situação
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Associativo
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Contribuição
              </th>
              <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                Telefone
              </th>
              <th scope="col" className="w-10 px-4 py-3 text-center" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center" style={{ color: textMuted }}>
                  Nenhum associado encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="group border-b transition-colors hover:bg-[#f8fafc]"
                  style={{ borderColor: hairline }}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/app/associados/${row.id}?returnTo=${encodeURIComponent(currentListUrl)}`}
                      className={`hover:underline ${focusRingClass}`}
                    >
                      {row.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.assignment ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.siape ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{row.primaryEmail ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge type="functional" value={row.functionalStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="association" value={row.associationStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="contribution" value={row.contributionStatus} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.whatsapp ?? row.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/app/associados/${row.id}/editar?returnTo=${encodeURIComponent(currentListUrl)}`}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[rgba(13,31,60,0.55)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#f8fafc] hover:text-[#76aeea] focus-visible:opacity-100 ${focusRingClass}`}
                      aria-label={`Editar ${row.fullName}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
