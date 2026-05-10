import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { asc, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import { hairline } from '@/lib/ui/tokens';

function dateOnly(value: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.split(/[ T]/)[0] ?? value;
}

function formatDate(value: string | Date | null) {
  const date = dateOnly(value);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function yearsSince(value: string | Date | null) {
  const date = dateOnly(value);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  const start = new Date(Date.UTC(year, month - 1, day));
  return Math.floor((Date.now() - start.getTime()) / (365.25 * 86_400_000));
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function statusLabel(value: string | null) {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    aposentado: 'Aposentado',
    cedido: 'Cedido',
    em_licenca: 'Em licença',
    em_dia: 'Em dia',
    inadimplente: 'Inadimplente',
    pendente_migracao: 'Pendente migração',
  };
  return value ? (labels[value] ?? value) : null;
}

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
      className="border-base-300 grid gap-2 border-b py-2.5 sm:grid-cols-[180px_1fr]"
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
      className="rounded-box border-base-300 scroll-mt-8 border bg-white p-5 sm:p-7"
    >
      <header className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-serif text-[22px] leading-tight font-bold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function EditButton({ children = 'Editar' }: { children?: React.ReactNode }) {
  return (
    <button type="button" className="btn btn-outline min-h-10 lg:btn-sm">
      {children}
    </button>
  );
}

const tocItems = [
  ['visao-geral', 'Visão geral'],
  ['identificacao', 'Identificação'],
  ['endereco', 'Endereço'],
  ['administrativo', 'Administrativo'],
  ['associacao', 'Associação'],
  ['observacoes', 'Observações'],
  ['atividades', 'Atividades'],
] as const;

export default async function AssociadoPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const associateId = Number(id);

  if (!Number.isInteger(associateId) || associateId < 1) {
    notFound();
  }

  const [associate] = await db
    .select()
    .from(associates)
    .where(eq(associates.id, associateId))
    .limit(1);

  if (!associate) {
    notFound();
  }

  const linkedActivities = await db
    .select({
      id: activities.id,
      title: activities.title,
      status: activities.status,
      dueDate: activities.dueDate,
    })
    .from(activities)
    .where(eq(activities.associateId, associate.id))
    .orderBy(asc(activities.dueDate), asc(activities.id))
    .limit(10);

  const isAssociationActive = associate.associationStatus === 'ativo';
  const isFunctionalActive = associate.functionalStatus === 'ativo';
  const joinedYears = yearsSince(associate.joinedAt);
  const careerYears = yearsSince(associate.assignmentStartDate);
  const location =
    [associate.locationCity, associate.locationCountry].filter(Boolean).join(' / ') || null;

  return (
    <main className="mx-auto w-full max-w-[1180px] min-w-0 px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href="/app/associados"
        className="text-base-content/60 mb-4 inline-flex items-center gap-1.5 text-xs font-medium"
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
                className="text-base-content/65 hover:border-primary hover:bg-primary/5 hover:text-primary rounded-md border-l-2 border-transparent px-2.5 py-1.5 text-[13px] font-medium"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-7">
          <header
            id="visao-geral"
            className="rounded-box border-base-300 scroll-mt-8 border bg-white p-5 sm:p-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="bg-primary grid h-20 w-20 shrink-0 place-items-center rounded-full font-serif text-3xl font-bold text-white">
                {initials(associate.fullName)}
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
                    {statusLabel(associate.functionalStatus) ?? 'Situação funcional pendente'}
                  </Pill>
                  {associate.classPattern && <Pill>{associate.classPattern}</Pill>}
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  className="btn btn-outline min-h-11 rounded-[8px] lg:h-10 lg:min-h-10"
                >
                  Imprimir ficha
                </button>
                <Link
                  href={`/app/associados/${id}/editar`}
                  className="btn btn-primary min-h-11 rounded-[8px] lg:h-10 lg:min-h-10"
                >
                  Editar dados
                </Link>
              </div>
            </div>

            <div className="border-base-300 mt-6 grid border-t pt-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Lotação atual',
                  value: associate.assignment,
                  sub: location,
                },
                {
                  label: 'Tempo na lotação',
                  value: careerYears !== null ? `${careerYears} anos` : null,
                  sub: formatDate(associate.assignmentStartDate),
                },
                {
                  label: 'Tempo na ASOF',
                  value: joinedYears !== null ? `${joinedYears} anos` : null,
                  sub: formatDate(associate.joinedAt),
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

          <SectionCard id="identificacao" title="Identificação" action={<EditButton />}>
            <dl className="m-0">
              <Row label="Nome completo" value={associate.fullName} />
              <Row label="CPF" value={associate.cpf} mono />
              <Row label="SIAPE" value={associate.siape} mono />
              <Row label="Data de nascimento" value={formatDate(associate.birthDate)} />
              <Row label="E-mail principal" value={associate.primaryEmail} />
              <Row label="E-mail alternativo" value={associate.secondaryEmail} />
              <Row label="Telefone" value={associate.phone} mono />
              <Row label="WhatsApp" value={associate.whatsapp} mono />
            </dl>
          </SectionCard>

          <SectionCard id="endereco" title="Endereço" action={<EditButton />}>
            <dl className="m-0">
              <Row label="Endereço" value={associate.address} />
              <Row label="Cidade / País" value={location} />
            </dl>
          </SectionCard>

          <SectionCard id="administrativo" title="Administrativo" action={<EditButton />}>
            <dl className="m-0">
              <Row label="Situação funcional" value={statusLabel(associate.functionalStatus)} />
              <Row label="Classe / Padrão" value={associate.classPattern} />
              <Row label="Categoria" value={associate.associationCategory} />
              <Row label="Contribuição" value={statusLabel(associate.contributionStatus)} />
              <Row label="Início da lotação" value={formatDate(associate.assignmentStartDate)} />
            </dl>
            <div className="border-base-300 bg-base-100 mt-4 rounded-[10px] border p-4">
              <p className="text-base-content/55 m-0 text-[11px] font-bold tracking-[0.10em] uppercase">
                Lotação atual
              </p>
              <p className="mt-2 font-serif text-[22px] font-bold">{associate.assignment ?? '-'}</p>
              <div className="text-base-content/70 mt-2 flex flex-wrap gap-4 text-sm">
                <span>
                  <strong>Cidade:</strong> {associate.locationCity ?? '-'}
                </span>
                <span>
                  <strong>País:</strong> {associate.locationCountry ?? '-'}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="associacao" title="Associação · Histórico">
            <ol className="m-0 flex list-none flex-col p-0">
              {[
                {
                  date: associate.updatedAt,
                  event: 'Última atualização cadastral',
                  detail: 'Registro sincronizado na base da intranet.',
                  tone: 'neutral',
                },
                {
                  date: associate.joinedAt,
                  event: 'Adesão à ASOF',
                  detail: associate.associationCategory ?? 'Categoria não informada.',
                  tone: 'pos',
                },
                {
                  date: associate.assignmentStartDate,
                  event: 'Lotação registrada',
                  detail: associate.assignment ?? 'Lotação não informada.',
                  tone: 'neutral',
                },
              ].map((item, index, arr) => {
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
                      {formatDate(item.date)}
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

          <SectionCard id="observacoes" title="Observações internas" action={<EditButton />}>
            <p className="text-base-content/75 m-0 text-sm leading-relaxed whitespace-pre-wrap">
              {associate.internalNotes || 'Nenhuma observação interna registrada.'}
            </p>
          </SectionCard>

          <SectionCard
            id="atividades"
            title={`Atividades vinculadas (${linkedActivities.length})`}
            action={<EditButton>Nova atividade</EditButton>}
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
                    className="border-base-300 flex items-center gap-3 rounded-[8px] border bg-white px-3.5 py-3"
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
                      {formatDate(activity.dueDate)}
                    </span>
                    <Link
                      href="/app/atividades"
                      className="text-primary inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap"
                    >
                      Abrir <ExternalLink size={12} aria-hidden="true" />
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
