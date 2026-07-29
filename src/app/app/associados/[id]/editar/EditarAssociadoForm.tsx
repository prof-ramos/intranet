'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { updateAssociate } from '@/app/app/associados/actions';
import {
  AssociateFormFields,
  type AssociateFormValues,
} from '@/app/app/associados/_components/AssociateFormFields';
import { focusRingClass } from '@/lib/ui/tokens';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import type { EditAssociateDTO } from '@/lib/associates/service';

const logger = createLogger('associados:edit-form');

interface Props {
  associate: EditAssociateDTO;
  canEditInternalNotes: boolean;
}

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function toFormValues(associate: EditAssociateDTO): AssociateFormValues {
  return {
    fullName: associate.fullName,
    cpf: associate.cpf ?? '',
    rg: associate.rg ?? '',
    rgIssuer: associate.rgIssuer ?? '',
    rgState: associate.rgState ?? '',
    rgExpeditionDate: associate.rgExpeditionDate ?? '',
    siape: associate.siape ?? '',
    sex: associate.sex ?? '',
    maritalStatus: associate.maritalStatus ?? '',
    birthDate: associate.birthDate ?? '',
    birthCity: associate.birthCity ?? '',
    birthState: associate.birthState ?? '',
    primaryEmail: associate.primaryEmail ?? '',
    secondaryEmail: associate.secondaryEmail ?? '',
    phone: associate.phone ?? '',
    whatsapp: associate.whatsapp ?? '',
    address: associate.address ?? '',
    neighborhood: associate.neighborhood ?? '',
    addressState: associate.addressState ?? '',
    zipCode: associate.zipCode ?? '',
    locationCity: associate.locationCity ?? '',
    locationCountry: associate.locationCountry ?? '',
    functionalStatus: associate.functionalStatus ?? '',
    missionType: associate.missionType ?? '',
    careerOrigin: associate.careerOrigin ?? '',
    classPattern: associate.classPattern ?? '',
    assignment: associate.assignment ?? '',
    assignmentStartDate: associate.assignmentStartDate ?? '',
    admissionDate: associate.admissionDate ?? '',
    inaugurationDate: associate.inaugurationDate ?? '',
    retirementDate: toDateInputValue(associate.retirementDate),
    leaveDate: toDateInputValue(associate.leaveDate),
    cancellationDate: toDateInputValue(associate.cancellationDate),
    associationCategory: associate.associationCategory ?? '',
    joinedAt: toDateInputValue(associate.joinedAt),
    associationStatus: associate.associationStatus,
    contributionStatus: associate.contributionStatus,
    paymentMethod: associate.paymentMethod,
    ceocMember: associate.ceocMember === true,
    caocMember: associate.caocMember === true,
    internalNotes: associate.internalNotes ?? '',
  };
}

export function EditarAssociadoForm({ associate, canEditInternalNotes }: Props) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function handleSubmit(formData: FormData) {
    setError('');
    setSaving(true);
    try {
      await updateAssociate(formData);
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
      logger.error('[EditarAssociadoForm] update error', { error: toSafeErrorLog(caught) });
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
            Cadastro de Oficiais / Editar
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Editar oficial</h1>
        </div>
      </div>
      <form action={handleSubmit} className="max-w-3xl">
        <input type="hidden" name="id" value={associate.id} />
        <AssociateFormFields
          values={toFormValues(associate)}
          mode="edit"
          canEditInternalNotes={canEditInternalNotes}
        />
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
