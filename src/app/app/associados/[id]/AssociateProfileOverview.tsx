import Link from 'next/link';
import {
  formatAssociateDate,
  getAssociateStatusLabel,
  initialsFromName,
} from '@/lib/associates/service';
import { focusRingClass, hairline } from '@/lib/ui/tokens';
import { Pill, type ProfileSectionProps } from './ProfileUi';

export function AssociateProfileOverview({ profile, id }: ProfileSectionProps) {
  const { associate, isAssociationActive, isFunctionalActive, careerYears, joinedYears, location } =
    profile;

  return (
    <>
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
            { label: 'Lotação atual', value: associate.assignment, sub: location },
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
            <strong>Associado inativo.</strong> Os dados continuam disponíveis em modo histórico;
            mudanças sensíveis devem ser conferidas pela Secretaria.
          </p>
        </div>
      )}
    </>
  );
}
