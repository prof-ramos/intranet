import { requireAuth } from '@/lib/auth/require-auth';
import { searchAssociates, searchActivities } from '@/lib/search/queries';
import { hairline, textSubtle, textMuted, skyBlue } from '@/lib/ui/tokens';
import { focusRingClass } from '@/lib/ui/tokens';
import { Users, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { SearchForm } from './SearchForm';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();

  const { q } = await searchParams;
  const query = (q ?? '').trim().slice(0, 80);
  const hasQuery = query.length >= 2;

  const [associates, activities] = hasQuery
    ? await Promise.all([searchAssociates(query), searchActivities(query)])
    : [[], []];

  const totalResults = associates.length + activities.length;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-7">
        <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: textMuted }}>
          Intranet ASOF
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-none font-bold text-[#040920]">
          Busca Global
        </h1>
      </div>

      <SearchForm defaultValue={query} />

      {hasQuery && (
        <div className="mt-6">
          {totalResults === 0 ? (
            <p className="mt-8 text-center text-sm" style={{ color: textSubtle }}>
              Nenhum resultado para{' '}
              <span className="font-semibold text-[#040920]">&ldquo;{query}&rdquo;</span>.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-6">
              <p className="text-xs" style={{ color: textMuted }}>
                {totalResults} resultado{totalResults !== 1 ? 's' : ''} para &ldquo;{query}&rdquo;
              </p>

              {associates.length > 0 && (
                <ResultSection
                  icon={<Users size={16} aria-hidden="true" style={{ color: skyBlue }} />}
                  title="Associados"
                  results={associates}
                />
              )}

              {activities.length > 0 && (
                <ResultSection
                  icon={<ListTodo size={16} aria-hidden="true" style={{ color: skyBlue }} />}
                  title="Atividades"
                  results={activities}
                />
              )}
            </div>
          )}
        </div>
      )}

      {!hasQuery && (
        <p className="mt-10 text-center text-sm" style={{ color: textSubtle }}>
          Digite ao menos 2 caracteres para buscar.
        </p>
      )}
    </main>
  );
}

function ResultSection({
  icon,
  title,
  results,
}: {
  icon: React.ReactNode;
  title: string;
  results: Array<{ id: number; title: string; subtitle: string | null; href: string }>;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
          {title}
        </h2>
      </div>
      <ul
        className="overflow-hidden rounded-[12px] bg-white"
        style={{ border: `1px solid ${hairline}` }}
      >
        {results.map((result, index) => (
          <li
            key={result.id}
            style={{ borderTop: index === 0 ? 'none' : `1px solid ${hairline}` }}
          >
            <Link
              href={result.href}
              className={`flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-[rgba(4,9,32,0.02)] ${focusRingClass}`}
            >
              <span className="text-sm font-medium text-[#040920]">{result.title}</span>
              {result.subtitle && (
                <span className="text-xs" style={{ color: textSubtle }}>
                  {result.subtitle}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
