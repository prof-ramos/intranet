import { formatAssociateDate, getAssociateStatusLabel } from '@/lib/associates/service';
import { buildAssociateProfileSections, type ProfileFieldRow } from '../profile-sections';
import type { AssociateProfile } from '../ProfileUi';

function formatRowValue(row: ProfileFieldRow): string {
  if (row.kind === 'boolean') {
    return row.value === null ? '-' : row.value ? 'Sim' : 'Não';
  }
  return row.value || '-';
}

function PrintRow({ row }: { row: ProfileFieldRow }) {
  return (
    <div className="grid grid-cols-[190px_1fr] gap-2 border-b border-black/15 py-1.5 text-[11px]">
      <dt className="font-semibold tracking-wide text-black/60 uppercase">{row.label}</dt>
      <dd className={['m-0', row.kind === 'text' && row.mono ? 'font-mono' : ''].join(' ')}>
        {formatRowValue(row)}
      </dd>
    </div>
  );
}

function PrintSection({
  title,
  rows,
  children,
}: {
  title: string;
  rows?: ProfileFieldRow[];
  children?: React.ReactNode;
}) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h2 className="m-0 mb-1.5 border-b-2 border-black pb-1 text-[13px] font-bold uppercase">
        {title}
      </h2>
      {rows && (
        <dl className="m-0">
          {rows.map((row) => (
            <PrintRow key={row.label} row={row} />
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

export function PrintableFicha({ profile }: { profile: AssociateProfile }) {
  const { associate, dependents, healthAgreements, timeline } = profile;
  const sections = buildAssociateProfileSections(profile);

  return (
    <div className="mx-auto max-w-[760px] p-10 text-black">
      <header className="mb-6 border-b-2 border-black pb-3">
        <p className="m-0 font-serif text-[10px] tracking-[0.22em] uppercase">
          Ficha Cadastral · ASOF
        </p>
        <h1 className="m-0 mt-2 font-serif text-[28px] leading-tight font-bold">
          {associate.fullName}
        </h1>
        <p className="m-0 text-xs">
          Associado #{associate.id}
          {associate.siape ? ` · SIAPE ${associate.siape}` : ''} ·{' '}
          {getAssociateStatusLabel(associate.functionalStatus) ?? 'Situação funcional pendente'}
        </p>
      </header>

      {sections.map((section) => (
        <PrintSection key={section.id} title={section.title} rows={section.rows} />
      ))}

      <PrintSection title="Dependentes">
        {dependents.length === 0 ? (
          <p className="m-0 text-[11px]">Nenhum dependente registrado.</p>
        ) : (
          <ul className="m-0 list-none p-0 text-[11px]">
            {dependents.map((dependent) => (
              <li key={dependent.id} className="border-b border-black/10 py-1">
                {dependent.name} — {dependent.relationship}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <PrintSection title="Convênios">
        {healthAgreements.length === 0 ? (
          <p className="m-0 text-[11px]">Nenhum convênio registrado.</p>
        ) : (
          <ul className="m-0 list-none p-0 text-[11px]">
            {healthAgreements.map((agreement) => (
              <li key={agreement.id} className="border-b border-black/10 py-1">
                {agreement.provider}
                {agreement.startDate ? ` — desde ${formatAssociateDate(agreement.startDate)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <PrintSection title="Histórico de Associação">
        {timeline.length === 0 ? (
          <p className="m-0 text-[11px]">Nenhum evento registrado.</p>
        ) : (
          <ul className="m-0 list-none p-0 text-[11px]">
            {timeline.map((item, index) => (
              <li key={`${item.event}-${index}`} className="border-b border-black/10 py-1">
                {formatAssociateDate(item.date) ?? 'Data não informada'} — {item.event}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <footer className="mt-8 border-t border-black/30 pt-2 text-[9px] text-black/50">
        Documento de uso interno da ASOF — não substitui certidões oficiais.
      </footer>
    </div>
  );
}
