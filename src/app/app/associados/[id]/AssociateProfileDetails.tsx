import { formatAssociateDate, getAssociateStatusLabel } from '@/lib/associates/service';
import { hairline } from '@/lib/ui/tokens';
import {
  BooleanIcon,
  ProfileEditLink,
  ProfileRow,
  ProfileSectionCard,
  type ProfileSectionProps,
} from './ProfileUi';

const sexLabels: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
};

const maritalStatusLabels: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  separado: 'Separado(a)',
  outros: 'Outros',
};

const missionTypeLabels: Record<string, string> = {
  permanente: 'Permanente',
  transitoria: 'Transitória',
};

const careerOriginLabels: Record<string, string> = {
  brasil: 'Brasil',
  exterior: 'Exterior',
  outros_orgaos: 'Outros Órgãos',
};

const paymentMethodLabels: Record<string, string> = {
  folha: 'Folha de pagamento',
  boleto: 'Boleto',
  pix: 'Pix',
  transferencia: 'Transferência',
  outros: 'Outros',
};

function IdentificationSection({ profile, id }: ProfileSectionProps) {
  const { associate } = profile;

  return (
    <ProfileSectionCard
      id="identificacao"
      title="Identificação"
      action={<ProfileEditLink href={`/app/associados/${id}/editar`} />}
    >
      <dl className="m-0">
        <ProfileRow label="Nome completo" value={associate.fullName} />
        <ProfileRow label="CPF" value={associate.cpf} mono />
        <ProfileRow label="RG" value={associate.rg} mono />
        {associate.rg && (
          <>
            <ProfileRow label="Órgão Expedidor" value={associate.rgIssuer} />
            <ProfileRow label="UF RG" value={associate.rgState} />
            <ProfileRow
              label="Data expedição RG"
              value={formatAssociateDate(associate.rgExpeditionDate)}
            />
          </>
        )}
        <ProfileRow label="SIAPE" value={associate.siape} mono />
        <ProfileRow label="Sexo" value={associate.sex ? sexLabels[associate.sex] : null} />
        <ProfileRow
          label="Estado civil"
          value={associate.maritalStatus ? maritalStatusLabels[associate.maritalStatus] : null}
        />
        <ProfileRow label="Data de nascimento" value={formatAssociateDate(associate.birthDate)} />
        <ProfileRow label="Naturalidade" value={associate.birthCity} />
        {associate.birthCity && <ProfileRow label="UF Naturalidade" value={associate.birthState} />}
        <ProfileRow label="E-mail principal" value={associate.primaryEmail} />
        <ProfileRow label="E-mail alternativo" value={associate.secondaryEmail} />
        <ProfileRow label="Telefone" value={associate.phone} mono />
        <ProfileRow label="WhatsApp" value={associate.whatsapp} mono />
      </dl>
    </ProfileSectionCard>
  );
}

function AddressSection({ profile, id }: ProfileSectionProps) {
  const { associate, location } = profile;

  return (
    <ProfileSectionCard
      id="endereco"
      title="Endereço"
      action={<ProfileEditLink href={`/app/associados/${id}/editar`} />}
    >
      <dl className="m-0">
        <ProfileRow label="Endereço" value={associate.address} />
        <ProfileRow label="Bairro" value={associate.neighborhood} />
        <ProfileRow label="Cidade / País" value={location} />
        <ProfileRow label="Estado" value={associate.addressState} />
        <ProfileRow label="CEP" value={associate.zipCode} mono />
      </dl>
    </ProfileSectionCard>
  );
}

function ProfessionalDataSection({ profile }: Omit<ProfileSectionProps, 'id'>) {
  const { associate } = profile;

  return (
    <ProfileSectionCard id="dados-profissionais" title="Dados Profissionais">
      <dl className="m-0">
        <ProfileRow
          label="Situação funcional"
          value={getAssociateStatusLabel(associate.functionalStatus)}
        />
        <ProfileRow
          label="Tipo de missão"
          value={associate.missionType ? missionTypeLabels[associate.missionType] : null}
        />
        <ProfileRow
          label="Origem de carreira"
          value={associate.careerOrigin ? careerOriginLabels[associate.careerOrigin] : null}
        />
        <ProfileRow label="Classe / Padrão" value={associate.classPattern} />
        <ProfileRow label="Lotação" value={associate.assignment} />
        <ProfileRow
          label="Início da lotação"
          value={formatAssociateDate(associate.assignmentStartDate)}
        />
        <ProfileRow label="Data de admissão" value={formatAssociateDate(associate.admissionDate)} />
        <ProfileRow label="Data de posse" value={formatAssociateDate(associate.inaugurationDate)} />
        <ProfileRow
          label="Data de aposentadoria"
          value={formatAssociateDate(associate.retirementDate)}
        />
        <ProfileRow label="Data de licença" value={formatAssociateDate(associate.leaveDate)} />
        <ProfileRow
          label="Data de cancelamento do vínculo ASOF"
          value={formatAssociateDate(associate.cancellationDate)}
        />
      </dl>
    </ProfileSectionCard>
  );
}

function AdministrativeSection({ profile, id }: ProfileSectionProps) {
  const { associate } = profile;

  return (
    <ProfileSectionCard
      id="administrativo"
      title="Administrativo"
      action={<ProfileEditLink href={`/app/associados/${id}/editar`} />}
    >
      <dl className="m-0">
        <ProfileRow label="Categoria" value={associate.associationCategory} />
        <ProfileRow label="Data de adesão à ASOF" value={formatAssociateDate(associate.joinedAt)} />
        <ProfileRow
          label="Vínculo ASOF"
          value={getAssociateStatusLabel(associate.associationStatus)}
        />
        <ProfileRow
          label="Contribuição"
          value={getAssociateStatusLabel(associate.contributionStatus)}
        />
        <ProfileRow
          label="Método de pagamento"
          value={associate.paymentMethod ? paymentMethodLabels[associate.paymentMethod] : null}
        />
        <ProfileRow label="Membro CEOC" value={<BooleanIcon value={associate.ceocMember} />} />
        <ProfileRow label="Membro CAOC" value={<BooleanIcon value={associate.caocMember} />} />
      </dl>
    </ProfileSectionCard>
  );
}

function AssociationSection({ profile }: Omit<ProfileSectionProps, 'id'>) {
  const { timeline, consultationCount } = profile;

  return (
    <ProfileSectionCard
      id="associacao"
      title={`Associação · Histórico${consultationCount > 0 ? ` · ${consultationCount} consulta${consultationCount === 1 ? '' : 's'} jurídica${consultationCount === 1 ? '' : 's'}` : ''}`}
    >
      <ol className="m-0 flex list-none flex-col p-0">
        {timeline.map((item, index, arr) => {
          const color =
            item.tone === 'pos'
              ? '#15803d'
              : item.tone === 'neg'
                ? '#b91c1c'
                : 'rgba(13,31,60,0.40)';

          return (
            <li
              key={`${item.event}-${index}`}
              className="grid grid-cols-[132px_24px_1fr] items-start gap-1"
            >
              <span className="text-base-content/60 pt-3.5 text-xs">
                {formatAssociateDate(item.date)}
              </span>
              <span className="flex flex-col items-center self-stretch">
                <span
                  className="w-px flex-1"
                  style={{ background: index === 0 ? 'transparent' : hairline }}
                />
                <span
                  className="my-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white"
                  style={{ background: color, boxShadow: `0 0 0 1px ${color}` }}
                />
                <span
                  className="w-px flex-1"
                  style={{ background: index === arr.length - 1 ? 'transparent' : hairline }}
                />
              </span>
              <span className="py-3">
                <span className="block text-sm font-semibold">{item.event}</span>
                <span className="text-base-content/60 mt-1 block text-xs leading-relaxed">
                  {item.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </ProfileSectionCard>
  );
}

export function AssociateProfileDetails(props: ProfileSectionProps) {
  return (
    <>
      <IdentificationSection {...props} />
      <AddressSection {...props} />
      <ProfessionalDataSection profile={props.profile} />
      <AdministrativeSection {...props} />
      <AssociationSection profile={props.profile} />
    </>
  );
}
