/**
 * Remove cargo/função do nome do signatário.
 * Nomes vêm no formato "João Silva — Presidente" ou "Maria - VP".
 * Retorna apenas a parte do nome próprio.
 */
export function cleanSignatoryName(fullName: string): string {
  const cleaned = fullName.replace(/\s+(?:—|–|-)\s+.*$/, '').trim();
  return cleaned || fullName.trim();
}

const PRIMEIRA_PESSOA = [
  { pattern: /\beu\b/gi, label: '"eu"' },
  { pattern: /\bmeu\b/gi, label: '"meu"' },
  { pattern: /\bminha\b/gi, label: '"minha"' },
  { pattern: /\bmeus\b/gi, label: '"meus"' },
  { pattern: /\bminhas\b/gi, label: '"minhas"' },
  { pattern: /\bcomigo\b/gi, label: '"comigo"' },
];

const COLOQUIALISMOS = [
  { pattern: /\btipo assim\b/gi, label: '"tipo assim"' },
  { pattern: /\bmeio que\b/gi, label: '"meio que"' },
];

export interface ImpersonalityWarning {
  term: string;
  suggestion: string;
}

export function checkImpersonality(text: string): ImpersonalityWarning[] {
  const warnings: ImpersonalityWarning[] = [];
  const seen = new Set<string>();

  for (const { pattern, label } of PRIMEIRA_PESSOA) {
    if (text.match(pattern) && !seen.has(label)) {
      seen.add(label);
      warnings.push({
        term: label,
        suggestion: 'Evitar primeira pessoa. Usar linguagem impessoal.',
      });
    }
  }

  for (const { pattern, label } of COLOQUIALISMOS) {
    if (text.match(pattern) && !seen.has(label)) {
      seen.add(label);
      warnings.push({
        term: label,
        suggestion: 'Expressão coloquial. Usar linguagem formal.',
      });
    }
  }

  return warnings;
}
