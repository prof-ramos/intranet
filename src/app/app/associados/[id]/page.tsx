import Link from 'next/link';
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react';
import { requireAuth } from '@/lib/auth/require-auth';
import { focusRingClass, hairline } from '@/lib/ui/tokens';
import { parsePositiveIntParam } from '@/lib/routing/params';
import { requireEntityById } from '@/lib/routing/require-entity';
import { DependentManager, HealthAgreementManager } from './DependentManager';
import {
  formatAssociateDate,
  getAssociateProfile,
  getAssociateStatusLabel,
  initialsFromName,
} from '@/lib/associates/service';

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const colors = {
    neutral: ['rgba(13,31,60,0.70)', '#f8fafc'],
    success: ['#15803d', '#dcfce7'],
    warning: ['#a16207', '#f4ddb1'],
    danger: ['#b91c1c', '#fee2e2'],
  } as const;
  const [color, background] = colors[tone];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase"
      style={{ color, background }}
    >
      {children}
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div
      className="grid gap-2 border-b border-[rgba(4,9,32,0.05)] py-2.5 sm:grid-cols-[180px_1fr]"
      style={{ borderColor: hairline }}
    >
      <dt className="text-base-content/55 text-[12px] font-semibold tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd className={['text-base-content m-0 text-sm', mono ? 'font-mono' : ''].join(' ')}>
        {value || <span className="text-base-content/40">-</span>}
      </dd>
    </div>
  );
}

function SectionCard({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-8 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7"
    >
      <header className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-serif text-[22px] leading-tight font-bold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function EditLink({ href, children = 'Editar' }: { href: string; children?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] focus-visible:ring-2 focus-visible:ring-[#76aeea] focus-visible:ring-offset-1 focus-visible:outline-none lg:h-8"
    >
      <Pencil size={13} aria-hidden="true" />
      {children}
    </Link>
  );
}

function BooleanIcon({ value }: { value: boolean | null }) {
  if (value === null || value === undefined) {
    return <span className="text-base-content/40">-</span>;
  }
  return value ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
      ✓
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f1f5f9] text-[rgba(13,31,60,0.40)]">
      ✗
    </span>
  );
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

const tocItems = [
  ['visao-geral', 'Visão geral'],
  ['identificacao', 'Identificação'],
  ['endereco', 'Endereço'],
  ['dados-profissionais', 'Dados Profissionais'],
  ['administrativo', 'Administrativo'],
  ['associacao', 'Associação'],
  ['dependentes', 'Dependentes'],
  ['convenios', 'Convênios'],
  ['observacoes', 'Observações'],
  ['atividades', 'Atividades'],
] as const;

export default async function AssociadoPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { returnTo } = await searchParams;
  const associateId = parsePositiveIntParam(id);
  const profile = await requireEntityById(associateId, (id) => getAssociateProfile(id, user.role));
  const {
    associate,
    linkedActivities,
    dependents,
    healthAgreements,
    isAssociationActive,
    isFunctionalActive,
    joinedYears,
    careerYears,
    location,
    timeline,
    paymentHistory,
    consultationCount,
  } = profile;

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href={returnTo || '/app/associados'}
        className={`text-base-content/60 mb-4 inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${focusRingClass}`}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Voltar para Associados
      </Link>

      <div className="grid items-start gap-7 xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <nav className="sticky top-6 flex flex-col gap-1">
            <p className="text-base-content/50 mb-2 text-[11px] font-bold tracking-[0.12em] uppercase">
              Navegar
            </p>
            {tocItems.map(([anchor, label]) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className={`rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-[13px] font-medium text-[rgba(13,31,60,0.65)] transition-colors hover:border-[#040920] hover:bg-[rgba(4,9,32,0.05)] hover:text-[#040920] ${focusRingClass}`}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-7">
          <header
            id="visao-geral"
            className="scroll-mt-8 rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-5 sm:p-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#040920] font-serif text-3xl font-bold text-white">
                {initialsFromName(associate.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base-content/55 m-0 text-[11px] tracking-[0.18em] uppercase">
                  Associado · #{associate.id}
                  {associate.siape ? ` · SIAPE ${associate.siape}` : ''}
                </p>
                <h1 className="mt-2 font-serif text-4xl leading-tight font-bold md:text-5xl">
                  {associate.fullName}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone={isAssociationActive ? 'success' : 'danger'}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {isAssociationActive ? 'Associado ativo' : 'Inativo'}
                  </Pill>
                  <Pill tone={isFunctionalActive ? 'success' : 'neutral'}>
                    {getAssociateStatusLabel(associate.functionalStatus) ??
                      'Situação funcional pendente'}
                  </Pill>
                  {associate.classPattern && <Pill>{associate.classPattern}</Pill>}
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[rgba(4,9,32,0.15)] bg-white px-4 text-sm font-semibold text-[#040920] transition-colors hover:bg-[rgba(4,9,32,0.04)] lg:h-10 lg:min-h-10 ${focusRingClass}`}
                >
                  Imprimir ficha
                </button>
                <Link
                  href={`/app/associados/${id}/editar`}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#040920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] lg:h-10 lg:min-h-10 ${focusRingClass}`}
                >
                  Editar dados
                </Link>
              </div>
            </div>

            <div className="mt-6 grid border-t border-[rgba(4,9,32,0.05)] pt-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Lotação atual',
                  value: associate.assignment,
                  sub: location,
                },
                {
                  label: 'Tempo na lotação',
                  value: careerYears !== null ? `${careerYears} anos` : null,
                  sub: formatAssociateDate(associate.assignmentStartDate),
                },
                {
                  label: 'Tempo na ASOF',
                  value: joinedYears !== null ? `${joinedYears} anos` : null,
                  sub: formatAssociateDate(associate.joinedAt),
                },
                {
                  label: 'E-mail principal',
                  value: associate.primaryEmail,
                  sub: associate.secondaryEmail,
                  small: true,
                },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="min-w-0 px-5 py-4"
                  style={{ borderLeft: index === 0 ? 'none' : `1px solid ${hairline}` }}
                >
                  <p className="text-base-content/55 m-0 text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {item.label}
                  </p>
                  <p
                    className={[
                      'mt-2 truncate',
                      item.small
                        ? 'text-sm font-medium'
                        : 'font-serif text-[22px] leading-tight font-bold',
                    ].join(' ')}
                  >
                    {item.value ?? '-'}
                  </p>
                  {item.sub && (
                    <p className="text-base-content/55 mt-1 truncate text-[11px]">{item.sub}</p>
                  )}
                </div>
              ))}
            </div>
          </header>

          {!isAssociationActive && (
            <div className="flex gap-3 rounded-[10px] border border-[#fca5a5] bg-[#fee2e2] px-4 py-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#b91c1c] text-sm font-bold text-white">
                !
              </span>
              <p className="m-0 text-sm leading-relaxed text-[#7f1d1d]">
                <strong>Associado inativo.</strong> Os dados continuam disponíveis em modo
                histórico; mudanças sensíveis devem ser conferidas pela Secretaria.
              </p>
            </div>
          )}

          <SectionCard
            id="identificacao"
            title="Identificação"
            action={<EditLink href={`/app/associados/${id}/editar`} />}
          >
            <dl className="m-0">
              <Row label="Nome completo" value={associate.fullName} />
              <Row label="CPF" value={associate.cpf} mono />
              <Row label="RG" value={associate.rg} mono />
              {associate.rg && (
                <>
                  <Row label="Órgão Expedidor" value={associate.rgIssuer} />
                  <Row label="UF RG" value={associate.rgState} />
                  <Row
                    label="Data expedição RG"
                    value={formatAssociateDate(associate.rgExpeditionDate)}
                  />
                </>
              )}
              <Row label="SIAPE" value={associate.siape} mono />
              <Row label="Sexo" value={associate.sex ? sexLabels[associate.sex] : null} />
              <Row
                label="Estado civil"
                value={
                  associate.maritalStatus ? maritalStatusLabels[associate.maritalStatus] : null
                }
              />
              <Row label="Data de nascimento" value={formatAssociateDate(associate.birthDate)} />
              <Row label="Naturalidade" value={associate.birthCity} />
              {associate.birthCity && <Row label="UF Naturalidade" value={associate.birthState} />}
              <Row label="E-mail principal" value={associate.primaryEmail} />
              <Row label="E-mail alternativo" value={associate.secondaryEmail} />
              <Row label="Telefone" value={associate.phone} mono />
              <Row label="WhatsApp" value={associate.whatsapp} mono />
            </dl>
          </SectionCard>

          <SectionCard
            id="endereco"
            title="Endereço"
            action={<EditLink href={`/app/associados/${id}/editar`} />}
          >
            <dl className="m-0">
              <Row label="Endereço" value={associate.address} />
              <Row label="Bairro" value={associate.neighborhood} />
              <Row label="Cidade / País" value={location} />
              <Row label="Estado" value={associate.addressState} />
              <Row label="CEP" value={associate.zipCode} mono />
            </dl>
          </SectionCard>

          <SectionCard id="dados-profissionais" title="Dados Profissionais">
            <dl className="m-0">
              <Row
                label="Situação funcional"
                value={getAssociateStatusLabel(associate.functionalStatus)}
              />
              <Row
                label="Tipo de missão"
                value={associate.missionType ? missionTypeLabels[associate.missionType] : null}
              />
              <Row
                label="Origem de carreira"
                value={
                  associate.careerOrigin ? careerOriginLabels[associate.careerOrigin] : null
                }
              />
              <Row label="Classe / Padrão" value={associate.classPattern} />
              <Row label="Lotação" value={associate.assignment} />
              <Row
                label="Início da lotação"
                value={formatAssociateDate(associate.assignmentStartDate)}
              />
              <Row label="Data de admissão" value={formatAssociateDate(associate.admissionDate)} />
              <Row label="Data de posse" value={formatAssociateDate(associate.inaugurationDate)} />
              <Row
                label="Data de cancelamento"
                value={formatAssociateDate(associate.cancellationDate)}
              />
            </dl>
          </SectionCard>

          <SectionCard
            id="administrativo"
            title="Administrativo"
            action={<EditLink href={`/app/associados/${id}/editar`} />}
          >
            <dl className="m-0">
              <Row label="Categoria" value={associate.associationCategory} />
              <Row
                label="Situação associativa"
                value={getAssociateStatusLabel(associate.associationStatus)}
              />
              <Row
                label="Contribuição"
                value={getAssociateStatusLabel(associate.contributionStatus)}
              />
              <Row
                label="Método de pagamento"
                value={
                  associate.paymentMethod
                    ? paymentMethodLabels[associate.paymentMethod]
                    : null
                }
              />
              <Row label="Membro CEOC" value={<BooleanIcon value={associate.ceocMember} />} />
              <Row label="Membro CAOC" value={<BooleanIcon value={associate.caocMember} />} />
            </dl>
          </SectionCard>

          <SectionCard
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
          </SectionCard>

          {paymentHistory.length > 0 && (
            <SectionCard id="mensalidades" title="Histórico de Mensalidades">
              <div className="flex flex-wrap gap-1.5">
                {paymentHistory.map((p) => {
                  const mm = p.month.toString().padStart(2, '0');
                  const chipColors: Record<string, [string, string]> = {
                    pago: ['#15803d', '#dcfce7'],
                    atrasado: ['#b91c1c', '#fee2e2'],
                    pendente: ['#a16207', '#fef9c3'],
                    isento: ['rgba(13,31,60,0.45)', '#f1f5f9'],
                  };
                  const [color, background] = chipColors[p.status] ?? chipColors['isento'];
                  return (
                    <span
                      key={`${p.year}-${p.month}`}
                      title={p.status}
                      className="inline-flex items-center rounded px-2 py-1 text-[11px] font-bold tabular-nums"
                      style={{ color, background }}
                    >
                      {mm}/{p.year}
                    </span>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard
            id="dependentes"
            title={`Dependentes (${dependents.length})`}
          >
            <DependentManager associateId={associateId!} items={dependents} />
          </SectionCard>

          <SectionCard
            id="convenios"
            title={`Convênios (${healthAgreements.length})`}
          >
            <HealthAgreementManager associateId={associateId!} items={healthAgreements} />
          </SectionCard>

          <SectionCard
            id="observacoes"
            title="Observações internas"
            action={<EditLink href={`/app/associados/${id}/editar`} />}
          >
            <p className="text-base-content/75 m-0 text-sm leading-relaxed whitespace-pre-wrap">
              {associate.internalNotes || 'Nenhuma observação interna registrada.'}
            </p>
          </SectionCard>

          <SectionCard
            id="atividades"
            title={`Atividades vinculadas (${linkedActivities.length})`}
            action={<EditLink href="/app/atividades/nova">Nova atividade</EditLink>}
          >
            {linkedActivities.length === 0 ? (
              <p className="text-base-content/55 m-0 text-sm">
                Nenhuma atividade vinculada a este associado.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {linkedActivities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center gap-3 rounded-[8px] border border-[rgba(4,9,32,0.05)] bg-white px-3.5 py-3"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{
                        background: activity.status === 'concluido' ? '#86efac' : '#94a3b8',
                      }}
                    />
                    <p
                      className={[
                        'm-0 min-w-0 flex-1 text-sm font-medium',
                        activity.status === 'concluido'
                          ? 'text-base-content/55 decoration-base-content/30 line-through'
                          : '',
                      ].join(' ')}
                    >
                      {activity.title}
                    </p>
                    <span className="text-base-content/55 text-xs whitespace-nowrap">
                      {formatAssociateDate(activity.dueDate)}
                    </span>
                    <Link
                      href={`/app/atividades?open=${activity.id}`}
                      className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-[#040920] hover:underline ${focusRingClass}`}
                    >
                      Ver no quadro <ExternalLink size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </main>
  );
}