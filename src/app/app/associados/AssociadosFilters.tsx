'use client';

import { useRouter } from 'next/navigation';
import { hairline, focusRingClass } from '@/lib/ui/tokens';
import type { AssociateSearchMode } from '@/lib/associates/search-params';

interface AssociadosFiltersProps {
  currentContributionStatus: string | undefined;
  currentFunctionalStatus: string | undefined;
  currentAssociationStatus: string | undefined;
  currentQ: string;
  currentSearchBy: AssociateSearchMode;
}

const selectStyle = {
  border: `1px solid ${hairline}`,
  borderRadius: '6px',
  height: '2.75rem',
  padding: '0 0.625rem',
  fontSize: '0.875rem',
  backgroundColor: '#ffffff',
  color: '#040920',
  cursor: 'pointer',
};

export function AssociadosFilters({
  currentContributionStatus,
  currentFunctionalStatus,
  currentAssociationStatus,
  currentQ,
  currentSearchBy,
}: AssociadosFiltersProps) {
  const router = useRouter();

  function navigate(updates: { contributionStatus?: string; functionalStatus?: string; associationStatus?: string }) {
    const params = new URLSearchParams();
    if (currentQ) params.set('q', currentQ);
    if (currentSearchBy && currentSearchBy !== 'name') params.set('searchBy', currentSearchBy);

    const newContribution =
      'contributionStatus' in updates ? updates.contributionStatus : currentContributionStatus;
    const newFunctional =
      'functionalStatus' in updates ? updates.functionalStatus : currentFunctionalStatus;
    const newAssociation =
      'associationStatus' in updates ? updates.associationStatus : currentAssociationStatus;

    if (newContribution) params.set('contributionStatus', newContribution);
    if (newFunctional) params.set('functionalStatus', newFunctional);
    if (newAssociation) params.set('associationStatus', newAssociation);
    // page intentionally reset to 1 on filter change

    router.push(`/app/associados?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="filter-association">
        Filtrar por vínculo ASOF
      </label>
      <select
        id="filter-association"
        className={focusRingClass}
        style={selectStyle}
        value={currentAssociationStatus ?? ''}
        onChange={(e) => navigate({ associationStatus: e.target.value || undefined })}
        aria-label="Filtrar por vínculo ASOF"
      >
        <option value="">Vínculo ASOF: todos</option>
        <option value="associado">Associado</option>
        <option value="nao_associado">Não associado</option>
      </select>

      <label className="sr-only" htmlFor="filter-contribution">
        Filtrar por contribuição
      </label>
      <select
        id="filter-contribution"
        className={focusRingClass}
        style={selectStyle}
        value={currentContributionStatus ?? ''}
        onChange={(e) => navigate({ contributionStatus: e.target.value || undefined })}
        aria-label="Filtrar por contribuição"
      >
        <option value="">Contribuição: todas</option>
        <option value="em_dia">Em dia</option>
        <option value="inadimplente">Inadimplente</option>
      </select>

      <label className="sr-only" htmlFor="filter-functional">
        Filtrar por situação funcional
      </label>
      <select
        id="filter-functional"
        className={focusRingClass}
        style={selectStyle}
        value={currentFunctionalStatus ?? ''}
        onChange={(e) => navigate({ functionalStatus: e.target.value || undefined })}
        aria-label="Filtrar por situação funcional"
      >
        <option value="">Situação funcional: todas</option>
        <option value="ativo">Ativo</option>
        <option value="aposentado">Aposentado</option>
        <option value="cedido">Cedido</option>
        <option value="em_licenca">Em licença</option>
      </select>
    </div>
  );
}
