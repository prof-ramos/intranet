import { Search } from 'lucide-react';
import { hairline, textMuted, navy, skyBlue, focusRingClass } from '@/lib/ui/tokens';
import { getRoleLabel } from '@/lib/ui/role-labels';
import {
  buildAssociatesSearchParams,
  type AssociatesSearchParams,
  type AssociateSearchMode,
} from '@/lib/associates/search-params';
import { AssociadosFilters } from '../AssociadosFilters';
import type { AuthRole } from '@/lib/auth/config';

interface UserInfo {
  name: string;
  role: AuthRole;
}

interface AssociatesHeaderProps {
  user: UserInfo;
  searchParams: AssociatesSearchParams;
}

export function AssociatesHeader({ user, searchParams }: AssociatesHeaderProps) {
  const { q, searchBy, contributionStatus, functionalStatus, associationStatus } = searchParams;

  const hiddenFilters: Record<string, string | undefined> = {
    contributionStatus,
    functionalStatus,
    associationStatus,
  };

  const searchPlaceholder =
    searchBy === 'cpf'
      ? 'Buscar por CPF (ex: 123.456.789-00)...'
      : searchBy === 'siape'
        ? 'Buscar por SIAPE...'
        : 'Buscar por nome...';

  const searchLabel =
    searchBy === 'cpf'
      ? 'Buscar por CPF'
      : searchBy === 'siape'
        ? 'Buscar por SIAPE'
        : 'Buscar por nome';

  return (
    <div
      className="sticky top-0 z-20 border-b bg-white px-5 py-3 sm:px-8 lg:px-10"
      style={{ borderColor: hairline }}
    >
      <div className="mx-auto grid w-full max-w-[1180px] gap-3 sm:grid-cols-[minmax(240px,420px)_auto] sm:items-center sm:justify-between">
        <div className="min-w-0">
          <form method="GET" action="/app/associados" className="flex items-center gap-2">
            <select
              name="searchBy"
              defaultValue={searchBy}
              className="h-11 rounded-[8px] border bg-white px-2 text-sm outline-none"
              style={{ borderColor: hairline, color: '#040920' }}
              aria-label="Tipo de busca"
            >
              <option value="name">Nome</option>
              <option value="cpf">CPF</option>
              <option value="siape">SIAPE</option>
            </select>
            <label
              className="flex h-11 min-h-11 flex-1 items-center gap-3 rounded-[8px] border bg-white px-3"
              style={{ borderColor: hairline }}
            >
              <span className="sr-only">{searchLabel}</span>
              <Search size={18} style={{ color: textMuted }} aria-hidden="true" />
              <input
                name="q"
                type="search"
                defaultValue={q}
                autoComplete="off"
                className="grow bg-transparent text-sm outline-none placeholder:text-[rgba(13,31,60,0.65)]"
                placeholder={searchPlaceholder}
              />
            </label>
            {Object.entries(hiddenFilters).map(
              ([key, value]) =>
                value && (
                  <input key={key} type="hidden" name={key} value={value} />
                ),
            )}
          </form>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-4">
          <AssociadosFilters
            currentContributionStatus={contributionStatus}
            currentFunctionalStatus={functionalStatus}
            currentAssociationStatus={associationStatus}
            currentQ={q}
            currentSearchBy={searchBy}
          />
          <div className="hidden min-h-11 min-w-0 items-center gap-3 sm:flex">
            <div
              role="img"
              aria-label={`Avatar de ${user.name}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: navy, boxShadow: `0 0 0 2px ${skyBlue}26` }}
            >
              {user.name
                .split(' ')
                .slice(0, 2)
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="max-w-[190px] truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs" style={{ color: textMuted }}>
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
