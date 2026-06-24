/** Converte string vazia ou undefined para null; mantém null e strings não-vazias intactos. */
export const emptyToNull = (v: string | null | undefined): string | null =>
  v === '' ? null : (v ?? null);
