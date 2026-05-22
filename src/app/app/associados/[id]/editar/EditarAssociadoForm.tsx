'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { updateAssociate } from '@/app/app/associados/actions';
import { focusRingClass } from '@/lib/ui/tokens';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('associados:edit-form');

interface Props {
  associate: {
    id: number;
    fullName: string;
    cpf: string | null;
    siape: string | null;
    primaryEmail: string | null;
    secondaryEmail: string | null;
    phone: string | null;
    whatsapp: string | null;
    birthDate: string | null;
    address: string | null;
    locationCity: string | null;
    locationCountry: string | null;
    assignment: string | null;
    assignmentStartDate: string | null;
    classPattern: string | null;
    associationCategory: string | null;
    functionalStatus: string | null;
    associationStatus: string;
    contributionStatus: string;
    internalNotes?: string | null;
  };
  canEditInternalNotes: boolean;
}

export function EditarAssociadoForm({ associate, canEditInternalNotes }: Props) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError('');
    setSaving(true);
    try {
      await updateAssociate(formData);
    } catch (e) {
      const err = e instanceof Error ? e : null;
      const digest =
        err && 'digest' in err && typeof (err as { digest?: string }).digest === 'string'
          ? (err as { digest?: string }).digest
          : undefined;
      if (digest?.startsWith('NEXT_REDIRECT') || err?.message?.startsWith('NEXT_REDIRECT')) {
        throw e;
      }
      logger.error('[EditarAssociadoForm] update error', { error: toSafeErrorLog(e) });
      setError('Erro ao salvar. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/app/associados/${associate.id}`}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[rgba(13,31,60,0.40)] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-base-content/55 text-[11px] tracking-[0.18em] uppercase">
            Associados / Editar
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Editar associado</h1>
        </div>
      </div>

      <form action={handleSubmit} className="max-w-3xl">
        <input type="hidden" name="id" value={associate.id} />

        {/* Identificação */}
        <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
          <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Identificação</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="label">
                <span className="label-text font-semibold">Nome completo *</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                defaultValue={associate.fullName}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="cpf" className="label">
                <span className="label-text font-semibold">CPF</span>
              </label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                defaultValue={associate.cpf ?? ''}
                className="input input-bordered w-full"
                placeholder="000.000.000-00"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="siape" className="label">
                <span className="label-text font-semibold">SIAPE</span>
              </label>
              <input
                id="siape"
                name="siape"
                type="text"
                defaultValue={associate.siape ?? ''}
                className="input input-bordered w-full"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="birthDate" className="label">
                <span className="label-text font-semibold">Data de nascimento</span>
              </label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={associate.birthDate ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="primaryEmail" className="label">
                <span className="label-text font-semibold">E-mail principal</span>
              </label>
              <input
                id="primaryEmail"
                name="primaryEmail"
                type="email"
                defaultValue={associate.primaryEmail ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="secondaryEmail" className="label">
                <span className="label-text font-semibold">E-mail alternativo</span>
              </label>
              <input
                id="secondaryEmail"
                name="secondaryEmail"
                type="email"
                defaultValue={associate.secondaryEmail ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="phone" className="label">
                <span className="label-text font-semibold">Telefone</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={associate.phone ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="label">
                <span className="label-text font-semibold">WhatsApp</span>
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                defaultValue={associate.whatsapp ?? ''}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
          <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Endereço</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className="label">
                <span className="label-text font-semibold">Endereço</span>
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={associate.address ?? ''}
                className="textarea textarea-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="locationCity" className="label">
                <span className="label-text font-semibold">Cidade</span>
              </label>
              <input
                id="locationCity"
                name="locationCity"
                type="text"
                defaultValue={associate.locationCity ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="locationCountry" className="label">
                <span className="label-text font-semibold">País</span>
              </label>
              <input
                id="locationCountry"
                name="locationCountry"
                type="text"
                defaultValue={associate.locationCountry ?? ''}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </section>

        {/* Administrativo */}
        <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
          <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Administrativo</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="assignment" className="label">
                <span className="label-text font-semibold">Lotação atual</span>
              </label>
              <input
                id="assignment"
                name="assignment"
                type="text"
                defaultValue={associate.assignment ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="assignmentStartDate" className="label">
                <span className="label-text font-semibold">Início da lotação</span>
              </label>
              <input
                id="assignmentStartDate"
                name="assignmentStartDate"
                type="date"
                defaultValue={associate.assignmentStartDate ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="classPattern" className="label">
                <span className="label-text font-semibold">Classe / Padrão</span>
              </label>
              <input
                id="classPattern"
                name="classPattern"
                type="text"
                defaultValue={associate.classPattern ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="associationCategory" className="label">
                <span className="label-text font-semibold">Categoria</span>
              </label>
              <input
                id="associationCategory"
                name="associationCategory"
                type="text"
                defaultValue={associate.associationCategory ?? ''}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label htmlFor="functionalStatus" className="label">
                <span className="label-text font-semibold">Situação funcional</span>
              </label>
              <select
                id="functionalStatus"
                name="functionalStatus"
                defaultValue={associate.functionalStatus ?? ''}
                className="select select-bordered w-full"
              >
                <option value="">Selecione...</option>
                <option value="ativo">Ativo</option>
                <option value="aposentado">Aposentado</option>
                <option value="cedido">Cedido</option>
                <option value="em_licenca">Em licença</option>
              </select>
            </div>

            <div>
              <label htmlFor="associationStatus" className="label">
                <span className="label-text font-semibold">Situação associativa</span>
              </label>
              <select
                id="associationStatus"
                name="associationStatus"
                defaultValue={associate.associationStatus}
                className="select select-bordered w-full"
              >
                <option value="">Selecione...</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div>
              <label htmlFor="contributionStatus" className="label">
                <span className="label-text font-semibold">Contribuição</span>
              </label>
              <select
                id="contributionStatus"
                name="contributionStatus"
                defaultValue={associate.contributionStatus}
                className="select select-bordered w-full"
              >
                <option value="">Selecione...</option>
                <option value="em_dia">Em dia</option>
                <option value="inadimplente">Inadimplente</option>
                <option value="pendente_migracao">Pendente migração</option>
              </select>
            </div>
          </div>
        </section>

        {canEditInternalNotes && (
          /* Observações */
          <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
            <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">
              Observações internas
            </h2>
            <div>
              <label htmlFor="internalNotes" className="label">
                <span className="label-text font-semibold">Notas</span>
              </label>
              <textarea
                id="internalNotes"
                name="internalNotes"
                rows={5}
                defaultValue={associate.internalNotes ?? ''}
                className="textarea textarea-bordered w-full"
                placeholder="Notas internas sobre o associado..."
              />
            </div>
          </section>
        )}

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
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <Link
            href={`/app/associados/${associate.id}`}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
