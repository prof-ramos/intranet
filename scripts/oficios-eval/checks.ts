/**
 * Verificações determinísticas sobre o corpo de ofício gerado.
 *
 * Espelham as regras do SYSTEM_INSTRUCTION (MRPR/Itamaraty) que dá para checar
 * sem julgamento humano: expressões proibidas, pronome de tratamento, ausência
 * de markdown, ausência de vocativo/fecho e numeração de parágrafos. Servem como
 * "scorecard" rápido para comparar versões do prompt — não substituem revisão
 * humana do mérito do texto.
 */

import type { LetterPromptInput } from '@/lib/ai/prompts';

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

export interface Fixture {
  id: string;
  description?: string;
  expect?: { pronoun?: 'excelencia' | 'senhoria' };
  input: LetterPromptInput;
}

/** Expressões que o prompt proíbe explicitamente. */
const FORBIDDEN_EXPRESSIONS = [
  'Venho por meio deste',
  'Servimo-nos do presente',
  'Sem mais para o momento',
  'Temos a honra de',
  'Tenho a honra de',
  'Tenho o prazer de',
  'Aproveito o ensejo para renovar protestos',
  'Cumpre-me informar que',
  'É com imensa satisfação que',
  'Outrossim',
  'Sendo só para o momento',
  'Destarte',
];

/** Tratamentos vedados pelo prompt. */
const FORBIDDEN_TREATMENTS = ['Ilustríssimo', 'Digníssimo', 'Excelentíssimo', 'Doutor'];

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function checkForbiddenExpressions(text: string): CheckResult {
  const lower = text.toLowerCase();
  const hits = FORBIDDEN_EXPRESSIONS.filter((e) => lower.includes(e.toLowerCase()));
  return {
    id: 'forbidden_expressions',
    label: 'Sem expressões proibidas',
    status: hits.length === 0 ? 'pass' : 'fail',
    detail: hits.length ? `Encontradas: ${hits.join('; ')}` : undefined,
  };
}

function checkPronoun(text: string, fixture: Fixture): CheckResult {
  const expected = fixture.expect?.pronoun;
  const hasExcelencia = /Vossa Excelência/i.test(text);
  const hasSenhoria = /Vossa Senhoria/i.test(text);
  const hasAbbrev = /\bV\.?\s?(Ex\.?a?|S\.?a?)\b/i.test(text);
  const forbiddenTreatment = FORBIDDEN_TREATMENTS.filter((t) =>
    new RegExp(`\\b${t}\\b`, 'i').test(text),
  );

  if (hasAbbrev) {
    return {
      id: 'pronoun',
      label: 'Pronome de tratamento',
      status: 'fail',
      detail: 'Pronome de tratamento abreviado (proibido).',
    };
  }
  if (forbiddenTreatment.length) {
    return {
      id: 'pronoun',
      label: 'Pronome de tratamento',
      status: 'fail',
      detail: `Tratamento vedado: ${forbiddenTreatment.join(', ')}`,
    };
  }

  if (!expected) {
    return {
      id: 'pronoun',
      label: 'Pronome de tratamento',
      status: 'warn',
      detail: 'Fixture sem expectativa de pronome — checagem ignorada.',
    };
  }

  const wantExcelencia = expected === 'excelencia';
  const correct = wantExcelencia ? hasExcelencia : hasSenhoria;
  const wrong = wantExcelencia ? hasSenhoria : hasExcelencia;

  if (correct && !wrong) {
    return { id: 'pronoun', label: 'Pronome de tratamento', status: 'pass' };
  }
  return {
    id: 'pronoun',
    label: 'Pronome de tratamento',
    status: 'fail',
    detail: `Esperado "${wantExcelencia ? 'Vossa Excelência' : 'Vossa Senhoria'}". ` +
      `Excelência=${hasExcelencia}, Senhoria=${hasSenhoria}.`,
  };
}

function checkNoMarkdown(text: string): CheckResult {
  const issues: string[] = [];
  if (/\*\*|__/.test(text)) issues.push('negrito/itálico markdown');
  if (/`/.test(text)) issues.push('crase/code');
  if (/^#{1,6}\s/m.test(text)) issues.push('cabeçalho #');
  if (/^\s*[-*•]\s+/m.test(text)) issues.push('lista com bullets');
  return {
    id: 'no_markdown',
    label: 'Texto puro (sem markdown)',
    status: issues.length === 0 ? 'pass' : 'fail',
    detail: issues.length ? issues.join('; ') : undefined,
  };
}

function checkNoVocativoFecho(text: string): CheckResult {
  const issues: string[] = [];
  if (/\b(Atenciosamente|Respeitosamente|Cordialmente)\b/i.test(text)) {
    issues.push('fecho presente');
  }
  const firstLine = (text.trim().split('\n')[0] ?? '').trim();
  if (/^(Senhor|Senhora|Prezad|Excelent|Ilustr)/i.test(firstLine)) {
    issues.push('inicia com vocativo');
  }
  return {
    id: 'no_vocativo_fecho',
    label: 'Sem vocativo/fecho/assinatura',
    status: issues.length === 0 ? 'pass' : 'fail',
    detail: issues.length ? issues.join('; ') : undefined,
  };
}

function checkParagraphNumbering(text: string): CheckResult {
  const paragraphs = splitParagraphs(text);
  const numbered = paragraphs.filter((p) => /^\d+[.)]\s/.test(p));

  if (paragraphs.length >= 3) {
    if (numbered.length === paragraphs.length) {
      const sequential = paragraphs.every((p, i) => new RegExp(`^${i + 1}[.)]\\s`).test(p));
      return {
        id: 'paragraph_numbering',
        label: 'Numeração de parágrafos (>=3)',
        status: sequential ? 'pass' : 'warn',
        detail: sequential ? undefined : 'Numerados, mas fora de sequência 1..n.',
      };
    }
    return {
      id: 'paragraph_numbering',
      label: 'Numeração de parágrafos (>=3)',
      status: 'fail',
      detail: `${paragraphs.length} parágrafos, ${numbered.length} numerados.`,
    };
  }

  // 1-2 parágrafos: numeração deve ser dispensada.
  return {
    id: 'paragraph_numbering',
    label: 'Numeração de parágrafos (curto)',
    status: numbered.length === 0 ? 'pass' : 'warn',
    detail: numbered.length ? 'Documento curto não deveria numerar parágrafos.' : undefined,
  };
}

function checkNonEmpty(text: string): CheckResult {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return {
    id: 'non_empty',
    label: 'Conteúdo não vazio',
    status: words >= 20 ? 'pass' : 'fail',
    detail: `${words} palavras`,
  };
}

export function runChecks(text: string, fixture: Fixture): CheckResult[] {
  return [
    checkNonEmpty(text),
    checkForbiddenExpressions(text),
    checkPronoun(text, fixture),
    checkNoMarkdown(text),
    checkNoVocativoFecho(text),
    checkParagraphNumbering(text),
  ];
}

export function summarize(results: CheckResult[]): { pass: number; warn: number; fail: number } {
  return {
    pass: results.filter((r) => r.status === 'pass').length,
    warn: results.filter((r) => r.status === 'warn').length,
    fail: results.filter((r) => r.status === 'fail').length,
  };
}
