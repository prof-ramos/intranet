import { z } from 'zod';

function htmlHasText(value: string) {
  return value
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim().length > 0;
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

export function sanitizeRichTextHtml(html: string): string {
  // Decode numeric entities first so regex checks catch encoded javascript:/data: schemes.
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
  recipient: z.string().trim().min(1, 'O destinatário é obrigatório.'),
  recipientRole: z.string().trim().min(1, 'O cargo do destinatário é obrigatório.'),
  vocativo: z.string().trim().min(1, 'O vocativo é obrigatório.'),
  letterDate: z.string().trim().min(1, 'A data é obrigatória.'),
  subject: z.string().trim().min(1, 'O assunto é obrigatório.'),
  itamaratySector: z.string().trim().min(1, 'O setor no Itamaraty é obrigatório.'),
  signatoryName: z.string().trim().min(1, 'O nome do signatário é obrigatório.'),
  signatoryRole: z.string().trim().min(1, 'O cargo do signatário é obrigatório.'),
  closure: z.enum(['Atenciosamente,', 'Respeitosamente,'], {
    message: 'Selecione um fecho válido.',
  }),
  bodyRichText: z
    .string()
    .min(1, 'O corpo do ofício é obrigatório.')
    .refine(htmlHasText, 'O corpo do ofício é obrigatório.')
    .transform(sanitizeRichTextHtml),
  bodyPlainText: z.string().trim().min(1, 'O conteúdo em texto simples é obrigatório.'),
});

export type OfficialLetterFormValues = z.infer<typeof officialLetterFormSchema>;
