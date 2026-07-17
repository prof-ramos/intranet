import type { HTMLInputTypeAttribute } from 'react';

export const associateInputStyle = 'input input-bordered w-full';
const selectStyle = 'select select-bordered w-full';
const textareaStyle = 'textarea textarea-bordered w-full';
const sectionStyle = 'mb-6 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7';

interface Option {
  value: string;
  label: string;
}

const sexOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];
const maritalStatusOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'separado', label: 'Separado(a)' },
  { value: 'outros', label: 'Outros' },
];
const missionTypeOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'permanente', label: 'Permanente' },
  { value: 'transitoria', label: 'Transitória' },
];
const careerOriginOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'brasil', label: 'Brasil' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'outros_orgaos', label: 'Outros Órgãos' },
];
const paymentMethodOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'folha', label: 'Folha de pagamento' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'Pix' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outros', label: 'Outros' },
];
const functionalStatusOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'aposentado', label: 'Aposentado' },
  { value: 'cedido', label: 'Cedido' },
  { value: 'em_licenca', label: 'Em licença' },
];
const createAssociationStatusOptions: Option[] = [
  { value: 'nao_associado', label: 'Não associado' },
  { value: 'associado', label: 'Associado' },
];
const editAssociationStatusOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'associado', label: 'Associado' },
  { value: 'nao_associado', label: 'Não associado' },
];
const createContributionStatusOptions: Option[] = [
  { value: 'inadimplente', label: 'Inadimplente' },
  { value: 'em_dia', label: 'Em dia' },
];
const editContributionStatusOptions: Option[] = [
  { value: '', label: 'Selecione...' },
  { value: 'em_dia', label: 'Em dia' },
  { value: 'inadimplente', label: 'Inadimplente' },
];

export interface AssociateFormValues {
  fullName: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  rgState: string;
  rgExpeditionDate: string;
  siape: string;
  sex: string;
  maritalStatus: string;
  birthDate: string;
  birthCity: string;
  birthState: string;
  primaryEmail: string;
  secondaryEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  neighborhood: string;
  addressState: string;
  zipCode: string;
  locationCity: string;
  locationCountry: string;
  functionalStatus: string;
  missionType: string;
  careerOrigin: string;
  classPattern: string;
  assignment: string;
  assignmentStartDate: string;
  admissionDate: string;
  inaugurationDate: string;
  retirementDate: string;
  leaveDate: string;
  cancellationDate: string;
  associationCategory: string;
  joinedAt: string;
  associationStatus: string;
  contributionStatus: string;
  paymentMethod: string;
  ceocMember: boolean;
  caocMember: boolean;
  internalNotes: string;
}

export const createAssociateFormValues: AssociateFormValues = {
  fullName: '',
  cpf: '',
  rg: '',
  rgIssuer: '',
  rgState: '',
  rgExpeditionDate: '',
  siape: '',
  sex: '',
  maritalStatus: '',
  birthDate: '',
  birthCity: '',
  birthState: '',
  primaryEmail: '',
  secondaryEmail: '',
  phone: '',
  whatsapp: '',
  address: '',
  neighborhood: '',
  addressState: '',
  zipCode: '',
  locationCity: '',
  locationCountry: '',
  functionalStatus: '',
  missionType: '',
  careerOrigin: '',
  classPattern: '',
  assignment: '',
  assignmentStartDate: '',
  admissionDate: '',
  inaugurationDate: '',
  retirementDate: '',
  leaveDate: '',
  cancellationDate: '',
  associationCategory: '',
  joinedAt: '',
  associationStatus: 'nao_associado',
  contributionStatus: 'inadimplente',
  paymentMethod: 'folha',
  ceocMember: false,
  caocMember: false,
  internalNotes: '',
};

function TextField({
  id,
  label,
  value,
  type = 'text',
  required,
  placeholder,
  maxLength,
  spellCheck,
  autoComplete,
  className,
}: {
  id: string;
  label: string;
  value: string;
  type?: HTMLInputTypeAttribute;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  spellCheck?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        <span className="label-text font-semibold">{label}</span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        defaultValue={value}
        className={associateInputStyle}
        placeholder={placeholder}
        maxLength={maxLength}
        spellCheck={spellCheck}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  value,
}: {
  id: string;
  label: string;
  options: Option[];
  value: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        <span className="label-text font-semibold">{label}</span>
      </label>
      <select id={id} name={id} defaultValue={value} className={selectStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({ id, label, checked }: { id: string; label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <input
        id={id}
        name={id}
        type="checkbox"
        value="true"
        defaultChecked={checked}
        className="checkbox checkbox-sm"
      />
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
    </div>
  );
}

interface Props {
  values: AssociateFormValues;
  mode: 'create' | 'edit';
  canEditInternalNotes: boolean;
}

export function AssociateFormFields({ values, mode, canEditInternalNotes }: Props) {
  return (
    <>
      <section className={sectionStyle}>
        <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Identificação</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            id="fullName"
            label="Nome completo *"
            value={values.fullName}
            required
            className="sm:col-span-2"
          />
          <TextField
            id="cpf"
            label="CPF"
            value={values.cpf}
            placeholder="000.000.000-00"
            spellCheck={false}
            autoComplete="off"
          />
          <TextField id="rg" label="RG" value={values.rg} spellCheck={false} autoComplete="off" />
          <TextField
            id="rgIssuer"
            label="Órgão Expedidor"
            value={values.rgIssuer}
            placeholder="SSP"
            spellCheck={false}
            autoComplete="off"
          />
          <TextField
            id="rgState"
            label="UF RG"
            value={values.rgState}
            maxLength={2}
            placeholder="DF"
            spellCheck={false}
            autoComplete="off"
          />
          <TextField
            id="rgExpeditionDate"
            label="Data expedição RG"
            value={values.rgExpeditionDate}
            type="date"
          />
          <TextField
            id="siape"
            label="SIAPE"
            value={values.siape}
            spellCheck={false}
            autoComplete="off"
          />
          <SelectField id="sex" label="Sexo" options={sexOptions} value={values.sex} />
          <SelectField
            id="maritalStatus"
            label="Estado civil"
            options={maritalStatusOptions}
            value={values.maritalStatus}
          />
          <TextField
            id="birthDate"
            label="Data de nascimento"
            value={values.birthDate}
            type="date"
          />
          <TextField id="birthCity" label="Naturalidade" value={values.birthCity} />
          <TextField
            id="birthState"
            label="UF Naturalidade"
            value={values.birthState}
            maxLength={2}
            placeholder="DF"
          />
          <TextField
            id="primaryEmail"
            label="E-mail principal"
            value={values.primaryEmail}
            type="email"
          />
          <TextField
            id="secondaryEmail"
            label="E-mail alternativo"
            value={values.secondaryEmail}
            type="email"
          />
          <TextField id="phone" label="Telefone" value={values.phone} type="tel" />
          <TextField id="whatsapp" label="WhatsApp" value={values.whatsapp} type="tel" />
        </div>
      </section>
      <section className={sectionStyle}>
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
              defaultValue={values.address}
              className={textareaStyle}
            />
          </div>
          <TextField id="neighborhood" label="Bairro" value={values.neighborhood} />
          <TextField
            id="addressState"
            label="Estado (UF)"
            value={values.addressState}
            maxLength={2}
            placeholder="DF"
          />
          <TextField
            id="zipCode"
            label="CEP"
            value={values.zipCode}
            spellCheck={false}
            autoComplete="postal-code"
          />
          <TextField id="locationCity" label="Cidade" value={values.locationCity} />
          <TextField id="locationCountry" label="País" value={values.locationCountry} />
        </div>
      </section>
      <section className={sectionStyle}>
        <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Dados Profissionais</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField
            id="functionalStatus"
            label="Situação funcional"
            options={functionalStatusOptions}
            value={values.functionalStatus}
          />
          <SelectField
            id="missionType"
            label="Tipo de missão"
            options={missionTypeOptions}
            value={values.missionType}
          />
          <SelectField
            id="careerOrigin"
            label="Origem de carreira"
            options={careerOriginOptions}
            value={values.careerOrigin}
          />
          <TextField id="classPattern" label="Classe / Padrão" value={values.classPattern} />
          <TextField id="assignment" label="Lotação atual" value={values.assignment} />
          <TextField
            id="assignmentStartDate"
            label="Início da lotação"
            value={values.assignmentStartDate}
            type="date"
          />
          <TextField
            id="admissionDate"
            label="Data de admissão"
            value={values.admissionDate}
            type="date"
          />
          <TextField
            id="inaugurationDate"
            label="Data de posse"
            value={values.inaugurationDate}
            type="date"
          />
          <TextField
            id="retirementDate"
            label="Data de aposentadoria"
            value={values.retirementDate}
            type="date"
          />
          <TextField id="leaveDate" label="Data de licença" value={values.leaveDate} type="date" />
          <TextField
            id="cancellationDate"
            label="Data de cancelamento do vínculo ASOF"
            value={values.cancellationDate}
            type="date"
          />
        </div>
      </section>
      <section className={sectionStyle}>
        <h2 className="mb-4 font-serif text-[22px] leading-tight font-bold">Administrativo</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            id="associationCategory"
            label="Categoria"
            value={values.associationCategory}
          />
          <TextField
            id="joinedAt"
            label="Data de adesão à ASOF"
            value={values.joinedAt}
            type="date"
          />
          <SelectField
            id="associationStatus"
            label="Vínculo ASOF"
            options={
              mode === 'create' ? createAssociationStatusOptions : editAssociationStatusOptions
            }
            value={values.associationStatus}
          />
          <SelectField
            id="contributionStatus"
            label="Contribuição"
            options={
              mode === 'create' ? createContributionStatusOptions : editContributionStatusOptions
            }
            value={values.contributionStatus}
          />
          <SelectField
            id="paymentMethod"
            label="Método de pagamento"
            options={paymentMethodOptions}
            value={values.paymentMethod}
          />
          <CheckboxField id="ceocMember" label="Membro CEOC" checked={values.ceocMember} />
          <CheckboxField id="caocMember" label="Membro CAOC" checked={values.caocMember} />
        </div>
      </section>
      {canEditInternalNotes && (
        <section className={sectionStyle}>
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
              defaultValue={values.internalNotes}
              className={textareaStyle}
              placeholder="Notas internas sobre o oficial..."
            />
          </div>
        </section>
      )}
    </>
  );
}
