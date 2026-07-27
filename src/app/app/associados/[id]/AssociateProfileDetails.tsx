import { formatAssociateDate } from '@/lib/associates/service';
import { hairline } from '@/lib/ui/tokens';
import { buildAssociateProfileSections, type ProfileFieldSection } from './profile-sections';
import {
  BooleanIcon,
  ProfileEditLink,
  ProfileRow,
  ProfileSectionCard,
  type ProfileSectionProps,
} from './ProfileUi';

const SECTIONS_WITH_EDIT_LINK = new Set(['identificacao', 'endereco', 'administrativo']);

function FieldSectionCard({ section, id }: { section: ProfileFieldSection; id: string }) {
  return (
    <ProfileSectionCard
      id={section.id}
      title={section.title}
      action={
        SECTIONS_WITH_EDIT_LINK.has(section.id) ? (
          <ProfileEditLink href={`/app/associados/${id}/editar`} />
        ) : undefined
      }
    >
      <dl className="m-0">
        {section.rows.map((row) =>
          row.kind === 'boolean' ? (
            <ProfileRow
              key={row.label}
              label={row.label}
              value={<BooleanIcon value={row.value} />}
            />
          ) : (
            <ProfileRow key={row.label} label={row.label} value={row.value} mono={row.mono} />
          ),
        )}
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
  const sections = buildAssociateProfileSections(props.profile);

  return (
    <>
      {sections.map((section) => (
        <FieldSectionCard key={section.id} section={section} id={props.id} />
      ))}
      <AssociationSection profile={props.profile} />
    </>
  );
}
