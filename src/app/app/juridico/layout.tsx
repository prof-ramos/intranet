import { requireRole } from '@/lib/auth/authorization';

export default async function JuridicoLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['admin', 'diretoria']);

  return <>{children}</>;
}
