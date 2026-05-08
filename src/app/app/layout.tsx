import { Menu } from 'lucide-react';
import { requireAuth } from '@/lib/auth/require-auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        <header className="navbar border-b border-base-300 bg-base-100 lg:hidden">
          <label
            htmlFor="app-drawer"
            aria-label="Abrir menu de navegação"
            className="btn btn-square btn-ghost"
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
