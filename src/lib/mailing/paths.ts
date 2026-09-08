export function campaignEtiquetasDownloadPath(campaignId: number, kind: 'pdf' | 'csv'): string {
  return kind === 'pdf'
    ? `/app/mala-direta/${campaignId}/etiquetas/gerar`
    : `/app/mala-direta/${campaignId}/etiquetas/csv`;
}
