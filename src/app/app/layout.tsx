import { Menu } from 'lucide-react';
import { requireAuth } from '@/lib/auth/require-auth';
import { Sidebar } from '@/components/Sidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationInbox } from '@/components/NotificationInbox';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="drawer md:drawer-open min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:rounded-[8px] focus-visible:bg-[#040920] focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white focus-visible:outline-none"
      >
        Ir para o conteúdo principal
      </a>

      <input id="app-drawer" type="checkbox" className="drawer-toggle" aria-hidden="true" />

      <div id="main-content" className="drawer-content flex min-h-screen flex-col bg-[#f8fafc]">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-[rgba(4,9,32,0.05)] bg-white px-5 sm:px-8">
          <label
            htmlFor="app-drawer"
            aria-label="Abrir menu de navegação"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(4,9,32,0.04)] md:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </label>
          <div className="min-w-0 flex-1 md:max-w-lg">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex shrink-0 items-center">
            <NotificationInbox subscriberId={user.userId} />
          </div>
        </header>

        {children}
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="app-drawer" aria-label="Fechar menu" className="drawer-overlay" />
        <Sidebar user={user} />
      </div>
    </div>
  );
}
