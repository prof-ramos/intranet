const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function toPortugueseTitleCase(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) {
        return word;
      }

      return word
        .split('-')
        .map((segment) => segment.charAt(0).toLocaleUpperCase('pt-BR') + segment.slice(1))
        .join('-');
    })
    .join(' ');
}
