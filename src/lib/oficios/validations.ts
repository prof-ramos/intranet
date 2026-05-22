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

/**
 * F-012: Strip dangerous HTML from TipTap rich-text content before persisting.
 * Numeric entities are decoded first so encoded javascript:/data: schemes are caught.
 * This is defense-in-depth; TipTap's schema already limits nodes on the client,
 * but a crafted server action could bypass that.
 */
export function sanitizeRichTextHtml(html: string): string {
  return decodeNumericHtmlEntities(html)
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"')
    .replace(/href\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'href="#"')
    .replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""')
    .replace(/src\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'src=""');
}

export const officialLetterFormSchema = z.object({
  recipient: z.string().trim().min(1, 'O destinatário é obrigatório.').max(200, 'Destinatário: máx. 200 caracteres.'),
  recipientRole: z.string().trim().min(1, 'O cargo do destinatário é obrigatório.').max(200, 'Cargo do destinatário: máx. 200 caracteres.'),
  vocativo: z.string().trim().min(1, 'O vocativo é obrigatório.').max(200, 'Vocativo: máx. 200 caracteres.'),
  letterDate: z.string().trim().min(1, 'A data é obrigatória.').max(50, 'Data: máx. 50 caracteres.'),
  subject: z.string().trim().min(1, 'O assunto é obrigatório.').max(500, 'Assunto: máx. 500 caracteres.'),
  itamaratySector: z.string().trim().min(1, 'O setor no Itamaraty é obrigatório.').max(200, 'Setor: máx. 200 caracteres.'),
  signatoryName: z.string().trim().min(1, 'O nome do signatário é obrigatório.').max(200, 'Nome do signatário: máx. 200 caracteres.'),
  signatoryRole: z.string().trim().min(1, 'O cargo do signatário é obrigatório.').max(200, 'Cargo do signatário: máx. 200 caracteres.'),
  closure: z.enum(['Atenciosamente,', 'Respeitosamente,'], {
    message: 'Selecione um fecho válido.',
  }),
  bodyRichText: z
    .string()
    .min(1, 'O corpo do ofício é obrigatório.')
    .max(50_000, 'Corpo do ofício: máx. 50.000 caracteres.')
    .refine(htmlHasText, 'O corpo do ofício é obrigatório.')
    .transform(sanitizeRichTextHtml),
  bodyPlainText: z.string().trim().min(1, 'O conteúdo em texto simples é obrigatório.').max(50_000, 'Corpo em texto simples: máx. 50.000 caracteres.'),
});

export type OfficialLetterFormValues = z.infer<typeof officialLetterFormSchema>;
