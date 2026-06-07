import { MailX, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TriagemNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <MailX className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#040920]">Triagem não encontrada</h1>
        <p className="max-w-md text-[#59677a]">
          O e-mail de triagem solicitado não existe ou foi removido. Verifique o link ou volte para a lista.
        </p>
        <Link
          href="/app/email-triage"
          className="inline-flex items-center gap-2 rounded-lg bg-[#040920] px-4 py-2 text-white transition hover:bg-[#06284f]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para triagem
        </Link>
      </div>
    </div>
  );
}
