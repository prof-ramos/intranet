import { formatAssociateDate, getAssociateStatusLabel } from '@/lib/associates/service';
import type { AssociateProfile } from './ProfileUi';

export type ProfileFieldRow =
  | { kind: 'text'; label: string; value: string | null; mono?: boolean }
  | { kind: 'boolean'; label: string; value: boolean | null };

export interface ProfileFieldSection {
  id: string;
  title: string;
  rows: ProfileFieldRow[];
}

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

function textRow(label: string, value: string | null, mono?: boolean): ProfileFieldRow {
  return { kind: 'text', label, value, mono };
}

function booleanRow(label: string, value: boolean | null): ProfileFieldRow {
  return { kind: 'boolean', label, value };
}

/**
 * Single source of truth for the associate profile's static label/value
 * sections — screen (ProfileRow/ProfileSectionCard) and print (PrintableFicha)
 * both render from this list instead of each re-enumerating the same fields.
 */
export function buildAssociateProfileSections(profile: AssociateProfile): ProfileFieldSection[] {
  const { associate } = profile;

  const identificacao: ProfileFieldRow[] = [
    textRow('Nome completo', associate.fullName),
    textRow('CPF', associate.cpf, true),
    textRow('RG', associate.rg, true),
  ];
  if (associate.rg) {
    identificacao.push(
      textRow('Órgão Expedidor', associate.rgIssuer),
      textRow('UF RG', associate.rgState),
      textRow('Data expedição RG', formatAssociateDate(associate.rgExpeditionDate)),
    );
  }
  identificacao.push(
    textRow('SIAPE', associate.siape, true),
    textRow('Sexo', associate.sex ? sexLabels[associate.sex] : null),
    textRow(
      'Estado civil',
      associate.maritalStatus ? maritalStatusLabels[associate.maritalStatus] : null,
    ),
    textRow('Data de nascimento', formatAssociateDate(associate.birthDate)),
    textRow('Naturalidade', associate.birthCity),
  );
  if (associate.birthCity) {
    identificacao.push(textRow('UF Naturalidade', associate.birthState));
  }
  identificacao.push(
    textRow('E-mail principal', associate.primaryEmail),
    textRow('E-mail alternativo', associate.secondaryEmail),
    textRow('Telefone', associate.phone, true),
    textRow('WhatsApp', associate.whatsapp, true),
  );

  const endereco: ProfileFieldRow[] = [
    textRow('Endereço', associate.address),
    textRow('Bairro', associate.neighborhood),
    textRow('Cidade / País', profile.location),
    textRow('Estado', associate.addressState),
    textRow('CEP', associate.zipCode, true),
  ];

  const dadosProfissionais: ProfileFieldRow[] = [
    textRow('Situação funcional', getAssociateStatusLabel(associate.functionalStatus)),
    textRow(
      'Tipo de missão',
      associate.missionType ? missionTypeLabels[associate.missionType] : null,
    ),
    textRow(
      'Origem de carreira',
      associate.careerOrigin ? careerOriginLabels[associate.careerOrigin] : null,
    ),
    textRow('Classe / Padrão', associate.classPattern),
    textRow('Lotação', associate.assignment),
    textRow('Início da lotação', formatAssociateDate(associate.assignmentStartDate)),
    textRow('Data de admissão', formatAssociateDate(associate.admissionDate)),
    textRow('Data de posse', formatAssociateDate(associate.inaugurationDate)),
    textRow('Data de aposentadoria', formatAssociateDate(associate.retirementDate)),
    textRow('Data de licença', formatAssociateDate(associate.leaveDate)),
    textRow(
      'Data de cancelamento do vínculo ASOF',
      formatAssociateDate(associate.cancellationDate),
    ),
  ];

  const administrativo: ProfileFieldRow[] = [
    textRow('Categoria', associate.associationCategory),
    textRow('Data de adesão à ASOF', formatAssociateDate(associate.joinedAt)),
    textRow('Vínculo ASOF', getAssociateStatusLabel(associate.associationStatus)),
    textRow('Contribuição', getAssociateStatusLabel(associate.contributionStatus)),
    textRow(
      'Método de pagamento',
      associate.paymentMethod ? paymentMethodLabels[associate.paymentMethod] : null,
    ),
    booleanRow('Membro CEOC', associate.ceocMember),
    booleanRow('Membro CAOC', associate.caocMember),
  ];

  return [
    { id: 'identificacao', title: 'Identificação', rows: identificacao },
    { id: 'endereco', title: 'Endereço', rows: endereco },
    { id: 'dados-profissionais', title: 'Dados Profissionais', rows: dadosProfissionais },
    { id: 'administrativo', title: 'Administrativo', rows: administrativo },
  ];
}
