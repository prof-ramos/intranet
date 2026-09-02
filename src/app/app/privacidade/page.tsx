import { requireAuth } from '@/lib/auth/require-auth';
import { requestDataDownload, requestAccountDeletion } from '@/app/app/privacidade/actions';
import { PageHeader } from '@/components/PageHeader';
import {
  focusRingClass,
  textPrimary,
  textMuted,
  hairline,
  navy,
  alertDangerBorder,
  alertDangerBg,
  alertDangerText,
  alertDangerNoteBg,
  alertDangerNoteText,
  alertDangerNoteBorder,
  alertDangerButtonBorder,
} from '@/lib/ui/tokens';
import { Download, Trash2, ShieldAlert } from 'lucide-react';

const wrappedRequestDataDownload = async (_formData: FormData) => {
  'use server';
  await requestDataDownload();
};

const wrappedRequestAccountDeletion = async (_formData: FormData) => {
  'use server';
  await requestAccountDeletion();
};

export const metadata = {
  title: 'Privacidade e LGPD - ASOF',
};

export default async function PrivacidadePage() {
  await requireAuth();

  return (
    <main className="mx-auto flex w-full max-w-[800px] flex-1 flex-col px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Compliance · LGPD"
        title="Privacidade e Transparência"
        description="Gerencie seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD)."
      />

      <section
        className="mb-10 rounded-[16px] border bg-white p-6 sm:p-8"
        style={{ borderColor: hairline }}
      >
        <h2 className="mb-4 text-xl font-bold" style={{ color: textPrimary }}>
          Direito de Acesso e Portabilidade
        </h2>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: textMuted }}>
          Você tem o direito de solicitar uma cópia de todos os seus dados pessoais e transacionais
          armazenados pela ASOF. Ao solicitar, a Secretaria irá compilar um relatório estruturado
          contendo suas informações cadastrais, histórico de contribuições e demais registros
          vinculados ao seu titular, e os enviará para o seu e-mail cadastrado.
        </p>
        <form action={wrappedRequestDataDownload}>
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
            style={{ backgroundColor: navy }}
          >
            <Download size={16} aria-hidden="true" />
            Baixar meus dados
          </button>
        </form>
      </section>

      <section
        className="rounded-[16px] border p-6 sm:p-8"
        style={{ borderColor: alertDangerBorder, backgroundColor: alertDangerBg }}
      >
        <div className="mb-4 flex items-center gap-2" style={{ color: alertDangerText }}>
          <ShieldAlert size={24} />
          <h2 className="text-xl font-bold">Direito ao Esquecimento</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: textMuted }}>
          Você tem o direito de solicitar a exclusão ou anonimização permanente da sua conta e de
          seus dados sensíveis. No entanto, este direito não é absoluto.
        </p>

        <div
          className="mb-6 rounded-[8px] border p-4 text-sm"
          style={{
            backgroundColor: alertDangerNoteBg,
            color: alertDangerNoteText,
            borderColor: alertDangerNoteBorder,
          }}
        >
          <strong>Atenção ao Estatuto Social (Art. 14):</strong> Sua solicitação será analisada pela
          Secretaria. A desfiliação e o apagamento dos dados só podem ser efetuados caso você{' '}
          <strong>não possua débitos ou processos em andamento</strong> com a Associação. A ASOF
          reserva-se o direito de manter os dados (LGPD Art. 16) necessários ao exercício regular em
          processos judiciais ou financeiros.
        </div>

        <form action={wrappedRequestAccountDeletion}>
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border bg-white px-5 text-sm font-semibold transition-colors hover:border-[#f87171] hover:bg-[#fef2f2] ${focusRingClass}`}
            style={{
              color: alertDangerText,
              borderColor: alertDangerButtonBorder,
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            Solicitar Exclusão
          </button>
        </form>
      </section>
    </main>
  );
}
