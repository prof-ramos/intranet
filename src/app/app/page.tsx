import { requireAuth } from '@/lib/auth/require-auth';
import { getDashboardViewModel } from '@/lib/dashboard/view-model';
import { Calendar, Plus } from 'lucide-react';
import Link from 'next/link';
import { DashboardActivitiesOverview } from './_dashboard/DashboardActivitiesOverview';
import { DashboardIndicators } from './_dashboard/DashboardIndicators';
import { DashboardSidebar } from './_dashboard/DashboardSidebar';

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardViewModel();
  const sidebarUser = { name: user.name, role: user.role };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-[rgba(13,31,60,0.55)] uppercase">
            Sala de operações · {today}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-none font-bold md:text-[3rem]">
            Painel da diretoria
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href="/app/atividades"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)]"
          >
            <Calendar size={16} aria-hidden="true" /> Esta semana
          </Link>
          <Link
            href="/app/atividades/nova"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260]"
          >
            <Plus size={16} aria-hidden="true" /> Nova atividade
          </Link>
        </div>
      </div>

      <DashboardIndicators stripe={data.stripe} />

      <section className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
        <DashboardActivitiesOverview statusColumns={data.statusColumns} />
        <DashboardSidebar
          topRegions={data.topRegions}
          urgentActivities={data.urgentActivities}
          user={sidebarUser}
        />
      </section>
    </main>
  );
}
