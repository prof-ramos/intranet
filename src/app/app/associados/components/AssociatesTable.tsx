import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { focusRingClass, textMuted } from '@/lib/ui/tokens';
import type { AssociateListItem } from '@/lib/associates/repository';
import { StatusBadge } from './StatusBadge';

interface AssociatesTableProps {
  rows: AssociateListItem[];
  currentListUrl: string;
}

function AssociateCard({ row, currentListUrl }: { row: AssociateListItem; currentListUrl: string }) {
  return (
    <Link
      href={`/app/associados/${row.id}?returnTo=${encodeURIComponent(currentListUrl)}`}
      className={`group block rounded-[8px] border border-[rgba(4,9,32,0.08)] bg-white p-4 transition-colors hover:border-[rgba(13,50,96,0.28)] hover:bg-[#f8fafc] ${focusRingClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{row.fullName}</h2>
          <p className="mt-1 text-sm" style={{ color: textMuted }}>
            {row.assignment ?? 'Lotação não informada'}
          </p>
        </div>
        <ChevronRight
          size={18}
          aria-hidden="true"
          className="mt-1 shrink-0 text-[rgba(13,31,60,0.35)] transition-transform group-hover:translate-x-0.5"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge type="functional" value={row.functionalStatus} />
        <StatusBadge type="association" value={row.associationStatus} />
      </div>
    </Link>
  );
}

export function AssociatesTable({ rows, currentListUrl }: AssociatesTableProps) {
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <div role="status" className="rounded-[8px] border border-[rgba(4,9,32,0.08)] bg-white py-16 text-center text-sm" style={{ color: textMuted }}>
          Nenhum oficial encontrado.
        </div>
      ) : (
        rows.map((row) => (
          <AssociateCard key={row.id} row={row} currentListUrl={currentListUrl} />
        ))
      )}
      </div>
  );
}
