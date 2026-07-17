'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { createAssociate } from '@/app/app/associados/actions';
import {
  AssociateFormFields,
  associateInputStyle,
  createAssociateFormValues,
} from '@/app/app/associados/_components/AssociateFormFields';
import { focusRingClass } from '@/lib/ui/tokens';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('associados:create-form');

interface Props {
  canEditInternalNotes: boolean;
}

/** Só controla quantas linhas existem; valores vivem no FormData (inputs uncontrolled). */
function DependentsCreateSection() {
  const [rowKeys, setRowKeys] = useState<string[]>(['dep-0']);
  return (
    <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-[22px] leading-tight font-bold">Dependentes</h2>
        <button
          type="button"
          className={`inline-flex h-9 items-center rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-3 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          onClick={() =>
            setRowKeys((previous) => [...previous, `dep-${previous.length}-${Date.now()}`])
          }
        >
          Adicionar dependente
        </button>
      </div>
      <p className="text-base-content/60 mb-4 text-sm">
        Opcional no cadastro. Linhas vazias são ignoradas; nome sem parentesco (ou o inverso) gera
        erro. É possível editar depois no perfil.
      </p>
      <div className="space-y-3">
        {rowKeys.map((key) => (
          <div key={key} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor={`dependentName-${key}`} className="label">
                <span className="label-text font-semibold">Nome</span>
              </label>
              <input
                id={`dependentName-${key}`}
                name="dependentName"
                type="text"
                className={associateInputStyle}
                placeholder="Nome completo"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor={`dependentRelationship-${key}`} className="label">
                <span className="label-text font-semibold">Parentesco</span>
              </label>
              <input
                id={`dependentRelationship-${key}`}
                name="dependentRelationship"
                type="text"
                className={associateInputStyle}
                placeholder="Ex.: cônjuge, filho(a)"
                autoComplete="off"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className={`mb-1 inline-flex h-10 items-center rounded-[8px] px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40 ${focusRingClass}`}
                disabled={rowKeys.length <= 1}
                onClick={() =>
                  setRowKeys((previous) => previous.filter((rowKey) => rowKey !== key))
                }
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CriarAssociadoForm({ canEditInternalNotes }: Props) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function handleSubmit(formData: FormData) {
    setError('');
    setSaving(true);
    try {
      await createAssociate(formData);
    } catch (caught) {
      const errorValue = caught instanceof Error ? caught : null;
      const digest =
        errorValue &&
        'digest' in errorValue &&
        typeof (errorValue as { digest?: string }).digest === 'string'
          ? (errorValue as { digest?: string }).digest
          : undefined;
      if (digest?.startsWith('NEXT_REDIRECT') || errorValue?.message?.startsWith('NEXT_REDIRECT'))
        throw caught;
      logger.error('[CriarAssociadoForm] create error', { error: toSafeErrorLog(caught) });
      const message = errorValue?.message ?? '';
      setError(
        message && /já existe|inválido/i.test(message)
          ? message
          : 'Erro ao cadastrar. Verifique os dados e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/app/associados"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[rgba(13,31,60,0.40)] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-base-content/55 text-[11px] tracking-[0.18em] uppercase">
            Cadastro de Oficiais / Novo
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Cadastrar oficial</h1>
        </div>
      </div>
      <form action={handleSubmit} className="max-w-3xl">
        <AssociateFormFields
          values={createAssociateFormValues}
          mode="create"
          canEditInternalNotes={canEditInternalNotes}
        />
        <DependentsCreateSection />
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-[8px] border border-[#fca5a5] bg-[#fee2e2] px-4 py-3 text-sm text-[#7f1d1d]"
          >
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] ${focusRingClass}`}
          >
            <Save size={16} aria-hidden="true" />
            {saving ? 'Cadastrando...' : 'Cadastrar oficial'}
          </button>
          <Link
            href="/app/associados"
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
