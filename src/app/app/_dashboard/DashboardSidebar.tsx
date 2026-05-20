import { AlertTriangle, Cake, Clock, Globe, Mail, Megaphone } from 'lucide-react';
import {
  borderSubtle,
  dangerText,
  hairline,
  priorityStyles,
  progressBg,
  progressFg,
  skyBlue,
  surfaceMuted,
  textMuted,
  textStrong,
  textSubtle,
} from '@/lib/ui/tokens';
import {
  formatDashboardDueDate,
  type BirthdayItem,
  type DashboardTopRegion,
  type DashboardUrgentActivity,
} from '@/lib/dashboard/view-model';
import type { AuthRole } from '@/lib/auth/config';

interface DashboardSidebarProps {
  topRegions: DashboardTopRegion[];
  urgentActivities: DashboardUrgentActivity[];
  birthdaysThisMonth: BirthdayItem[];
  user: {
    name: string;
    role: AuthRole;
  };
}



export function DashboardSidebar({ topRegions, urgentActivities, birthdaysThisMonth, user }: DashboardSidebarProps) {
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
        <div
          className="flex flex-col items-center gap-3 rounded-[10px] px-4 py-5 text-center"
          style={{ backgroundColor: surfaceMuted, border: `1px dashed ${borderSubtle}` }}
        >
          <Clock size={20} style={{ color: textSubtle }} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold" style={{ color: textStrong }}>Em desenvolvimento</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: textSubtle }}>
              Métricas de e-mail e SLA em breve.
            </p>
          </div>
        </div>
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
                <p className="shrink-0 font-sans text-sm font-bold tabular-nums">
                  {region.total}
                  <span className="ml-1.5 text-[11px] font-sans font-normal" style={{ color: textMuted }}>
                    {region.pct}%
                  </span>
                </p>
              </div>
              <div
                role="progressbar"
                aria-valuenow={region.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={region.country ?? 'Não informado'}
                className="h-1.5 overflow-hidden rounded-full"
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

      <div className="rounded-[16px] bg-white p-5" style={{ border: `1px solid ${hairline}` }}>
        <div className="mb-4 flex items-center gap-2">
          <Cake size={20} style={{ color: skyBlue }} aria-hidden="true" />
          <h2 className="font-serif text-lg leading-tight font-bold">Aniversariantes do Mês</h2>
        </div>
        {birthdaysThisMonth.length === 0 ? (
          <p className="text-sm" style={{ color: textSubtle }}>
            Nenhum aniversariante este mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {birthdaysThisMonth.map((associate, index) => (
              <li
                key={associate.id}
                className="pb-3"
                style={{
                  borderBottom:
                    index === birthdaysThisMonth.length - 1 ? 'none' : `1px solid ${hairline}`,
                }}
              >
                <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                  {associate.fullName}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: textSubtle }}>
                  {associate.assignment ?? 'Sem lotação'} · {associate.birthDayMonth}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: textMuted }}>
        Olá, {user.name.split(' ')[0]}. Logado como <span className="capitalize">{user.role}</span>.
      </p>
    </aside>
  );
}
