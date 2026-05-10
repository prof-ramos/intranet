import { Menu } from 'lucide-react';
import { requireAuth } from '@/lib/auth/require-auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="drawer md:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" aria-hidden="true" />

      <div id="main-content" className="drawer-content flex flex-col">
        <header className="flex items-center justify-between border-b border-[rgba(4,9,32,0.05)] bg-white md:hidden">
          <label
            htmlFor="app-drawer"
            aria-label="Abrir menu de navegação"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[rgba(4,9,32,0.04)]"
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
