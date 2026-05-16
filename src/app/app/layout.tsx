import { Menu } from 'lucide-react';
import { requireAuth } from '@/lib/auth/require-auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="drawer min-h-screen md:drawer-open">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-[8px] focus-visible:bg-[#040920] focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white focus-visible:outline-none"
      >
        Ir para o conteúdo principal
      </a>

      <input id="app-drawer" type="checkbox" className="drawer-toggle" aria-hidden="true" />

      <div id="main-content" className="drawer-content flex min-h-screen flex-col bg-[#f8fafc]">
        <header className="flex min-h-14 items-center justify-between border-b border-[rgba(4,9,32,0.05)] bg-white px-5 sm:px-8 md:hidden">
          <label
            htmlFor="app-drawer"
            aria-label="Abrir menu de navegação"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(4,9,32,0.04)]"
          >
            <Menu size={22} aria-hidden="true" />
          </label>
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
