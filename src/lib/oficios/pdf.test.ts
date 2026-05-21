import { describe, expect, it } from 'vitest';
import { htmlToPlainText } from './pdf';

describe('htmlToPlainText', () => {
  it('converts rich text html to readable text for PDF rendering', () => {
    const result = htmlToPlainText(
      '<p><strong>Primeiro</strong> parágrafo</p><ul><li>Item A</li><li>Item B</li></ul><p style="text-align: center">Fim &amp; fecho</p>',
    );

    expect(result).toContain('Primeiro parágrafo');
    expect(result).toContain('- Item A');
    expect(result).toContain('- Item B');
    expect(result).toContain('Fim & fecho');
  });

  it('drops script and style content', () => {
    expect(htmlToPlainText('<p>Texto</p><script>alert(1)</script><style>p{}</style>')).toBe('Texto');
  });
});
