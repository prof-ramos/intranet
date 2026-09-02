import { FileSpreadsheet, Kanban, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { focusRingClass } from '@/lib/ui/tokens';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: 'atividade' | 'oficio' | 'busca' | 'generico';
}

const icons = {
  atividade: Kanban,
  oficio: FileSpreadsheet,
  busca: Search,
  generico: FileSpreadsheet,
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon = 'generico',
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(4,9,32,0.15)] bg-[rgba(4,9,32,0.02)] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(4,9,32,0.06)]">
        <Icon className="h-6 w-6 text-[rgba(13,31,60,0.4)]" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[#040920]">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-[rgba(13,31,60,0.5)]">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
        >
          <Plus size={14} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
