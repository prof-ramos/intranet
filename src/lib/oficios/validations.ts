import { z } from 'zod';

function htmlHasText(value: string) {
  return (
    value
      .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim().length > 0
  );
}

function decodeNumericHtmlEntities(value: string): string {
  return value.replace(/&#(x[0-9a-f]+|\d+);?/gi, (entity, rawCodepoint: string) => {
    const radix = rawCodepoint.toLowerCase().startsWith('x') ? 16 : 10;
    const normalized = radix === 16 ? rawCodepoint.slice(1) : rawCodepoint;
    const codepoint = Number.parseInt(normalized, radix);
    if (!Number.isFinite(codepoint)) {
      return entity;
    }

    try {
      return String.fromCodePoint(codepoint);
    } catch {
      return entity;
    }
  });
}

function decodeCommonHtmlEntities(value: string): string {
  return decodeNumericHtmlEntities(value)
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function canonicalizeAttributeValue(value: string): string {
  let canonical = decodeCommonHtmlEntities(value).replace(/[\u0000-\u001f\u007f\s]+/g, '');
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(canonical);
      if (decoded === canonical) break;
      canonical = decoded;
    } catch {
      break;
    }
  }
  return canonical.toLowerCase();
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const allowedTags = new Set([
  'a',
  'blockquote',
  'br',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const voidTags = new Set(['br']);

function isSafeLinkAttribute(name: string, value: string): boolean {
  const canonical = canonicalizeAttributeValue(value);
  if (name === 'href') {
    return /^(https?:|mailto:)/.test(canonical) || canonical.startsWith('#');
  }
  return true;
}

function sanitizeStyle(value: string): string | null {
  const safeDeclarations = value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => /^text-align\s*:\s*(left|right|center|justify)$/i.test(declaration));

  return safeDeclarations.length > 0 ? safeDeclarations.join('; ') : null;
}

function sanitizeAttributes(tagName: string, rawAttributes: string): string {
  const attributes: string[] = [];
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of rawAttributes.matchAll(attrPattern)) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';

    if (name.startsWith('on')) continue;
    if (name === 'style') {
      const safeStyle = sanitizeStyle(value);
      if (safeStyle) attributes.push(`style="${escapeHtmlAttribute(safeStyle)}"`);
      continue;
    }
    if (name === 'href' && tagName === 'a' && isSafeLinkAttribute(name, value)) {
      attributes.push(`href="${escapeHtmlAttribute(value)}"`);
      continue;
    }
    if (name === 'title' || name === 'aria-label') {
      attributes.push(`${name}="${escapeHtmlAttribute(value)}"`);
      continue;
    }
    if (name === 'target' && tagName === 'a' && value === '_blank') {
      attributes.push('target="_blank" rel="noopener noreferrer"');
      continue;
    }
  }

  return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
}

/**
 * F-012: Strip dangerous HTML from TipTap rich-text content before persisting.
 * Attribute values are decoded/canonicalized before protocol checks so encoded
 * javascript:/data: schemes are caught.
 * This is defense-in-depth; TipTap's schema already limits nodes on the client,
 * but a crafted server action could bypass that.
 */
export function sanitizeRichTextHtml(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*\/?>/gi,
      '',
    )
    .replace(
      /<\s*(\/)?\s*([a-z0-9-]+)([^>]*)>/gi,
      (_tag, closing: string | undefined, tagName: string, rawAttributes: string) => {
        const normalizedTag = tagName.toLowerCase();
        if (!allowedTags.has(normalizedTag)) return '';
        if (closing) return voidTags.has(normalizedTag) ? '' : `</${normalizedTag}>`;
        return `<${normalizedTag}${sanitizeAttributes(normalizedTag, rawAttributes)}>`;
      },
    );
}

export const officialLetterFormSchema = z.object({
  recipient: z
    .string()
    .trim()
    .min(1, 'O destinatário é obrigatório.')
    .max(200, 'Destinatário: máx. 200 caracteres.'),
  recipientRole: z
    .string()
    .trim()
    .min(1, 'O cargo do destinatário é obrigatório.')
    .max(200, 'Cargo do destinatário: máx. 200 caracteres.'),
  vocativo: z
    .string()
    .trim()
    .min(1, 'O vocativo é obrigatório.')
    .max(200, 'Vocativo: máx. 200 caracteres.'),
  letterDate: z
    .string()
    .trim()
    .min(1, 'A data é obrigatória.')
    .max(50, 'Data: máx. 50 caracteres.'),
  subject: z
    .string()
    .trim()
    .min(1, 'O assunto é obrigatório.')
    .max(500, 'Assunto: máx. 500 caracteres.'),
  itamaratySector: z
    .string()
    .trim()
    .min(1, 'O setor no Itamaraty é obrigatório.')
    .max(200, 'Setor: máx. 200 caracteres.'),
  signatoryName: z
    .string()
    .trim()
    .min(1, 'O nome do signatário é obrigatório.')
    .max(200, 'Nome do signatário: máx. 200 caracteres.'),
  signatoryRole: z
    .string()
    .trim()
    .min(1, 'O cargo do signatário é obrigatório.')
    .max(200, 'Cargo do signatário: máx. 200 caracteres.'),
  closure: z.enum(['Atenciosamente,', 'Respeitosamente,'], {
    message: 'Selecione um fecho válido.',
  }),
  bodyRichText: z
    .string()
    .min(1, 'O corpo do ofício é obrigatório.')
    .max(50_000, 'Corpo do ofício: máx. 50.000 caracteres.')
    .refine(htmlHasText, 'O corpo do ofício é obrigatório.')
    .transform(sanitizeRichTextHtml),
  bodyPlainText: z
    .string()
    .trim()
    .min(1, 'O conteúdo em texto simples é obrigatório.')
    .max(50_000, 'Corpo em texto simples: máx. 50.000 caracteres.'),
});

export type OfficialLetterFormValues = z.infer<typeof officialLetterFormSchema>;
