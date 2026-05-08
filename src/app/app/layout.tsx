import { requireAuth } from '@/lib/auth/require-auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
