import { requireAuth } from '@/lib/auth/require-auth';
import { getDashboardViewModel } from '@/lib/dashboard/view-model';
import { focusRingClass } from '@/lib/ui/tokens';
import { Calendar, Plus } from 'lucide-react';
import Link from 'next/link';
import { DashboardActivitiesOverview } from './_dashboard/DashboardActivitiesOverview';
import { DashboardDispatchStrip } from './_dashboard/DashboardDispatchStrip';
import { DashboardIndicators } from './_dashboard/DashboardIndicators';
import { DashboardSidebar } from './_dashboard/DashboardSidebar';
import { WelcomeBanner } from './_dashboard/WelcomeBanner';
import { formatBusinessDate } from '@/lib/utils/date';

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardViewModel();
  const sidebarUser = { name: user.name, role: user.role };

  const today = formatBusinessDate();

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <WelcomeBanner userName={user.name} isNewUser={false} />

      <div className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
            Sala de operações · {today}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold text-[#040920] md:text-[3rem]">
            Painel Administrativo
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Link
            href="/app/atividades"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] lg:min-h-10 ${focusRingClass}`}
          >
            <Calendar size={16} aria-hidden="true" /> Esta semana
          </Link>
          <Link
            href="/app/atividades/nova"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] lg:min-h-10 ${focusRingClass}`}
          >
            <Plus size={16} aria-hidden="true" /> Nova atividade
          </Link>
        </div>
      </div>

      <DashboardDispatchStrip urgentActivities={data.urgentActivities} />

      <DashboardIndicators stripe={data.stripe} inadimplentesCount={data.inadimplentesCount} />

      <section className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
        <DashboardActivitiesOverview statusColumns={data.statusColumns} />
        <DashboardSidebar
          topRegions={data.topRegions}
          birthdaysThisMonth={data.birthdaysThisMonth}
          user={sidebarUser}
        />
      </section>
    </main>
  );
}
