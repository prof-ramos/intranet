import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatAssociateDate } from '@/lib/associates/service';
import { focusRingClass } from '@/lib/ui/tokens';
import { DependentManager, HealthAgreementManager } from './DependentManager';
import {
  ProfileEditLink,
  ProfileSectionCard,
  type AssociateProfile,
  type ProfileSectionProps,
} from './ProfileUi';

type RelatedSectionsProps = ProfileSectionProps & { associateId: number };

function PaymentHistorySection({ profile }: { profile: AssociateProfile }) {
  const { paymentHistory } = profile;
  if (paymentHistory.length === 0) return null;

  return (
    <ProfileSectionCard id="mensalidades" title="Histórico de Mensalidades">
      <div className="flex flex-wrap gap-1.5">
        {paymentHistory.map((payment) => {
          const month = payment.month.toString().padStart(2, '0');
          const chipColors: Record<string, [string, string]> = {
            pago: ['#15803d', '#dcfce7'],
            atrasado: ['#b91c1c', '#fee2e2'],
            pendente: ['#a16207', '#fef9c3'],
            isento: ['rgba(13,31,60,0.45)', '#f1f5f9'],
          };
          const [color, background] = chipColors[payment.status] ?? chipColors['isento'];

          return (
            <span
              key={`${payment.year}-${payment.month}`}
              title={payment.status}
              className="inline-flex items-center rounded px-2 py-1 text-[11px] font-bold tabular-nums"
              style={{ color, background }}
            >
              {month}/{payment.year}
            </span>
          );
        })}
      </div>
    </ProfileSectionCard>
  );
}

function DependentsSection({ profile, associateId }: RelatedSectionsProps) {
  return (
    <ProfileSectionCard id="dependentes" title={`Dependentes (${profile.dependents.length})`}>
      <DependentManager associateId={associateId} items={profile.dependents} />
    </ProfileSectionCard>
  );
}

function HealthAgreementsSection({ profile, associateId }: RelatedSectionsProps) {
  return (
    <ProfileSectionCard id="convenios" title={`Convênios (${profile.healthAgreements.length})`}>
      <HealthAgreementManager associateId={associateId} items={profile.healthAgreements} />
    </ProfileSectionCard>
  );
}

function ObservationsSection({ profile, id }: ProfileSectionProps) {
  return (
    <ProfileSectionCard
      id="observacoes"
      title="Observações internas"
      action={<ProfileEditLink href={`/app/associados/${id}/editar`} />}
    >
      <p className="text-base-content/75 m-0 text-sm leading-relaxed whitespace-pre-wrap">
        {profile.associate.internalNotes || 'Nenhuma observação interna registrada.'}
      </p>
    </ProfileSectionCard>
  );
}

function ActivitiesSection({ profile }: { profile: AssociateProfile }) {
  const { linkedActivities } = profile;

  return (
    <ProfileSectionCard
      id="atividades"
      title={`Atividades vinculadas (${linkedActivities.length})`}
      action={<ProfileEditLink href="/app/atividades/nova">Nova atividade</ProfileEditLink>}
    >
      {linkedActivities.length === 0 ? (
        <p className="text-base-content/55 m-0 text-sm">
          Nenhuma atividade vinculada a este oficial.
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
                style={{ background: activity.status === 'concluido' ? '#86efac' : '#94a3b8' }}
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
    </ProfileSectionCard>
  );
}

export function AssociateProfileRelated(props: RelatedSectionsProps) {
  return (
    <>
      <PaymentHistorySection profile={props.profile} />
      <DependentsSection {...props} />
      <HealthAgreementsSection {...props} />
      <ObservationsSection profile={props.profile} id={props.id} />
      <ActivitiesSection profile={props.profile} />
    </>
  );
}
