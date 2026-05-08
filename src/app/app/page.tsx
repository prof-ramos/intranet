import { requireAuth } from '@/lib/auth/require-auth';

export default async function DashboardPage() {
  const user = await requireAuth();
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 opacity-70">Bem-vindo, {user.name}.</p>
    </div>
  );
}
