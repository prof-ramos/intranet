import { textMuted } from '@/lib/ui/tokens';

interface AssociatesEmptyStateProps {
  colSpan: number;
}

export function AssociatesEmptyState({ colSpan }: AssociatesEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center" style={{ color: textMuted }}>
        Nenhum associado encontrado.
      </td>
    </tr>
  );
}
