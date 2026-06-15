'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { updateAssociate } from '@/app/app/associados/actions';
import { focusRingClass } from '@/lib/ui/tokens';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('associados:edit-form');

const inputStyle = 'input input-bordered w-full';
const selectStyle = 'select select-bordered w-full';
const textareaStyle = 'textarea textarea-bordered w-full';

const sexOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

const maritalStatusOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'separado', label: 'Separado(a)' },
  { value: 'outros', label: 'Outros' },
];

const missionTypeOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'permanente', label: 'Permanente' },
  { value: 'transitoria', label: 'Transitória' },
];

const careerOriginOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'brasil', label: 'Brasil' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'outros_orgaos', label: 'Outros Órgãos' },
];

const paymentMethodOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'folha', label: 'Folha de pagamento' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'Pix' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outros', label: 'Outros' },
];

const functionalStatusOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'aposentado', label: 'Aposentado' },
  { value: 'cedido', label: 'Cedido' },
  { value: 'em_licenca', label: 'Em licença' },
];

const associationStatusOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
];

const contributionStatusOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'em_dia', label: 'Em dia' },
  { value: 'inadimplente', label: 'Inadimplente' },
  { value: 'pendente_migracao', label: 'Pendente migração' },
];

interface Props {
  associate: {
    id: number;
    fullName: string;
    cpf: string | null;
    rg: string | null;
    rgIssuer: string | null;
    rgState: string | null;
    rgExpeditionDate: string | null;
    siape: string | null;
    sex: string | null;
    maritalStatus: string | null;
    birthDate: string | null;
    birthCity: string | null;
    birthState: string | null;
    primaryEmail: string | null;
    secondaryEmail: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    neighborhood: string | null;
    addressState: string | null;
    zipCode: string | null;
    locationCity: string | null;
    locationCountry: string | null;
    assignment: string | null;
    assignmentStartDate: string | null;
    classPattern: string | null;
    associationCategory: string | null;
    functionalStatus: string | null;
    associationStatus: string;
    contributionStatus: string;
    paymentMethod: string;
    missionType: string | null;
    careerOrigin: string | null;
    admissionDate: string | null;
    inaugurationDate: string | null;
    cancellationDate: string | null;
    ceocMember: boolean | null;
    caocMember: boolean | null;
    internalNotes?: string | null;
  };
  canEditInternalNotes: boolean;
}

function SelectField({
  id,
  label,
  options,
  defaultValue,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        <span className="label-text font-semibold">{label}</span>
      </label>
      <select id={id} name={id} defaultValue={defaultValue ?? ''} className={selectStyle}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  id,
  label,
  defaultChecked,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <input
        id={id}
        name={id}
        type="checkbox"
        defaultChecked={defaultChecked ?? false}
        className="checkbox checkbox-sm"
      />
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
    </div>
  );
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
                className={inputStyle}
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
                className={inputStyle}
                placeholder="000.000.000-00"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="rg" className="label">
                <span className="label-text font-semibold">RG</span>
              </label>
              <input
                id="rg"
                name="rg"
                type="text"
                defaultValue={associate.rg ?? ''}
                className={inputStyle}
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="rgIssuer" className="label">
                <span className="label-text font-semibold">Órgão Expedidor</span>
              </label>
              <input
                id="rgIssuer"
                name="rgIssuer"
                type="text"
                defaultValue={associate.rgIssuer ?? ''}
                className={inputStyle}
                placeholder="SSP"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="rgState" className="label">
                <span className="label-text font-semibold">UF RG</span>
              </label>
              <input
                id="rgState"
                name="rgState"
                type="text"
                defaultValue={associate.rgState ?? ''}
                className={inputStyle}
                maxLength={2}
                placeholder="DF"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="rgExpeditionDate" className="label">
                <span className="label-text font-semibold">Data expedição RG</span>
              </label>
              <input
                id="rgExpeditionDate"
                name="rgExpeditionDate"
                type="date"
                defaultValue={associate.rgExpeditionDate ?? ''}
                className={inputStyle}
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
                className={inputStyle}
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <SelectField
              id="sex"
              label="Sexo"
              options={sexOptions}
              defaultValue={associate.sex ?? ''}
            />

            <SelectField
              id="maritalStatus"
              label="Estado civil"
              options={maritalStatusOptions}
              defaultValue={associate.maritalStatus ?? ''}
            />

            <div>
              <label htmlFor="birthDate" className="label">
                <span className="label-text font-semibold">Data de nascimento</span>
              </label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={associate.birthDate ?? ''}
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="birthCity" className="label">
                <span className="label-text font-semibold">Naturalidade</span>
              </label>
              <input
                id="birthCity"
                name="birthCity"
                type="text"
                defaultValue={associate.birthCity ?? ''}
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="birthState" className="label">
                <span className="label-text font-semibold">UF Naturalidade</span>
              </label>
              <input
                id="birthState"
                name="birthState"
                type="text"
                defaultValue={associate.birthState ?? ''}
                className={inputStyle}
                maxLength={2}
                placeholder="DF"
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
                className={inputStyle}
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
                className={inputStyle}
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
                className={inputStyle}
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
                className={inputStyle}
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
                className={textareaStyle}
              />
            </div>

            <div>
              <label htmlFor="neighborhood" className="label">
                <span className="label-text font-semibold">Bairro</span>
              </label>
              <input
                id="neighborhood"
                name="neighborhood"
                type="text"
                defaultValue={associate.neighborhood ?? ''}
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="addressState" className="label">
                <span className="label-text font-semibold">Estado (UF)</span>
              </label>
              <input
                id="addressState"
                name="addressState"
                type="text"
                defaultValue={associate.addressState ?? ''}
                className={inputStyle}
                maxLength={2}
                placeholder="DF"
              />
            </div>

            <div>
              <label htmlFor="zipCode" className="label">
                <span className="label-text font-semibold">CEP</span>
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                defaultValue={associate.zipCode ?? ''}
                className={inputStyle}
                spellCheck={false}
                autoComplete="postal-code"
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
                className={inputStyle}
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
                className={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Dados Profissionais */}
        <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
          <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Dados Profissionais</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectField
              id="functionalStatus"
              label="Situação funcional"
              options={functionalStatusOptions}
              defaultValue={associate.functionalStatus ?? ''}
            />

            <SelectField
              id="missionType"
              label="Tipo de missão"
              options={missionTypeOptions}
              defaultValue={associate.missionType ?? ''}
            />

            <SelectField
              id="careerOrigin"
              label="Origem de carreira"
              options={careerOriginOptions}
              defaultValue={associate.careerOrigin ?? ''}
            />

            <div>
              <label htmlFor="classPattern" className="label">
                <span className="label-text font-semibold">Classe / Padrão</span>
              </label>
              <input
                id="classPattern"
                name="classPattern"
                type="text"
                defaultValue={associate.classPattern ?? ''}
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="assignment" className="label">
                <span className="label-text font-semibold">Lotação atual</span>
              </label>
              <input
                id="assignment"
                name="assignment"
                type="text"
                defaultValue={associate.assignment ?? ''}
                className={inputStyle}
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
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="admissionDate" className="label">
                <span className="label-text font-semibold">Data de admissão</span>
              </label>
              <input
                id="admissionDate"
                name="admissionDate"
                type="date"
                defaultValue={associate.admissionDate ?? ''}
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="inaugurationDate" className="label">
                <span className="label-text font-semibold">Data de posse</span>
              </label>
              <input
                id="inaugurationDate"
                name="inaugurationDate"
                type="date"
                defaultValue={associate.inaugurationDate ?? ''}
                className={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="cancellationDate" className="label">
                <span className="label-text font-semibold">Data de cancelamento</span>
              </label>
              <input
                id="cancellationDate"
                name="cancellationDate"
                type="date"
                defaultValue={associate.cancellationDate ?? ''}
                className={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Administrativo */}
        <section className="mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7">
          <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Administrativo</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="associationCategory" className="label">
                <span className="label-text font-semibold">Categoria</span>
              </label>
              <input
                id="associationCategory"
                name="associationCategory"
                type="text"
                defaultValue={associate.associationCategory ?? ''}
                className={inputStyle}
              />
            </div>

            <SelectField
              id="associationStatus"
              label="Situação associativa"
              options={associationStatusOptions}
              defaultValue={associate.associationStatus}
            />

            <SelectField
              id="contributionStatus"
              label="Contribuição"
              options={contributionStatusOptions}
              defaultValue={associate.contributionStatus}
            />

            <SelectField
              id="paymentMethod"
              label="Método de pagamento"
              options={paymentMethodOptions}
              defaultValue={associate.paymentMethod}
            />

            <CheckboxField
              id="ceocMember"
              label="Membro CEOC"
              defaultChecked={associate.ceocMember === true}
            />

            <CheckboxField
              id="caocMember"
              label="Membro CAOC"
              defaultChecked={associate.caocMember === true}
            />
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
                className={textareaStyle}
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