import { requireAuth } from '@/lib/auth/require-auth';
import { getDocuments } from '@/lib/documents/queries';
import { DocumentList } from './_components/DocumentList';
import { navy, textMuted } from '@/lib/ui/tokens';

export default async function DocumentosPage() {
  const user = await requireAuth();
  const initialDocuments = await getDocuments();

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
          Secretaria
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold md:text-[3rem]" style={{ color: navy }}>
          Documentos
        </h1>
        <p className="mt-1 text-sm" style={{ color: textMuted }}>
          Modelos de contratos, minutas, atas e outros arquivos da associação.
        </p>
      </div>

      <DocumentList initialDocuments={initialDocuments} userRole={user.role} />
    </main>
  );
}
