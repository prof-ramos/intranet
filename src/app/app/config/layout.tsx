import { requireRole } from '@/lib/auth/authorization';

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['admin', 'diretoria', 'secretaria']);

  return <>{children}</>;
}
