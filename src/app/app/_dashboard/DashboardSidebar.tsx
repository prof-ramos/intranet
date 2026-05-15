import { AlertTriangle, Globe, Mail, Megaphone } from 'lucide-react';
import {
  dangerText,
  hairline,
  priorityStyles,
  progressBg,
  progressFg,
  skyBlue,
  textMuted,
  textSubtle,
} from '@/lib/ui/tokens';
import {
  formatDashboardDueDate,
  type DashboardTopRegion,
  type DashboardUrgentActivity,
} from '@/lib/dashboard/view-model';
import type { AuthRole } from '@/lib/auth/config';

interface DashboardSidebarProps {
  topRegions: DashboardTopRegion[];
  urgentActivities: DashboardUrgentActivity[];
  user: {
    name: string;
    role: AuthRole;
  };
}

export function DashboardSidebar({ topRegions, urgentActivities, user }: DashboardSidebarProps) {
  return (
    <aside className="flex w-full min-w-0 flex-col gap-5">
      <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
        <div className="mb-4 flex items-center gap-2">
          <Megaphone size={20} style={{ color: skyBlue }} aria-hidden="true" />
          <h2 className="font-serif text-lg leading-tight font-bold">Pendências</h2>
        </div>

        {urgentActivities.length === 0 ? (
          <p className="text-sm" style={{ color: textSubtle }}>
            Nenhuma atividade atrasada.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {urgentActivities.map((activity, index) => {
              const dueDate = formatDashboardDueDate(activity.dueDate);
              return (
                <li
                  key={activity.id}
                  className="grid grid-cols-[24px_1fr] gap-3 pb-3.5"
                  style={{
                    borderBottom:
                      index === urgentActivities.length - 1 ? 'none' : `1px solid ${hairline}`,
                  }}
                >
                  <AlertTriangle
                    size={20}
                    aria-hidden="true"
                    className="mt-0.5"
                    style={{ color: dangerText }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: textSubtle }}>
                      {priorityStyles[activity.priority].label ?? activity.priority}
                      {dueDate ? ` · vencimento ${dueDate}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
        <div className="mb-4 flex items-center gap-2">
          <Mail size={20} style={{ color: skyBlue }} aria-hidden="true" />
          <h2 className="font-serif text-lg leading-tight font-bold">Comunicação</h2>
        </div>
        <p className="text-sm leading-snug font-semibold">
          Módulo de comunicação em desenvolvimento
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: textSubtle }}>
          Aguarde atualizações para métricas de e-mail e SLA.
        </p>
      </div>

      <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
        <div className="mb-4 flex items-center gap-2">
          <Globe size={20} style={{ color: skyBlue }} aria-hidden="true" />
          <h2 className="font-serif text-lg leading-tight font-bold">Associados por país</h2>
        </div>
        <ul className="flex flex-col gap-3">
          {topRegions.map((region) => (
            <li key={region.country ?? 'sem-pais'}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">{region.country ?? 'Não informado'}</p>
                <p className="font-serif text-sm font-bold">{region.total}</p>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full"
                style={{ backgroundColor: progressBg }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ backgroundColor: progressFg, width: `${region.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: textMuted }}>
        Olá, {user.name.split(' ')[0]}. Logado como <span className="capitalize">{user.role}</span>.
      </p>
    </aside>
  );
}
